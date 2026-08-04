export default async (page, options = {}) => {
  const configuration = await page.evaluate(() => {
    const current = new URL(location.href);
    return {
      origin: current.origin,
      questionRoute: current.searchParams.get("question") || "/",
      mermaidRoute: current.searchParams.get("mermaid") || "/",
      architectureRoute: current.searchParams.get("architecture"),
      tableRoute: current.searchParams.get("table"),
      listRoute: current.searchParams.get("list"),
      graphEnabled: current.searchParams.get("graph") === "1",
      graph2dRoute: current.searchParams.get("graph2d") || "/graph/two-dimensional/",
      graph3dRoute: current.searchParams.get("graph3d") || "/graph/three-dimensional/",
    };
  });
  const baseUrl = configuration.origin;
  const questionRoute = configuration.questionRoute;
  const mermaidRoute = configuration.mermaidRoute;
  const architectureRoute = configuration.architectureRoute || mermaidRoute;
  const tableRoute = configuration.tableRoute || mermaidRoute;
  const listRoute = configuration.listRoute || mermaidRoute;
  const graphEnabled = configuration.graphEnabled;
  const failures = [];
  const requests = [];
  const localResponseFailures = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on("request", request => requests.push(request.url()));
  page.on("requestfailed", request => {
    if (request.url().startsWith(baseUrl)) {
      localResponseFailures.push(`${request.url()}: ${request.failure()?.errorText || "request failed"}`);
    }
  });
  page.on("response", response => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) {
      localResponseFailures.push(`${response.url()}: HTTP ${response.status()}`);
    }
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const px = value => Number.parseFloat(String(value || "").replace("px", ""));
  const closeTo = (left, right, tolerance = 1) => Math.abs(left - right) <= tolerance;
  const routeUrl = route => `${baseUrl}${route.startsWith("/") ? route : `/${route}`}`;
  const goto = async route => {
    const response = await page.goto(routeUrl(route), { waitUntil: "networkidle" });
    check(Boolean(response?.ok()), `${route} did not return HTTP 200`);
  };
  const inspectGoverningQuestion = async viewportName => {
    const metrics = await page.evaluate(() => {
      const article = document.querySelector(".md-typeset");
      const questions = [...document.querySelectorAll(".md-typeset blockquote.governing-question")];
      const question = questions[0] || null;
      const questionText = question?.querySelector(":scope > p") || null;
      const probe = document.createElement("span");
      probe.style.color = "var(--accent)";
      probe.style.position = "absolute";
      probe.style.left = "-10000px";
      const ordinary = document.createElement("blockquote");
      ordinary.innerHTML = "<p>Neutral quotation fixture.</p>";
      ordinary.style.position = "absolute";
      ordinary.style.left = "-10000px";
      const negative = document.createElement("blockquote");
      negative.className = "governing-question";
      negative.innerHTML = "<p>Negative governing-question fixture.</p>";
      negative.style.position = "absolute";
      negative.style.left = "-10000px";
      negative.style.setProperty("border-inline-start-color", "rgb(1, 2, 3)", "important");
      negative.querySelector("p").style.setProperty("color", "rgb(4, 5, 6)", "important");
      article?.append(probe, ordinary, negative);
      try {
        const accent = getComputedStyle(probe).color;
        const ordinaryText = ordinary.querySelector("p");
        const negativeText = negative.querySelector("p");
        return {
          count: questions.length,
          accent,
          rail: question ? getComputedStyle(question).borderInlineStartColor : "",
          text: questionText ? getComputedStyle(questionText).color : "",
          weight: questionText ? getComputedStyle(questionText).fontWeight : "",
          ordinaryRail: getComputedStyle(ordinary).borderInlineStartColor,
          ordinaryText: ordinaryText ? getComputedStyle(ordinaryText).color : "",
          negativeRail: getComputedStyle(negative).borderInlineStartColor,
          negativeText: negativeText ? getComputedStyle(negativeText).color : "",
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      } finally {
        probe.remove();
        ordinary.remove();
        negative.remove();
      }
    });
    check(metrics.count === 1, `The configured question page must expose exactly one governing-question marker at ${viewportName} width`);
    check(Boolean(metrics.accent), `The active accent token must resolve at ${viewportName} width`);
    check(metrics.rail === metrics.accent, `The governing-question rail must equal the active accent at ${viewportName} width`);
    check(metrics.text === metrics.accent, `The governing-question text must equal the active accent at ${viewportName} width`);
    check(Number.parseInt(metrics.weight, 10) >= 700, `The governing-question text must remain bold at ${viewportName} width`);
    check(
      metrics.ordinaryRail !== metrics.accent && metrics.ordinaryText !== metrics.accent,
      `An ordinary quotation must remain neutral at ${viewportName} width`,
    );
    check(
      metrics.negativeRail !== metrics.accent && metrics.negativeText !== metrics.accent,
      `The negative mismatched-colour fixture must be rejected at ${viewportName} width`,
    );
    check(metrics.pageOverflow <= 1, `The governing-question callout must not create page overflow at ${viewportName} width`);
    return metrics;
  };
  const inspectDraftNavigation = async viewportName => {
    const metrics = await page.evaluate(() => {
      const visible = element => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
      };
      const navigation = document.querySelector(".md-nav--primary");
      const markers = [...(navigation?.querySelectorAll("a.md-nav__link > .md-status--draft") || [])]
        .filter(visible);
      const chevrons = [...(navigation?.querySelectorAll(".md-nav__item--nested > label.md-nav__link > .md-nav__icon") || [])]
        .filter(visible);
      const marker = markers[0] || null;
      const chevron = chevrons[0] || null;
      const markerBounds = marker?.getBoundingClientRect() || null;
      const chevronBounds = chevron?.getBoundingClientRect() || null;
      const markerRowBounds = marker?.parentElement?.getBoundingClientRect() || null;
      const chevronRowBounds = chevron?.parentElement?.getBoundingClientRect() || null;
      const negative = document.createElement("span");
      negative.className = "md-status md-status--stable";
      negative.style.cssText = "position:absolute;left:-10000px;top:0";
      document.body.append(negative);
      try {
        const markerPseudo = marker ? getComputedStyle(marker, "::after") : null;
        const negativePseudo = getComputedStyle(negative, "::after");
        return {
          count: markers.length,
          titles: [...new Set(markers.map(item => item.getAttribute("title") || ""))],
          markerMask: markerPseudo?.maskImage || markerPseudo?.webkitMaskImage || "",
          negativeMask: negativePseudo.maskImage || negativePseudo.webkitMaskImage || "",
          markerWidth: markerBounds?.width ?? null,
          markerHeight: markerBounds?.height ?? null,
          chevronWidth: chevronBounds?.width ?? null,
          chevronHeight: chevronBounds?.height ?? null,
          markerCenter: markerBounds ? markerBounds.left + markerBounds.width / 2 : null,
          chevronCenter: chevronBounds ? chevronBounds.left + chevronBounds.width / 2 : null,
          markerRowDelta: markerBounds && markerRowBounds
            ? markerBounds.top + markerBounds.height / 2 - (markerRowBounds.top + markerRowBounds.height / 2)
            : null,
          chevronRowDelta: chevronBounds && chevronRowBounds
            ? chevronBounds.top + chevronBounds.height / 2 - (chevronRowBounds.top + chevronRowBounds.height / 2)
            : null,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      } finally {
        negative.remove();
      }
    });
    check(metrics.count > 0, `Primary navigation must expose at least one draft marker at ${viewportName} width`);
    check(
      metrics.titles.length === 1 && metrics.titles[0] === "Draft — research in progress",
      `Every draft marker must expose the governed readable status text at ${viewportName} width`,
    );
    check(metrics.markerMask.includes("pen-circle.svg"), `Draft markers must use the registered Pen Circle asset at ${viewportName} width`);
    check(!metrics.negativeMask.includes("pen-circle.svg"), `Non-draft status must not inherit the Pen Circle asset at ${viewportName} width`);
    check(
      metrics.markerWidth !== null && metrics.markerHeight !== null &&
        metrics.chevronWidth !== null && metrics.chevronHeight !== null &&
        metrics.markerWidth > 0 && metrics.markerHeight > 0 &&
        closeTo(metrics.markerWidth, metrics.chevronWidth, 0.2) &&
        closeTo(metrics.markerHeight, metrics.chevronHeight, 0.2),
      `Draft marker dimensions must match the stock chevron at ${viewportName} width`,
    );
    check(
      metrics.markerCenter !== null && metrics.chevronCenter !== null && closeTo(metrics.markerCenter, metrics.chevronCenter, 0.2),
      `Draft marker and nested-navigation chevron must share the trailing centreline at ${viewportName} width`,
    );
    check(
      metrics.markerRowDelta !== null && closeTo(metrics.markerRowDelta, 0, 0.5),
      `Draft marker must be vertically centred in its navigation row at ${viewportName} width`,
    );
    check(
      metrics.chevronRowDelta !== null && closeTo(metrics.chevronRowDelta, 0, 0.5),
      `Nested-navigation chevron must be vertically centred in its navigation row at ${viewportName} width`,
    );
    check(metrics.pageOverflow <= 1, `Draft navigation markers must not create page overflow at ${viewportName} width`);
    return metrics;
  };
  const screenshotPixels = async buffer => {
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    return page.evaluate(async imageUrl => {
      const blob = await fetch(imageUrl).then(response => response.blob());
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const colours = new Set();
      let opaqueSamples = 0;
      let samples = 0;
      const stepX = Math.max(1, Math.floor(canvas.width / 48));
      const stepY = Math.max(1, Math.floor(canvas.height / 48));
      for (let y = 0; y < canvas.height; y += stepY) {
        for (let x = 0; x < canvas.width; x += stepX) {
          const index = (y * canvas.width + x) * 4;
          colours.add((pixels[index] << 16) | (pixels[index + 1] << 8) | pixels[index + 2]);
          if (pixels[index + 3] > 0) opaqueSamples += 1;
          samples += 1;
        }
      }
      return {
        width: canvas.width,
        height: canvas.height,
        distinctColours: colours.size,
        opaqueRatio: samples ? opaqueSamples / samples : 0,
      };
    }, dataUrl);
  };
  const inspectMermaidPage = async ({ route, pageName, expectedCount, viewportName }) => {
    await goto(route);
    await page.waitForSelector(".mermaid");
    await page.waitForFunction(() => (
      [...document.querySelectorAll(".mermaid")]
        .every(diagram => diagram.getBoundingClientRect().height > 40)
    ));
    const geometry = await page.locator(".mermaid").evaluateAll(diagrams => diagrams.map(diagram => ({
      width: diagram.clientWidth,
      height: diagram.clientHeight,
      scrollWidth: diagram.scrollWidth,
      scrollHeight: diagram.scrollHeight,
      scrollLeft: diagram.scrollLeft,
    })));
    check(
      geometry.length === expectedCount,
      `${pageName} must render exactly ${expectedCount} Mermaid diagram${expectedCount === 1 ? "" : "s"} at ${viewportName} width`,
    );
    for (const [index, diagram] of geometry.entries()) {
      check(diagram.width > 200 && diagram.height > 40, `${pageName} Mermaid ${index + 1} must have non-empty geometry at ${viewportName} width`);
      check(
        diagram.scrollWidth <= diagram.width + 1 && diagram.scrollHeight <= diagram.height + 1,
        `${pageName} Mermaid ${index + 1} must fit its pane at ${viewportName} width`,
      );
      check(Math.abs(diagram.scrollLeft) <= 1, `${pageName} Mermaid ${index + 1} must open without displaced scrolling at ${viewportName} width`);
    }
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(pageOverflow <= 1, `${pageName} page must not overflow horizontally at ${viewportName} width`);
    return geometry;
  };
  const inspectMermaidSourceLayouts = async (sources, pageName) => {
    if (!Array.isArray(sources) || sources.length === 0) {
      check(false, `${pageName} must supply canonical Mermaid source for collision checks`);
      return [];
    }
    const layouts = await page.evaluate(async sourceList => {
      if (!window.mermaid?.render) throw new Error("Pinned local Mermaid runtime is unavailable");
      const mount = document.createElement("div");
      mount.style.cssText = "position:absolute;left:-10000px;top:0;width:1200px;opacity:0;pointer-events:none";
      document.body.append(mount);
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        const results = [];
        for (const [diagramIndex, source] of sourceList.entries()) {
          const rendered = await window.mermaid.render(
            `canonical-layout-${Date.now()}-${diagramIndex}`,
            source,
          );
          mount.innerHTML = rendered.svg;
          await new Promise(resolve => requestAnimationFrame(resolve));
          const svg = mount.querySelector("svg");
          if (!svg) {
            results.push({ diagramIndex, missingSvg: true, edgeLabels: [], nodeOverlaps: [], textPathCollisions: [] });
            continue;
          }
          const edgeLabels = [...svg.querySelectorAll(".edgeLabel text")]
            .map(text => text.textContent?.trim() || "")
            .filter(Boolean);
          const nodes = [...svg.querySelectorAll("g.node")].map((node, index) => ({
            index,
            label: node.textContent?.trim() || `node ${index + 1}`,
            rect: node.getBoundingClientRect(),
          }));
          const nodeOverlaps = [];
          for (let left = 0; left < nodes.length; left += 1) {
            for (let right = left + 1; right < nodes.length; right += 1) {
              const overlapX = Math.min(nodes[left].rect.right, nodes[right].rect.right) - Math.max(nodes[left].rect.left, nodes[right].rect.left);
              const overlapY = Math.min(nodes[left].rect.bottom, nodes[right].rect.bottom) - Math.max(nodes[left].rect.top, nodes[right].rect.top);
              if (overlapX > 1 && overlapY > 1) nodeOverlaps.push([nodes[left].label, nodes[right].label]);
            }
          }
          const texts = [...svg.querySelectorAll("text")].map((text, index) => ({
            index,
            label: text.textContent?.trim() || `text ${index + 1}`,
            rect: text.getBoundingClientRect(),
          })).filter(text => text.rect.width > 0 && text.rect.height > 0);
          const textPathCollisions = [];
          for (const [pathIndex, path] of [...svg.querySelectorAll(".flowchart-link")].entries()) {
            const length = path.getTotalLength();
            const matrix = path.getScreenCTM();
            if (!matrix) continue;
            let collision = null;
            for (let distance = 2; distance < length - 2 && !collision; distance += 1.5) {
              const localPoint = path.getPointAtLength(distance);
              const point = new DOMPoint(localPoint.x, localPoint.y).matrixTransform(matrix);
              collision = texts.find(text => (
                point.x > text.rect.left + 1 && point.x < text.rect.right - 1 &&
                point.y > text.rect.top + 1 && point.y < text.rect.bottom - 1
              )) || null;
            }
            if (collision) textPathCollisions.push({ pathIndex, text: collision.label });
          }
          results.push({ diagramIndex, missingSvg: false, edgeLabels, nodeOverlaps, textPathCollisions });
        }
        return results;
      } finally {
        mount.remove();
      }
    }, sources);
    for (const layout of layouts) {
      const prefix = `${pageName} Mermaid ${layout.diagramIndex + 1}`;
      check(!layout.missingSvg, `${prefix} must render inspectable SVG geometry`);
      check(layout.edgeLabels.length === 0, `${prefix} must not put text on connectors: ${layout.edgeLabels.join(", ")}`);
      check(layout.nodeOverlaps.length === 0, `${prefix} nodes must not overlap: ${JSON.stringify(layout.nodeOverlaps)}`);
      check(
        layout.textPathCollisions.length === 0,
        `${prefix} connectors must not intersect text: ${JSON.stringify(layout.textPathCollisions)}`,
      );
    }
    return layouts;
  };
  const inspectMobileTables = async () => {
    const metrics = await page.evaluate(() => {
      const article = document.querySelector(".md-content__inner");
      const viewportWidth = document.documentElement.clientWidth;
      const tables = [...(article?.querySelectorAll("table") || [])].map(table => {
        let candidate = table;
        let scrollHost = null;
        while (candidate && candidate !== article) {
          if (["auto", "scroll"].includes(getComputedStyle(candidate).overflowX)) {
            scrollHost = candidate;
            break;
          }
          candidate = candidate.parentElement;
        }
        const tableBounds = table.getBoundingClientRect();
        const hostBounds = scrollHost?.getBoundingClientRect() || null;
        const originalScrollLeft = scrollHost?.scrollLeft || 0;
        if (scrollHost && scrollHost.scrollWidth > scrollHost.clientWidth + 1) scrollHost.scrollLeft = 1;
        const moved = Boolean(scrollHost && scrollHost.scrollLeft !== originalScrollLeft);
        if (scrollHost) scrollHost.scrollLeft = originalScrollLeft;
        return {
          visible: tableBounds.width > 0 && tableBounds.height > 0,
          hasScrollHost: Boolean(scrollHost),
          hostWidth: scrollHost?.clientWidth || 0,
          hostBoundsWidth: hostBounds?.width || 0,
          hostScrollWidth: scrollHost?.scrollWidth || 0,
          tableWidth: table.scrollWidth,
          tableHeight: tableBounds.height,
          overflowsHost: Boolean(scrollHost && scrollHost.scrollWidth > scrollHost.clientWidth + 1),
          moved,
        };
      });
      return {
        viewportWidth,
        pageOverflow: document.documentElement.scrollWidth - viewportWidth,
        tables,
      };
    });
    check(metrics.tables.length > 0, "The configured table route must render at least one table at mobile width");
    check(metrics.pageOverflow <= 1, "The configured table route must not create page overflow at mobile width");
    check(
      metrics.tables.every(table => (
        table.visible
        && table.hasScrollHost
        && table.hostWidth > 0
        && table.hostBoundsWidth <= metrics.viewportWidth + 1
        && table.hostScrollWidth >= table.tableWidth
      )),
      `Every mobile table must remain visible inside a contained horizontal scroll host: ${JSON.stringify(metrics.tables)}`,
    );
    check(
      metrics.tables.some(table => table.overflowsHost && table.moved),
      `The configured table route must prove usable horizontal scrolling for a representative wide table: ${JSON.stringify(metrics.tables)}`,
    );
    return metrics.tables;
  };

  await page.evaluate(() => localStorage.removeItem("denchco-kb-wiki-layout-width"));
  await page.setViewportSize({ width: 1256, height: 718 });
  await goto(questionRoute);
  const desktopGoverningQuestion = await inspectGoverningQuestion("desktop");
  const desktopDraftNavigation = await inspectDraftNavigation("desktop");
  const desktopBootstrap = await page.evaluate(() => ({
    control: Boolean(document.querySelector(".layout-width-toggle")),
    header: Boolean(document.querySelector(".md-header__inner")),
    layoutScript: [...document.scripts].some(script => script.src.includes("/assets/layout-width.js")),
    layoutStylesheet: [...document.styleSheets].some(sheet => sheet.href?.includes("/assets/layout-width.css")),
    href: location.href,
  }));
  if (!desktopBootstrap.control) {
    throw new Error(`Desktop runtime did not initialize: ${JSON.stringify(desktopBootstrap)}`);
  }
  await page.waitForSelector(".layout-width-toggle", { state: "attached" });
  const widthControlDisplay = await page.locator(".layout-width-toggle").evaluate(
    element => getComputedStyle(element).display,
  );
  check(widthControlDisplay !== "none", "The Standard/Wide control must be visible at the desktop verification width");
  const measureHeader = () => page.evaluate(() => {
    const rect = element => element?.getBoundingClientRect().toJSON() || null;
    const visibleTopic = [...document.querySelectorAll(".md-header__title .md-header__topic")]
      .find(element => {
        const style = getComputedStyle(element);
        return Number.parseFloat(style.opacity || "1") > 0.5 && element.getBoundingClientRect().width > 0;
      });
    const content = document.querySelector(".md-content__inner");
    const heading = content?.querySelector("h1");
    const control = document.querySelector(".layout-width-toggle");
    const header = document.querySelector(".md-header");
    const search = document.querySelector(".md-search__button");
    return {
      mode: document.documentElement.dataset.layoutWidth,
      topic: rect(visibleTopic),
      content: rect(content),
      heading: rect(heading),
      control: rect(control),
      controlText: control?.textContent.trim() || "",
      controlPressed: control?.getAttribute("aria-pressed"),
      controlBackground: control ? getComputedStyle(control).backgroundColor : "",
      headerBackground: header ? getComputedStyle(header).backgroundColor : "",
      headerColour: header ? getComputedStyle(header).color : "",
      searchBackground: search ? getComputedStyle(search).backgroundColor : "",
      searchColour: search ? getComputedStyle(search).color : "",
    };
  });

  const standardHeader = await measureHeader();
  check(standardHeader.mode === "standard", "Standard width must be the initial desktop mode");
  check(standardHeader.controlPressed === "false", "Standard width control must expose aria-pressed=false");
  check(standardHeader.controlText === "Wide", "The desktop width control must have the visible label Wide");
  check(standardHeader.headerBackground === "rgb(255, 255, 255)", "The production header must render white");
  check(standardHeader.headerColour === "rgb(31, 41, 51)", "The production header must render DenchCo dark content");
  check(standardHeader.searchBackground === "rgba(0, 0, 0, 0.05)", "The closed Search control must render neutral grey");
  check(standardHeader.searchColour === "rgb(31, 41, 51)", "The closed Search control must render DenchCo dark content");
  check(
    standardHeader.topic && standardHeader.heading && closeTo(standardHeader.topic.left, standardHeader.heading.left),
    "The visible desktop title must align to the body-text left rail in Standard mode",
  );
  check(
    standardHeader.control && standardHeader.content && closeTo(standardHeader.control.right, standardHeader.content.right),
    "The width control must align to the body-content right rail in Standard mode",
  );

  await page.locator(".layout-width-toggle").click();
  await page.waitForFunction(() => document.documentElement.dataset.layoutWidth === "wide");
  const wideHeader = await measureHeader();
  check(wideHeader.mode === "wide", "The width control must activate Wide mode");
  check(wideHeader.controlPressed === "true", "Wide mode must expose aria-pressed=true");
  check(
    wideHeader.topic && wideHeader.heading && closeTo(wideHeader.topic.left, wideHeader.heading.left),
    "The visible desktop title must align to the body-text left rail in Wide mode",
  );
  check(
    wideHeader.control && wideHeader.content && closeTo(wideHeader.control.right, wideHeader.content.right),
    "The width control must align to the body-content right rail in Wide mode",
  );
  check(
    wideHeader.content && standardHeader.content && wideHeader.content.width > standardHeader.content.width,
    "Wide mode must increase the central content width",
  );
  check(
    wideHeader.controlBackground !== standardHeader.controlBackground,
    "Wide selection must have a visible selected-state treatment",
  );

  await goto(mermaidRoute);
  await page.waitForSelector(".mermaid");
  await page.waitForFunction(() => {
    const diagram = document.querySelector(".mermaid");
    return diagram && diagram.getBoundingClientRect().height > 40;
  });
  const mermaidHost = page.locator(".mermaid").first();
  const mermaidHostGeometry = await mermaidHost.evaluate(element => ({
    width: element.clientWidth,
    height: element.clientHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
  }));
  const mermaidPixels = await screenshotPixels(await mermaidHost.screenshot());
  check(mermaidHostGeometry.width > 200 && mermaidHostGeometry.height > 40, "Rendered Mermaid geometry must be non-empty");
  check(mermaidPixels.distinctColours > 24 && mermaidPixels.opaqueRatio > 0.95, "Rendered Mermaid pixels must be nonblank");
  const mermaidLayouts = {
    representative: await inspectMermaidSourceLayouts(
      options.mermaidSources?.representative ?? options.mermaidSources?.homepage,
      "Representative page",
    ),
    architecture: await inspectMermaidSourceLayouts(options.mermaidSources?.architecture, "Architecture"),
  };
  const architectureDesktop = await inspectMermaidPage({
    route: architectureRoute,
    pageName: "Architecture",
    expectedCount: 1,
    viewportName: "1256px desktop",
  });

  const mermaidProbe = await page.evaluate(async () => {
    if (!window.mermaid?.render) throw new Error("Pinned local Mermaid runtime is unavailable");
    const mount = document.createElement("div");
    mount.style.position = "absolute";
    mount.style.left = "-10000px";
    document.body.append(mount);
    try {
      const rendered = await window.mermaid.render(
        `runtime-contract-${Date.now()}`,
        "flowchart LR\n  D1[Default one] --> D2[Default two]\n  A[Authority] ==>|governed relation| B[Derived]\n  B --> C[Source]\n  class A kb-canonical\n  class B kb-derived\n  class C kb-source",
      );
      mount.innerHTML = rendered.svg;
      const text = mount.querySelector("svg text");
      const node = mount.querySelector(".node rect");
      const edge = mount.querySelector(".edge-thickness-normal:not(.edge-thickness-thick)");
      const emphasisEdge = mount.querySelector(".edge-thickness-thick");
      const edgeLabelBackground = mount.querySelector(".edgeLabel rect.background");
      const canonicalNode = mount.querySelector(".node.kb-canonical rect");
      const canonicalText = mount.querySelector(".node.kb-canonical text");
      const derivedNode = mount.querySelector(".node.kb-derived rect");
      const defaultNodes = [...mount.querySelectorAll(".node")]
        .filter(nodeElement => !["kb-canonical", "kb-derived", "kb-source"].some(role => nodeElement.classList.contains(role)))
        .map(nodeElement => nodeElement.querySelector("rect"))
        .filter(Boolean);
      const svg = mount.querySelector("svg");
      return {
        fontSize: text ? getComputedStyle(text).fontSize : "",
        nodeRadiusX: node ? getComputedStyle(node).rx : "",
        nodeRadiusY: node ? getComputedStyle(node).ry : "",
        nodeStrokeWidth: node ? getComputedStyle(node).strokeWidth : "",
        edgeStrokeWidth: edge ? getComputedStyle(edge).strokeWidth : "",
        emphasisStrokeWidth: emphasisEdge ? getComputedStyle(emphasisEdge).strokeWidth : "",
        edgeLabelFill: edgeLabelBackground ? getComputedStyle(edgeLabelBackground).fill : "",
        edgeLabelFillOpacity: edgeLabelBackground ? getComputedStyle(edgeLabelBackground).fillOpacity : "",
        canonicalFill: canonicalNode ? getComputedStyle(canonicalNode).fill : "",
        canonicalTextFill: canonicalText ? getComputedStyle(canonicalText).fill : "",
        derivedFill: derivedNode ? getComputedStyle(derivedNode).fill : "",
        derivedDash: derivedNode ? getComputedStyle(derivedNode).strokeDasharray : "",
        defaultNodeFills: defaultNodes.map(nodeElement => getComputedStyle(nodeElement).fill),
        defaultNodeStrokes: defaultNodes.map(nodeElement => getComputedStyle(nodeElement).stroke),
        width: svg?.getBoundingClientRect().width || 0,
        height: svg?.getBoundingClientRect().height || 0,
      };
    } finally {
      mount.remove();
    }
  });
  check(mermaidProbe.width > 100 && mermaidProbe.height > 40, "Mermaid runtime probe must produce non-empty SVG geometry");
  check(mermaidProbe.nodeRadiusX === "5px" && mermaidProbe.nodeRadiusY === "5px", "Mermaid nodes must render with the governed 5px radius");
  check(mermaidProbe.nodeStrokeWidth === "1.75px", "Mermaid node borders must render at 1.75px");
  check(mermaidProbe.edgeStrokeWidth === "1.75px", "Mermaid edges must render at 1.75px");
  check(mermaidProbe.emphasisStrokeWidth === "3px", "Emphasized Mermaid relationships must render at 3px");
  check(
    mermaidProbe.edgeLabelFill === "rgb(246, 248, 249)" && mermaidProbe.edgeLabelFillOpacity === "1",
    "Mermaid edge labels must fully mask connecting lines with the governed diagram background",
  );
  check(mermaidProbe.canonicalFill === "rgb(11, 114, 133)", "Canonical Mermaid nodes must use the active solid accent");
  check(mermaidProbe.canonicalTextFill === "rgb(255, 255, 255)", "Canonical Mermaid labels must use accent-contrast text");
  check(mermaidProbe.derivedFill === "rgb(255, 255, 255)", "Derived Mermaid nodes must use the surface fill");
  check(mermaidProbe.derivedDash.includes("4px") && mermaidProbe.derivedDash.includes("3px"), "Derived Mermaid nodes must use a dashed boundary");
  check(mermaidProbe.defaultNodeFills.length === 2, "Mermaid runtime probe must render two ordinary default nodes");
  check(new Set(mermaidProbe.defaultNodeFills).size === 1, "Ordinary Mermaid nodes must share one default fill");
  check(new Set(mermaidProbe.defaultNodeStrokes).size === 1, "Ordinary Mermaid nodes must share one default boundary");
  check(mermaidProbe.defaultNodeFills[0] !== mermaidProbe.canonicalFill, "Ordinary Mermaid nodes must not inherit optional canonical-role styling");

  await goto(tableRoute);
  await page.waitForSelector(".md-typeset table tbody td");
  const tableTypography = await page.evaluate(() => {
    const tableCell = document.querySelector(".md-typeset table tbody td");
    const article = document.querySelector(".md-typeset");
    return {
      table: tableCell ? getComputedStyle(tableCell).fontSize : "",
      body: article ? getComputedStyle(article).fontSize : "",
    };
  });
  check(px(tableTypography.table) < px(tableTypography.body), "Table text must remain reduced relative to body text");
  check(
    closeTo(px(mermaidProbe.fontSize), px(tableTypography.table), 0.2),
    `Mermaid text (${mermaidProbe.fontSize}) must equal rendered reduced table text (${tableTypography.table})`,
  );

  await goto(listRoute);
  await page.waitForSelector(".md-content__inner ul:not(.task-list) > li");
  const listGeometry = await page.evaluate(() => {
    const list = document.querySelector(".md-content__inner ul:not(.task-list)");
    const item = list?.querySelector(":scope > li");
    const heading = document.querySelector(".md-content__inner h1");
    return {
      listLeft: list?.getBoundingClientRect().left ?? null,
      headingLeft: heading?.getBoundingClientRect().left ?? null,
      listStyle: list ? getComputedStyle(list).listStyleType : "",
      listMargin: list ? getComputedStyle(list).marginInlineStart : "",
      listPadding: list ? getComputedStyle(list).paddingInlineStart : "",
      itemFont: item ? getComputedStyle(item).fontSize : "",
      markerFont: item ? getComputedStyle(item, "::marker").fontSize : "",
    };
  });
  check(
    listGeometry.listLeft !== null && listGeometry.headingLeft !== null && closeTo(listGeometry.listLeft, listGeometry.headingLeft),
    "The unordered-list box must align to the body-text rail",
  );
  check(listGeometry.listStyle === "square", "Unordered content lists must use square markers");
  check(listGeometry.listMargin === "0px" && px(listGeometry.listPadding) > 0, "List indentation must be internal to the body-aligned list box");
  check(closeTo(px(listGeometry.markerFont), px(listGeometry.itemFont), 0.2), "Square markers must render at list-text scale");

  await page.setViewportSize({ width: 768, height: 1024 });
  const representativeTablet = await inspectMermaidPage({
    route: mermaidRoute,
    pageName: "Representative page",
    expectedCount: 1,
    viewportName: "768px tablet",
  });
  const architectureTablet = await inspectMermaidPage({
    route: architectureRoute,
    pageName: "Architecture",
    expectedCount: 1,
    viewportName: "768px tablet",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await goto(questionRoute);
  const mobileGoverningQuestion = await inspectGoverningQuestion("mobile");
  await goto(mermaidRoute);
  await page.waitForSelector(".mermaid");
  await page.waitForFunction(() => document.querySelector(".mermaid")?.getBoundingClientRect().height > 40);
  const mobileMermaid = page.locator(".mermaid").first();
  const mobileMermaidGeometry = await mobileMermaid.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const widthControl = document.querySelector(".layout-width-toggle");
    return {
      left: bounds.left,
      right: bounds.right,
      width: bounds.width,
      height: bounds.height,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      widthControlDisplay: widthControl ? getComputedStyle(widthControl).display : "missing",
    };
  });
  const mobileMermaidPixels = await screenshotPixels(await mobileMermaid.screenshot());
  check(mobileMermaidGeometry.left >= -1 && mobileMermaidGeometry.right <= 391, "Mobile Mermaid pane must stay inside the viewport");
  check(mobileMermaidGeometry.pageOverflow <= 1, "Mobile Mermaid page must not overflow horizontally");
  check(mobileMermaidGeometry.widthControlDisplay === "none", "Desktop width control must not crowd the mobile header");
  check(mobileMermaidPixels.distinctColours > 24, "Mobile Mermaid pixels must be nonblank");
  const architectureMobile = await inspectMermaidPage({
    route: architectureRoute,
    pageName: "Architecture",
    expectedCount: 1,
    viewportName: "390px mobile",
  });
  await goto(tableRoute);
  const mobileTables = await inspectMobileTables();

  const graphMetrics = {};
  if (graphEnabled) {
    const graphViews = [
      { name: "2d", route: configuration.graph2dRoute, asset: "/assets/graphify/graph.html", wait: 900 },
      { name: "3d", route: configuration.graph3dRoute, asset: "/assets/graphify/graph-3d.html", wait: 2800 },
    ];
    const viewports = [
      { name: "desktop", width: 1256, height: 718 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      graphMetrics[viewport.name] = {};
      for (const view of graphViews) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await goto(view.route);
        await page.waitForSelector(".graph-frame");
        await page.locator(".graph-frame").scrollIntoViewIfNeeded();
        let frame = null;
        for (let attempt = 0; attempt < 80 && !frame; attempt += 1) {
          frame = page.frames().find(candidate => candidate.url().includes(view.asset));
          if (!frame) await page.waitForTimeout(100);
        }
        check(Boolean(frame), `${view.name.toUpperCase()} Graphify iframe must load at ${viewport.name} width`);
        if (!frame) continue;
        await frame.waitForSelector("canvas", { timeout: 15000 });
        await frame.waitForTimeout(view.wait);
        const canvas = frame.locator("canvas").first();
        const canvasGeometry = await canvas.evaluate(element => ({
          width: element.clientWidth,
          height: element.clientHeight,
          pixelWidth: element.width,
          pixelHeight: element.height,
        }));
        const frameGeometry = await page.locator(".graph-frame").evaluate(element => ({
          width: element.clientWidth,
          height: element.clientHeight,
        }));
        const controls = await frame.evaluate(name => {
          const selector = name === "2d" ? "#sidebar" : "#panel";
          const control = document.querySelector(selector);
          const search = document.querySelector('input[type="search"], #search');
          const bounds = control?.getBoundingClientRect();
          return {
            controlVisible: Boolean(control && bounds && bounds.width > 0 && bounds.height > 0),
            controlFits: Boolean(bounds && bounds.left >= -1 && bounds.right <= innerWidth + 1 && bounds.top >= -1 && bounds.bottom <= innerHeight + 1),
            searchVisible: Boolean(search && search.getBoundingClientRect().width > 0),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        }, view.name);
        const pixels = await screenshotPixels(await canvas.screenshot());
        check(canvasGeometry.width > 250 && canvasGeometry.height > 300, `${view.name.toUpperCase()} Graphify canvas must retain usable ${viewport.name} dimensions`);
        check(closeTo(canvasGeometry.width, frameGeometry.width, 3) && closeTo(canvasGeometry.height, frameGeometry.height, 3), `${view.name.toUpperCase()} Graphify canvas must fill its ${viewport.name} frame`);
        check(pixels.distinctColours > 8 && pixels.opaqueRatio > 0.95, `${view.name.toUpperCase()} Graphify canvas pixels must be nonblank at ${viewport.name} width`);
        check(controls.controlVisible && controls.controlFits && controls.searchVisible, `${view.name.toUpperCase()} Graphify controls must remain usable at ${viewport.name} width`);
        check(controls.overflow <= 1, `${view.name.toUpperCase()} Graphify iframe must not overflow at ${viewport.name} width`);
        const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(pageOverflow <= 1, `${view.name.toUpperCase()} Graphify page must not overflow at ${viewport.name} width`);
        graphMetrics[viewport.name][view.name] = {
          canvas: canvasGeometry,
          pixels,
          controls,
        };
      }
    }
  }

  const prohibitedCdnHosts = ["unpkg.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"];
  const cdnRequests = requests.filter(requestUrl => prohibitedCdnHosts.some(host => requestUrl.includes(`//${host}/`)));
  const localAssets = ["/assets/vendor/mermaid.min.js", "/assets/pen-circle.svg"];
  if (graphEnabled) localAssets.push("/assets/vendor/vis-network.min.js", "/assets/vendor/3d-force-graph.min.js");
  for (const asset of localAssets) {
    check(requests.some(requestUrl => requestUrl.startsWith(baseUrl) && requestUrl.split(/[?#]/)[0].endsWith(asset)), `Browser contract did not observe local runtime ${asset}`);
  }
  check(cdnRequests.length === 0, `Production browser runtime must not request public CDNs: ${cdnRequests.join(", ")}`);
  check(localResponseFailures.length === 0, `Local browser requests failed: ${localResponseFailures.join("; ")}`);
  check(pageErrors.length === 0, `Browser page errors occurred: ${pageErrors.join("; ")}`);
  check(consoleErrors.length === 0, `Browser console errors occurred: ${consoleErrors.join("; ")}`);

  if (failures.length) throw new Error(`Runtime browser contract failed:\n- ${failures.join("\n- ")}`);

  return {
    ok: true,
    header: {
      standardLeftDelta: standardHeader.topic.left - standardHeader.heading.left,
      standardRightDelta: standardHeader.control.right - standardHeader.content.right,
      wideLeftDelta: wideHeader.topic.left - wideHeader.heading.left,
      wideRightDelta: wideHeader.control.right - wideHeader.content.right,
    },
    typography: {
      body: tableTypography.body,
      table: tableTypography.table,
      mermaid: mermaidProbe.fontSize,
    },
    tables: {
      mobile: mobileTables,
    },
    governingQuestion: {
      desktop: desktopGoverningQuestion,
      mobile: mobileGoverningQuestion,
    },
    draftNavigation: {
      desktop: desktopDraftNavigation,
    },
    mermaid: {
      desktop: mermaidPixels,
      mobile: mobileMermaidPixels,
      layouts: mermaidLayouts,
      architecture: {
        desktop: architectureDesktop,
        tablet: architectureTablet,
        mobile: architectureMobile,
      },
      representativeTablet,
      nodeRadius: mermaidProbe.nodeRadiusX,
      strokeWidth: mermaidProbe.nodeStrokeWidth,
    },
    graph: graphMetrics,
    localRuntimeAssets: localAssets,
    requestCount: requests.length,
  };
}
