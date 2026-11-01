import assert from "node:assert/strict";

export const headerControlSelector = ".md-header .md-header__button:not(.md-logo):visible, .md-search__button:visible, .layout-width-toggle:visible";
export const headerHover = {
  default: { background: "rgb(170, 160, 141)", foreground: "rgb(41, 37, 31)" },
  slate: { background: "rgb(148, 135, 116)", foreground: "rgb(32, 28, 23)" },
};

export function rgba(value) {
  const text = String(value).trim();
  if (text === "transparent") return [0, 0, 0, 0];
  if (/^#[\da-f]{6}$/i.test(text)) return [1, 3, 5].map(offset => parseInt(text.slice(offset, offset + 2), 16)).concat(1);
  const match = text.match(/^rgba?\(([^)]+)\)$/);
  assert.ok(match, `Unsupported computed colour: ${value}`);
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  assert.ok(parts.length >= 3 && parts.length <= 4 && parts.every(Number.isFinite), `Invalid computed colour: ${value}`);
  return parts.length === 3 ? [...parts, 1] : parts;
}

export function contrastRatio(foreground, background) {
  const front = rgba(foreground), back = rgba(background);
  assert.equal(back[3], 1, "Contrast requires an opaque background");
  const luminance = color => color.slice(0, 3).map(value => {
    const c = value / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const composed = front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
  const a = luminance(composed), b = luminance(back);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export function assertNoColourTransition(style, label) {
  const properties = style.transitionProperty.split(",").map(value => value.trim());
  const durations = style.transitionDuration.split(",").map(value => parseFloat(value));
  const delays = style.transitionDelay.split(",").map(value => parseFloat(value));
  for (let index = 0; index < properties.length; index++) {
    if (!/^(?:all|color|background(?:-color)?|opacity|filter|fill|stroke)$/.test(properties[index])) continue;
    assert.equal(durations[index % durations.length], 0, `${label}: foreground/background must switch without a crossfade`);
    assert.equal(delays[index % delays.length], 0, `${label}: foreground/background must switch without delay`);
  }
}

export function assertHeaderSnapshot(snapshot, { scheme, state = "rest", label = scheme } = {}) {
  assert.ok(headerHover[scheme], `${label}: known appearance required`);
  assert.equal(snapshot.scheme, scheme, `${label}: active appearance differs`);
  assert.ok(snapshot.controls.length >= 3, `${label}: expected Search, appearance and width/menu actions`);
  assert.equal(snapshot.visiblePaletteLabels, 1, `${label}: exactly one native appearance action must be visible`);
  assert.equal(snapshot.revealedHiddenLabels, 0, `${label}: native hidden labels must remain hidden`);
  assert.equal(snapshot.hiddenTabStops, 0, `${label}: hidden actions must not enter the tab order`);
  assert.ok(snapshot.pageOverflow <= 1, `${label}: header must not create page overflow (${snapshot.pageOverflow}px)`);
  assert.equal(snapshot.header.background, snapshot.tokens["header-surface"], `${label}: the rendered header preserves its semantic brand surface`);
  assert.equal(rgba(snapshot.header.background)[3], 1, `${label}: header surface must be opaque`);
  for (const logo of snapshot.logos) {
    assert.equal(rgba(logo.background)[3], 0, `${label}: logos must remain unframed`);
    assert.equal(logo.borderWidth, 0, `${label}: logos must not have a control border`);
    assert.equal(logo.boxShadow, "none", `${label}: logos must not have a control shadow`);
  }
  const textRatios = [], iconRatios = [];
  for (const control of snapshot.controls) {
    const name = `${label}/${control.name}`;
    const expectedHeight = snapshot.rem * 1.6 * snapshot.zoom;
    assert.ok(Math.abs(control.height - expectedHeight) <= .5, `${name}: height ${control.height} must equal 1.6rem (${expectedHeight})`);
    assert.ok(control.radii.every(radius => Math.abs(radius - snapshot.rem * .4) <= .05), `${name}: rounding must equal .4rem on every corner`);
    assert.ok(Math.abs(control.centreY - snapshot.controls[0].centreY) <= .5, `${name}: controls must share a vertical centre`);
    assert.equal(rgba(control.background)[3], 1, `${name}: backgrounds must be opaque`);
    assert.equal(control.opacity, 1, `${name}: control opacity must not fade its foreground/background`);
    if (control.square) {
      assert.ok(Math.abs(control.width - control.height) <= .5, `${name}: icon-only control must be square`);
      assert.ok(control.svg, `${name}: icon-only control must contain the actual SVG`);
      assert.ok(Math.abs(control.svg.offsetX) <= .5 && Math.abs(control.svg.offsetY) <= .5,
        `${name}: actual SVG must be centred within .5 CSS pixels (${JSON.stringify(control.svg)})`);
    }
    if (control.svg) assert.ok(Math.abs(control.svg.offsetY) <= .5, `${name}: actual SVG must be vertically centred within .5 CSS pixels`);
    if (control.kind === "width") assert.ok(control.group && Math.abs(control.group.offsetX) <= .5 && Math.abs(control.group.offsetY) <= .5,
      `${name}: Wide icon/text group must be centred within .5 CSS pixels`);
    assertNoColourTransition(control.transition, name);
    const ratio = contrastRatio(control.foreground, control.background);
    (control.square ? iconRatios : textRatios).push(ratio);
    assert.ok(ratio >= (control.square ? 3 : 4.5), `${name}: accessible contrast is insufficient (${ratio})`);
    if (state === "rest") {
      const selected = control.kind === "width" && snapshot.width === "wide";
      assert.equal(control.background, snapshot.tokens[selected ? "header-selected" : "header-control-surface"], `${name}: rest/selected semantic background`);
      assert.equal(control.foreground, snapshot.tokens[selected ? "header-selected-text" : "header-text"], `${name}: rest/selected semantic foreground`);
    }
    if (control.searchParts) assertSearchParts(control.searchParts, control, snapshot.tokens, name);
  }
  return { minimumTextContrast: textRatios.length ? Math.min(...textRatios) : null, minimumIconContrast: iconRatios.length ? Math.min(...iconRatios) : null };
}

export function assertSearchParts(parts, control, tokens, label) {
  for (const [name, part] of Object.entries(parts.rendered)) {
    assert.ok(part.display !== "none" && part.visibility === "visible" && part.opacity === 1 && part.width > 0 && part.height > 0 && !["none", "normal"].includes(part.content), `${label}: Search ${name} must remain rendered and readable`);
  }
  assert.ok(!['""', "''"].includes(parts.rendered.shortcut.content), `${label}: shortcut text must not be empty`);
  assert.equal(parts.icon, control.foreground, `${label}: Search magnifier must follow the readable foreground`);
  assert.equal(parts.shortcutBackground, tokens["header-control-surface"], `${label}: shortcut badge must keep its opaque rest surface`);
  assert.equal(parts.shortcutForeground, tokens["header-text"], `${label}: shortcut badge must keep its readable text`);
  assert.equal(rgba(parts.shortcutBackground)[3], 1, `${label}: shortcut badge must be opaque`);
  assert.ok(contrastRatio(parts.shortcutForeground, parts.shortcutBackground) >= 4.5, `${label}: shortcut text contrast`);
  assert.ok(contrastRatio(parts.icon, control.background) >= 3, `${label}: magnifier contrast`);
  assertNoColourTransition(parts.beforeTransition, `${label}/magnifier`);
  assertNoColourTransition(parts.afterTransition, `${label}/shortcut`);
}

export async function measureHeader(page) {
  return page.evaluate(() => {
    const visible = element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const transition = style => ({ transitionProperty: style.transitionProperty, transitionDuration: style.transitionDuration, transitionDelay: style.transitionDelay });
    const rendered = style => ({ content: style.content, display: style.display, visibility: style.visibility, opacity: Number(style.opacity), width: parseFloat(style.width), height: parseFloat(style.height) });
    const metric = element => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      const icon = element.querySelector(":scope > svg")?.getBoundingClientRect();
      const square = element.classList.contains("md-header__button");
      const kind = element.classList.contains("layout-width-toggle") ? "width" : element.classList.contains("md-search__button") ? "search" : "icon";
      const before = getComputedStyle(element, "::before"), after = getComputedStyle(element, "::after");
      const text = kind === "width" ? element.querySelector(":scope > span")?.getBoundingClientRect() : null;
      const group = icon && text ? { left: Math.min(icon.left, text.left), right: Math.max(icon.right, text.right), top: Math.min(icon.top, text.top), bottom: Math.max(icon.bottom, text.bottom) } : null;
      return {
        name: element.getAttribute("aria-label") || element.title || element.textContent.trim() || element.getAttribute("for"),
        kind, square, width: box.width, height: box.height, centreY: box.top + box.height / 2,
        radii: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(parseFloat), background: style.backgroundColor, foreground: style.color,
        opacity: Number(style.opacity), transition: transition(style),
        svg: icon ? { width: icon.width, height: icon.height, offsetX: icon.left + icon.width / 2 - box.left - box.width / 2, offsetY: icon.top + icon.height / 2 - box.top - box.height / 2 } : null,
        group: group ? { offsetX: (group.left + group.right - box.left - box.right) / 2, offsetY: (group.top + group.bottom - box.top - box.bottom) / 2 } : null,
        searchParts: kind === "search" ? {
          icon: before.backgroundColor, shortcutBackground: after.backgroundColor, shortcutForeground: after.color,
          beforeTransition: transition(before), afterTransition: transition(after),
          rendered: { magnifier: rendered(before), shortcut: rendered(after) },
        } : null,
      };
    };
    const probe = document.createElement("span"); document.body.append(probe);
    const tokens = {};
    for (const token of ["header-surface", "header-text", "header-control-surface", "header-hover", "header-hover-text", "header-selected", "header-selected-text"]) {
      probe.style.color = `var(--${token})`; tokens[token] = getComputedStyle(probe).color;
    }
    probe.remove();
    const controls = [...document.querySelectorAll(".md-header .md-header__button:not(.md-logo), .md-search__button, .layout-width-toggle")].filter(visible);
    return {
      scheme: document.body.dataset.mdColorScheme, width: document.documentElement.dataset.layoutWidth,
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize), zoom: parseFloat(getComputedStyle(document.documentElement).zoom) || 1,
      tokens, header: { background: getComputedStyle(document.querySelector(".md-header")).backgroundColor },
      controls: controls.map(metric), pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      visiblePaletteLabels: [...document.querySelectorAll('form[data-md-component="palette"] label')].filter(visible).length,
      revealedHiddenLabels: [...document.querySelectorAll('.md-header label[hidden]')].filter(visible).length,
      hiddenTabStops: [...document.querySelectorAll('.md-header label[tabindex]')].filter(element => !visible(element) && element.tabIndex >= 0).length,
      logos: [...document.querySelectorAll('.md-header .md-logo, .md-header .md-logo img, .md-header .md-logo > svg')].filter(visible).map(element => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, borderWidth: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].reduce((sum, value) => sum + parseFloat(value), 0), boxShadow: style.boxShadow };
      }),
    };
  });
}

