import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, process.env.GRAPHIFY_SOURCE_DIR ?? "graphify-out");
const target = path.join(root, process.env.GRAPHIFY_TARGET_DIR ?? "docs/assets/graphify");
const reportTarget = path.join(root, process.env.GRAPHIFY_REPORT_PATH ?? "GRAPH_REPORT.md");
const graphHtmlTarget = path.join(target, "graph.html");
const graphJsonTarget = path.join(target, "graph.json");
const graph3dTarget = path.join(target, "graph-3d.html");
const summaryTarget = path.join(target, "summary.json");
const publicationSchemaVersion = "1.0";

const title = process.env.GRAPHIFY_3D_TITLE ?? "DenchCo Knowledge Base Wiki Standard — 3D Map";
const primary = process.env.GRAPHIFY_PRIMARY ?? "#0b7285";
const primaryDark = process.env.GRAPHIFY_PRIMARY_DARK ?? "#075866";
const text = process.env.GRAPHIFY_TEXT ?? "#1f2933";
const muted = process.env.GRAPHIFY_MUTED ?? "#d9f0f3";
const pageBackground = process.env.GRAPHIFY_PAGE_BACKGROUND ?? "#f6f8f9";
const sceneBackground = process.env.GRAPHIFY_SCENE_BACKGROUND ?? "#101820";
const panelBorder = process.env.GRAPHIFY_PANEL_BORDER ?? "rgba(11, 114, 133, 0.24)";
const panelDivider = process.env.GRAPHIFY_PANEL_DIVIDER ?? "rgba(11, 114, 133, 0.16)";
const linkColor = process.env.GRAPHIFY_LINK_COLOR ?? "rgba(217, 240, 243, 0.50)";
const sourceIdPattern = process.env.GRAPHIFY_SOURCE_ID_PATTERN ?? "[A-Z][A-Z0-9]+-\\d{3}";
const sourceIdRegex = new RegExp(`\\b${sourceIdPattern}\\b`, "g");
const exactSourceIdRegex = new RegExp(`^${sourceIdPattern}$`);
const palette = (process.env.GRAPHIFY_PALETTE ?? `${primary},#9b5d00,#007c78,#15803d,#5c6f7f,#b45309,#c0382b,#174a5b`)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

fs.mkdirSync(target, { recursive: true });

if (!fs.existsSync(source)) {
  writePlaceholderAssets("Graphify output has not been generated.");
  console.log("Graphify output missing; wrote placeholder assets.");
  process.exit(0);
}

copyIfExists(path.join(source, "graph.html"), graphHtmlTarget, placeholderGraphHtml());
copyIfExists(path.join(source, "graph.json"), graphJsonTarget, JSON.stringify(emptyGraph("Graphify graph JSON has not been generated."), null, 2));
copyIfExists(path.join(source, "GRAPH_REPORT.md"), reportTarget, "# Graphify Report\n\nGraphify output has not been generated.\n");

const publication = enhanceGraph(readGraph(graphJsonTarget));
fs.writeFileSync(graphJsonTarget, `${JSON.stringify(publication.graph, null, 2)}\n`);
syncGraphHtml(graphHtmlTarget, publication.htmlNodes, publication.htmlEdges);
const summary = buildSummary(publication.graph, publication.interconnections);
fs.writeFileSync(summaryTarget, `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(graph3dTarget, graph3dHtml(summary));

console.log(`Published Graphify 2D/3D assets with ${summary.nodes} nodes, ${summary.edges} edges, and interconnection layers.`);

function copyIfExists(from, to, fallback) {
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
  } else {
    fs.writeFileSync(to, fallback);
  }
}

function writePlaceholderAssets(message) {
  const graph = emptyGraph(message);
  fs.writeFileSync(graphHtmlTarget, placeholderGraphHtml(message));
  fs.writeFileSync(graphJsonTarget, `${JSON.stringify(graph, null, 2)}\n`);
  fs.writeFileSync(summaryTarget, `${JSON.stringify(buildSummary(graph), null, 2)}\n`);
  fs.writeFileSync(graph3dTarget, graph3dHtml(buildSummary(graph)));
  fs.writeFileSync(reportTarget, `# Graphify Report\n\n${message}\n`);
}

function emptyGraph(status) {
  return {
    publicationSchemaVersion,
    directed: false,
    multigraph: false,
    graph: {},
    nodes: [],
    links: [],
    status,
  };
}

function placeholderGraphHtml(message = "Graphify output has not been generated.") {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>Graphify unavailable</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font: 16px system-ui, sans-serif; color: ${text}; background: ${pageBackground}; }
    main { max-width: 46rem; padding: 2rem; }
  </style>
