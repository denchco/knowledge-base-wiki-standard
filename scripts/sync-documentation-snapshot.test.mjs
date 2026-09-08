import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  STANDARD_ROOT,
  SyncSafetyError,
  SyncUsageError,
  buildDesiredSnapshot,
  parseArguments,
  run,
  synchronize,
} from "./sync-documentation-snapshot.mjs";

const SCHEMA_ID = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/documentation-sync-snapshot-v1.json";
const CONTRACT_PATH = "sync/documentation-sync-contract-v1.json";
const SNAPSHOT_ROOT = ".denchco-standard-snapshot";
const ALLOWLIST = [
  ".wiki-standard.yaml",
  "alpha.txt",
  "schema/documentation-sync-snapshot-v1.json",
  "scripts/sync-documentation-snapshot.mjs",
  "scripts/sync-documentation-snapshot.test.mjs",
  CONTRACT_PATH,
];

test("CLI makes read-only checking and explicit application mutually exclusive", () => {
  assert.deepEqual(parseArguments(["--check", "--json"]), {
    mode: "check",
    documentationRepository: null,
    json: true,
    development: false,
    standardRevision: null,
  });
  assert.throws(() => parseArguments([]), SyncUsageError);
  assert.throws(() => parseArguments(["--check", "--apply"]), SyncUsageError);
  assert.equal(parseArguments(["--check", "--development"]).development, true);
  assert.equal(parseArguments(["--apply", "--standard-revision", "a".repeat(40)]).standardRevision, "a".repeat(40));
  assert.throws(() => parseArguments(["--apply", "--standard-revision", "main"]), SyncUsageError);
  assert.throws(() => parseArguments(["--apply", "--development", "--standard-revision", "a".repeat(40)]), SyncUsageError);
});

test("desired manifests are deterministic, portable, and tied to a clean Git revision", (t) => {
  const fixture = createFixture(t);
  const first = buildDesiredSnapshot({ standardRoot: fixture.standardRoot });
  const second = buildDesiredSnapshot({ standardRoot: fixture.standardRoot });
  const commit = git(fixture.standardRoot, ["rev-parse", "HEAD"]);

  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifest.$schema, SCHEMA_ID);
  assert.equal(first.manifest.standard.treeState, "clean");
  assert.equal(first.manifest.standard.gitCommit, commit);
  assert.equal(first.manifest.standard.revision, commit);
  assert.equal(first.manifest.contract.allowlistCount, ALLOWLIST.length);
  assert.equal(JSON.stringify(first.manifest).includes(fixture.root), false);
});

test("check is read-only; apply updates only the isolated snapshot and refuses local snapshot edits", (t) => {
  const fixture = createFixture(t);
  const readmeBefore = readFileSync(path.join(fixture.documentationRoot, "README.md"), "utf8");

  const absent = synchronize({
    mode: "check",
    standardRoot: fixture.standardRoot,
    documentationRoot: fixture.documentationRoot,
  });
  assert.equal(absent.status, "drift");
  assert.equal(existsSync(path.join(fixture.documentationRoot, SNAPSHOT_ROOT)), false);
  assert.equal(readFileSync(path.join(fixture.documentationRoot, "README.md"), "utf8"), readmeBefore);

  const applied = synchronize({
    mode: "apply",
    standardRoot: fixture.standardRoot,
    documentationRoot: fixture.documentationRoot,
  });
  assert.equal(applied.status, "current");
  assert.equal(applied.applied, true);
  assert.deepEqual(applied.changes.added, ALLOWLIST);
  assert.equal(synchronize({
    mode: "check",
    standardRoot: fixture.standardRoot,
    documentationRoot: fixture.documentationRoot,
  }).status, "current");

  const manifest = JSON.parse(readFileSync(
    path.join(fixture.documentationRoot, SNAPSHOT_ROOT, "manifest.json"),
    "utf8",
  ));
  assert.equal(manifest.standard.version, "9.8.7-test");
  assert.equal(manifest.standard.revision, manifest.standard.gitCommit);
  assert.equal(manifest.files.length, ALLOWLIST.length);
  assert.equal(readFileSync(path.join(fixture.documentationRoot, "README.md"), "utf8"), readmeBefore);

  write(fixture.standardRoot, "alpha.txt", "second source revision\n");
  const drift = synchronize({
    mode: "check",
    standardRoot: fixture.standardRoot,
    documentationRoot: fixture.documentationRoot,
  });
  assert.equal(drift.status, "drift");
  assert.deepEqual(drift.changes.updated, ["alpha.txt"]);
  assert.match(drift.standard.revision, /^[0-9a-f]{40,64}\+snapshot\.[0-9a-f]{16}$/);

  const updated = synchronize({
    mode: "apply",
    standardRoot: fixture.standardRoot,
    documentationRoot: fixture.documentationRoot,
  });
  assert.deepEqual(updated.changes.updated, ["alpha.txt"]);
  const managedAlpha = path.join(fixture.documentationRoot, SNAPSHOT_ROOT, "files", "alpha.txt");
  assert.equal(readFileSync(managedAlpha, "utf8"), "second source revision\n");

  writeFileSync(managedAlpha, "local documentation edit\n", "utf8");
  assert.throws(
    () => synchronize({
      mode: "apply",
      standardRoot: fixture.standardRoot,
      documentationRoot: fixture.documentationRoot,
    }),
    (error) => error instanceof SyncSafetyError && /locally modified managed snapshot file/.test(error.message),
  );
  assert.equal(readFileSync(managedAlpha, "utf8"), "local documentation edit\n");
  assert.equal(readFileSync(path.join(fixture.documentationRoot, "README.md"), "utf8"), readmeBefore);
});

