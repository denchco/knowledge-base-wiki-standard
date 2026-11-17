import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  maintainedSchemas, schemaSourceUrl, schemaDiscoveryFailures, lookupPublishedSchema,
} from "./graph-schema-discovery.mjs";

const rootSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.test/schema/manifest-v1.json",
  title: "Consumer manifest",
  type: "object",
  properties: { profile: { type: "string" }, local_extension: { type: "object" } },
  $defs: { example: { properties: { nested_keyword: { type: "string" } } } },
};
const script = name => fileURLToPath(new URL(name, import.meta.url));
function fixture(t, { committed = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dkbws-schema-discovery-test-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  fs.mkdirSync(path.join(root, "schema"));
  fs.mkdirSync(path.join(root, "docs"));
  fs.mkdirSync(path.join(root, "graphify-out"));
  fs.writeFileSync(path.join(root, "schema/manifest-v1.json"), `${JSON.stringify(rootSchema, null, 2)}\n`);
  fs.writeFileSync(path.join(root, ".wiki-standard.yaml"), "capabilities:\n  public_repository: https://github.com/example/wiki\n");
  fs.writeFileSync(path.join(root, "docs/index.md"), "# Test Wiki\n\nRead `schema/manifest-v1.json`.\n");
  fs.writeFileSync(path.join(root, "graphify-out/graph.json"), JSON.stringify({ nodes: [
    { id: "docs_index", label: "Test Wiki", source_file: "docs/index.md", file_type: "document" },
  ], links: [] }));
  fs.writeFileSync(path.join(root, "graphify-out/GRAPH_REPORT.md"), "# Graph report\n");
  // The publisher adapts the qualified upstream 2D template. Keep its relevant
  // source contracts in this small fixture so both schema views are exercised.
  fs.writeFileSync(path.join(root, "graphify-out/graph.html"), `<!doctype html><html><head><style>
#search:focus { border-color: #4E79A7; }
</style><script src="https://unpkg.com/vis-network@10.1.2/standalone/umd/vis-network.min.js"></script></head><body><script>
const RAW_NODES = [];
const RAW_EDGES = [];
const LEGEND = [];

// upstream field and details contracts
const node = { member_count: n.member_count, };
let html = \`<div class="field"><b>\${esc(n.label)}</b></div>\`;
const matches = RAW_NODES.filter(n => n.label.toLowerCase().includes(q));
</script></body></html>`);
  if (committed) {
    git(root, "init", "--quiet");
    git(root, "config", "user.name", "Fixture");
    git(root, "config", "user.email", "fixture@example.test");
    git(root, "add", ".");
    git(root, "commit", "--quiet", "-m", "schema fixture");
  }
  return root;
}
function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function publish(root) {
  const result = spawnSync(process.execPath, [script("./publish-graphify-assets.mjs")], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(fs.readFileSync(path.join(root, "docs/assets/graphify/graph.json"), "utf8"));
}

test("publication restores exact file-level schema discovery without keyword nodes", t => {
  const root = fixture(t, { committed: true });
  const graph = publish(root);
  const schemas = graph.nodes.filter(node => node.file_type === "json-schema");
  assert.equal(schemas.length, 1);
  assert.equal(schemas[0].label, "manifest-v1.json");
  assert.equal(schemas[0].schema_id, rootSchema.$id);
  assert.equal(schemas[0].source_file, "schema/manifest-v1.json");
  assert.equal(graph.nodes.some(node => ["properties", "$defs", "nested_keyword"].includes(node.label)), false);
  assert.ok(graph.links.some(edge => edge.relation === "filesystem contains" && edge.target === schemas[0].id));
  assert.ok(graph.links.some(edge => edge.relation === "references file" && edge.target === schemas[0].id));
  assert.deepEqual(schemaDiscoveryFailures(root, graph), []);
  for (const query of ["manifest-v1.json", "schema/manifest-v1.json", rootSchema.$id]) {
    assert.equal(lookupPublishedSchema(root, query, graph).id, schemas[0].id);
  }
  assert.throws(() => lookupPublishedSchema(root, "manifest", graph), /found 0/);
  for (const name of ["graph.html", "graph-3d.html"]) {
    const html = fs.readFileSync(path.join(root, "docs/assets/graphify", name), "utf8");
    assert.ok(html.includes("schema_id"));
    assert.ok(html.includes("data-schema-source"));
    assert.ok(html.includes("Open canonical schema source"));
    for (const inline of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/\b(?:src|type)=/.test(inline[1])) assert.doesNotThrow(() => new Function(inline[2]));
    }
  }
  const graph2d = fs.readFileSync(path.join(root, "docs/assets/graphify/graph.html"), "utf8");
  assert.ok(graph2d.includes(schemas[0].schema_id));
  assert.ok(graph2d.includes("source_url: n.source_url"));
  assert.ok(graph2d.includes("[n.label, n.source_file, n.schema_id]"));
  const snapshot = fs.readFileSync(path.join(root, "schema/manifest-v1.json"));
  const cli = spawnSync(process.execPath, [script("./graph-schema-discovery.mjs"), "manifest-v1.json", "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).source_file, "schema/manifest-v1.json");
  assert.deepEqual(fs.readFileSync(path.join(root, "schema/manifest-v1.json")), snapshot);
});

test("missing, duplicate, modified, stale and forged schema identities fail closed", t => {
  const root = fixture(t);
  const graph = publish(root);
  const node = graph.nodes.find(candidate => candidate.file_type === "json-schema");
  const cases = [
    [graph.nodes.filter(candidate => candidate !== node), /exactly one/],
    [[...graph.nodes, node], /exactly one/],
    [graph.nodes.map(candidate => candidate === node ? { ...node, schema_id: "wrong" } : candidate), /incorrect schema_id/],
    [graph.nodes.map(candidate => candidate === node ? { ...node, source_file: "schema/deleted.json" } : candidate), /Stale schema/],
    [graph.nodes.map(candidate => candidate === node ? { ...node, source_url: "https://github.com/wrong/repo/blob/main/schema/manifest-v1.json" } : candidate), /incorrect canonical source link/],
  ];
  for (const [nodes, expected] of cases) {
    assert.match(schemaDiscoveryFailures(root, { ...graph, nodes }).join("\n"), expected);
  }
  fs.appendFileSync(path.join(root, "schema/manifest-v1.json"), "\n");
  assert.throws(() => lookupPublishedSchema(root, "manifest-v1.json", graph), /incorrect source_sha256/);
});

test("canonical links require declared public identity and exact committed schema bytes", t => {
  const root = fixture(t, { committed: true });
  const revision = git(root, "rev-parse", "HEAD");
  const record = maintainedSchemas(root)[0];
  assert.equal(schemaSourceUrl(root, record, revision), `https://github.com/example/wiki/blob/${revision}/schema/manifest-v1.json#L1`);
  assert.equal(schemaSourceUrl(root, record, "main"), undefined);
  assert.equal(schemaSourceUrl(root, { ...record, source_sha256: "0".repeat(64) }, revision), undefined);
  fs.writeFileSync(path.join(root, ".wiki-standard.yaml"), "capabilities:\n  public_repository: https://example.test/invented/wiki\n");
  assert.equal(schemaSourceUrl(root, record, revision), undefined);
});

test("all root schemas are indexed while nested fixtures and symlinks are excluded", t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "schema/nested"));
  fs.writeFileSync(path.join(root, "schema/nested/fixture.json"), JSON.stringify(rootSchema));
  fs.writeFileSync(path.join(root, "schema/other.json"), JSON.stringify({ ...rootSchema, $id: "urn:example:other" }));
  assert.deepEqual(maintainedSchemas(root).map(record => record.source_file), ["schema/manifest-v1.json", "schema/other.json"]);
  fs.symlinkSync("manifest-v1.json", path.join(root, "schema/alias.json"));
  assert.throws(() => maintainedSchemas(root), /regular file/);
});

test("the publication checker rejects missing schema discoverability", t => {
  const root = fixture(t);
  for (const name of ["graph-publication-v1.json", "graph-publication-summary-v1.json"]) {
    fs.copyFileSync(new URL(`../schema/${name}`, import.meta.url), path.join(root, "schema", name));
  }
  const graph = publish(root);
  graph.nodes = graph.nodes.filter(node => node.source_file !== "schema/manifest-v1.json");
  fs.writeFileSync(path.join(root, "docs/assets/graphify/graph.json"), JSON.stringify(graph));
  const result = spawnSync(process.execPath, [script("./check-graphify-assets.mjs")], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /schema\/manifest-v1\.json requires exactly one schema discovery node/);
});
