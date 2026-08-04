#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

export const STANDARD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTRACT_PATH = "sync/documentation-sync-contract-v1.json";
const MANIFEST_SCHEMA_ID = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/documentation-sync-snapshot-v1.json";
const CODEPOINT_SORT = (left, right) => left < right ? -1 : left > right ? 1 : 0;

const HELP = `DenchCo standard → documentation snapshot synchronizer

Usage:
  node scripts/sync-documentation-snapshot.mjs --check [--documentation-repo <path>] [--json]
  node scripts/sync-documentation-snapshot.mjs --apply [--documentation-repo <path>] [--json]

--check is wholly read-only and exits 1 when the isolated snapshot is absent or
out of date. --apply is the only write mode. It writes solely below the
contract's dedicated snapshot root, refuses locally modified or unmanaged
snapshot files, and never replaces the documentation repository's own pages.

The default documentation repository is a committed sibling path relative to
the standard repository. --documentation-repo may select another existing Git
repository at runtime; no absolute user path is stored in the snapshot.`;

export class SyncUsageError extends Error {}
export class SyncSafetyError extends Error {}

export function parseArguments(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const options = { mode: null, documentationRepository: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check" || argument === "--apply") {
      const mode = argument.slice(2);
      if (options.mode && options.mode !== mode) throw new SyncUsageError("--check and --apply are mutually exclusive.");
      options.mode = mode;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--documentation-repo") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new SyncUsageError("--documentation-repo requires a path.");
      options.documentationRepository = value;
      index += 1;
    } else {
      throw new SyncUsageError(`Unsupported argument: ${argument}`);
    }
  }
  if (!options.mode) throw new SyncUsageError("Choose exactly one mode: --check or --apply.");
  return options;
}

export function loadContract(standardRoot = STANDARD_ROOT, contractRelativePath = CONTRACT_PATH) {
  assertSafeRepositoryPath(contractRelativePath, "contract path");
  const contractPath = path.join(standardRoot, contractRelativePath);
  const contract = strictJson(readFileSync(contractPath, "utf8"), contractRelativePath);
  const expectedKeys = [
    "contractVersion",
    "defaultDocumentationRepository",
    "snapshotRoot",
    "manifestPath",
    "filesRoot",
    "allowlist",
  ];
  requireExactKeys(contract, expectedKeys, "synchronization contract");
  if (contract.contractVersion !== "1.0") throw new SyncSafetyError("Unsupported synchronization contract version.");
  if (typeof contract.defaultDocumentationRepository !== "string" || path.isAbsolute(contract.defaultDocumentationRepository)) {
    throw new SyncSafetyError("defaultDocumentationRepository must be a repository-relative sibling path.");
  }
  if (contract.defaultDocumentationRepository.includes("\\")) {
    throw new SyncSafetyError("defaultDocumentationRepository must use portable forward slashes.");
  }
  for (const [label, value] of [
    ["snapshotRoot", contract.snapshotRoot],
    ["manifestPath", contract.manifestPath],
    ["filesRoot", contract.filesRoot],
  ]) assertSafeRepositoryPath(value, label);
  if (contract.manifestPath !== `${contract.snapshotRoot}/manifest.json`) {
    throw new SyncSafetyError("manifestPath must remain inside snapshotRoot as manifest.json.");
  }
  if (contract.filesRoot !== `${contract.snapshotRoot}/files`) {
    throw new SyncSafetyError("filesRoot must remain inside snapshotRoot as files/.");
  }
  if (!Array.isArray(contract.allowlist) || contract.allowlist.length === 0) {
    throw new SyncSafetyError("The synchronization allowlist must be a non-empty array.");
  }
  for (const entry of contract.allowlist) assertSafeRepositoryPath(entry, "allowlist entry");
  if (new Set(contract.allowlist).size !== contract.allowlist.length) {
    throw new SyncSafetyError("The synchronization allowlist contains duplicate paths.");
  }
  const sorted = [...contract.allowlist].sort(CODEPOINT_SORT);
  if (JSON.stringify(sorted) !== JSON.stringify(contract.allowlist)) {
    throw new SyncSafetyError("The synchronization allowlist must remain codepoint-sorted for deterministic review.");
  }
  for (const required of [
    contractRelativePath,
    "schema/documentation-sync-snapshot-v1.json",
    "scripts/sync-documentation-snapshot.mjs",
    "scripts/sync-documentation-snapshot.test.mjs",
  ]) {
    if (!contract.allowlist.includes(required)) throw new SyncSafetyError(`The synchronization contract must include itself and its implementation: missing ${required}`);
  }
  return { contract, contractPath, contractRelativePath };
}

