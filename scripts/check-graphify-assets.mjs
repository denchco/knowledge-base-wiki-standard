import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = process.env.GRAPHIFY_TARGET_DIR ?? "docs/assets/graphify";
const reportPath = process.env.GRAPHIFY_REPORT_PATH ?? "GRAPH_REPORT.md";
const sourceIdPattern = process.env.GRAPHIFY_SOURCE_ID_PATTERN ?? "[A-Z][A-Z0-9]+-\\d{3}";
const sourceIdRegex = new RegExp(`\\b${sourceIdPattern}\\b`, "g");
const exactSourceIdRegex = new RegExp(`^${sourceIdPattern}$`);

const required = [
  reportPath,
  `${target}/graph.html`,
  `${target}/graph-3d.html`,
  `${target}/graph.json`,
  `${target}/summary.json`,
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing Graphify publication artifact(s): ${missing.join(", ")}`);
  process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(path.join(root, target, "graph.json"), "utf8"));
const summary = JSON.parse(fs.readFileSync(path.join(root, target, "summary.json"), "utf8"));
const graphSchema = JSON.parse(fs.readFileSync(path.join(root, "schema/graph-publication-v1.json"), "utf8"));
const summarySchema = JSON.parse(fs.readFileSync(path.join(root, "schema/graph-publication-summary-v1.json"), "utf8"));
const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
const links = Array.isArray(graph.links) ? graph.links : Array.isArray(graph.edges) ? graph.edges : [];

const failures = [];
if (graph.publicationSchemaVersion !== "1.0") failures.push("graph.json publicationSchemaVersion must equal 1.0");
if (summary.publicationSchemaVersion !== "1.0") failures.push("summary.json publicationSchemaVersion must equal 1.0");
for (const [name, schema] of [["graph", graphSchema], ["summary", summarySchema]]) {
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    failures.push(`${name} publication schema is not JSON Schema Draft 2020-12`);
  }
  if (schema.properties?.publicationSchemaVersion?.const !== "1.0") {
    failures.push(`${name} publication schema does not pin publicationSchemaVersion 1.0`);
  }
}
if (summary.nodes !== nodes.length) failures.push(`summary.nodes ${summary.nodes} != graph nodes ${nodes.length}`);
if (summary.edges !== links.length) failures.push(`summary.edges ${summary.edges} != graph edges ${links.length}`);

const graph2d = fs.readFileSync(path.join(root, target, "graph.html"), "utf8");
if (!graph2d.includes("RAW_NODES") && !graph2d.includes("Graphify unavailable")) {
  failures.push("graph.html does not look like a Graphify 2D view");
}
if (!graph2d.includes("width: 100vw; height: 100vh") || !graph2d.includes("#legend-wrap, #stats { display: none; }")) {
  failures.push("graph.html does not preserve a full-width mobile canvas with bounded overlay controls");
}
if (!graph2d.includes("#0b7285")) failures.push("graph.html does not expose the governed #0b7285 interaction accent");
if (!graph2d.includes("outline: 3px solid #0b7285")) failures.push("graph.html search/selection focus does not use the governed accent");
if (!graph2d.includes("../vendor/vis-network.min.js")) failures.push("graph.html does not use the pinned local vis-network runtime");
if (/src="\.\.\/vendor\/vis-network\.min\.js"[^>]*\bintegrity=/i.test(graph2d)) failures.push("graph.html retains stale CDN integrity metadata on the local vis-network runtime");

const graph3d = fs.readFileSync(path.join(root, target, "graph-3d.html"), "utf8");
if (!graph3d.includes("3d-force-graph")) failures.push("graph-3d.html does not load the 3D graph renderer");
if (!graph3d.includes("graph.json")) failures.push("graph-3d.html does not reference graph.json");
if (!graph3d.includes(".width(window.innerWidth)") || !graph3d.includes('window.addEventListener("resize"')) {
  failures.push("graph-3d.html does not resize its WebGL canvas with the iframe viewport");
}
if (!graph3d.includes("--primary: #0b7285")) failures.push("graph-3d.html does not expose the governed #0b7285 interaction accent");
if (!graph3d.includes("outline: 3px solid var(--accent)")) failures.push("graph-3d.html search focus does not use the governed accent");
if (!graph3d.includes("../vendor/3d-force-graph.min.js")) failures.push("graph-3d.html does not use the pinned local 3d-force-graph runtime");

for (const [name, html] of [["graph.html", graph2d], ["graph-3d.html", graph3d]]) {
  if (/https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/i.test(html)) {
    failures.push(`${name} retains a public-CDN browser runtime`);
  }
}

const generatedAccentSources = `${graph2d}\n${graph3d}\n${JSON.stringify(graph)}`.toLowerCase();
for (const colour of [
  "#0078d4", "#005a9e",
  "#003d78", "#005eb8", "#41a0d7", "#e8f4fb", "#ffb81c",
  "#4051b5", "#526cfe", "#2563eb", "#7c3aed", "#a855f7",
  "#6d79d8", "#6366f1", "#4f46e5"
]) {
  if (generatedAccentSources.includes(colour)) failures.push(`generated graph assets retain conflicting accent ${colour}`);
}

const relationSet = new Set(links.map((link) => link.relation ?? link.label ?? "contains"));
const interconnections = summary.interconnections ?? {};
if (nodes.length && hasNavigationConfig() && !relationSet.has("nav contains")) {
  failures.push("graph.json is missing renderer navigation interconnection edges");
}
if (nodes.length && documentSourceFiles().length > 1 && !relationSet.has("filesystem contains")) {
  failures.push("graph.json is missing filesystem hierarchy interconnection edges");
}
if (sourceIdsFromRegister().length && !relationSet.has("defines source")) {
  failures.push("graph.json is missing source-register definition nodes/edges");
}
if (sourceIdsCitedOutsideRegister().length && !relationSet.has("cites source")) {
  failures.push("graph.json is missing source citation interconnection edges");
}
if (internalMarkdownLinks().length && !relationSet.has("links to")) {
  failures.push("graph.json is missing Markdown link interconnection edges");
}
if (explicitFileReferences().length && !relationSet.has("references file")) {
  failures.push("graph.json is missing explicit file-reference interconnection edges");
}
if (summary.interconnections) {
  const knownCounts = [
    "markdownDocumentNodeCount",
    "markdownLinkEdgeCount",
    "sourceReferenceEdgeCount",
    "navEdgeCount",
    "fileHierarchyEdgeCount",
    "fileReferenceEdgeCount",
  ];
  for (const key of knownCounts) {
    if (!Number.isFinite(Number(interconnections[key]))) failures.push(`summary.interconnections.${key} is missing or not numeric`);
  }
}

if (failures.length) {
  console.error("Graphify publication check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Graphify publication artifacts present: ${nodes.length} nodes, ${links.length} edges, 2D and 3D views enabled.`);

