import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "jj-phase.mjs");

test("requires a development-turn summary", () => {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Development-turn summary/);
});

test("verifies, inspects both VCS surfaces, and commits a changed turn", () => {
  withFakeCommands({}, ({ run, commands }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(commands(), [
      ["npm", "run", "verify"],
      ["git", "status", "--short"],
      ["jj", "status"],
      ["jj", "commit", "-m", "Turn summary"],
    ]);
  });
});

test("does not create an empty commit for a clean turn", () => {
  withFakeCommands({ jjStatus: "The working copy has no changes.\n" }, ({ run, commands }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No development-turn JJ commit recorded/);
    assert.deepEqual(commands(), [
      ["npm", "run", "verify"],
      ["git", "status", "--short"],
      ["jj", "status"],
    ]);
  });
});

test("commits changed files with an explicit failed-verification description", () => {
  withFakeCommands({ verifyStatus: 7 }, ({ run, commands }) => {
    const result = run();
    assert.equal(result.status, 7);
    assert.match(result.stderr, /committed with failed verification status 7/);
    assert.deepEqual(commands(), [
      ["npm", "run", "verify"],
      ["git", "status", "--short"],
      ["jj", "status"],
      ["jj", "commit", "-m", "Verification failed (exit 7): Turn summary"],
    ]);
  });
});

function withFakeCommands(options, callback) {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "denchco-jj-phase-"));
  const bin = path.join(fixtureRoot, "bin");
  const log = path.join(fixtureRoot, "commands.jsonl");
  mkdirSync(bin);
  try {
    writeCommand(bin, "npm", `process.exit(Number(process.env.FAKE_VERIFY_STATUS || 0));`);
    writeCommand(bin, "git", "process.exit(0);");
    writeCommand(bin, "jj", [
      "if (process.argv[2] === 'status') process.stdout.write(process.env.FAKE_JJ_STATUS || 'Working copy changes:\\nM fixture.md\\n');",
      "process.exit(0);",
    ].join("\n"));

    const env = {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      FAKE_COMMAND_LOG: log,
      FAKE_VERIFY_STATUS: String(options.verifyStatus ?? 0),
      FAKE_JJ_STATUS: options.jjStatus ?? "Working copy changes:\nM fixture.md\n",
    };
    callback({
      run: () => spawnSync(process.execPath, [SCRIPT, "-m", "Turn summary"], {
        cwd: ROOT,
        env,
        encoding: "utf8",
      }),
      commands: () => readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
    });
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function writeCommand(bin, name, body) {
  const target = path.join(bin, name);
  writeFileSync(target, [
    "#!/usr/bin/env node",
    "const { appendFileSync } = require('node:fs');",
    "appendFileSync(process.env.FAKE_COMMAND_LOG, `${JSON.stringify([process.argv[1].split('/').pop(), ...process.argv.slice(2)])}\\n`);",
    body,
    "",
  ].join("\n"));
  chmodSync(target, 0o755);
}
