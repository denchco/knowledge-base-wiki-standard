import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

const require = createRequire(import.meta.url);
const ajvRequire = createRequire(require.resolve("ajv"));
const uri = ajvRequire("fast-uri");

// Bounded inert vectors from fast-uri v3.1.9's scheme-validation,
// relative-normalization-security, host-delimiter-security and
// reserved-path-normalization fixtures. No URI is fetched or executed.
// https://github.com/fastify/fast-uri/tree/v3.1.9/test

test("Ajv 8.20.0 uses the qualified fast-uri 3.1.9 implementation", () => {
  assert.equal(ajvRequire("ajv/package.json").version, "8.20.0");
  assert.equal(ajvRequire("fast-uri/package.json").version, "3.1.9");
  assert.equal(new Ajv2020().opts.uriResolver, uri);
});

test("GHSA-w74x-v6f9-j3xg: encoded schemes remain malformed and inert", () => {
  for (const value of ["%6Aavascript:void(0)", "%u006Aavascript:void(0)",
    "j%61vascript:void(0)", "%64ata:text/plain,fixture", "ht%74ps://example.test/"]) {
    assert.equal(uri.parse(value).error, "URI scheme is malformed.", value);
    assert.equal(uri.normalize(value), value);
    assert.equal(uri.equal(value, value), false);
    assert.throws(() => uri.resolve("https://example.test/schema/", value), /URI scheme is malformed/);
  }
  assert.equal(uri.equal("%68ttp://example.test/", "http://example.test/"), false);
  assert.throws(() => uri.serialize({ scheme: "foo%2Bbar", path: "value" }), /URI scheme is malformed/);
  assert.equal(uri.serialize({ scheme: "foo+bar", path: "value" }), "foo+bar:value");
});

test("GHSA-xhq7-xmqj-769h: relative normalization preserves the resolved resource", () => {
  const cases = [
    ["a/../b", "b"], ["../x", "../x"], ["x/..", "./"],
    ["../../a/./b/../c", "../../a/c"], ["a/..//x", ".//x"],
    ["./a:b", "./a:b"], ["a/../b?q#f", "b?q#f"],
  ];
  for (const [original, normalized] of cases) {
    assert.equal(uri.normalize(original), normalized, original);
    assert.equal(uri.normalize(normalized), normalized);
    for (const base of ["https://example.test/p/q/root.json", "https://example.test/", "relative/base"]) {
      assert.equal(uri.resolve(base, normalized), uri.resolve(base, original), `${base} + ${original}`);
    }
  }
  assert.equal(uri.equal("../x", "x"), false);
  assert.equal(uri.equal("a/../b", "/b"), false);
  assert.equal(uri.parse(uri.normalize("a/..//x")).host, undefined);
  assert.equal(uri.parse(uri.normalize("./a:b", { skipEscape: true })).scheme, undefined);
  assert.equal(uri.normalize("https://example.test/a/../b"), "https://example.test/b");
});

test("GHSA-wjr9-j795-jxcr: host delimiters and controls cannot silently change authority", () => {
  for (const scheme of ["http", "https", "ws", "wss"]) {
    for (const host of ["b@other.example", "ex\tample.test", "ex\nample.test", "ex\rample.test", "a b.example"]) {
      const value = `${scheme}://user@${host}/path`;
      assert.equal(uri.parse(value).error, "URI host is malformed.", JSON.stringify(value));
      assert.equal(uri.normalize(value), value);
      assert.equal(uri.equal(value, value), false);
      assert.equal(uri.equal(value, `${scheme}://user@example.test/path`), false);
      assert.throws(() => uri.resolve(`${scheme}://trusted.example/`, `//user@${host}/path`), /URI host is malformed/);
    }
  }
  assert.equal(uri.parse("custom://a@b@other.example/", { domainHost: true }).error, "URI host is malformed.");
  assert.throws(() => uri.resolve("https://trusted.example/", "//a@b%41@other.example/path"), /URI host is malformed/);
  assert.equal(uri.normalize("https://Example.TEST/"), "https://example.test/");
  assert.equal(uri.resolve("https://trusted.example/", "//user@example.test/schema"), "https://user@example.test/schema");
});

test("GHSA-333x-w4r6-6crp: suffix normalization does not synthesize an executable scheme", () => {
  const options = { reference: "suffix", scheme: "x" };
  for (const value of ["javascript:void(0)", "%6Aavascript:void(0)", "data:text/plain,fixture", "vbscript:0"]) {
    const normalized = uri.normalize(value, options);
    assert.doesNotMatch(normalized, /^(?:javascript|data|vbscript):/i);
    assert.equal(uri.parse(normalized).scheme, undefined);
  }
  assert.equal(uri.normalize("javascript:void(0)", options), "javascript%3Avoid(0)");
  assert.doesNotMatch(uri.resolve("https://example.test/base/", "%6Aavascript:void(0)", { reference: "suffix" }),
    /^(?:javascript|data|vbscript):/i);
  assert.equal(uri.normalize("path/to/file", options), "path/to/file");
  assert.equal(uri.normalize("a/b:c", options), "a/b:c");
});

test("Ajv 2020 resolves relative schema IDs, anchors and escaped JSON pointers locally", () => {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  ajv.addSchema({
    $id: "https://schemas.example.test/types/common.json",
    $defs: {
      name: { $dynamicAnchor: "name", type: "string", minLength: 2 },
      "positive/count": { type: "integer", minimum: 1 },
    },
  });
  const validate = ajv.compile({
    $id: "https://schemas.example.test/forms/root.json",
    type: "object", required: ["name", "count", "child"], additionalProperties: false,
    properties: {
      name: { $ref: "../types/./common.json#name" },
      count: { $ref: "../types/common.json#/$defs/positive~1count" },
      child: {
        $id: "nested/child.json", type: "object", required: ["name"], additionalProperties: false,
        properties: { name: { $ref: "../../types/common.json#name" } },
      },
    },
  });
  assert.equal(validate({ name: "Wiki", count: 1, child: { name: "Evidence" } }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ name: "x", count: 0, child: { name: 42 } }), false);
  assert.deepEqual(new Set(validate.errors.map(error => error.keyword)), new Set(["minLength", "minimum", "type"]));
  assert.throws(() => ajv.compile({ $id: "https://schemas.example.test/forms/missing.json", $ref: "../types/absent.json" }),
    /can't resolve reference/);
});
