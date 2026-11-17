import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkZensicalRuntime, rendererBundle, rendererVersion } from "./check-zensical-runtime.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zensical-runtime-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "assets/javascripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "nested"));
  fs.writeFileSync(path.join(root, "assets/standalone-graph.html"), "<!doctype html><title>Graph</title>");
  const upstream = path.resolve(".venv/lib/python3.12/site-packages/zensical_ui/templates/assets/javascripts", rendererBundle);
  const bundle = path.join(root, "assets/javascripts", rendererBundle);
  fs.copyFileSync(upstream, bundle);
  const html = `<meta name="generator" content="zensical-${rendererVersion}"><link rel="alternate" type="text/markdown" href="https://example.test/nested/index.md"><script src="../assets/javascripts/${rendererBundle}"></script>`;
  fs.writeFileSync(path.join(root, "index.html"), '<link rel="canonical" href="https://example.test/wiki/">' + html.replace("../assets", "./assets"));
  fs.writeFileSync(path.join(root, "404.html"), html.replace("../assets", "/wiki/assets"));
  const nested = path.join(root, "nested/index.html");
  fs.writeFileSync(nested, html);
  return { root, bundle, nested, html };
}

test("renderer verification retains exact upstream bytes and Markdown alternate links", (t) => {
  const { root, bundle, nested, html } = fixture(t);
  const before = fs.readFileSync(bundle);
  assert.equal(checkZensicalRuntime(root).pages, 3);
  assert.deepEqual(fs.readFileSync(bundle), before);
  assert.equal(fs.readFileSync(nested, "utf8"), html);
});

test("renderer verification rejects modified bundle bytes", (t) => {
  const { root, bundle } = fixture(t);
  fs.appendFileSync(bundle, "unexpected code");
  assert.throws(() => checkZensicalRuntime(root), /checksum differs/);
});

test("renderer verification rejects a stale page or an unqualified bundle reference", (t) => {
  const { root, nested, html } = fixture(t);
  fs.writeFileSync(nested, html.replace(`zensical-${rendererVersion}`, "zensical-0.0.59"));
  assert.throws(() => checkZensicalRuntime(root), /qualified only/);
  fs.writeFileSync(nested, html.replace(rendererBundle, "bundle.344b8276.min.js"));
  assert.throws(() => checkZensicalRuntime(root), /must load the qualified/);
  fs.writeFileSync(nested, html.replace("../assets/", "https://example.test/assets/"));
  assert.throws(() => checkZensicalRuntime(root), /must load the qualified/);
});
