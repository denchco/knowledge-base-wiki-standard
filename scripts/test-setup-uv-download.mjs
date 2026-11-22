import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "yaml";

const workflow = parse(readFileSync(new URL("../.github/workflows/verify.yml", import.meta.url), "utf8"));
const steps = workflow.jobs.verify.steps.filter((step) => step.uses?.startsWith("astral-sh/setup-uv@"));
assert.equal(steps.length, 1, "Verify must select one setup-uv action");
const { uses, with: inputs } = steps[0];
assert.match(uses, /^astral-sh\/setup-uv@[0-9a-f]{40}$/u);
assert.match(inputs.version, /^\d+\.\d+\.\d+$/u);
assert.equal(String(inputs["require-checksums"]), "true");
assert.equal(inputs.checksum, undefined, "Exercise the bundled checksum used by Verify");

const actionRevision = uses.split("@")[1];
const scratch = mkdtempSync(join(tmpdir(), "setup-uv-qualification-"));
const bundle = join(scratch, "index.cjs");
const wrongChecksum = "0".repeat(64);

function runCold(label, checksum) {
  const runnerTemp = join(scratch, label, "downloads");
  const toolCache = join(scratch, label, "tools");
  mkdirSync(runnerTemp, { recursive: true });
  mkdirSync(toolCache, { recursive: true });
  const result = spawnSync(process.execPath, [bundle], {
    cwd: scratch,
    encoding: "utf8",
    timeout: 240_000,
    env: {
      PATH: process.env.PATH,
      RUNNER_TEMP: runnerTemp,
      RUNNER_TOOL_CACHE: toolCache,
      UV_NO_MODIFY_PATH: "1",
      UV_PYTHON_INSTALL_DIR: join(scratch, label, "python"),
      INPUT_VERSION: inputs.version,
      "INPUT_WORKING-DIRECTORY": scratch,
      "INPUT_PYTHON-VERSION": inputs["python-version"],
      "INPUT_REQUIRE-CHECKSUMS": "true",
      "INPUT_ENABLE-CACHE": "false",
      "INPUT_ACTIVATE-ENVIRONMENT": "false",
      "INPUT_NO-PROJECT": "false",
      "INPUT_DOWNLOAD-FROM-ASTRAL-MIRROR": "true",
      INPUT_CHECKSUM: checksum,
    },
  });
  if (result.error) throw result.error;
  const log = result.stdout + result.stderr;
  assert.match(log, /Downloading uv from "https:\/\//u, "Expected a fresh upstream download");
  return { status: result.status, log, runnerTemp, toolCache };
}

function archiveDigest(path, runnerTemp) {
  assert.equal(dirname(path), runnerTemp, "Expected a download in the isolated runner directory");
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

try {
  const url = `https://raw.githubusercontent.com/astral-sh/setup-uv/${actionRevision}/dist/setup/index.cjs`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  assert.ok(response.ok, `Fetching pinned action returned HTTP ${response.status}`);
  writeFileSync(bundle, Buffer.from(await response.arrayBuffer()));

  const good = runCold("bundled", "");
  assert.equal(good.status, 0, good.log);
  const verified = /^::debug::Checksum for (.+) is valid\.$/mu.exec(good.log);
  assert.ok(verified, "The action must report a verified archive before installation");
  const digest = archiveDigest(verified[1], good.runnerTemp);
  const [cacheName] = readdirSync(good.toolCache);
  assert.equal(cacheName, `uv-${digest}`, "Strict mode must key the installed tool by its archive checksum");
  const versionDir = join(good.toolCache, cacheName, inputs.version);
  const architectures = readdirSync(versionDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.equal(architectures.length, 1);
  const executable = join(versionDir, architectures[0].name, "uv");
  const binaryVersion = execFileSync(executable, ["--version"], { encoding: "utf8" }).trim();
  assert.equal(binaryVersion.split(/\s+/u)[1], inputs.version);

  const bad = runCold("incorrect", wrongChecksum);
  assert.equal(bad.status, 1, "The action must fail on the incorrect SHA-256");
  const mismatch = /^::error::Checksum for (.+) did not match ([0-9a-f]{64})\.$/mu.exec(bad.log);
  assert.ok(mismatch, `Expected a checksum mismatch from the action.\n${bad.log}`);
  assert.equal(mismatch[2], wrongChecksum);
  assert.equal(archiveDigest(mismatch[1], bad.runnerTemp), digest, "Both probes must use identical archive bytes");
  assert.deepEqual(readdirSync(bad.toolCache), [], "Rejected download must never enter the tool cache");
  console.log(`Passed cold install and incorrect checksum rejection on ${process.platform}/${process.arch}`);
  console.log(`${uses}, ${binaryVersion}, archive SHA-256 ${digest}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
