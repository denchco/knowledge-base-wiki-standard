import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";

const root = path.resolve(import.meta.dirname, "..");
const checker = path.join(root, "scripts/check-reference-toolchain.mjs");
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function withToolchain(overrides, callback) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "dkbws-toolchain-"));
  const bin = path.join(fixture, "bin");
  const log = path.join(fixture, "output/verification/probes.jsonl");
  const versions = { npm: "11.19.0", uv: "uv 0.12.10 (fixture)", python: "3.12.14", ...overrides };
  mkdirSync(bin);
  mkdirSync(path.dirname(log), { recursive: true });
  writeFileSync(log, "");
  writeFileSync(path.join(fixture, ".node-version"), `${process.versions.node}\n`);
  writeFileSync(path.join(fixture, ".python-version"), "3.12.14\n");
  writeFileSync(path.join(fixture, ".gitignore"), readFileSync(path.join(root, ".gitignore")));

  const prelude = (name) => `const args = process.argv.slice(2);\nrequire("node:fs").appendFileSync(${JSON.stringify(log)}, JSON.stringify([${JSON.stringify(name)}, ...args]) + "\\n");\n`;
  function shim(name, body) {
    const script = path.join(bin, `${name}.cjs`);
    writeFileSync(script, prelude(name) + body);
    writeFileSync(path.join(bin, name), `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(script)} "$@"\n`, { mode: 0o755 });
  }
  shim("npm", `
if (args.join(" ") === "--version") console.log(${JSON.stringify(versions.npm)});
else if (args.join(" ") === "run check:toolchain") {
  const result = require("node:child_process").spawnSync(process.execPath, [${JSON.stringify(checker)}], { stdio: "inherit" });
  process.exit(result.status ?? 1);
} else process.exit(99);
`);
  shim("uv", `
if (args.join(" ") === "--version") {
  console.log(${JSON.stringify(versions.uv)});
  process.exit(${versions.uvExit ?? 0});
} else if (args[0] === "run") console.log(${JSON.stringify(versions.python)});
else process.exit(99);
`);
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  try {
    callback({
      fixture,
      env,
      run: (script = checker) => spawnSync(process.execPath, [script], { cwd: fixture, env, encoding: "utf8" }),
      probes: () => readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)),
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("exact reference versions pass and check the interpreter only after uv identity", () => {
  withToolchain({}, ({ run, probes }) => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Reference toolchain passed/);
    assert.deepEqual(probes().map((probe) => probe.slice(0, 2)), [["npm", "--version"], ["uv", "--version"], ["uv", "run"]]);
  });
});

test("older and newer uv resolvers fail qualification before invoking uv run", () => {
  for (const version of ["0.12.9", "0.12.15", "1.0.0"]) {
    withToolchain({ uv: `uv ${version}` }, ({ run, probes }) => {
      const result = run();
      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(`uv: expected 0\\.12\\.10, found ${version.replaceAll(".", "\\.")}`));
      assert.deepEqual(probes(), [["npm", "--version"], ["uv", "--version"]]);
    });
  }
});

test("missing or malformed uv version evidence fails closed before running Python", () => {
  for (const output of ["", "uv unknown", "not-uv 0.12.10", "uv 0.12.10rc1"]) {
    withToolchain({ uv: output }, ({ run, probes }) => {
      const result = run();
      assert.equal(result.status, 1);
      assert.match(result.stderr, /uv: cannot parse version output/);
      assert(!probes().some((probe) => probe[1] === "run"));
    });
  }
  withToolchain({ uvExit: 1 }, ({ run, probes }) => {
    assert.equal(run().status, 1);
    assert(!probes().some((probe) => probe[1] === "run"));
  });
});

test("npm and Python still require the exact qualified versions", () => {
  withToolchain({ npm: "11.20.0" }, ({ run, probes }) => {
    const result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /npm: expected 11\.19\.0, found 11\.20\.0/);
    assert.deepEqual(probes(), [["npm", "--version"]]);
  });
  withToolchain({ python: "3.12.15" }, ({ run }) => {
    const result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /python: expected 3\.12\.14, found 3\.12\.15/);
  });
});

test("verification rejects newer uv before build or any project Python execution", () => {
  withToolchain({ uv: "uv 0.12.15" }, ({ fixture, env, run, probes }) => {
    execFileSync("git", ["init", "--quiet", fixture], { env });
    const result = run(path.join(root, "scripts/verify.mjs"));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /uv: expected 0\.12\.10, found 0\.12\.15/);
    assert.match(result.stderr, /gate failure: check:toolchain/);
    assert.deepEqual(probes(), [["npm", "run", "check:toolchain"], ["npm", "--version"], ["uv", "--version"]]);
    assert(!result.stdout.includes("[verify] npm run build"));
  });
});

test("direct build, serve, graph and Python checks reject newer uv before project work", () => {
  const scripts = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).scripts;
  const npmCli = process.env.npm_execpath ?? path.join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "npm/bin/npm-cli.js");
  const tasks = ["dev", "build:site", "graph:update", "audit:python"];
  if (scripts["check:source-links"].includes("uv run")) tasks.push("check:source-links");
  if (scripts["build:local"]) tasks.push("build:local");
  for (const task of tasks) {
    withToolchain({ uv: "uv 0.12.15" }, ({ fixture, env, probes }) => {
      // Execute the actual npm task through npm's shell, with only tool probes replaced.
      writeFileSync(path.join(fixture, "package.json"), JSON.stringify({ scripts }));
      const result = spawnSync(process.execPath, [npmCli, "--cache", path.join(fixture, ".cache/npm"), "run", task], {
        cwd: fixture, env, encoding: "utf8",
      });
      assert.equal(result.status, 1, `${task}: ${result.stderr}`);
      assert.match(result.stderr, /uv: expected 0\.12\.10, found 0\.12\.15/, task);
      assert.deepEqual(probes(), [["npm", "run", "check:toolchain"], ["npm", "--version"], ["uv", "--version"]], task);
    });
  }
});

test("the resolver floor accepts advancing proposal tools without qualifying them", () => {
  const result = spawnSync("uv", ["run", "--no-sync", "python", "-c", `
import pathlib, tomllib
from packaging.specifiers import SpecifierSet
config = tomllib.loads(pathlib.Path("pyproject.toml").read_text())
requirement = config["tool"]["uv"]["required-version"]
assert requirement == ">=0.12.10", requirement
versions = SpecifierSet(requirement)
assert "0.12.9" not in versions
assert "0.12.10" in versions
assert "0.12.15" in versions
assert "1.0.0" in versions
`], { cwd: root, env: { ...process.env, UV_OFFLINE: "1" }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("verification and scheduled audits keep exact uv setup and audit qualification", () => {
  for (const name of ["verify.yml", "security-audit.yml"]) {
    const workflow = parse(readFileSync(path.join(root, ".github/workflows", name), "utf8"));
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
    const setup = steps.filter((step) => step.uses?.startsWith("astral-sh/setup-uv@"));
    assert(setup.length > 0, name);
    assert(setup.every((step) => step.with?.version === "0.12.10"), name);
    if (name === "security-audit.yml") assert(steps.some((step) => step.run === "npm run check:toolchain"));
  }
});
