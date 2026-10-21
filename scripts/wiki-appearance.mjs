/** Optional deterministic appearance adapter. It does not select an adoption state. */
const HEX = /^#[0-9a-f]{6}$/i;
const CONFIG_KEYS = ["schemaVersion", "accent", "appearance", "width"];
const EPSILON = 1e-7;

export function validateAppearanceConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError("Appearance configuration must be a plain object");
  }
  if (Reflect.ownKeys(value).length !== CONFIG_KEYS.length
      || Reflect.ownKeys(value).some(key => !CONFIG_KEYS.includes(key))
      || CONFIG_KEYS.some(key => !Object.hasOwn(value, key))) {
    throw new TypeError(`Appearance configuration requires exactly: ${CONFIG_KEYS.join(", ")}`);
  }
  if (value.schemaVersion !== "1.0") throw new TypeError("Unsupported appearance schemaVersion");
  if (typeof value.accent !== "string" || value.accent.length !== 7 || !HEX.test(value.accent)) {
    throw new TypeError("Appearance accent must be a six-digit hexadecimal colour");
  }
  if (!["light", "dark"].includes(value.appearance)) throw new TypeError("Appearance must be light or dark");
  if (!["standard", "wide"].includes(value.width)) throw new TypeError("Width must be standard or wide");
  return Object.freeze({ schemaVersion: "1.0", accent: value.accent.toLowerCase(), appearance: value.appearance, width: value.width });
}

