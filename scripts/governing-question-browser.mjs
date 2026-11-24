import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";

const marker = ".md-typeset blockquote.governing-question";

// Presentation covers every marked reader page, including pages outside the
// source set used to audit verbatim repetitions of the canonical question.
export async function findGoverningQuestionRoutes(page, siteRoot) {
  const routes = [];
  for (const file of globSync("**/*.html", { cwd: siteRoot }).sort()) {
    const markup = readFileSync(path.join(siteRoot, file), "utf8");
    const repetitions = await page.evaluate(html => {
      const document = new DOMParser().parseFromString(html, "text/html");
      return document.querySelectorAll(".md-typeset .governing-question").length;
    }, markup);
    if (repetitions) {
      const route = "/" + file.split(path.sep).map(encodeURIComponent).join("/").replace(/(^|\/)index\.html$/, "$1");
      routes.push({ route, repetitions });
    }
  }
  return routes;
}

async function checkCallout(callout, label) {
  const geometry = await callout.evaluate(box => {
    const paragraph = box.querySelector(":scope > p");
    if (!paragraph) throw new Error("The governing question needs a direct paragraph.");
    const outer = box.getBoundingClientRect();
    const inner = paragraph.getBoundingClientRect();
    const style = getComputedStyle(box);
    // The rail belongs to the border. The paragraph box, rather than the glyphs,
    // defines the inner edge even when a short last line leaves empty space.
    const lines = document.createRange();
    lines.selectNodeContents(paragraph);
    return {
      target: 0.6 * parseFloat(getComputedStyle(document.documentElement).fontSize),
      insets: {
        top: inner.top - outer.top - parseFloat(style.borderTopWidth),
        right: outer.right - inner.right - parseFloat(style.borderRightWidth),
        bottom: outer.bottom - inner.bottom - parseFloat(style.borderBottomWidth),
        left: inner.left - outer.left - parseFloat(style.borderLeftWidth),
      },
      margin: getComputedStyle(paragraph).margin,
      lines: new Set(Array.from(lines.getClientRects(), rect => rect.top)).size,
    };
  });
  assert.equal(geometry.margin, "0px", label + " question paragraph margin must be zero");
  for (const [side, distance] of Object.entries(geometry.insets)) {
    assert(distance > 0 && Math.abs(distance - geometry.target) <= 0.5,
      label + " " + side + " inset measured " + distance + "px, expected " + geometry.target + "px ±0.5");
  }
  const distances = Object.values(geometry.insets);
  assert(Math.max(...distances) - Math.min(...distances) <= 0.5, label + " question insets differ by more than 0.5px");
  return geometry.lines;
}

async function checkMobileFixtures(realCallout, page, label) {
  const fixture = page.locator("[data-question-inset-fixture]");
  await realCallout.evaluate(original => {
    const clone = original.cloneNode(true);
    clone.dataset.questionInsetFixture = "";
    // Exercise a wrapped sample even if the project's own question is short.
    clone.querySelector(":scope > p").textContent =
      "Does the marked question retain the same inner space on all four sides when its words wrap across multiple lines on a narrow reader screen?";
    original.after(clone);
  });
  try {
    assert(await checkCallout(fixture, label) > 1, label + " fixture must wrap across multiple lines");
    await fixture.evaluate(box => {
      box.style.setProperty("padding-top", "calc(0.6rem - 0.375px)", "important");
      box.style.setProperty("padding-bottom", "calc(0.6rem + 0.375px)", "important");
    });
    await assert.rejects(checkCallout(fixture, label), /insets differ/, "Positive but uneven insets must fail");
    await fixture.evaluate(box => {
      box.style.removeProperty("padding-bottom");
      box.style.setProperty("padding-top", "0", "important");
    });
    await assert.rejects(checkCallout(fixture, label), /top inset measured/, "A missing inset must fail");
    await fixture.evaluate(box => {
      box.style.removeProperty("padding-top");
      box.querySelector(":scope > p").style.setProperty("margin-bottom", "1rem", "important");
    });
    await assert.rejects(checkCallout(fixture, label), /paragraph margin must be zero/, "Paragraph margin drift must fail");
  } finally {
    await fixture.evaluate(box => box.remove());
  }
}

export async function checkGoverningQuestionInsets(browser, baseUrl, routes) {
  const page = await browser.newPage();
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const { route, repetitions } of routes) {
        const label = browser.browserType().name() + " " + width + "px " + route;
        const response = await page.goto(new URL(route, baseUrl).href);
        assert(response?.ok(), label + " must load for the question inset check");
        const callouts = page.locator(marker);
        assert.equal(await callouts.count(), repetitions, label + " question count");
        for (const callout of await callouts.all()) await checkCallout(callout, label);
      }
      if (width === 390) await checkMobileFixtures(page.locator(marker).first(), page, browser.browserType().name() + " wrapped mobile");
    }
  } finally {
    await page.close();
  }
}
