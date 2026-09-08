import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { before } from "node:test";
import { buildRuntimeAssets, compareRuntimeAssets, inspectSanitizer, runtimeVersions, sha256 } from "./runtime-bundle.mjs";

const root = path.resolve(import.meta.dirname, "..");
const vendor = "docs/assets/vendor";
const sanitizerPath = "node_modules/dompurify/dist/purify.es.mjs";
let assets;
before(async () => { assets = await buildRuntimeAssets(root); });
const metadata = () => JSON.parse(assets.get(`${vendor}/runtime-metafile.json`));
const inspect = (overrides = {}) => inspectSanitizer({
  inputs: metadata().metafile.inputs,
  source: fs.readFileSync(path.join(root, sanitizerPath), "utf8"),
  output: assets.get(`${vendor}/mermaid.min.js`),
  ...overrides,
});

function withFixture(callback) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dkbws-runtime-"));
  try {
    for (const [relative, output] of assets) {
      fs.mkdirSync(path.dirname(path.join(fixture, relative)), { recursive: true });
      fs.writeFileSync(path.join(fixture, relative), output);
    }
    callback(fixture);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
}

test("Mermaid is rebuilt from core and includes exactly the locked sanitizer implementation", () => {
  inspect();
  const evidence = metadata();
  assert.equal(evidence.sanitizer.version, "3.4.15");
  assert(evidence.inputs.some((item) => item.path === "node_modules/mermaid/dist/mermaid.core.mjs"));
  const sanitizer = evidence.inputs.filter((item) => item.component === "node_modules/dompurify");
  assert.deepEqual(sanitizer.map((item) => item.path), [sanitizerPath]);
  assert.equal(sanitizer[0].sha256, sha256(fs.readFileSync(path.join(root, sanitizerPath))));
  assert(Object.values(evidence.metafile.outputs).every((item) => item.imports.length === 0));
});

test("two independent builds emit byte-identical assets and portable evidence", async () => {
  assert.deepEqual(await buildRuntimeAssets(root), assets);
  assert(!assets.get(`${vendor}/runtime-metafile.json`).includes(root));
  assert(!assets.get(`${vendor}/runtime-sbom.json`).includes(root));
});

test("a current package label cannot hide an old sanitizer implementation", () => {
  assert.throws(() => inspect({ source: "DOMPurify.version = '3.4.12';" }), /source embeds 3.4.12/);
  const output = assets.get(`${vendor}/mermaid.min.js`).replace(/\.version="3\.4\.15"/u, '.version="3.4.12"');
  assert.notEqual(output, assets.get(`${vendor}/mermaid.min.js`));
  assert.throws(() => inspect({ output }), /one DOMPurify 3.4.15 implementation/);
  assert.throws(() => inspect({ output: `${assets.get(`${vendor}/mermaid.min.js`)}\n/*! DOMPurify 3.4.0 */` }), /unqualified DOMPurify/);
});

test("missing, duplicate, nested, or prebuilt sanitizer inputs fail closed", () => {
  const inputs = metadata().metafile.inputs;
  const missing = { ...inputs };
  delete missing[sanitizerPath];
  assert.throws(() => inspect({ inputs: missing }), /exactly the locked DOMPurify module/);
  assert.throws(() => inspect({ inputs: { ...inputs, "node_modules/mermaid/node_modules/dompurify/dist/purify.es.mjs": {} } }), /exactly the locked DOMPurify module/);
  assert.throws(() => inspect({ inputs: { ...inputs, "node_modules/mermaid/dist/mermaid.min.js": {} } }), /prebuilt bundle cannot substitute/);
});

test("SBOM identities match the audited lock and distinguish opaque copied bundles", () => {
  const sbom = JSON.parse(assets.get(`${vendor}/runtime-sbom.json`));
  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(sbom.specVersion, "1.6");
  for (const component of sbom.components.filter((item) => item.type === "library")) {
    const locked = lock.packages[component["bom-ref"]];
    assert.equal(component.version, locked.version);
    assert.equal(component.properties.find((item) => item.name === "dkbws:lock-integrity").value, locked.integrity);
  }
  assert.equal(sbom.components.find((item) => item.name === "dompurify").version, runtimeVersions.dompurify);
  for (const asset of metadata().assets) {
    assert.equal(asset.sha256, sha256(assets.get(asset.path)));
    if (asset.path.endsWith("mermaid.min.js")) assert.equal(asset.coverage, "resolved-core-module-inputs");
    else assert.equal(asset.coverage, "opaque-upstream-prebundle");
  }
  const references = new Set(sbom.components.map((item) => item["bom-ref"]));
  for (const dependency of sbom.dependencies) {
    assert(references.has(dependency.ref));
    assert(dependency.dependsOn.every((ref) => references.has(ref)));
  }
});

test("read-only inspection catches modified bundle bytes, altered SBOM and missing evidence", () => {
  withFixture((fixture) => {
    assert.deepEqual(compareRuntimeAssets(assets, fixture), []);
    fs.appendFileSync(path.join(fixture, vendor, "mermaid.min.js"), "\nconsole.log('unexpected payload');\n");
    fs.writeFileSync(path.join(fixture, vendor, "runtime-sbom.json"), "{}\n");
    fs.rmSync(path.join(fixture, vendor, "runtime-metafile.json"));
    const failures = compareRuntimeAssets(assets, fixture);
    assert.equal(failures.length, 3);
    assert(failures.some((failure) => failure.includes("mermaid.min.js")));
    assert(failures.some((failure) => failure.includes("runtime-sbom.json")));
    assert(failures.some((failure) => failure.startsWith("Missing")));
    assert(fs.readFileSync(path.join(fixture, vendor, "mermaid.min.js"), "utf8").includes("unexpected payload"));
  });
});

test("a drifted installed-lock contract is rejected before the build", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dkbws-runtime-lock-"));
  try {
    fs.copyFileSync(path.join(root, "package.json"), path.join(fixture, "package.json"));
    const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
    lock.packages["node_modules/dompurify"].version = "3.4.12";
    fs.writeFileSync(path.join(fixture, "package-lock.json"), JSON.stringify(lock));
    await assert.rejects(buildRuntimeAssets(fixture), /dompurify must be directly pinned and locked at 3.4.15/);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
