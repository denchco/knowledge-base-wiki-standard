#!/usr/bin/env node
// This isolated fixture uses the pinned renderer and its real native palette.
// It never changes the reference Wiki's appearance or managed preview service.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { deriveAppearance } from "./wiki-appearance.mjs";
import { patchZensicalRuntime } from "./patch-zensical-runtime.mjs";

const root = process.cwd();
const output = path.join(root, "output/verification/appearance");
const widthKey = "denchco-kb-wiki-layout-width";
const paletteSelector = 'form[data-md-component="palette"]';
const fixtures = [
  { name: "pale-light-wide", config: { schemaVersion: "1.0", accent: "#e1efdd", appearance: "light", width: "wide" } },
  { name: "blue-dark-standard", config: { schemaVersion: "1.0", accent: "#005ea8", appearance: "dark", width: "standard" } },
  { name: "unconfigured", config: null },
];
const report = { ok: false, renderer: "zensical-0.0.59", cases: [] };
let browser;
let activePage;
let failure;
fs.mkdirSync(output, { recursive: true });

try {
  execFileSync(process.execPath, ["scripts/check-reference-toolchain.mjs"], { cwd: root, stdio: "pipe" });
  for (const fixture of fixtures) {
    fixture.siteDir = buildFixture(fixture);
    if (fixture.config) fixture.alternateSiteDir = buildFixture({
      name: `${fixture.name}-changed-default`,
      config: { ...fixture.config, appearance: fixture.config.appearance === "light" ? "dark" : "light" },
    });
  }
  browser = await chromium.launch({ headless: true });
  for (const fixture of fixtures) {
    const siteDir = fixture.siteDir;
    const server = spawn(process.execPath, [path.join(root, "scripts/serve-built-site.mjs")], {
      cwd: root,
      env: { ...process.env, HOST: "127.0.0.1", PORT: "0", SITE_DIR: siteDir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      const origin = await waitForServer(server);
      if (!fixture.config) {
        for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
          await runUnconfiguredCase(origin, viewport);
        }
        for (const mode of ["missing", "invalid", "unavailable"]) await runWidthStorageCase(fixture, origin, mode);
        for (const savedWidth of ["standard", "wide"]) await runSavedWidthCase(fixture, origin, savedWidth);
        continue;
      }
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        await runCase(fixture, origin, viewport);
      }
      await runWidthStorageCase(fixture, origin, "invalid");
      await runWidthStorageCase(fixture, origin, "unavailable");
      for (const savedWidth of ["standard", "wide"]) await runSavedWidthCase(fixture, origin, savedWidth);
      for (const scheme of ["default", "slate"]) await runAdoptionCase(fixture, origin, scheme);
    } finally {
      server.kill("SIGTERM");
    }
  }
  report.ok = true;
} catch (error) {
  failure = error;
  report.error = error.stack ?? String(error);
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  }
} finally {
  await browser?.close();
  fs.writeFileSync(path.join(output, "contract.json"), `${JSON.stringify(report, null, 2)}\n`);
}
if (failure) {
  console.error(`Appearance browser fixtures failed: ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log(`Appearance browser fixtures passed: ${report.cases.length} cases; native light/dark defaults, exact accent surfaces, contrast, Wide fallback without configuration, saved choices across adoption/default changes, width storage fallback and 390px containment.`);
}

function buildFixture(fixture) {
  const directory = path.join(output, fixture.name);
  fs.rmSync(directory, { recursive: true, force: true });
  const docs = path.join(directory, "docs");
  const assets = path.join(docs, "assets");
  const site = path.join(directory, "site");
  fs.mkdirSync(assets, { recursive: true });
  for (const filename of ["theme.css", "content.css", "layout-width.css", "wiki.js", "layout-width.js"]) {
    fs.copyFileSync(path.join(root, "docs/assets", filename), path.join(assets, filename));
  }
  const content = `---\nstatus: draft\nsubtitle: Fixture subtitle\nicon: lucide/house\n---\n\n# Appearance fixture\n\n<blockquote class="governing-question"><p>Can a reader use the configured appearance?</p></blockquote>\n\nThis fixture tests the real renderer. [Read the second page](second.md).\n\n| First column | Second column | Third column | Fourth column | Fifth column | Sixth column |\n|---|---|---|---|---|---|\n| Long fixture content for narrow screens | Saved choices persist | Native palette control | Configured width fallback | Visible source accent | Contained table scrolling |\n`;
  fs.writeFileSync(path.join(docs, "index.md"), content);
  fs.cpSync(path.join(root, "overrides"), path.join(directory, "overrides"), { recursive: true });
  fs.writeFileSync(path.join(docs, "second.md"), content.replace("status: draft", "status: stable").replace("# Appearance fixture", "# Second page").replace("[Read the second page](second.md)", "[Return to fixture](index.md)"));
  for (const [slug, title, status] of [["deprecated", "Deprecated page", "deprecated"], ["unmapped", "Unmapped page", "unmapped-lifecycle"], ["plain", "Plain page", null]]) {
    fs.writeFileSync(path.join(docs, `${slug}.md`), `${status ? `---\nstatus: ${status}\n---\n\n` : ""}# ${title}\n\nNavigation fixture.\n`);
  }
  const toml = `[project]\nsite_name = "Appearance fixture"\nsite_url = "http://127.0.0.1/"\ndocs_dir = "docs"\nsite_dir = "site"\nextra_css = ["assets/content.css", "assets/layout-width.css", "assets/theme.css"]\nextra_javascript = ["assets/wiki.js", "assets/layout-width.js"]\nnav = [{"Pages" = [{"Home" = "index.md"}, {"Second page" = "second.md"}, {"Deprecated page" = "deprecated.md"}, {"Unmapped page" = "unmapped.md"}, {"Plain page" = "plain.md"}]}]\n\n[project.markdown_extensions]\ntables = {}\n\n[project.theme]\ncustom_dir = "overrides"\nfont = false\nfeatures = ["navigation.instant"]\n\n[[project.theme.palette]]\nscheme = "default"\nprimary = "custom"\naccent = "custom"\ntoggle.icon = "lucide/moon"\ntoggle.name = "Switch to dark mode"\n\n[[project.theme.palette]]\nscheme = "slate"\nprimary = "custom"\naccent = "custom"\ntoggle.icon = "lucide/sun"\ntoggle.name = "Switch to light mode"\n`;
  fs.writeFileSync(path.join(directory, "zensical.toml"), toml);
  if (fixture.config) {
    fixture.derived = deriveAppearance(fixture.config);
    fs.mkdirSync(path.join(directory, "config"), { recursive: true });
    fs.writeFileSync(path.join(directory, "config/wiki-appearance.json"), `${JSON.stringify(fixture.config, null, 2)}\n`);
  }
  // Exercise the consumer entry point, including its no-configuration path.
  execFileSync(process.execPath, [path.join(root, "scripts/prepare-wiki-appearance.mjs")], { cwd: directory, stdio: "pipe" });
  const configFile = path.join(directory, "zensical.appearance.toml");
  try {
    execFileSync("uv", ["run", "zensical", "build", "-f", configFile, "--strict"], { cwd: directory, stdio: "pipe", timeout: 60000 });
  } catch (error) {
    throw new Error(`Cannot build ${fixture.name}: ${error.stderr?.toString() || error.message}`);
  }
  patchZensicalRuntime(site);
  return site;
}

async function createContext(origin, viewport = { width: 1440, height: 1000 }) {
  // Opposite OS preference proves that the explicit default wins.
  const context = await browser.newContext({ viewport, colorScheme: "dark" });
  const errors = [];
  const external = [];
  const requests = [];
  await context.route("**/*", route => {
    const url = route.request().url();
    if (/^https?:/u.test(url) && new URL(url).origin !== new URL(origin).origin) {
      external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  activePage = page;
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on("request", request => requests.push(request.url()));
  return { context, page, errors, external, requests };
}

async function ready(page, scheme, width) {
  await page.waitForSelector(".layout-width-toggle", { state: "attached" });
  await page.waitForFunction(({ scheme, width }) => document.body.dataset.mdColorScheme === scheme && document.documentElement.dataset.layoutWidth === width, { scheme, width });
  assert.equal(await page.locator(`${paletteSelector} input:checked`).getAttribute("data-md-color-scheme"), scheme, "Native palette radio must reflect the resolved appearance");
}

async function setScheme(page, scheme) {
  if (await page.locator("body").getAttribute("data-md-color-scheme") === scheme) return;
  const input = page.locator(`${paletteSelector} input[data-md-color-scheme="${scheme}"]`);
  const id = await input.getAttribute("id");
  assert.ok(id, `Native ${scheme} radio is present`);
  await page.locator(`${paletteSelector} label[for="${id}"]:visible`).click();
  await page.waitForFunction(expected => document.body.dataset.mdColorScheme === expected, scheme);
}

async function runCase(fixture, origin, viewport) {
  const { config, derived } = fixture;
  const scheme = config.appearance === "light" ? "default" : "slate";
  const changedScheme = scheme === "default" ? "slate" : "default";
  const changedWidth = config.width === "wide" ? "standard" : "wide";
  const state = await createContext(origin, viewport);
  const { context, page } = state;
  // Test the dark default against a light OS as well.
  await page.emulateMedia({ colorScheme: config.appearance === "light" ? "dark" : "light" });
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    await ready(page, scheme, config.width);
    assert.equal(await page.locator("html").getAttribute("data-layout-default-width"), config.width);
    const native = await page.evaluate(() => ({
      generator: document.querySelector('meta[name="generator"]')?.content,
      paletteCount: document.querySelectorAll('form[data-md-component="palette"] input[type="radio"]').length,
      mediaQueries: [...document.querySelectorAll('form[data-md-component="palette"] input')].map(input => input.dataset.mdColorMedia || null),
      appearanceScripts: [...document.scripts].filter(script => script.src.endsWith("/assets/appearance/appearance.js")).length,
    }));
    assert.equal(native.generator, "zensical-0.0.59");
    assert.equal(native.paletteCount, 2);
    assert.equal(native.appearanceScripts, 1);
    assert.deepEqual([...native.mediaQueries].sort(), ["all", "not all"], "Native defaults must use unconditional media, independent of the OS");
    const navigation = await inspectNavigation(page);
    const initial = await inspectAppearance(page, config.accent, derived[config.appearance], viewport.width);
    const initialGridWidth = await page.locator(".md-main__inner").evaluate(node => node.getBoundingClientRect().width);
    if (viewport.width >= 960) {
      await page.locator(".layout-width-toggle").click();
      await ready(page, scheme, changedWidth);
      const changedGridWidth = await page.locator(".md-main__inner").evaluate(node => node.getBoundingClientRect().width);
      assert.ok(Math.abs(initialGridWidth - changedGridWidth) > 100, "Width toggle must change the rendered desktop rail");
      assert.equal(await page.evaluate(key => localStorage.getItem(key), widthKey), changedWidth);
    } else {
      assert.equal(await page.locator(".layout-width-toggle").isVisible(), false, "Mobile hides the width control");
    }
    await setScheme(page, changedScheme);
    await ready(page, changedScheme, viewport.width >= 960 ? changedWidth : config.width);
    const changed = await inspectAppearance(page, config.accent, derived[config.appearance === "light" ? "dark" : "light"], viewport.width);
    // Read Zensical's storage only after using its native control; never fake its state.
    const nativePreference = await page.evaluate(() => [...Array(localStorage.length)].map((_, index) => localStorage.key(index)).filter(key => key.endsWith(".__palette")));
    assert.equal(nativePreference.length, 1, "The native palette must own one stored preference");
    await page.screenshot({ path: path.join(output, `${fixture.name}-${viewport.width}-alternate.png`), fullPage: true });
    await page.getByRole("link", { name: "Read the second page", exact: true }).click();
    await page.waitForURL("**/second/");
    await ready(page, changedScheme, viewport.width >= 960 ? changedWidth : config.width);
    await page.reload({ waitUntil: "networkidle" });
    await ready(page, changedScheme, viewport.width >= 960 ? changedWidth : config.width);
    await inspectAppearance(page, config.accent, derived[config.appearance === "light" ? "dark" : "light"], viewport.width);
    await setScheme(page, scheme);
    if (viewport.width >= 960) await page.locator(".layout-width-toggle").click();
    await ready(page, scheme, config.width);
    await page.screenshot({ path: path.join(output, `${fixture.name}-${viewport.width}-default.png`), fullPage: true });
    assert.deepEqual(state.external, [], "Fixture must use local assets only");
    assert.deepEqual(state.errors, [], "No browser or asset errors");
    assert.ok(state.requests.some(url => url.endsWith("bundle.344b8276.min.js")), "Pinned native renderer bundle must execute");
    report.cases.push({ fixture: fixture.name, viewport, initial, alternate: changed, native, navigation, savedPreferenceSurvivedNavigationAndReload: true });
  } finally {
    await context.close();
  }
}

async function runWidthStorageCase(fixture, origin, mode) {
  const state = await createContext(origin);
  const { context, page } = state;
  await context.addInitScript(({ mode, key }) => {
    if (mode === "invalid") {
      localStorage.setItem(key, "neither-wide-nor-standard");
    } else if (mode === "unavailable") {
      for (const name of ["getItem", "setItem"]) {
        const original = Storage.prototype[name];
        Storage.prototype[name] = function (...args) {
          if (args[0] === key) throw new DOMException("Fixture storage unavailable", "SecurityError");
          return original.apply(this, args);
        };
      }
    }
  }, { mode, key: widthKey });
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    const scheme = fixture.config?.appearance === "dark" ? "slate" : "default";
    const defaultWidth = fixture.config?.width ?? "wide";
    await ready(page, scheme, defaultWidth);
    await assertMobileWidthPersistence(page, defaultWidth);
    await page.locator(".layout-width-toggle").click();
    const changedWidth = defaultWidth === "wide" ? "standard" : "wide";
    await ready(page, scheme, changedWidth);
    await page.reload({ waitUntil: "networkidle" });
    const restoredWidth = mode === "missing" ? changedWidth : defaultWidth;
    await ready(page, scheme, restoredWidth);
    await page.getByRole("link", { name: "Read the second page", exact: true }).click();
    await page.waitForURL("**/second/");
    await ready(page, scheme, restoredWidth);
    await page.reload({ waitUntil: "networkidle" });
    await ready(page, scheme, restoredWidth);
    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.external, []);
    report.cases.push({ fixture: fixture.name, storage: mode, defaultWidth, restoredWidth, controlRemainsOperable: true });
  } finally {
    await context.close();
  }
}

async function assertMobileWidthPersistence(page, expectedWidth) {
  const desktop = page.viewportSize();
  const saved = () => page.evaluate(key => {
    try { return localStorage.getItem(key); } catch { return "storage-unavailable"; }
  }, widthKey);
  const prior = await saved();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator(".layout-width-toggle").isVisible(), false, "Mobile keeps the desktop width control hidden");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Mobile remains contained for both desktop width choices");
  assert.equal(await page.locator("html").getAttribute("data-layout-width"), expectedWidth);
  assert.equal(await saved(), prior, "Resizing must not replace a saved desktop width");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("data-layout-width"), expectedWidth, "Mobile reload preserves the resolved desktop width");
  assert.equal(await saved(), prior, "Mobile reload must not replace a saved desktop width");
  await page.setViewportSize(desktop);
  assert.equal(await page.locator(".layout-width-toggle").getAttribute("aria-pressed"), String(expectedWidth === "wide"));
}

