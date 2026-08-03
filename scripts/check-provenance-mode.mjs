#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const mode = process.env.DKBWS_PROVENANCE_MODE ?? "maintainer";
if (!new Set(["maintainer", "distribution"]).has(mode)) {
  console.error(`DKBWS_PROVENANCE_MODE must be maintainer or distribution; received ${mode}.`);
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  ["scripts/check-provenance.mjs", "--mode", mode],
  { cwd: process.cwd(), stdio: "inherit" },
);

if (result.error) {
  console.error(`Could not run provenance check: ${result.error.message}`);
  process.exit(2);
}
process.exit(result.status ?? 1);
