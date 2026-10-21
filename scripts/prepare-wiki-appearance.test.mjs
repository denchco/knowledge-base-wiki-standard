import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareWikiAppearance } from "./prepare-wiki-appearance.mjs";
import { deriveAppearance } from "./wiki-appearance.mjs";

const source = readFileSync(new URL("../zensical.toml", import.meta.url), "utf8");
const config = { schemaVersion: "1.0", accent: "#e1efdd", appearance: "dark", width: "wide" };
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "wiki-appearance-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "config"));
  writeFileSync(path.join(root, "zensical.toml"), source);
  return root;
}
test("absent opt-in preserves all existing renderer settings exactly", t => {
  const root = fixture(t);
  assert.equal(prepareWikiAppearance(root).configured, false);
  assert.equal(readFileSync(path.join(root, "zensical.appearance.toml"), "utf8"), source);
  assert.equal(existsSync(path.join(root, "docs/assets/appearance")), false);
});
test("one configuration generates renderer roles and defaults without changing source", t => {
  const root = fixture(t);
  const input = JSON.stringify(config);
  writeFileSync(path.join(root, "config/wiki-appearance.json"), input);
  assert.equal(prepareWikiAppearance(root).configured, true);
  const tokens = JSON.parse(readFileSync(path.join(root, "docs/assets/appearance/tokens.json")));
  assert.deepEqual(tokens, deriveAppearance(config));
  assert.match(readFileSync(path.join(root, "zensical.appearance.toml"), "utf8"), /media = "not all"\nscheme = "default"[\s\S]*media = "all"\nscheme = "slate"/);
  assert.equal(readFileSync(path.join(root, "config/wiki-appearance.json"), "utf8"), input);
  assert.equal(readFileSync(path.join(root, "zensical.toml"), "utf8"), source);
});
test("invalid appearance fails before generating any output", t => {
  const root = fixture(t);
  writeFileSync(path.join(root, "config/wiki-appearance.json"), JSON.stringify({ ...config, width: "wider" }));
  assert.throws(() => prepareWikiAppearance(root), /Width/);
  assert.equal(existsSync(path.join(root, "zensical.appearance.toml")), false);
  assert.equal(existsSync(path.join(root, "docs/assets/appearance")), false);
});
test("graph publication consumes the same families and initial native appearance", t => {
  const root = fixture(t);
  writeFileSync(path.join(root, "config/wiki-appearance.json"), JSON.stringify(config));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./publish-graphify-assets.mjs", import.meta.url))], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const expected = deriveAppearance(config);
  for (const name of ["graph.html", "graph-3d.html"]) {
    const html = readFileSync(path.join(root, "docs/assets/graphify", name), "utf8");
    const theme = JSON.parse(html.match(/<script id="graph-theme-config" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(theme.fallbackScheme, "slate");
    for (const [scheme, family] of [["default", expected.light], ["slate", expected.dark]]) {
      for (const role of ["background", "surface", "text", "muted", "border", "accent", "accentContrast", "focus"]) assert.equal(theme.palettes[scheme][role], family[role]);
    }
  }
});
