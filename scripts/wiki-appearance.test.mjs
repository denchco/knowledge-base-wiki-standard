import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import Ajv2020 from "ajv/dist/2020.js";
import { validateAppearanceConfig, deriveAppearance, renderAppearanceCss, renderAppearanceScript, renderZensicalAppearance, contrastRatio } from "./wiki-appearance.mjs";

const config = { schemaVersion: "1.0", accent: "#e1efdd", appearance: "light", width: "wide" };
const toml = readFileSync(new URL("../zensical.toml", import.meta.url), "utf8");
const reversedToml = toml.replace(
  /(\[\[project\.theme\.palette\]\][\s\S]*?)(\[\[project\.theme\.palette\]\][\s\S]*)$/,
  "$2\n$1",
);
const nativePalettes = source => source.split("[[project.theme.palette]]").slice(1).map(block =>
  Object.fromEntries([...block.matchAll(/^([a-z.]+) = "(.*)"\r?$/gm)].map(match => [match[1], match[2]])));
// Independent WCAG calculation on the serialized 8-bit sRGB output.
function contrast(a, b) {
  const luminance = value => {
    const rgb = value.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
      .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return rgb.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  };
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("strict versioned configuration rejects misspellings, omissions and injection", () => {
  const accepted = validateAppearanceConfig({ ...config, accent: "#E1EFDD" });
  assert.equal(accepted.accent, "#e1efdd");
  assert.ok(Object.isFrozen(accepted));
  for (const invalid of [null, [], true, "light", {}, { ...config, scheme: "light" }, { ...config, schemaVersion: "2.0" },
    { ...config, accent: "e1efdd" }, { ...config, accent: "#eee" }, { ...config, accent: "#eeeeee;" }, { ...config, accent: "#eeeeee\n" },
    { ...config, appearance: "system" }, { ...config, width: "full" }, { ...config, width: undefined },
    { ...config, accent: 1 }, Object.create(config), { ...config, [Symbol("hidden")]: true }]) {
    assert.throws(() => validateAppearanceConfig(invalid), TypeError);
  }
});

test("published schema and runtime validator agree for valid and malformed fixtures", () => {
  const schema = JSON.parse(readFileSync(new URL("../schema/wiki-appearance-v1.json", import.meta.url), "utf8"));
  const validateSchema = new Ajv2020({ strict: true }).compile(schema);
  const fixtures = [config, { ...config, accent: "#E1EFDD" }, { ...config, appearance: "dark", width: "standard" },
    null, [], {}, { ...config, accent: "#e1efdd\n" }, { ...config, accent: "#eee" },
    { ...config, appearance: "system" }, { ...config, width: "full" },
    { ...config, schemaVersion: 1 }, { ...config, unused: true }];
  for (const fixture of fixtures) {
    let runtimeValid = true;
    try { validateAppearanceConfig(fixture); } catch { runtimeValid = false; }
    assert.equal(validateSchema(fixture), runtimeValid, JSON.stringify(fixture));
  }
});

test("pale brand survives verbatim and its darker shades preserve the requested family", () => {
  const result = deriveAppearance(config);
  assert.deepEqual([result.light.accent, result.light.accentDark, result.light.accentDarker, result.light.accentVisited],
    ["#505c4d", "#455142", "#3b4638", "#596555"]);
  for (const palette of [result.light, result.dark]) {
    assert.equal(palette.brandAccent, config.accent);
    assert.equal(palette.headerBackground, config.accent);
    assert.equal(palette.selectedBackground, config.accent);
    assert.ok(contrast(palette.headerText, config.accent) >= 4.5);
    assert.ok(contrast(palette.selectedText, config.accent) >= 4.5);
    assert.equal(palette.questionText, palette.accent);
    assert.equal(palette.questionBorder, palette.accent);
  }
  assert.equal(result.light.questionBackground, config.accent);
  assert.equal(result.light.tableHeader, config.accent);
  assert.ok(contrast(result.light.accent, config.accent) > 5.8);
});

test("quantized saturated, dark, neutral and generated seeds retain contrast", () => {
  const seeds = new Set(["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#005ea8", "#777777", "#010101"]);
  for (let index = 0; index < 384; index += 1) seeds.add(`#${((index * 2654435761) >>> 0).toString(16).slice(-6).padStart(6, "0")}`);
  for (const accent of seeds) {
    const result = deriveAppearance({ ...config, accent });
    for (const [name, palette] of Object.entries({ light: result.light, dark: result.dark })) {
      for (const [role, value] of Object.entries(palette)) {
        if (!role.startsWith("accentTransparent")) assert.match(value, /^#[0-9a-f]{6}$/, `${accent} ${name}.${role}`);
      }
      for (const surface of [palette.background, palette.surface, palette.questionBackground]) {
        for (const role of ["text", "muted", "accent", "accentDark", "accentDarker", "accentVisited"]) {
          assert.ok(contrast(palette[role], surface) >= 4.5, `${accent} ${name}.${role} on ${surface}`);
        }
        for (const role of ["border", "focus", "accentLight"]) {
          assert.ok(contrast(palette[role], surface) >= 3, `${accent} ${name}.${role} boundary on ${surface}`);
        }
      }
      assert.equal(palette.headerBackground, accent);
      assert.equal(palette.selectedBackground, accent);
      assert.ok(contrast(palette.headerText, accent) >= 4.5);
      for (const button of [palette.accent, palette.accentDark, palette.accentDarker]) assert.ok(contrast(palette.accentContrast, button) >= 4.5);
    }
  }
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
});

test("dark seeds receive a readable question tint without replacing visible brand surfaces", () => {
  for (const accent of ["#000000", "#005ea8", "#ff0000"]) {
    const { light } = deriveAppearance({ ...config, accent });
    assert.notEqual(light.questionBackground, accent);
    assert.equal(light.headerBackground, accent);
    assert.ok(contrast(light.questionText, light.questionBackground) >= 4.5);
  }
});

test("generated values are deterministic and do not mutate caller configuration", () => {
  const original = structuredClone(config);
  const first = deriveAppearance(config);
  const second = deriveAppearance(config);
  assert.deepEqual(first, second);
  assert.deepEqual(config, original);
  assert.equal(renderAppearanceCss(first), renderAppearanceCss(second));
  assert.equal(renderAppearanceScript(first), renderAppearanceScript(second));
  assert.ok(Object.isFrozen(first.light));
  const css = renderAppearanceCss(first);
  assert.match(css, /body\[data-md-color-scheme="slate"\]/);
  assert.equal((css.match(/^  --md-primary-fg-color:/gm) || []).length, 1);
  assert.equal((css.match(/^  --md-primary-bg-color:/gm) || []).length, 1);
  assert.match(css, /--brand-accent: #e1efdd;/);
  assert.match(css, /background-color: var\(--selected-background\)/);
  assert.match(css, /blockquote\.governing-question > p\s*\{\s*color: var\(--question-text\)/);
  assert.doesNotMatch(css, /prefers-color-scheme/);
});

test("appearance script provides width fallback only, preserving native palette persistence", () => {
  for (const width of ["wide", "standard"]) {
    const script = renderAppearanceScript(deriveAppearance({ ...config, width }));
    const root = { dataset: { layoutWidth: "saved-choice" } };
    vm.runInNewContext(script, { document: { documentElement: root } });
    assert.equal(root.dataset.layoutDefaultWidth, width);
    assert.equal(root.dataset.layoutWidth, "saved-choice");
    assert.doesNotMatch(script, /localStorage|sessionStorage|setAttribute|colorScheme/);
  }
});

test("native palette configuration selects fresh defaults without changing native indexes", () => {
  for (const source of [toml, reversedToml]) for (const appearance of ["light", "dark"]) {
    const derived = deriveAppearance({ ...config, appearance });
    const output = renderZensicalAppearance(source, derived);
    const palettes = nativePalettes(output);
    assert.deepEqual(palettes.map(palette => palette.scheme), nativePalettes(source).map(palette => palette.scheme));
    assert.equal(palettes.filter(palette => palette.media === "all").length, 1);
    assert.equal(palettes.find(palette => palette.media === "all").scheme, appearance === "light" ? "default" : "slate");
    assert.equal(palettes.filter(palette => palette.media === "not all").length, 1);
    const css = JSON.parse(output.match(/^extra_css = (.*)$/m)[1]);
    const js = JSON.parse(output.match(/^extra_javascript = (.*)$/m)[1]);
    assert.equal(css.at(-1), "assets/appearance/appearance.css");
    assert.equal(js[js.indexOf("assets/layout-width.js") - 1], "assets/appearance/appearance.js");
    assert.equal(output.match(/^site_dir = .*$/m)[0], toml.match(/^site_dir = .*$/m)[0]);
    assert.equal(output.match(/^docs_dir = .*$/m)[0], toml.match(/^docs_dir = .*$/m)[0]);
    assert.equal(renderZensicalAppearance(output, derived), output);
    const withFollowingTable = `${source}\n[project.extra.analytics]\nprovider = "custom"\n`;
    assert.match(renderZensicalAppearance(withFollowingTable, derived), /\[project.extra.analytics\]\nprovider = "custom"/);
  }
});

test("changed configured defaults retain every saved native palette index", () => {
  for (const source of [toml, reversedToml]) {
    const original = nativePalettes(source);
    let rendered = source;
    for (const appearance of ["light", "dark", "light"]) {
      rendered = renderZensicalAppearance(rendered, deriveAppearance({ ...config, appearance }));
      const palettes = nativePalettes(rendered);
      for (const savedIndex of [0, 1]) {
        assert.equal(palettes[savedIndex].scheme, original[savedIndex].scheme,
          `${appearance} default must preserve the scheme at saved native index ${savedIndex}`);
      }
      assert.equal(palettes.find(palette => palette.media === "all").scheme, appearance === "light" ? "default" : "slate");
    }
    assert.equal(rendered, renderZensicalAppearance(source, deriveAppearance(config)));
  }
});

test("native default selection preserves consumer labels and comments with LF or CRLF input", () => {
  for (const source of [toml, reversedToml]) for (const ending of ["\n", "\r\n"]) {
    const custom = source.replace('toggle.icon = "lucide/moon"', 'toggle.icon = "custom/night"')
      .replace('toggle.name = "Switch to dark mode"', '# Reader-facing translated label\ntoggle.name = "Activer le mode sombre"')
      .replace('toggle.icon = "lucide/sun"', 'toggle.icon = "custom/day"')
      .replace('toggle.name = "Switch to light mode"', '# Preserve this instruction\ntoggle.name = "Activer le mode clair"')
      .replace(/\r?\n/g, ending);
    const derived = deriveAppearance({ ...config, appearance: "dark" });
    const output = renderZensicalAppearance(custom, derived);
    assert.deepEqual(nativePalettes(output).map(palette => palette.scheme), nativePalettes(custom).map(palette => palette.scheme));
    assert.equal(nativePalettes(output).find(palette => palette.media === "all").scheme, "slate");
    for (const content of ['toggle.icon = "custom/night"', 'toggle.icon = "custom/day"',
      '# Reader-facing translated label\ntoggle.name = "Activer le mode sombre"',
      '# Preserve this instruction\ntoggle.name = "Activer le mode clair"']) {
      assert.ok(output.includes(content.replace(/\n/g, ending)), content);
    }
    assert.equal(renderZensicalAppearance(output, derived), output);
    const noFinalNewline = custom.trimEnd();
    const rendered = renderZensicalAppearance(noFinalNewline, derived);
    assert.equal(renderZensicalAppearance(rendered, derived), rendered);
    assert.equal(nativePalettes(rendered).length, 2);
  }
});

test("unsupported TOML configuration fails closed instead of silently changing meaning", () => {
  const derived = deriveAppearance(config);
  for (const input of [
    toml.replace('scheme = "slate"', 'scheme = "default"'),
    toml.replace('primary = "custom"', 'primary = "teal"'),
    toml.replace('scheme = "slate"', 'media = "(prefers-color-scheme: dark)"\nscheme = "slate"'),
    toml.replace('scheme = "slate"', 'media = "all"\nscheme = "slate"'),
    toml.replace(/^scheme =/gm, 'media = "all"\nscheme ='),
    toml.replace(/^scheme =/gm, 'media = "not all"\nscheme ='),
    toml.replace('scheme = "slate"', 'media = "none"\nscheme = "slate"'),
    toml.replace('extra_css = [', 'extra_css = [\n'),
    toml.replace('"assets/theme.css"', '"assets/elsewhere.css"'),
    toml.replace('"assets/layout-width.js"', '"assets/elsewhere.js"'),
    `${toml}\nextra_css = ["duplicate.css"]\n`,
    `${toml}\nextra_css = [\n"duplicate.css"\n]\n`,
    `${toml}\n[[project.theme.palette]]\nscheme = "extra"\n`,
  ]) assert.throws(() => renderZensicalAppearance(input, derived));
});
