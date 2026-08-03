import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const config = pkg.codexDevServer;
const registryPath = join(homedir(), ".config/codex-dev-servers/registry.json");
const logDir = join(homedir(), ".local/state/codex-dev-servers");
const label = `local.codex-dev.${config.serviceId}`;
const plistPath = join(homedir(), "Library/LaunchAgents", `${label}.plist`);
const url = `http://${config.host}:${config.port}/`;

function loadRegistry() {
  if (!existsSync(registryPath)) return { version: 1, services: {} };
  const value = JSON.parse(readFileSync(registryPath, "utf8"));
  if (!value.services) value.services = {};
  return value;
}

function register() {
  const registry = loadRegistry();
  for (const [id, entry] of Object.entries(registry.services)) {
    if (id !== config.serviceId && Number(entry.port) === config.port && [entry.host, config.host].some((host) => ["127.0.0.1", "localhost", "0.0.0.0", "*"].includes(host))) {
      throw new Error(`Endpoint ${config.host}:${config.port} conflicts with registered service ${id}.`);
    }
  }
  registry.services[config.serviceId] = {
    serviceId: config.serviceId, projectRoot: root, packagePath: join(root, "package.json"),
    host: config.host, port: config.port, url, command: config.command, label, plistPath,
    stdoutLog: join(logDir, `${config.serviceId}.out.log`), stderrLog: join(logDir, `${config.serviceId}.err.log`),
    updatedAt: new Date().toISOString()
  };
  mkdirSync(dirname(registryPath), { recursive: true });
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  console.log(`Registered ${config.serviceId} at ${url}`);
}

function xml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function install() {
  register();
  mkdirSync(dirname(plistPath), { recursive: true });
  mkdirSync(logDir, { recursive: true });
  const node = process.execPath;
  const npmRoot = spawnSync("npm", ["root", "-g"], { encoding: "utf8" }).stdout.trim();
  const npmCli = join(npmRoot, "npm/bin/npm-cli.js");
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(label)}</string>
<key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(npmCli)}</string><string>run</string><string>dev</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>EnvironmentVariables</key><dict><key>HOST</key><string>${config.host}</string><key>PORT</key><string>${config.port}</string><key>PATH</key><string>${xml(`${dirname(node)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`)}</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>StandardOutPath</key><string>${xml(join(logDir, `${config.serviceId}.out.log`))}</string>
<key>StandardErrorPath</key><string>${xml(join(logDir, `${config.serviceId}.err.log`))}</string>
</dict></plist>\n`;
  writeFileSync(plistPath, plist);
}

function launchctl(args, quiet = false) {
  return spawnSync("launchctl", args, { encoding: "utf8", stdio: quiet ? "ignore" : "inherit" });
}

function health() {
  return new Promise((resolveHealth) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume();
      resolveHealth(res.statusCode === 200);
    });
    req.on("error", () => resolveHealth(false));
    req.on("timeout", () => { req.destroy(); resolveHealth(false); });
  });
}

async function start() {
  install();
  launchctl(["bootout", `gui/${process.getuid()}`, plistPath], true);
  const result = launchctl(["bootstrap", `gui/${process.getuid()}`, plistPath]);
  if (result.status !== 0) process.exit(result.status ?? 1);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await health()) { console.log(`Health: healthy (${url})`); return; }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`LaunchAgent loaded but ${url} did not return HTTP 200.`);
}

async function status() {
  const registered = Boolean(loadRegistry().services[config.serviceId]);
  const installed = existsSync(plistPath);
  const loaded = launchctl(["print", `gui/${process.getuid()}/${label}`], true).status === 0;
  const healthy = await health();
  console.log(`Registered: ${registered}\nInstalled: ${installed}\nLoaded: ${loaded}\nHealth: ${healthy ? "healthy" : "unhealthy"}\nURL: ${url}`);
  if (!healthy) process.exitCode = 1;
}

function stop() { launchctl(["bootout", `gui/${process.getuid()}`, plistPath], true); }
function uninstall() {
  stop();
  if (existsSync(plistPath)) rmSync(plistPath);
  const registry = loadRegistry();
  delete registry.services[config.serviceId];
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
}

function list() {
  const entries = Object.values(loadRegistry().services);
  for (const entry of entries) console.log(`${entry.serviceId}\t${entry.url ?? `${entry.host}:${entry.port}`}\t${entry.projectRoot ?? entry.root ?? ""}`);
}

const command = process.argv[2];
try {
  if (command === "register") register();
  else if (command === "install") install();
  else if (command === "start") await start();
  else if (command === "stop") stop();
  else if (command === "restart") { stop(); await start(); }
  else if (command === "status") await status();
  else if (command === "list") list();
  else if (command === "uninstall") uninstall();
  else throw new Error("Use register, install, start, stop, restart, status, list, or uninstall.");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
