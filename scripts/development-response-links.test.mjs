import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkManagedLiveResponseLinks,
  extractClickableDestinations,
  lintDevelopmentResponseLinks,
  maskCode,
  normalizeBaseUrl,
  parseArguments,
  probeWikiRoute,
} from "./development-response-links.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/development-response-links.mjs");
const BASE_URL = "http://127.0.0.1:8017/";

function lint(source, baseUrl = BASE_URL) {
  return lintDevelopmentResponseLinks(source, { baseUrl, input: "response.md" });
}

function passingManagedStatus(overrides = {}) {
  return {
    registered: true,
    installed: true,
    loaded: true,
    identityHealthy: true,
    expectedUrl: BASE_URL,
    registeredUrl: BASE_URL,
    ...overrides,
  };
}

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  try {
    await callback(server.address().port);
  } finally {
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  }
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

test("HTML href destinations are checked, entity-decoded, and excluded inside code or comments", () => {
  const report = lint([
    '<a class="wiki" href="http://127.0.0.1:8017/spec/requirements/">Requirements</a>',
    "<A HREF='docs/spec/requirements.md'>Local</A>",
    '<area href="file&#x3a;///Users/andrew/Wiki/docs/index.md">',
    '<!-- <a href="docs/ignored.md">ignored</a> -->',
    '`<a href="docs/also-ignored.md">ignored</a>`',
  ].join("\n"));
  assert.deepEqual(report.wikiUrls, ["http://127.0.0.1:8017/spec/requirements/"]);
  assert.deepEqual(report.diagnostics.map(({ code, target }) => ({ code, target })), [
    { code: "DKBWS-RESPONSE-LINK-WIKI-001", target: "docs/spec/requirements.md" },
    { code: "DKBWS-RESPONSE-LINK-SCHEME-001", target: "file:///Users/andrew/Wiki/docs/index.md" },
  ]);
});

