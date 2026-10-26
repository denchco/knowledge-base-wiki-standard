#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// @google/design.md 0.4.0 embeds Zod 3.25.76 in BOTH published entry points.
// An npm override alone leaves GHSA-mrhx-c7xc-m3w5 in the executed code.
// Remove that exact bundle segment and import the audited dependency instead.
// Qualify any upstream release or Zod upgrade before changing these checksums.
export const qualifiedBundles = {
  "index.js": {
    upstream: "874a6a4dde402f563882621f01b4789a7a12c64bc8a7abb1e18731e97eb271f0",
    patched: "881160e6b7deb36cca4f72482011134cdd67ec56bd517bbd237f8fe14c391599",
  },
  "linter/index.js": {
    upstream: "a76ab9c2ee8a1bc6ad709167c3c7f06e64a5e2253d9718d3c2a8c51824272423",
    patched: "7d702924e3a4dc6c0aab4eb69c06e7f9bdfbf70e098b9074070d5d7c03f9434f",
  },
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
const startMarker = "// ../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/external.js";
const endMarker = "// src/linter/parser/spec.ts";
const replacement = '// Local security adapter: use the locked, patched Zod runtime.\nimport * as exports_external from "zod";\n';

export function adaptBundle(source, entry) {
  const expected = qualifiedBundles[entry];
  if (!expected) throw new Error(`Unqualified design linter entry: ${entry}`);
  const actual = hash(source);
  if (actual === expected.patched) return source;
  if (actual !== expected.upstream) throw new Error(`Design linter checksum differs: ${entry}`);
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error(`Missing embedded Zod boundaries: ${entry}`);
  const external = source.slice(0, start) + replacement + source.slice(end);
  // Zod 4 defaults skip parsing. prefault preserves the existing nested limits.
  const result = external.replace("  }).default({}),", "  }).prefault({}),");
  if (hash(result) !== expected.patched) throw new Error(`Unqualified adapted design linter: ${entry}`);
  return result;
}

export function patchDesignLinter(packageRoot = path.resolve("node_modules/@google/design.md"), { check = false } = {}) {
  const metadata = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (metadata.name !== "@google/design.md" || metadata.version !== "0.4.0") {
    throw new Error("Design linter adapter is qualified only for @google/design.md 0.4.0");
  }
  // Resolve from each entry point, so a nested, stale dependency cannot win.
  const entries = Object.keys(qualifiedBundles).map((entry) => {
    const filename = path.join(packageRoot, "dist", entry);
    const require = createRequire(filename);
    const zod = JSON.parse(fs.readFileSync(require.resolve("zod/package.json"), "utf8"));
    if (zod.version !== "4.6.7") throw new Error(`Design linter requires qualified Zod 4.6.7: ${entry}`);
    const source = fs.readFileSync(filename, "utf8");
    const output = adaptBundle(source, entry);
    if (check && source !== output) throw new Error(`Embedded vulnerable Zod has not been replaced: ${entry}`);
    return { filename, source, output };
  });
  // Validate both complete bundles before writing either one.
  if (!check) for (const { filename, source, output } of entries) {
    if (source !== output) fs.writeFileSync(filename, output);
  }
  return entries.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== "--check")) throw new Error("Usage: patch-design-linter.mjs [--check]");
    const count = patchDesignLinter(undefined, { check: args.includes("--check") });
    console.log(`Qualified design linter: ${count} entry points use Zod 4.6.7; embedded Zod 3 removed.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