async function runSavedWidthCase(fixture, origin, savedWidth) {
  const state = await createContext(origin);
  const { context, page } = state;
  const scheme = fixture.config?.appearance === "dark" ? "slate" : "default";
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    await ready(page, scheme, fixture.config?.width ?? "wide");
    // Save both choices through the reader control, including the initial default.
    await page.locator(".layout-width-toggle").click();
    if (await page.locator("html").getAttribute("data-layout-width") !== savedWidth) {
      await page.locator(".layout-width-toggle").click();
    }
    await ready(page, scheme, savedWidth);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), widthKey), savedWidth);
    await page.getByRole("link", { name: "Read the second page", exact: true }).click();
    await page.waitForURL("**/second/");
    await ready(page, scheme, savedWidth);
    await page.reload({ waitUntil: "networkidle" });
    await ready(page, scheme, savedWidth);
    await assertMobileWidthPersistence(page, savedWidth);
    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.external, []);
    report.cases.push({ fixture: fixture.name, savedWidth, survivedNavigationReloadAndMobile: true });
  } finally {
    await context.close();
  }
}

async function runAdoptionCase(fixture, origin, savedScheme) {
  const state = await createContext(origin);
  const { context, page } = state;
  const rootUrl = new URL("/", origin).href;
  const legacySite = fixtures.find(item => !item.config).siteDir;
  const savedWidth = fixture.config.width === "wide" ? "standard" : "wide";
  const readSavedPalette = () => page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.endsWith(".__palette"));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
  try {
    // Serve the real unconfigured build at the same URL to model adoption.
    // Set preferences through native controls, before the adapter exists.
    await context.route(rootUrl, route => route.fulfill({ path: path.join(legacySite, "index.html"), contentType: "text/html" }));
    await page.goto(rootUrl, { waitUntil: "networkidle" });
    await ready(page, "default", "wide");
    await setScheme(page, savedScheme === "default" ? "slate" : "default");
    await setScheme(page, savedScheme);
    await page.locator(".layout-width-toggle").click();
    if (savedWidth === "wide") await page.locator(".layout-width-toggle").click();
    await ready(page, savedScheme, savedWidth);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), widthKey), savedWidth);
    const saved = await readSavedPalette();
    assert.equal(saved?.color.scheme, savedScheme);

    await context.unroute(rootUrl);
    await page.reload({ waitUntil: "networkidle" });
    await ready(page, savedScheme, savedWidth);
    const adopted = await readSavedPalette();
    assert.equal(adopted.index, saved.index, "Adoption must retain native palette indexes");
    assert.equal(adopted.color.scheme, savedScheme, "Adoption must retain the saved appearance");

    // This second real build changes only the configured initial appearance.
    await context.route(rootUrl, route => route.fulfill({ path: path.join(fixture.alternateSiteDir, "index.html"), contentType: "text/html" }));
    await page.reload({ waitUntil: "networkidle" });
    await ready(page, savedScheme, savedWidth);
    const changedDefault = await readSavedPalette();
    assert.equal(changedDefault.index, saved.index);
    assert.equal(changedDefault.color.scheme, savedScheme, "A later default change must retain the saved appearance");
    await page.getByRole("link", { name: "Read the second page", exact: true }).click();
    await page.waitForURL("**/second/");
    await page.reload({ waitUntil: "networkidle" });
    await ready(page, savedScheme, savedWidth);
    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.external, []);
    report.cases.push({ fixture: fixture.name, adoption: true, savedScheme, savedWidth, nativeIndex: saved.index, survivedChangedDefaultAndNavigation: true });
  } finally {
    await context.close();
  }
}

