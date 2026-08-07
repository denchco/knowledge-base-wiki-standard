import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractClickableDestinations,
  lintDevelopmentResponseLinks,
  maskCode,
  normalizeBaseUrl,
  parseArguments,
} from "./development-response-links.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/development-response-links.mjs");
const BASE_URL = "http://127.0.0.1:8017/";

function lint(source, baseUrl = BASE_URL) {
  return lintDevelopmentResponseLinks(source, { baseUrl, input: "response.md" });
}

test("live Wiki URLs under the exact configured base pass", () => {
  const report = lint([
    "See [requirements](http://127.0.0.1:8017/spec/requirements/#durable-standard-proposal-intake).",
    "The [proposal guide](http://127.0.0.1:8017/llm-wiki/standard-proposals/) is live.",
    "An [external authority](https://example.com/specification) remains permitted.",
  ].join("\n"));
  assert.equal(report.status, "valid");
  assert.deepEqual(report.diagnostics, []);
  assert.equal(report.baseUrl, BASE_URL);
  assert.deepEqual(report.wikiUrls, [
    "http://127.0.0.1:8017/llm-wiki/standard-proposals/",
    "http://127.0.0.1:8017/spec/requirements/#durable-standard-proposal-intake",
  ]);
});

test("local Markdown files and root-relative Wiki routes fail with stable locations", () => {
  const report = lint([
    "Read [requirements](docs/spec/requirements.md#durable-standard-proposal-intake).",
    "Open [the guide](/llm-wiki/standard-proposals/).",
    "Or [the absolute file](</Users/andrew/Projects/Wiki/docs/spec/requirements.md:92>),",
  ].join("\n"));
  assert.equal(report.status, "invalid");
  assert.deepEqual(report.diagnostics.map(({ code, line, column, target }) => ({ code, line, column, target })), [
    { code: "DKBWS-RESPONSE-LINK-WIKI-001", line: 1, column: 21, target: "docs/spec/requirements.md#durable-standard-proposal-intake" },
    { code: "DKBWS-RESPONSE-LINK-WIKI-001", line: 2, column: 18, target: "/llm-wiki/standard-proposals/" },
    { code: "DKBWS-RESPONSE-LINK-WIKI-001", line: 3, column: 25, target: "/Users/andrew/Projects/Wiki/docs/spec/requirements.md:92" },
  ]);
});

test("file and editor destinations are prohibited but code samples are not clickable", () => {
  const report = lint([
    "[File](file:///Users/andrew/Wiki/docs/index.md)",
    "<vscode://file/Users/andrew/Wiki/docs/index.md>",
    "[IDE](idea://open?file=/Users/andrew/Wiki/docs/index.md)",
    "```md",
    "[Example](file:///tmp/example.md)",
    "```",
    "`vscode://file/tmp/example.md`",
  ].join("\n"));
  assert.deepEqual(report.diagnostics.map((item) => item.code), [
    "DKBWS-RESPONSE-LINK-SCHEME-001",
    "DKBWS-RESPONSE-LINK-SCHEME-001",
    "DKBWS-RESPONSE-LINK-SCHEME-001",
  ]);
});

test("a different loopback host, port, scheme, or base path fails closed", () => {
  const report = lint([
    "[host](http://localhost:8017/spec/requirements/)",
    "[port](http://127.0.0.1:9000/spec/requirements/)",
    "[scheme](https://127.0.0.1:8017/spec/requirements/)",
    "[path](http://127.0.0.1:8017/outside/)",
  ].join("\n"), "http://127.0.0.1:8017/wiki/");
  assert.equal(report.diagnostics.length, 4);
  assert.ok(report.diagnostics.every((item) => item.code === "DKBWS-RESPONSE-LINK-BASE-MISMATCH-001"));
});

test("plain implementation paths remain allowed but clickable local artifacts fail", () => {
  const report = lint([
    "Changed `scripts/development-response-links.mjs`.",
    "Test: /Users/andrew/Projects/Wiki/scripts/development-response-links.test.mjs",
    "Inspect [the script](scripts/development-response-links.mjs) if needed.",
    "Screenshot: ![Wiki page](/Users/andrew/Projects/Wiki/docs/page.png)",
    "Manifest: `.wiki-standard.yaml`.",
  ].join("\n"));
  assert.equal(report.status, "invalid");
  assert.deepEqual(report.diagnostics.map(({ code, target }) => ({ code, target })), [
    { code: "DKBWS-RESPONSE-LINK-FILE-001", target: "scripts/development-response-links.mjs" },
  ]);
});

test("reference links are checked and extraction ignores fenced or inline code", () => {
  const source = [
    "Use [the requirements][requirements].",
    "[requirements]: ../spec/requirements.md",
    "`[ignored](docs/index.md)`",
    "~~~md",
    "[ignored](docs/index.md)",
    "~~~",
  ].join("\n");
  assert.equal(maskCode(source).length, source.length);
  assert.deepEqual(extractClickableDestinations(source).map((item) => item.target), ["../spec/requirements.md"]);
  assert.deepEqual(lint(source).diagnostics.map((item) => item.code), ["DKBWS-RESPONSE-LINK-WIKI-001"]);
});

test("base URL and arguments have deterministic validation", () => {
  assert.equal(normalizeBaseUrl("https://wiki.example.test/base").href, "https://wiki.example.test/base/");
  assert.equal(normalizeBaseUrl("file:///tmp/wiki"), null);
  assert.equal(normalizeBaseUrl("https://user@example.test/"), null);
  assert.equal(normalizeBaseUrl("https://example.test/?preview=1"), null);
  assert.deepEqual(parseArguments(["--input=response.md", "--base-url", BASE_URL, "--json"]), {
    input: "response.md",
    baseUrl: BASE_URL,
    json: true,
    help: false,
  });
  assert.throws(() => parseArguments(["unexpected"]), /Unknown argument/);
  assert.throws(() => parseArguments(["--base-url", "--json"]), /requires a value/);
  assert.throws(() => parseArguments(["--input="]), /requires a value/);
});

test("stdin CLI emits stable JSON and uses status exit codes", () => {
  const result = spawnSync(process.execPath, [CLI, "--base-url", BASE_URL, "--json"], {
    cwd: ROOT,
    input: "See [requirements](docs/spec/requirements.md).\n",
    encoding: "utf8",
  });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.equal(report.schema, "dkbws-development-response-links-v1");
  assert.equal(report.status, "invalid");
  assert.equal(report.input, "stdin");
  assert.deepEqual(report.diagnostics.map((item) => item.code), ["DKBWS-RESPONSE-LINK-WIKI-001"]);
});

test("--input reads UTF-8 response text and valid text output is stable", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "dkbws-response-links-"));
  try {
    const input = path.join(directory, "response.md");
    writeFileSync(input, `[Wiki](${BASE_URL}spec/requirements/)\n`, "utf8");
    const result = spawnSync(process.execPath, [CLI, "--base-url", BASE_URL, "--input", input], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "Development response links VALID: 0 diagnostic(s).\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("missing or non-HTTP base URLs produce a stable diagnostic", () => {
  const report = lintDevelopmentResponseLinks("No links.", { input: "response.md" });
  assert.equal(report.status, "invalid");
  assert.deepEqual(report.diagnostics.map((item) => item.code), ["DKBWS-RESPONSE-LINK-BASE-001"]);
});
