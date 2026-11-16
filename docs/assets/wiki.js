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
      observeSearchState(shadow);
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

  // Keep the native drawer/search controllers. Their mobile labels need a
  // keyboard entry point; keyboard activation delegates to their normal click.
  const headerActionBindings = new WeakSet();
  const observedSearchRoots = new WeakSet();
  let observedHeader = null;
  let keyboardHeaderAction = null;
  function nativeSearchState() {
    for (const host of document.querySelectorAll("body > div")) {
      const panel = host.shadowRoot?.querySelector('input[role="combobox"]')?.closest(".l");
      if (panel) return { host, expanded: getComputedStyle(panel).pointerEvents !== "none" };
    }
    return { host: null, expanded: false };
  }
  function observeSearchState(shadow) {
    if (observedSearchRoots.has(shadow)) return;
    observedSearchRoots.add(shadow);
    new MutationObserver(reflectHeaderActions).observe(shadow, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  }
  const headerActionVisible = element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect();
    return !element.hidden && style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
  };
  function reflectHeaderActions() {
    for (const label of document.querySelectorAll('.md-header label[for="__drawer"], .md-header label[for="__search"]')) {
      const input = document.getElementById(label.htmlFor);
      if (!input) continue;
      const search = label.htmlFor === "__search" ? nativeSearchState() : null;
      const panel = search ? search.host : document.querySelector(".md-sidebar--primary");
      if (panel) {
        if (!panel.id) panel.id = `${label.htmlFor}_panel`;
        label.setAttribute("aria-controls", panel.id);
      }
      label.setAttribute("role", "button");
      label.tabIndex = headerActionVisible(label) ? 0 : -1;
      label.setAttribute("aria-expanded", String(search ? search.expanded : input.checked));
      if (headerActionBindings.has(label)) continue;
      headerActionBindings.add(label);
      label.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat || !headerActionVisible(label)) return;
        const expanded = label.getAttribute("aria-expanded") === "true";
        label.click();
        keyboardHeaderAction = expanded ? null : label;
        requestAnimationFrame(reflectHeaderActions);
      });
    }
    if (keyboardHeaderAction && (!keyboardHeaderAction.isConnected || keyboardHeaderAction.getAttribute("aria-expanded") === "false")) keyboardHeaderAction = null;
  }
  const headerResizeObserver = new ResizeObserver(reflectHeaderActions);
  function observeHeaderActions() {
    const header = document.querySelector(".md-header");
    if (header !== observedHeader) {
      headerResizeObserver.disconnect();
      observedHeader = header;
      if (header) headerResizeObserver.observe(header);
    }
    reflectHeaderActions();
  }
  document.addEventListener("change", reflectHeaderActions);
  document.addEventListener("click", () => requestAnimationFrame(reflectHeaderActions));
  window.addEventListener("resize", reflectHeaderActions);
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !keyboardHeaderAction) return;
    const label = keyboardHeaderAction;
    keyboardHeaderAction = null;
    requestAnimationFrame(() => {
      if (!label.isConnected || !headerActionVisible(label)) return;
      const input = document.getElementById(label.htmlFor);
      // Some native drawer variants have no Escape handler. A click uses the
      // same native close path; never maintain a second expanded-state store.
      if (label.htmlFor === "__drawer" && input?.checked) label.click();
      reflectHeaderActions();
      if (label.getAttribute("aria-expanded") === "false") label.focus();
    });
  });

  const boot = () => {
    observeNativePalette();
    observeHeaderActions();
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
