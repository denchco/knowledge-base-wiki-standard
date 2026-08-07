#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPORT_SCHEMA = "dkbws-development-response-links-v1";
const PROHIBITED_SCHEME = /^(?:file|vscode|vscode-insiders|idea|cursor|subl|atom):\/\//i;
const WIKI_ROUTE_PREFIXES = new Set([
  "architecture",
  "graph",
  "llm-wiki",
  "reference",
  "research",
  "sources",
  "spec",
]);

function diagnostic(code, message, remediation, options = {}) {
  return {
    code,
    severity: "error",
    line: options.line ?? 1,
    column: options.column ?? 1,
    target: options.target ?? null,
    message,
    remediation,
  };
}

function locationAt(source, offset) {
  const prefix = source.slice(0, Math.max(0, offset));
  const lines = prefix.split("\n");
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function blankExceptNewlines(value) {
  return value.replace(/[^\n]/g, " ");
}

/**
 * Mask fenced and inline code without changing offsets. Markdown destinations in
 * code samples are examples, not clickable response links.
 */
export function maskCode(source) {
  const lines = source.match(/.*(?:\n|$)/g) ?? [];
  let fenced = null;
  let masked = "";

  for (const line of lines) {
    const marker = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
    if (fenced) {
      masked += blankExceptNewlines(line);
      if (marker && marker[1][0] === fenced.character && marker[1].length >= fenced.length) fenced = null;
      continue;
    }
    if (marker) {
      fenced = { character: marker[1][0], length: marker[1].length };
      masked += blankExceptNewlines(line);
      continue;
    }
    masked += line;
  }

  return masked.replace(/(`+)([\s\S]*?)\1/g, (match) => blankExceptNewlines(match));
}

function unescapeMarkdownTarget(target) {
  return target.replace(/\\([\\`()<>[\]])/g, "$1");
}

function inlineDestinations(source) {
  const results = [];
  for (let cursor = 0; cursor < source.length - 1; cursor += 1) {
    if (source[cursor] !== "]" || source[cursor + 1] !== "(") continue;
    const lineStart = source.lastIndexOf("\n", cursor) + 1;
    const openingBracket = source.lastIndexOf("[", cursor);
    if (openingBracket >= lineStart && source[openingBracket - 1] === "!") continue;
    let position = cursor + 2;
    while (position < source.length && /[ \t]/.test(source[position])) position += 1;
    const start = position;
    if (source[position] === "<") {
      position += 1;
      const targetStart = position;
      while (position < source.length && source[position] !== ">" && source[position] !== "\n") position += 1;
      if (source[position] === ">") {
        results.push({ kind: "markdown", target: source.slice(targetStart, position), offset: targetStart });
        cursor = position;
      }
      continue;
    }

    let depth = 0;
    let escaped = false;
    while (position < source.length) {
      const character = source[position];
      if (escaped) {
        escaped = false;
        position += 1;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        position += 1;
        continue;
      }
      if (character === "(") depth += 1;
      else if (character === ")") {
        if (depth === 0) break;
        depth -= 1;
      } else if (/\s/.test(character) && depth === 0) break;
      position += 1;
    }
    if (position > start) {
      results.push({ kind: "markdown", target: source.slice(start, position), offset: start });
      cursor = position;
    }
  }
  return results;
}

function referenceDestinations(source) {
  const results = [];
  const pattern = /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*(?:<([^>\n]+)>|([^\s\n]+))/gm;
  for (const match of source.matchAll(pattern)) {
    const target = match[1] ?? match[2];
    results.push({
      kind: "reference",
      target,
      offset: match.index + match[0].indexOf(target),
    });
  }
  return results;
}

function autolinkDestinations(source) {
  const results = [];
  const pattern = /<((?:https?|file|vscode|vscode-insiders|idea|cursor|subl|atom):\/\/[^>\s]+)>/gi;
  for (const match of source.matchAll(pattern)) {
    results.push({ kind: "autolink", target: match[1], offset: match.index + 1 });
  }
  return results;
}

export function extractClickableDestinations(source) {
  const visible = maskCode(source);
  const deduplicated = new Map();
  for (const item of [
    ...inlineDestinations(visible),
    ...referenceDestinations(visible),
    ...autolinkDestinations(visible),
  ]) {
    const key = `${item.offset}\0${item.target}`;
    if (!deduplicated.has(key)) deduplicated.set(key, { ...item, target: unescapeMarkdownTarget(item.target) });
  }
  return [...deduplicated.values()].sort((left, right) => left.offset - right.offset || (left.target < right.target ? -1 : left.target > right.target ? 1 : 0));
}

