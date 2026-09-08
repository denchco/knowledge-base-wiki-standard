import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canBindEndpoint,
  findRegistryConflict,
  handoffManagedPreview,
  hostsOverlap,
  launchAgentInstallationMatches,
  markerMatches,
  probeIdentity,
  registrationFieldMismatches,
  registrationMatches,
  registrationOwnershipMatches,
  renderLaunchAgentPlist,
  serviceStatusPasses,
  withRegistryLock,
  writeRegistryAtomic,
} from "./dev-service.mjs";

const schema = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/service-identity-v1.json";

function registryEntry(overrides = {}) {
  return {
    serviceId: "expected-wiki",
    projectRoot: "/tmp/expected-wiki",
    host: "127.0.0.1",
    port: 8123,
    healthPath: "/assets/service-identity.json",
    packagePath: "/tmp/expected-wiki/package.json",
    url: "http://127.0.0.1:8123/",
    command: "npm run dev",
    label: "local.codex-dev.expected-wiki",
    plistPath: "/tmp/Library/LaunchAgents/local.codex-dev.expected-wiki.plist",
    stdoutLog: "/tmp/logs/expected-wiki.out.log",
    stderrLog: "/tmp/logs/expected-wiki.err.log",
    ...overrides,
  };
}

function passingManagedStatus(overrides = {}) {
  return {
    registered: true,
    installed: true,
    loaded: true,
    identityHealthy: true,
    expectedUrl: "http://127.0.0.1:8123/",
    registeredUrl: "http://127.0.0.1:8123/",
    ...overrides,
  };
}

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  try {
    await callback(address.port);
  } finally {
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  }
}

test("service identity marker requires the schema version and exact service ID", () => {
  assert.equal(markerMatches({ $schema: schema, schemaVersion: 1, serviceId: "expected-wiki" }, "expected-wiki"), true);
  assert.equal(markerMatches({ schemaVersion: 1, serviceId: "expected-wiki" }, "expected-wiki"), true);
  assert.equal(markerMatches({ $schema: "https://example.test/wrong.json", schemaVersion: 1, serviceId: "expected-wiki" }, "expected-wiki"), false);
  assert.equal(markerMatches({ schemaVersion: 1, serviceId: "other-wiki" }, "expected-wiki"), false);
  assert.equal(markerMatches({ schemaVersion: 2, serviceId: "expected-wiki" }, "expected-wiki"), false);
});

test("identity health rejects a wrong service even when it returns HTTP 200", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ schemaVersion: 1, serviceId: "other-wiki" }));
  }, async (port) => {
    const result = await probeIdentity({ host: "127.0.0.1", port, serviceId: "expected-wiki" });
    assert.equal(result.ok, false);
    assert.equal(result.code, "identity-mismatch");
    assert.equal(result.actualServiceId, "other-wiki");
  });
});

test("identity health requires JSON at the configured path", async () => {
  await withServer((request, response) => {
    assert.equal(request.url, "/assets/service-identity.json");
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(JSON.stringify({ schemaVersion: 1, serviceId: "expected-wiki" }));
  }, async (port) => {
    const result = await probeIdentity({ host: "127.0.0.1", port, serviceId: "expected-wiki" });
    assert.deepEqual(result, { ok: false, code: "content-type", statusCode: 200 });
  });
});

test("identity health accepts the expected canonical marker", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ $schema: schema, schemaVersion: 1, serviceId: "expected-wiki" }));
  }, async (port) => {
    const result = await probeIdentity({ host: "127.0.0.1", port, serviceId: "expected-wiki" });
    assert.deepEqual(result, { ok: true, code: "healthy", statusCode: 200 });
  });
});

test("exclusive bind probe detects an unmanaged live listener", async () => {
  await withServer((_request, response) => response.end("ok"), async (port) => {
    assert.equal(await canBindEndpoint("127.0.0.1", port), false);
  });
});