test("apply refuses an unmanaged snapshot root that has no trusted manifest", (t) => {
  const fixture = createFixture(t);
  write(fixture.documentationRoot, `${SNAPSHOT_ROOT}/unmanaged.txt`, "keep me\n");

  assert.throws(
    () => synchronize({
      mode: "apply",
      standardRoot: fixture.standardRoot,
      documentationRoot: fixture.documentationRoot,
    }),
    (error) => error instanceof SyncSafetyError && /unmanaged snapshot path/.test(error.message),
  );
  assert.equal(
    readFileSync(path.join(fixture.documentationRoot, SNAPSHOT_ROOT, "unmanaged.txt"), "utf8"),
    "keep me\n",
  );
});

test("repository discovery preserves trailing-space path components", (t) => {
  const fixture = createFixture(t, { trailingSpaceRepositoryRoots: true });
  const canonicalStandardRoot = realpathSync(fixture.standardRoot);
  const canonicalDocumentationRoot = realpathSync(fixture.documentationRoot);
  assert.equal(path.basename(fixture.standardRoot), "standard ");
  assert.equal(path.basename(fixture.documentationRoot), "documentation ");

  const desired = buildDesiredSnapshot({ standardRoot: fixture.standardRoot });
  assert.equal(desired.manifest.standard.treeState, "clean");
  assert.equal(desired.standardRoot, canonicalStandardRoot);

  const checked = synchronize({
    mode: "check",
    standardRoot: fixture.standardRoot,
  });
  assert.equal(checked.status, "drift");
  assert.equal(checked.documentationRepository, canonicalDocumentationRoot);
  assert.equal(existsSync(path.join(fixture.documentationRoot, SNAPSHOT_ROOT)), false);
});

test("released snapshot stays current when development HEAD advances and its worktree is dirty", (t) => {
  const fixture = createFixture(t);
  const releaseRevision = declareRelease(fixture);
  assert.equal(synchronize({ mode: "apply", source: "release", ...fixture }).status, "current");
  write(fixture.standardRoot, "alpha.txt", "development commit\n");
  git(fixture.standardRoot, ["add", "alpha.txt"]);
  git(fixture.standardRoot, ["commit", "--quiet", "-m", "development advances"]);
  const developmentRevision = git(fixture.standardRoot, ["rev-parse", "HEAD"]);
  write(fixture.standardRoot, "alpha.txt", "uncommitted development content\n");
  const before = captureRepositories(fixture);
  const result = synchronize({ mode: "check", source: "release", ...fixture });
  assert.equal(result.status, "current");
  assert.equal(result.source, "release");
  assert.equal(result.releaseTag, "v9.8.7-test");
  assert.equal(result.standard.gitCommit, releaseRevision);
  assert.deepEqual(result.development, { gitCommit: developmentRevision, treeState: "dirty" });
  assert.deepEqual(captureRepositories(fixture), before);
  assert.equal(synchronize({ mode: "check", ...fixture }).status, "drift");
});