export function buildDesiredSnapshot({
  standardRoot = STANDARD_ROOT,
  contractRelativePath = CONTRACT_PATH,
} = {}) {
  const canonicalStandardRoot = assertGitRepositoryRoot(standardRoot, "standard repository");
  const { contract, contractPath } = loadContract(canonicalStandardRoot, contractRelativePath);
  const entries = contract.allowlist.map((relativePath) => sourceEntry(canonicalStandardRoot, relativePath));
  const contentDigest = sha256(Buffer.from(entries.map((entry) => (
    `${entry.path}\0${entry.sha256}\0${entry.bytes}\0${entry.mode}\n`
  )).join("")));
  const gitCommit = git(canonicalStandardRoot, ["rev-parse", "HEAD"]);
  const treeState = git(canonicalStandardRoot, [
    "status", "--porcelain=v1", "--untracked-files=all", "--", ...contract.allowlist,
  ]) ? "dirty" : "clean";
  const revision = treeState === "clean" ? gitCommit : `${gitCommit}+snapshot.${contentDigest.slice(0, 16)}`;
  const standardDeclaration = yamlMapping(
    readFileSync(path.join(canonicalStandardRoot, ".wiki-standard.yaml"), "utf8"),
    ".wiki-standard.yaml",
  );
  const name = standardDeclaration.standard?.name;
  const version = standardDeclaration.standard?.version;
  if (name !== "DenchCo Knowledge Base Wiki Standard" || typeof version !== "string" || version === "") {
    throw new SyncSafetyError(".wiki-standard.yaml does not declare the expected standard name and version.");
  }
  const manifest = {
    $schema: MANIFEST_SCHEMA_ID,
    snapshotFormat: "1.0",
    standard: {
      name,
      version,
      gitCommit,
      treeState,
      revision,
      contentDigest,
    },
    contract: {
      path: contractRelativePath,
      sha256: sha256(readFileSync(contractPath)),
      allowlistCount: entries.length,
    },
    snapshot: {
      root: contract.snapshotRoot,
      manifest: contract.manifestPath,
      filesRoot: contract.filesRoot,
    },
    files: entries.map(({ content, sourcePath, ...entry }) => entry),
  };
  validateManifest(canonicalStandardRoot, manifest);
  return { standardRoot: canonicalStandardRoot, contract, manifest, entries };
}

