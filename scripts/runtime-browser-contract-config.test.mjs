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
  const profileRequiresSourceLinks = options.profileRequiresSourceLinks ?? false;
  const manifestGraph = options.manifestGraph ?? false;
  write(root, ".wiki-standard.yaml", [
    "profile: fixture",
    "roles:",
    "  human_wiki: docs/question.md",
    "  source_register: docs/sources.md",
    "capabilities:",
    `  graphify: ${manifestGraph}`,
    ...(options.sourceLinksNotApplicable ? [
      "deviations:",
      "  - requirement: DKBWS-LINK-002",
      "    status: not-applicable",
      "    reason: Subject-empty fixture displays no source identities.",
    ] : []),
    "",
  ].join("\n"));
  const requirements = [
    ...(profileRequiresGraph ? ["DKBWS-GRAPH-001"] : []),
    ...(profileRequiresSourceLinks ? ["DKBWS-LINK-002"] : []),
  ];
  write(root, "profiles/fixture.yaml", [
    "id: fixture",
    'version: "1"',
    ...(requirements.length ? ["requires:", ...requirements.map(id => `  - ${id}`)] : ["requires: []"]),
    "capabilities:",
    `  graphify: ${profileRequiresGraph ? "required" : "false"}`,
    "",
  ].join("\n"));
  for (const source of ["question", "diagrams", "architecture", "matrix", "lists", "sources"]) {
    write(root, `docs/${source}.md`, source === "diagrams" || source === "architecture"
      ? `# ${source}\n\n\`\`\`mermaid\nflowchart TD\n  A --> B\n\`\`\`\n`
      : `# ${source}\n`);
  }
  for (const route of options.routes ?? ["question", "diagrams", "architecture", "matrix", "lists", "sources"]) {
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
  DKBWS_BROWSER_SOURCE_LINKS_ROUTE: "/matrix",
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
    sourceLinks: "/matrix/",
    sourceRegister: "/sources/",
    graph2d: "/graph/two-dimensional/",
    graph3d: "/graph/three-dimensional/",
  });
  assert.equal(configuration.sources.mermaid, "docs/diagrams.md");
  assert.equal(configuration.sources.architecture, "docs/architecture.md");
  assert.equal(configuration.graph.required, false);
  assert.equal(configuration.sourceLinks.required, false);
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

test("a source-link-required profile resolves independent citation and register routes", t => {
  const root = fixture(t, { profileRequiresSourceLinks: true });
  const configuration = resolveRuntimeBrowserConfiguration({ root, env: independentRoutes });
  assert.equal(configuration.sourceLinks.required, true);
  assert.equal(configuration.routes.sourceLinks, "/matrix/");
  assert.equal(configuration.routes.sourceRegister, "/sources/");
});

test("an explicit citation-free deviation skips the source-link browser representative", t => {
  const root = fixture(t, {
    profileRequiresSourceLinks: true,
    sourceLinksNotApplicable: true,
    routes: ["question", "diagrams", "architecture", "matrix", "lists"],
  });
  const configuration = resolveRuntimeBrowserConfiguration({ root, env: independentRoutes });
  assert.equal(configuration.sourceLinks.required, false);
});

test("browser routes reject remote, query-bearing, and traversal inputs", () => {
  for (const route of ["//example.test/path", "/path?mode=wide", "/path#section", "/safe/%2e%2e/escape"]) {
    assert.throws(() => normalizeBrowserRoute(route));
  }
});
