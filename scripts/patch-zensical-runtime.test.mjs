import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { patchLocaleSelector, patchZensicalRuntime, upstreamBundle, patchedBundle } from "./patch-zensical-runtime.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zensical-adapter-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "assets/javascripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "nested"));
  const upstream = path.resolve(".venv/lib/python3.12/site-packages/zensical/templates/assets/javascripts", upstreamBundle);
  fs.copyFileSync(upstream, path.join(root, "assets/javascripts", upstreamBundle));
  for (const page of ["index.html", "nested/index.html"]) fs.writeFileSync(path.join(root, page), `<meta name="generator" content="zensical-0.0.59"><link rel="alternate" type="text/markdown" href="https://example.test/nested/index.md"><script src="${page.startsWith("nested") ? ".." : "."}/assets/javascripts/${upstreamBundle}"></script>`);
  return root;
}

test("renderer adapter retains Markdown alternates, changes locale selection, and uses a matching content-hash filename", (t) => {
  const root = fixture(t);
  assert.throws(() => patchZensicalRuntime(root, { check: true }), /has not applied/);
  const result = patchZensicalRuntime(root);
  assert.equal(result.pages, 2);
  assert(fs.readFileSync(path.join(root, "assets/javascripts", patchedBundle), "utf8").includes('"link[rel=alternate][hreflang]"'));
  assert(!fs.existsSync(path.join(root, "assets/javascripts", upstreamBundle)));
  const html = fs.readFileSync(path.join(root, "nested/index.html"), "utf8");
  assert(html.includes('rel="alternate" type="text/markdown"'));
  assert(html.includes(`../assets/javascripts/${patchedBundle}`));
  assert.deepEqual(patchZensicalRuntime(root), result);
  assert.deepEqual(patchZensicalRuntime(root, { check: true }), result);
});

test("unknown renderer bytes and missing or duplicate selector targets fail closed", (t) => {
  assert.throws(() => patchLocaleSelector("no selector"), /exactly one/);
  assert.throws(() => patchLocaleSelector('"link[rel=alternate]";"link[rel=alternate]"'), /exactly one/);
  const root = fixture(t);
  fs.appendFileSync(path.join(root, "assets/javascripts", upstreamBundle), "unexpected code");
  assert.throws(() => patchZensicalRuntime(root), /checksum differs/);
  assert(fs.readFileSync(path.join(root, "index.html"), "utf8").includes(upstreamBundle));
});

test("verification rejects changed patched code and a renderer version requiring requalification", (t) => {
  const root = fixture(t);
  patchZensicalRuntime(root);
  fs.appendFileSync(path.join(root, "assets/javascripts", patchedBundle), "unexpected code");
  assert.throws(() => patchZensicalRuntime(root, { check: true }), /checksum differs/);
  fs.writeFileSync(path.join(root, "index.html"), '<meta name="generator" content="zensical-0.0.60">');
  assert.throws(() => patchZensicalRuntime(root), /qualified only/);
});
