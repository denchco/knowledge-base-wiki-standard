(() => {
  const runtime = window.mermaid;
  if (!runtime?.initialize) {
    throw new Error("Pinned local Mermaid runtime did not load before the Zensical adapter.");
  }

  const initialize = runtime.initialize.bind(runtime);
  const shadowTheme = `
    .node rect,
    .node polygon,
    .node circle,
    .cluster rect {
      rx: var(--diagram-node-radius) !important;
      ry: var(--diagram-node-radius) !important;
      stroke-width: var(--technical-frame-border-width) !important;
    }
    .edgePath path,
    .flowchart-link,
    .messageLine0,
    .messageLine1 {
      stroke-width: var(--technical-frame-border-width) !important;
    }
    .nodeLabel,
    .edgeLabel,
    .label,
    text,
    foreignObject div,
    foreignObject span,
    foreignObject p {
      font-size: var(--diagram-text-size) !important;
      line-height: 1.2 !important;
      letter-spacing: 0 !important;
    }
  `;

  runtime.initialize = options => initialize({
    ...options,
    securityLevel: "strict",
    htmlLabels: false,
    themeCSS: `${options?.themeCSS || ""}\n${shadowTheme}`,
    flowchart: {
      ...options?.flowchart,
      htmlLabels: false,
      useMaxWidth: false,
    },
    sequence: {
      ...options?.sequence,
      useMaxWidth: false,
    },
  });

  const centerTimers = new WeakMap();
  const settleDiagram = (diagram, previousWidth = -1, attempt = 0) => {
    if (diagram.dataset.initialScrollPosition) return;
    const width = diagram.scrollWidth;
    if ((width === previousWidth && width > diagram.clientWidth) || attempt >= 12) {
      if (width > diagram.clientWidth) {
        diagram.scrollLeft = (width - diagram.clientWidth) / 2;
      }
      diagram.dataset.initialScrollPosition = "set";
      centerTimers.delete(diagram);
      return;
    }
    centerTimers.set(diagram, setTimeout(
      () => settleDiagram(diagram, width, attempt + 1),
      100
    ));
  };
  const centerWideDiagrams = (root = document) => {
    const diagrams = root instanceof Element && root.matches(".md-typeset > .mermaid")
      ? [root]
      : [...root.querySelectorAll(".md-typeset > .mermaid")];
    for (const diagram of diagrams) {
      if (diagram.dataset.initialScrollPosition || centerTimers.has(diagram)) continue;
      for (const eventName of ["pointerdown", "wheel", "touchstart"]) {
        diagram.addEventListener(eventName, () => {
          diagram.dataset.initialScrollPosition = "user";
          clearTimeout(centerTimers.get(diagram));
        }, { once: true, passive: true });
      }
      settleDiagram(diagram);
    }
  };

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) centerWideDiagrams(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => centerWideDiagrams());
  if (window.document$?.subscribe) window.document$.subscribe(() => centerWideDiagrams());
  window.addEventListener("resize", () => {
    for (const diagram of document.querySelectorAll(".md-typeset > .mermaid")) {
      if (diagram.dataset.initialScrollPosition !== "set") continue;
      delete diagram.dataset.initialScrollPosition;
      centerTimers.delete(diagram);
    }
    centerWideDiagrams();
  });
})();