test("registry status exact-compares every governed field while safety ownership stays narrow", () => {
  const expected = registryEntry();
  assert.equal(registrationMatches({ ...expected }, expected), true);
  assert.deepEqual(registrationFieldMismatches(expected, expected), []);
  for (const field of Object.keys(expected)) {
    const changed = { ...expected, [field]: field === "port" ? 8124 : `${expected[field]}-changed` };
    assert.deepEqual(registrationFieldMismatches(changed, expected), [field], field);
    assert.equal(registrationMatches(changed, expected), false, field);
  }
  const missing = { ...expected };
  delete missing.command;
  assert.deepEqual(registrationFieldMismatches(missing, expected), ["command"]);
  assert.equal(registrationMatches(missing, expected), false);
  assert.equal(registrationMatches({
    serviceId: expected.serviceId,
    projectRoot: expected.projectRoot,
    host: expected.host,
    port: expected.port,
    healthPath: expected.healthPath,
  }, expected), false);
  assert.equal(registrationOwnershipMatches({ ...expected, command: "npm run other" }, expected), true);
  assert.equal(registrationOwnershipMatches({ ...expected, projectRoot: "/tmp/other-wiki" }, expected), false);
});

test("LaunchAgent installation requires the exact generated plist job contract", () => {
  const contract = {
    label: "local.codex-dev.expected-wiki",
    node: "/opt/homebrew/bin/node",
    npmCli: "/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js",
    script: "dev",
    projectRoot: "/tmp/Wiki & Research",
    host: "127.0.0.1",
    port: 8123,
    path: "/opt/homebrew/bin:/usr/bin:/bin",
    stdoutLog: "/tmp/logs/wiki.out.log",
    stderrLog: "/tmp/logs/wiki.err.log",
  };
  const plist = renderLaunchAgentPlist(contract);
  assert.match(plist, /<key>ProgramArguments<\/key><array><string>\/opt\/homebrew\/bin\/node<\/string>/);
  assert.match(plist, /<key>WorkingDirectory<\/key><string>\/tmp\/Wiki &amp; Research<\/string>/);
  assert.equal(launchAgentInstallationMatches(plist, plist), true);
  assert.equal(launchAgentInstallationMatches(plist.replace("<string>8123</string>", "<string>8124</string>"), plist), false);
  assert.equal(launchAgentInstallationMatches("", plist), false);
});

test("registry deconfliction treats loopback aliases as one endpoint boundary", () => {
  const expected = {
    serviceId: "expected-wiki",
    projectRoot: "/tmp/expected-wiki",
    host: "127.0.0.1",
    port: 8123,
    healthPath: "/assets/service-identity.json",
  };
  assert.equal(hostsOverlap("localhost", "127.0.0.1"), true);
  assert.equal(hostsOverlap("::1", "127.0.0.1"), true);
  assert.equal(hostsOverlap("192.0.2.4", "127.0.0.1"), false);
  const registry = {
    version: 1,
    services: {
      "other-wiki": { serviceId: "other-wiki", host: "localhost", port: 8123, projectRoot: "/tmp/other" },
    },
  };
  assert.deepEqual(findRegistryConflict(registry, expected)?.kind, "endpoint");
});

test("managed status fails unless registry, installation, load, and identity all match", () => {
  const passing = { registered: true, installed: true, loaded: true, identityHealthy: true };
  assert.equal(serviceStatusPasses(passing), true);
  for (const key of Object.keys(passing)) {
    assert.equal(serviceStatusPasses({ ...passing, [key]: false }), false, `${key} must fail status`);
  }
});

test("preview handoff opens only the exact registered canonical URL after complete status passes", async () => {
  const opened = [];
  const result = await handoffManagedPreview({
    statusProvider: async () => passingManagedStatus(),
    opener: async (canonicalUrl) => { opened.push(canonicalUrl); },
  });
  assert.equal(result, "http://127.0.0.1:8123/");
  assert.deepEqual(opened, ["http://127.0.0.1:8123/"]);
});

