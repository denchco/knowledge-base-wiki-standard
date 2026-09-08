#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER_START = "<!-- DKBWS-LLMS-V2:START -->";
const MARKER_END = "<!-- DKBWS-LLMS-V2:END -->";

function markdownFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) return markdownFiles(path.join(directory, entry.name), relative);
    return entry.isFile() && entry.name.endsWith(".md") ? [relative] : [];
  });
}

export function outputRoute(relative) {
  return relative === "index.md" || relative.endsWith("/index.md")
    ? relative.replace(/index\.md$/, "")
    : `${relative.slice(0, -3)}/`;
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function markdownAlternate(source, relative, base, knownSources) {
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  function destination(target) {
    if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return target;
    const suffixAt = target.search(/[?#]/);
    const file = suffixAt < 0 ? target : target.slice(0, suffixAt);
    const suffix = suffixAt < 0 ? "" : target.slice(suffixAt);
    if (file.startsWith("/")) return target;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), file));
    if (resolved.startsWith("../")) return target;
    const output = knownSources.has(resolved) ? `${outputRoute(resolved)}index.md` : resolved;
    return `${new URL(output, base).href}${suffix}`;
  }
  const lines = body.split("\n");
  let fence = null;
  const rewritten = lines.map((line) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return line;
    }
    if (fence) return line;
    return line.split(/(`+[^`]*`+)/g).map((part) => part.startsWith("`") ? part : part
      .replace(/(!?\[[^\]\n]*\]\()(<?)([^\s)>]+)(>?)([^)\n]*\))/g, (_, start, open, target, close, end) => `${start}${open}${destination(target)}${close}${end}`)
      .replace(/^(\s{0,3}\[[^\]]+\]:\s*)(<?)([^\s>]+)(>?)/, (_, start, open, target, close) => `${start}${open}${destination(target)}${close}`)
      .replace(/\b(href|src)=(['"])([^'"]+)\2/gi, (_, attribute, quote, target) => `${attribute}=${quote}${destination(target)}${quote}`)
    ).join("");
  }).join("\n");
  return `<!-- Derived Markdown alternate of ${relative}; canonical repository sources and registered evidence retain authority. -->\n\n${rewritten}`;
}

export function publishLlms(root = ROOT, options = {}) {
  const docs = path.join(root, options.docsDirectory ?? "docs");
  const site = path.join(root, options.siteDirectory ?? "site");
  const rootHtml = readFileSync(path.join(site, "index.html"), "utf8");
  const canonical = rootHtml.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)
    ?? rootHtml.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i);
  if (!canonical) throw new Error("Built root page must declare its canonical URL before llms publication.");
  const base = new URL(canonical[1].replace(/&amp;/g, "&"));
  if (!/^https?:$/.test(base.protocol) || !base.pathname.endsWith("/") || base.search || base.hash || base.username || base.password) throw new Error("Invalid built canonical Wiki root.");
  const sources = markdownFiles(docs);
  const knownSources = new Set(sources);
  const pages = [];
  for (const relative of sources) {
    const route = outputRoute(relative);
    const htmlFile = path.join(site, route, "index.html");
    if (!existsSync(htmlFile)) continue;
    const alternate = `${route}index.md`;
    const alternateUrl = new URL(alternate, base).href;
    const discoveryUrl = new URL("llms.txt", base).href;
    const block = `${MARKER_START}\n<link rel="alternate" type="text/markdown" href="${escapeAttribute(alternateUrl)}">\n<link rel="describedby" type="text/plain" href="${escapeAttribute(discoveryUrl)}">\n${MARKER_END}`;
    let html = readFileSync(htmlFile, "utf8").replace(/<!-- DKBWS-LLMS-V2:START -->[\s\S]*?<!-- DKBWS-LLMS-V2:END -->\n?/g, "");
    if (!/<\/head>/i.test(html)) throw new Error(`Built page lacks head: ${relative}`);
    html = html.replace(/<\/head>/i, `${block}\n</head>`);
    mkdirSync(path.dirname(path.join(site, alternate)), { recursive: true });
    writeFileSync(path.join(site, alternate), markdownAlternate(readFileSync(path.join(docs, relative), "utf8"), relative, base, knownSources));
    writeFileSync(htmlFile, html);
    pages.push({ source: relative, html: `${route}index.html`, markdown: alternate });
  }
  const discovery = readFileSync(path.join(docs, "llms.txt"), "utf8");
  for (const match of discovery.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^[a-z][a-z\d+.-]*:/i.test(match[1])) continue;
    const target = match[1].split(/[?#]/, 1)[0];
    if (target.startsWith("/") || target.includes("..") || !existsSync(path.join(site, target))) throw new Error(`llms.txt target is not a published path-scoped artifact: ${target}`);
  }
  writeFileSync(path.join(site, "llms.txt"), discovery);
  return { schemaVersion: 2, baseUrl: base.href, pages };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = publishLlms();
  console.log(`Published llms.txt v2 discovery and ${result.pages.length} Markdown alternates under ${result.baseUrl}`);
}
