import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { parse, stringify } from "yaml";
import { adaptBundle, patchDesignLinter, qualifiedBundles } from "./patch-design-linter.mjs";

const packageRoot = path.resolve("node_modules/@google/design.md");
fs.mkdirSync("output", { recursive: true });
const fixtureRoot = fs.mkdtempSync(path.resolve("output/design-linter-test-"));
after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
const valid = fs.readFileSync("DESIGN.md", "utf8");
const invalid = '---\ncolors:\n  primary: not-a-colour\ncomponents:\n  button:\n    textColor: "{colors.absent}"\n---\n';

test("both installed entry points use the qualified external Zod; drift fails closed", () => {
  assert.equal(patchDesignLinter(packageRoot, { check: true }), 2);
  for (const entry of Object.keys(qualifiedBundles)) {
    const source = fs.readFileSync(path.join(packageRoot, "dist", entry), "utf8");
    assert.equal(adaptBundle(source, entry), source);
    assert.match(source, /import \* as exports_external from "zod"/u);
    assert.doesNotMatch(source, /zod@3\.25\.76|class ZodArray|var ZodArray/u);
    assert.throws(() => adaptBundle(source + "\n// drift", entry), /checksum differs/u);
  }
  assert.throws(() => adaptBundle("", "unknown.js"), /Unqualified/u);
});

test("programmatic lint keeps valid designs and rejects invalid colours and references", async () => {
  // Resolve first: Graphify 0.9.70 treats a bare dynamic import as a corpus file.
  const { lint } = await import(import.meta.resolve("@google/design.md/linter"));
  assert.equal(lint(valid).summary.errors, 0);
  const broken = lint(invalid);
  assert.ok(broken.summary.errors >= 2, JSON.stringify(broken.findings));
  assert.ok(broken.findings.some((finding) => /reference/iu.test(finding.message)));
});

test("CLI preserves successful and failing exit codes", () => {
  for (const [name, content, expected] of [["valid", valid, 0], ["invalid", invalid, 1]]) {
    const filename = path.join(fixtureRoot, `${name}.md`);
    fs.writeFileSync(filename, content);
    const result = spawnSync(process.execPath, [path.join(packageRoot, "dist/index.js"), "lint", filename], { encoding: "utf8" });
    assert.equal(result.status, expected, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.summary.errors === 0, expected === 0);
  }
});

test("Zod 4 migration preserves configuration limits and rejects malformed configuration", async () => {
  // Expose the installed loader only inside a disposable copy of the actual bundle.
  const source = fs.readFileSync(path.join(packageRoot, "dist/linter/index.js"), "utf8");
  const filename = path.join(fixtureRoot, "loader.mjs");
  fs.writeFileSync(filename, source + "\nexport { loadSpecConfig };\n");
  const yaml = fs.readFileSync(path.join(packageRoot, "dist/linter/spec-config.yaml"), "utf8");
  fs.writeFileSync(path.join(fixtureRoot, "spec-config.yaml"), yaml);
  const { loadSpecConfig } = await import(pathToFileURL(filename).href);
  const original = parse(yaml);
  const configFile = path.join(fixtureRoot, "config.yaml");
  const load = (config) => {
    fs.writeFileSync(configFile, stringify(config));
    return loadSpecConfig(configFile);
  };
  assert.equal(load(original).version, original.version);
  const withoutLimits = { ...original };
  delete withoutLimits.limits;
  assert.deepEqual(load(withoutLimits).limits, { max_token_nesting_depth: 20, max_reference_depth: 10 });
  assert.deepEqual(load({ ...original, limits: { max_reference_depth: 3 } }).limits, { max_token_nesting_depth: 20, max_reference_depth: 3 });
  assert.throws(() => load({ ...original, units: [] }));
  assert.throws(() => load({ ...original, limits: { max_reference_depth: "invalid" } }));
  assert.throws(() => load({ ...original, types: { invalid: { description: 42 } } }));
});