function channels(hex) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
}
function linear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function encoded(value) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}
function luminance(hex) {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(first, second) {
  const pair = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (pair[1] + 0.05) / (pair[0] + 0.05);
}
function toOklch(hex) {
  const [r, g, b] = channels(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bLab = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const c = Math.hypot(a, bLab);
  return { l: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, c: c < EPSILON ? 0 : c, h: c < EPSILON ? 0 : Math.atan2(bLab, a) };
}
function toLinearRgb(l, c, h) {
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss];
}
function inGamut(rgb) {
  return rgb.every(value => value >= -EPSILON && value <= 1 + EPSILON);
}
// Preserve hue. Reduce chroma only when this lightness falls outside sRGB.
function tone(seed, l, chroma = seed.c) {
  let rgb = toLinearRgb(l, chroma, seed.h);
  if (!inGamut(rgb)) {
    let low = 0;
    let high = chroma;
    for (let index = 0; index < 32; index += 1) {
      const middle = (low + high) / 2;
      if (inGamut(toLinearRgb(l, middle, seed.h))) low = middle;
      else high = middle;
    }
    rgb = toLinearRgb(l, low, seed.h);
  }
  return `#${rgb.map(value => Math.round(Math.max(0, Math.min(1, encoded(value))) * 255).toString(16).padStart(2, "0")).join("")}`;
}
// Evaluate the rounded hex result, rather than its unrounded OKLCH precursor.
function readableTone(seed, l, backgrounds, ratio, direction, chroma = seed.c) {
  for (let index = 0; index <= 1000; index += 1) {
    const candidate = tone(seed, Math.max(0, Math.min(1, l + direction * index / 1000)), chroma);
    if (backgrounds.every(background => contrastRatio(candidate, background) >= ratio)) return candidate;
  }
  throw new Error(`Cannot derive a colour with ${ratio}:1 contrast`);
}
function alpha(hex, opacity) {
  return `rgb(${channels(hex).map(value => Math.round(value * 255)).join(" ")} / ${opacity}%)`;
}
function checkPair(foreground, backgrounds, ratio, name) {
  if (backgrounds.some(background => contrastRatio(foreground, background) < ratio)) {
    throw new Error(`Derived ${name} does not meet ${ratio}:1 contrast`);
  }
}

/** Role colours are final six-digit sRGB hex; seed.h is in radians. */
export function deriveAppearance(value) {
  const config = validateAppearanceConfig(value);
  const seed = toOklch(config.accent);
  const neutral = Math.min(seed.c, 0.012);
  const pale = tone(seed, 0.96, Math.min(seed.c, 0.025));
  const darkInk = tone(seed, 0.20, neutral);
  const lightInk = tone(seed, 0.98, Math.min(seed.c, 0.006));
  const brandText = contrastRatio(darkInk, config.accent) >= contrastRatio(lightInk, config.accent) ? darkInk : lightInk;
  // At least one of black and white always exceeds 4.5:1; tonal ink can be refined.
  const brandInk = contrastRatio(brandText, config.accent) >= 4.5 ? brandText
    : (contrastRatio("#000000", config.accent) >= contrastRatio("#ffffff", config.accent) ? "#000000" : "#ffffff");
  const lightBackground = tone(seed, 0.985, Math.min(seed.c, 0.006));
  const lightSurface = "#ffffff";
  const lightAccents = [0.46, 0.42, 0.38, 0.49].map(l => readableTone(seed, l, [lightBackground, lightSurface, pale], 4.5, -1));
  const questionBackground = lightAccents.every(ink => contrastRatio(ink, config.accent) >= 4.5)
    ? config.accent : pale;
  const lightSurfaces = [lightBackground, lightSurface, questionBackground];
  const light = {
    brandAccent: config.accent, brandText: brandInk,
    primary: lightAccents[0], accent: lightAccents[0], accentDark: lightAccents[1], accentDarker: lightAccents[2], accentVisited: lightAccents[3],
    accentLight: readableTone(seed, 0.56, lightSurfaces, 3, -1), accentLightest: questionBackground,
    accentContrast: "#ffffff", background: lightBackground, surface: lightSurface,
    text: readableTone(seed, 0.25, lightSurfaces, 4.5, -1, neutral), muted: readableTone(seed, 0.45, lightSurfaces, 4.5, -1, neutral),
    border: readableTone(seed, 0.61, lightSurfaces, 3, -1, neutral),
    focus: lightAccents[1], focusContrast: "#ffffff",
    headerBackground: config.accent, headerText: brandInk,
    selectedBackground: config.accent, selectedText: brandInk,
    questionBackground, questionText: lightAccents[0], questionBorder: lightAccents[0],
    tableHeader: questionBackground,
  };
  light.tableText = light.text;
  const darkBackground = tone(seed, 0.18, neutral);
  const darkSurface = tone(seed, 0.23, neutral);
  const darkQuestion = tone(seed, 0.29, Math.min(seed.c, 0.025));
  const darkSurfaces = [darkBackground, darkSurface, darkQuestion];
  const darkAccents = [0.80, 0.86, 0.92, 0.84].map(l => readableTone(seed, l, darkSurfaces, 4.5, 1));
  const dark = {
    brandAccent: config.accent, brandText: brandInk,
    primary: darkAccents[2], accent: darkAccents[0], accentDark: darkAccents[1], accentDarker: darkAccents[2], accentVisited: darkAccents[3],
    accentLight: readableTone(seed, 0.72, darkSurfaces, 3, 1), accentLightest: darkQuestion,
    accentContrast: darkBackground, background: darkBackground, surface: darkSurface,
    text: readableTone(seed, 0.94, darkSurfaces, 4.5, 1, neutral), muted: readableTone(seed, 0.78, darkSurfaces, 4.5, 1, neutral),
    border: readableTone(seed, 0.62, darkSurfaces, 3, 1, neutral),
    focus: darkAccents[1], focusContrast: darkBackground,
    headerBackground: config.accent, headerText: brandInk,
    selectedBackground: config.accent, selectedText: brandInk,
    questionBackground: darkQuestion, questionText: darkAccents[0], questionBorder: darkAccents[0],
    tableHeader: darkQuestion,
  };
  dark.tableText = dark.text;
  for (const [name, palette] of Object.entries({ light, dark })) {
    palette.accentTransparent = alpha(palette.accent, 10);
    palette.accentTransparentStrong = alpha(palette.accent, 16);
    const surfaces = [palette.background, palette.surface, palette.questionBackground];
    for (const role of ["accent", "accentDark", "accentDarker", "accentVisited", "text", "muted"]) checkPair(palette[role], surfaces, 4.5, `${name}.${role}`);
    for (const role of ["accentLight", "border", "focus"]) checkPair(palette[role], surfaces, 3, `${name}.${role}`);
    for (const role of ["accent", "accentDark", "accentDarker"]) checkPair(palette.accentContrast, [palette[role]], 4.5, `${name}.${role} button text`);
    checkPair(palette.headerText, [palette.headerBackground], 4.5, `${name} header text`);
    checkPair(palette.selectedText, [palette.selectedBackground], 4.5, `${name} selected text`);
    Object.freeze(palette);
  }
  return Object.freeze({ config, seed: Object.freeze(seed), light, dark });
}

function kebab(value) { return value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`); }
function canonicalDerived(derived) { return deriveAppearance(derived?.config); }
export function renderAppearanceCss(derived) {
  const { light, dark } = canonicalDerived(derived);
  const declarations = palette => Object.entries(palette).map(([key, value]) => `  --${kebab(key)}: ${value};`).join("\n");
  return `/* Generated by wiki-appearance.mjs. Configure config/wiki-appearance.json; do not edit. */
:root,
body[data-md-color-primary],
body[data-md-color-accent],
body[data-md-color-scheme] {
${declarations(light)}
  --layout-width-control-rest-color: var(--header-text);
  --layout-width-control-hover-color: var(--header-text);
  --layout-width-control-selected-color: var(--header-text);
  --layout-width-control-hover-background: transparent;
  --layout-width-control-selected-background: transparent;
  --md-primary-fg-color: var(--primary);
  --md-primary-fg-color--light: var(--accent-light);
  --md-primary-fg-color--dark: var(--accent-dark);
  --md-primary-bg-color: var(--accent-contrast);
  --md-accent-fg-color: var(--accent);
  --md-accent-fg-color--transparent: var(--accent-transparent);
  --md-accent-bg-color: var(--accent-contrast);
  --md-typeset-a-color: var(--accent);
  --md-code-hl-color: var(--accent);
  --md-code-hl-color--light: var(--accent-transparent);
}
body[data-md-color-scheme="slate"] {
${declarations(dark)}
}
.md-header {
  background-color: var(--header-background);
  color: var(--header-text);
  --focus: var(--header-text);
  --focus-contrast: var(--header-background);
}
.md-header .md-header__title,
.md-header .md-header__topic,
.md-header__button,
.md-header__button:hover,
.md-header__button:active,
.md-search__button {
  color: var(--header-text);
}
.md-search__button { background-color: transparent; }
.layout-width-toggle[aria-pressed="true"] { box-shadow: inset 0 -2px 0 currentColor; }
.md-header__button:hover,
.md-header__button:active { background-color: transparent; }
.md-nav--primary .md-nav__item--active > .md-nav__link,
.md-nav--primary .md-nav__item .md-nav__link--active,
.md-nav--secondary .md-nav__link--active {
  background-color: var(--selected-background);
  color: var(--selected-text);
  --focus: var(--selected-text);
  --focus-contrast: var(--selected-background);
}
.md-typeset blockquote.governing-question {
  background-color: var(--question-background);
  border-inline-start-color: var(--question-border);
}
.md-typeset blockquote.governing-question > p {
  color: var(--question-text);
}
.md-typeset table thead th {
  background-color: var(--table-header);
  color: var(--table-text);
}
.md-typeset details:not([class]) {
  border-color: var(--border);
}
.md-typeset details:not([class]) > summary {
  background-color: var(--accent-lightest);
  color: var(--text);
}
.md-typeset details:not([class]) > summary::before { background-color: var(--accent); }
.md-typeset details:not([class]) > summary::after { color: var(--accent); }
`;
}

export function renderAppearanceScript(derived) {
  const { config } = canonicalDerived(derived);
  return `/* Generated appearance defaults. Native Zensical owns palette persistence. */\n(() => {\n  document.documentElement.dataset.layoutDefaultWidth = ${JSON.stringify(config.width)};\n})();\n`;
}

function replaceAssetArray(source, key, asset, before) {
  const declarations = [...source.matchAll(new RegExp(`^\\s*${key}\\s*=`, "gm"))];
  if (declarations.length !== 1) throw new Error(`Expected exactly one ${key} declaration`);
  const matches = [...source.matchAll(new RegExp(`^${key}\\s*=\\s*(\\[[^\\r\\n]*\\])\\s*$`, "gm"))];
  if (matches.length !== 1) throw new Error(`Expected one single-line ${key} array`);
  const match = matches[0];
  let values;
  try { values = JSON.parse(match[1]); } catch { throw new Error(`Unsupported ${key} array: use double-quoted canonical asset paths`); }
  if (!Array.isArray(values) || values.some(value => typeof value !== "string") || new Set(values).size !== values.length) {
    throw new Error(`Unsupported ${key} array values`);
  }
  const required = before || "assets/theme.css";
  if (!values.includes(required)) throw new Error(`${key} must include ${required}`);
  values = values.filter(value => value !== asset);
  if (before) values.splice(values.indexOf(before), 0, asset);
  else values.push(asset);
  return source.slice(0, match.index) + `${key} = ${JSON.stringify(values)}` + source.slice(match.index + match[0].length);
}

/** Supports the reference Zensical configuration, not arbitrary TOML rewriting. */
export function renderZensicalAppearance(sourceToml, derived) {
  const { config } = canonicalDerived(derived);
  if (typeof sourceToml !== "string") throw new TypeError("Zensical source must be TOML text");
  const blocks = [...sourceToml.matchAll(/^\[\[project\.theme\.palette\]\]\s*\r?\n([\s\S]*?)(?=^\[|$(?![\s\S]))/gm)];
  if (blocks.length !== 2) throw new Error("Expected exactly two native Zensical palette blocks");
  const schemes = new Set();
  const palettes = [];
  for (const block of blocks) {
    const values = {};
    for (const line of block[1].split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith("#"))) {
      const match = line.match(/^([a-z.]+)\s*=\s*"([^"\\]*)"\s*$/);
      if (!match || !["scheme", "primary", "accent", "toggle.icon", "toggle.name", "media"].includes(match[1]) || Object.hasOwn(values, match[1])) {
        throw new Error("Unsupported native palette configuration");
      }
      values[match[1]] = match[2];
    }
    if (Object.keys(values).length !== (Object.hasOwn(values, "media") ? 6 : 5) || !["default", "slate"].includes(values.scheme)
        || values.primary !== "custom" || values.accent !== "custom" || schemes.has(values.scheme)) {
      throw new Error("Expected unique native default/slate palettes with custom colours");
    }
    if (Object.hasOwn(values, "media") && !["all", "not all"].includes(values.media)) {
      throw new Error("Unsupported native palette media: only generated all/not all defaults are supported");
    }
    schemes.add(values.scheme);
    palettes.push(values);
  }
  const media = palettes.filter(values => Object.hasOwn(values, "media")).map(values => values.media);
  if (media.length && (media.length !== 2 || new Set(media).size !== 2)) {
    throw new Error("Expected one generated all/not all native palette media pair");
  }
  const initialScheme = config.appearance === "light" ? "default" : "slate";
  // Zensical saves palette indexes. Keep each scheme at its canonical index and
  // let native media matching choose a default only when no preference exists.
  let result = sourceToml;
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    const assignment = `media = "${palettes[index].scheme === initialScheme ? "all" : "not all"}"`;
    const rendered = Object.hasOwn(palettes[index], "media")
      ? block[0].replace(/^media[^\S\r\n]*=[^\S\r\n]*"(?:all|not all)"[^\S\r\n]*(?=\r?$)/m, assignment)
      : block[0].replace(/^(\[\[project\.theme\.palette\]\][^\S\r\n]*\r?\n)/, `$1${assignment}${block[0].includes("\r\n") ? "\r\n" : "\n"}`);
    result = result.slice(0, block.index) + rendered + result.slice(block.index + block[0].length);
  }
  result = replaceAssetArray(result, "extra_css", "assets/appearance/appearance.css");
  result = replaceAssetArray(result, "extra_javascript", "assets/appearance/appearance.js", "assets/layout-width.js");
  return result;
}
