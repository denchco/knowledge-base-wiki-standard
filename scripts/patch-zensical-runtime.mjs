#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const upstreamBundle = "bundle.6970bfe9.min.js";
export const patchedBundle = "bundle.344b8276.min.js";
const upstreamHash = "6970bfe94bf40f81332bae037ccf56c8a24b771826295dfe171731c77f5a09ab";
const patchedHash = "344b8276e6346a37fb3250d568980c5eea23e203ac1aff7458292aef717e075c";
const sourceSelector = '"link[rel=alternate]"';
const targetSelector = '"link[rel=alternate][hreflang]"';
const hash = (data) => createHash("sha256").update(data).digest("hex");

export function patchLocaleSelector(source) {
  if (source.split(sourceSelector).length !== 2 || source.includes(targetSelector)) {
    throw new Error("Expected exactly one unpatched Zensical locale-alternate selector");
  }
  return source.replace(sourceSelector, targetSelector);
}

// Zensical 0.0.59 treats Markdown discovery links as locale alternatives.
// Keep both standards-compatible discovery and actual locale sitemap requests;
// constrain the upstream selector instead of filtering errors or network traffic.
export function patchZensicalRuntime(siteRoot, { check = false } = {}) {
  const indexPath = path.join(siteRoot, "index.html");
  if (!fs.readFileSync(indexPath, "utf8").includes('content="zensical-0.0.59"')) throw new Error("Renderer adapter is qualified only for Zensical 0.0.59");
  const assetRoot = path.join(siteRoot, "assets", "javascripts");
  const originalPath = path.join(assetRoot, upstreamBundle);
  const patchedPath = path.join(assetRoot, patchedBundle);
  let patched;
  if (fs.existsSync(originalPath)) {
    const source = fs.readFileSync(originalPath, "utf8");
    if (hash(source) !== upstreamHash) throw new Error("Zensical upstream bundle checksum differs from the qualified 0.0.59 runtime");
    patched = patchLocaleSelector(source);
  } else {
    patched = fs.readFileSync(patchedPath, "utf8");
  }
  if (hash(patched) !== patchedHash) throw new Error("Patched Zensical runtime checksum differs from the qualified adapter");
  const html = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile() && entry.name.endsWith(".html")) html.push(filename);
    }
  }
  visit(siteRoot);
  const changes = [];
  let references = 0;
  for (const filename of html) {
    const source = fs.readFileSync(filename, "utf8");
    const output = source.replace(/(<script\b[^>]*\bsrc=["'][^"']*\/)bundle\.6970bfe9\.min\.js(["'][^>]*>)/gu, `$1${patchedBundle}$2`);
    references += (output.match(/<script\b[^>]*\bsrc=["'][^"']*\/bundle\.344b8276\.min\.js["']/gu) ?? []).length;
    if (output !== source) changes.push([filename, output]);
  }
  if (!references) throw new Error("No HTML page references the qualified Zensical bundle");
  if (check) {
    if (changes.length || fs.existsSync(originalPath) || !fs.existsSync(patchedPath)) throw new Error("Built site has not applied its pinned Zensical locale-alternate adapter");
  } else {
    fs.writeFileSync(patchedPath, patched);
    for (const [filename, content] of changes) fs.writeFileSync(filename, content);
    fs.rmSync(originalPath, { force: true });
  }
  return { renderer: "zensical-0.0.59", bundle: patchedBundle, sha256: patchedHash, pages: references };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => !["--local", "--check"].includes(arg))) throw new Error("Usage: patch-zensical-runtime.mjs [--local] [--check]");
    const result = patchZensicalRuntime(path.resolve(args.includes("--local") ? "site-local" : "site"), { check: args.includes("--check") });
    console.log(`Qualified Zensical locale-alternate adapter: ${result.pages} pages, ${result.bundle}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
