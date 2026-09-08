#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkManagedLiveResponseLinks, lintDevelopmentResponseLinks, normalizeBaseUrl, probeWikiRoute } from "./development-response-links.mjs";
import { lintDevelopmentResponseHandoff } from "./development-response-handoff.mjs";

export const MAX_EVENT_BYTES = 1024 * 1024;
const CONFIG = ".codex/wiki-standard-stop.json";

export function findOptIn(cwd) {
  if (typeof cwd !== "string" || !path.isAbsolute(cwd)) throw new Error("invalid cwd");
  let root = path.resolve(cwd);
  while (true) {
    const candidate = path.join(root, CONFIG);
    if (existsSync(candidate)) {
      const config = JSON.parse(readFileSync(candidate, "utf8"));
      if (config.enabled !== true) return null;
      if (config.schemaVersion !== 1 || !["managed", "http"].includes(config.liveMode)) throw new Error("invalid opt-in configuration");
      if (!existsSync(path.join(root, ".wiki-standard.yaml"))) throw new Error("missing Wiki manifest");
      const { parse } = createRequire(path.join(root, "package.json"))("yaml");
      const manifest = parse(readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"));
      const base = normalizeBaseUrl(manifest?.capabilities?.human_wiki_url);
      if (!base || manifest?.capabilities?.development_response_links !== "live-wiki") throw new Error("missing canonical response contract");
      const loopback = /^(?:localhost|127\..*|\[::1\])$/i.test(base.hostname);
      if (loopback && config.liveMode !== "managed") throw new Error("loopback requires managed identity checks");
      return { root, liveMode: config.liveMode, baseUrl: base.href };
    }
    // Do not inherit opt-in from another repository or a parent monorepo.
    if (existsSync(path.join(root, ".git")) || existsSync(path.join(root, ".wiki-standard.yaml"))) return null;
    const parent = path.dirname(root);
    if (root === parent) return null;
    root = parent;
  }
}

function warning(code) {
  return { systemMessage: `Wiki Standard Stop check: ${code}. Validation was not established; inspect the local adapter and use the captured-response checker. No automatic continuation was requested.` };
}

export async function evaluateStop(event, options = {}) {
  if (!event || typeof event !== "object" || Array.isArray(event) || event.hook_event_name !== "Stop") return warning("DKBWS-STOP-INPUT-001");
  let config;
  try { config = (options.findOptIn ?? findOptIn)(event.cwd); }
  catch { return warning("DKBWS-STOP-CONFIG-001"); }
  if (!config) return {};
  if (typeof event.stop_hook_active !== "boolean" || typeof event.last_assistant_message !== "string" || !event.last_assistant_message.trim()) return warning("DKBWS-STOP-MESSAGE-UNAVAILABLE-001");
  if (Buffer.byteLength(event.last_assistant_message, "utf8") > MAX_EVENT_BYTES) return warning("DKBWS-STOP-SIZE-001");
  try {
    let report = lintDevelopmentResponseLinks(event.last_assistant_message, { baseUrl: config.baseUrl });
    const handoff = lintDevelopmentResponseHandoff(event.last_assistant_message);
    // Never probe outside the explicitly configured Wiki base or follow redirects.
    // A response without Wiki navigation has no claim of live service availability.
    if (report.wikiUrls.length > 8) return warning("DKBWS-STOP-ROUTE-BUDGET-001");
    if (report.wikiUrls.length && config.liveMode === "managed") {
      report = await checkManagedLiveResponseLinks(report, {
        statusProvider: options.statusProvider ?? (async () => {
          const provider = await import(pathToFileURL(path.join(config.root, "scripts/dev-service.mjs")).href);
          return provider.inspectManagedServiceStatus();
        }),
        routeProbe: options.routeProbe,
      });
    } else if (report.wikiUrls.length) {
      const probe = options.routeProbe ?? probeWikiRoute;
      for (const url of report.wikiUrls) {
        if (!(await probe(url)).ok) report.diagnostics.push({ code: "DKBWS-RESPONSE-LINK-LIVE-ROUTE-001" });
      }
    }
    const codes = [...new Set([...report.diagnostics, ...handoff.diagnostics].map(({ code }) => code))].sort();
    if (!codes.length) return {};
    // A host continuation is a new prompt. Never reflect response text, URLs,
    // exception strings or transcript contents into that higher-authority input.
    const failures = codes.slice(0, 8).join(", ");
    if (event.stop_hook_active) return warning(`DKBWS-STOP-RETRY-EXHAUSTED-001 (${failures})`);
    return {
      decision: "block",
      reason: `The optional Wiki Standard response check found ${failures}. Correct the current response once using the repository's configured live Wiki origin and DKBWS-PROMPT-001 handoff rules. Complete only the user's requested scope. Do not add work, alter configuration, or restart parked investigations to satisfy this check. If a live route cannot be verified, state that it is unavailable. Omit unnecessary Next Steps; any retained section has at most three unfinished, goal-linked actions.`,
    };
  } catch { return warning("DKBWS-STOP-VALIDATOR-FAILED-001"); }
}

export async function readEvent(stream) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > MAX_EVENT_BYTES) throw new Error("event too large");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  let result;
  try { result = await evaluateStop(await readEvent(process.stdin)); }
  catch { result = warning("DKBWS-STOP-INPUT-001"); }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
