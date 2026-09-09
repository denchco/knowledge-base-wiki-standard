(() => {
  const GRAPH_BASE = "../../assets/graphify";
  const esc = value => String(value ?? "").replace(
    /[&<>"]/g,
    character => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[character])
  );
  const endpoint = value => String(value?.id ?? value ?? "");
  const SEARCH_ACCENT_STYLE_ID = "denchco-wiki-search-accent";
  const SEARCH_ACCENT_CSS = `
    /* Zensical 0.0.59 search-state adapter; structure and behaviour remain upstream-owned. */
    .B, .n, .E {
      color: var(--muted);
    }
    .k:focus-within {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
      box-shadow: 0 0 0 1px var(--focus-contrast);
    }
    .r:focus-visible,
    .i:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
      box-shadow: 0 0 0 1px var(--focus-contrast);
    }
    .i.h,
    .i:hover {
      color: var(--accent-dark);
    }
    .i.h::before,
    .i:hover::before {
      background-color: var(--accent-transparent);
    }
  `;

  function nodeLabel(node) {
    return node?.label || node?.name || node?.title || node?.id || "Unlabelled node";
  }

  function relationLabel(link) {
    return link?.relation || link?.label || link?.type || "relates to";
  }

  function buildTextAlternative(graph, summary) {
    const nodes = graph.nodes || [];
    const links = graph.links || graph.edges || [];
    const byId = new Map(nodes.map(node => [String(node.id), node]));
    const degree = new Map(nodes.map(node => [String(node.id), 0]));
    const relationCounts = new Map();

    for (const link of links) {
      const source = endpoint(link.source ?? link.from);
      const target = endpoint(link.target ?? link.to);
      degree.set(source, (degree.get(source) || 0) + 1);
      degree.set(target, (degree.get(target) || 0) + 1);
      const relation = relationLabel(link);
      relationCounts.set(relation, (relationCounts.get(relation) || 0) + 1);
    }

    const mostConnected = [...nodes]
      .sort((left, right) => (degree.get(String(right.id)) || 0) - (degree.get(String(left.id)) || 0))
      .slice(0, 40);
    const sampleLinks = links.slice(0, 60);
    const nodeCount = summary.nodeCount ?? nodes.length;
    const edgeCount = summary.edgeCount ?? links.length;
    const communityCount = summary.communityCount ?? new Set(nodes.map(node => node.community)).size;
    const details = document.createElement("details");
    details.className = "graph-text-alternative";
    details.innerHTML = `
      <summary>Text summary and complete machine-readable graph</summary>
      <p>
        Both interactive views are generated from the same enriched dataset:
        ${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} relationships and
        ${communityCount.toLocaleString()} named communities.
        <a href="${GRAPH_BASE}/graph.json">Open the complete graph JSON</a> or
        <a href="${GRAPH_BASE}/summary.json">the generation summary</a>.
      </p>
      <h2>Relationship types</h2>
      <ul>${[...relationCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([relation, count]) => `<li>${esc(relation)}: ${count.toLocaleString()}</li>`)
        .join("")}</ul>
      <h2>Forty most-connected nodes</h2>
      <ul>${mostConnected
        .map(node => `<li>${esc(nodeLabel(node))} — ${degree.get(String(node.id)) || 0} relationships</li>`)
        .join("")}</ul>
      <h2>First sixty relationships in the deterministic dataset</h2>
      <ul>${sampleLinks.map(link => {
        const source = byId.get(endpoint(link.source ?? link.from));
        const target = byId.get(endpoint(link.target ?? link.to));
        return `<li>${esc(nodeLabel(source))} → ${esc(relationLabel(link))} → ${esc(nodeLabel(target))}</li>`;
      }).join("")}</ul>
      <p>The bounded lists above aid orientation; the linked JSON is the complete non-visual alternative.</p>`;
    return details;
  }

  const render = async root => {
    if (!root || root.dataset.rendered) return;
    root.dataset.rendered = "true";
    root.setAttribute("aria-busy", "true");
    const is3d = root.dataset.graphView === "3d";
    const viewFile = is3d ? "graph-3d.html" : "graph.html";
    const title = is3d
      ? "Interactive three-dimensional technical repository graph"
      : "Interactive two-dimensional technical repository graph";

    const iframe = document.createElement("iframe");
    iframe.className = "graph-frame";
    iframe.src = `${GRAPH_BASE}/${viewFile}`;
    iframe.title = title;
    iframe.loading = "lazy";
    iframe.allow = "fullscreen";
    root.replaceChildren(iframe);

    try {
      const [graphResponse, summaryResponse] = await Promise.all([
        fetch(`${GRAPH_BASE}/graph.json`),
        fetch(`${GRAPH_BASE}/summary.json`)
      ]);
      if (!graphResponse.ok || !summaryResponse.ok) throw new Error("graph assets unavailable");
      const [graph, summary] = await Promise.all([graphResponse.json(), summaryResponse.json()]);
      root.insertAdjacentElement("afterend", buildTextAlternative(graph, summary));
      root.removeAttribute("aria-busy");
    } catch (error) {
      root.removeAttribute("aria-busy");
      iframe.remove();
      root.innerHTML = `<p class="graph-error" role="status">Generate and validate graph assets with <code>npm run graph:update</code>. ${esc(error.message)}</p>`;
    }
  };

  function applySearchAccent(root = document) {
    const candidates = root instanceof Element
      ? [root, ...root.querySelectorAll("*")]
      : [...document.querySelectorAll("*")];
    let found = false;

    for (const candidate of candidates) {
      const shadow = candidate.shadowRoot;
      if (!shadow?.querySelector('input[role="combobox"]')) continue;
      found = true;
      if (shadow.getElementById(SEARCH_ACCENT_STYLE_ID)) continue;
      const style = document.createElement("style");
      style.id = SEARCH_ACCENT_STYLE_ID;
      style.textContent = SEARCH_ACCENT_CSS;
      shadow.append(style);
    }
    return found;
  }

  let searchAccentFrame = 0;
  function ensureSearchAccent(attempt = 0) {
    if (applySearchAccent() || attempt >= 120) {
      searchAccentFrame = 0;
      return;
    }
    searchAccentFrame = requestAnimationFrame(() => ensureSearchAccent(attempt + 1));
  }

  function scheduleSearchAccent() {
    if (!searchAccentFrame) ensureSearchAccent();
  }

  // Zensical 0.0.59 restores the scheme but leaves its native radios unchecked.
  // Reflect its resolved state so Tab enters the active option and its visible
  // action receives the focus ring. Storage, events and switching stay upstream.
  function reflectNativePalette() {
    const scheme = document.body?.dataset.mdColorScheme;
    const input = [...document.querySelectorAll('form[data-md-component="palette"] input[type="radio"]')]
      .find(option => option.dataset.mdColorScheme === scheme);
    if (input && !input.checked) input.checked = true;
  }

  const paletteObserver = new MutationObserver(reflectNativePalette);
  let paletteBody = null;
  function observeNativePalette() {
    if (document.body !== paletteBody) {
      paletteObserver.disconnect();
      paletteBody = document.body;
      if (paletteBody) paletteObserver.observe(paletteBody, {
        attributes: true,
        attributeFilter: ["data-md-color-scheme"],
      });
    }
    reflectNativePalette();
  }

  const boot = () => {
    observeNativePalette();
    document.querySelectorAll("[data-graph-view]").forEach(render);
    scheduleSearchAccent();
  };

  const searchObserver = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) scheduleSearchAccent();
      }
    }
  });
  searchObserver.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", boot);
  if (window.document$?.subscribe) window.document$.subscribe(boot);
})();
