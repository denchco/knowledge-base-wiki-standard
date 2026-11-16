import assert from "node:assert/strict";
import test from "node:test";

import {
  loadAdoptionAuditInputs,
  validateAdoptionAuditRecords,
} from "./check-adoption-audits.mjs";

function copyInputs() {
  return structuredClone(loadAdoptionAuditInputs());
}

test("the five adoption audits cover the requirement catalogue with consistent counts and unique IDs", () => {
  const inputs = copyInputs();
  assert.equal(inputs.reports.length, 5);
  assert.equal(inputs.catalogueIds.length, 28);
  assert.equal(inputs.catalogueIds.includes("DKBWS-HUMAN-003"), false);
  assert.deepEqual(validateAdoptionAuditRecords(inputs), []);
});

test("historical audits do not infer adoption of the later header contract", () => {
  const inputs = copyInputs();
  for (const { data } of inputs.reports) {
    const header = data.requirements.find(result => result.id === "DKBWS-DESIGN-002");
    assert.equal(header.status, "NOT_CHECKED");
    assert.equal(header.confidence, "LOW");
    assert.deepEqual(header.evidence_paths, []);
    assert.ok(header.limitations.length > 0);
    assert.equal(data.requirement_summary.NOT_CHECKED, 1);
    assert.match(data.audit.performed_at, /^2026-08-03/);
  }
});

test("unassessed results require an explicit evidence limitation", () => {
  const inputs = copyInputs();
  const header = inputs.reports[0].data.requirements.find(result => result.id === "DKBWS-DESIGN-002");
  delete header.limitations;
  assert.match(validateAdoptionAuditRecords(inputs).join("\n"), /must explain why a NOT_CHECKED result was not assessed/);
});

test("schema declarations and summary keep the same NOT_CHECKED vocabulary", () => {
  const inputs = copyInputs();
  inputs.schema.properties.audit.properties.status_vocabulary.const.pop();
  inputs.schema.$defs.statusSummary.required.pop();
  const errors = validateAdoptionAuditRecords(inputs).join("\n");
  assert.match(errors, /declared audit vocabulary must match/);
  assert.match(errors, /summary must require every adoption status/);
});

test("catalogue omissions and duplicate requirement IDs are rejected", () => {
  const inputs = copyInputs();
  inputs.reports[0].data.requirements[1].id = inputs.reports[0].data.requirements[0].id;
  const errors = validateAdoptionAuditRecords(inputs).join("\n");
  assert.match(errors, /contains duplicate IDs/);
  assert.match(errors, /does not cover catalogue IDs/);
});

test("summary counts are recomputed from requirement results", () => {
  const inputs = copyInputs();
  inputs.reports[0].data.requirement_summary.PASS += 1;
  const errors = validateAdoptionAuditRecords(inputs).join("\n");
  assert.match(errors, /calculated count is/);
});

test("audit IDs must be unique across records", () => {
  const inputs = copyInputs();
  inputs.reports[1].data.audit.id = inputs.reports[0].data.audit.id;
  const errors = validateAdoptionAuditRecords(inputs).join("\n");
  assert.match(errors, /duplicates docs\/conformance\/dogfood\//);
});

test("machine-specific absolute roots are rejected", () => {
  const inputs = copyInputs();
  inputs.reports[0].data.project.root = "/Users/example/Projects/private-wiki";
  const errors = validateAdoptionAuditRecords(inputs).join("\n");
  assert.match(errors, /must be portable/);
  assert.match(errors, /machine-specific absolute root/);
});