test("preview handoff refuses every failed component and a non-exact registered URL", async () => {
  for (const field of ["registered", "installed", "loaded", "identityHealthy"]) {
    let opened = false;
    await assert.rejects(
      handoffManagedPreview({
        statusProvider: async () => passingManagedStatus({ [field]: false }),
        opener: async () => { opened = true; },
      }),
      new RegExp(field),
    );
    assert.equal(opened, false, field);
  }
  await assert.rejects(
    handoffManagedPreview({
      statusProvider: async () => passingManagedStatus({ registeredUrl: "http://localhost:8123/" }),
      opener: async () => assert.fail("opener must not run"),
    }),
    /canonicalUrl/,
  );
});

test("preview handoff reports opener failure instead of claiming success", async () => {
  await assert.rejects(
    handoffManagedPreview({
      statusProvider: async () => passingManagedStatus(),
      opener: async () => ({ status: 1 }),
    }),
    /Browser handoff failed/,
  );
});

test("concurrent reservations are serialized by the exclusive registry lock", async (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "dkbws-registry-lock-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const lockPath = path.join(directory, "registry.json.lock");
  let active = 0;
  let peak = 0;
  const completions = [];

  await Promise.all(Array.from({ length: 4 }, (_, index) => withRegistryLock(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolveWait) => setTimeout(resolveWait, 12));
    completions.push(index);
    active -= 1;
  }, { lockPath, retryMs: 2, waitMs: 2_000, staleMs: 1_000 })));

  assert.equal(peak, 1);
  assert.equal(completions.length, 4);
  assert.equal(existsSync(lockPath), false);
});

test("stale-lock recovery removes dead owners but preserves live owners", async (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "dkbws-registry-stale-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const lockPath = path.join(directory, "registry.json.lock");
  mkdirSync(lockPath);
  writeFileSync(path.join(lockPath, "owner.json"), `${JSON.stringify({ pid: 2_147_483_647, token: "dead" })}\n`);
  const old = new Date(Date.now() - 60_000);
  utimesSync(lockPath, old, old);
  let recovered = false;
  await withRegistryLock(async () => { recovered = true; }, { lockPath, retryMs: 2, waitMs: 500, staleMs: 10 });
  assert.equal(recovered, true);

  mkdirSync(lockPath);
  writeFileSync(path.join(lockPath, "owner.json"), `${JSON.stringify({ pid: process.pid, token: "live" })}\n`);
  utimesSync(lockPath, old, old);
  await assert.rejects(
    withRegistryLock(async () => {}, { lockPath, retryMs: 2, waitMs: 20, staleMs: 10 }),
    /Timed out waiting for local service registry lock/,
  );
  assert.equal(existsSync(lockPath), true);
});

test("registry publication atomically replaces one complete JSON file", (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "dkbws-registry-write-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const targetPath = path.join(directory, "registry.json");
  writeRegistryAtomic({ version: 1, services: { first: { port: 8101 } } }, targetPath);
  writeRegistryAtomic({ version: 1, services: { second: { port: 8102 } } }, targetPath);
  assert.deepEqual(JSON.parse(readFileSync(targetPath, "utf8")), {
    version: 1,
    services: { second: { port: 8102 } },
  });
  assert.deepEqual(readdirSync(directory), ["registry.json"]);
});


test("shared registry accepts both governed v1 envelopes and rejects conflicting declarations", async () => {
  const { isSupportedRegistry } = await import("./dev-service.mjs");
  assert.equal(isSupportedRegistry({ version: 1, services: {} }), true);
  assert.equal(isSupportedRegistry({ schema: "codex-dev-servers/v1", services: {} }), true);
  assert.equal(isSupportedRegistry({ version: 1, schema: "codex-dev-servers/v1", services: {} }), true);
  for (const value of [null, [], {}, {version: 2}, {schema: "other/v1"}, {version: 2, schema: "codex-dev-servers/v1"}, {version: 1, schema: "codex-dev-servers/v2"}]) assert.equal(isSupportedRegistry(value), false);
});
