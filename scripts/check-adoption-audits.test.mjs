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
  assert.equal(inputs.catalogueIds.length, 26);
  assert.deepEqual(validateAdoptionAuditRecords(inputs), []);
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