async function runUnconfiguredCase(origin, viewport) {
  const state = await createContext(origin, viewport);
  const { context, page } = state;
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    await ready(page, "default", "wide");
    const navigation = await inspectNavigation(page);
    assert.equal(await page.locator("html").getAttribute("data-layout-default-width"), null);
    assert.equal(await page.locator('script[src$="/assets/appearance/appearance.js"]').count(), 0);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), widthKey), null, "Fresh Wide must not need a saved choice");
    if (viewport.width === 390) {
      assert.equal(await page.locator(".layout-width-toggle").isVisible(), false);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    } else {
      const wide = await page.locator(".md-main__inner").evaluate(element => element.getBoundingClientRect().width);
      await page.locator(".layout-width-toggle").click();
      await ready(page, "default", "standard");
      const standard = await page.locator(".md-main__inner").evaluate(element => element.getBoundingClientRect().width);
      assert.ok(wide - standard > 100, "Fresh unconfigured Wide must widen the actual desktop content rail");
    }
    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.external, []);
    report.cases.push({ fixture: "unconfigured", defaultWidth: "wide", scheme: "default", viewport, navigation });
  } finally {
    await context.close();
  }
}

async function inspectNavigation(page) {
  const mobile = page.viewportSize().width < 1220;
  if (mobile) await page.locator('.md-header label[for="__drawer"]').click();
  const navigation = page.locator(".md-nav--primary");
  assert.ok(await navigation.getAttribute("aria-label"), "Navigation keeps its accessible name");
  assert.equal(await navigation.locator(".md-status").count(), 0,
    "Draft, stable, deprecated and unmapped lifecycle values must emit no status or fallback icon");
  const expected = ["Home", "Second page", "Deprecated page", "Unmapped page", "Plain page"];
  for (const title of expected) {
    const link = navigation.getByRole("link", { name: new RegExp(`^${title}(?: Fixture subtitle)?$`, "u") });
    assert.equal(await link.count(), 1, `Navigation preserves the ${title} title`);
    await link.focus();
    assert.equal(await link.evaluate(element => document.activeElement === element), true,
      `${title} remains keyboard focusable`);
  }
  const home = navigation.getByRole("link", { name: "Home Fixture subtitle", exact: true });
  assert.equal(await home.locator("small").textContent(), "Fixture subtitle", "Page subtitles remain intact");
  assert.equal(await home.locator("svg").count(), 1, "Explicit page icons remain intact");
  const control = navigation.locator('.md-nav__item--nested > label.md-nav__link[tabindex="0"]').first();
  const id = await control.getAttribute("for");
  assert.ok(id, "Section control retains its native toggle association");
  assert.equal(await control.locator(".md-nav__icon").count(), 1, "Section chevron remains intact");
  const toggle = navigation.locator(`input[id="${id}"]`);
  const wasChecked = await toggle.isChecked();
  await control.focus();
  assert.equal(await control.evaluate(element => document.activeElement === element), true, "Section control accepts keyboard focus");
  await control.press("Enter");
  await page.waitForFunction(({ id, expected }) => document.getElementById(id).checked === expected, { id, expected: !wasChecked });
  await control.press("Enter");
  await page.waitForFunction(({ id, expected }) => document.getElementById(id).checked === expected, { id, expected: wasChecked });
  assert.equal(await page.locator(".md-content h1").textContent(), "Appearance fixture");
  assert.match(await page.title(), /Appearance fixture/u);
  if (mobile) await page.reload({ waitUntil: "networkidle" });
  return { lifecycleValues: ["draft", "stable", "deprecated", "unmapped-lifecycle", null], statusCount: 0,
    pageTitles: expected, pageIconAndSubtitlePreserved: true, keyboardSectionToggle: true, mobile };
}