export function inspectDocumentationSnapshot({ desired, documentationRoot }) {
  const canonicalDocumentationRoot = assertGitRepositoryRoot(documentationRoot, "documentation repository");
  if (canonicalDocumentationRoot === desired.standardRoot) {
    throw new SyncSafetyError("The documentation repository must not be the standard repository itself.");
  }
  const { contract } = desired;
  const snapshotRoot = resolveWithin(canonicalDocumentationRoot, contract.snapshotRoot, "snapshot root");
  const manifestPath = resolveWithin(canonicalDocumentationRoot, contract.manifestPath, "snapshot manifest");
  const filesRoot = resolveWithin(canonicalDocumentationRoot, contract.filesRoot, "snapshot files root");
  const report = {
    status: "drift",
    standard: desired.manifest.standard,
    installed: null,
    changes: { added: [], updated: [], deleted: [], manifest: true },
    conflicts: [],
  };

  if (!existsSync(manifestPath)) {
    if (existsSync(snapshotRoot)) {
      const unmanaged = walkFiles(snapshotRoot).map((entry) => `${contract.snapshotRoot}/${entry}`);
      if (unmanaged.length) report.conflicts.push(...unmanaged.map((entry) => `unmanaged snapshot path: ${entry}`));
    }
    report.changes.added = desired.entries.map((entry) => entry.path);
    return { ...report, documentationRoot: canonicalDocumentationRoot };
  }

  const installed = strictJson(readFileSync(manifestPath, "utf8"), contract.manifestPath);
  validateManifest(desired.standardRoot, installed);
  if (installed.snapshot?.root !== contract.snapshotRoot
    || installed.snapshot?.manifest !== contract.manifestPath
    || installed.snapshot?.filesRoot !== contract.filesRoot) {
    throw new SyncSafetyError("Installed manifest attempts to manage paths outside the current synchronization contract.");
  }
  report.installed = installed.standard;
  const oldEntries = new Map(installed.files.map((entry) => [entry.path, entry]));
  if (oldEntries.size !== installed.files.length) throw new SyncSafetyError("Installed manifest contains duplicate file paths.");
  const desiredEntries = new Map(desired.manifest.files.map((entry) => [entry.path, entry]));

  const expectedOnDisk = new Set([contract.manifestPath]);
  for (const entry of installed.files) {
    assertSafeRepositoryPath(entry.path, "installed snapshot file");
    const installedRelative = `${contract.filesRoot}/${entry.path}`;
    expectedOnDisk.add(installedRelative);
    const installedPath = resolveWithin(canonicalDocumentationRoot, installedRelative, "installed snapshot file");
    if (!existsSync(installedPath)) continue;
    const metadata = lstatSync(installedPath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      report.conflicts.push(`managed snapshot path is not a regular file: ${installedRelative}`);
      continue;
    }
    if (sha256(readFileSync(installedPath)) !== entry.sha256 || fileMode(metadata) !== entry.mode) {
      report.conflicts.push(`locally modified managed snapshot file: ${installedRelative}`);
    }
  }
  for (const relativeToSnapshot of walkFiles(snapshotRoot)) {
    const repositoryRelative = `${contract.snapshotRoot}/${relativeToSnapshot}`;
    if (!expectedOnDisk.has(repositoryRelative)) report.conflicts.push(`unmanaged snapshot path: ${repositoryRelative}`);
  }

  for (const [entryPath, entry] of desiredEntries) {
    const previous = oldEntries.get(entryPath);
    const targetPath = path.join(filesRoot, ...entryPath.split("/"));
    if (!previous) report.changes.added.push(entryPath);
    else if (previous.sha256 !== entry.sha256 || previous.bytes !== entry.bytes || previous.mode !== entry.mode) {
      report.changes.updated.push(entryPath);
    } else if (!existsSync(targetPath)) {
      report.changes.updated.push(entryPath);
    }
  }
  for (const entryPath of oldEntries.keys()) {
    if (!desiredEntries.has(entryPath)) report.changes.deleted.push(entryPath);
  }
  report.changes.manifest = stableJson(installed) !== stableJson(desired.manifest);
  report.status = !report.conflicts.length
    && !report.changes.manifest
    && !report.changes.added.length
    && !report.changes.updated.length
    && !report.changes.deleted.length
    ? "current"
    : report.conflicts.length ? "conflict" : "drift";
  return { ...report, documentationRoot: canonicalDocumentationRoot };
}

