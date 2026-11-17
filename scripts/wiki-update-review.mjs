import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (root, args) => execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const text = (root, args) => git(root, args).toString("utf8").trimEnd();

function portablePath(value) {
  if (typeof value !== "string" || !value || path.isAbsolute(value) || value.includes("\\")
    || value.split("/").some((part) => !part || part === "." || part === ".." || [".git", ".jj"].includes(part))) {
    throw new Error(`Unsafe review path ${JSON.stringify(value)}`);
  }
  return value;
}

function localState(root, relative) {
  portablePath(relative);
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`Symlink is outside the exact-file review boundary: ${relative}`);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  if (!existsSync(current)) return null;
  const stat = lstatSync(current);
  if (!stat.isFile()) throw new Error(`Review target is not a regular file: ${relative}`);
  return { sha256: sha256(readFileSync(current)), mode: stat.mode & 0o111 ? "100755" : "100644" };
}

function releaseState(root, revision, relative) {
  portablePath(relative);
  const entry = text(root, ["ls-tree", revision, "--", relative]);
  if (!entry) return null;
  const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(entry);
  if (!match || match[3] !== relative) throw new Error(`Release path is not one regular file: ${relative}`);
  return { sha256: sha256(git(root, ["show", `${revision}:${relative}`])), mode: match[1] };
}

function indexState(root, relative) {
  portablePath(relative);
  const entry = git(root, ["ls-files", "--stage", "-z", "--", relative]).toString("utf8");
  if (!entry) return null;
  const match = /^(100644|100755) ([0-9a-f]{40}) 0\t([^\0]+)\0$/.exec(entry);
  if (!match || match[3] !== relative) throw new Error(`Unmerged or unsupported index entry: ${relative}`);
  return { sha256: sha256(git(root, ["show", `:${relative}`])), mode: match[1] };
}

function equal(left, right) {
  return left === null ? right === null : right !== null && left.sha256 === right.sha256 && left.mode === right.mode;
}

function digest(plan) {
  const { reviewDigest, ...bytes } = plan;
  return sha256(JSON.stringify(bytes));
}

/** Read-only exact-file review. A local adaptation needs its own reviewed patch. */
export function createUpdateReview({ targetRoot, recipe, decisions, standardRoot = ROOT }) {
  const target = realpathSync(targetRoot);
  if (realpathSync(text(target, ["rev-parse", "--show-toplevel"])) !== target) throw new Error("Select the consumer repository root.");
  for (const release of [recipe.from, recipe.to]) {
    if (!/^[0-9a-f]{40}$/.test(release?.revision ?? "") || !/^v\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(release?.tag ?? "")) throw new Error("Recipe requires exact release tags and full Git commits.");
    if (text(standardRoot, ["rev-parse", "--verify", `${release.tag}^{commit}`]) !== release.revision) throw new Error(`Release tag mismatch: ${release.tag}`);
  }
  git(standardRoot, ["merge-base", "--is-ancestor", recipe.from.revision, recipe.to.revision]);
  if (recipe.from.revision === recipe.to.revision) throw new Error("Select a strictly newer release.");
  const changed = text(standardRoot, ["diff", "--name-only", recipe.from.revision, recipe.to.revision]).split("\n").filter(Boolean).sort();
  const declared = recipe.components.flatMap((component) => component.paths).sort();
  if (JSON.stringify(changed) !== JSON.stringify(declared)) throw new Error("Recipe must classify every changed release file exactly once.");
  if (JSON.stringify(Object.keys(decisions).sort()) !== JSON.stringify(changed)) throw new Error("Review requires an explicit applicability decision for every changed release file.");
  const blockers = [];
  if (text(target, ["status", "--porcelain=v1", "--untracked-files=all"])) blockers.push("Consumer has local changes. Preserve them and establish a separate clean review boundary.");
  const mapped = new Set();
  const files = [];
  for (const component of [...recipe.components].sort((a, b) => a.order - b.order)) {
    for (const source of component.paths) {
      const decision = decisions[source];
      if (!decision || !["exact-file", "reviewed-adaptation", "manual-adaptation", "out-of-scope"].includes(decision.action) || typeof decision.reason !== "string" || !decision.reason.trim()) throw new Error(`Missing explicit review decision: ${source}`);
      const before = releaseState(standardRoot, recipe.from.revision, source);
      const after = releaseState(standardRoot, recipe.to.revision, source);
      const file = { component: component.id, source, before, after, action: decision.action, reason: decision.reason };
      if (["exact-file", "reviewed-adaptation"].includes(decision.action)) {
        portablePath(decision.target);
        if (mapped.has(decision.target)) throw new Error(`Duplicate consumer mapping: ${decision.target}`);
        mapped.add(decision.target);
        file.target = decision.target;
        file.current = localState(target, decision.target);
        file.proposed = decision.action === "exact-file" ? after : decision.proposed;
        const baseline = decision.action === "exact-file" ? before : decision.baseline;
        for (const state of [baseline, file.proposed]) {
          if (state !== null && (!/^[0-9a-f]{64}$/.test(state?.sha256 ?? "") || !["100644", "100755"].includes(state?.mode))) throw new Error(`Adaptation needs exact baseline and proposed file identities: ${source}`);
        }
        if (!equal(baseline, file.current)) blockers.push(`Consumer baseline differs at ${decision.target}. Review a local adaptation instead of replacing it.`);
      } else if (decision.action === "manual-adaptation") {
        blockers.push(`Manual adaptation has no reviewed executable patch yet: ${source}`);
      }
      files.push(file);
    }
  }
  const inventory = git(target, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).toString("utf8").split("\0").filter(Boolean).sort();
  const preserved = inventory.filter((file) => !mapped.has(file)).map((file) => ({ path: file, state: localState(target, file) }));
  const review = {
    reviewVersion: "1.0", kind: "component-update-review", readOnly: true, writesPerformed: false, applySupported: false,
    from: recipe.from, to: recipe.to, consumerHead: text(target, ["rev-parse", "HEAD"]),
    releaseEvidence: "not-checked", targetQualification: "not-checked", deploymentAuthorized: false,
    componentOrder: [...recipe.components].sort((a, b) => a.order - b.order).map((component) => component.id),
    files, preserved, unchangedClosure: recipe.unchangedClosure, blockers,
  };
  return { ...review, reviewDigest: digest(review) };
}