</head>
<body><main><h1>Graphify unavailable</h1><p>${escapeHtml(message)}</p></main></body>
</html>
`;
}

function readGraph(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function graphLinks(graph) {
  if (Array.isArray(graph.links)) return graph.links;
  if (Array.isArray(graph.edges)) return graph.edges;
  return [];
}

function enhanceGraph(graph) {
  const graphHtml = fs.existsSync(graphHtmlTarget) ? fs.readFileSync(graphHtmlTarget, "utf8") : "";
  const htmlNodes = readGraphHtmlConst(graphHtml, "RAW_NODES");
  const htmlEdges = readGraphHtmlConst(graphHtml, "RAW_EDGES");
  const baseNodes = (htmlNodes.length ? htmlNodes : graph.nodes ?? []).map(normalizeHtmlNode);
  const baseEdges = (htmlEdges.length ? htmlEdges : graphLinks(graph).map(htmlEdgeFromGraphLink)).map(normalizeHtmlEdge);

  if (!baseNodes.length) {
    return {
      graph,
      htmlNodes: [],
      htmlEdges: [],
      interconnections: emptyInterconnectionSummary(),
    };
  }

  const communityLabels = buildCommunityLabels(baseNodes, baseEdges);
  const communityRemap = stableCommunityRemap(baseNodes, communityLabels);
  const stableNodes = baseNodes.map((node) => withStableCommunity(node, communityRemap, communityLabels));
  const documentLayer = markdownDocumentLayer(stableNodes, maxCommunityId(stableNodes) + 1);
  const documentNodes = [...stableNodes, ...documentLayer.nodes];
  const linkEdges = markdownLinkEdges(documentNodes, baseEdges);
  const sourceLayer = sourceReferenceLayer(documentNodes, [...baseEdges, ...linkEdges], maxCommunityId(documentNodes) + 1);
  const navLayer = navHierarchyLayer(
    [...documentNodes, ...sourceLayer.nodes],
    [...baseEdges, ...linkEdges, ...sourceLayer.edges],
    maxCommunityId(documentNodes) + 2,
  );
  const fileSystemLayer = fileHierarchyLayer(
    [...documentNodes, ...sourceLayer.nodes, ...navLayer.nodes],
    [...baseEdges, ...linkEdges, ...sourceLayer.edges, ...navLayer.edges],
    maxCommunityId(documentNodes) + 3,
  );
  const fileReferenceEdgesList = fileReferenceEdges(
    documentNodes,
    [...baseEdges, ...linkEdges, ...sourceLayer.edges, ...navLayer.edges, ...fileSystemLayer.edges],
  );

  const enhancedEdges = [
    ...baseEdges,
    ...linkEdges,
    ...sourceLayer.edges,
    ...navLayer.edges,
    ...fileSystemLayer.edges,
    ...fileReferenceEdgesList,
  ];
  const enhancedNodes = withUpdatedDegrees([
    ...documentNodes,
    ...sourceLayer.nodes,
    ...navLayer.nodes,
    ...fileSystemLayer.nodes,
  ], enhancedEdges);

  return {
    graph: {
      ...graph,
      publicationSchemaVersion,
      nodes: enhancedNodes,
      links: enhancedEdges.map(graphLinkFromHtmlEdge),
    },
    htmlNodes: enhancedNodes,
    htmlEdges: enhancedEdges,
    interconnections: {
      graphifyEdgeCount: baseEdges.length,
      markdownDocumentNodeCount: documentLayer.nodes.length,
      markdownLinkEdgeCount: linkEdges.length,
      sourceReferenceNodeCount: sourceLayer.nodes.length,
      sourceReferenceEdgeCount: sourceLayer.edges.length,
      navNodeCount: navLayer.nodes.length,
      navEdgeCount: navLayer.edges.length,
      fileHierarchyNodeCount: fileSystemLayer.nodes.length,
      fileHierarchyEdgeCount: fileSystemLayer.edges.length,
      fileReferenceEdgeCount: fileReferenceEdgesList.length,
    },
  };
}

function emptyInterconnectionSummary() {
  return {
    graphifyEdgeCount: 0,
    markdownDocumentNodeCount: 0,
    markdownLinkEdgeCount: 0,
    sourceReferenceNodeCount: 0,
    sourceReferenceEdgeCount: 0,
    navNodeCount: 0,
    navEdgeCount: 0,
    fileHierarchyNodeCount: 0,
    fileHierarchyEdgeCount: 0,
    fileReferenceEdgeCount: 0,
  };
}

function normalizeHtmlNode(node) {
  const id = node.id ?? node.label ?? node.title;
  return {
    ...node,
    id,
    label: node.label ?? id,
    source_file: node.source_file ?? node.sourceFile,
  };
}

function normalizeHtmlEdge(edge) {
  const from = edgeEndpoint(edge, "from") ?? edgeEndpoint(edge, "source");
  const to = edgeEndpoint(edge, "to") ?? edgeEndpoint(edge, "target");
  return {
    ...edge,
    from,
    to,
    label: edge.label ?? edge.relation ?? "contains",
    confidence: edge.confidence ?? "EXTRACTED",
  };
}

function htmlEdgeFromGraphLink(link) {
  return normalizeHtmlEdge({
    from: edgeEndpoint(link, "from") ?? edgeEndpoint(link, "source"),
    to: edgeEndpoint(link, "to") ?? edgeEndpoint(link, "target"),
    label: link.label ?? link.relation ?? "contains",
    title: link.title ?? link.source_file ?? "",
    dashes: false,
    width: link.weight ?? link.width ?? 1,
    confidence: link.confidence ?? "EXTRACTED",
  });
}

function graphLinkFromHtmlEdge(edge) {
  return {
    relation: edge.label ?? "contains",
    confidence: edge.confidence ?? "EXTRACTED",
    source_file: edge.title ?? "",
    weight: edge.width ?? 1,
    confidence_score: edge.confidence_score ?? 1,
    source: edgeEndpoint(edge, "from") ?? edgeEndpoint(edge, "source"),
    target: edgeEndpoint(edge, "to") ?? edgeEndpoint(edge, "target"),
  };
}

function titleFromFilename(filePath) {
  const base = path.basename(filePath ?? "", path.extname(filePath ?? ""));
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function prefixForSource(sourceFile) {
  if (sourceFile === "DESIGN.md") return "Design System";
  if (sourceFile === "AGENTS.md") return "Agent Instructions";
  if (sourceFile === "README.md") return "Project Readme";
  if (sourceFile === "package.json") return "Package Scripts";
  if (sourceFile === "mkdocs.yml") return "MkDocs Config";
  if (sourceFile === "zensical.toml" || sourceFile === "zensical.sunset.toml") return "Zensical Config";
  if (sourceFile?.startsWith("scripts/")) return "Scripts";
  if (sourceFile?.startsWith("src/generated/")) return "Generated KB Index";
  if (sourceFile?.startsWith("docs/llm-wiki/")) return "LLM Wiki";
  if (sourceFile?.startsWith("docs/project-ops/")) return "Project Ops";
  if (sourceFile?.startsWith("docs/knowledge-base/modules/")) return "Module Pages";
  if (sourceFile?.startsWith("docs/knowledge-base/")) return "Knowledge Base";
  if (sourceFile?.startsWith("docs/revision/")) return "Revision Tools";
  if (sourceFile?.startsWith("docs/assets/")) return "Assets";
  if (sourceFile?.startsWith("docs/")) return "Wiki";
  return "Project";
}

function isFilenameLabel(label) {
  return /\.(css|html|js|json|md|mjs|py|ts|tsx|txt|ya?ml)$/i.test(label ?? "");
}

function communityKey(node) {
  return String(node.community ?? node.community_name ?? "unassigned");
}

function stableCommunityKey(node) {
  return node.source_file || `community:${communityKey(node)}`;
}

function edgeEndpoint(edge, key) {
  const endpoint = edge[key];
  return typeof endpoint === "object" && endpoint !== null ? endpoint.id : endpoint;
}

function buildDegreeMap(edges) {
  const degrees = new Map();
  for (const edge of edges) {
    const from = edgeEndpoint(edge, "from") ?? edgeEndpoint(edge, "source");
    const to = edgeEndpoint(edge, "to") ?? edgeEndpoint(edge, "target");
    if (from) degrees.set(from, (degrees.get(from) ?? 0) + 1);
    if (to) degrees.set(to, (degrees.get(to) ?? 0) + 1);
  }
  return degrees;
}

function isMarkdownSource(sourceFile) {
  return /\.(md|markdown)$/i.test(sourceFile ?? "");
}

function representativeLabel(sourceFile, communityNodes, degrees) {
  const sourceNodes = communityNodes.filter((node) => node.source_file === sourceFile);
  const degreeFor = (node) => degrees.get(node.id) ?? node.degree ?? 0;
  if (sourceFile === "package.json") {
    return sourceNodes
      .filter((node) => !isFilenameLabel(node.label))
      .sort((a, b) => degreeFor(b) - degreeFor(a))[0]?.label ?? titleFromFilename(sourceFile);
  }
  if (sourceFile && !isMarkdownSource(sourceFile)) return titleFromFilename(sourceFile);

  return sourceNodes
    .filter((node) => !isFilenameLabel(node.label))
    .sort((a, b) => degreeFor(b) - degreeFor(a))[0]?.label
    ?? sourceNodes[0]?.label
    ?? titleFromFilename(sourceFile ?? "");
}

function buildCommunityLabels(nodes, edges) {
  const byCommunity = new Map();
  for (const node of nodes) {
    const key = stableCommunityKey(node);
    if (!byCommunity.has(key)) byCommunity.set(key, []);
    byCommunity.get(key).push(node);
  }

  const degrees = buildDegreeMap(edges);
  const labels = new Map();
  for (const [community, communityNodes] of byCommunity.entries()) {
    const sourceCounts = new Map();
    for (const node of communityNodes) {
      if (!node.source_file) continue;
      sourceCounts.set(node.source_file, (sourceCounts.get(node.source_file) ?? 0) + 1);
    }

    const [sourceFile] = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [];
    const rawName = representativeLabel(sourceFile, communityNodes, degrees) || titleFromFilename(sourceFile ?? `Community ${community}`);
    const name = `${prefixForSource(sourceFile)}: ${rawName}`;
    labels.set(community, name.length > 58 ? `${name.slice(0, 55)}...` : name);
  }

  return labels;
}

function stableCommunityRemap(nodes, labels) {
  const byCommunity = new Map();
  for (const node of nodes) {
    const key = stableCommunityKey(node);
    if (!byCommunity.has(key)) byCommunity.set(key, []);
    byCommunity.get(key).push(node);
  }

  return new Map([...byCommunity.entries()]
    .map(([key, communityNodes]) => ({
      key,
      label: labels.get(key) ?? `Community ${key}`,
      signature: communityNodes.map((node) => node.id).sort().join("|"),
    }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.signature.localeCompare(b.signature))
    .map((record, index) => [record.key, index]));
}

function colorForCommunity(community) {
  return palette[Number(community) % palette.length] ?? palette[0];
}

function withStableCommunity(node, remap, labels) {
  const originalCommunity = stableCommunityKey(node);
  const numericCommunity = Number(node.community);
  const fallbackCommunity = Number.isFinite(numericCommunity) ? numericCommunity : 0;
  const stableCommunity = remap.get(originalCommunity) ?? fallbackCommunity;
  const color = colorForCommunity(stableCommunity);
  return {
    ...node,
    community: stableCommunity,
    community_name: labels.get(originalCommunity) ?? `Community ${originalCommunity}`,
    color: {
      ...(node.color ?? {}),
      background: color,
      border: color,
      highlight: {
        ...(node.color?.highlight ?? {}),
        background: node.color?.highlight?.background ?? "#ffffff",
        border: color,
      },
    },
  };
}

function markdownFiles(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) return files;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (fullPath.includes(`${path.sep}assets${path.sep}graphify`)) continue;
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

function markdownDocumentLayer(nodes, communityId) {
  const nodeBySource = documentNodeBySource(nodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const documentNodes = [];
  const documentColor = primaryDark;
  const communityName = "Canonical Markdown: Documents";
  const candidates = [
    ...markdownFiles(path.join(root, "docs")),
    ...["README.md", "AGENTS.md", "DESIGN.md", "DEPLOYMENT.md"]
      .map((file) => path.join(root, file))
      .filter((file) => fs.existsSync(file)),
  ];

  for (const filePath of candidates) {
    const sourceFile = path.relative(root, filePath).replaceAll(path.sep, "/");
    if (nodeBySource.has(sourceFile)) continue;
    const markdown = fs.readFileSync(filePath, "utf8");
    const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? titleFromFilename(sourceFile);
    let nodeId = `doc_${slug(sourceFile)}`;
    let suffix = 2;
    while (nodeIds.has(nodeId)) nodeId = `doc_${slug(sourceFile)}_${suffix++}`;
    nodeIds.add(nodeId);
    documentNodes.push(syntheticNode(nodeId, title, `Markdown document: ${sourceFile}`, communityId, communityName, sourceFile, documentColor, 13));
  }

  return { nodes: documentNodes };
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

function markdownLinkEdges(nodes, existingEdges) {
  const nodeBySource = documentNodeBySource(nodes);
  const existing = existingEdgeSet(existingEdges);
  const edges = [];

  for (const filePath of markdownFiles(path.join(root, "docs"))) {
    const sourceFile = path.relative(root, filePath).replaceAll(path.sep, "/");
    const sourceNode = nodeBySource.get(sourceFile);
    if (!sourceNode) continue;

    const markdown = fs.readFileSync(filePath, "utf8");
    for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const targetFile = normalizeMarkdownTarget(sourceFile, match[1]);
      const targetNode = targetFile ? nodeBySource.get(targetFile) : null;
      if (!targetNode || targetNode === sourceNode) continue;

      const edge = {
        from: sourceNode,
        to: targetNode,
        label: "links to",
        title: `Markdown link: ${sourceFile} -> ${targetFile}`,
        dashes: true,
        width: 1,
        color: { color: primary, opacity: 0.62 },
        confidence: "EXTRACTED",
      };
      const key = edgeKey(edge);
      if (!existing.has(key)) {
        existing.add(key);
        edges.push(edge);
      }
    }
  }

  return edges;
}

function documentNodeBySource(nodes) {
  const nodeBySource = new Map();
  for (const node of nodes) {
    if (!node.source_file || nodeBySource.has(node.source_file)) continue;
    if (isFilenameLabel(node.label) || node.source_file.endsWith(".md")) {
      nodeBySource.set(node.source_file, node.id);
    }
  }
  return nodeBySource;
}

function maxCommunityId(nodes) {
  return nodes.reduce((max, node) => Math.max(max, Number(node.community) || 0), 0);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function edgeKey(edge) {
  const from = edgeEndpoint(edge, "from") ?? edgeEndpoint(edge, "source");
  const to = edgeEndpoint(edge, "to") ?? edgeEndpoint(edge, "target");
  return `${from}|${to}|${edge.label ?? edge.relation ?? "contains"}`;
}

function existingEdgeSet(edges) {
  return new Set(edges.map(edgeKey));
}

function normalizeFileReference(sourceFile, rawRef, nodeBySource) {
  if (!rawRef || /^(https?:|mailto:|tel:|data:)/i.test(rawRef) || rawRef.startsWith("#")) return null;
  const cleanRef = rawRef
    .split("#")[0]
    .split("?")[0]
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
  if (!cleanRef || cleanRef.endsWith("/")) return null;

  const candidates = [];
  const addCandidate = (candidate) => {
    const normalized = candidate.replaceAll(path.sep, "/").replace(/^\.\//, "");
    if (!normalized.startsWith("..")) candidates.push(normalized);
  };

  if (/^(AGENTS|DESIGN|README|DEPLOYMENT)\.md$/.test(cleanRef) || /^(docs|hooks|scripts|src)\//.test(cleanRef) || cleanRef === "mkdocs.yml" || cleanRef === "package.json") {
    addCandidate(cleanRef);
  }
  if (cleanRef.startsWith("assets/")) addCandidate(`docs/${cleanRef}`);
  if (cleanRef.startsWith("/") && !cleanRef.startsWith("//")) {
    addCandidate(cleanRef.slice(1));
    if (cleanRef.startsWith("/assets/")) addCandidate(`docs${cleanRef}`);
  }

  const sourceDir = path.dirname(path.join(root, sourceFile));
  addCandidate(path.relative(root, path.resolve(sourceDir, cleanRef)));

  if (sourceFile === "mkdocs.yml" && cleanRef.startsWith("assets/")) addCandidate(`docs/${cleanRef}`);

  for (const candidate of [...new Set(candidates)]) {
    if (nodeBySource.has(candidate)) return candidate;
  }
  return null;
}

function explicitFileReferences(content) {
  const refs = new Set();
  const pathPattern = /(?:^|[\s"'(:`])((?:docs|hooks|scripts|src|assets)\/[A-Za-z0-9_./-]+\.(?:css|html|js|json|md|mjs|py|ts|tsx|ya?ml)|(?:AGENTS|DESIGN|README|DEPLOYMENT)\.md|mkdocs\.yml|package\.json)(?=$|[\s"',)`<])/g;
  for (const match of content.matchAll(pathPattern)) refs.add(match[1]);
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) refs.add(match[1]);
  for (const match of content.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) refs.add(match[1]);
  return refs;
}

