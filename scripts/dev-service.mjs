import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import http from "node:http";
import net from "node:net";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const config = pkg.codexDevServer;
const registryPath = join(homedir(), ".config/codex-dev-servers/registry.json");
const registryLockPath = `${registryPath}.lock`;
const logDir = join(homedir(), ".local/state/codex-dev-servers");
const markerSchema = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/service-identity-v1.json";
const healthPath = config.healthPath ?? "/assets/service-identity.json";
const label = `local.codex-dev.${config.serviceId}`;
const plistPath = join(homedir(), "Library/LaunchAgents", `${label}.plist`);
const urlHost = config.host.includes(":") ? `[${config.host}]` : config.host;
const url = `http://${urlHost}:${config.port}/`;
const maxHealthBytes = 64 * 1024;
const registryLockStaleMs = 30_000;
const registryLockWaitMs = 10_000;
const registryLockRetryMs = 50;
const governedRegistryFields = Object.freeze([
  "serviceId",
  "projectRoot",
  "host",
  "port",
  "healthPath",
  "packagePath",
  "url",
  "command",
  "label",
  "plistPath",
  "stdoutLog",
  "stderrLog",
]);

validateConfig();

function validateConfig() {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("package.json must define codexDevServer.");
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(config.serviceId ?? "")) {
    throw new Error("codexDevServer.serviceId must be a stable lowercase identifier.");
  }
  if (!isLoopbackHost(config.host)) {
    throw new Error("codexDevServer.host must be a loopback host.");
  }
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) {
    throw new Error("codexDevServer.port must be an unprivileged TCP port.");
  }
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(healthPath)) {
    throw new Error("codexDevServer.healthPath must be a local absolute URL path without a query or fragment.");
  }
  if (!/^npm run [A-Za-z0-9:_-]+$/.test(config.command ?? "")) {
    throw new Error("codexDevServer.command must use the form `npm run <script>`.");
  }
}

function isLoopbackHost(host) {
  return host === "localhost" || host === "::1" || /^127(?:\.\d{1,3}){3}$/.test(host ?? "");
}

export function hostsOverlap(left, right) {
  const wildcard = new Set(["*", "0.0.0.0", "::"]);
  if (wildcard.has(left) || wildcard.has(right)) return true;
  if (left === right) return true;
  return isLoopbackHost(left) && isLoopbackHost(right);
}

export function isSupportedRegistry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.version !== undefined && value.version !== 1) return false;
  if (value.schema !== undefined && value.schema !== "codex-dev-servers/v1") return false;
  return value.version === 1 || value.schema === "codex-dev-servers/v1";
}

function loadRegistry() {
  if (!existsSync(registryPath)) return { version: 1, services: {} };
  const value = JSON.parse(readFileSync(registryPath, "utf8"));
  if (!isSupportedRegistry(value) || !value.services || typeof value.services !== "object" || Array.isArray(value.services)) {
    throw new Error(`Unsupported or malformed service registry: ${registryPath}`);
  }
  return value;
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function lockOwner(lockPath) {
  try {
    return JSON.parse(readFileSync(join(lockPath, "owner.json"), "utf8"));
  } catch {
    return null;
  }
}

function recoverStaleLock(lockPath, staleMs) {
  let age;
  try {
    age = Date.now() - statSync(lockPath).mtimeMs;
  } catch (error) {
    if (error.code === "ENOENT") return true;
    throw error;
  }
  if (age <= staleMs) return false;
  const owner = lockOwner(lockPath);
  if (owner && processIsAlive(owner.pid)) return false;
  try {
    rmSync(lockPath, { recursive: true, force: false });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return true;
    throw error;
  }
}

export async function withRegistryLock(callback, options = {}) {
  const lockPath = options.lockPath ?? registryLockPath;
  const staleMs = options.staleMs ?? registryLockStaleMs;
  const waitMs = options.waitMs ?? registryLockWaitMs;
  const retryMs = options.retryMs ?? registryLockRetryMs;
  const token = randomUUID();
  const startedAt = Date.now();
  mkdirSync(dirname(lockPath), { recursive: true });

  while (true) {
    try {
      mkdirSync(lockPath, { mode: 0o700 });
      try {
        writeFileSync(join(lockPath, "owner.json"), `${JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() })}\n`, {
          encoding: "utf8",
          mode: 0o600,
        });
      } catch (error) {
        rmSync(lockPath, { recursive: true, force: true });
        throw error;
      }
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      recoverStaleLock(lockPath, staleMs);
      if (Date.now() - startedAt >= waitMs) {
        throw new Error(`Timed out waiting for local service registry lock ${lockPath}.`);
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, retryMs));
    }
  }

  try {
    return await callback();
  } finally {
    const owner = lockOwner(lockPath);
    if (owner?.token === token) rmSync(lockPath, { recursive: true, force: true });
  }
}