export function applyDocumentationSnapshot({ desired, documentationRoot }) {
  const before = inspectDocumentationSnapshot({ desired, documentationRoot });
  if (before.conflicts.length) {
    throw new SyncSafetyError(
      `Refusing to replace locally modified or unmanaged snapshot content:\n${before.conflicts.map((item) => `- ${item}`).join("\n")}`,
    );
  }
  if (before.status === "current") return { ...before, applied: false };

  const targetRoot = path.join(before.documentationRoot, desired.contract.snapshotRoot);
  const stageRoot = mkdtempSync(path.join(before.documentationRoot, ".denchco-standard-snapshot-stage-"));
  let backupRoot = null;
  try {
    for (const entry of desired.entries) {
      const destination = path.join(stageRoot, "files", ...entry.path.split("/"));
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, entry.content);
      chmodSync(destination, Number.parseInt(entry.mode, 8));
    }
    writeFileSync(path.join(stageRoot, "manifest.json"), `${stableJson(desired.manifest)}\n`, "utf8");
    if (existsSync(targetRoot)) {
      backupRoot = path.join(
        before.documentationRoot,
        `.denchco-standard-snapshot-backup-${process.pid}-${Date.now()}`,
      );
      if (existsSync(backupRoot)) throw new SyncSafetyError(`Temporary backup path already exists: ${path.basename(backupRoot)}`);
      renameSync(targetRoot, backupRoot);
      try {
        renameSync(stageRoot, targetRoot);
      } catch (error) {
        renameSync(backupRoot, targetRoot);
        backupRoot = null;
        throw error;
      }
      rmSync(backupRoot, { recursive: true, force: false });
      backupRoot = null;
    } else {
      renameSync(stageRoot, targetRoot);
    }
  } finally {
    if (existsSync(stageRoot)) rmSync(stageRoot, { recursive: true, force: true });
  }
  const after = inspectDocumentationSnapshot({ desired, documentationRoot: before.documentationRoot });
  if (after.status !== "current") throw new SyncSafetyError("Applied snapshot did not pass its own read-only check.");
  return { ...after, applied: true, previousChanges: before.changes };
}

export function synchronize({
  mode,
  standardRoot = STANDARD_ROOT,
  documentationRoot,
  contractRelativePath = CONTRACT_PATH,
} = {}) {
  if (!["check", "apply"].includes(mode)) throw new SyncUsageError("Synchronization mode must be check or apply.");
  const desired = buildDesiredSnapshot({ standardRoot, contractRelativePath });
  const selectedDocumentationRoot = documentationRoot
    ? path.resolve(documentationRoot)
    : path.resolve(desired.standardRoot, desired.contract.defaultDocumentationRepository);
  const report = mode === "check"
    ? inspectDocumentationSnapshot({ desired, documentationRoot: selectedDocumentationRoot })
    : applyDocumentationSnapshot({ desired, documentationRoot: selectedDocumentationRoot });
  return {
    mode,
    status: report.status,
    documentationRepository: report.documentationRoot,
    standard: desired.manifest.standard,
    contract: {
      path: contractRelativePath,
      allowlistCount: desired.entries.length,
      snapshotRoot: desired.contract.snapshotRoot,
    },
    installed: report.installed,
    changes: mode === "apply" && report.previousChanges ? report.previousChanges : report.changes,
    conflicts: report.conflicts,
    ...(mode === "apply" ? { applied: report.applied } : {}),
  };
}

function printReport(report, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const revision = report.standard.revision;
  process.stdout.write(
    `Documentation snapshot ${report.status.toUpperCase()} · standard ${report.standard.version} · ${revision}\n` +
    `Allowlist: ${report.contract.allowlistCount} files · target: ${report.documentationRepository}\n` +
    `Changes: +${report.changes.added.length} ~${report.changes.updated.length} -${report.changes.deleted.length}` +
    `${report.changes.manifest ? " · manifest" : ""}` +
    `${report.conflicts.length ? ` · ${report.conflicts.length} conflict(s)` : ""}\n`,
  );
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  const report = synchronize({
    mode: options.mode,
    documentationRoot: options.documentationRepository,
  });
  printReport(report, options.json);
  return options.mode === "check" && report.status !== "current" ? 1 : 0;
}

