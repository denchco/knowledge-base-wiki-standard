/* Graph frames inherit the renderer palette without reloading their interaction state. */
(() => {
  "use strict";

  const { palettes, fallbackScheme } = JSON.parse(document.getElementById("graph-theme-config").textContent);
  const tokens = { background: "background", surface: "surface", text: "text", muted: "muted", border: "border", accent: "accent", accentContrast: "accent-contrast", hover: "accent-lightest", focus: "focus" };
  const listeners = new Set();
  let current;
  let parentBody;
  try {
    if (window.parent !== window && window.parent.location.origin === location.origin) parentBody = window.parent.document.body;
  } catch { /* Cross-origin embeddings retain the standalone palette. */ }

  // The generated assets live at <site scope>/assets/graphify/, including subpath deployments.
  const storageKey = `${new URL("../../", location.href).pathname}.__palette`;
  const storedScheme = () => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.color?.scheme; }
    catch { return undefined; }
  };

  function sync() {
    const requested = parentBody?.dataset.mdColorScheme ?? storedScheme() ?? fallbackScheme;
    const scheme = Object.hasOwn(palettes, requested) ? requested : fallbackScheme;
    const next = { scheme, ...palettes[scheme] };
    if (parentBody) {
      const style = window.parent.getComputedStyle(parentBody);
      for (const [name, token] of Object.entries(tokens)) next[name] = style.getPropertyValue(`--${token}`).trim() || next[name];
    }
    document.documentElement.dataset.mdColorScheme = scheme;
    if (document.body) document.body.dataset.mdColorScheme = scheme;
    document.documentElement.style.colorScheme = scheme === "default" ? "light" : "dark";
    for (const [name, token] of Object.entries(tokens)) document.documentElement.style.setProperty(`--graph-${token}`, next[name]);
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    current = Object.freeze(next);
    for (const listener of listeners) listener(current);
    window.dispatchEvent(new CustomEvent("graph-theme-change", { detail: current }));
  }

  const channels = color => {
    if (/^#[\da-f]{6}$/i.test(color)) return [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
    if (/^#[\da-f]{3}$/i.test(color)) return [...color.slice(1)].map(channel => parseInt(channel + channel, 16));
    return (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  };
  const luminance = values => values.map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  function colorForScene(color, minimum = 3) {
    const original = channels(color);
    const foreground = channels(current.text);
    const background = luminance(channels(current.background));
    if (original.length !== 3) return current.text;
    for (let step = 0; step <= 20; step += 1) {
      const values = original.map((channel, index) => Math.round(channel + (foreground[index] - channel) * step / 20));
      const value = luminance(values);
      if ((Math.max(value, background) + 0.05) / (Math.min(value, background) + 0.05) >= minimum || step === 20) {
        return `#${values.map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
      }
    }
  }

  window.graphTheme = Object.freeze({
    get current() { return current; },
    color: colorForScene,
    subscribe(listener) { listeners.add(listener); listener(current); return () => listeners.delete(listener); },
  });
  sync();
  document.addEventListener("DOMContentLoaded", sync, { once: true });
  if (parentBody) new MutationObserver(sync).observe(parentBody, { attributes: true, attributeFilter: ["data-md-color-scheme", "style", "class"] });
  else window.addEventListener("storage", event => { if (event.key === storageKey) sync(); });
})();
