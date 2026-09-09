(() => {
  "use strict";

  const stylesheetSelector = 'link[href*="assets/layout-width.css"]';
  if (!document.querySelector(stylesheetSelector)) return;

  const storageKey = "denchco-kb-wiki-layout-width";
  const root = document.documentElement;

  const readPreference = () => {
    try {
      return window.localStorage.getItem(storageKey) === "wide";
    } catch {
      return false;
    }
  };

  const writePreference = wide => {
    try {
      window.localStorage.setItem(storageKey, wide ? "wide" : "standard");
    } catch {
      // Storage may be unavailable; the current page still remains switchable.
    }
  };

  const update = (wide, button = document.querySelector(".layout-width-toggle")) => {
    root.dataset.layoutWidth = wide ? "wide" : "standard";
    if (!button) return;
    button.setAttribute("aria-pressed", String(wide));
    button.setAttribute("aria-label", wide ? "Use standard page width" : "Use wide page width");
    button.title = wide ? "Use standard page width" : "Use wide page width";
  };

  update(readPreference());

  const boot = () => {
    const header = document.querySelector(".md-header__inner");
    if (!header) return;

    let button = header.querySelector(".layout-width-toggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "layout-width-toggle";
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
          <path d="M16 3h3a2 2 0 0 1 2 2v3"></path>
          <path d="M8 21H5a2 2 0 0 1-2-2v-3"></path>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
          <path d="M8 12h8"></path>
          <path d="m6 10-2 2 2 2"></path>
          <path d="m18 10 2 2-2 2"></path>
        </svg>
        <span>Wide</span>`;
      button.addEventListener("click", () => {
        const wide = root.dataset.layoutWidth !== "wide";
        update(wide, button);
        writePreference(wide);
      });

      const palette = header.querySelector('[data-md-component="palette"]');
      const search = header.querySelector('[data-md-component="search"]');
      header.insertBefore(button, palette ? palette.nextSibling : search || null);
    }

    update(root.dataset.layoutWidth === "wide", button);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  if (window.document$?.subscribe) window.document$.subscribe(boot);
})();
