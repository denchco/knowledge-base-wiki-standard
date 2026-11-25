import assert from "node:assert/strict";
import test from "node:test";
import { assertHeaderSnapshot, assertNoColourTransition, contrastRatio } from "./header-browser-contract.mjs";

const stationary = { transitionProperty: "none", transitionDuration: "0s", transitionDelay: "0s" };
const rendered = { content: '"Search"', display: "block", visibility: "visible", opacity: 1, width: 20, height: 20 };
function fixture() {
  // A bright amber header with a pale action surface deliberately has less than
  // 3:1 fill-to-header contrast. Its permanent border supplies both boundaries.
  const tokens = {
    "header-surface": "rgb(222, 158, 40)", "header-control-text": "rgb(48, 34, 13)",
    "header-control-surface": "rgb(248, 217, 155)", "header-control-border": "rgb(94, 67, 28)",
    "header-selected": "rgb(252, 226, 181)", "header-selected-text": "rgb(48, 34, 13)",
  };
  const base = { weight: 400, shadow: "none", surround: tokens["header-surface"], borders: Array.from({ length: 4 }, () => ({ color: tokens["header-control-border"], width: 1, style: "solid" })), width: 32, height: 32, centreY: 24, radii: [8, 8, 8, 8], opacity: 1, transition: stationary, foreground: tokens["header-control-text"], background: tokens["header-control-surface"] };
  return {
    scheme: "default", width: "wide", rem: 20, zoom: 1, tokens, header: { background: tokens["header-surface"] },
    visiblePaletteLabels: 1, revealedHiddenLabels: 0, hiddenTabStops: 0, pageOverflow: 0,
    logos: [{ background: "rgba(0, 0, 0, 0)", borderWidth: 0, boxShadow: "none" }],
    controls: [
      { ...base, name: "appearance", kind: "icon", square: true, svg: { width: 18, height: 18, offsetX: 0, offsetY: 0 } },
      { ...base, name: "Wide", kind: "width", square: false, width: 70, weight: 700, group: { offsetX: 0, offsetY: 0 } },
      { ...base, name: "Search", kind: "search", square: false, width: 180, searchParts: { icon: tokens["header-control-text"], shortcutForeground: tokens["header-control-text"], shortcutBackground: tokens["header-control-surface"], beforeTransition: stationary, afterTransition: stationary, rendered: { magnifier: rendered, shortcut: rendered } } },
    ].map(control => ({ ...control, borders: structuredClone(control.borders) })),
  };
}
const inspect = value => assertHeaderSnapshot(value, { scheme: "default", label: "defect fixture" });
test("independent fixture accepts opaque semantic controls and centred differently sized artwork", () => {
  const value = fixture();
  const { minimumBorderToFillContrast, minimumBorderToHeaderContrast } = inspect(value);
  assert.ok(contrastRatio(value.controls[0].background, value.header.background) < 2);
  assert.ok(minimumBorderToFillContrast >= 3 && minimumBorderToHeaderContrast >= 3);
  value.controls[0].svg.width = 13; value.controls[0].svg.height = 21; inspect(value);
});
for (const [name, mutate, message] of [
  ["absent appearance outline", value => value.controls[0].borders.forEach(edge => { edge.width = 0; }), /opaque solid CSS pixel/],
  ["missing width outline edge", value => value.controls[1].borders[2].style = "none", /opaque solid CSS pixel/],
  ["transparent search outline", value => value.controls[2].borders[0].color = "transparent", /opaque solid CSS pixel/],
  ["outline disappears into header", value => value.controls[2].surround = value.tokens["header-control-border"], /perimeter against header/],
  ["outline disappears into fill", value => {
    value.controls[0].foreground = "rgb(255,255,255)";
    value.controls[0].background = value.tokens["header-control-border"];
  }, /perimeter against fill/],
  ["conflicting outline token", value => value.controls[1].borders[0].color = "rgb(0,0,0)", /shared border colour/],
  ["selected width stripe", value => value.controls[1].shadow = "inset 0px -2px white", /stripe/],
  ["unmarked width selection", value => value.controls[1].weight = 400, /bold/],
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
  ["wrong selected semantic token", value => value.controls[1].background = value.tokens["header-selected"], /shared resting background/],
  ["horizontal reflow failure", value => value.pageOverflow = 2, /overflow/],
  ["low contrast rest token", value => { value.tokens["header-control-text"] = value.tokens["header-control-surface"]; value.controls[0].foreground = value.tokens["header-control-text"]; }, /contrast/],
]) test(`rejects ${name}`, () => { const value = fixture(); mutate(value); assert.throws(() => inspect(value), message); });

test("foreground alpha is composited for accessible contrast", () => {
  assert.equal(contrastRatio("rgb(0,0,0)", "rgb(255,255,255)"), 21);
  assert.ok(contrastRatio("rgba(0,0,0,.2)", "rgb(255,255,255)") < 2);
  assert.throws(() => contrastRatio("rgb(0,0,0)", "rgba(255,255,255,.5)"), /opaque/);
});
test("crossfades and delayed colour switching are refused independently of geometry", () => {
  assert.throws(() => assertNoColourTransition({ ...stationary, transitionProperty: "color, background-color", transitionDuration: "0s, .2s" }, "action"), /crossfade/);
  assert.throws(() => assertNoColourTransition({ ...stationary, transitionProperty: "all", transitionDelay: ".2s" }, "action"), /delay/);
  assertNoColourTransition({ ...stationary, transitionProperty: "outline-offset", transitionDuration: ".2s" }, "focus");
});
