#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const rendererVersion = "0.1.1";
export const rendererBundle = "bundle.3cb411a8.min.js";
const rendererBundleHash = "3cb411a815f9f840c846297066b77797d7a182ed5b1676c0dc7316bcf51379d9";
const localeSelector = '"link[rel=alternate][hreflang]"';

export function checkZensicalRuntime(siteRoot) {
  const renderer = `zensical-${rendererVersion}`;
  const index = fs.readFileSync(path.join(siteRoot, "index.html"), "utf8");
  const rootUrl = index.match(/<link rel="canonical" href="([^"]+)">/u)?.[1];
  if (!rootUrl) throw new Error("The built renderer must declare its canonical root URL");
  const bundleRelative = `assets/javascripts/${rendererBundle}`;
  const bundleUrl = new URL(bundleRelative, rootUrl).href;
  const bundlePath = path.join(siteRoot, bundleRelative);
  const bundle = fs.readFileSync(bundlePath, "utf8");
  if (createHash("sha256").update(bundle).digest("hex") !== rendererBundleHash) {
    throw new Error("Zensical UI bundle checksum differs from the qualified runtime");
  }
  if (bundle.split(localeSelector).length !== 2 || bundle.includes('"link[rel=alternate]"')) {
    throw new Error("Zensical UI must select only locale alternates with a language tag");
  }

  const assets = path.join(siteRoot, "assets");
  let pages = 0;
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (filename !== assets) visit(filename);
      } else if (entry.isFile() && filename.endsWith(".html")) {
        const html = fs.readFileSync(filename, "utf8");
        const generator = html.match(/<meta name="generator" content="([^"]+)">/u)?.[1];
        if (generator !== renderer) {
          throw new Error(`Renderer is qualified only for Zensical ${rendererVersion}: ${path.relative(siteRoot, filename)}`);
        }
        const bundles = [...html.matchAll(/<script\b[^>]*\bsrc=(["'])([^"']*\/bundle\.[a-f0-9]+\.min\.js)\1[^>]*>/gu)];
        const pageUrl = new URL(path.relative(siteRoot, filename).split(path.sep).join("/"), rootUrl);
        if (bundles.length !== 1 || new URL(bundles[0][2], pageUrl).href !== bundleUrl) {
          throw new Error(`Page must load the qualified Zensical UI bundle exactly once: ${path.relative(siteRoot, filename)}`);
        }
        pages++;
      }
    }
  }

  visit(siteRoot);
  if (!pages) throw new Error("No HTML pages found for the qualified Zensical UI bundle");
  return { renderer, bundle: rendererBundle, sha256: rendererBundleHash, pages };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.some(arg => arg !== "--local")) {
      throw new Error("Usage: check-zensical-runtime.mjs [--local]");
    }
    const result = checkZensicalRuntime(path.resolve(args.includes("--local") ? "site-local" : "site"));
    console.log(`Qualified ${result.renderer} runtime: ${result.pages} pages, ${result.bundle}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
