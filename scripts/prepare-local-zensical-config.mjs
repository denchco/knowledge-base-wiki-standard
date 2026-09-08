#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

// Live serving must never overwrite the postprocessed static build under site/.
const source = readFileSync("zensical.toml", "utf8");
const assignments = source.match(/^site_dir\s*=.*$/gm) ?? [];
if (assignments.length !== 1 || assignments[0] !== 'site_dir = "site"') {
  throw new Error("Canonical Zensical configuration must declare exactly site_dir = \"site\"");
}
const generated = source.replace(/^site_dir\s*=.*$/m, 'site_dir = "site-local"');
writeFileSync("zensical.local.toml", generated);
console.log("Prepared isolated live preview output under site-local/.");
