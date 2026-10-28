import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { parse, stringify } from "yaml";
import { DESIGN_VALIDATOR_ROOT, checkDesignValidatorSources, checkDesignValidatorZodInput, buildDesignValidator, run } from "./design-validator.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
const build = await buildDesignValidator();
const { api } = build;
const normalize = value => JSON.parse(JSON.stringify(value, (_key, item) => item instanceof Map ? Object.fromEntries(item) : item));
const document = (tokens, headings = ["Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components", "Do's and Don'ts"]) =>
  `---\n${stringify(tokens)}---\n\n${headings.map(heading => `## ${heading}\nDescription.\n`).join("\n")}`;

test("reviewed source inventory and deterministic build bind the actual patched Zod implementation", async () => {
  const { provenance } = checkDesignValidatorSources();
  assert.equal(provenance.files.length, 39);
  assert.equal(provenance.files.filter(file => file.changes.length).length, 2);
  assert.equal(build.receipt.zodVersion, "4.6.6");
  const zod = build.receipt.packages.filter(pkg => pkg.name === "zod");
  assert.equal(zod.length, 1); assert.equal(zod[0].version, "4.6.6"); assert.match(zod[0].integrity, /^sha512-/);
  assert(build.receipt.inputs.some(input => input.path.includes("node_modules/zod/v4/")));
  assert(!build.receipt.inputs.some(input => input.path.includes("node_modules/zod/v3/")));
  assert.equal(build.receipt.zodSourceProof.verifiedInputCount, 95);
  assert.equal(sha(fs.readFileSync(path.join(build.directory, "index.mjs"))), build.receipt.bundleSha256);
  const second = await buildDesignValidator();
  assert.equal(second.fingerprint, build.fingerprint);
  assert.deepEqual(second.receipt, build.receipt);
});