function documentSourceFiles() {
  return [...new Set(nodes.map((node) => node.source_file).filter(Boolean))];
}

function hasNavigationConfig() {
  const configured = process.env.GRAPHIFY_NAV_CONFIG;
  if (configured && fs.existsSync(path.join(root, configured))) return true;
  return ["mkdocs.yml", "zensical.toml"].some((file) => fs.existsSync(path.join(root, file)));
}

function markdownFiles(dir = path.join(root, "docs")) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fullPath.includes(`${path.sep}assets${path.sep}graphify`)) continue;
      files.push(...markdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function sourceIdsFromRegister() {
  const sourcesPath = path.join(root, "docs/sources.md");
  if (!fs.existsSync(sourcesPath)) return [];
  return [...new Set(fs.readFileSync(sourcesPath, "utf8").match(sourceIdRegex) ?? [])]
    .filter((id) => exactSourceIdRegex.test(id));
}

function sourceIdsCitedOutsideRegister() {
  const ids = new Set();
  for (const file of markdownFiles()) {
    const rel = path.relative(root, file).replaceAll(path.sep, "/");
    if (rel === "docs/sources.md") continue;
    for (const id of fs.readFileSync(file, "utf8").match(sourceIdRegex) ?? []) ids.add(id);
  }
  return [...ids];
}

function normalizeMarkdownTarget(sourceFile, href) {
  if (!href || /^(https?:|mailto:|tel:|data:)/i.test(href) || href.startsWith("#")) return null;
  const cleanHref = href.split("#")[0].split("?")[0].replace(/^<|>$/g, "");
  if (!cleanHref.endsWith(".md")) return null;
  const sourceDir = path.dirname(path.join(root, sourceFile));
  const targetAbs = path.resolve(sourceDir, cleanHref);
  const rel = path.relative(root, targetAbs).replaceAll(path.sep, "/");
  return rel.startsWith("..") ? null : rel;
}

function internalMarkdownLinks() {
  const linksFound = [];
  const sourceFiles = new Set(documentSourceFiles());
  for (const file of markdownFiles()) {
    const rel = path.relative(root, file).replaceAll(path.sep, "/");
    const content = fs.readFileSync(file, "utf8");
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const targetFile = normalizeMarkdownTarget(rel, match[1]);
      if (targetFile && sourceFiles.has(targetFile) && targetFile !== rel) linksFound.push(`${rel}->${targetFile}`);
    }
  }
  return linksFound;
}

function explicitFileReferences() {
  const refs = [];
  const sourceFiles = new Set(documentSourceFiles());
  const scannable = documentSourceFiles().filter((file) => [".json", ".md", ".markdown", ".yml", ".yaml"].includes(path.extname(file).toLowerCase()));
  const pathPattern = /(?:^|[\s"'(:`])((?:docs|hooks|scripts|src|assets)\/[A-Za-z0-9_./-]+\.(?:css|html|js|json|md|mjs|py|ts|tsx|ya?ml)|(?:AGENTS|DESIGN|README|DEPLOYMENT)\.md|mkdocs\.yml|package\.json)(?=$|[\s"',)`<])/g;

  for (const sourceFile of scannable) {
    const fullPath = path.join(root, sourceFile);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size > 250_000) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    for (const match of content.matchAll(pathPattern)) {
      const target = match[1].startsWith("assets/") ? `docs/${match[1]}` : match[1];
      if (sourceFiles.has(target) && target !== sourceFile) refs.push(`${sourceFile}->${target}`);
    }
  }

  return refs;
}