export function normalizeBaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
  return parsed;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function targetPath(target) {
  return safeDecode(target.split(/[?#]/, 1)[0])
    .replace(/\\/g, "/")
    .replace(/:\d+(?::\d+)?$/, "");
}

function hasUriScheme(target) {
  return /^[A-Za-z][A-Za-z\d+.-]*:/.test(target);
}

function isLoopback(hostname) {
  const normal = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normal === "localhost" || normal === "::1" || normal.startsWith("127.");
}

function isWithinBase(candidate, base) {
  if (candidate.protocol !== base.protocol || candidate.host !== base.host) return false;
  const basePath = base.pathname;
  const candidatePath = candidate.pathname;
  return candidatePath === basePath.slice(0, -1) || candidatePath.startsWith(basePath);
}

function localWikiPath(target) {
  const candidate = targetPath(target);
  if (!candidate || candidate.startsWith("#") || candidate.startsWith("?")) return false;

  const trimmed = candidate.replace(/^\.\//, "");
  const withoutParents = trimmed.replace(/^(?:\.\.\/)+/, "");
  const absoluteFilesystemPath = /^(?:[A-Za-z]:\/|\/Users\/|\/home\/|\/var\/|\/private\/|\/opt\/)/.test(withoutParents);
  if (/\.md$/i.test(withoutParents)) return !absoluteFilesystemPath || /(?:^|\/)docs\//i.test(withoutParents);
  if (absoluteFilesystemPath) return false;

  if (candidate.startsWith("/")) return true;
  const firstSegment = withoutParents.split("/", 1)[0];
  return WIKI_ROUTE_PREFIXES.has(firstSegment) && (withoutParents.includes("/") || !path.posix.extname(withoutParents));
}

function classifyTarget(target, base) {
  if (PROHIBITED_SCHEME.test(target)) return "prohibited-scheme";

  if (/^https?:\/\//i.test(target)) {
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return "other";
    }
    if (isWithinBase(parsed, base)) return "valid-wiki-url";
    if (parsed.hostname === base.hostname || isLoopback(parsed.hostname)) return "wrong-wiki-url";
    return "external-url";
  }

  if (target.startsWith("//")) {
    let parsed;
    try {
      parsed = new URL(`${base.protocol}${target}`);
    } catch {
      return "other";
    }
    if (parsed.hostname === base.hostname || isLoopback(parsed.hostname)) return "wrong-wiki-url";
    return "external-url";
  }

  if (!hasUriScheme(target) && localWikiPath(target)) return "local-wiki-path";
  if (!hasUriScheme(target) && target && !target.startsWith("#") && !target.startsWith("?")) return "local-file-path";
  return "other";
}

function rawProhibitedUris(source, occupied) {
  const visible = maskCode(source);
  const results = [];
  const pattern = /\b(?:file|vscode|vscode-insiders|idea|cursor|subl|atom):\/\/[^\s<>()\]]+/gi;
  for (const match of visible.matchAll(pattern)) {
    if (!occupied.has(match.index)) results.push({ kind: "raw-uri", target: match[0], offset: match.index });
  }
  return results;
}

export function lintDevelopmentResponseLinks(source, options = {}) {
  const input = options.input ?? "stdin";
  const base = normalizeBaseUrl(options.baseUrl ?? "");
  if (!base) {
    const diagnostics = [diagnostic(
      "DKBWS-RESPONSE-LINK-BASE-001",
      "The Wiki base URL must be an absolute HTTP(S) URL without credentials, query, or fragment.",
      "Pass --base-url with the exact live Wiki root, for example http://127.0.0.1:8017/.",
      { target: options.baseUrl ?? null },
    )];
    return { schema: REPORT_SCHEMA, status: "invalid", input, baseUrl: options.baseUrl ?? null, wikiUrls: [], diagnostics };
  }

  const clickable = extractClickableDestinations(source);
  const occupied = new Set(clickable.map((item) => item.offset));
  const targets = [...clickable, ...rawProhibitedUris(source, occupied)]
    .sort((left, right) => left.offset - right.offset || (left.target < right.target ? -1 : left.target > right.target ? 1 : 0));
  const diagnostics = [];
  const wikiUrls = [];

  for (const item of targets) {
    const classification = classifyTarget(item.target, base);
    const location = locationAt(source, item.offset);
    if (classification === "valid-wiki-url") {
      wikiUrls.push(item.target);
    } else if (classification === "prohibited-scheme") {
      diagnostics.push(diagnostic(
        "DKBWS-RESPONSE-LINK-SCHEME-001",
        `Development responses must not expose ${item.target.match(/^[^:]+/)[0].toLowerCase()}:// links.`,
        "Use the configured live Wiki URL for Wiki navigation, or show an implementation path as plain code text.",
        { ...location, target: item.target },
      ));
    } else if (classification === "local-wiki-path") {
      diagnostics.push(diagnostic(
        "DKBWS-RESPONSE-LINK-WIKI-001",
        "A clickable Wiki page path is not a live Wiki URL.",
        `Replace it with an HTTP(S) URL under ${base.href}`,
        { ...location, target: item.target },
      ));
    } else if (classification === "local-file-path") {
      diagnostics.push(diagnostic(
        "DKBWS-RESPONSE-LINK-FILE-001",
        "A clickable local or repository path is not permitted in a development response.",
        "Show an implementation artifact as plain code text, or use its live Wiki URL when it has a rendered route.",
        { ...location, target: item.target },
      ));
    } else if (classification === "wrong-wiki-url") {
      diagnostics.push(diagnostic(
        "DKBWS-RESPONSE-LINK-BASE-MISMATCH-001",
        `Wiki navigation does not use the configured live base URL ${base.href}`,
        `Use the exact configured origin and base path: ${base.href}`,
        { ...location, target: item.target },
      ));
    }
  }

  diagnostics.sort((left, right) => left.line - right.line || left.column - right.column || (left.code < right.code ? -1 : left.code > right.code ? 1 : 0));
  return {
    schema: REPORT_SCHEMA,
    status: diagnostics.length ? "invalid" : "valid",
    input,
    baseUrl: base.href,
    wikiUrls: [...new Set(wikiUrls)].sort(),
    diagnostics,
  };
}

export function parseArguments(argv) {
  const options = { input: null, baseUrl: null, json: false, help: false };
  const takeValue = (option, index) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${option} requires a value.`);
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--input") options.input = takeValue(argument, index++);
    else if (argument.startsWith("--input=")) {
      options.input = argument.slice("--input=".length);
      if (!options.input) throw new Error("--input requires a value.");
    } else if (argument === "--base-url") options.baseUrl = takeValue(argument, index++);
    else if (argument.startsWith("--base-url=")) {
      options.baseUrl = argument.slice("--base-url=".length);
      if (!options.baseUrl) throw new Error("--base-url requires a value.");
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function helpText() {
  return `Usage: node scripts/development-response-links.mjs --base-url <url> [--input <file>] [--json]

Lint a development response read from stdin or --input. Wiki navigation must use
the exact configured live HTTP(S) base URL. Plain implementation paths are allowed.

Options:
  --base-url <url>  Exact live Wiki base URL (required).
  --input <file>    Read response text from a UTF-8 file instead of stdin.
  --json            Emit the stable machine-readable report.
  --help, -h        Show this help.
`;
}

function textReport(report) {
  const heading = `Development response links ${report.status.toUpperCase()}: ${report.diagnostics.length} diagnostic(s).`;
  if (!report.diagnostics.length) return heading;
  return [
    heading,
    ...report.diagnostics.map((item) => `${report.input}:${item.line}:${item.column} ${item.code} ${item.message} Target: ${item.target}`),
  ].join("\n");
}

export function run(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n${helpText()}`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(helpText());
    return 0;
  }

  let source;
  const input = options.input ?? "stdin";
  try {
    source = options.input ? readFileSync(options.input, "utf8") : readFileSync(0, "utf8");
  } catch (error) {
    const report = {
      schema: REPORT_SCHEMA,
      status: "invalid",
      input,
      baseUrl: options.baseUrl,
      wikiUrls: [],
      diagnostics: [diagnostic(
        "DKBWS-RESPONSE-LINK-INPUT-001",
        `Response input could not be read: ${error.message}`,
        "Pass a readable UTF-8 file or pipe the response through stdin.",
      )],
    };
    process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : textReport(report)}\n`);
    return 2;
  }

  const report = lintDevelopmentResponseLinks(source, { baseUrl: options.baseUrl, input });
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : textReport(report)}\n`);
  return report.status === "valid" ? 0 : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = run();