async function inspectAppearance(page, accent, palette, viewportWidth) {
  const snapshot = await page.evaluate(() => {
    const rgba = value => {
      const values = value.match(/[\d.]+/gu)?.map(Number) || [];
      return [...values.slice(0, 3), values[3] ?? 1];
    };
    const over = (front, back) => [...front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3])), 1];
    const effectiveBackground = element => {
      const ancestors = [];
      for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
      return ancestors.reduce((color, node) => over(rgba(getComputedStyle(node).backgroundColor), color), [255, 255, 255, 1]);
    };
    const luminance = color => color.slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (left, right) => {
      const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
      return (values[0] + .05) / (values[1] + .05);
    };
    const inspect = (selector, pseudo) => {
      const element = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!element) throw new Error(`Fixture lacks ${selector}`);
      const style = getComputedStyle(element, pseudo);
      const background = effectiveBackground(element);
      const color = rgba(pseudo ? style.backgroundColor : style.color);
      return { color: color.slice(0, 3), background: background.slice(0, 3), ownBackground: style.backgroundColor, contrast: contrast(over(color, background), background) };
    };
    let tableScroller = document.querySelector(".md-typeset table");
    while (tableScroller && !["auto", "scroll"].includes(getComputedStyle(tableScroller).overflowX)) tableScroller = tableScroller.parentElement;
    if (!tableScroller) throw new Error("Fixture table has no horizontal scroll container");
    const priorScroll = tableScroller.scrollLeft;
    tableScroller.scrollLeft = 30;
    const table = { clientWidth: tableScroller.clientWidth, scrollWidth: tableScroller.scrollWidth, scrollMoved: tableScroller.scrollLeft > 0, overflowX: getComputedStyle(tableScroller).overflowX };
    tableScroller.scrollLeft = priorScroll;
    return {
      tableScroller: table,
      scheme: document.body.dataset.mdColorScheme,
      header: inspect(".md-header__topic"),
      headerControls: [...document.querySelectorAll(".md-header__button, .layout-width-toggle")]
        .filter(element => element.getBoundingClientRect().width > 0)
        .map(element => ({ label: element.getAttribute("aria-label") || element.getAttribute("title") || element.tagName, ...inspect(element) })),
      question: inspect("blockquote.governing-question p"),
      table: inspect(".md-typeset table th"),
      selected: inspect(".md-nav--primary .md-nav__link--active"),
      link: inspect(".md-content p a"),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      paletteVisible: [...document.querySelectorAll('form[data-md-component="palette"] label')].some(label => label.getBoundingClientRect().width > 0),
    };
  });
  report.lastObservation = snapshot;
  const rgb = hex => [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
  assert.deepEqual(snapshot.header.background, rgb(accent), "The supplied accent must be visibly present on the header");
  assert.deepEqual(snapshot.selected.background, rgb(accent), "The supplied accent must be visibly present on selected navigation");
  assert.deepEqual(snapshot.question.background, rgb(palette.questionBackground));
  assert.deepEqual(snapshot.table.background, rgb(palette.tableHeader));
  for (const [role, result] of Object.entries(snapshot)) {
    if (!result || typeof result.contrast !== "number") continue;
    assert.ok(result.contrast >= 4.5, `${role} contrast ${result.contrast.toFixed(2)} is insufficient: ${JSON.stringify(result)}`);
  }
  for (const result of snapshot.headerControls) assert.ok(result.contrast >= 4.5, `Header control ${result.label} contrast ${result.contrast.toFixed(2)} is insufficient`);
  assert.equal(snapshot.viewportWidth, viewportWidth);
  assert.ok(snapshot.documentWidth <= viewportWidth + 1, `Page overflows ${viewportWidth}px viewport by ${snapshot.documentWidth - viewportWidth}px`);
  assert.equal(snapshot.paletteVisible, true, "Native palette control remains visible");
  if (viewportWidth === 390) {
    assert.ok(snapshot.tableScroller.scrollWidth > snapshot.tableScroller.clientWidth, "Mobile fixture must exercise an overflowing table");
    assert.equal(snapshot.tableScroller.overflowX, "auto");
    assert.equal(snapshot.tableScroller.scrollMoved, true, "Every table column must remain reachable by contained scrolling");
  }
  return snapshot;
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`Fixture server did not become ready: ${stderr}`)), 10000);
    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
      for (const line of stdout.split(/\r?\n/u)) {
        try {
          const message = JSON.parse(line);
          if (message.ready && message.url) {
            clearTimeout(timeout);
            resolve(message.url);
          }
        } catch { /* Wait for the complete readiness record. */ }
      }
    });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Fixture server exited ${code}: ${stderr}`)); });
    child.once("error", error => { clearTimeout(timeout); reject(error); });
  });
}
