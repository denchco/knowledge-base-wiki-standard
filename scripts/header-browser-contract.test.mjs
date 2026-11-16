import assert from "node:assert/strict";
import test from "node:test";
import { assertHeaderSnapshot, assertNoColourTransition, contrastRatio, headerHover } from "./header-browser-contract.mjs";

const stationary = { transitionProperty: "none", transitionDuration: "0s", transitionDelay: "0s" };
const rendered = { content: '"Search"', display: "block", visibility: "visible", opacity: 1, width: 20, height: 20 };
function fixture() {
  const tokens = { "header-surface": "rgb(225, 239, 221)", "header-text": "rgb(31, 39, 43)", "header-control-surface": "rgb(237, 242, 245)", "header-selected": "rgb(214, 226, 234)", "header-selected-text": "rgb(31, 39, 43)" };
  const base = { width: 32, height: 32, centreY: 24, radii: [8, 8, 8, 8], opacity: 1, transition: stationary, foreground: tokens["header-text"], background: tokens["header-control-surface"] };
  return {
    scheme: "default", width: "wide", rem: 20, zoom: 1, tokens, header: { background: tokens["header-surface"] },
    visiblePaletteLabels: 1, revealedHiddenLabels: 0, hiddenTabStops: 0, pageOverflow: 0,
    logos: [{ background: "rgba(0, 0, 0, 0)", borderWidth: 0, boxShadow: "none" }],
    controls: [
      { ...base, name: "appearance", kind: "icon", square: true, svg: { width: 18, height: 18, offsetX: 0, offsetY: 0 } },
      { ...base, name: "Wide", kind: "width", square: false, width: 70, background: tokens["header-selected"], group: { offsetX: 0, offsetY: 0 } },
      { ...base, name: "Search", kind: "search", square: false, width: 180, searchParts: { icon: tokens["header-text"], shortcutForeground: tokens["header-text"], shortcutBackground: tokens["header-control-surface"], beforeTransition: stationary, afterTransition: stationary, rendered: { magnifier: rendered, shortcut: rendered } } },
    ],
  };
}
const inspect = value => assertHeaderSnapshot(value, { scheme: "default", label: "defect fixture" });
test("independent fixture accepts opaque semantic controls and centred differently sized artwork", () => {
  const value = fixture(); inspect(value);
  value.controls[0].svg.width = 13; value.controls[0].svg.height = 21; inspect(value);
});
for (const [name, mutate, message] of [
  ["unequal height", value => value.controls[1].height = 30, /height/],
  ["wrong corner radius", value => value.controls[1].radii = [8, 8, 8, 2], /rounding/],
  ["translucent selected surface", value => value.controls[1].background = "rgba(0,0,0,.1)", /opaque/],
  ["non-square icon action", value => value.controls[0].width = 40, /square/],
  ["off-centre actual SVG", value => value.controls[0].svg.offsetY = .51, /centred/],
  ["off-centre Wide icon and text", value => value.controls[1].group.offsetY = .51, /centred/],
  ["revealed native label", value => value.revealedHiddenLabels = 1, /hidden labels/],
  ["hidden keyboard stop", value => value.hiddenTabStops = 1, /tab order/],
  ["framed logo", value => value.logos[0].background = "rgb(255,255,255)", /unframed/],
  ["brand removed from header", value => value.header.background = "rgb(255,255,255)", /brand surface/],
  ["unreadable Search magnifier", value => value.controls[2].searchParts.icon = value.controls[2].background, /magnifier/],
  ["unreadable Search shortcut", value => value.controls[2].searchParts.shortcutForeground = value.controls[2].background, /shortcut/],
  ["hidden Search magnifier", value => value.controls[2].searchParts.rendered.magnifier = { ...rendered, opacity: 0 }, /rendered and readable/],
  ["wrong selected semantic token", value => value.controls[1].background = value.tokens["header-control-surface"], /semantic background/],
  ["horizontal reflow failure", value => value.pageOverflow = 2, /overflow/],
  ["low contrast rest token", value => { value.tokens["header-text"] = "rgb(230,230,230)"; value.controls[0].foreground = value.tokens["header-text"]; }, /contrast/],
]) test(`rejects ${name}`, () => { const value = fixture(); mutate(value); assert.throws(() => inspect(value), message); });

test("foreground alpha is composited for accessible contrast", () => {
  assert.equal(contrastRatio("rgb(0,0,0)", "rgb(255,255,255)"), 21);
  assert.ok(contrastRatio("rgba(0,0,0,.2)", "rgb(255,255,255)") < 2);
  assert.throws(() => contrastRatio("rgb(0,0,0)", "rgba(255,255,255,.5)"), /opaque/);
  for (const pair of Object.values(headerHover)) assert.ok(contrastRatio(pair.foreground, pair.background) >= 4.5);
});
test("crossfades and delayed colour switching are refused independently of geometry", () => {
  assert.throws(() => assertNoColourTransition({ ...stationary, transitionProperty: "color, background-color", transitionDuration: "0s, .2s" }, "action"), /crossfade/);
  assert.throws(() => assertNoColourTransition({ ...stationary, transitionProperty: "all", transitionDelay: ".2s" }, "action"), /delay/);
  assertNoColourTransition({ ...stationary, transitionProperty: "outline-offset", transitionDuration: ".2s" }, "focus");
});
