#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import runContract from "./runtime-browser-contract.playwright.js";
import { resolveRuntimeBrowserConfiguration } from "./runtime-browser-contract-config.mjs";

const root = process.cwd();
const serverProgram = path.join(root, "scripts", "serve-built-site.mjs");
const required = [
  path.join(root, "site", "index.html"),
  serverProgram,
  path.join(root, "scripts", "runtime-browser-contract.playwright.js"),
];

for (const file of required) {
  if (fs.existsSync(file)) continue;
  console.error(`Runtime browser contract prerequisite is missing: ${path.relative(root, file)}`);
  console.error("Run npm ci, npm run build:site, and npm run browser:install before invoking this check directly.");
  process.exit(1);
}

let contractConfiguration;
try {
  contractConfiguration = resolveRuntimeBrowserConfiguration({ root });
} catch (error) {
  console.error(`Runtime browser contract configuration failed: ${error.message}`);
  process.exit(1);
}
const { routes, sources, graph, sourceLinks } = contractConfiguration;

const server = spawn(process.execPath, [serverProgram], {
  cwd: root,
  env: { ...process.env, HOST: "127.0.0.1", PORT: "0", SITE_DIR: "site" },
  stdio: ["ignore", "pipe", "pipe"],
});

let browser;
let failure;
try {
  const serverUrl = await waitForServer(server);
  const initialUrl = new URL(serverUrl);
  initialUrl.searchParams.set("question", routes.question);
  initialUrl.searchParams.set("mermaid", routes.mermaid);
  initialUrl.searchParams.set("architecture", routes.architecture);
  initialUrl.searchParams.set("table", routes.table);
  initialUrl.searchParams.set("list", routes.list);
  initialUrl.searchParams.set("sourceLinks", routes.sourceLinks);
  initialUrl.searchParams.set("sourceRegister", routes.sourceRegister);
  initialUrl.searchParams.set("sourceLinksEnabled", sourceLinks.required ? "1" : "0");
  initialUrl.searchParams.set("graph", graph.required ? "1" : "0");
  initialUrl.searchParams.set("graph2d", routes.graph2d);
  initialUrl.searchParams.set("graph3d", routes.graph3d);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(initialUrl.href, { waitUntil: "networkidle" });
  const bootstrap = await page.evaluate(() => ({
    control: Boolean(document.querySelector(".layout-width-toggle")),
    header: Boolean(document.querySelector(".md-header__inner")),
    layoutScript: [...document.scripts].some(script => script.src.includes("/assets/layout-width.js")),
    layoutStylesheet: [...document.styleSheets].some(sheet => sheet.href?.includes("/assets/layout-width.css")),
    viewport: [innerWidth, innerHeight],
  }));
  if (!bootstrap.control) {
    throw new Error(`Runtime width control did not initialize: ${JSON.stringify(bootstrap)}`);
  }
  const result = await runContract(page, {
    mermaidSources: {
      representative: mermaidFences(fs.readFileSync(path.join(root, ...sources.mermaid.split("/")), "utf8")),
      architecture: mermaidFences(fs.readFileSync(path.join(root, ...sources.architecture.split("/")), "utf8")),
    },
  });
  if (result.ok !== true) throw new Error("Runtime browser contract did not report success.");

  const graphSummary = graph.required ? ", Graphify 2D/3D desktop/mobile pixels and controls" : "";
  console.log(
    `Runtime browser contract passed: header rails ${result.header.standardLeftDelta}px/${result.header.standardRightDelta}px, ` +
    `Mermaid ${result.typography.mermaid} = table ${result.typography.table}, ` +
    `${result.tables.mobile.length} mobile table scroll contract${result.tables.mobile.length === 1 ? "" : "s"}, ` +
    `pinned local runtimes only${graphSummary}.`,
  );
} catch (error) {
  failure = error;
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

if (failure) {
  const suffix = String(failure.message).includes("Executable doesn't exist")
    ? "\nInstall the pinned Chromium build with: npm run browser:install"
    : "";
  console.error(`${failure.message}${suffix}`);
  process.exit(1);
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(
      () => reject(new Error(`Built-site server did not become ready.\n${stderr}`)),
      10000,
    );

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line);
          if (!message.ready || !message.url) continue;
          clearTimeout(timeout);
          resolve(message.url);
          return;
        } catch {
          // Wait for a complete JSON readiness line.
        }
      }
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });
    child.once("exit", code => {
      clearTimeout(timeout);
      reject(new Error(`Built-site server exited with code ${code}.\n${stderr}`));
    });
    child.once("error", error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function mermaidFences(source) {
  return [...source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map(match => match[1]);
}