function fileReferenceEdges(nodes, existingEdges) {
  const nodeBySource = documentNodeBySource(nodes);
  const existing = existingEdgeSet(existingEdges);
  const edges = [];
  const scannableExtensions = new Set([".json", ".md", ".markdown", ".yml", ".yaml"]);

  for (const [sourceFile, sourceNode] of nodeBySource.entries()) {
    if (!scannableExtensions.has(path.extname(sourceFile).toLowerCase())) continue;
    const absolutePath = path.join(root, sourceFile);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).size > 250_000) continue;

    const content = fs.readFileSync(absolutePath, "utf8");
    for (const rawRef of explicitFileReferences(content)) {
      const targetFile = normalizeFileReference(sourceFile, rawRef, nodeBySource);
      if (!targetFile || targetFile === sourceFile) continue;
      const targetNode = nodeBySource.get(targetFile);
      if (!targetNode) continue;

      const edge = {
        from: sourceNode,
        to: targetNode,
        label: "references file",
        title: `File reference: ${sourceFile} -> ${targetFile}`,
        dashes: [3, 5],
        width: 0.9,
        color: { color: palette[7] ?? primary, opacity: 0.58 },
        confidence: "EXTRACTED",
      };
      const key = edgeKey(edge);
      if (!existing.has(key)) {
        existing.add(key);
        edges.push(edge);
      }
    }
  }

  return edges;
}

