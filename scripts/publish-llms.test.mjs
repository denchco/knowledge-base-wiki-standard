import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { markdownAlternate, publishLlms } from "./publish-llms.mjs";

function fixture(base = "https://example.org/project/") {
  const root = mkdtempSync(path.join(tmpdir(), "llms-v2-"));
  for (const directory of ["docs/guide", "site/guide/page"]) mkdirSync(path.join(root, directory), { recursive: true });
  writeFileSync(path.join(root, "docs/index.md"), "# Home\n\n[Page](guide/page.md)");
  writeFileSync(path.join(root, "docs/guide/page.md"), "---\ntitle: Page\n---\n# Page\n\n[Home](../index.md)\n");
  writeFileSync(path.join(root, "docs/llms.txt"), "# Fixture\n\n> Summary\n\n## Pages\n\n- [Page](guide/page/index.md)\n");
  writeFileSync(path.join(root, "site/index.html"), `<html><head><link rel="canonical" href="${base}"></head><body>Home</body></html>`);
  writeFileSync(path.join(root, "site/guide/page/index.html"), "<html><head></head><body>Page</body></html>");
  return root;
}

test("root and GitHub Pages-style subpaths get exact Markdown alternate and describedby targets", () => {
  for (const base of ["https://example.org/", "https://example.org/project/"]) {
    const root = fixture(base);
    try {
      const source = readFileSync(path.join(root, "docs/guide/page.md"), "utf8");
      const result = publishLlms(root);
      assert.equal(result.pages.length, 2);
      const html = readFileSync(path.join(root, "site/guide/page/index.html"), "utf8");
      assert.ok(html.includes(`rel="alternate" type="text/markdown" href="${base}guide/page/index.md"`));
      assert.ok(html.includes(`rel="describedby" type="text/plain" href="${base}llms.txt"`));
      assert.ok(readFileSync(path.join(root, "site/guide/page/index.md"), "utf8").includes(`[Home](${base}index.md)`));
      assert.equal(readFileSync(path.join(root, "docs/guide/page.md"), "utf8"), source);
      publishLlms(root);
      assert.equal(readFileSync(path.join(root, "site/guide/page/index.html"), "utf8"), html);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test("alternate preserves code examples and external links while rebasing page and asset destinations", () => {
  const source = "[Page](guide/page.md#section)\n![Image](assets/example.png)\n[External](https://example.net/a)\n`[Sample](guide/page.md)`\n```md\n[Example](guide/page.md)\n```";
  const result = markdownAlternate(source, "index.md", "https://example.org/project/", new Set(["guide/page.md"]));
  assert.ok(result.includes("[Page](https://example.org/project/guide/page/index.md#section)"));
  assert.ok(result.includes("![Image](https://example.org/project/assets/example.png)"));
  assert.ok(result.includes("[External](https://example.net/a)"));
  assert.ok(result.includes("`[Sample](guide/page.md)`"));
  assert.ok(result.includes("[Example](guide/page.md)"));
});

test("missing canonical root and unbuilt discovery targets fail visibly", () => {
  const root = fixture();
  try {
    writeFileSync(path.join(root, "docs/llms.txt"), "# Fixture\n\n## Pages\n- [Missing](missing/index.md)");
    assert.throws(() => publishLlms(root), /not a published/);
    writeFileSync(path.join(root, "site/index.html"), "<html><head></head></html>");
    assert.throws(() => publishLlms(root), /canonical/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
