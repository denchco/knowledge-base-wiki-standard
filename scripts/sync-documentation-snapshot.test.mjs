import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
  });
  assert.throws(() => parseArguments([]), SyncUsageError);
  assert.throws(() => parseArguments(["--check", "--apply"]), SyncUsageError);
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

function createFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "denchco-doc-sync-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const standardRoot = path.join(root, "standard");
  const documentationRoot = path.join(root, "documentation");
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
    defaultDocumentationRepository: "../documentation",
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
