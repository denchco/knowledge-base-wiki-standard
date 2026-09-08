#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUIREMENT = "DKBWS-PROV-001";
const MINIMUM_GIT_VERSION = "2.41.0";
const QUALIFIED_JJ_VERSION = "0.45.1";
const MODES = new Set(["maintainer", "distribution"]);

function usage() {
  return `Usage: node scripts/check-provenance.mjs [--mode maintainer|distribution] [--root PATH] [--json]\n\n` +
    `maintainer   Proves ${REQUIREMENT} for a Standard Production maintenance workspace (default).\n` +
    "distribution Verifies the Git-distributed surface only; Jujutsu provenance is reported not-checked.\n";
}

function parseArguments(argv) {
  const options = { mode: "maintainer", root: process.cwd(), json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "--mode" || argument === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!MODES.has(options.mode)) throw new Error(`Unsupported provenance mode: ${options.mode}`);
  return options;
}

function run(command, args, cwd) {
  try {
    const output = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output.endsWith("\r\n")
      ? output.slice(0, -2)
      : output.endsWith("\n")
        ? output.slice(0, -1)
        : output;
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Required executable is unavailable: ${command}`);
    const detail = String(error?.stderr ?? error?.message ?? "command failed").trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `: ${detail}` : "."}`);
  }
}

function parseVersion(output, label) {
  const match = output.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  if (!match) throw new Error(`${label} did not emit a parseable semantic version: ${output}`);
  return match.slice(1, 4).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function canonicalDirectory(value) {
  const candidate = path.isAbsolute(value) ? value : path.resolve(value);
  return realpathSync(candidate);
}

function assertDirectory(value, label) {
  let metadata;
  try {
    metadata = statSync(value);
  } catch {
    throw new Error(`${label} is missing: ${value}`);
  }
  if (!metadata.isDirectory()) throw new Error(`${label} is not a directory: ${value}`);
}

export function checkProvenance({ root = process.cwd(), mode = "maintainer" } = {}) {
  if (!MODES.has(mode)) throw new Error(`Unsupported provenance mode: ${mode}`);

  const requestedRoot = canonicalDirectory(root);
  const gitVersionOutput = run("git", ["--version"], requestedRoot);
  const gitVersion = parseVersion(gitVersionOutput, "Git");
  if (compareVersions(gitVersion, parseVersion(MINIMUM_GIT_VERSION, "minimum Git version")) < 0) {
    throw new Error(`Git ${MINIMUM_GIT_VERSION} or newer is required; found ${gitVersionOutput}.`);
  }

  const gitRoot = canonicalDirectory(run("git", ["rev-parse", "--show-toplevel"], requestedRoot));
  if (gitRoot !== requestedRoot) {
    throw new Error(`Requested repository root ${requestedRoot} does not equal Git root ${gitRoot}.`);
  }
  const gitDirectory = canonicalDirectory(run("git", ["rev-parse", "--absolute-git-dir"], requestedRoot));

  const report = {
    requirement: REQUIREMENT,
    mode,
    status: mode === "maintainer" ? "pass" : "not-checked",
    readOnly: true,
    git: {
      status: "pass",
      version: gitVersionOutput,
      minimumVersion: MINIMUM_GIT_VERSION,
      repositoryRoot: gitRoot,
      gitDirectory,
    },
    jujutsu: {
      status: "not-checked",
      reason: "Explicit distribution/CI mode checks the Git-distributed surface only and does not prove maintainer-workspace provenance.",
    },
  };

  if (mode === "distribution") return report;

  const jjDirectory = path.join(requestedRoot, ".jj");
  assertDirectory(jjDirectory, "Colocated Jujutsu workspace");

  const jjVersionOutput = run("jj", ["--version"], requestedRoot);
  const jjVersion = parseVersion(jjVersionOutput, "Jujutsu").join(".");
  if (jjVersion !== QUALIFIED_JJ_VERSION) {
    throw new Error(
      `Jujutsu ${QUALIFIED_JJ_VERSION} is the reference-qualified candidate version; found ${jjVersionOutput}. ` +
      "Another Jujutsu version requires deliberate requalification before a maintainer-workspace pass.",
    );
  }

  const jjRoot = canonicalDirectory(run("jj", ["--ignore-working-copy", "root"], requestedRoot));
  if (jjRoot !== gitRoot) throw new Error(`Jujutsu root ${jjRoot} does not equal Git root ${gitRoot}.`);

  const jjGitDirectory = canonicalDirectory(run("jj", ["--ignore-working-copy", "git", "root"], requestedRoot));
  if (jjGitDirectory !== gitDirectory) {
    throw new Error(`Jujutsu Git store ${jjGitDirectory} does not equal repository Git directory ${gitDirectory}.`);
  }

  const currentChangeOutput = run(
    "jj",
    ["--ignore-working-copy", "log", "-r", "@", "--no-graph", "-T", "change_id ++ \"\\n\" ++ commit_id ++ \"\\n\""],
    requestedRoot,
  );
  const [changeId, commitId, ...unexpected] = currentChangeOutput.split(/\r?\n/).filter(Boolean);
  if (!changeId || !/^[a-z]+$/.test(changeId)) throw new Error("Jujutsu current change ID is missing or unreadable.");
  if (!commitId || !/^[0-9a-f]{40,64}$/.test(commitId)) throw new Error("Jujutsu current commit ID is missing or unreadable.");
  if (unexpected.length > 0) throw new Error("Jujutsu current-change query emitted an unexpected result shape.");

  report.jujutsu = {
    status: "pass",
    version: jjVersionOutput,
    referenceQualifiedVersion: QUALIFIED_JJ_VERSION,
    workspaceRoot: jjRoot,
    gitDirectory: jjGitDirectory,
    currentChange: { changeId, commitId },
    workingCopySnapshotDisabled: true,
  };
  return report;
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`${report.requirement}: ${report.status} (${report.mode} mode)`);
  console.log(`Git: ${report.git.version} · ${report.git.repositoryRoot}`);
  if (report.jujutsu.status === "pass") {
    console.log(`Jujutsu: ${report.jujutsu.version} · change ${report.jujutsu.currentChange.changeId}`);
  } else {
    console.log(`Jujutsu: NOT CHECKED · ${report.jujutsu.reason}`);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
    } else {
      printReport(checkProvenance(options), options.json);
    }
  } catch (error) {
    console.error(`${REQUIREMENT}: FAIL · ${error.message}`);
    process.exitCode = 1;
  }
}
