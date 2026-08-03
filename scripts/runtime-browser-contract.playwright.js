export default async page => {
  const configuration = await page.evaluate(() => {
    const current = new URL(location.href);
    return {
      origin: current.origin,
      mermaidRoute: current.searchParams.get("mermaid") || "/",
      tableRoute: current.searchParams.get("table"),
      listRoute: current.searchParams.get("list"),
      graphEnabled: current.searchParams.get("graph") === "1",
    };
  });
  const baseUrl = configuration.origin;
  const mermaidRoute = configuration.mermaidRoute;
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

  await page.evaluate(() => localStorage.removeItem("denchco-kb-wiki-layout-width"));
  await page.setViewportSize({ width: 1256, height: 718 });
  await goto(mermaidRoute);
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
  await page.waitForSelector(".mermaid");
  await page.waitForFunction(() => {
    const diagram = document.querySelector(".mermaid");
    return diagram && diagram.getBoundingClientRect().height > 40;
  });

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

  const mermaidProbe = await page.evaluate(async () => {
    if (!window.mermaid?.render) throw new Error("Pinned local Mermaid runtime is unavailable");
    const mount = document.createElement("div");
    mount.style.position = "absolute";
    mount.style.left = "-10000px";
    document.body.append(mount);
    try {
      const rendered = await window.mermaid.render(
        `runtime-contract-${Date.now()}`,
        "flowchart LR\n  A[Alpha] --> B[Beta]",
      );
      mount.innerHTML = rendered.svg;
      const text = mount.querySelector("svg text");
      const node = mount.querySelector(".node rect");
      const edge = mount.querySelector(".edgePath path, .flowchart-link");
      const svg = mount.querySelector("svg");
      return {
        fontSize: text ? getComputedStyle(text).fontSize : "",
        nodeRadiusX: node ? getComputedStyle(node).rx : "",
        nodeRadiusY: node ? getComputedStyle(node).ry : "",
        nodeStrokeWidth: node ? getComputedStyle(node).strokeWidth : "",
        edgeStrokeWidth: edge ? getComputedStyle(edge).strokeWidth : "",
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

  await page.setViewportSize({ width: 390, height: 844 });
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

  const graphMetrics = {};
  if (graphEnabled) {
    const graphViews = [
      { name: "2d", route: "/graph/two-dimensional/", asset: "/assets/graphify/graph.html", wait: 900 },
      { name: "3d", route: "/graph/three-dimensional/", asset: "/assets/graphify/graph-3d.html", wait: 2800 },
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
  const localAssets = ["/assets/vendor/mermaid.min.js"];
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
    mermaid: {
      desktop: mermaidPixels,
      mobile: mobileMermaidPixels,
      nodeRadius: mermaidProbe.nodeRadiusX,
      strokeWidth: mermaidProbe.nodeStrokeWidth,
    },
    graph: graphMetrics,
    localRuntimeAssets: localAssets,
    requestCount: requests.length,
  };
}