test("plain GFM-autolinked HTTP URLs are checked without duplicate Markdown targets", () => {
  const report = lint([
    "Live: http://127.0.0.1:8017/spec/requirements/.",
    "Wrong: http://localhost:8017/spec/requirements/.",
    "External: https://example.com/reference.",
    "[Already linked](http://127.0.0.1:8017/architecture/)",
    "`http://localhost:8017/ignored/`",
    "```text",
    "http://localhost:8017/also-ignored/",
    "```",
  ].join("\n"));
  assert.deepEqual(report.wikiUrls, [
    "http://127.0.0.1:8017/architecture/",
    "http://127.0.0.1:8017/spec/requirements/",
  ]);
  assert.deepEqual(report.diagnostics.map(({ code, line, target }) => ({ code, line, target })), [
    { code: "DKBWS-RESPONSE-LINK-BASE-MISMATCH-001", line: 2, target: "http://localhost:8017/spec/requirements/" },
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
    "[Encoded](file&#x3a;///Users/andrew/Wiki/docs/encoded.md)",
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
    "Remote screenshot: ![Wiki](http://localhost:8017/not-navigation.png)",
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
    managedLive: false,
    help: false,
  });
  assert.equal(parseArguments(["--base-url", BASE_URL, "--managed-live"]).managedLive, true);
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

test("syntax-only CLI remains network-independent when the configured URL is offline", () => {
  const offline = "http://127.0.0.1:65530/";
  const result = spawnSync(process.execPath, [CLI, "--base-url", offline], {
    cwd: ROOT,
    input: `Offline syntax fixture: ${offline}spec/requirements/.\n`,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "Development response links VALID: 0 diagnostic(s).\n");
});

test("managed-live mode verifies complete identity status and every distinct Wiki route", async () => {
  const report = lint([
    `[Requirements](${BASE_URL}spec/requirements/)`,
    `Raw: ${BASE_URL}architecture/`,
  ].join("\n"));
  const probed = [];
  const checked = await checkManagedLiveResponseLinks(report, {
    statusProvider: async () => passingManagedStatus(),
    routeProbe: async (url) => {
      probed.push(url);
      return { ok: true, code: "healthy", statusCode: 200, url };
    },
  });
  assert.equal(checked.status, "valid");
  assert.equal(checked.live.status, "valid");
  assert.deepEqual(probed, [
    `${BASE_URL}architecture/`,
    `${BASE_URL}spec/requirements/`,
  ]);
  assert.deepEqual(checked.live.routes.map(({ url, ok, statusCode }) => ({ url, ok, statusCode })), [
    { url: `${BASE_URL}architecture/`, ok: true, statusCode: 200 },
    { url: `${BASE_URL}spec/requirements/`, ok: true, statusCode: 200 },
  ]);
});

test("managed-live mode refuses each failed service component before probing routes", async () => {
  const report = lint(`Wiki: ${BASE_URL}spec/requirements/`);
  for (const field of ["registered", "installed", "loaded", "identityHealthy"]) {
    let probed = false;
    const checked = await checkManagedLiveResponseLinks(report, {
      statusProvider: async () => passingManagedStatus({ [field]: false }),
      routeProbe: async () => { probed = true; return { ok: true, statusCode: 200 }; },
    });
    assert.equal(checked.status, "invalid", field);
    assert.equal(probed, false, field);
    assert.ok(checked.diagnostics.some((item) => item.code === "DKBWS-RESPONSE-LINK-LIVE-IDENTITY-001" && item.message.includes(field)), field);
  }
});

test("managed-live mode requires the exact registered base and reports every failed route", async () => {
  const report = lint([
    `One: ${BASE_URL}spec/requirements/`,
    `Two: ${BASE_URL}architecture/`,
  ].join("\n"));
  let probed = false;
  const mismatched = await checkManagedLiveResponseLinks(report, {
    statusProvider: async () => passingManagedStatus({ registeredUrl: "http://localhost:8017/" }),
    routeProbe: async () => { probed = true; return { ok: true, statusCode: 200 }; },
  });
  assert.equal(probed, false);
  assert.deepEqual(mismatched.diagnostics.map((item) => item.code), ["DKBWS-RESPONSE-LINK-LIVE-BASE-001"]);

  const checked = await checkManagedLiveResponseLinks(report, {
    statusProvider: async () => passingManagedStatus(),
    routeProbe: async (url) => ({
      ok: url.endsWith("/architecture/"),
      code: url.endsWith("/architecture/") ? "healthy" : "http-status",
      statusCode: url.endsWith("/architecture/") ? 200 : 404,
      url,
    }),
  });
  assert.equal(checked.status, "invalid");
  assert.deepEqual(checked.diagnostics.map(({ code, target }) => ({ code, target })), [
    { code: "DKBWS-RESPONSE-LINK-LIVE-ROUTE-001", target: `${BASE_URL}spec/requirements/` },
  ]);
  assert.equal(checked.live.routes.length, 2);
});

test("route probe requires HTTP 200 and removes URL fragments from the request", async () => {
  const requested = [];
  await withServer((request, response) => {
    requested.push(request.url);
    response.writeHead(request.url === "/healthy/" ? 200 : 404);
    response.end("fixture");
  }, async (port) => {
    const healthy = await probeWikiRoute(`http://127.0.0.1:${port}/healthy/#section`);
    const missing = await probeWikiRoute(`http://127.0.0.1:${port}/missing/`);
    assert.deepEqual({ ok: healthy.ok, code: healthy.code, statusCode: healthy.statusCode }, { ok: true, code: "healthy", statusCode: 200 });
    assert.deepEqual({ ok: missing.ok, code: missing.code, statusCode: missing.statusCode }, { ok: false, code: "http-status", statusCode: 404 });
  });
  assert.deepEqual(requested, ["/healthy/", "/missing/"]);
});

test("missing or non-HTTP base URLs produce a stable diagnostic", () => {
  const report = lintDevelopmentResponseLinks("No links.", { input: "response.md" });
  assert.equal(report.status, "invalid");
  assert.deepEqual(report.diagnostics.map((item) => item.code), ["DKBWS-RESPONSE-LINK-BASE-001"]);
});
