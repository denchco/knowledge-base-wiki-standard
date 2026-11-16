import test from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { checkHandoffInstructions, checkNextStepsResponse, NO_UPDATE } from "./development-next-steps.mjs";

const agents = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
const policy = agents.split("<!-- DKBWS-PROMPT-001-HANDOFF:START -->")[1].split("<!-- DKBWS-PROMPT-001-HANDOFF:END -->")[0];
const item = (n) => `${n}. Proposed update: Refresh the source register's dated guidance entry. Why it matters: Readers need the current scope. Done when: The primary publication date and affected claim are checked and recorded.`;

test("shared policy and starter preserve cadence and all selection boundaries", () => {
  assert.deepEqual(checkHandoffInstructions(policy), []);
  const starter = readFileSync(new URL("../starter/templates/AGENTS.md.tmpl", import.meta.url), "utf8");
  const block = starter.split("<!-- DKBWS-PROMPT-001-HANDOFF:START -->")[1].split("<!-- DKBWS-PROMPT-001-HANDOFF:END -->")[0];
  assert.equal(block, policy);
});

test("instruction regressions cannot remove cadence, field meanings or no-update outcome", () => {
  for (const [removed, id] of [["every development cycle", "cadence"], ["continuing subject", "continuing-subject"], ["content maturity", "content-maturity"], ["Proposed update:", "proposed-update"], ["Why it matters:", "why-it-matters"], ["Done when:", "done-when"], [NO_UPDATE, "no-update-outcome"]]) {
    assert.ok(checkHandoffInstructions(policy.replaceAll(removed, "removed")).includes(`handoff.${id}`), removed);
  }
  assert.ok(checkHandoffInstructions(`${policy}\nInclude them only when the user asks.`).includes("handoff.conditional-only-policy"));
});

test("one, two or three prioritised complete recommendations pass", () => {
  for (const count of [1, 2, 3]) assert.deepEqual(checkNextStepsResponse(`Verified and committed.\n\nNext steps\n\n${Array.from({ length: count }, (_, i) => item(i + 1)).join("\n\n")}`), []);
  assert.deepEqual(checkNextStepsResponse(`**Next steps**\n\n${item(1).replaceAll("Proposed update:", "**Proposed update:**")}`), []);
});

test("an explicit no-update outcome passes without manufactured recommendations", () => {
  assert.deepEqual(checkNextStepsResponse(`Verified and committed.\n\n${NO_UPDATE}`), []);
  assert.ok(checkNextStepsResponse("Verified and committed.").includes("next-steps.missing-outcome"));
  assert.ok(checkNextStepsResponse(`<!-- ${NO_UPDATE} -->`).includes("next-steps.missing-outcome"));
  assert.ok(checkNextStepsResponse(`\`\`\`text\n${NO_UPDATE}\n\`\`\``).includes("next-steps.missing-outcome"));
});

test("missing, empty, unordered, duplicate or excessive fields/items fail", () => {
  for (const field of ["Proposed update:", "Why it matters:", "Done when:"]) assert.notDeepEqual(checkNextStepsResponse(`Next steps\n\n${item(1).replace(field, "")}`), []);
  assert.notDeepEqual(checkNextStepsResponse("Next steps\n\n1. Proposed update: Why it matters: Useful. Done when: Checked."), []);
  assert.notDeepEqual(checkNextStepsResponse(`Next steps\n\n${item(2)}`), []);
  assert.notDeepEqual(checkNextStepsResponse(`Next steps\n\n${item(1)}\n\n${item(1)}`), []);
  assert.ok(checkNextStepsResponse(`Next steps\n\n${[1,2,3,4].map(item).join("\n\n")}`).includes("next-steps.item-count"));
  assert.ok(checkNextStepsResponse(`Next steps\n\n${item(1)}\n\n${NO_UPDATE}`).includes("next-steps.conflicting-outcomes"));
  assert.ok(checkNextStepsResponse(`## Next steps\n\n${item(1)}\n\n## Next steps\n\n${item(1)}`).includes("next-steps.duplicate-sections"));
  assert.notDeepEqual(checkNextStepsResponse(`Next steps\n\n${item(1)} Done when: Another condition.`), []);
});

test("CLI rejects missing outcomes and accepts the explicit no-update case from stdin", () => {
  const script = new URL("./development-next-steps.mjs", import.meta.url);
  assert.equal(spawnSync(process.execPath, [fileURLToPath(script)], {input:NO_UPDATE, encoding:"utf8"}).status, 0);
  assert.equal(spawnSync(process.execPath, [fileURLToPath(script)], {input:"Finished.", encoding:"utf8"}).status, 1);
  assert.equal(spawnSync(process.execPath, [fileURLToPath(script),"--unknown"], {encoding:"utf8"}).status, 2);
});
