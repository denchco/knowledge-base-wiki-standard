#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PLUGIN_FILES = [
  ".codex-plugin/plugin.json", "hooks/hooks.json", "skills/wiki-standard/SKILL.md",
];
export const SHARED_SCRIPTS = ["codex-stop-hook.mjs", "development-response-links.mjs", "development-response-handoff.mjs"];

export function packageWikiPlugin(root = ROOT, output = path.join(root, "output/plugins/wiki-standard")) {
  // Refuse unexpected files instead of accidentally distributing a stale payload.
  const expected = new Set([...PLUGIN_FILES, ...SHARED_SCRIPTS.map((file) => `scripts/${file}`), "LICENSE", "package-integrity.json"]);
  function inspect(directory, prefix = "") {
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const relative = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) inspect(path.join(directory, entry.name), relative);
      else if (!entry.isFile() || !expected.has(relative)) throw new Error(`Unexpected package output entry: ${relative}. Use a fresh generated output directory.`);
    }
  }
  inspect(output);
  const digests = {};
  for (const [source, relative] of [
    ...PLUGIN_FILES.map((file) => [path.join(root, "plugins/wiki-standard", file), file]),
    ...SHARED_SCRIPTS.map((file) => [path.join(root, "scripts", file), `scripts/${file}`]),
    [path.join(root, "LICENSE"), "LICENSE"],
  ]) {
    const destination = path.join(output, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination);
    digests[relative] = createHash("sha256").update(readFileSync(destination)).digest("hex");
  }
  writeFileSync(path.join(output, "package-integrity.json"), `${JSON.stringify({ schemaVersion: 1, files: digests }, null, 2)}\n`);
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(packageWikiPlugin());
