import fs from "node:fs";

const errors = [];
const design = read("DESIGN.md");
const theme = read("docs/assets/theme.css");
const layout = read("docs/assets/layout-width.css");
const graph = read("docs/assets/graph.css");
const publisher = read("scripts/publish-graphify-assets.mjs");
const mermaidAdapter = read("docs/assets/mermaid-adapter.js");
const zensical = read("zensical.toml");
const requirements = read("docs/spec/requirements.md");
const humanProfile = read("profiles/human-and-agent.yaml");
const home = read("docs/index.md");
const architecture = read("docs/architecture.md");
const starterHome = read("starter/templates/docs/index.md.tmpl");
const starterDesign = read("starter/templates/DESIGN.md.tmpl");
const starterZensical = read("starter/templates/zensical.toml.tmpl");
const draftIcon = read("docs/assets/pen-circle.svg");

for (const token of [
  "accentDark", "accentDarker", "accentVisited", "accentLight", "accentLightest",
  "accentTransparent", "accentTransparentStrong", "accentContrast", "conditional",
  "success", "warning", "componentRadius", "componentRadiusSmall", "componentRadiusLarge",
  "diagramNodeRadius", "diagramEmphasisLineWidth", "diagramLabelMaskWidth", "componentBorderWidth", "technicalFrameBorderWidth",
  "sourceRowRailWidth", "accentRailWidth", "layoutWidthControlContentRailOffset",
  "headerTitleContentRailOffset", "listMarkerIndent", "listMarkerSize",
  "compactDataFontSize", "diagramTextSize", "sequentialMenuRailWidth",
  "draftStatusIconSize",
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
requireIn(design, 'diagramEmphasisLineWidth: "3px"', "DESIGN.md must pin the Mermaid emphasis line");
requireIn(design, 'diagramLabelMaskWidth: "4px"', "DESIGN.md must pin the Mermaid label mask");
requireIn(design, "governing-question:", "DESIGN.md must define the governing-question component");
requireIn(starterDesign, "governing-question:", "starter DESIGN.md must carry the governing-question component");
requireIn(starterDesign, "kb-canonical", "starter DESIGN.md must carry the semantic Mermaid role grammar");
requireIn(starterDesign, "no edge labels", "starter DESIGN.md must carry the simplified Mermaid topology rule");
requireIn(starterDesign, "Draft — research in progress", "starter DESIGN.md must carry the readable draft-status contract");
requireIn(requirements, "DKBWS-HUMAN-002", "the normative catalogue must define DKBWS-HUMAN-002");
requireIn(requirements, "DKBWS-HUMAN-003", "the normative catalogue must define DKBWS-HUMAN-003");
requireIn(humanProfile, "- DKBWS-HUMAN-002", "the Human and Agent profile must require DKBWS-HUMAN-002");
requireIn(humanProfile, "- DKBWS-HUMAN-003", "the Human and Agent profile must require DKBWS-HUMAN-003");
for (const issue of governingQuestionMarkupIssues(home)) errors.push(`Standard homepage ${issue}`);
requireIn(
  starterHome,
  "{{GOVERNING_QUESTION_CALLOUT_OR_SUBJECT_EMPTY_NOTICE}}",
  "starter homepage must expose the conditional seeded-or-subject-empty insertion point",
);
const seededStarterHome = starterHome.replace(
  "{{GOVERNING_QUESTION_CALLOUT_OR_SUBJECT_EMPTY_NOTICE}}",
  '<blockquote class="governing-question">\n<p>{{GOVERNING_QUESTION}}</p>\n</blockquote>',
);
for (const issue of governingQuestionMarkupIssues(seededStarterHome)) errors.push(`seeded starter homepage ${issue}`);
const subjectEmptyStarterHome = starterHome.replace(
  "{{GOVERNING_QUESTION_CALLOUT_OR_SUBJECT_EMPTY_NOTICE}}",
  "This subject-empty wiki is awaiting a research seed.",
);
if (subjectEmptyStarterHome.includes('class="governing-question"')) {
  errors.push("subject-empty starter homepage must not invent a governing-question marker");
}
const mismatchedGoverningQuestionFixture = [
  "<blockquote>",
  '<p class="governing-question">Mismatched marker</p>',
  "</blockquote>",
].join("\n");
if (governingQuestionMarkupIssues(mismatchedGoverningQuestionFixture).length === 0) {
  errors.push("governing-question source validation must reject a marker placed on the paragraph instead of its callout");
}

for (const token of [
  "--primary: #174a5b", "--accent: #0b7285", "--accent-dark: #075866",
  "--accent-darker:", "--accent-visited:", "--accent-light:", "--accent-lightest: #d9f0f3",
  "--accent-transparent:", "--accent-transparent-strong:", "--accent-contrast:",
  "--conditional:", "--success:", "--warning:", "--component-radius:",
  "--component-radius-small:", "--component-radius-large:", "--diagram-node-radius:",
  "--diagram-emphasis-line-width: 3px", "--diagram-label-mask-width: 4px", "--component-border-width:", "--technical-frame-border-width: 1.75px",
  "--source-row-rail-width:", "--accent-rail-width:", "--list-marker-indent:",
  "--list-marker-size: 1em", "--compact-data-font-size: .64rem",
  "--diagram-text-size:", "--sequential-menu-rail-width:",
  "--draft-status-icon-size: .9rem",
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
requireIn(mermaidAdapter, "stroke-width: var(--diagram-emphasis-line-width)", "closed-shadow Mermaid emphasis lines must use the 3px token");
requireIn(mermaidAdapter, "useMaxWidth: false", "Mermaid must retain governed label scale");
requireIn(mermaidAdapter, "htmlLabels: false", "Mermaid labels must remain measurable SVG text");
requireIn(mermaidAdapter, "subGraphTitleMargin: { top: 4, bottom: 10 }", "Mermaid clusters must reserve readable title space");
requireIn(mermaidAdapter, "paint-order: stroke", "closed-shadow Mermaid downstream cluster fallback must retain a label mask");
requireIn(mermaidAdapter, "diagram.scrollLeft", "wide Mermaid diagrams must open centrally");
requireIn(selectorBlock(theme, ".md-typeset .mermaid"), "overflow-x: auto", "Mermaid must scroll within its pane");
for (const role of [
  "kb-source", "kb-evidence", "kb-snapshot", "kb-normative", "kb-canonical",
  "kb-product", "kb-derived", "kb-consumer", "kb-verification",
]) {
  requireIn(theme, role, `fallback Mermaid CSS must style ${role}`);
  requireIn(mermaidAdapter, role, `closed-shadow Mermaid CSS must style ${role}`);
}
const homeDiagram = overviewDiagram(home, "Standard homepage Mermaid");
for (const phrase of [
  "accTitle: Governed knowledge base system",
  "accDescr: Source material becomes inspectable evidence",
  "S --> E --> C --> W --> V",
  "class S kb-source",
  "class E kb-evidence",
  "class C kb-canonical",
  "class W kb-derived",
  "class V kb-verification",
]) {
  requireIn(homeDiagram, phrase, `Standard homepage Mermaid must retain ${phrase}`);
}
const authorityDiagram = overviewDiagram(architecture, "Standard authority Mermaid");
for (const phrase of [
  "accTitle: Knowledge authority and derived surfaces",
  "accDescr: Sources are registered, assessed as evidence",
  "S --> R --> E --> C --> W",
  "class S kb-source",
  "class R,E kb-evidence",
  "class C kb-canonical",
  "class W kb-derived",
]) {
  requireIn(authorityDiagram, phrase, `Standard authority Mermaid must retain ${phrase}`);
}
requireIn(theme, "border-inline-start: var(--sequential-menu-rail-width) solid var(--border)", "page outline must use its quiet rail");
const draftMarker = selectorBlock(theme, ".md-status--draft::after");
requireIn(draftMarker, 'mask-image: url("pen-circle.svg")', "draft status must use the registered Pen Circle mask");
const draftMarkerColumn = selectorBlock(theme, ".md-nav--primary .md-nav__link > .md-status");
requireIn(draftMarkerColumn, "flex: 0 0 var(--draft-status-icon-size)", "draft status must use the governed marker size");
requireIn(draftMarkerColumn, "margin-inline-end: calc(var(--draft-status-icon-size) / -2)", "draft status must share the chevron trailing centreline");
for (const phrase of [
  "Pen Circle by SVG Repo",
  "https://www.svgrepo.com/svg/532983/pen-circle",
  "Licence: CC0 1.0",
  'viewBox="0 0 24 24"',
]) {
  requireIn(draftIcon, phrase, `draft icon asset must retain: ${phrase}`);
}
for (const [source, label] of [[zensical, "zensical.toml"], [starterZensical, "starter zensical template"]]) {
  requireIn(source, '[project.extra.status]', `${label} must declare renderer status text`);
  requireIn(source, 'draft = "Draft — research in progress"', `${label} must expose readable draft status text`);
}
requireIn(layout, "--layout-width-control-content-rail-offset: 2rem", "Wide control must use the body-rail offset");
requireIn(layout, "--header-title-content-rail-offset: 10.5rem", "header title must use the body-rail offset");
requireIn(layout, "margin-inline-start: var(--header-title-content-rail-offset)", "header title must consume its rail token");
requireIn(layout, "margin-inline: var(--layout-width-control-inline-start) var(--layout-width-control-content-rail-offset)", "Wide control must align to the content rail");
requireIn(layout, ".md-header__title .md-header__topic", "the visible header topic must be governed");
requireIn(layout, "transform: none !important", "the visible header topic must stay on the body rail");
requireIn(selectorBlock(theme, ".md-header"), "background-color: var(--surface)", "header must use the surface token");
requireIn(selectorBlock(theme, ".md-search__button"), "background-color: var(--md-default-fg-color--lightest)", "Search must use the neutral renderer token");
requireIn(
  selectorBlock(theme, ".md-typeset blockquote.governing-question"),
  "border-inline-start-color: var(--accent)",
  "governing-question rail must use the active accent token",
);
const governingQuestionText = selectorBlock(theme, ".md-typeset blockquote.governing-question > p");
requireIn(governingQuestionText, "color: var(--accent)", "governing-question text must use the active accent token");
requireIn(governingQuestionText, "font-weight: 700", "governing-question text must remain visually prominent");
if (selectorBlock(theme, ".md-typeset blockquote").includes("var(--accent)")) {
  errors.push("ordinary blockquotes must remain neutral instead of inheriting the active accent");
}
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
function mermaidFences(source) {
  return [...source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map(match => match[1]);
}
function overviewDiagram(source, label) {
  const diagrams = mermaidFences(source);
  if (diagrams.length !== 1) {
    errors.push(`${label} must contain exactly one diagram; found ${diagrams.length}`);
    return diagrams[0] || "";
  }
  const diagram = diagrams[0];
  if (!/^flowchart TB$/m.test(diagram)) errors.push(`${label} must use one top-to-bottom reading direction`);
  if (!diagram.includes('"curve": "linear"')) errors.push(`${label} must use straight connectors`);
  if (/^\s*subgraph\b/m.test(diagram)) errors.push(`${label} must remain cluster-free on the narrow content rail`);
  if (/\|[^|\n]+\||(?:--|==)\s+[^>\n]+\s+(?:-->|==>)/.test(diagram)) {
    errors.push(`${label} must not place text on connectors`);
  }
  if (/<br\s*\/?\s*>/i.test(diagram)) errors.push(`${label} must keep node labels short without manual line breaks`);

  const nodeIds = new Set(
    [...diagram.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*(?=\[\[|\[\(|\[|\(\[|\(\(|\(|\{)/g)]
      .map(match => match[1]),
  );
  const edgeCount = [...diagram.matchAll(/-->|==>|-\.->/g)].length;
  if (nodeIds.size > 5) errors.push(`${label} must use no more than five nodes; found ${nodeIds.size}`);
  if (edgeCount > 5) errors.push(`${label} must use no more than five visible relationships; found ${edgeCount}`);

  const incoming = new Map();
  const outgoing = new Map();
  for (const line of diagram.split("\n")) {
    if (!/(?:-->|==>|-\.->)/.test(line)) continue;
    const ids = line.split(/\s*(?:-->|==>|-\.->)\s*/)
      .map(segment => segment.match(/\b([A-Za-z][A-Za-z0-9_]*)\b/)?.[1])
      .filter(Boolean);
    for (let index = 0; index < ids.length - 1; index += 1) {
      outgoing.set(ids[index], (outgoing.get(ids[index]) || 0) + 1);
      incoming.set(ids[index + 1], (incoming.get(ids[index + 1]) || 0) + 1);
    }
  }
  const branchNodes = new Set([
    ...[...outgoing].filter(([, count]) => count > 1).map(([id]) => id),
    ...[...incoming].filter(([, count]) => count > 1).map(([id]) => id),
  ]);
  if (branchNodes.size > 2) errors.push(`${label} must use at most one parallel branch; found ${branchNodes.size} split/merge points`);
  return diagram;
}
function governingQuestionMarkupIssues(source) {
  const issues = [];
  const markers = [...source.matchAll(/class=["'][^"']*\bgoverning-question\b[^"']*["']/g)];
  const valid = [...source.matchAll(
    /<blockquote\s+class=["']governing-question["']>\s*<p>[^<]+<\/p>\s*<\/blockquote>/g,
  )];
  if (markers.length !== 1) issues.push(`must contain exactly one governing-question marker; found ${markers.length}`);
  if (valid.length !== 1) issues.push("must place its governing-question marker on a blockquote containing one direct paragraph");
  return issues;
}
