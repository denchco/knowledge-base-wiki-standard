import fs from "node:fs";

const errors = [];
const governedThreeProductLayout = '%%{init: {"flowchart": {"nodeSpacing": 40}}}%%';
const design = read("DESIGN.md");
const theme = read("docs/assets/theme.css");
const content = read("docs/assets/content.css");
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
requireIn(design, "every verbatim repetition in its bounded reader set", "DESIGN.md must govern every canonical-question repetition");
requireIn(starterDesign, "every verbatim repetition in its bounded reader set", "starter DESIGN.md must govern every canonical-question repetition");
requireIn(design, "Mermaid's ordinary node treatment", "DESIGN.md must make ordinary Mermaid nodes the reference default");
requireIn(starterDesign, "ordinary node treatment", "starter DESIGN.md must make ordinary Mermaid nodes the reference default");
requireIn(starterDesign, "they are not the default", "starter DESIGN.md must keep semantic Mermaid roles optional");
requireIn(design, "Mermaid's native `basis` connectors", "DESIGN.md must preserve Mermaid's native connector curve");
requireIn(starterDesign, "Mermaid's native `basis` connectors", "starter DESIGN.md must preserve Mermaid's native connector curve");
requireIn(starterDesign, "consistent rectangular node geometry", "starter DESIGN.md must carry the default-first node geometry rule");
requireIn(starterDesign, "ordinary arrows", "starter DESIGN.md must carry the default-first arrow rule");
requireIn(starterDesign, "no edge labels", "starter DESIGN.md must carry the simplified Mermaid topology rule");
requireIn(design, "three separately labelled sibling boxes", "DESIGN.md must require separate Human, Agent, and Graph boxes when all three are shown");
requireIn(starterDesign, "three separately labelled sibling boxes", "starter DESIGN.md must carry the separate Human, Agent, and Graph box rule");
requireIn(design, "no more than 60px", "DESIGN.md must bound the three-product mobile containment exception");
requireIn(starterDesign, "no more than 60px", "starter DESIGN.md must carry the bounded three-product mobile containment exception");
requireIn(starterDesign, "Draft — research in progress", "starter DESIGN.md must carry the readable draft-status contract");
requireIn(requirements, "DKBWS-HUMAN-002", "the normative catalogue must define DKBWS-HUMAN-002");
requireIn(requirements, "DKBWS-HUMAN-003", "the normative catalogue must define DKBWS-HUMAN-003");
requireIn(requirements, "DKBWS-HUMAN-004", "the normative catalogue must define DKBWS-HUMAN-004");
requireIn(requirements, "DKBWS-LINK-002", "the normative catalogue must define DKBWS-LINK-002");
requireIn(humanProfile, "- DKBWS-HUMAN-002", "the Human and Agent profile must require DKBWS-HUMAN-002");
requireIn(humanProfile, "- DKBWS-HUMAN-003", "the Human and Agent profile must require DKBWS-HUMAN-003");
requireIn(humanProfile, "- DKBWS-HUMAN-004", "the Human and Agent profile must require DKBWS-HUMAN-004");
requireIn(humanProfile, "- DKBWS-LINK-002", "the Human and Agent profile must require DKBWS-LINK-002");
requireIn(design, "independently focusable internal link", "DESIGN.md must preserve independent source-row links");
requireIn(starterDesign, "independently focusable internal link", "starter DESIGN.md must preserve independent source-row links");
requireIn(content, '.md-typeset a[href*="#src-"]::before', "source-row links must restore the visible opening bracket");
requireIn(content, '.md-typeset a[href*="#src-"]::after', "source-row links must restore the visible closing bracket");
for (const issue of governingQuestionMarkupIssues(home)) errors.push(`Standard homepage ${issue}`);
for (const issue of governingQuestionMarkupIssues(architecture)) errors.push(`Standard architecture ${issue}`);
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
const mermaidHost = selectorBlock(theme, ".md-typeset .mermaid");
requireIn(mermaidHost, "display: grid", "Mermaid host must establish a centering layout");
requireIn(mermaidHost, "justify-items: safe center", "Mermaid host must centre fitting surfaces without clipping oversized diagrams");
requireIn(mermaidHost, "overflow-x: auto", "Mermaid must scroll within its pane");
for (const role of [
  "kb-source", "kb-evidence", "kb-snapshot", "kb-normative", "kb-canonical",
  "kb-product", "kb-derived", "kb-consumer", "kb-verification",
]) {
  requireIn(theme, role, `fallback Mermaid CSS must style ${role}`);
  requireIn(mermaidAdapter, role, `closed-shadow Mermaid CSS must style ${role}`);
}
const homeTopology = {
  nodes: {
    S: "Source",
    E: "Evidence",
    C: "Knowledge",
    H: "Human",
    A: "Agent",
    G: "Graph",
    V: "Verification",
  },
  edges: [["S", "E"], ["E", "C"], ["C", "H"], ["C", "A"], ["C", "G"], ["H", "V"], ["A", "V"], ["G", "V"]],
};
const authorityTopology = {
  nodes: {
    S: "1 · Sources",
    R: "2 · Register",
    E: "3 · Evidence",
    C: "4 · Knowledge",
    H: "Human",
    A: "Agent",
    G: "Graph",
  },
  edges: [["S", "R"], ["R", "E"], ["E", "C"], ["C", "H"], ["C", "A"], ["C", "G"]],
};
const homeDiagram = overviewDiagram(home, "Standard homepage Mermaid", homeTopology);
for (const phrase of [
  "accTitle: Governed knowledge base system",
  "accDescr: Source material becomes inspectable evidence",
  'H["Human"]',
  'A["Agent"]',
  'G["Graph"]',
  "S --> E --> C",
  "C --> H",
  "C --> A",
  "C --> G",
  "H --> V",
  "A --> V",
  "G --> V",
]) {
  requireIn(homeDiagram, phrase, `Standard homepage Mermaid must retain ${phrase}`);
}
const authorityDiagram = overviewDiagram(architecture, "Standard authority Mermaid", authorityTopology);
for (const phrase of [
  "accTitle: Knowledge authority and derived surfaces",
  "accDescr: Sources are registered, assessed as evidence",
  'H["Human"]',
  'A["Agent"]',
  'G["Graph"]',
  "S --> R --> E --> C",
  "C --> H",
  "C --> A",
  "C --> G",
]) {
  requireIn(authorityDiagram, phrase, `Standard authority Mermaid must retain ${phrase}`);
}
const separatedSurfaceFixture = [
  "flowchart TB",
  '  C["Canonical knowledge"]',
  '  H["Human"]',
  '  A["Agent"]',
  '  G["Graph"]',
  '  V["Verification"]',
  "  C --> H",
  "  C --> A",
  "  C --> G",
  "  H --> V",
  "  A --> V",
  "  G --> V",
].join("\n");
const separatedFixtureTopology = {
  nodes: { C: "Canonical knowledge", H: "Human", A: "Agent", G: "Graph", V: "Verification" },
  edges: [["C", "H"], ["C", "A"], ["C", "G"], ["H", "V"], ["A", "V"], ["G", "V"]],
};
if (topologyIssues(separatedSurfaceFixture, separatedFixtureTopology).length > 0) {
  errors.push("Mermaid topology fixture must accept separate Human, Agent, and Graph sibling nodes with verification convergence");
}
for (const [fixture, label] of [
  [
    'flowchart TB\n  C["Canonical knowledge"]\n  W["Human · agent · graph views"]\n  V["Verification"]\n  C --> W --> V',
    "combined Human, Agent, and Graph node",
  ],
  [separatedSurfaceFixture.replace("  G --> V", ""), "missing Graph-to-Verification relationship"],
  [`${separatedSurfaceFixture}\n  H --> A`, "extra cross-product relationship"],
  [`${separatedSurfaceFixture}\n  C --> H`, "duplicate relationship"],
  [separatedSurfaceFixture.replace("  C --> H\n  C --> A\n  C --> G", "  C --> H & A & G"), "grouped-edge syntax"],
]) {
  if (topologyIssues(fixture, separatedFixtureTopology).length === 0) {
    errors.push(`Mermaid topology fixture must reject ${label}`);
  }
}
for (const [fixture, label] of [
  ['  %%{init: {"flowchart": {"padding": 10}}}%%\nflowchart TB\n  A["A"]', "indented init"],
  ['flowchart TB\n  A["A"]\n  class A kb-canonical', "semantic class"],
  ['flowchart TB\n  A["A"]:::kb-canonical', "inline semantic class"],
]) {
  if (!hasDiagramStylingOptIn(fixture)) errors.push(`Mermaid native-default guard must reject ${label}`);
}
if (hasDiagramStylingOptIn('flowchart TB\n  A["A"] --> B["B"]')) {
  errors.push("Mermaid native-default guard must accept plain Mermaid source");
}
if (hasDiagramStylingOptIn(`${governedThreeProductLayout}\nflowchart TB\n  A["A"] --> B["B"]`)) {
  errors.push("Mermaid native-default guard must accept the exact governed three-product layout override");
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
function overviewDiagram(source, label, expectedTopology) {
  const diagrams = mermaidFences(source);
  if (diagrams.length !== 1) {
    errors.push(`${label} must contain exactly one diagram; found ${diagrams.length}`);
    return diagrams[0] || "";
  }
  const diagram = diagrams[0];
  if (!/^flowchart TB$/m.test(diagram)) errors.push(`${label} must use one top-to-bottom reading direction`);
  const initDirectives = [...diagram.matchAll(/^[ \t]*%%\{init:.*$/gm)].map(match => match[0].trim());
  if (initDirectives.some(directive => directive !== governedThreeProductLayout)) {
    errors.push(`${label} must use no diagram-level init override other than the exact governed three-product node spacing`);
  }
  if (hasDiagramStylingOptIn(diagram)) {
    errors.push(`${label} must use ordinary Mermaid node treatment without diagram-level styling opt-ins`);
  }
  if (/"curve"\s*:/.test(diagram)) errors.push(`${label} must inherit Mermaid's native basis connectors`);
  const hasNonRectangleNode = diagram.split("\n").some(line => {
    const declaration = line.match(/^\s*[A-Za-z][A-Za-z0-9_]*\s*([\[\(\{>@]\S?)/);
    return declaration && declaration[1] !== '["';
  });
  if (hasNonRectangleNode) {
    errors.push(`${label} must use consistent rectangular node geometry`);
  }
  if (/==>|-\.->|--[ox]|[ox]--|<-->|~~~|---(?!>)/.test(diagram)) errors.push(`${label} must use ordinary arrows`);
  if (/^\s*subgraph\b/m.test(diagram)) errors.push(`${label} must remain cluster-free on the narrow content rail`);
  if (/\|[^|\n]+\||(?:--|==)\s+[^>\n]+\s+(?:-->|==>)/.test(diagram)) {
    errors.push(`${label} must not place text on connectors`);
  }
  if (/<br\s*\/?\s*>/i.test(diagram)) errors.push(`${label} must keep node labels short without manual line breaks`);
  if (hasCombinedThreeProductNode(diagram)) {
    errors.push(`${label} must present Human, Agent, and Graph as separate sibling nodes instead of one combined product node`);
  }
  for (const issue of topologyIssues(diagram, expectedTopology)) errors.push(`${label} ${issue}`);

  const nodeIds = new Set(
    [...diagram.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*(?=\[\[|\[\(|\[|\(\[|\(\(|\(|\{)/g)]
      .map(match => match[1]),
  );
  const edgeCount = [...diagram.matchAll(/-->|==>|-\.->/g)].length;
  const hasThreeProductTopology = hasSeparatedThreeProductTopology(diagram);
  if (hasThreeProductTopology && !diagram.startsWith(`${governedThreeProductLayout}\nflowchart TB\n`)) {
    errors.push(`${label} must begin with the exact governed 40px three-product node-spacing override`);
  }
  const nodeLimit = hasThreeProductTopology ? 7 : 5;
  const edgeLimit = hasThreeProductTopology ? 8 : 5;
  if (nodeIds.size > nodeLimit) errors.push(`${label} must use no more than ${nodeLimit} nodes; found ${nodeIds.size}`);
  if (edgeCount > edgeLimit) errors.push(`${label} must use no more than ${edgeLimit} visible relationships; found ${edgeCount}`);

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
  if (branchNodes.size > 2) errors.push(`${label} must use at most one coordinated fan-out/rejoin group; found ${branchNodes.size} split/merge points`);
  return diagram;
}
function topologyIssues(diagram, expected) {
  const issues = [];
  const nodes = new Map();
  const duplicateNodes = new Set();
  const edges = [];
  for (const line of diagram.split("\n")) {
    const node = line.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*\["([^"\n]+)"\]\s*$/);
    if (node) {
      if (nodes.has(node[1])) duplicateNodes.add(node[1]);
      nodes.set(node[1], node[2]);
      continue;
    }
    if (!line.includes("-->")) continue;
    if (line.includes("&")) {
      issues.push("must not use grouped-edge syntax; declare each visible relationship explicitly");
      continue;
    }
    const trimmed = line.trim();
    if (!/^[A-Za-z][A-Za-z0-9_]*(?:\s*-->\s*[A-Za-z][A-Za-z0-9_]*)+$/.test(trimmed)) {
      issues.push(`contains an unsupported relationship declaration: ${trimmed}`);
      continue;
    }
    const ids = trimmed.split(/\s*-->\s*/);
    for (let index = 0; index < ids.length - 1; index += 1) edges.push([ids[index], ids[index + 1]]);
  }
  if (duplicateNodes.size > 0) issues.push(`must not redeclare nodes: ${[...duplicateNodes].join(", ")}`);

  const expectedNodes = new Map(Object.entries(expected.nodes));
  if (nodes.size !== expectedNodes.size) issues.push(`must declare exactly ${expectedNodes.size} nodes; found ${nodes.size}`);
  for (const [id, expectedLabel] of expectedNodes) {
    if (!nodes.has(id)) issues.push(`is missing node ${id}["${expectedLabel}"]`);
    else if (nodes.get(id) !== expectedLabel) issues.push(`node ${id} must be labelled "${expectedLabel}"; found "${nodes.get(id)}"`);
  }
  for (const id of nodes.keys()) {
    if (!expectedNodes.has(id)) issues.push(`contains unexpected node ${id}`);
  }

  const edgeKeys = edges.map(([from, to]) => `${from}->${to}`);
  const duplicateEdges = [...new Set(edgeKeys.filter((edge, index) => edgeKeys.indexOf(edge) !== index))];
  if (duplicateEdges.length > 0) issues.push(`must not duplicate relationships: ${duplicateEdges.join(", ")}`);
  for (const [from, to] of edges) {
    if (!nodes.has(from) || !nodes.has(to)) issues.push(`relationship ${from}->${to} uses an undeclared node`);
  }
  const actualEdges = new Set(edgeKeys);
  const expectedEdges = new Set(expected.edges.map(([from, to]) => `${from}->${to}`));
  if (edges.length !== expected.edges.length) issues.push(`must declare exactly ${expected.edges.length} relationships; found ${edges.length}`);
  for (const edge of expectedEdges) {
    if (!actualEdges.has(edge)) issues.push(`is missing relationship ${edge}`);
  }
  for (const edge of actualEdges) {
    if (!expectedEdges.has(edge)) issues.push(`contains unexpected relationship ${edge}`);
  }
  const connected = new Set(edges.flat());
  for (const id of nodes.keys()) {
    if (!connected.has(id)) issues.push(`contains disconnected node ${id}`);
  }
  return issues;
}
function hasSeparatedThreeProductTopology(diagram) {
  return [
    'H["Human"]',
    'A["Agent"]',
    'G["Graph"]',
    "C --> H",
    "C --> A",
    "C --> G",
  ].every(phrase => diagram.includes(phrase));
}
function hasCombinedThreeProductNode(diagram) {
  return /\["Human\s*·\s*agent\s*·\s*graph views"\]/i.test(diagram);
}
function hasDiagramStylingOptIn(diagram) {
  const hasUngovernedInit = [...diagram.matchAll(/^[ \t]*%%\{init:.*$/gm)]
    .some(match => match[0].trim() !== governedThreeProductLayout);
  return hasUngovernedInit
    || /^[ \t]*(?:class|classDef|style|linkStyle)\b/m.test(diagram)
    || /:::[A-Za-z]/.test(diagram);
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