function strictJson(source, label) {
  const document = parseDocument(source, { prettyErrors: true, strict: true, uniqueKeys: true });
  if (document.errors.length) {
    throw new SyncSafetyError(`${label} is invalid or has duplicate keys: ${document.errors.map((error) => error.message).join("; ")}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new SyncSafetyError(`${label} is not strict JSON: ${error.message}`);
  }
}

function yamlMapping(source, label) {
  const document = parseDocument(source, { prettyErrors: true, strict: true, uniqueKeys: true });
  if (document.errors.length) throw new SyncSafetyError(`${label} is invalid YAML: ${document.errors.map((error) => error.message).join("; ")}`);
  const value = document.toJS({ maxAliasCount: 100 });
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SyncSafetyError(`${label} must be a YAML mapping.`);
  return value;
}

function validateManifest(standardRoot, manifest) {
  const schemaPath = path.join(standardRoot, "schema", "documentation-sync-snapshot-v1.json");
  const schema = strictJson(readFileSync(schemaPath, "utf8"), "documentation snapshot schema");
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (!validate(manifest)) {
    const details = (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
    throw new SyncSafetyError(`Documentation snapshot manifest is not schema-valid: ${details}`);
  }
}

function sourceEntry(standardRoot, relativePath) {
  const sourcePath = resolveWithin(standardRoot, relativePath, "allowlisted source file");
  if (!existsSync(sourcePath)) throw new SyncSafetyError(`Allowlisted source file is missing: ${relativePath}`);
  const metadata = lstatSync(sourcePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new SyncSafetyError(`Allowlisted source must be a regular non-symlink file: ${relativePath}`);
  }
  const content = readFileSync(sourcePath);
  return {
    path: relativePath,
    sha256: sha256(content),
    bytes: content.length,
    mode: fileMode(metadata),
    sourcePath,
    content,
  };
}

function assertGitRepositoryRoot(candidate, label) {
  let canonical;
  try {
    const requested = path.isAbsolute(candidate) ? candidate : path.resolve(candidate);
    canonical = realpathSync(requested);
  } catch (error) {
    throw new SyncSafetyError(`${label} does not exist: ${candidate} (${error.message})`);
  }
  let discovered;
  try {
    discovered = realpathSync(git(canonical, ["rev-parse", "--show-toplevel"]));
  } catch (error) {
    throw new SyncSafetyError(`${label} is not an accessible Git repository: ${error.message}`);
  }
  if (canonical !== discovered) throw new SyncSafetyError(`${label} must be selected at its Git repository root.`);
  return canonical;
}

function git(cwd, args) {
  try {
    const output = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output.endsWith("\r\n")
      ? output.slice(0, -2)
      : output.endsWith("\n")
        ? output.slice(0, -1)
        : output;
  } catch (error) {
    const detail = String(error.stderr ?? error.message).trim();
    throw new SyncSafetyError(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
}

function assertSafeRepositoryPath(value, label) {
  if (typeof value !== "string" || value === "" || path.isAbsolute(value)
    || value.includes("\\") || value.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new SyncSafetyError(`${label} must be a normalized repository-relative POSIX path: ${String(value)}`);
  }
}

function resolveWithin(root, relativePath, label) {
  assertSafeRepositoryPath(relativePath, label);
  const resolved = path.resolve(root, ...relativePath.split("/"));
  const relation = path.relative(root, resolved);
  if (relation.startsWith("..") || path.isAbsolute(relation)) throw new SyncSafetyError(`${label} escapes its repository root.`);
  return resolved;
}

function requireExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SyncSafetyError(`${label} must be a JSON object.`);
  const actual = Object.keys(value).sort(CODEPOINT_SORT);
  const wanted = [...expected].sort(CODEPOINT_SORT);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new SyncSafetyError(`${label} keys must be exactly: ${wanted.join(", ")}.`);
  }
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  const found = [];
  visit(root, "");
  return found.sort(CODEPOINT_SORT);

  function visit(directory, relativeDirectory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute, relative);
      else found.push(relative);
    }
  }
}

function fileMode(metadata) {
  return `0${(metadata.mode & 0o777).toString(8).padStart(3, "0")}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  return JSON.stringify(value, null, 2);
}

const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  try {
    process.exitCode = run();
  } catch (error) {
    const prefix = error instanceof SyncUsageError ? "Usage error" : "Documentation synchronization failed";
    process.stderr.write(`${prefix}: ${error.message}\n${error instanceof SyncUsageError ? `\n${HELP}\n` : ""}`);
    process.exitCode = error instanceof SyncUsageError ? 2 : 2;
  }
}
