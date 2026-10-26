import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parse } from "yaml";

export const DEFAULT_STANDARD_SOURCE = "https://github.com/denchco/knowledge-base-wiki-standard";
export const STACK_REPORT_SCHEMA = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/standard-stack-report-v1.json";
export const STACK_FILES = Object.freeze([
  "package.json", "package-lock.json", "pyproject.toml", "uv.lock",
  ".node-version", ".python-version", "zensical.toml", ".wiki-standard.yaml",
  ".github/workflows/verify.yml",
]);
const SHA = /^[a-f0-9]{40}$/u;
const WORKFLOW = ".github/workflows/verify.yml";
const hash = (algorithm, value) => createHash(algorithm).update(value).digest("hex");

export class StackResolutionError extends Error {
  constructor(code, message) { super(message); this.name = "StackResolutionError"; this.code = code; }
}
function requireValue(condition, code, message) {
  if (!condition) throw new StackResolutionError(code, message);
}
function timestamp(value, label) {
  requireValue(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/u.test(value)
    && Number.isFinite(Date.parse(value)), "STACK-IDENTITY", `${label} must have a valid dated identity.`);
  return value;
}
function positive(value) { return Number.isSafeInteger(value) && value > 0; }

export function canonicalStandardSource(source) {
  let url;
  try { url = new URL(source); } catch { throw new StackResolutionError("STACK-SOURCE", "Standard source must be an exact GitHub repository HTTPS URL."); }
  const match = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9_.-]*)\/([A-Za-z0-9][A-Za-z0-9_.-]*?)(?:\.git)?\/?$/u);
  requireValue(url.protocol === "https:" && url.hostname === "github.com" && !url.port
    && !url.username && !url.password && !url.search && !url.hash && match,
  "STACK-SOURCE", "Standard source must be an exact GitHub repository HTTPS URL.");
  return `https://github.com/${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
}

export function parseReleaseVersion(tag) {
  if (typeof tag !== "string") return null;
  const m = tag.match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u);
  if (!m) return null;
  const prerelease = m[4]?.split(".") ?? [];
  if (prerelease.some(part => /^\d+$/u.test(part) && /^0\d/u.test(part))) return null;
  return { tag, core: m.slice(1, 4).map(part => BigInt(part)), prerelease };
}

export function compareReleaseVersions(left, right) {
  const a = typeof left === "string" ? parseReleaseVersion(left) : left;
  const b = typeof right === "string" ? parseReleaseVersion(right) : right;
  requireValue(a && b, "STACK-VERSION", "Release comparison requires semantic versions.");
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  if (!a.prerelease.length || !b.prerelease.length) return Number(!a.prerelease.length) - Number(!b.prerelease.length);
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    const x = a.prerelease[i], y = b.prerelease[i];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const xn = /^\d+$/u.test(x), yn = /^\d+$/u.test(y);
    if (xn && yn) return BigInt(x) < BigInt(y) ? -1 : 1;
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

// Only this fixed API origin receives the optional credential. Redirects and
// response-supplied URLs are never followed, including pagination links.
export function createStackRemote(source = DEFAULT_STANDARD_SOURCE, { fetchImpl = globalThis.fetch, token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN } = {}) {
  source = canonicalStandardSource(source);
  const fullName = source.slice("https://github.com/".length);
  const api = `https://api.github.com/repos/${fullName}`;
  async function get(suffix) {
    let response;
    try {
      response = await fetchImpl(api + suffix, {
        method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch { throw new StackResolutionError("STACK-NETWORK", "GitHub evidence could not be read; no release or HEAD fallback is permitted."); }
    requireValue(response?.status === 200, "STACK-NETWORK", `GitHub evidence request failed (HTTP ${response?.status ?? "unknown"}); no fallback is permitted.`);
    try { return await response.json(); } catch { throw new StackResolutionError("STACK-IDENTITY", "GitHub evidence is not valid JSON."); }
  }
  async function pages(suffix, property = null) {
    const values = [], ids = new Set();
    let expectedTotal = null;
    for (let page = 1; page <= 100; page++) {
      const result = await get(`${suffix}${suffix.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      const rows = property ? result?.[property] : result;
      requireValue(Array.isArray(rows), "STACK-IDENTITY", "GitHub pagination returned an invalid collection.");
      if (property) {
        requireValue(Number.isSafeInteger(result.total_count) && result.total_count >= 0 && result.total_count <= 1000,
          "STACK-PAGINATION", "Workflow evidence is incomplete or exceeds GitHub's filtered-result limit.");
        expectedTotal ??= result.total_count;
        requireValue(expectedTotal === result.total_count, "STACK-PAGINATION", "Workflow evidence changed during pagination.");
      }
      for (const row of rows) {
        requireValue(positive(row?.id) && !ids.has(row.id), "STACK-PAGINATION", "GitHub pagination has duplicate or missing identities.");
        ids.add(row.id); values.push(row);
      }
      if (rows.length < 100) {
        requireValue(expectedTotal === null || values.length === expectedTotal, "STACK-PAGINATION", "GitHub workflow evidence was truncated.");
        return values;
      }
    }
    throw new StackResolutionError("STACK-PAGINATION", "Release pagination exceeded its bounded limit; latest cannot be proved.");
  }
  return {
    source,
    repository: () => get(""),
    releases: () => pages("/releases"),
    release: tag => get(`/releases/tags/${encodeURIComponent(tag)}`),
    tag: tag => get(`/git/ref/tags/${encodeURIComponent(tag)}`),
    annotatedTag: sha => get(`/git/tags/${sha}`),
    commit: sha => get(`/git/commits/${sha}`),
    tree: sha => get(`/git/trees/${sha}?recursive=1`),
    blob: sha => get(`/git/blobs/${sha}`),
    workflow: () => get("/actions/workflows/verify.yml"),
    runs: sha => pages(`/actions/workflows/verify.yml/runs?branch=main&event=push&head_sha=${sha}`, "workflow_runs"),
    run: id => get(`/actions/runs/${id}`),
    compare: (base, head) => get(`/compare/${base}...${head}?per_page=1`),
  };
}

function releaseIdentity(release, source, tag = release?.tag_name) {
  requireValue(positive(release?.id) && release.tag_name === tag && parseReleaseVersion(tag)
    && release.draft === false && release.immutable === true && release.html_url === `${source}/releases/tag/${tag}`,
  "STACK-RELEASE", "Release must have an exact published, non-draft, immutable semantic-version identity.");
  timestamp(release.published_at, "Release publication");
  return { id: release.id, tag, publishedAt: release.published_at, url: release.html_url, draft: false, immutable: true };
}
function newestRelease(releases, source) {
  requireValue(Array.isArray(releases), "STACK-IDENTITY", "Release evidence must be a collection.");
  const eligible = releases.filter(item => item?.draft === false && item.immutable === true && parseReleaseVersion(item.tag_name));
  requireValue(eligible.length > 0, "STACK-NO-RELEASE", "No published immutable semantic-version release is available.");
  eligible.sort((a, b) => compareReleaseVersions(b.tag_name, a.tag_name));
  requireValue(eligible.length === 1 || compareReleaseVersions(eligible[0].tag_name, eligible[1].tag_name) !== 0,
    "STACK-AMBIGUOUS", "Multiple release identities have the newest semantic version.");
  return releaseIdentity(eligible[0], source);
}
function repositoryIdentity(value, expected) {
  return value?.id === expected.id && typeof value.full_name === "string" && value.full_name.toLowerCase() === expected.full_name.toLowerCase();
}
function runIdentity(run, repo, workflow, revision, source) {
  requireValue(positive(run?.id) && positive(run.run_attempt) && run.workflow_id === workflow.id && run.path === WORKFLOW
    && run.head_sha === revision && run.head_commit?.id === revision && run.head_branch === "main" && run.event === "push"
    && repositoryIdentity(run.repository, repo) && repositoryIdentity(run.head_repository, repo)
    && run.html_url === `${source}/actions/runs/${run.id}`,
  "STACK-VERIFY-IDENTITY", "Verify evidence must identify the trusted repository, workflow, push/main event and exact release commit.");
  timestamp(run.created_at, "Verify creation"); timestamp(run.updated_at, "Verify update");
}
function newestRun(runs, repo, workflow, revision, source) {
  requireValue(Array.isArray(runs) && runs.length > 0, "STACK-VERIFY-MISSING", "The newest release has no exact-commit push/main Verify evidence; older releases are not substituted.");
  for (const run of runs) runIdentity(run, repo, workflow, revision, source);
  // updated_at includes a later attempt of an older run. Never filter to success.
  return [...runs].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || b.id - a.id)[0];
}
function unchangedRun(current, selected) {
  return current.id === selected.id && current.run_attempt === selected.run_attempt
    && current.updated_at === selected.updated_at && current.status === "completed" && current.conclusion === "success";
}

async function releaseCommit(remote, tag) {
  const ref = await remote.tag(tag);
  requireValue(ref?.ref === `refs/tags/${tag}`, "STACK-TAG", "Release tag response does not identify the exact requested tag.");
  let object = ref.object;
  const visited = new Set();
  for (let depth = 0; depth < 16; depth++) {
    requireValue(SHA.test(object?.sha ?? "") && !visited.has(object.sha), "STACK-TAG", "Release tag identity is invalid or cyclic.");
    if (object.type === "commit") return object.sha;
    requireValue(object.type === "tag", "STACK-TAG", "Release tag must resolve to a commit.");
    visited.add(object.sha);
    const annotated = await remote.annotatedTag(object.sha);
    requireValue(annotated?.sha === object.sha, "STACK-TAG", "Annotated tag bytes do not match the requested identity.");
    object = annotated.object;
  }
  throw new StackResolutionError("STACK-TAG", "Annotated tag chain exceeds the bounded peel limit.");
}

async function stackFiles(remote, revision) {
  const commit = await remote.commit(revision);
  requireValue(commit?.sha === revision && SHA.test(commit.tree?.sha ?? ""), "STACK-COMMIT", "Git commit evidence must match the full selected revision.");
  const tree = await remote.tree(commit.tree.sha);
  requireValue(tree?.sha === commit.tree.sha && tree.truncated === false && Array.isArray(tree.tree),
    "STACK-FILES", "Exact release tree is missing or truncated.");
  return Promise.all(STACK_FILES.map(async file => {
    const entries = tree.tree.filter(entry => entry.path === file);
    requireValue(entries.length === 1 && entries[0].type === "blob" && ["100644", "100755"].includes(entries[0].mode)
      && SHA.test(entries[0].sha), "STACK-FILES", `Release stack file is absent, ambiguous or not a regular file: ${file}`);
    const entry = entries[0], blob = await remote.blob(entry.sha);
    requireValue(blob?.sha === entry.sha && blob.encoding === "base64" && typeof blob.content === "string"
      && /^[A-Za-z0-9+/=\s]*$/u.test(blob.content), "STACK-FILES", `Release blob identity is invalid: ${file}`);
    const bytes = Buffer.from(blob.content, "base64");
    requireValue(bytes.length === blob.size && hash("sha1", Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])) === entry.sha,
      "STACK-FILES", `Release blob bytes do not match the Git identity: ${file}`);
    return { path: file, gitBlob: entry.sha, sha256: hash("sha256", bytes), bytes: bytes.length };
  }));
}

export async function resolveStandardStack({ source = DEFAULT_STANDARD_SOURCE, remote, fetchImpl, token, now = new Date().toISOString() } = {}) {
  source = canonicalStandardSource(source);
  remote ??= createStackRemote(source, { fetchImpl, token });
  requireValue(remote.source === source, "STACK-SOURCE", "Evidence transport must identify the selected Standard repository.");
  const observedAt = timestamp(typeof now === "function" ? now() : now, "Observation");
  const repo = await remote.repository();
  requireValue(positive(repo?.id) && repo.full_name?.toLowerCase() === source.slice("https://github.com/".length)
    && repo.html_url?.toLowerCase() === source && repo.default_branch === "main", "STACK-SOURCE", "GitHub repository identity or trusted default branch does not match.");
  const listed = newestRelease(await remote.releases(), source);
  const release = releaseIdentity(await remote.release(listed.tag), source, listed.tag);
  requireValue(JSON.stringify(listed) === JSON.stringify(release), "STACK-RELEASE", "Selected release changed during resolution.");
  const revision = await releaseCommit(remote, release.tag);
  const workflow = await remote.workflow();
  requireValue(positive(workflow?.id) && workflow.path === WORKFLOW && workflow.state === "active", "STACK-VERIFY-IDENTITY", "The trusted Verify workflow is unavailable.");
  const selected = newestRun(await remote.runs(revision), repo, workflow, revision, source);
  const run = await remote.run(selected.id);
  runIdentity(run, repo, workflow, revision, source);
  requireValue(run.id === selected.id && run.run_attempt === selected.run_attempt && run.updated_at === selected.updated_at,
    "STACK-VERIFY-CHANGED", "Verify changed during resolution; retry after the latest attempt completes.");
  requireValue(run.status === "completed" && run.conclusion === "success", "STACK-VERIFY-FAILED", "The newest Verify run or attempt for the selected release is not successful.");
  const files = await stackFiles(remote, revision);
  // Recheck mutable API observations after the exact content reads.
  const finalListed = newestRun(await remote.runs(revision), repo, workflow, revision, source);
  requireValue(unchangedRun(finalListed, run), "STACK-VERIFY-CHANGED", "Newer or changed Verify evidence appeared while the stack was read.");
  const finalRun = await remote.run(run.id);
  runIdentity(finalRun, repo, workflow, revision, source);
  requireValue(unchangedRun(finalRun, run), "STACK-VERIFY-CHANGED", "Verify evidence changed while the stack was read.");
  requireValue(await releaseCommit(remote, release.tag) === revision
    && JSON.stringify(releaseIdentity(await remote.release(release.tag), source, release.tag)) === JSON.stringify(release)
    && JSON.stringify(newestRelease(await remote.releases(), source)) === JSON.stringify(release),
  "STACK-RELEASE", "Immutable release identity changed while the stack was read.");
  return {
    $schema: STACK_REPORT_SCHEMA, schemaVersion: "1.0", operation: "resolve", selection: "latest-verified-immutable",
    observedAt, source, readOnly: true, writesPerformed: false, currentVulnerabilityClearance: "not-checked",
    stack: { tag: release.tag, revision, release,
      qualification: { workflowPath: WORKFLOW, workflowId: workflow.id, runId: run.id, attempt: run.run_attempt,
        event: "push", headBranch: "main", headSha: revision, status: "completed", conclusion: "success", updatedAt: run.updated_at, url: run.html_url },
      qualificationScope: "dated-release-verification", fileEvidenceScope: "selected-stack-files; full revision binds all release source", files },
  };
}
export const resolveLatestStack = resolveStandardStack;

export async function checkWikiStack(root, options = {}) {
  let manifest;
  try { manifest = parse(fs.readFileSync(path.join(path.resolve(root), ".wiki-standard.yaml"), "utf8")); }
  catch { throw new StackResolutionError("STACK-INSTALLED", "The target must have a readable, valid .wiki-standard.yaml manifest."); }
  const source = canonicalStandardSource(manifest?.standard?.source);
  const revision = manifest?.standard?.revision;
  requireValue(typeof revision === "string" && SHA.test(revision), "STACK-INSTALLED", "Installed standard.revision must be a full immutable Git commit, not a tag or branch.");
  if (options.source) requireValue(canonicalStandardSource(options.source) === source, "STACK-SOURCE", "Installed and requested Standard sources differ.");
  const remote = options.remote ?? createStackRemote(source, options);
  const report = await resolveStandardStack({ ...options, source, remote });
  const tag = manifest?.capabilities?.standard_release_tag ?? null;
  if (tag !== null) {
    requireValue(typeof tag === "string" && parseReleaseVersion(tag), "STACK-INSTALLED", "Installed Standard release tag must be an exact semantic release identity.");
    const installedRelease = releaseIdentity(await remote.release(tag), source, tag);
    requireValue(await releaseCommit(remote, installedRelease.tag) === revision, "STACK-INSTALLED", "Installed Standard release tag does not resolve to its declared revision.");
  }
  let relation = "same";
  if (revision !== report.stack.revision) {
    requireValue((await remote.commit(revision))?.sha === revision, "STACK-INSTALLED", "Installed revision is unavailable in the declared Standard repository.");
    const comparison = await remote.compare(revision, report.stack.revision);
    const ahead = comparison?.ahead_by, behind = comparison?.behind_by;
    requireValue(comparison?.base_commit?.sha === revision && Number.isSafeInteger(ahead) && ahead >= 0
      && Number.isSafeInteger(behind) && behind >= 0 && SHA.test(comparison.merge_base_commit?.sha ?? ""),
    "STACK-COMPARE", "Exact revision ancestry could not be established.");
    if (comparison.status === "ahead" && ahead > 0 && behind === 0 && comparison.merge_base_commit.sha === revision) relation = "update-available";
    else if (comparison.status === "behind" && behind > 0 && ahead === 0 && comparison.merge_base_commit.sha === report.stack.revision) relation = "ahead";
    else if (comparison.status === "diverged" && ahead > 0 && behind > 0
      && ![revision, report.stack.revision].includes(comparison.merge_base_commit.sha)) relation = "diverged";
    else throw new StackResolutionError("STACK-COMPARE", "Revision ancestry evidence is inconsistent.");
  }
  return { ...report, operation: "check", installed: { source, revision, tag, releaseIdentity: tag === null ? "not-recorded" : "verified-immutable-release" }, relation,
    installedFileIntegrity: "not-checked",
    migration: "explicit-user-selection-and-target-verification-required" };
}
