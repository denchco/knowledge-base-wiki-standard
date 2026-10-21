#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { deriveAppearance, renderAppearanceCss, renderAppearanceScript, renderZensicalAppearance } from "./wiki-appearance.mjs";

export function prepareWikiAppearance(root = process.cwd()) {
  const configPath = path.join(root, "config/wiki-appearance.json");
  const source = readFileSync(path.join(root, "zensical.toml"), "utf8");
  let rendered = source;
  if (existsSync(configPath)) {
    const appearance = deriveAppearance(JSON.parse(readFileSync(configPath, "utf8")));
    rendered = renderZensicalAppearance(source, appearance);
    const output = path.join(root, "docs/assets/appearance");
    mkdirSync(output, { recursive: true });
    writeFileSync(path.join(output, "appearance.css"), renderAppearanceCss(appearance));
    writeFileSync(path.join(output, "appearance.js"), renderAppearanceScript(appearance));
    writeFileSync(path.join(output, "tokens.json"), `${JSON.stringify(appearance, null, 2)}\n`);
  }
  writeFileSync(path.join(root, "zensical.appearance.toml"), rendered);
  return { configured: existsSync(configPath), configPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 2) throw new Error("Usage: node scripts/prepare-wiki-appearance.mjs (run in the Wiki root)");
  const result = prepareWikiAppearance();
  console.log(result.configured ? "Prepared configured Wiki appearance and native palette defaults." : "No appearance configuration; preserved the existing renderer settings.");
}