function fileHierarchyLayer(nodes, existingEdges, communityId) {
  const nodeBySource = documentNodeBySource(nodes);
  const existing = existingEdgeSet(existingEdges);
  const fileSystemNodes = [];
  const edges = [];
  const fileSystemCommunityName = "Repository Filesystem: Paths";
  const fileSystemColor = "#64748b";
  const rootEntry = { id: "fs_repository", label: "Repository", title: "Repository root" };

  fileSystemNodes.push(syntheticNode(rootEntry.id, rootEntry.label, rootEntry.title, communityId, fileSystemCommunityName, ".", fileSystemColor, 16));

  const directoryNodeByPath = new Map();
  const ensureDirectoryNode = (directoryPath) => {
    if (directoryNodeByPath.has(directoryPath)) return directoryNodeByPath.get(directoryPath);
    const nodeId = `fs_${slug(directoryPath)}`;
    directoryNodeByPath.set(directoryPath, nodeId);
    fileSystemNodes.push(syntheticNode(nodeId, path.basename(directoryPath), `Directory: ${directoryPath}`, communityId, fileSystemCommunityName, directoryPath, fileSystemColor, 13));
    return nodeId;
  };

  const addEdge = (from, to, title) => {
    if (!from || !to || from === to) return;
    const edge = {
      from,
      to,
      label: "filesystem contains",
      title,
      dashes: [2, 6],
      width: 0.7,
      color: { color: fileSystemColor, opacity: 0.42 },
      confidence: "EXTRACTED",
    };
    const key = edgeKey(edge);
    if (!existing.has(key)) {
      existing.add(key);
      edges.push(edge);
    }
  };

  for (const [sourceFile, fileNode] of [...nodeBySource.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const parts = sourceFile.split("/");
    let parentNode = rootEntry.id;
    let currentPath = "";
    for (const directory of parts.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${directory}` : directory;
      const directoryNode = ensureDirectoryNode(currentPath);
      addEdge(parentNode, directoryNode, `Filesystem: ${parentNode} contains ${currentPath}`);
      parentNode = directoryNode;
    }
    addEdge(parentNode, fileNode, `Filesystem: ${path.dirname(sourceFile) || "."} contains ${sourceFile}`);
  }

  return { nodes: fileSystemNodes, edges };
}

function sourceCatalog() {
  const sourceFile = path.join(root, "docs/sources.md");
  if (!fs.existsSync(sourceFile)) return new Map();

  const sources = new Map();
  const markdown = fs.readFileSync(sourceFile, "utf8");
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    const sourceCellIndex = cells.findIndex((cell) => new RegExp(sourceIdPattern).test(cell));
    const id = sourceCellIndex >= 0
      ? cells[sourceCellIndex].match(new RegExp(sourceIdPattern))?.[0]
      : undefined;
    if (!id || sources.has(id)) continue;
    const title = cells[sourceCellIndex + 1] ?? id;
    sources.set(id, { id, title });
  }
  return sources;
}

function sourceReferenceLayer(nodes, existingEdges, communityId) {
  const nodeBySource = documentNodeBySource(nodes);
  const sources = sourceCatalog();
  const sourceNodes = [];
  const edges = [];
  const existing = existingEdgeSet(existingEdges);
  const sourceCommunityName = "Source Evidence: Source IDs";
  const sourceColor = palette[2] ?? primary;
  const sourceNodeById = new Map();
  const sourceRegisterNode = nodeBySource.get("docs/sources.md");

  for (const source of sources.values()) {
    const nodeId = `source_${source.id.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    sourceNodes.push(syntheticNode(nodeId, source.id, `${source.id}: ${source.title}`, communityId, sourceCommunityName, "docs/sources.md", sourceColor, 13));
    sourceNodeById.set(source.id, nodeId);

    if (sourceRegisterNode) {
      const edge = {
        from: sourceRegisterNode,
        to: nodeId,
        label: "defines source",
        title: `Source register defines ${source.id}: ${source.title}`,
        dashes: [2, 4],
        width: 0.8,
        color: { color: sourceColor, opacity: 0.54 },
        confidence: "EXTRACTED",
      };
      const key = edgeKey(edge);
      if (!existing.has(key)) {
        existing.add(key);
        edges.push(edge);
      }
    }
  }

  for (const filePath of markdownFiles(path.join(root, "docs"))) {
    const sourceFile = path.relative(root, filePath).replaceAll(path.sep, "/");
    if (sourceFile === "docs/sources.md") continue;
    const sourceNode = nodeBySource.get(sourceFile);
    if (!sourceNode) continue;

    const citedSourceIds = [...new Set(fs.readFileSync(filePath, "utf8").match(sourceIdRegex) ?? [])];
    for (const sourceId of citedSourceIds) {
      const targetNode = sourceNodeById.get(sourceId);
      if (!targetNode) continue;
      const edge = {
        from: sourceNode,
        to: targetNode,
        label: "cites source",
        title: `Source citation: ${sourceFile} -> ${sourceId}`,
        dashes: true,
        width: 0.9,
        color: { color: sourceColor, opacity: 0.5 },
        confidence: "EXTRACTED",
      };
      const key = edgeKey(edge);
      if (!existing.has(key)) {
        existing.add(key);
        edges.push(edge);
      }
    }
  }

  return { nodes: sourceNodes, edges };
}

function navHierarchyLayer(nodes, existingEdges, communityId) {
  const config = navigationConfig();
  if (!config) return { nodes: [], edges: [] };

  const nodeBySource = documentNodeBySource(nodes);
  const existing = existingEdgeSet(existingEdges);
  const navNodes = [];
  const edges = [];
  const navCommunityName = `${config.rendererLabel} Navigation: Wiki Structure`;
  const navColor = primary;
  const rootEntry = {
    indent: -1,
    label: `${config.rendererLabel} Navigation`,
    nodeId: `nav_${slug(config.rendererLabel)}_navigation`,
  };
  navNodes.push(syntheticNode(rootEntry.nodeId, rootEntry.label, `${config.rendererLabel} site navigation root`, communityId, navCommunityName, config.sourceFile, navColor, 16));
  const stack = [];

  for (const entry of config.entries) {
    const { indent, label, value } = entry;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1] ?? rootEntry;

    let nodeId;
    if (value.endsWith(".md")) {
      nodeId = nodeBySource.get(`docs/${value}`.replaceAll(path.sep, "/"));
      if (!nodeId) continue;
    } else {
      const lineage = [...stack.map((entry) => entry.label), label].join(" / ");
      nodeId = `nav_${slug(lineage)}`;
      navNodes.push(syntheticNode(nodeId, label, `${config.rendererLabel} nav section: ${lineage}`, communityId, navCommunityName, config.sourceFile, navColor, 14));
    }

    if (parent && parent.nodeId !== nodeId) {
      const edge = {
        from: parent.nodeId,
        to: nodeId,
        label: "nav contains",
        title: `${config.rendererLabel} nav: ${parent.label} -> ${label}`,
        dashes: [6, 4],
        width: 0.8,
        color: { color: navColor, opacity: 0.52 },
        confidence: "EXTRACTED",
      };
      const key = edgeKey(edge);
      if (!existing.has(key)) {
        existing.add(key);
        edges.push(edge);
      }
    }

    if (!value.endsWith(".md")) stack.push({ indent, label, nodeId });
  }

  return { nodes: navNodes, edges };
}

function navigationConfig() {
  const candidates = [
    {
      sourceFile: process.env.GRAPHIFY_NAV_CONFIG ?? "mkdocs.yml",
      rendererLabel: process.env.GRAPHIFY_NAV_LABEL ?? "MkDocs",
      parser: parseMkdocsNav,
    },
    {
      sourceFile: "zensical.toml",
      rendererLabel: "Zensical",
      parser: parseZensicalNav,
    },
  ];

  for (const candidate of candidates) {
    const filePath = path.join(root, candidate.sourceFile);
    if (!fs.existsSync(filePath)) continue;
    const entries = candidate.parser(fs.readFileSync(filePath, "utf8"));
    if (entries.length) return { ...candidate, entries };
  }

  return null;
}

function parseMkdocsNav(text) {
  const entries = [];
  let inNav = false;

  for (const rawLine of text.split(/\r?\n/)) {
    if (!inNav) {
      if (rawLine.trim() === "nav:") inNav = true;
      continue;
    }
    if (/^\S/.test(rawLine) && rawLine.trim() !== "nav:") break;
    if (!rawLine.trim().startsWith("- ")) continue;

    const indent = rawLine.match(/^\s*/)[0].length;
    const item = rawLine.trim().slice(2);
    const match = item.match(/^([^:]+):(?:\s*(.*))?$/);
    if (!match) continue;

    entries.push({
      indent,
      label: match[1].replace(/^["']|["']$/g, "").trim(),
      value: (match[2] ?? "").replace(/^["']|["']$/g, "").trim(),
    });
  }

  return entries;
}

function parseZensicalNav(text) {
  const entries = [];
  let inNav = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!inNav) {
      if (trimmed === "nav = [") inNav = true;
      continue;
    }
    if (trimmed === "]") break;

    const indent = rawLine.match(/^\s*/)[0].length;
    const page = trimmed.match(/^\{"([^"]+)"\s*=\s*"([^"]+)"\},?$/);
    if (page) {
      entries.push({ indent, label: page[1].trim(), value: page[2].trim() });
      continue;
    }

    const section = trimmed.match(/^\{"([^"]+)"\s*=\s*\[$/);
    if (section) entries.push({ indent, label: section[1].trim(), value: "" });
  }

  return entries;
}

function syntheticNode(id, label, title, community, communityName, sourceFile, color, size) {
  return {
    id,
    label,
    color: {
      background: color,
      border: color,
      highlight: { background: "#ffffff", border: color },
    },
    size,
    font: { size: 11, color: "#ffffff" },
    title,
    community,
    community_name: communityName,
    source_file: sourceFile,
    file_type: "document",
    degree: 1,
    _origin: "graphify-publisher",
  };
}

function withUpdatedDegrees(nodes, edges) {
  const degrees = buildDegreeMap(edges);
  return nodes.map((node) => ({
    ...node,
    degree: degrees.get(node.id) ?? node.degree ?? 0,
  }));
}

function readGraphHtmlConst(html, name) {
  const match = html.match(new RegExp(`const ${name} = (.*?);\\n`, "s"));
  return match ? JSON.parse(match[1]) : [];
}

function legendFromNodes(nodes) {
  return [...new Map(nodes.map((node) => [
    communityKey(node),
    {
      cid: node.community,
      color: node.color?.background ?? primary,
      label: node.community_name ?? `Community ${communityKey(node)}`,
      count: nodes.filter((candidate) => communityKey(candidate) === communityKey(node)).length,
    },
  ])).values()].sort((a, b) => Number(a.cid) - Number(b.cid));
}

function syncGraphHtml(filePath, nodes, edges) {
  if (!fs.existsSync(filePath) || !nodes.length) return;
  const html = fs.readFileSync(filePath, "utf8");
  if (!html.includes("const RAW_NODES") || !html.includes("const RAW_EDGES")) return;
  const legend = legendFromNodes(nodes);
  const updated = html
    .replace(
      /https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net\/npm)\/vis-network@[^/]+\/standalone\/umd\/vis-network\.min\.js/g,
      "../vendor/vis-network.min.js",
    )
    .replace(
      /<script\s+src="\.\.\/vendor\/vis-network\.min\.js"[^>]*><\/script>/i,
      '<script src="../vendor/vis-network.min.js"></script>',
    )
    .replace(/const RAW_NODES = .*?;\nconst RAW_EDGES = /s, `const RAW_NODES = ${JSON.stringify(nodes)};\nconst RAW_EDGES = `)
    .replace(/const RAW_EDGES = .*?;\nconst LEGEND = /s, `const RAW_EDGES = ${JSON.stringify(edges)};\nconst LEGEND = `)
    .replace(/const LEGEND = .*?;\n\n\/\//s, `const LEGEND = ${JSON.stringify(legend)};\n\n//`)
    .replace(
      /\d+ nodes &middot; \d+ edges &middot; \d+ communities/,
      `${nodes.length} nodes &middot; ${edges.length} edges &middot; ${new Set(nodes.map((node) => communityKey(node))).size} communities`,
    )
    .replace(
      /#search:focus\s*\{\s*border-color:\s*#4E79A7;\s*\}/i,
      `#search:focus { border-color: ${primary}; outline: 3px solid ${primary}; outline-offset: 2px; }`,
    )
    .replace(/#4E79A7/gi, primary)
    .replace(/#6366f1/gi, primary)
    .replace(/#4f46e5/gi, primaryDark)
    .replace(/#0f0f1a/gi, sceneBackground)
    .replace(/#1a1a2e/gi, "#17222b")
    .replace(/#2a2a4e/gi, "#31414d")
    .replace(/#3a3a5e/gi, "#4c6272")
    .replace(
      "</style>",
      `  .legend-cb:focus-visible, #select-all-cb:focus-visible { outline: 3px solid ${primary}; outline-offset: 2px; }
  #graph { min-width: 0; }
  @media (max-width: 720px) {
    body { display: block; position: relative; }
    #graph { position: absolute; inset: 0; width: 100vw; height: 100vh; }
    #sidebar {
      position: absolute;
      z-index: 3;
      top: 10px;
      left: 10px;
      width: calc(100vw - 20px);
      max-height: 44vh;
      height: auto;
      border: 1px solid #31414d;
      border-radius: 8px;
      overflow: auto;
    }
    #info-panel { min-height: 0; padding: 10px 12px; }
    #legend-wrap, #stats { display: none; }
  }
</style>`,
    );
  fs.writeFileSync(filePath, updated);
}

function buildSummary(graph, interconnections = emptyInterconnectionSummary()) {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const links = graphLinks(graph);
  const communityValues = nodes
    .map((node) => node.community_name ?? node.community)
    .filter((value) => value !== undefined && value !== null && value !== "");
  const sourceFiles = nodes
    .map((node) => node.source_file)
    .filter((value) => value !== undefined && value !== null && value !== "");

  return {
    publicationSchemaVersion,
    status: graph.status ?? "ok",
    nodes: nodes.length,
    edges: links.length,
    communities: new Set(communityValues).size,
    sourceFiles: new Set(sourceFiles).size,
    builtAtCommit: graph.built_at_commit ?? null,
    relations: relationCounts(links),
    interconnections,
  };
}

function relationCounts(links) {
  const counts = {};
  for (const link of links) {
    const relation = link.relation ?? link.label ?? "contains";
    counts[relation] = (counts[relation] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function graph3dHtml(summary) {
  const summaryJson = JSON.stringify(summary);
  const paletteJson = JSON.stringify(palette);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="data:,">
<title>${escapeHtml(title)}</title>
<script src="../vendor/3d-force-graph.min.js"></script>
<style>
  :root {
    --primary: ${primary};
    --secondary: #5e6b6d;
    --accent: ${primaryDark};
    --surface: #ffffff;
    --text: ${text};
    --muted: ${muted};
    --panel: rgba(255, 255, 255, 0.94);
    --panel-border: ${panelBorder};
    --component-border-width: 1px;
    --panel-radius: 8px;
    --control-radius: 6px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    overflow: hidden;
    background: ${sceneBackground};
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  #graph3d { width: 100vw; height: 100vh; }
  #panel {
    position: fixed;
    top: 14px;
    left: 14px;
    width: min(360px, calc(100vw - 28px));
    max-height: calc(100vh - 28px);
    overflow: auto;
    padding: 14px;
    background: var(--panel);
    border: var(--component-border-width) solid var(--panel-border);
    border-radius: var(--panel-radius);
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.28);
  }
  h1 { margin: 0 0 4px; font-size: 15px; font-weight: 700; letter-spacing: 0; }
  .meta { color: #5e6b6d; font-size: 12px; line-height: 1.45; margin-bottom: 12px; }
  label { display: block; color: #5e6b6d; font-size: 12px; margin: 10px 0 4px; }
  input[type="search"] {
    width: 100%;
    padding: 8px 10px;
    border: var(--component-border-width) solid var(--panel-border);
    border-radius: var(--control-radius);
    background: ${pageBackground};
    color: var(--text);
    outline: none;
  }
  input[type="search"]:focus {
    border-color: var(--primary);
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  #info {
    margin-top: 12px;
    padding-top: 12px;
    border-top: var(--component-border-width) solid ${panelDivider};
    font-size: 12px;
    line-height: 1.5;
  }
  #info .empty { color: #5e6b6d; font-style: italic; }
  .pill {
    display: inline-block;
    margin: 2px 4px 2px 0;
    padding: 2px 7px;
    border-radius: 999px;
    background: ${panelDivider};
    color: var(--accent);
    font-size: 11px;
  }
  #status {
    position: fixed;
    right: 14px;
    bottom: 14px;
    padding: 8px 10px;
    border-radius: 999px;
    background: var(--panel);
    border: var(--component-border-width) solid var(--panel-border);
    color: #5e6b6d;
    font-size: 12px;
  }
  @media (max-width: 720px) {
    #panel { width: calc(100vw - 20px); top: 10px; left: 10px; max-height: 44vh; }
  }
</style>
</head>
<body>
<div id="graph3d"></div>
<aside id="panel">
  <h1>${escapeHtml(title)}</h1>
  <div class="meta" id="meta"></div>
  <label for="search">Search nodes</label>
  <input id="search" type="search" placeholder="Type a node label, source path, or community" autocomplete="off">
  <div id="info"><span class="empty">Click a node to inspect it.</span></div>
</aside>
<div id="status">Loading graph...</div>
<script>
const SUMMARY = ${summaryJson};
const palette = ${paletteJson};
const statusEl = document.getElementById("status");
const infoEl = document.getElementById("info");
const metaEl = document.getElementById("meta");
const searchEl = document.getElementById("search");
let graph;
let rawData;

metaEl.textContent = \`\${SUMMARY.nodes} nodes | \${SUMMARY.edges} edges | \${SUMMARY.communities} communities | \${SUMMARY.sourceFiles} source files\`;

function edgeSource(link) {
  return typeof link.source === "object" ? link.source.id : link.source ?? link.from;
}

function edgeTarget(link) {
  return typeof link.target === "object" ? link.target.id : link.target ?? link.to;
}

function communityColor(node) {
  const raw = node.community ?? node.community_name ?? 0;
  const value = typeof raw === "number" ? raw : Math.abs(String(raw).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0));
  return palette[value % palette.length];
}

function nodeLabel(node) {
  return node.label || node.id || "(unlabelled)";
}

function inspect(node) {
  const fields = [
    ["Source", node.source_file],
    ["Location", node.source_location],
    ["Community", node.community_name ?? node.community],
    ["Type", node.file_type ?? node.type],
    ["Degree", node.degree],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  infoEl.innerHTML = [
    \`<b>\${escapeHtml(nodeLabel(node))}</b>\`,
    ...fields.map(([label, value]) => \`<div><span class="pill">\${label}</span>\${escapeHtml(String(value))}</div>\`)
  ].join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function focusNode(node) {
  inspect(node);
  const distance = 170;
  const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
  graph.cameraPosition(
    { x: (node.x || 1) * distRatio, y: (node.y || 1) * distRatio, z: (node.z || 1) * distRatio },
    node,
    900
  );
}

function findMatch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return rawData.nodes.find((node) => [node.label, node.id, node.source_file, node.community_name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q)));
}

fetch("graph.json")
  .then((response) => {
    if (!response.ok) throw new Error(\`graph.json returned HTTP \${response.status}\`);
    return response.json();
  })
  .then((data) => {
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const rawLinks = Array.isArray(data.links) ? data.links : Array.isArray(data.edges) ? data.edges : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const links = rawLinks
      .map((link) => ({ ...link, source: edgeSource(link), target: edgeTarget(link) }))
      .filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));
    rawData = { nodes, links };
    graph = ForceGraph3D()(document.getElementById("graph3d"))
      .width(window.innerWidth)
      .height(window.innerHeight)
      .backgroundColor("${sceneBackground}")
      .nodeId("id")
      .linkSource("source")
      .linkTarget("target")
      .nodeLabel((node) => \`\${escapeHtml(nodeLabel(node))}<br>\${escapeHtml(node.source_file || "")}\`)
      .nodeColor(communityColor)
      .nodeVal((node) => Math.max(1, Math.min(12, Number(node.degree || 1))))
      .linkColor(() => "${linkColor}")
      .linkOpacity(0.42)
      .linkDirectionalParticles(0)
      .onNodeClick(focusNode)
      .graphData(rawData);

    statusEl.textContent = \`\${nodes.length} nodes loaded\`;
  })
  .catch((error) => {
    statusEl.textContent = "Graph load failed";
    infoEl.innerHTML = \`<span class="empty">\${escapeHtml(error.message)}</span>\`;
  });

searchEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !rawData) return;
  const match = findMatch(searchEl.value);
  if (match) focusNode(match);
});

window.addEventListener("resize", () => {
  if (!graph) return;
  graph.width(window.innerWidth).height(window.innerHeight);
});
</script>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}