test("historical upstream package metadata stays byte-identical and cannot become an active manifest", () => {
  const { provenance } = checkDesignValidatorSources();
  const entry = provenance.files.find(file => file.upstreamPath === "packages/cli/package.json");
  assert.equal(entry.path, "upstream/packages/cli/package.json.upstream");
  const bytes = fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, entry.path));
  assert.equal(sha(bytes), "9cd26dae8342295b88dad6df3432f732f38c215f401f49af61068211cf2015b9");
  assert.equal(entry.sha256, entry.upstreamSha256);
  assert.equal(createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex"), entry.gitBlob);
  assert.equal(entry.gitBlob, "1d964075cc16b1b21038edf4759f2f46fce86ad3");
  assert.deepEqual(entry.changes, []);
  assert.equal(JSON.parse(bytes).dependencies.zod, "^3.24.0", "Historical dependency declaration must not be rewritten");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "design-manifest-test-"));
  try {
    fs.cpSync(DESIGN_VALIDATOR_ROOT, directory, { recursive: true, filter: source => !source.split(path.sep).includes("node_modules") });
    const active = "upstream/packages/cli/package.json";
    fs.renameSync(path.join(directory, entry.path), path.join(directory, active));
    entry.path = active;
    fs.writeFileSync(path.join(directory, "upstream-provenance.json"), JSON.stringify(provenance));
    // Even matching file hashes and a complete provenance inventory cannot make
    // historical dependency metadata an active installable nested package.
    assert.throws(() => checkDesignValidatorSources(directory), /must not be an active package\.json/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("stale Zod implementation bytes fail even when package metadata still claims 4.6.6", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "design-zod-test-"));
  try {
    fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({ name: "zod", version: "4.6.6" }));
    const input = build.receipt.inputs.find(item => item.path.endsWith("/zod/v4/core/versions.js"));
    assert(input);
    const source = fs.readFileSync(path.resolve(input.path));
    const file = path.join(directory, "v4/core/versions.js"); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
    assert.deepEqual(checkDesignValidatorZodInput(directory, file), source);
    fs.writeFileSync(file, source.toString().replace("patch: 6", "patch: 5"));
    assert.throws(() => checkDesignValidatorZodInput(directory, file), /source bytes differ/);
    fs.writeFileSync(file, source.toString() + "\n// Different implementation under the same version label\n");
    assert.throws(() => checkDesignValidatorZodInput(directory, file), /source bytes differ/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("patched Zod rejects oversized constrained collections before parsing their children", async () => {
  const installed = build.receipt.packages.find(pkg => pkg.name === "zod");
  const { z } = await import(pathToFileURL(path.resolve(installed.lockPath, "index.js")).href);
  for (const kind of ["array", "map", "set"]) {
    let children = 0;
    const child = z.any().superRefine((_value, context) => {
      children++;
      context.addIssue({ code: "custom", message: "Benign invalid-child fixture" });
    });
    const schema = kind === "array" ? z.array(child).max(1) : kind === "map" ? z.map(z.string(), child).max(1) : z.set(child).max(1);
    const oversized = kind === "array" ? [1, 2] : kind === "map" ? new Map([["a", 1], ["b", 2]]) : new Set([1, 2]);
    const result = schema.safeParse(oversized);
    assert.equal(result.success, false, kind);
    assert.equal(children, 0, `${kind} must reject before child traversal`);
    assert.deepEqual(result.error.issues.map(issue => issue.code), ["too_big"]);
    const withinLimit = kind === "array" ? [1] : kind === "map" ? new Map([["a", 1]]) : new Set([1]);
    const control = schema.safeParse(withinLimit);
    assert.equal(control.success, false);
    assert.equal(children, 1, `${kind} must still validate children within its limit`);
    assert.equal(control.error.issues[0].code, "custom");
  }
});

test("identity command rebuilds in memory and emits portable lock, source and implementation evidence", async () => {
  const before = fs.readdirSync(path.dirname(build.directory)).sort();
  let output = "";
  assert.equal(await run(["identity", "--json"], { stdout: text => { output += text; } }), 0);
  const identity = JSON.parse(output);
  assert.equal(identity.readOnly, true); assert.equal(identity.writesPerformed, false);
  assert.equal(identity.fingerprint, build.fingerprint);
  assert.equal(identity.packageLockSha256.length, 64);
  assert.equal(identity.source.revision, "9bf8eae67128b6cc55ad9bf86665767deb4c11cd");
  assert(!output.includes(DESIGN_VALIDATOR_ROOT));
  assert(identity.inputs.every(input => !path.isAbsolute(input.path) && !input.path.startsWith("../")));
  assert.deepEqual(fs.readdirSync(path.dirname(build.directory)).sort(), before);
});

test("all eleven upstream rules remain active with their original severities", () => {
  assert.deepEqual(api.DEFAULT_RULE_DESCRIPTORS.map(rule => [rule.name, rule.severity]), [
    ["broken-ref", "error"], ["missing-primary", "warning"], ["contrast-ratio", "warning"],
    ["orphaned-tokens", "warning"], ["token-summary", "info"], ["missing-sections", "info"],
    ["missing-typography", "warning"], ["section-order", "warning"], ["unknown-key", "warning"],
    ["token-like-ignored", "warning"], ["omitted-rules", "info"],
  ]);
});

test("all nine licensed upstream fixtures retain published 0.4.0 findings, model and Tailwind results", () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, "fixtures/upstream-0.4.0-results.json"), "utf8"));
  assert.equal(baseline.version, "0.4.0"); assert.equal(baseline.results.length, 9);
  for (const expected of baseline.results) {
    const input = fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, "upstream/packages/cli/src/linter/fixtures", expected.name), "utf8");
    assert.equal(sha(input), expected.inputSha256);
    const actual = api.lint(input);
    assert.deepEqual(normalize({ findings: actual.findings, summary: actual.summary, tailwindConfig: actual.tailwindConfig,
      designSystem: actual.designSystem, sections: actual.sections }), {
      findings: expected.findings, summary: expected.summary, tailwindConfig: expected.tailwindConfig,
      designSystem: expected.designSystem, sections: expected.sections,
    }, expected.name);
  }
});

test("broken references and invalid design tokens still fail validation", () => {
  const broken = api.lint(document({ colors: { primary: "#000000" }, components: { button: { backgroundColor: "{colors.absent}" } } }));
  assert(broken.summary.errors > 0);
  assert(broken.findings.some(finding => finding.rule === "broken-ref" && finding.severity === "error"));
  const invalid = api.lint(document({ colors: { primary: "not-a-color" }, spacing: { gap: "4wrong" } }));
  assert(invalid.summary.errors > 0);
  const malformed = api.lint("---\ncolors: [\n---\n");
  // Upstream treats recoverable YAML parse failures as warnings; retain that policy.
  assert.equal(malformed.summary.warnings, 1);
  assert.match(malformed.findings[0].message, /Flow sequence/);
});