export async function inspectHeaderControls(page, { scheme, label = scheme, hover = true, artworkSizes = false } = {}) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(0, 200);
  const snapshot = await measureHeader(page);
  const contrast = assertHeaderSnapshot(snapshot, { scheme, label });
  const hovered = [];
  if (hover) for (const control of await page.locator(headerControlSelector).all()) {
    await control.hover();
    const samples = [];
    for (let frame = 0; frame < 3; frame++) {
      const sample = await control.evaluate(element => {
        const style = getComputedStyle(element), before = getComputedStyle(element, "::before"), after = getComputedStyle(element, "::after");
        return { background: style.backgroundColor, foreground: style.color, icon: before.backgroundColor, badge: after.backgroundColor, badgeText: after.color };
      });
      assert.equal(sample.background, headerHover[scheme].background, `${label}: every action including selected Wide must use the fixed brown hover`);
      assert.equal(sample.foreground, headerHover[scheme].foreground, `${label}: brown hover foreground must switch with background`);
      assert.ok(contrastRatio(sample.foreground, sample.background) >= 4.5, `${label}: hover contrast`);
      if (await control.evaluate(element => element.classList.contains("md-search__button"))) {
        assert.equal(sample.icon, sample.foreground, `${label}: hovered Search magnifier`);
        assert.equal(sample.badge, snapshot.tokens["header-control-surface"], `${label}: hovered shortcut surface`);
        assert.equal(sample.badgeText, snapshot.tokens["header-text"], `${label}: hovered shortcut text`);
      }
      samples.push(sample);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    hovered.push(samples);
  }
  await page.mouse.move(0, 200);
  const resized = [];
  if (artworkSizes) for (const size of [13, 21]) {
    const style = await page.addStyleTag({ content: `.md-header__button:not(.md-logo) > svg { width:${size}px!important; height:${size}px!important; }` });
    try {
      const changed = await measureHeader(page);
      assertHeaderSnapshot(changed, { scheme, label: `${label}/artwork-${size}px` });
      assert.ok(changed.controls.filter(control => control.square).every(control => Math.abs(control.svg.width - size * changed.zoom) <= .5), `${label}: independent SVG size probe must actually change artwork size`);
      resized.push({ size, controls: changed.controls.filter(control => control.square).map(control => control.svg) });
    } finally { await style.evaluate(element => element.remove()); }
  }
  return { snapshot, contrast, hovered, resized };
}
