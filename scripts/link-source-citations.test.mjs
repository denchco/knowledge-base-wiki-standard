import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  linkBareSourceIdentities,
  linkCitationGroups,
  sourceLinkIssues,
  validateReaderSourceLinks,
} from "./link-source-citations.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registeredIds = new Set(["SRC-001", "SRC-002", "SRC-003"]);

test("citation groups become individual exact-row links and the rewrite is idempotent", () => {
  const input = "Single [SRC-001]; list [SRC-001, SRC-002]; range [SRC-001–SRC-003].";
  const expected = [
    "Single [SRC-001](../sources.md#src-001); list [SRC-001](../sources.md#src-001), [SRC-002](../sources.md#src-002);",
    "range [SRC-001](../sources.md#src-001)–[SRC-003](../sources.md#src-003).",
  ].join(" ");
  const linked = linkCitationGroups(input, "../sources.md");
  assert.equal(linked, expected);
  assert.equal(linkCitationGroups(linked, "../sources.md"), linked);
});

test("bare source identities become individual links without creating nested links", () => {
  const input = "Bare SRC-001, SRC-002; existing [SRC-003](../sources.md#src-003); unrelated [about SRC-001](elsewhere.md).";
  const expected = "Bare [SRC-001](../sources.md#src-001), [SRC-002](../sources.md#src-002); existing [SRC-003](../sources.md#src-003); unrelated [about SRC-001](elsewhere.md).";
  assert.equal(linkBareSourceIdentities(input, "../sources.md"), expected);
  assert.equal(linkBareSourceIdentities(expected, "../sources.md"), expected);
});

test("valid source links may be nested at any reader-page depth", () => {
  const markdown = "[Official guidance](https://authority.test/guidance) with evidence [SRC-001](../../../sources.md#src-001).";
  assert.deepEqual(sourceLinkIssues(markdown, {
    file: "docs/research/settings/armed-forces/example.md",
    registeredIds,
    registeredUrls: new Set(["https://authority.test/guidance"]),
  }), []);
});

test("front matter, comments, fenced code and inline code are not reader citations", () => {
  const markdown = [
    "---",
    'description: "SRC-001 fixture"',
    "---",
    "<!-- SRC-001 -->",
    "`SRC-001`",
    "```text",
    "SRC-001",
    "```",
  ].join("\n");
  assert.deepEqual(sourceLinkIssues(markdown, { file: "docs/research/example.md", registeredIds }), []);
});

test("masking remains UTF-16 aligned and respects fence length and non-reader syntax", () => {
  const markdown = [
    "Emoji 😀 before <!-- SRC-999 --> [SRC-001](../sources.md#src-001).",
    "````text",
    "SRC-999",
    "```",
    "SRC-999",
    "````",
    "[fixture]: https://example.test/SRC-999",
    '<span data-source="SRC-999"></span>',
    "Destination [example](https://example.test/SRC-999 \"SRC-999\").",
    "Image ![SRC-999](https://unregistered.test/image.png).",
  ].join("\n");
  assert.deepEqual(sourceLinkIssues(markdown, { file: "docs/research/example.md", registeredIds }), []);
});

test("bare, combined, misdirected, mismatched and unknown source links are rejected", () => {
  const markdown = [
    "Bare [SRC-001].",
    "Combined [SRC-001, SRC-002](../sources.md#src-001).",
    "External [SRC-001](https://example.test/source).",
    "Mismatch [SRC-002](../sources.md#src-001).",
    "Unknown [SRC-999](../sources.md#src-999).",
  ].join("\n");
  const errors = sourceLinkIssues(markdown, { file: "docs/research/example.md", registeredIds }).join("\n");
  assert.match(errors, /DKBWS-LINK-002-BARE.*SRC-001 must be an individual source-row link/);
  assert.match(errors, /DKBWS-LINK-002-COMBINED/);
  assert.match(errors, /DKBWS-LINK-002-TARGET.*SRC-001 must link to/);
  assert.match(errors, /DKBWS-LINK-002-FRAGMENT.*SRC-002 fragment must be #src-002/);
  assert.match(errors, /DKBWS-LINK-002-UNKNOWN.*SRC-999 is not present in the source register/);
});

test("direct authority links must use a URL registered in the source table", () => {
  const errors = sourceLinkIssues("[Named guidance](https://unregistered.test/guidance).", {
    file: "docs/research/example.md",
    registeredIds,
    registeredUrls: new Set(["https://authority.test/guidance"]),
  }).join("\n");
  assert.match(errors, /DKBWS-LINK-002-AUTHORITY.*external authority link is not registered/);
});

test("filesystem fixtures cover conforming and nonconforming reader navigation", () => {
  assert.deepEqual(validateReaderSourceLinks(path.join(ROOT, "fixtures/conforming/reader-source-links")), []);
  const issues = validateReaderSourceLinks(path.join(ROOT, "fixtures/nonconforming/reader-source-links")).join("\n");
  assert.match(issues, /DKBWS-LINK-002-BARE.*SRC-001 must be an individual source-row link/);
  assert.match(issues, /DKBWS-LINK-002-FRAGMENT.*fragment must be #src-002/);
  assert.match(issues, /DKBWS-LINK-002-AUTHORITY.*external authority link is not registered/);
});
