#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { buildRuntimeAssets, compareRuntimeAssets } from "./runtime-bundle.mjs";

try {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--check")) throw new Error("Usage: node scripts/sync-runtime-assets.mjs [--check]");
  const assets = await buildRuntimeAssets();
  if (args.includes("--check")) {
    const failures = compareRuntimeAssets(assets);
    if (failures.length) throw new Error(`${failures.join("\n")}\nRun npm run prepare:runtime after npm ci.`);
    console.log("Runtime bundle and CycloneDX SBOM inspection passed; Mermaid embeds exactly DOMPurify 3.4.15.");
  } else {
    for (const [destination, output] of assets) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const current = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : "";
      if (current !== output) fs.writeFileSync(destination, output, "utf8");
    }
    console.log("Prepared pinned browser runtimes, inspected Mermaid sanitizer, and emitted deterministic runtime metadata/SBOM.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