test("inherited Git repository/index selectors cannot redirect the disposable checkout", (t) => {
  const fixture = createFixture(t);
  declareRelease(fixture);
  synchronize({ mode: "apply", source: "release", ...fixture });
  write(fixture.standardRoot, "alpha.txt", "development commit\n");
  git(fixture.standardRoot, ["add", "alpha.txt"]);
  git(fixture.standardRoot, ["commit", "--quiet", "-m", "development advances"]);
  const before = captureRepositories(fixture);
  const selectors = {
    GIT_INDEX_FILE: path.join(fixture.standardRoot, ".git", "index"),
    GIT_DIR: path.join(fixture.standardRoot, ".git"),
    GIT_COMMON_DIR: path.join(fixture.standardRoot, ".git"),
    GIT_WORK_TREE: fixture.standardRoot,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.worktree",
    GIT_CONFIG_VALUE_0: fixture.standardRoot,
  };
  const previous = Object.fromEntries(Object.keys(selectors).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, selectors);
    assert.equal(synchronize({ mode: "check", source: "release", ...fixture }).status, "current");
    assert.deepEqual(captureRepositories(fixture), before);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("an explicit documentation path compares the release despite a broken mutable contract edit", (t) => {
  const fixture = createFixture(t);
  declareRelease(fixture);
  synchronize({ mode: "apply", source: "release", ...fixture });
  write(fixture.standardRoot, CONTRACT_PATH, "{ incomplete development edit\n");
  const before = captureRepositories(fixture);
  assert.equal(synchronize({ mode: "check", source: "release", ...fixture }).status, "current");
  assert.deepEqual(captureRepositories(fixture), before);
});

test("CLI defaults to the declared release and requires an explicit development selection", (t) => {
  const fixture = createFixture(t);
  declareRelease(fixture);
  synchronize({ mode: "apply", source: "release", ...fixture });
  write(fixture.standardRoot, "alpha.txt", "dirty development content\n");
  const output = [];
  t.mock.method(process.stdout, "write", (text) => { output.push(text); return true; });
  assert.equal(run(["--check", "--documentation-repo", fixture.documentationRoot, "--json"], { standardRoot: fixture.standardRoot }), 0);
  assert.equal(JSON.parse(output.join("")).source, "release");
  output.length = 0;
  assert.equal(run(["--check", "--development", "--documentation-repo", fixture.documentationRoot, "--json"], { standardRoot: fixture.standardRoot }), 1);
  assert.equal(JSON.parse(output.join("")).source, "development");
});

test("release tag/pin mismatch and absent immutable references fail without repository mutations", (t) => {
  const fixture = createFixture(t);
  const revision = declareRelease(fixture);
  const declarationPath = path.join(fixture.documentationRoot, ".wiki-standard.yaml");
  const valid = readFileSync(declarationPath, "utf8");
  writeFileSync(declarationPath, valid.replace(revision, "a".repeat(40)));
  let before = captureRepositories(fixture);
  assert.throws(() => synchronize({ mode: "check", source: "release", ...fixture }), /resolves to .*not documentation pin/);
  assert.deepEqual(captureRepositories(fixture), before);
  writeFileSync(declarationPath, valid.replace("v9.8.7-test", "v0.0.0-missing"));
  before = captureRepositories(fixture);
  assert.throws(() => synchronize({ mode: "check", source: "release", ...fixture }), /git rev-parse --verify refs\/tags\/v0.0.0-missing/);
  assert.deepEqual(captureRepositories(fixture), before);
  writeFileSync(declarationPath, valid.replace(revision, revision.slice(0, 12)));
  assert.throws(() => synchronize({ mode: "check", source: "release", ...fixture }), /full immutable Standard commit/);
  writeFileSync(declarationPath, valid.replace("  standard_release_tag: v9.8.7-test\n", ""));
  assert.throws(() => synchronize({ mode: "check", source: "release", ...fixture }), /standard_release_tag/);
  assert.throws(() => synchronize({ mode: "apply", standardRevision: "a".repeat(40), ...fixture }), /git rev-parse --verify/);
});

test("exact snapshots preserve raw committed bytes despite checkout conversion attributes", (t) => {
  const fixture = createFixture(t);
  write(fixture.standardRoot, ".gitattributes", "alpha.txt text eol=crlf ident\n");
  write(fixture.standardRoot, "alpha.txt", "$Id$\ncommitted LF content\n");
  git(fixture.standardRoot, ["add", ".gitattributes", "alpha.txt"]);
  git(fixture.standardRoot, ["commit", "--quiet", "-m", "conversion attributes"]);
  const revision = declareRelease(fixture);
  const raw = execFileSync("git", ["show", `${revision}:alpha.txt`], { cwd: fixture.standardRoot });
  const sourceBefore = captureTree(fixture.standardRoot);
  synchronize({ mode: "apply", source: "release", ...fixture });
  assert.deepEqual(readFileSync(path.join(fixture.documentationRoot, SNAPSHOT_ROOT, "files/alpha.txt")), raw);
  assert.deepEqual(captureTree(fixture.standardRoot), sourceBefore);
});

test("exact candidate application uses committed bytes and preserves declarations and conflict refusal", (t) => {
  const fixture = createFixture(t);
  const revision = declareRelease(fixture);
  const declaration = readFileSync(path.join(fixture.documentationRoot, ".wiki-standard.yaml"), "utf8");
  write(fixture.standardRoot, "alpha.txt", "candidate content\n");
  git(fixture.standardRoot, ["add", "alpha.txt"]);
  git(fixture.standardRoot, ["commit", "--quiet", "-m", "candidate"]);
  const candidateRevision = git(fixture.standardRoot, ["rev-parse", "HEAD"]);
  write(fixture.standardRoot, "alpha.txt", "dirty content must not be copied\n");
  const sourceBefore = captureTree(fixture.standardRoot);
  const result = synchronize({ mode: "apply", standardRevision: candidateRevision, ...fixture });
  assert.equal(result.source, "exact-revision");
  assert.equal(result.standard.gitCommit, candidateRevision);
  assert.equal(result.standard.treeState, "clean");
  assert.equal(result.releaseTag, undefined);
  assert.equal(readFileSync(path.join(fixture.documentationRoot, SNAPSHOT_ROOT, "files/alpha.txt"), "utf8"), "candidate content\n");
  assert.equal(readFileSync(path.join(fixture.documentationRoot, ".wiki-standard.yaml"), "utf8"), declaration);
  assert.deepEqual(captureTree(fixture.standardRoot), sourceBefore);
  const managedPath = path.join(fixture.documentationRoot, SNAPSHOT_ROOT, "files/alpha.txt");
  writeFileSync(managedPath, "local edit retained\n");
  assert.throws(() => synchronize({ mode: "apply", standardRevision: revision, ...fixture }), /locally modified managed snapshot file/);
  assert.equal(readFileSync(managedPath, "utf8"), "local edit retained\n");
});

function declareRelease(fixture) {
  const revision = git(fixture.standardRoot, ["rev-parse", "HEAD"]);
  git(fixture.standardRoot, ["tag", "v9.8.7-test", revision]);
  write(fixture.documentationRoot, ".wiki-standard.yaml", [
    "standard:",
    "  name: DenchCo Knowledge Base Wiki Standard",
    `  revision: ${revision}`,
    "capabilities:",
    "  standard_release_tag: v9.8.7-test",
    "",
  ].join("\n"));
  return revision;
}

function captureRepositories(fixture) {
  return { standard: captureTree(fixture.standardRoot), documentation: captureTree(fixture.documentationRoot) };
}

function captureTree(root) {
  const content = {};
  visit("");
  return content;
  function visit(relative) {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(child);
      else {
        const metadata = lstatSync(path.join(root, child));
        content[child] = { bytes: readFileSync(path.join(root, child)).toString("base64"), mode: metadata.mode, modified: metadata.mtimeMs };
      }
    }
  }
}

function createFixture(t, { trailingSpaceRepositoryRoots = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "denchco-doc-sync-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const standardRoot = path.join(root, trailingSpaceRepositoryRoots ? "standard " : "standard");
  const documentationRoot = path.join(root, trailingSpaceRepositoryRoots ? "documentation " : "documentation");
  mkdirSync(standardRoot, { recursive: true });
  mkdirSync(documentationRoot, { recursive: true });

  write(standardRoot, ".wiki-standard.yaml", [
    "standard:",
    "  name: DenchCo Knowledge Base Wiki Standard",
    "  version: 9.8.7-test",
    "",
  ].join("\n"));
  write(standardRoot, "alpha.txt", "first source revision\n");
  write(
    standardRoot,
    "schema/documentation-sync-snapshot-v1.json",
    readFileSync(path.join(STANDARD_ROOT, "schema", "documentation-sync-snapshot-v1.json"), "utf8"),
  );
  write(standardRoot, "scripts/sync-documentation-snapshot.mjs", "// fixture implementation\n");
  write(standardRoot, "scripts/sync-documentation-snapshot.test.mjs", "// fixture tests\n");
  write(standardRoot, CONTRACT_PATH, `${JSON.stringify({
    contractVersion: "1.0",
    defaultDocumentationRepository: `../${path.basename(documentationRoot)}`,
    snapshotRoot: SNAPSHOT_ROOT,
    manifestPath: `${SNAPSHOT_ROOT}/manifest.json`,
    filesRoot: `${SNAPSHOT_ROOT}/files`,
    allowlist: ALLOWLIST,
  }, null, 2)}\n`);
  initialiseGit(standardRoot);

  write(documentationRoot, "README.md", "documentation-owned content\n");
  initialiseGit(documentationRoot);
  return { root, standardRoot, documentationRoot };
}

function initialiseGit(repositoryRoot) {
  git(repositoryRoot, ["init", "--quiet"]);
  git(repositoryRoot, ["config", "user.name", "Sync Contract Test"]);
  git(repositoryRoot, ["config", "user.email", "sync-contract@example.invalid"]);
  git(repositoryRoot, ["add", "--all"]);
  git(repositoryRoot, ["commit", "--quiet", "-m", "fixture"]);
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function write(root, relativePath, content) {
  const destination = path.join(root, ...relativePath.split("/"));
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content, "utf8");
}
