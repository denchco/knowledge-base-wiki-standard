#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium, webkit } from "@playwright/test";
import { buildHeaderFixture } from "./header-browser-fixture.mjs";
import { inspectHeaderControls, contrastRatio } from "./header-browser-contract.mjs";

const root = process.cwd(), output = path.join(root, "output/verification/header");
const palette = 'form[data-md-component="palette"]';
const widthKey = "denchco-kb-wiki-layout-width";
const tabNavigationKeys = new WeakMap();
const fixtures = [
  { name: "unconfigured", config: null },
  { name: "pale-brand", config: { schemaVersion: "1.0", accent: "#e1efdd", appearance: "light", width: "wide" } },
  { name: "blue-brand", config: { schemaVersion: "1.0", accent: "#005ea8", appearance: "dark", width: "standard" } },
];
const report = {
  schemaVersion: "1.0", ok: false, requirement: "DKBWS-DESIGN-002", renderer: "zensical-0.0.59",
  engines: {}, cases: [], negativeCases: [], screenshots: [], expectedMatrixCases: 96,
  zoomScope: "Browser-rendered CSS layout zoom at 200%, root text sizing at 200%, and 320 CSS-pixel reflow (400%-equivalent width from 1280). Native browser-chrome zoom UI and OS magnifiers are not automated by this contract.",
};
let activePage, failure;
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "contract.json"), `${JSON.stringify(report, null, 2)}\n`);
try {
  execFileSync(process.execPath, ["scripts/check-reference-toolchain.mjs"], { cwd: root, stdio: "pipe" });
  for (const fixture of fixtures) fixture.site = buildHeaderFixture({ root, output, ...fixture });
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch({ headless: true });
    report.engines[engine] = { version: browser.version(), status: "running", cases: 0, expectedCases: 48 };
    try {
      for (const fixture of fixtures) {
        const server = spawn(process.execPath, [path.join(root, "scripts/serve-built-site.mjs")], {
          cwd: root, env: { ...process.env, HOST: "127.0.0.1", PORT: "0", SITE_DIR: fixture.site }, stdio: ["ignore", "pipe", "pipe"],
        });
        try {
          const origin = await waitForServer(server);
          const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
          const errors = [], external = [];
          await context.route("**/*", route => {
            const url = route.request().url();
            if (/^https?:/.test(url) && new URL(url).origin !== new URL(origin).origin) { external.push(url); return route.abort(); }
            return route.continue();
          });
          const page = await context.newPage(); activePage = page;
          page.setDefaultTimeout(10000);
          page.on("pageerror", error => errors.push(error.message));
          page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
          page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
          try {
            await page.goto(origin, { waitUntil: "networkidle" });
            await page.locator(".layout-width-toggle").waitFor();
            for (const scheme of ["default", "slate"]) {
              await page.setViewportSize({ width: 1440, height: 1000 });
              await selectScheme(page, scheme);
              for (const width of ["standard", "wide"]) {
                await page.setViewportSize({ width: 1440, height: 1000 });
                await setWidth(page, width);
                for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }, { name: "reflow-320", width: 320, height: 800 }]) {
                  await page.setViewportSize({ width: viewport.width, height: viewport.height });
                  await ready(page, scheme, width);
                  const label = `${engine}/${fixture.name}/${scheme}/${width}/${viewport.name}`;
                  console.log(`Header browser: ${label}`);
                  const controls = await inspectHeaderControls(page, { scheme, label, artworkSizes: true });
                  await assertVisibility(page, viewport.width);
                  const expectedBrand = fixture.config?.accent;
                  if (expectedBrand) assert.equal(controls.snapshot.tokens["header-surface"], hexRgb(expectedBrand), `${label}: exact consumer brand must remain on header`);
                  const keyboard = await keyboardJourney(page, scheme, width, viewport.width);
                  await page.reload({ waitUntil: "networkidle" });
                  await ready(page, scheme, width);
                  assert.equal(await page.evaluate(key => localStorage.getItem(key), widthKey), width, `${label}: saved width survives reload and mobile resizing`);
                  await page.getByRole("link", { name: "Read the architecture page", exact: true }).click();
                  await page.waitForURL("**/second/");
                  await ready(page, scheme, width);
                  await inspectHeaderControls(page, { scheme, label: `${label}/navigation`, hover: false });
                  await page.reload({ waitUntil: "networkidle" });
                  await ready(page, scheme, width);
                  await page.getByRole("link", { name: "Return to the reference", exact: true }).click();
                  await page.waitForURL(url => url.pathname === "/");
                  await ready(page, scheme, width);
                  if (fixture.name === "unconfigured" && width === "wide" && viewport.name !== "reflow-320") {
                    await page.evaluate(() => document.activeElement?.blur()); await page.mouse.move(0, 200);
                    const filename = `${engine}-${scheme}-${viewport.name}.png`;
                    await page.screenshot({ path: path.join(output, filename), fullPage: true });
                    report.screenshots.push(filename);
                  }
                  report.cases.push({ engine, fixture: fixture.name, scheme, width, viewport: viewport.name, status: "passed", controls, keyboard, reload: true, navigation: true, savedWidth: width });
                  report.engines[engine].cases++;
                }
                await page.setViewportSize({ width: 1440, height: 1000 });
                const zoom = await zoomJourney(page, scheme, width, `${engine}/${fixture.name}/${scheme}/${width}`);
                report.cases.push({ engine, fixture: fixture.name, scheme, width, viewport: "zoom", status: "passed", ...zoom });
                report.engines[engine].cases++;
              }
            }
            if (fixture.name === "unconfigured") {
              await page.setViewportSize({ width: 1440, height: 1000 }); await selectScheme(page, "default"); await setWidth(page, "wide");
              report.negativeCases.push(...await negativeJourneys(page, engine));
            }
            assert.deepEqual(errors, [], `${engine}/${fixture.name}: browser errors`);
            assert.deepEqual(external, [], `${engine}/${fixture.name}: fixtures must not request external resources`);
          } catch (error) {
            await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
            throw error;
          } finally { await context.close(); }
        } finally { server.kill("SIGTERM"); }
      }
      assert.equal(report.engines[engine].cases, 48, `${engine}: complete matrix required`);
      report.engines[engine].status = "passed";
    } finally { await browser.close(); }
  }
  assert.deepEqual(Object.keys(report.engines).sort(), ["chromium", "webkit"], "Both browser engines must finish");
  assert.equal(report.cases.length, 96, "Every fixture, appearance, width, viewport and zoom case must finish");
  assert.equal(report.negativeCases.length, 16, "Both engines must refuse every rendered defect");
  assert.equal(report.screenshots.length, 8, "Generic screenshots must cover both engines, appearances and device classes");
  report.completedMatrixCases = report.cases.length;
  report.ok = true;
} catch (error) {
  failure = error; report.error = error.stack ?? String(error);
  for (const result of Object.values(report.engines)) if (result.status === "running") result.status = "failed";
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(output, "contract.json"), `${JSON.stringify(report, null, 2)}\n`);
}
if (failure) { console.error(`Header browser contract failed: ${failure.message}`); process.exitCode = 1; }
else console.log(`Header browser contract passed: Chromium and WebKit; ${report.cases.length} matrix cases, ${report.negativeCases.length} defect refusals, ${report.screenshots.length} generic screenshots.`);