test("contrast, section order, ignored tokens and unknown-key diagnostics are retained", () => {
  const report = api.lint(document({
    colors: { yellow: "#ffff00", white: "#ffffff" },
    components: { button: { backgroundColor: "{colors.yellow}", textColor: "{colors.white}" } },
    colrs: { primary: "#ffffff" },
  }, ["Components", "Overview", "Colors"]));
  for (const rule of ["contrast-ratio", "section-order", "unknown-key", "token-like-ignored", "missing-primary", "missing-typography", "token-summary", "missing-sections"]) {
    assert(report.findings.some(finding => finding.rule === rule), `Expected ${rule}`);
  }
  const omitted = api.lint(document({ colors: { primary: "#000000" }, omitted: ["colors", "spacing", "typo"] }));
  for (const rule of ["redundant-omission", "declared-omission", "unknown-omission"]) assert(omitted.findings.some(finding => finding.rule === rule), rule);
});

test("Zod 4 compatibility keeps nested spec defaults and rejects an invalid spec", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "design-spec-test-"));
  try {
    const config = parse(fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, "upstream/packages/cli/src/linter/spec-config.yaml"), "utf8"));
    delete config.limits;
    const target = path.join(directory, "spec.yaml");
    fs.writeFileSync(target, stringify(config));
    assert.deepEqual(api.loadSpecConfig(target).limits, { max_token_nesting_depth: 20, max_reference_depth: 10 });
    config.units = [];
    fs.writeFileSync(target, stringify(config));
    assert.throws(() => api.loadSpecConfig(target));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("unreviewed source bytes, extra source files and changed dependency pins fail closed", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "design-source-test-"));
  try {
    fs.cpSync(DESIGN_VALIDATOR_ROOT, directory, { recursive: true, filter: source => !source.split(path.sep).includes("node_modules") });
    checkDesignValidatorSources(directory);
    const file = path.join(directory, "upstream/packages/cli/src/linter/lint.ts"), original = fs.readFileSync(file);
    fs.appendFileSync(file, "\n// Changed without reviewed provenance\n");
    assert.throws(() => checkDesignValidatorSources(directory), /reviewed hash/);
    fs.writeFileSync(file, original);
    const extra = path.join(directory, "upstream/extra.ts"); fs.writeFileSync(extra, "export {}\n");
    assert.throws(() => checkDesignValidatorSources(directory), /inventory is incomplete/);
    fs.rmSync(extra);
    const manifest = path.join(directory, "package.json"), pkg = JSON.parse(fs.readFileSync(manifest));
    pkg.dependencies.zod = "3.25.76"; fs.writeFileSync(manifest, JSON.stringify(pkg));
    assert.throws(() => checkDesignValidatorSources(directory), /dependency pins/);
    pkg.dependencies.zod = "4.6.6";
    for (const field of ["name", "version", "license"]) {
      const changed = { ...pkg, [field]: "unreviewed" }; fs.writeFileSync(manifest, JSON.stringify(changed));
      assert.throws(() => checkDesignValidatorSources(directory), /package identity/);
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("read-only lint CLI preserves diagnostics and nonzero failures without modifying target inputs", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "design-cli-test-"));
  let output = "", errors = "";
  const options = { load: async () => build, stdout: text => { output += text; }, stderr: text => { errors += text; } };
  try {
    const file = path.join(directory, "DESIGN.md"), content = document({ colors: { primary: "#000" }, components: { button: { backgroundColor: "{colors.missing}" } } });
    fs.writeFileSync(file, content);
    assert.equal(await run(["lint", file], options), 1);
    assert(JSON.parse(output).summary.errors > 0);
    assert.equal(fs.readFileSync(file, "utf8"), content);
    assert.deepEqual(fs.readdirSync(directory), ["DESIGN.md"]);
    assert.equal(await run(["lint", path.join(directory, "missing.md")], options), 2);
    assert.match(errors, /not found/);
    assert.equal(await run(["lint", file, "--fix"], options), 2);
    output = "";
    assert.equal(await run(["lint", "-"], { ...options, stdin: Readable.from(["# No YAML\n"]) }), 0);
    assert.equal(JSON.parse(output).summary.warnings, 1);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