export function writeRegistryAtomic(registry, targetPath = registryPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
  const temporaryPath = join(dirname(targetPath), `.${config.serviceId}.registry-${process.pid}-${randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, targetPath);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    try {
      unlinkSync(temporaryPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

export function registrationOwnershipMatches(entry, expected) {
  if (!entry || typeof entry !== "object") return false;
  const projectRoot = entry.projectRoot ?? entry.root;
  return typeof projectRoot === "string"
    && entry.serviceId === expected.serviceId
    && resolve(projectRoot) === resolve(expected.projectRoot)
    && entry.host === expected.host
    && Number(entry.port) === Number(expected.port);
}

export function registrationMatches(entry, expected) {
  return registrationFieldMismatches(entry, expected).length === 0;
}

export function registrationFieldMismatches(entry, expected) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [...governedRegistryFields];
  return governedRegistryFields.filter((field) => !Object.hasOwn(entry, field)
    || !Object.hasOwn(expected, field)
    || entry[field] !== expected[field]);
}

export function findRegistryConflict(registry, expected) {
  const sameId = registry?.services?.[expected.serviceId];
  if (sameId && !registrationOwnershipMatches(sameId, expected)) {
    return { kind: "service-id", serviceId: expected.serviceId, entry: sameId };
  }
  for (const [serviceId, entry] of Object.entries(registry?.services ?? {})) {
    if (serviceId === expected.serviceId) continue;
    if (Number(entry.port) === Number(expected.port) && hostsOverlap(entry.host, expected.host)) {
      return { kind: "endpoint", serviceId, entry };
    }
  }
  return null;
}

export function markerMatches(value, serviceId) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && value.schemaVersion === 1
    && value.serviceId === serviceId
    && (value.$schema === undefined || value.$schema === markerSchema);
}

export function probeIdentity({ host, port, path = "/assets/service-identity.json", serviceId, timeoutMs = 2500 }) {
  return new Promise((resolveHealth) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveHealth(result);
    };
    const request = http.get({ host, port, path, timeout: timeoutMs }, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on("data", (chunk) => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > maxHealthBytes) {
          response.destroy();
          finish({ ok: false, code: "response-too-large", statusCode: response.statusCode ?? null });
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        if (response.statusCode !== 200) {
          finish({ ok: false, code: "http-status", statusCode: response.statusCode ?? null });
          return;
        }
        const contentType = response.headers["content-type"] ?? "";
        if (!/^application\/(?:[a-z0-9.+-]+\+)?json\b/i.test(contentType)) {
          finish({ ok: false, code: "content-type", statusCode: response.statusCode });
          return;
        }
        let marker;
        try {
          marker = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          finish({ ok: false, code: "invalid-marker", statusCode: response.statusCode });
          return;
        }
        if (!markerMatches(marker, serviceId)) {
          finish({
            ok: false,
            code: "identity-mismatch",
            statusCode: response.statusCode,
            actualServiceId: marker?.serviceId ?? null,
          });
          return;
        }
        finish({ ok: true, code: "healthy", statusCode: response.statusCode });
      });
    });
    request.on("error", () => finish({ ok: false, code: "unreachable", statusCode: null }));
    request.on("timeout", () => {
      request.destroy();
      finish({ ok: false, code: "timeout", statusCode: null });
    });
  });
}

export function canBindEndpoint(host, port) {
  return new Promise((resolveAvailability, rejectAvailability) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolveAvailability(false);
      else rejectAvailability(error);
    });
    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) => {
        if (error) rejectAvailability(error);
        else resolveAvailability(true);
      });
    });
  });
}

export function serviceStatusPasses({ registered, installed, loaded, identityHealthy }) {
  return registered === true && installed === true && loaded === true && identityHealthy === true;
}

function expectedRegistration() {
  return {
    serviceId: config.serviceId,
    projectRoot: root,
    host: config.host,
    port: config.port,
    healthPath,
    packagePath: join(root, "package.json"),
    url,
    command: config.command,
    label,
    plistPath,
    stdoutLog: join(logDir, `${config.serviceId}.out.log`),
    stderrLog: join(logDir, `${config.serviceId}.err.log`),
  };
}

async function register() {
  await withRegistryLock(async () => {
    const registry = loadRegistry();
    const expected = expectedRegistration();
    const conflict = findRegistryConflict(registry, expected);
    if (conflict?.kind === "service-id") {
      throw new Error(`Service ID ${config.serviceId} is already registered to ${conflict.entry.projectRoot ?? conflict.entry.root ?? "another project"}.`);
    }
    if (conflict?.kind === "endpoint") {
      throw new Error(`Endpoint ${config.host}:${config.port} conflicts with registered service ${conflict.serviceId}.`);
    }

    const available = await canBindEndpoint(config.host, config.port);
    if (!available) {
      const identity = await health();
      const sameId = registry.services[config.serviceId];
      if (!registrationOwnershipMatches(sameId, expected) || !identity.ok) {
        throw new Error(`Endpoint ${config.host}:${config.port} has an active listener that is not the registered ${config.serviceId} service (${identity.code}).`);
      }
    }

    registry.services[config.serviceId] = { ...expected, updatedAt: new Date().toISOString() };
    writeRegistryAtomic(registry);
  });
  console.log(`Registered ${config.serviceId} at ${url}`);
}

function xml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function launchDomain() {
  if (typeof process.getuid !== "function") throw new Error("The reference persistent service adapter requires macOS launchd.");
  return `gui/${process.getuid()}`;
}

function npmInvocation() {
  const script = config.command.slice("npm run ".length);
  const npmRootResult = spawnSync("npm", ["root", "-g"], { encoding: "utf8" });
  if (npmRootResult.error || npmRootResult.status !== 0) {
    throw new Error(`Cannot resolve the npm CLI for the LaunchAgent: ${npmRootResult.error?.message ?? npmRootResult.stderr.trim()}`);
  }
  const npmCli = join(npmRootResult.stdout.trim(), "npm/bin/npm-cli.js");
  if (!existsSync(npmCli)) throw new Error(`Resolved npm CLI does not exist: ${npmCli}`);
  return { npmCli, script };
}

export function renderLaunchAgentPlist(contract) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(contract.label)}</string>
<key>ProgramArguments</key><array><string>${xml(contract.node)}</string><string>${xml(contract.npmCli)}</string><string>run</string><string>${xml(contract.script)}</string></array>
<key>WorkingDirectory</key><string>${xml(contract.projectRoot)}</string>
<key>EnvironmentVariables</key><dict><key>HOST</key><string>${xml(contract.host)}</string><key>PORT</key><string>${contract.port}</string><key>PATH</key><string>${xml(contract.path)}</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>StandardOutPath</key><string>${xml(contract.stdoutLog)}</string>
<key>StandardErrorPath</key><string>${xml(contract.stderrLog)}</string>
</dict></plist>\n`;
}

function expectedLaunchAgentPlist() {
  const node = process.execPath;
  const { npmCli, script } = npmInvocation();
  return renderLaunchAgentPlist({
    label,
    node,
    npmCli,
    script,
    projectRoot: root,
    host: config.host,
    port: config.port,
    path: `${dirname(node)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
    stdoutLog: join(logDir, `${config.serviceId}.out.log`),
    stderrLog: join(logDir, `${config.serviceId}.err.log`),
  });
}

export function launchAgentInstallationMatches(actualPlist, expectedPlist) {
  return typeof actualPlist === "string"
    && typeof expectedPlist === "string"
    && actualPlist === expectedPlist;
}

function installed() {
  if (!existsSync(plistPath)) return false;
  return launchAgentInstallationMatches(readFileSync(plistPath, "utf8"), expectedLaunchAgentPlist());
}

async function install() {
  await register();
  mkdirSync(dirname(plistPath), { recursive: true });
  mkdirSync(logDir, { recursive: true });
  writeFileSync(plistPath, expectedLaunchAgentPlist());
  console.log(`Installed ${plistPath}`);
}

function launchctl(args, quiet = false) {
  return spawnSync("launchctl", args, { encoding: "utf8", stdio: quiet ? "ignore" : "inherit" });
}

function loaded() {
  return launchctl(["print", `${launchDomain()}/${label}`], true).status === 0;
}

async function health() {
  return probeIdentity({ host: config.host, port: config.port, path: healthPath, serviceId: config.serviceId });
}

export async function inspectManagedServiceStatus() {
  const entry = loadRegistry().services[config.serviceId];
  const registered = registrationMatches(entry, expectedRegistration());
  const installationMatches = installed();
  const isLoaded = loaded();
  const identity = await health();
  return {
    registered,
    installed: installationMatches,
    loaded: isLoaded,
    identityHealthy: identity.ok === true,
    identity,
    expectedUrl: url,
    registeredUrl: entry?.url ?? null,
  };
}

function openCanonicalUrl(canonicalUrl) {
  return spawnSync("open", [canonicalUrl], { encoding: "utf8" });
}

export async function handoffManagedPreview(options = {}) {
  const statusProvider = options.statusProvider ?? inspectManagedServiceStatus;
  const opener = options.opener ?? openCanonicalUrl;
  const current = await statusProvider();
  if (!serviceStatusPasses(current) || current.registeredUrl !== current.expectedUrl) {
    const failed = ["registered", "installed", "loaded", "identityHealthy"]
      .filter((field) => current[field] !== true);
    if (current.registeredUrl !== current.expectedUrl) failed.push("canonicalUrl");
    throw new Error(`Refusing preview handoff because managed service status failed: ${failed.join(", ")}.`);
  }
  const result = await opener(current.expectedUrl);
  if (result === false || result?.error || (result?.status !== undefined && result.status !== 0)) {
    throw new Error(`Browser handoff failed for the exact canonical URL ${current.expectedUrl}.`);
  }
  return current.expectedUrl;
}

function stop() {
  launchctl(["bootout", launchDomain(), plistPath], true);
}

function stopOwned() {
  const entry = loadRegistry().services[config.serviceId];
  if (!registrationOwnershipMatches(entry, expectedRegistration())) {
    throw new Error(`Refusing to stop ${config.serviceId} because this project does not own its registry entry.`);
  }
  stop();
}

async function start() {
  const owned = registrationOwnershipMatches(loadRegistry().services[config.serviceId], expectedRegistration());
  if (owned && existsSync(plistPath) && loaded()) stop();
  await install();
  const result = launchctl(["bootstrap", launchDomain(), plistPath]);
  if (result.status !== 0) throw new Error(`launchctl bootstrap failed with status ${result.status ?? "unknown"}.`);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await health();
    if (current.ok) {
      console.log(`Health: healthy identity ${config.serviceId} (${url})`);
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  const current = await health();
  throw new Error(`LaunchAgent loaded but ${url} did not return identity ${config.serviceId} at ${healthPath} (${current.code}).`);
}

async function status() {
  const current = await inspectManagedServiceStatus();
  console.log(
    `Registered: ${current.registered}\nInstalled: ${current.installed}\nLoaded: ${current.loaded}\n`
    + `Health: ${current.identityHealthy ? "healthy" : current.identity.code}\nIdentity: ${config.serviceId}\n`
    + `Health URL: ${new URL(healthPath, url)}\nURL: ${url}`,
  );
  if (!serviceStatusPasses(current) || current.registeredUrl !== current.expectedUrl) process.exitCode = 1;
}

async function preview() {
  const canonicalUrl = await handoffManagedPreview();
  console.log(`Opened ${canonicalUrl}`);
}

async function uninstall() {
  await withRegistryLock(async () => {
    const registry = loadRegistry();
    const entry = registry.services[config.serviceId];
    if (entry && !registrationOwnershipMatches(entry, expectedRegistration())) {
      throw new Error(`Refusing to remove registry entry ${config.serviceId} because this project does not own it.`);
    }
    if (!entry && existsSync(plistPath)) {
      throw new Error(`Refusing to remove unregistered LaunchAgent ${plistPath}.`);
    }
    if (entry) stop();
    if (existsSync(plistPath)) rmSync(plistPath);
    delete registry.services[config.serviceId];
    writeRegistryAtomic(registry);
  });
}

function list() {
  const entries = Object.values(loadRegistry().services);
  for (const entry of entries) {
    console.log(`${entry.serviceId}\t${entry.url ?? `${entry.host}:${entry.port}`}\t${entry.projectRoot ?? entry.root ?? ""}`);
  }
}

async function main() {
  const command = process.argv[2];
  if (command === "register") await register();
  else if (command === "install") await install();
  else if (command === "start") await start();
  else if (command === "stop") stopOwned();
  else if (command === "restart") { stopOwned(); await start(); }
  else if (command === "status") await status();
  else if (command === "preview") await preview();
  else if (command === "list") list();
  else if (command === "uninstall") await uninstall();
  else throw new Error("Use register, install, start, stop, restart, status, preview, list, or uninstall.");
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