function hexRgb(hex) { return `rgb(${hex.slice(1).match(/../g).map(value => parseInt(value, 16)).join(", ")})`; }
async function ready(page, scheme, width) {
  await page.waitForFunction(({ scheme, width }) => document.body.dataset.mdColorScheme === scheme && document.documentElement.dataset.layoutWidth === width, { scheme, width });
  assert.equal(await page.locator(`${palette} input:checked`).getAttribute("data-md-color-scheme"), scheme, "Native checked radio reflects the resolved scheme");
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
}
async function selectScheme(page, scheme) {
  if (await page.locator("body").getAttribute("data-md-color-scheme") === scheme) return;
  const id = await page.locator(`${palette} input[data-md-color-scheme="${scheme}"]`).getAttribute("id");
  await page.locator(`${palette} label[for="${id}"]:visible`).click();
  await page.waitForFunction(value => document.body.dataset.mdColorScheme === value, scheme);
}
async function setWidth(page, width) {
  // Persist even the configured initial choice through the real control.
  if (await page.locator("html").getAttribute("data-layout-width") === width) await page.locator(".layout-width-toggle").click();
  await page.locator(".layout-width-toggle").click();
  assert.equal(await page.locator("html").getAttribute("data-layout-width"), width);
}
async function assertVisibility(page, viewport) {
  const mobile = viewport < 960;
  assert.equal(await page.locator(".layout-width-toggle").isVisible(), !mobile, "Native responsive width visibility");
  assert.equal(await page.locator(".md-search__button").isVisible(), !mobile, "Native desktop Search visibility");
  assert.equal(await page.locator('.md-header label[for="__search"]').isVisible(), mobile, "Native mobile Search visibility");
  assert.equal(await page.locator('.md-header label[for="__drawer"]').isVisible(), viewport < 1220, "Native menu breakpoint remains intact");
}
async function tabTo(page, selector) {
  // WebKit on macOS follows the reader's keyboard-navigation preference.
  // Option+Tab is the native full-control traversal alternative. Do not change
  // OS preferences or inject tabindex into native controls for the test.
  const keys = tabNavigationKeys.has(page) ? [tabNavigationKeys.get(page)] :
    page.context().browser().browserType().name() === "webkit" && process.platform === "darwin" ? ["Tab", "Alt+Tab"] : ["Tab"];
  for (const key of keys) {
    await page.locator(".md-skip").focus();
    for (let index = 0; index < 24; index++) {
      await page.keyboard.press(key);
      if (await page.locator(selector).evaluateAll(elements => elements.includes(document.activeElement))) { tabNavigationKeys.set(page, key); return; }
    }
  }
  throw new Error(`Keyboard Tab cannot reach ${selector}`);
}
async function assertFocus(page, selector) {
  const result = await page.locator(selector).evaluate(element => {
    const target = element.matches("input.md-option") ? [...element.form.querySelectorAll("label")].find(label => !label.hidden && getComputedStyle(label).display !== "none") : element;
    const style = getComputedStyle(target), header = getComputedStyle(document.querySelector(".md-header"));
    return { focused: document.activeElement === element, style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor, header: header.backgroundColor };
  });
  assert.ok(result.focused && result.style !== "none" && result.width >= 2, `Visible keyboard focus required for ${selector}`);
  assert.ok(contrastRatio(result.color, result.header) >= 3, `Keyboard focus boundary must contrast with header for ${selector}`);
  return result;
}
async function keyboardJourney(page, scheme, width, viewport) {
  const mobile = viewport < 960, focus = [];
  await tabTo(page, `${palette} input:checked`);
  focus.push(await assertFocus(page, `${palette} input:checked`));
  // Traverse toward the other radio; WebKit does not wrap past the last item.
  await page.keyboard.press(scheme === "default" ? "ArrowRight" : "ArrowLeft");
  await page.waitForFunction(value => document.body.dataset.mdColorScheme === value, scheme === "default" ? "slate" : "default");
  await page.keyboard.press(scheme === "default" ? "ArrowLeft" : "ArrowRight"); await ready(page, scheme, width);
  if (!mobile) {
    await tabTo(page, ".layout-width-toggle"); focus.push(await assertFocus(page, ".layout-width-toggle"));
    await page.keyboard.press("Space"); await ready(page, scheme, width === "wide" ? "standard" : "wide");
    await page.keyboard.press("Enter"); await ready(page, scheme, width);
  } else {
    const menu = '.md-header label[for="__drawer"]';
    for (const key of ["Enter", "Space"]) {
      await tabTo(page, menu); focus.push(await assertFocus(page, menu));
      await page.keyboard.press(key); await page.waitForFunction(() => document.getElementById("__drawer").checked);
      await page.waitForFunction(() => document.querySelector('.md-header label[for="__drawer"]').getAttribute("aria-expanded") === "true");
      await page.keyboard.press("Escape"); await page.waitForFunction(() => !document.getElementById("__drawer").checked);
      assert.equal(await page.locator(menu).evaluate(element => document.activeElement === element), true, "Menu Escape restores keyboard focus");
      assert.equal(await page.locator(menu).getAttribute("aria-expanded"), "false");
    }
  }
  const search = mobile ? '.md-header label[for="__search"]' : ".md-search__button";
  for (const key of ["Enter", "Space"]) {
    await tabTo(page, search); focus.push(await assertFocus(page, search)); await page.keyboard.press(key);
    const input = page.locator('input[role="combobox"]'); await input.waitFor({ state: "visible" });
    await input.fill("architecture");
    const result = page.locator('.l ol li a').filter({ hasText: /Architecture/ }).first(); await result.waitFor({ state: "visible" });
    await input.press("Escape");
    await page.waitForFunction(() => [...document.querySelectorAll("body > div")].every(host => {
      const input = host.shadowRoot?.querySelector('input[role="combobox"]');
      if (!input) return true;
      const panel = input.closest(".l");
      return panel && input.getRootNode().activeElement !== input && getComputedStyle(panel).opacity === "0" && getComputedStyle(panel).pointerEvents === "none";
    }));
    if (mobile) {
      await page.waitForFunction(() => document.activeElement === document.querySelector('.md-header label[for="__search"]'));
      assert.equal(await page.locator(search).getAttribute("aria-expanded"), "false");
    }
  }
  await tabTo(page, search); await page.keyboard.press("Enter");
  const query = page.locator('input[role="combobox"]'); await query.fill("architecture");
  const destination = page.locator('.l ol li a').filter({ hasText: /Architecture/ }).first();
  await destination.waitFor({ state: "visible" }); await destination.focus(); await page.keyboard.press("Enter");
  await page.waitForURL("**/second/"); await ready(page, scheme, width);
  await page.getByRole("link", { name: "Return to the reference", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/"); await ready(page, scheme, width);
  return { tabReachable: true, tabNavigationKey: tabNavigationKeys.get(page), visibleFocus: focus, nativeAppearanceArrows: true, widthKeyboard: !mobile, mobileActionsKeyboard: mobile, searchKeyboard: true, searchResultKeyboardNavigation: true };
}
async function zoomJourney(page, scheme, width, label) {
  await page.evaluate(() => document.documentElement.style.zoom = "2");
  let layout;
  try {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    layout = await inspectHeaderControls(page, { scheme, label: `${label}/CSS-layout-zoom-200%`, artworkSizes: true });
    assert.equal(layout.snapshot.zoom, 2, "The layout zoom probe must really scale the page");
  } finally { await page.evaluate(() => document.documentElement.style.removeProperty("zoom")); }
  const original = await page.locator("html").evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  await page.locator("html").evaluate((element, size) => element.style.fontSize = `${size}px`, original * 2);
  let text;
  try {
    text = await inspectHeaderControls(page, { scheme, label: `${label}/text-sizing-200%`, artworkSizes: true });
    assert.equal(text.snapshot.rem, original * 2, "The text sizing probe must really double rem units");
  } finally { await page.locator("html").evaluate(element => element.style.removeProperty("font-size")); }
  await ready(page, scheme, width);
  return { cssLayoutZoom: layout, textSizing: text, nativeBrowserChromeZoom: "not-automated" };
}
async function negativeJourneys(page, engine) {
  const probes = [
    ["unequal-height", ".layout-width-toggle { height:1.5rem!important; }", /height/],
    ["wrong-radius", ".layout-width-toggle { border-radius:0!important; }", /rounding/],
    ["translucent-rest", ".layout-width-toggle { background-color:rgba(0,0,0,.5)!important; }", /opaque/],
    ["off-centre-svg", ".md-header__button:not(.md-logo)>svg { left:40%!important; }", /centred/],
    ["revealed-native-label", ".md-header label[hidden] { display:block!important; }", /native.*(?:visible|hidden)/],
    ["unreadable-shortcut", ".md-search__button::after { color:var(--header-control-surface)!important; }", /shortcut/],
    ["colour-crossfade", ".layout-width-toggle { transition:color .2s,background-color .2s!important; }", /crossfade/],
    ["wrong-hover", ".layout-width-toggle:hover { background-color:#ff0000!important; }", /brown hover/],
  ];
  const results = [];
  for (const [name, css, expected] of probes) {
    const style = await page.addStyleTag({ content: css });
    try { await assert.rejects(() => inspectHeaderControls(page, { scheme: "default", label: `${engine}/negative/${name}` }), expected); }
    finally { await style.evaluate(element => element.remove()); }
    results.push({ engine, name, rejected: true });
  }
  await inspectHeaderControls(page, { scheme: "default", label: `${engine}/negative-restored`, hover: false });
  return results;
}
function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let text = "", errors = "";
    const timeout = setTimeout(() => reject(new Error(`Header fixture server did not start: ${errors}`)), 10000);
    child.stdout.on("data", chunk => { text += chunk; for (const line of text.split("\n")) { try { const message = JSON.parse(line); if (message.ready && message.url) { clearTimeout(timeout); resolve(message.url); } } catch {} } });
    child.stderr.on("data", chunk => { errors += chunk; });
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Header fixture server exited ${code}: ${errors}`)); });
  });
}
