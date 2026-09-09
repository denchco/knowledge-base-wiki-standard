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
      sourceLinksRoute: current.searchParams.get("sourceLinks"),
      sourceRegisterRoute: current.searchParams.get("sourceRegister") || "/sources/",
      sourceLinksEnabled: current.searchParams.get("sourceLinksEnabled") === "1",
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
  const sourceLinksRoute = configuration.sourceLinksRoute || questionRoute;
  const sourceRegisterRoute = configuration.sourceRegisterRoute;
  const sourceLinksEnabled = configuration.sourceLinksEnabled;
  const graphEnabled = configuration.graphEnabled;
  const governingQuestionRepetitionApplicable = options.governingQuestion?.applicable === true;
  const canonicalGoverningQuestion = typeof options.governingQuestion?.canonicalQuestion === "string"
    ? options.governingQuestion.canonicalQuestion
    : null;
  const governingQuestionRepetitionRoutes = Array.isArray(options.governingQuestion?.repetitionRoutes)
    ? options.governingQuestion.repetitionRoutes.filter(entry => entry && typeof entry.route === "string")
    : [];
  const failures = [];
  const requests = [];
  const resourceRequests = [];
  const localResponseFailures = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on("request", request => {
    requests.push(request.url());
    resourceRequests.push({ url: request.url(), type: request.resourceType() });
  });
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
  const goto = async (route, waitUntil = "networkidle") => {
    const response = await page.goto(routeUrl(route), { waitUntil });
    check(Boolean(response?.ok()), `${route} did not return HTTP 200`);
  };
  // Exercise the renderer's real radio/label controller. Do not write palette
  // storage or body attributes: that would bypass the behaviour being verified.
  const paletteSelector = 'form[data-md-component="palette"]';
  const selectNativeScheme = async scheme => {
    if (await page.locator("body").getAttribute("data-md-color-scheme") === scheme) return;
    const input = page.locator(`${paletteSelector} input[data-md-color-scheme="${scheme}"]`);
    const id = await input.getAttribute("id");
    check(Boolean(id), `The native palette must expose a ${scheme} radio option`);
    if (!id) return;
    await page.locator(`${paletteSelector} label[for="${id}"]:visible`).click();
    await page.waitForFunction(expected => document.body.dataset.mdColorScheme === expected, scheme);
  };
  const inspectThemeContrast = (realm, selectors, graphName = null) => realm.evaluate(({ selectors, graphName }) => {
    const rgba = value => value.startsWith("#")
      ? [...[1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16)), 1]
      : [...(value.match(/[\d.]+/g) ?? []).map(Number), 1].slice(0, 4);
    const over = (front, back) => [...front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3])), 1];
    const luminance = color => color.slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (first, second) => {
      const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const parent = element => element.parentElement || element.getRootNode()?.host || null;
    const lineage = element => {
      const result = [];
      for (let current = element; current; current = parent(current)) result.unshift(current);
      return result;
    };
    const effectiveBackground = element => lineage(element).reduce((background, current) => over(rgba(getComputedStyle(current).backgroundColor), background), [255, 255, 255, 1]);
    const roots = [document];
    for (let index = 0; index < roots.length; index += 1) {
      for (const element of roots[index].querySelectorAll("*")) if (element.shadowRoot) roots.push(element.shadowRoot);
    }
    const entries = selectors.flatMap(selector => roots.flatMap(root => [...root.querySelectorAll(selector)]).filter(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && lineage(element).every(current => {
        const style = getComputedStyle(current);
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
      });
    }).slice(0, 6).map(element => {
      const style = getComputedStyle(element);
      const background = effectiveBackground(element);
      const foreground = rgba(style.color);
      foreground[3] *= lineage(element).reduce((value, current) => value * Number(getComputedStyle(current).opacity), 1);
      return { selector, text: element.textContent.trim().slice(0, 70), color: style.color, background, ratio: contrast(over(foreground, background), background) };
    }));
    const token = name => {
      const probe = document.createElement("span");
      probe.style.color = `var(--${name})`;
      document.body.append(probe);
      const result = getComputedStyle(probe).color;
      probe.remove();
      return result;
    };
    const background = effectiveBackground(document.body);
    const tokens = Object.fromEntries(["background", "surface", "text", "muted", "accent", "focus"].map(name => [name, token(graphName ? `graph-${name}` : name)]));
    let graphMetrics = null;
    if (graphName) {
      const theme = window.graphTheme?.current;
      const checkbox = document.querySelector("#select-all-cb");
      const mark = checkbox ? getComputedStyle(checkbox, "::after") : null;
      graphMetrics = {
        theme,
        timeOrigin: performance.timeOrigin,
        controlBoundaries: [...document.querySelectorAll('#search, input[type="search"], .legend-cb:not(:checked)')]
          .filter(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0)
          .map(element => ({ id: element.id || element.className,
            ratio: contrast(rgba(getComputedStyle(element).borderTopColor), effectiveBackground(parent(element))) })),
        checkboxRatio: checkbox ? contrast(rgba(checkbox.indeterminate ? mark.backgroundColor : mark.borderBottomColor), rgba(getComputedStyle(checkbox).backgroundColor)) : null,
        labelsMinimum: graphName === "2d" && typeof nodesDS !== "undefined"
          ? Math.min(...nodesDS.get().filter(node => node.font?.size > 0).map(node => contrast(rgba(node.font.color), background)))
          : null,
        sceneMatches: graphName !== "3d" || (typeof graph !== "undefined" && rgba(graph.backgroundColor()).slice(0, 3).every((value, index) => Math.abs(value - background[index]) <= 1)),
      };
    }
    return { scheme: document.body.dataset.mdColorScheme, bodyBackground: getComputedStyle(document.body).backgroundColor,
      backgroundLuminance: luminance(background), tokens, entries, graph: graphMetrics,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  }, { selectors, graphName });
  const checkThemeContrast = (metrics, label) => {
    check(metrics.entries.length > 0 && metrics.entries.every(entry => entry.ratio >= 4.5), `${label} text must retain 4.5:1 contrast: ${JSON.stringify(metrics.entries.filter(entry => entry.ratio < 4.5))}`);
    check(metrics.overflow <= 1, `${label} must not create horizontal page overflow`);
    check(metrics.scheme === "default" ? metrics.backgroundLuminance > 0.8 : metrics.backgroundLuminance < 0.1, `${label} must paint the selected light or dark background`);
  };
  const inspectRenderedMermaidContrast = async () => {
    // Zensical renders Mermaid inside a closed shadow root. The pinned
    // Chromium contract can inspect that actual SVG through read-only CDP;
    // a document/open-shadow query would silently measure an empty host.
    const client = await page.context().newCDPSession(page);
    try {
      await client.send("DOM.enable");
      await client.send("CSS.enable");
      const descendants = node => [node, ...(node.children || []).flatMap(descendants), ...(node.shadowRoots || []).flatMap(descendants)];
      const attribute = (node, name) => {
        const index = (node.attributes || []).indexOf(name);
        return index < 0 ? "" : node.attributes[index + 1];
      };
      const hasClass = (node, name) => attribute(node, "class").split(/\s+/u).includes(name);
      let rendered = [];
      const deadline = Date.now() + 10000;
      do {
        const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true });
        const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".mermaid" });
        if (nodeId) {
          const { node } = await client.send("DOM.describeNode", { nodeId, depth: -1, pierce: true });
          rendered = descendants(node);
          if (rendered.some(item => item.localName === "svg") && rendered.some(item => hasClass(item, "node"))) break;
        }
        await page.waitForTimeout(100);
      } while (Date.now() < deadline);
      const style = async node => Object.fromEntries((await client.send("CSS.getComputedStyleForNode", { nodeId: node.nodeId })).computedStyle.map(entry => [entry.name, entry.value]));
      const luminance = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const ratio = (first, second) => {
        const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      const background = await page.locator("body").evaluate(body => getComputedStyle(body).backgroundColor);
      const nodes = [];
      for (const node of rendered.filter(item => hasClass(item, "node"))) {
        const children = descendants(node);
        const shape = children.find(item => ["rect", "polygon"].includes(item.localName));
        const text = children.find(item => item.localName === "text");
        if (!shape || !text) continue;
        const shapeStyle = await style(shape);
        const textStyle = await style(text);
        nodes.push({ label: descendants(text).filter(item => item.nodeType === 3).map(item => item.nodeValue).join(" "),
          textRatio: ratio(textStyle.fill, shapeStyle.fill), boundaryRatio: ratio(shapeStyle.stroke, background) });
      }
      const edgeRatios = [];
      for (const edge of rendered.filter(item => hasClass(item, "flowchart-link"))) edgeRatios.push(ratio((await style(edge)).stroke, background));
      return { nodes, edgeRatios };
    } finally {
      await client.detach();
    }
  };
  const inspectPaletteControl = async (scheme, viewportName) => {
    const metrics = await page.locator(paletteSelector).evaluate(form => {
      const visible = element => element && !element.hidden && getComputedStyle(element).display !== "none" && element.getBoundingClientRect().width > 0;
      const inputs = [...form.querySelectorAll('input[type="radio"]')];
      const label = [...form.querySelectorAll("label")].find(visible);
      const width = document.querySelector(".layout-width-toggle");
      const bounds = label?.getBoundingClientRect();
      const widthBounds = visible(width) ? width.getBoundingClientRect() : null;
      return {
        options: inputs.map(input => ({ scheme: input.dataset.mdColorScheme, name: input.getAttribute("aria-label"), checked: input.checked })),
        labelTitle: label?.title || "", labelTarget: label?.control?.dataset.mdColorScheme,
        visible: Boolean(bounds && bounds.width > 0 && bounds.height > 0 && bounds.left >= 0 && bounds.right <= innerWidth),
        immediatelyBeforeWide: width?.previousElementSibling === form,
        positionBeforeWide: !widthBounds || Boolean(bounds && bounds.right <= widthBounds.left + 1 && Math.abs((bounds.top + bounds.height / 2) - (widthBounds.top + widthBounds.height / 2)) <= 2),
      };
    });
    check(metrics.options.length === 2 && metrics.options.every(option => option.name), `${viewportName} palette must use two named native radio options`);
    check(metrics.options.filter(option => option.checked).length === 1 && metrics.options.some(option => option.checked && option.scheme === scheme), `${viewportName} selected radio must reflect ${scheme}`);
    check(metrics.visible && metrics.labelTitle && metrics.labelTarget !== scheme, `${viewportName} must expose a visible, labelled switch to the other scheme`);
    check(metrics.immediatelyBeforeWide && metrics.positionBeforeWide, `${viewportName} palette control must sit immediately left of Wide in DOM and visual order`);
    return metrics;
  };
  const inspectGoverningQuestion = async (viewportName, route, expectedQuestion = null, expectedCount = 1) => {
    await goto(route);
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
          questionText: questionText?.textContent ?? "",
          questions: questions.map(item => {
            const text = item.querySelector(":scope > p");
            return {
              questionText: text?.textContent ?? "",
              rail: getComputedStyle(item).borderInlineStartColor,
              text: text ? getComputedStyle(text).color : "",
              weight: text ? getComputedStyle(text).fontWeight : "",
            };
          }),
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
    const location = `${route} at ${viewportName} width`;
    check(metrics.count === expectedCount, `The governing-question route ${location} must expose ${expectedCount} governing-question marker${expectedCount === 1 ? "" : "s"}`);
    if (expectedQuestion !== null) {
      check(
        metrics.questions.every(item => item.questionText === expectedQuestion),
        `Every governing-question marker on ${location} must render the identical canonical question text`,
      );
    }
    check(Boolean(metrics.accent), `The active accent token must resolve on ${location}`);
    check(metrics.questions.every(item => item.rail === metrics.accent), `Every governing-question rail must equal the active accent on ${location}`);
    check(metrics.questions.every(item => item.text === metrics.accent), `Every governing-question text must equal the active accent on ${location}`);
    check(metrics.questions.every(item => Number.parseInt(item.weight, 10) >= 700), `Every governing-question text must remain bold on ${location}`);
    check(
      metrics.ordinaryRail !== metrics.accent && metrics.ordinaryText !== metrics.accent,
      `An ordinary quotation must remain neutral on ${location}`,
    );
    check(
      metrics.negativeRail !== metrics.accent && metrics.negativeText !== metrics.accent,
      `The negative mismatched-colour fixture must be rejected on ${location}`,
    );
    check(metrics.pageOverflow <= 1, `The governing-question callout must not create page overflow on ${location}`);
    return { route, ...metrics };
  };
  const inspectGoverningQuestionRepetitionRoutes = async (viewportName, primaryMetrics) => {
    if (!governingQuestionRepetitionApplicable) return [];
    check(Boolean(canonicalGoverningQuestion), "DKBWS-HUMAN-004 browser verification requires canonical governing-question text");
    check(governingQuestionRepetitionRoutes.length > 0, "DKBWS-HUMAN-004 browser verification requires at least one repetition route");
    const results = [];
    for (const entry of governingQuestionRepetitionRoutes) {
      if (entry.route === questionRoute
        && primaryMetrics.count === entry.repetitions
        && primaryMetrics.questions.every(item => item.questionText === canonicalGoverningQuestion)) {
        results.push({ ...entry, metrics: primaryMetrics });
        continue;
      }
      results.push({
        ...entry,
        metrics: await inspectGoverningQuestion(
          viewportName,
          entry.route,
          canonicalGoverningQuestion,
          entry.repetitions,
        ),
      });
    }
    return results;
  };
  const inspectSourceLink = async (viewportName, followDestination = false) => {
    if (!sourceLinksEnabled) return null;
    await goto(sourceLinksRoute);
    const citation = page.locator('.md-content__inner a[href*="#src-"]').first();
    await citation.waitFor({ state: "visible" });
    const metrics = await citation.evaluate(element => ({
      id: element.textContent.trim(),
      accessibleName: element.getAttribute("aria-label") || element.textContent.trim(),
      href: element.href,
      tabIndex: element.tabIndex,
      before: getComputedStyle(element, "::before").content,
      after: getComputedStyle(element, "::after").content,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    const target = new URL(metrics.href);
    check(/^SRC-\d{3}$/.test(metrics.id), `The representative source link must retain its stable identity at ${viewportName} width: ${JSON.stringify(metrics)}`);
    check(metrics.accessibleName.includes(metrics.id), `The representative source link must keep an intelligible accessible identity at ${viewportName} width: ${JSON.stringify(metrics)}`);
    check(metrics.tabIndex === 0, `The representative source link must be keyboard focusable at ${viewportName} width: ${JSON.stringify(metrics)}`);
    check(metrics.before === '"["' && metrics.after === '"]"', `The representative source link must visibly render as [${metrics.id}] at ${viewportName} width: ${JSON.stringify(metrics)}`);
    check(target.pathname === sourceRegisterRoute && target.hash === `#${metrics.id.toLowerCase()}`, `The representative source link must target its exact mapped source row at ${viewportName} width: ${JSON.stringify(metrics)}`);
    check(metrics.pageOverflow <= 1, `Reader source links must not create page overflow at ${viewportName} width`);
    await citation.focus();
    check(await citation.evaluate(element => document.activeElement === element), `The representative source link must accept keyboard focus at ${viewportName} width`);

    if (!followDestination) return metrics;
    await Promise.all([
      page.waitForURL(url => url.pathname === sourceRegisterRoute && url.hash === `#${metrics.id.toLowerCase()}`),
      citation.click(),
    ]);
    const anchor = page.locator(`#${metrics.id.toLowerCase()}`);
    await anchor.waitFor({ state: "attached" });
    const destination = await anchor.evaluate((element, id) => ({
      row: element.closest("tr")?.textContent.replace(/\s+/g, " ").trim() || "",
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      id,
    }), metrics.id);
    check(destination.row.includes(metrics.id), `The source fragment must belong to the matching source-register row: ${JSON.stringify(destination)}`);
    check(destination.pageOverflow <= 1, `The source-register destination must not overflow at ${viewportName} width`);
    return { ...metrics, destination };
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
  const inspectFrameCanvasPixels = async frame => frame.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
    const canvas = document.querySelector("canvas");
    if (!canvas) return { kind: "missing", width: 0, height: 0, distinctColours: 0, opaqueRatio: 0 };
    const width = canvas.width;
    const height = canvas.height;
    const context2d = canvas.getContext("2d");
    let pixels;
    let kind;
    if (context2d) {
      pixels = context2d.getImageData(0, 0, width, height).data;
      kind = "2d";
    } else {
      const webgl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!webgl) return { kind: "missing", width, height, distinctColours: 0, opaqueRatio: 0 };
      pixels = new Uint8Array(width * height * 4);
      webgl.readPixels(0, 0, width, height, webgl.RGBA, webgl.UNSIGNED_BYTE, pixels);
      kind = "webgl";
    }
    const colours = new Set();
    let opaqueSamples = 0;
    let samples = 0;
    const stepX = Math.max(1, Math.floor(width / 48));
    const stepY = Math.max(1, Math.floor(height / 48));
    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const index = (y * width + x) * 4;
        colours.add((pixels[index] << 16) | (pixels[index + 1] << 8) | pixels[index + 2]);
        if (pixels[index + 3] > 0) opaqueSamples += 1;
        samples += 1;
      }
    }
    return {
      kind,
      width,
      height,
      distinctColours: colours.size,
      opaqueRatio: samples ? opaqueSamples / samples : 0,
    };
  });
  const inspectMermaidPage = async ({ route, pageName, expectedCount, viewportName, maxHorizontalOverflow = 0 }) => {
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
      display: getComputedStyle(diagram).display,
      justifyItems: getComputedStyle(diagram).justifyItems,
    })));
    check(
      geometry.length === expectedCount,
      `${pageName} must render exactly ${expectedCount} Mermaid diagram${expectedCount === 1 ? "" : "s"} at ${viewportName} width`,
    );
    for (const [index, diagram] of geometry.entries()) {
      check(diagram.width > 200 && diagram.height > 40, `${pageName} Mermaid ${index + 1} must have non-empty geometry at ${viewportName} width`);
      check(diagram.display === "grid" && diagram.justifyItems === "safe center", `${pageName} Mermaid ${index + 1} must use safe centring at ${viewportName} width`);
      const horizontalOverflow = Math.max(0, diagram.scrollWidth - diagram.width);
      check(
        horizontalOverflow <= maxHorizontalOverflow + 1 && diagram.scrollHeight <= diagram.height + 1,
        `${pageName} Mermaid ${index + 1} must stay within its ${maxHorizontalOverflow}px contained-overflow limit at ${viewportName} width: ${horizontalOverflow}px actual horizontal overflow versus ${maxHorizontalOverflow}px governed limit (+1px measurement tolerance)`,
      );
      if (horizontalOverflow > 1) {
        check(Math.abs(diagram.scrollLeft - (horizontalOverflow / 2)) <= 1, `${pageName} Mermaid ${index + 1} must open centred within its pane at ${viewportName} width`);
      } else {
        check(Math.abs(diagram.scrollLeft) <= 1, `${pageName} Mermaid ${index + 1} must open without displaced scrolling at ${viewportName} width`);
      }
    }
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(pageOverflow <= 1, `${pageName} page must not overflow horizontally at ${viewportName} width`);
    return geometry;
  };
  const inspectMermaidSourceLayouts = async (sources, pageName, expectations = []) => {
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
            results.push({
              diagramIndex,
              missingSvg: true,
              title: "",
              description: "",
              edgeCount: 0,
              edgeLabels: [],
              nodes: [],
              nodeOverlaps: [],
              textPathCollisions: [],
            });
            continue;
          }
          const title = svg.querySelector("title")?.textContent?.trim() || "";
          const description = svg.querySelector("desc")?.textContent?.trim() || "";
          const edgeCount = svg.querySelectorAll(".flowchart-link").length;
          const edgeLabels = [...svg.querySelectorAll(".edgeLabel text")]
            .map(text => text.textContent?.trim() || "")
            .filter(Boolean);
          const nodes = [...svg.querySelectorAll("g.node")].map((node, index) => {
            const rect = node.getBoundingClientRect();
            return {
              index,
              label: node.textContent?.trim() || `node ${index + 1}`,
              rect: {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
                centerY: rect.top + (rect.height / 2),
              },
            };
          });
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
          results.push({
            diagramIndex,
            missingSvg: false,
            title,
            description,
            edgeCount,
            edgeLabels,
            nodes,
            nodeOverlaps,
            textPathCollisions,
          });
        }
        return results;
      } finally {
        mount.remove();
      }
    }, sources);
    for (const layout of layouts) {
      const prefix = `${pageName} Mermaid ${layout.diagramIndex + 1}`;
      const expected = expectations[layout.diagramIndex];
      check(!layout.missingSvg, `${prefix} must render inspectable SVG geometry`);
      check(layout.edgeLabels.length === 0, `${prefix} must not put text on connectors: ${layout.edgeLabels.join(", ")}`);
      check(layout.nodeOverlaps.length === 0, `${prefix} nodes must not overlap: ${JSON.stringify(layout.nodeOverlaps)}`);
      check(
        layout.textPathCollisions.length === 0,
        `${prefix} connectors must not intersect text: ${JSON.stringify(layout.textPathCollisions)}`,
      );
      if (!expected) {
        check(false, `${prefix} must have a rendered topology expectation`);
        continue;
      }
      const renderedLabels = layout.nodes.map(node => node.label).sort((left, right) => left.localeCompare(right));
      const expectedLabels = [...expected.nodeLabels].sort((left, right) => left.localeCompare(right));
      check(layout.nodes.length === expected.nodeLabels.length, `${prefix} must render exactly ${expected.nodeLabels.length} nodes; found ${layout.nodes.length}`);
      check(JSON.stringify(renderedLabels) === JSON.stringify(expectedLabels), `${prefix} rendered node labels must be ${JSON.stringify(expectedLabels)}; found ${JSON.stringify(renderedLabels)}`);
      check(layout.edgeCount === expected.edgeCount, `${prefix} must render exactly ${expected.edgeCount} relationships; found ${layout.edgeCount}`);
      check(layout.title === expected.title, `${prefix} must render accessible title "${expected.title}"; found "${layout.title}"`);
      check(layout.description === expected.description, `${prefix} must render the canonical accessible description`);
      const sameRankNodes = expected.sameRankLabels.map(label => layout.nodes.find(node => node.label === label)).filter(Boolean);
      check(sameRankNodes.length === expected.sameRankLabels.length, `${prefix} must render distinct ${expected.sameRankLabels.join(", ")} nodes`);
      if (sameRankNodes.length === expected.sameRankLabels.length) {
        const rankCenters = sameRankNodes.map(node => node.rect.centerY);
        check(Math.max(...rankCenters) - Math.min(...rankCenters) <= 2, `${prefix} ${expected.sameRankLabels.join(", ")} nodes must share one visual rank`);
      }
      if (expected.downstreamLabel && sameRankNodes.length === expected.sameRankLabels.length) {
        const downstream = layout.nodes.find(node => node.label === expected.downstreamLabel);
        check(Boolean(downstream), `${prefix} must render downstream node ${expected.downstreamLabel}`);
        if (downstream) {
          check(downstream.rect.top > Math.max(...sameRankNodes.map(node => node.rect.bottom)), `${prefix} ${expected.downstreamLabel} must appear below all three product surfaces`);
        }
      }
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
  await selectNativeScheme("default");
  const questionRouteIsGovernedRepetition = governingQuestionRepetitionApplicable
    && governingQuestionRepetitionRoutes.some(entry => entry.route === questionRoute);
  const questionRouteRepetitionCount = questionRouteIsGovernedRepetition
    ? governingQuestionRepetitionRoutes.find(entry => entry.route === questionRoute).repetitions
    : 1;
  const desktopGoverningQuestion = await inspectGoverningQuestion(
    "desktop",
    questionRoute,
    questionRouteIsGovernedRepetition ? canonicalGoverningQuestion : null,
    questionRouteRepetitionCount,
  );
  const desktopGoverningQuestionRepetitions = await inspectGoverningQuestionRepetitionRoutes(
    "desktop",
    desktopGoverningQuestion,
  );
  await goto(questionRoute);
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

  // Exercise upstream search through its open shadow-root UI. Result navigation
  // must use this served build, while Markdown discovery retains canonical URLs.
  const searchInput = page.locator('input[role="combobox"]');
  const searchDestination = routeUrl(architectureRoute);
  const searchResult = page.locator(`.l ol li a[href="${searchDestination}"]`).first();
  check(await page.locator('link[rel="alternate"][type="text/markdown"]').count() === 1,
    "Rendered pages must retain their Markdown discovery alternate");
  const openSearch = async () => {
    const desktopButton = page.locator(".md-search__button");
    if (await desktopButton.isVisible()) await desktopButton.click();
    else await page.locator('.md-header__button[for="__search"]').click();
    await searchInput.waitFor({ state: "attached" });
    await page.waitForFunction(() => [...document.querySelectorAll("body > div")].some(host => {
      const input = host.shadowRoot?.querySelector('input[role="combobox"]');
      const panel = input?.closest(".l");
      return input && input.getRootNode().activeElement === input && panel && getComputedStyle(panel).opacity === "1";
    }));
  };
  await openSearch();
  await searchInput.fill("architecture");
  await searchResult.waitFor({ state: "visible" });
  const searchResultLabel = (await searchResult.innerText()).trim();
  check(/architecture/i.test(searchResultLabel), "Search must return the maintained architecture page");
  await searchInput.press("Escape");
  await page.waitForFunction(() => [...document.querySelectorAll("body > div")].every(host => {
    const input = host.shadowRoot?.querySelector('input[role="combobox"]');
    if (!input) return true;
    const panel = input.closest(".l");
    return panel && input.getRootNode().activeElement !== input
      && getComputedStyle(panel).opacity === "0" && getComputedStyle(panel).pointerEvents === "none";
  }));
  await openSearch();
  await searchInput.fill("architecture");
  await searchResult.waitFor({ state: "visible" });
  await Promise.all([
    page.waitForURL(url => url.origin === baseUrl && url.pathname === new URL(searchDestination).pathname),
    searchResult.click(),
  ]);
  await page.waitForLoadState("networkidle");
  check(/architecture/i.test(await page.locator(".md-content__inner h1").innerText()), "Search result must navigate to the architecture document");
  const searchLifecycle = { query: "architecture", resultRoute: architectureRoute, resultLabel: searchResultLabel, reopenAndEscape: true };
  await goto(questionRoute);

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
    display: getComputedStyle(element).display,
    justifyItems: getComputedStyle(element).justifyItems,
  }));
  const mermaidPixels = await screenshotPixels(await mermaidHost.screenshot());
  check(mermaidHostGeometry.width > 200 && mermaidHostGeometry.height > 40, "Rendered Mermaid geometry must be non-empty");
  check(mermaidHostGeometry.display === "grid" && mermaidHostGeometry.justifyItems === "safe center", "Rendered Mermaid surfaces must centre safely within their pane");
  check(mermaidPixels.distinctColours > 24 && mermaidPixels.opaqueRatio > 0.95, "Rendered Mermaid pixels must be nonblank");
  const mermaidLayouts = {
    representative: await inspectMermaidSourceLayouts(
      options.mermaidSources?.representative ?? options.mermaidSources?.homepage,
      "Representative page",
      [{
        nodeLabels: ["Source", "Evidence", "Knowledge", "Human", "Agent", "Graph", "Verification"],
        edgeCount: 8,
        title: "Governed knowledge base system",
        description: "Source material becomes inspectable evidence and maintained knowledge. That knowledge serves separate Human, Agent, and Graph surfaces, whose paths converge on verification.",
        sameRankLabels: ["Human", "Agent", "Graph"],
        downstreamLabel: "Verification",
      }],
    ),
    architecture: await inspectMermaidSourceLayouts(
      options.mermaidSources?.architecture,
      "Architecture",
      [{
        nodeLabels: ["1 · Sources", "2 · Register", "3 · Evidence", "4 · Knowledge", "Human", "Agent", "Graph"],
        edgeCount: 6,
        title: "Knowledge authority and derived surfaces",
        description: "Sources are registered, assessed as evidence, and maintained as canonical knowledge, which directly serves separate Human, Agent, and Graph surfaces that cannot create evidence.",
        sameRankLabels: ["Human", "Agent", "Graph"],
      }],
    ),
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
  const desktopSourceLink = await inspectSourceLink("desktop", true);

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
  const mobileGoverningQuestion = await inspectGoverningQuestion(
    "mobile",
    questionRoute,
    questionRouteIsGovernedRepetition ? canonicalGoverningQuestion : null,
    questionRouteRepetitionCount,
  );
  const mobileGoverningQuestionRepetitions = await inspectGoverningQuestionRepetitionRoutes(
    "mobile",
    mobileGoverningQuestion,
  );
  const mobileSourceLink = await inspectSourceLink("mobile");
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
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      widthControlDisplay: widthControl ? getComputedStyle(widthControl).display : "missing",
    };
  });
  const mobileMermaidPixels = await screenshotPixels(await mobileMermaid.screenshot());
  check(mobileMermaidGeometry.left >= -1 && mobileMermaidGeometry.right <= 391, "Mobile Mermaid pane must stay inside the viewport");
  const mobileMermaidOverflow = Math.max(0, mobileMermaidGeometry.scrollWidth - mobileMermaidGeometry.clientWidth);
  check(
    mobileMermaidOverflow <= 61,
    `Mobile representative Mermaid must keep contained horizontal overflow within the governed 60px limit: ${mobileMermaidOverflow}px actual versus 60px governed limit (+1px measurement tolerance)`,
  );
  check(Math.abs(mobileMermaidGeometry.scrollLeft - (mobileMermaidOverflow / 2)) <= 1, "Mobile representative Mermaid must open centred within its pane");
  check(mobileMermaidGeometry.pageOverflow <= 1, "Mobile Mermaid page must not overflow horizontally");
  check(mobileMermaidGeometry.widthControlDisplay === "none", "Desktop width control must not crowd the mobile header");
  check(mobileMermaidPixels.distinctColours > 24, "Mobile Mermaid pixels must be nonblank");
  const architectureMobile = await inspectMermaidPage({
    route: architectureRoute,
    pageName: "Architecture",
    expectedCount: 1,
    viewportName: "390px mobile",
    maxHorizontalOverflow: 60,
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
        await goto(view.route, "domcontentloaded");
        await page.waitForSelector(".graph-frame", { state: "attached" });
        await page.locator(".graph-frame").evaluate(element => element.scrollIntoView({ block: "center" }));
        await page.waitForFunction(() => {
          const frameElement = document.querySelector(".graph-frame");
          const bounds = frameElement?.getBoundingClientRect();
          return Boolean(bounds && bounds.width > 250 && bounds.height > 300);
        });
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
        const pixels = await inspectFrameCanvasPixels(frame);
        check(canvasGeometry.width > 250 && canvasGeometry.height > 300, `${view.name.toUpperCase()} Graphify canvas must retain usable ${viewport.name} dimensions`);
        check(closeTo(canvasGeometry.width, frameGeometry.width, 3) && closeTo(canvasGeometry.height, frameGeometry.height, 3), `${view.name.toUpperCase()} Graphify canvas must fill its ${viewport.name} frame`);
        const minimumOpaqueRatio = view.name === "2d" ? 0.1 : 0.95;
        check(pixels.distinctColours > 8 && pixels.opaqueRatio > minimumOpaqueRatio, `${view.name.toUpperCase()} Graphify canvas pixels must be nonblank at ${viewport.name} width`);
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

  // The original journey above remains the full light regression contract.
  // This additional matrix verifies native palette state, persistence and
  // inherited surfaces without duplicating the renderer or its storage format.
  const paletteMetrics = {};
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    paletteMetrics[viewport.name] = {};
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const scheme of ["default", "slate"]) {
      const label = `${scheme}/${viewport.name}`;
      const otherScheme = scheme === "default" ? "slate" : "default";
      await goto(questionRoute);
      if (viewport.name === "desktop" && await page.locator(".layout-width-toggle").getAttribute("aria-pressed") !== "true") await page.locator(".layout-width-toggle").click();
      // The stock renderer leaves both radios unchecked before the first selection.
      // Establish the test state using its visible action, never by writing state.
      await selectNativeScheme(otherScheme);
      await selectNativeScheme(scheme);
      const control = await inspectPaletteControl(scheme, viewport.name);

      // Native radio keyboard navigation must change the palette. On desktop,
      // also prove the palette is the preceding keyboard stop before Wide.
      const checkedRadio = () => page.locator(`${paletteSelector} input:checked`);
      if (viewport.name === "desktop") {
        await page.locator(".layout-width-toggle").focus();
        await page.keyboard.press("Shift+Tab");
        check(await checkedRadio().evaluate(element => document.activeElement === element), `${label} palette must precede Wide in keyboard order`);
      } else {
        await checkedRadio().focus();
      }
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(expected => document.body.dataset.mdColorScheme === expected, otherScheme);
      const focus = await checkedRadio().evaluate(input => {
        const visibleLabel = [...input.form.querySelectorAll("label")].find(label => !label.hidden && getComputedStyle(label).display !== "none");
        const style = visibleLabel && getComputedStyle(visibleLabel);
        return { focused: document.activeElement === input, outline: style?.outlineStyle, width: style?.outlineWidth };
      });
      check(focus.focused && focus.outline !== "none" && px(focus.width) >= 2, `${label} native palette keyboard focus must remain visibly indicated`);
      await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(expected => document.body.dataset.mdColorScheme === expected, scheme);

      await page.reload({ waitUntil: "networkidle" });
      check(await page.locator("body").getAttribute("data-md-color-scheme") === scheme, `${label} selection must survive reload`);
      await goto(architectureRoute);
      check(await page.locator("body").getAttribute("data-md-color-scheme") === scheme, `${label} selection must survive document navigation`);
      const governing = await inspectGoverningQuestion(label, questionRoute,
        questionRouteIsGovernedRepetition ? canonicalGoverningQuestion : null, questionRouteRepetitionCount);
      const content = await inspectThemeContrast(page, [".md-header", ".md-search__button", ".md-content__inner h1", ".md-typeset > p", ".md-typeset blockquote.governing-question p", ".md-typeset a"]);
      checkThemeContrast(content, `${label} header and content`);
      check(content.bodyBackground === content.tokens.background, `${label} body must paint its active background token`);

      await goto(tableRoute);
      await page.waitForSelector(".md-typeset table tbody td");
      const table = await inspectThemeContrast(page, [".md-typeset table th", ".md-typeset table td", ".md-typeset table a"]);
      checkThemeContrast(table, `${label} table`);
      const mobileScroll = viewport.name === "mobile" ? await inspectMobileTables() : null;

      await goto(mermaidRoute);
      const diagram = await inspectRenderedMermaidContrast();
      check(diagram.nodes.length > 0 && diagram.nodes.every(node => node.textRatio >= 4.5 && node.boundaryRatio >= 3), `${label} rendered Mermaid labels and node boundaries must retain contrast`);
      check(diagram.edgeRatios.length > 0 && diagram.edgeRatios.every(ratio => ratio >= 3), `${label} rendered Mermaid relationships must retain contrast`);
      if (options.capture) await options.capture(`palette-${scheme}-${viewport.name}`, await page.screenshot({ fullPage: true }));

      await openSearch();
      await searchInput.fill("architecture");
      await searchResult.waitFor({ state: "visible" });
      const search = await inspectThemeContrast(page, ['input[role="combobox"]', '.l ol li a', '.l .n li', '.l .B', '.l .x', '.l .u', '.l mark', '.l code']);
      checkThemeContrast(search, `${label} open search`);
      check(search.entries.some(entry => entry.selector === '.l ol li a'), `${label} search must expose readable results`);
      await searchInput.press("Escape");

      const themedGraphs = {};
      if (graphEnabled) for (const view of [
        { name: "2d", route: configuration.graph2dRoute, asset: "/assets/graphify/graph.html" },
        { name: "3d", route: configuration.graph3dRoute, asset: "/assets/graphify/graph-3d.html" },
      ]) {
        await goto(view.route);
        await page.locator(".graph-frame").waitFor({ state: "attached" });
        const frame = await (await page.locator(".graph-frame").elementHandle()).contentFrame();
        check(Boolean(frame && frame.url().includes(view.asset)), `${label} ${view.name} graph frame must load`);
        if (!frame) continue;
        await frame.waitForSelector("canvas");
        await frame.waitForFunction(expected => window.graphTheme?.current?.scheme === expected && document.body.dataset.mdColorScheme === expected, scheme);
        const originalTimeOrigin = await frame.evaluate(() => performance.timeOrigin);
        // Switch an already-running frame in both directions. A reload would
        // lose its state and would fail the timeOrigin identity check.
        await selectNativeScheme(otherScheme);
        await frame.waitForFunction(expected => window.graphTheme?.current?.scheme === expected && document.body.dataset.mdColorScheme === expected, otherScheme);
        await selectNativeScheme(scheme);
        await frame.waitForFunction(expected => window.graphTheme?.current?.scheme === expected && document.body.dataset.mdColorScheme === expected, scheme);
        const selectors = view.name === "2d" ? ["#search", "#info-content .empty", "#stats", ".legend-count", ".legend-label", "#legend-controls label"]
          : ["#panel h1", "#panel .meta", "#panel label", "#panel input", "#info .empty", "#stats", ".scene-nav-info"];
        const graph = await inspectThemeContrast(frame, selectors, view.name);
        checkThemeContrast(graph, `${label} ${view.name} graph`);
        check(graph.graph.controlBoundaries.length > 0 && graph.graph.controlBoundaries.every(control => control.ratio >= 3), `${label} graph search and unchecked filter boundaries must retain 3:1 contrast`);
        check(graph.graph?.timeOrigin === originalTimeOrigin, `${label} ${view.name} graph must update its theme without reloading`);
        check(graph.graph?.theme?.scheme === scheme && graph.graph.sceneMatches, `${label} ${view.name} graph scene must follow the native palette`);
        if (view.name === "2d") {
          check(graph.graph.labelsMinimum >= 4.5 && graph.graph.checkboxRatio >= 3, `${label} 2D graph canvas labels and checkbox mark must remain readable`);
          // The governed mobile graph intentionally omits the desktop legend.
          // Check filtering where it is offered, and exercise the visible
          // search/details workflow at both viewport sizes.
          if (viewport.name === "desktop") {
            await frame.locator(".legend-cb").first().uncheck();
            const filtered = await inspectThemeContrast(frame, [".legend-item.dimmed .legend-label"], view.name);
            checkThemeContrast(filtered, `${label} filtered 2D graph`);
            check(filtered.graph.checkboxRatio >= 3, `${label} 2D graph mixed checkbox must retain contrast`);
            check(filtered.graph.controlBoundaries.every(control => control.ratio >= 3), `${label} 2D graph unchecked filter boundaries must retain 3:1 contrast`);
            await frame.locator(".legend-cb").first().check();
            graph.filtered = filtered;
          }
          await frame.locator("#search").fill("architecture");
          await frame.locator(".search-item").first().waitFor({ state: "visible" });
          const results = await inspectThemeContrast(frame, [".search-item"], view.name);
          checkThemeContrast(results, `${label} 2D graph search`);
          await frame.locator(".search-item").first().click();
          const selected = await inspectThemeContrast(frame, ["#info-content .field", "#info-content .field b", ".neighbor-link"], view.name);
          checkThemeContrast(selected, `${label} 2D graph selected details`);
          graph.search = results;
          graph.selected = selected;
        }
        themedGraphs[view.name] = graph;
      }
      paletteMetrics[viewport.name][scheme] = { control, keyboard: focus, persistedReload: true, persistedNavigation: true,
        governing, content, table, mobileScroll, diagram, search, graph: themedGraphs };
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
  const offOriginRequests = [...new Set(resourceRequests.filter(({ url, type }) => /^https?:/u.test(url)
    && new URL(url).origin !== baseUrl
    && (["script", "xhr", "fetch", "websocket"].includes(type) || new URL(url).pathname.endsWith("/sitemap.xml")))
    .map(({ url }) => url))];
  check(offOriginRequests.length === 0, `Browser fetched code, data or sitemaps outside the served build: ${offOriginRequests.join("; ")}`);
  check(consoleErrors.length === 0, `Browser console errors occurred: ${consoleErrors.join("; ")}`);

  if (failures.length) throw new Error(`Runtime browser contract failed:\n- ${failures.join("\n- ")}`);

  return {
    ok: true,
    search: searchLifecycle,
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
      repetitionRouteCount: governingQuestionRepetitionRoutes.length,
      repetitionRoutes: governingQuestionRepetitionRoutes,
      repetitions: {
        desktop: desktopGoverningQuestionRepetitions,
        mobile: mobileGoverningQuestionRepetitions,
      },
    },
    draftNavigation: {
      desktop: desktopDraftNavigation,
    },
    sourceLinks: {
      desktop: desktopSourceLink,
      mobile: mobileSourceLink,
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
    palettes: paletteMetrics,
    localRuntimeAssets: localAssets,
    requestCount: requests.length,
  };
}
