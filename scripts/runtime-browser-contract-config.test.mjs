import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  normalizeBrowserRoute,
  resolveRuntimeBrowserConfiguration,
} from "./runtime-browser-contract-config.mjs";

function fixture(t, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dkbws-browser-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profileRequiresGraph = options.profileRequiresGraph ?? false;
  const manifestGraph = options.manifestGraph ?? false;
  write(root, ".wiki-standard.yaml", [
    "profile: fixture",
    "roles:",
    "  human_wiki: docs/question.md",
    "capabilities:",
    `  graphify: ${manifestGraph}`,
    "",
  ].join("\n"));
  write(root, "profiles/fixture.yaml", [
    "id: fixture",
    'version: "1"',
    ...(profileRequiresGraph ? ["requires:", "  - DKBWS-GRAPH-001"] : ["requires: []"]),
    "capabilities:",
    `  graphify: ${profileRequiresGraph ? "required" : "false"}`,
    "",
  ].join("\n"));
  for (const source of ["question", "diagrams", "architecture", "matrix", "lists"]) {
    write(root, `docs/${source}.md`, source === "diagrams" || source === "architecture"
      ? `# ${source}\n\n\`\`\`mermaid\nflowchart TD\n  A --> B\n\`\`\`\n`
      : `# ${source}\n`);
  }
  for (const route of options.routes ?? ["question", "diagrams", "architecture", "matrix", "lists"]) {
    write(root, `site/${route}/index.html`, "<!doctype html><title>fixture</title>\n");
  }
  return root;
}

function write(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source);
}

const independentRoutes = {
  DKBWS_BROWSER_QUESTION_ROUTE: "/question",
  DKBWS_BROWSER_MERMAID_ROUTE: "/diagrams",
  DKBWS_BROWSER_ARCHITECTURE_ROUTE: "/architecture",
  DKBWS_BROWSER_TABLE_ROUTE: "/matrix",
  DKBWS_BROWSER_LIST_ROUTE: "/lists",
};

test("representative browser routes resolve independently", t => {
  const root = fixture(t);
  const configuration = resolveRuntimeBrowserConfiguration({ root, env: independentRoutes });
  assert.deepEqual(configuration.routes, {
    question: "/question/",
    mermaid: "/diagrams/",
    architecture: "/architecture/",
    table: "/matrix/",
    list: "/lists/",
    graph2d: "/graph/two-dimensional/",
    graph3d: "/graph/three-dimensional/",
  });
  assert.equal(configuration.sources.mermaid, "docs/diagrams.md");
  assert.equal(configuration.sources.architecture, "docs/architecture.md");
  assert.equal(configuration.graph.required, false);
});

test("a graph-required profile fails closed when either Graphify view is absent", t => {
  const root = fixture(t, {
    profileRequiresGraph: true,
    routes: ["question", "diagrams", "architecture", "matrix", "lists", "graph/two-dimensional"],
  });
  assert.throws(
    () => resolveRuntimeBrowserConfiguration({ root, env: independentRoutes }),
    /required 3D Graphify route is missing: \/graph\/three-dimensional\//,
  );
});

test("the manifest graph capability also requires both Graphify views", t => {
  const root = fixture(t, {
    manifestGraph: true,
    routes: [
      "question", "diagrams", "architecture", "matrix", "lists",
      "graph/two-dimensional", "graph/three-dimensional",
    ],
  });
  const configuration = resolveRuntimeBrowserConfiguration({ root, env: independentRoutes });
  assert.equal(configuration.graph.required, true);
  assert.equal(configuration.graph.selectedByProfile, false);
  assert.equal(configuration.graph.selectedByManifest, true);
});

test("browser routes reject remote, query-bearing, and traversal inputs", () => {
  for (const route of ["//example.test/path", "/path?mode=wide", "/path#section", "/safe/%2e%2e/escape"]) {
    assert.throws(() => normalizeBrowserRoute(route));
  }
});