/** Check all file preconditions or the bounded implementation result. Never writes. */
export function checkUpdateReview({ targetRoot, review, stage = "before" }) {
  if (!["before", "after"].includes(stage)) throw new Error("Review stage must be before or after.");
  if (review.reviewDigest !== digest(review)) throw new Error("Review bytes changed. Generate and review a new plan.");
  const failures = [...review.blockers];
  const target = realpathSync(targetRoot);
  if (stage === "before" && text(target, ["status", "--porcelain=v1", "--untracked-files=all"])) failures.push("Consumer has local or staged changes after planning.");
  if (text(target, ["rev-parse", "HEAD"]) !== review.consumerHead) failures.push("Consumer HEAD changed after planning.");
  for (const file of review.files.filter((file) => ["exact-file", "reviewed-adaptation"].includes(file.action))) {
    const expected = stage === "before" ? file.current : file.proposed;
    if (!equal(expected, localState(target, file.target))) failures.push(`${stage} precondition failed: ${file.target}`);
  }
  for (const file of review.preserved) {
    if (!equal(file.state, localState(target, file.path))) failures.push(`Preservation failed: ${file.path}`);
  }
  if (stage === "after") {
    const staged = git(target, ["diff", "--cached", "--name-only", "-z"]).toString("utf8").split("\0").filter(Boolean);
    for (const file of staged) {
      if (!equal(indexState(target, file), localState(target, file))) failures.push(`Staged result differs from working bytes: ${file}`);
    }
  }
  const planned = new Set([...review.preserved.map((file) => file.path), ...review.files.filter((file) => ["exact-file", "reviewed-adaptation"].includes(file.action)).map((file) => file.target)]);
  const unexpected = git(target, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).toString("utf8").split("\0").filter((file) => file && !planned.has(file));
  if (unexpected.length) failures.push(`Unexpected consumer files: ${unexpected.join(", ")}`);
  return { pass: failures.length === 0, stage, failures, targetQualification: "not-checked", writesPerformed: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, targetRoot, input, decisionsFile, ...extra] = process.argv.slice(2);
    let report;
    if (operation === "plan" && targetRoot && input && decisionsFile && extra.length === 0) {
      report = createUpdateReview({ targetRoot, recipe: JSON.parse(readFileSync(input, "utf8")), decisions: JSON.parse(readFileSync(decisionsFile, "utf8")) });
    } else if (["check-before", "check-after"].includes(operation) && targetRoot && input && !decisionsFile) {
      report = checkUpdateReview({ targetRoot, review: JSON.parse(readFileSync(input, "utf8")), stage: operation === "check-before" ? "before" : "after" });
    } else throw new Error("Use plan <wiki> <recipe.json> <decisions.json>, check-before <wiki> <review.json>, or check-after <wiki> <review.json>.");
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.blockers?.length || report.pass === false) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
