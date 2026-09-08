import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { packageWikiPlugin, SHARED_SCRIPTS } from "./package-wiki-plugin.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("packaged plugin carries exact shared validators and runs outside repository without side effects", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "wiki-plugin-"));
  try {
    const output = packageWikiPlugin(ROOT, path.join(temporary, "wiki-standard"));
    const integrity = JSON.parse(readFileSync(path.join(output, "package-integrity.json"), "utf8"));
    for (const script of SHARED_SCRIPTS) {
      assert.equal(readFileSync(path.join(output, "scripts", script), "utf8"), readFileSync(path.join(ROOT, "scripts", script), "utf8"));
    }
    for (const [file, digest] of Object.entries(integrity.files)) assert.equal(createHash("sha256").update(readFileSync(path.join(output, file))).digest("hex"), digest);
    const execution = spawnSync(process.execPath, [path.join(output, "scripts/codex-stop-hook.mjs")], { input: JSON.stringify({ hook_event_name: "Stop", cwd: temporary, stop_hook_active: false, last_assistant_message: "[Bad](docs/index.md)" }), encoding: "utf8" });
    assert.equal(execution.status, 0);
    assert.deepEqual(JSON.parse(execution.stdout), {});
    assert.equal(execution.stderr, "");
    const before = readFileSync(path.join(output, "package-integrity.json"), "utf8");
    packageWikiPlugin(ROOT, output);
    assert.equal(readFileSync(path.join(output, "package-integrity.json"), "utf8"), before);
    writeFileSync(path.join(output, "unreviewed.mjs"), "unexpected payload");
    assert.throws(() => packageWikiPlugin(ROOT, output), /Unexpected package output/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
