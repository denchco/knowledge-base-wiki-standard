import fs from "node:fs";

const errors = [];
const design = read("DESIGN.md");
const theme = read("docs/assets/theme.css");
const layout = read("docs/assets/layout-width.css");
const graph = read("docs/assets/graph.css");
const publisher = read("scripts/publish-graphify-assets.mjs");
const mermaidAdapter = read("docs/assets/mermaid-adapter.js");
const zensical = read("zensical.toml");

for (const token of [
  "accentDark", "accentDarker", "accentVisited", "accentLight", "accentLightest",
  "accentTransparent", "accentTransparentStrong", "accentContrast", "conditional",
  "success", "warning", "componentRadius", "componentRadiusSmall", "componentRadiusLarge",
  "diagramNodeRadius", "componentBorderWidth", "technicalFrameBorderWidth",
  "sourceRowRailWidth", "accentRailWidth", "layoutWidthControlContentRailOffset",
  "headerTitleContentRailOffset", "listMarkerIndent", "listMarkerSize",
  "compactDataFontSize", "diagramTextSize", "sequentialMenuRailWidth",
]) {
  requireIn(design, token, `DESIGN.md must define ${token}`);
}
for (const [token, value] of [
  ["primary", "#174a5b"],
  ["accent", "#0b7285"],
  ["accentDark", "#075866"],
  ["accentLightest", "#d9f0f3"],
]) {
  requireIn(design, `${token}: "${value}"`, `DESIGN.md must pin DenchCo ${token} to ${value}`);
}
requireIn(design, 'compactDataFontSize: ".64rem"', "DESIGN.md must pin reduced table text");
requireIn(design, 'diagramTextSize: ".64rem"', "DESIGN.md must match Mermaid and reduced table text");

for (const token of [
  "--primary: #174a5b", "--accent: #0b7285", "--accent-dark: #075866",
  "--accent-darker:", "--accent-visited:", "--accent-light:", "--accent-lightest: #d9f0f3",
  "--accent-transparent:", "--accent-transparent-strong:", "--accent-contrast:",
  "--conditional:", "--success:", "--warning:", "--component-radius:",
  "--component-radius-small:", "--component-radius-large:", "--diagram-node-radius:",
  "--component-border-width:", "--technical-frame-border-width: 1.75px",
  "--source-row-rail-width:", "--accent-rail-width:", "--list-marker-indent:",
  "--list-marker-size: 1em", "--compact-data-font-size: .64rem",
  "--diagram-text-size:", "--sequential-menu-rail-width:",
]) {
  requireIn(theme, token, `docs/assets/theme.css must define ${token}`);
}

requireIn(theme, "border: var(--component-border-width) solid var(--border)", "content components must use the border-width token");
requireIn(theme, "rx: var(--diagram-node-radius)", "Mermaid nodes must use the diagram radius token");
requireIn(theme, "list-style-type: square", "body lists must use square markers");
requireIn(theme, "font-size: var(--compact-data-font-size)", "tables must use reduced text");
requireIn(theme, "font-size: var(--diagram-text-size) !important", "diagram text must match tables");
requireIn(mermaidAdapter, "rx: var(--diagram-node-radius)", "closed-shadow Mermaid nodes must use the radius token");
requireIn(mermaidAdapter, "font-size: var(--diagram-text-size)", "closed-shadow Mermaid text must use the diagram token");
requireIn(mermaidAdapter, "stroke-width: var(--technical-frame-border-width)", "closed-shadow Mermaid lines must use the 1.75px technical width");
requireIn(mermaidAdapter, "useMaxWidth: false", "Mermaid must retain governed label scale");
requireIn(mermaidAdapter, "htmlLabels: false", "Mermaid labels must remain measurable SVG text");
requireIn(mermaidAdapter, "diagram.scrollLeft", "wide Mermaid diagrams must open centrally");
requireIn(selectorBlock(theme, ".md-typeset .mermaid"), "overflow-x: auto", "Mermaid must scroll within its pane");
requireIn(theme, "border-inline-start: var(--sequential-menu-rail-width) solid var(--border)", "page outline must use its quiet rail");
requireIn(layout, "--layout-width-control-content-rail-offset: 2rem", "Wide control must use the body-rail offset");
requireIn(layout, "--header-title-content-rail-offset: 10.5rem", "header title must use the body-rail offset");
requireIn(layout, "margin-inline-start: var(--header-title-content-rail-offset)", "header title must consume its rail token");
requireIn(layout, "margin-inline: var(--layout-width-control-inline-start) var(--layout-width-control-content-rail-offset)", "Wide control must align to the content rail");
requireIn(layout, ".md-header__title .md-header__topic", "the visible header topic must be governed");
requireIn(layout, "transform: none !important", "the visible header topic must stay on the body rail");
requireIn(selectorBlock(theme, ".md-header"), "background-color: var(--surface)", "header must use the surface token");
requireIn(selectorBlock(theme, ".md-search__button"), "background-color: var(--md-default-fg-color--lightest)", "Search must use the neutral renderer token");
requireIn(graph, "border: var(--technical-frame-border-width) solid var(--accent-light)", "Graph pane must use one 1.75px rail");
requireIn(selectorBlock(graph, ".graph-frame"), "border: 0", "Graph iframe must not add a second border");
requireIn(publisher, 'const primary = process.env.GRAPHIFY_PRIMARY ?? "#0b7285"', "Graph publication must default to DenchCo teal");
requireIn(publisher, "--component-border-width: 1px", "Graphify 3D controls must define a border token");
requireIn(publisher, "--panel-radius: 8px", "Graphify 3D panels must retain a bounded radius");

for (const asset of [
  "assets/vendor/mermaid.min.js", "assets/mermaid-adapter.js",
  "assets/wiki.js", "assets/layout-width.js",
]) {
  requireIn(zensical, asset, `zensical.toml must load ${asset}`);
}
for (const asset of ["assets/graph.css", "assets/content.css", "assets/layout-width.css", "assets/theme.css"]) {
  requireIn(zensical, asset, `zensical.toml must load ${asset}`);
}

const customCss = `${theme}\n${layout}\n${graph}`;
for (const match of customCss.matchAll(/border-radius:\s*(\d+(?:\.\d+)?)px\b/g)) {
  const radius = Number(match[1]);
  if (radius > 8 && radius !== 999) errors.push(`rectangular radius exceeds 8px: ${match[0]}`);
}
for (const match of customCss.matchAll(/border-radius:\s*(\d*\.?\d+)rem\b/g)) {
  if (Number(match[1]) > 0.5) errors.push(`rectangular radius exceeds 0.5rem: ${match[0]}`);
}
for (const source of [theme, layout, graph]) {
  const rawBorder = source.match(/(?:^|\n)\s*border(?:-(?:left|right|top|bottom))?:\s*(\d+(?:\.\d+)?(?:px|rem))\s+solid\b/m);
  if (rawBorder) errors.push(`custom CSS must use named border tokens instead of ${rawBorder[0].trim()}`);
}

if (errors.length) {
  console.error("DenchCo visual-shape contract failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("DenchCo accent, shape, rail, Mermaid, graph-frame, and local-runtime contract passed.");

function read(file) {
  if (!fs.existsSync(file)) {
    errors.push(`missing file: ${file}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}
function requireIn(source, phrase, message) {
  if (!source.includes(phrase)) errors.push(message);
}
function selectorBlock(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m"))?.[1] ?? "";
}
