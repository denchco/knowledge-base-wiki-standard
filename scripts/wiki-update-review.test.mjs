import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { upgradePlan } from "./conformance-lifecycle.mjs";
import { createUpdateReview, checkUpdateReview } from "./wiki-update-review.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECIPE = JSON.parse(readFileSync(path.join(ROOT, "migrations/rc14-to-rc15.json"), "utf8"));
const git = (root, ...args) => execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
const source = (revision, file) => git(ROOT, "show", `${revision}:${file}`);
const identity = (bytes) => ({ sha256: createHash("sha256").update(bytes).digest("hex"), mode: "100644" });
const write = (root, file, bytes) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), bytes); };
const consumerPackage = (revision) => {
  const value = JSON.parse(source(revision, "package.json"));
  value.name = "independent-consumer-wiki";
  value.codexDevServer.serviceId = "independent-consumer-wiki";
  value.codexDevServer.port = 8899;
  return `${JSON.stringify(value, null, 2)}\n`;
};

function fixture(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "wiki-update-rc14-rc15-"));
  try {
    const decisions = {};
    for (const component of RECIPE.components) {
      for (const file of component.paths) {
        const applicable = ["frozen-stack", "guarded-graph", "renderer", "consumer-ci"].includes(component.id);
        decisions[file] = { action: applicable ? "exact-file" : "out-of-scope", reason: applicable ? "Fixture selects this reference component." : "Preserve the consumer's own contracts and content." };
        if (!applicable) continue;
        decisions[file].target = file;
        try { write(root, file, source(RECIPE.from.revision, file)); } catch (error) { if (!error.status) throw error; }
      }
    }
    write(root, "package.json", consumerPackage(RECIPE.from.revision));
    decisions["package.json"] = { action: "reviewed-adaptation", target: "package.json", reason: "Apply released scripts while retaining the consumer package identity and managed endpoint.", baseline: identity(consumerPackage(RECIPE.from.revision)), proposed: identity(consumerPackage(RECIPE.to.revision)) };
    const manifest = parseDocument(readFileSync(path.join(ROOT, "fixtures/lifecycle/consumer-old/.wiki-standard.yaml"), "utf8"));
    manifest.setIn(["standard", "version"], "0.1.0-candidate");
    manifest.setIn(["standard", "revision"], RECIPE.from.revision);
    manifest.setIn(["capabilities", "standard_release_tag"], RECIPE.from.tag);
    write(root, ".wiki-standard.yaml", String(manifest));
    write(root, "knowledge/index.md", "# Independent subject\n\n[Finding](concept.md)\n");
    write(root, "knowledge/concept.md", "---\ntype: Concept\ntitle: Local finding\nlocal_extension:\n  source_digest: preserve-exactly\n---\n\n# Local finding\n\nSubject-owned evidence remains qualified.\n");
    write(root, "docs/sources.md", "# Sources\n\nPrivate subject evidence identity and access boundary.\n");
    write(root, "config/wiki-appearance.json", '{"brand":"consumer","defaultWidth":"standard"}\n');
    write(root, "zensical.toml", '[project]\nsite_name = "Independent subject"\nsite_url = "https://wiki.example.org/"\n');
    write(root, "DESIGN.md", "# Consumer design\n\nRetain brand, explicit Standard width and local reader settings.\n");
    git(root, "init", "-q");
    git(root, "add", ".");
    git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Independent consumer baseline");
    fn({ root, decisions, plan: () => createUpdateReview({ targetRoot: root, recipe: RECIPE, decisions }) });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

// Fixture application is deliberately test-local. The production helper has no writer.
function applyFixture(root, review) {
  assert.equal(checkUpdateReview({ targetRoot: root, review }).pass, true);
  for (const file of review.files.filter((file) => file.target)) {
    if (file.proposed === null) rmSync(path.join(root, file.target));
    else write(root, file.target, file.source === "package.json" ? consumerPackage(RECIPE.to.revision) : source(RECIPE.to.revision, file.source));
  }
}

test("rc.14 to rc.15 classifies the complete real release delta and reuses manifest review", () => fixture(({ root, plan }) => {
  const review = plan();
  assert.deepEqual(review.blockers, []);
  assert.equal(review.writesPerformed, false);
  assert.equal(review.applySupported, false);
  assert.equal(review.releaseEvidence, "not-checked");
  assert.equal(review.targetQualification, "not-checked");
  assert.ok(review.componentOrder.indexOf("guarded-graph") < review.componentOrder.indexOf("renderer"));
  assert.ok(review.files.some((file) => file.source === "uv.lock" && file.target));
  assert.ok(review.files.some((file) => file.source === "scripts/check-zensical-runtime.mjs" && file.before === null));
  assert.ok(review.files.some((file) => file.source === "scripts/patch-zensical-runtime.mjs" && file.after === null));
  assert.ok(review.files.some((file) => file.source === "scripts/patch-zensical-runtime.test.mjs" && file.after === null));
  const lifecycle = upgradePlan({ target: root, standardRevision: RECIPE.to.revision, dryRun: true });
  assert.equal(lifecycle.candidate.selection.bootstrapEligible, false);
  assert.ok(lifecycle.manualActions.some((action) => action.path === "/standard/revision"));
  assert.equal(checkUpdateReview({ targetRoot: root, review }).pass, true);
}));

test("bounded fixture applies real additions and deletions while preserving content, evidence and consumer settings", () => fixture(({ root, plan }) => {
  const review = plan();
  const manifestBefore = readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8");
  applyFixture(root, review);
  assert.equal(existsSync(path.join(root, "scripts/patch-zensical-runtime.mjs")), false);
  assert.equal(existsSync(path.join(root, "scripts/patch-zensical-runtime.test.mjs")), false);
  assert.match(readFileSync(path.join(root, "scripts/check-zensical-runtime.mjs"), "utf8"), /3cb411a8/);
  assert.match(readFileSync(path.join(root, "pyproject.toml"), "utf8"), /graphifyy==0\.9\.106/);
  assert.match(readFileSync(path.join(root, "pyproject.toml"), "utf8"), /zensical==0\.1\.1/);
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.name, "independent-consumer-wiki");
  assert.equal(pkg.codexDevServer.port, 8899);
  assert.match(pkg.scripts["build:site"], /check:renderer/);
  assert.equal(pkg.scripts["patch:renderer"], undefined);
  assert.equal(readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"), manifestBefore);
  assert.equal(checkUpdateReview({ targetRoot: root, review, stage: "after" }).pass, true);
  // This bounded regression has no installed environments, browser qualification or pin writer.
  assert.equal(checkUpdateReview({ targetRoot: root, review, stage: "after" }).targetQualification, "not-checked");
  const concept = readFileSync(path.join(root, "knowledge/concept.md"), "utf8");
  assert.match(concept, /local_extension:\n  source_digest: preserve-exactly/);
  assert.match(readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"), /local_extension: true/);
  assert.match(readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"), /DKBWS-SEC-001/);
}));

test("local modifications block planning and clean local deviations block exact-file replacement", () => fixture(({ root, plan }) => {
  write(root, "scripts/graphify-update.py", "# Local guarded adapter\n");
  assert.ok(plan().blockers.some((failure) => failure.includes("local changes")));
  git(root, "add", ".");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Consumer-specific adapter");
  const review = plan();
  assert.ok(review.blockers.some((failure) => failure.includes("baseline differs")));
  assert.equal(checkUpdateReview({ targetRoot: root, review }).pass, false);
}));

test("changes after review and unreviewed adaptations fail before implementation", () => fixture(({ root, decisions, plan }) => {
  const review = plan();
  write(root, "docs/assets/wiki.js", "// Change after review\n");
  assert.equal(checkUpdateReview({ targetRoot: root, review }).pass, false);
  decisions["docs/assets/wiki.js"] = { action: "manual-adaptation", reason: "Consumer uses a different search adapter." };
  assert.ok(plan().blockers.some((failure) => failure.includes("no reviewed executable patch")));
}));

test("staged-only changes fail before implementation even if working bytes match", () => fixture(({ root, plan }) => {
  const review = plan();
  const original = readFileSync(path.join(root, "docs/assets/wiki.js"));
  write(root, "docs/assets/wiki.js", "// Staged local change\n");
  git(root, "add", "docs/assets/wiki.js");
  write(root, "docs/assets/wiki.js", original);
  assert.ok(checkUpdateReview({ targetRoot: root, review }).failures.some((failure) => failure.includes("staged changes")));
}));

test("after-stage accepts matching staged results and rejects a stale staged blob", () => fixture(({ root, plan }) => {
  const review = plan();
  applyFixture(root, review);
  git(root, "add", ".");
  assert.equal(checkUpdateReview({ targetRoot: root, review, stage: "after" }).pass, true);
  const proposed = readFileSync(path.join(root, "docs/assets/wiki.js"));
  write(root, "docs/assets/wiki.js", "// Stale staged migration\n");
  git(root, "add", "docs/assets/wiki.js");
  write(root, "docs/assets/wiki.js", proposed);
  assert.ok(checkUpdateReview({ targetRoot: root, review, stage: "after" }).failures.some((failure) => failure.includes("Staged result differs")));
}));

test("partial renderer migration, content changes and unexpected files fail the result check", () => fixture(({ root, plan }) => {
  const review = plan();
  applyFixture(root, review);
  write(root, "scripts/patch-zensical-runtime.mjs", source(RECIPE.from.revision, "scripts/patch-zensical-runtime.mjs"));
  assert.equal(checkUpdateReview({ targetRoot: root, review, stage: "after" }).pass, false);
  rmSync(path.join(root, "scripts/patch-zensical-runtime.mjs"));
  write(root, "knowledge/concept.md", "# Lost evidence\n");
  assert.ok(checkUpdateReview({ targetRoot: root, review, stage: "after" }).failures.some((failure) => failure.includes("Preservation failed")));
  write(root, "unexpected.md", "# Unreviewed content\n");
  assert.ok(checkUpdateReview({ targetRoot: root, review, stage: "after" }).failures.some((failure) => failure.includes("Unexpected consumer files")));
}));

test("incomplete recipes, missing decisions, changed release identity and changed plan bytes fail closed", () => fixture(({ root, decisions, plan }) => {
  const incomplete = structuredClone(RECIPE);
  incomplete.components[0].paths.pop();
  assert.throws(() => createUpdateReview({ targetRoot: root, recipe: incomplete, decisions }), /every changed release file/);
  const missing = structuredClone(decisions);
  delete missing["uv.lock"];
  assert.throws(() => createUpdateReview({ targetRoot: root, recipe: RECIPE, decisions: missing }), /every changed release file/);
  const wrong = structuredClone(RECIPE);
  wrong.to.revision = RECIPE.from.revision;
  assert.throws(() => createUpdateReview({ targetRoot: root, recipe: wrong, decisions }), /tag mismatch/);
  const review = plan();
  review.files.pop();
  assert.throws(() => checkUpdateReview({ targetRoot: root, review }), /Review bytes changed/);
}));

test("traversal and symlink mappings cannot leave the consumer boundary", () => fixture(({ root, decisions }) => {
  decisions["uv.lock"].target = "../uv.lock";
  assert.throws(() => createUpdateReview({ targetRoot: root, recipe: RECIPE, decisions }), /Unsafe review path/);
  decisions["uv.lock"].target = "redirect/uv.lock";
  symlinkSync(os.tmpdir(), path.join(root, "redirect"));
  assert.throws(() => createUpdateReview({ targetRoot: root, recipe: RECIPE, decisions }), /Symlink/);
}));
