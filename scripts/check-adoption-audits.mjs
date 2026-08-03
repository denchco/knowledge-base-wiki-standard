import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const STANDARD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIRECTORY = "docs/conformance/dogfood";
const SCHEMA_PATH = "schema/adoption-audit-report-v1.json";
const REQUIREMENTS_PATH = "docs/spec/requirements.md";

export const ADOPTION_AUDIT_SCHEMA_ID =
  "https://denchco.github.io/knowledge-base-wiki-standard/schema/adoption-audit-report-v1.json";
export const ADOPTION_STATUSES = [
  "PASS",
  "FAIL",
  "WAIVED",
  "NOT_APPLICABLE",
  "NOT_IMPLEMENTED",
];
export const ADOPTION_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"];

const TOP_LEVEL_KEYS = [
  "$schema",
  "report_version",
  "audit",
  "project",
  "formal_conformance",
  "profile_assessment",
  "role_mappings",
  "capabilities",
  "requirement_summary",
  "requirements",
  "candidate_false_positive_risks",
  "candidate_false_negative_risks",
  "recommendations",
  "audit_limitations",
];
const AUDIT_KEYS = [
  "id",
  "performed_at",
  "mode",
  "standard_name",
  "standard_version",
  "standard_snapshot",
  "status_vocabulary",
  "confidence_vocabulary",
  "confidence",
  "waivers_recognized",
  "method",
];
const PROJECT_KEYS = [
  "name",
  "root",
  "git_head",
  "working_tree_entries_at_audit",
  "graphify_graph_present",
  "graph_query",
  "local_runtime_probe",
];
const PROFILE_KEYS = [
  "declared_legacy_profile",
  "closest_candidate_profile",
  "topic_profiles",
  "confidence",
  "managed_full_readiness",
  "standard_production_readiness",
  "summary",
];
const RUNTIME_KEYS = [
  "url",
  "http_status",
  "listener_present",
  "listener_process",
  "status",
  "finding",
];
const ASSESSMENT_KEYS = ["status", "confidence", "paths", "finding", "limitations"];
const RESULT_KEYS = ["id", "status", "confidence", "evidence_paths", "finding", "limitations"];
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$/;
const REQUIREMENT_PATTERN = /^DKBWS-[A-Z]+-[0-9]{3}$/;
const CAPABILITY_PATTERN = /^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*$/;
const AUDIT_ID_PATTERN = /^dogfood-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isPortablePath(value) {
  if (!isNonEmptyString(value)) return false;
  if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) return false;
  if (/^~(?:[\\/]|$)/.test(value) || value.includes("\\")) return false;
  return !value.split("/").includes("..");
}

function hasMachineSpecificRoot(value) {
  if (typeof value !== "string") return false;
  return (
    /(?:^|[\s"'`])\/(?:Users|home|Volumes|private)\//.test(value) ||
    /(?:^|[\s"'`])[A-Za-z]:\\(?:Users|Documents and Settings)\\/.test(value) ||
    /file:\/\/\/(?:Users|home|Volumes|private)\//.test(value)
  );
}

function walkStrings(value, visitor, pointer = "$") {
  if (typeof value === "string") {
    visitor(value, pointer);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, visitor, `${pointer}[${index}]`));
    return;
  }
  if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      walkStrings(item, visitor, `${pointer}.${key}`);
    }
  }
}

function sameMembers(left, right) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((item) => rightSet.has(item));
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function validateExactKeys(value, allowed, required, add, pointer) {
  if (!isObject(value)) {
    add(pointer, "must be an object");
    return false;
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) add(`${pointer}.${key}`, "is required");
  }
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key)).sort();
  for (const key of unexpected) add(`${pointer}.${key}`, "is not allowed by the adoption-audit schema");
  return true;
}

function validateStringList(value, add, pointer, { portable = false, allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    add(pointer, "must be an array");
    return;
  }
  if (!allowEmpty && value.length === 0) add(pointer, "must contain at least one item");
  value.forEach((item, index) => {
    const valid = portable ? isPortablePath(item) : isNonEmptyString(item);
    if (!valid) add(`${pointer}[${index}]`, portable ? "must be a portable repository-relative path" : "must be a non-empty string");
  });
  const repeated = duplicates(value);
  if (repeated.length > 0) add(pointer, `contains duplicate values: ${repeated.join(", ")}`);
}

function validateAssessment(value, add, pointer) {
  if (!validateExactKeys(value, ASSESSMENT_KEYS, ["status", "confidence", "paths"], add, pointer)) return;
  if (!ADOPTION_STATUSES.includes(value.status)) add(`${pointer}.status`, "is outside the adoption status vocabulary");
  if (!ADOPTION_CONFIDENCE.includes(value.confidence)) add(`${pointer}.confidence`, "is outside the bounded confidence vocabulary");
  validateStringList(value.paths, add, `${pointer}.paths`, { portable: true, allowEmpty: true });
  if (value.finding !== undefined && !isNonEmptyString(value.finding)) add(`${pointer}.finding`, "must be a non-empty string");
  if (value.limitations !== undefined) validateStringList(value.limitations, add, `${pointer}.limitations`);
}

function validateResult(value, add, pointer, kind) {
  if (!validateExactKeys(value, RESULT_KEYS, ["id", "status", "confidence", "evidence_paths", "finding"], add, pointer)) return;
  const pattern = kind === "requirement" ? REQUIREMENT_PATTERN : CAPABILITY_PATTERN;
  if (!isNonEmptyString(value.id) || !pattern.test(value.id)) add(`${pointer}.id`, `is not a valid ${kind} ID`);
  if (!ADOPTION_STATUSES.includes(value.status)) add(`${pointer}.status`, "is outside the adoption status vocabulary");
  if (!ADOPTION_CONFIDENCE.includes(value.confidence)) add(`${pointer}.confidence`, "is outside the bounded confidence vocabulary");
  validateStringList(value.evidence_paths, add, `${pointer}.evidence_paths`, { portable: true, allowEmpty: true });
  if (!isNonEmptyString(value.finding)) add(`${pointer}.finding`, "must be a non-empty string");
  if (value.limitations !== undefined) validateStringList(value.limitations, add, `${pointer}.limitations`);
}

function validateReport(record, catalogueIds, schema, globalState, errors) {
  const { file, data } = record;
  const add = (pointer, message) => errors.push(`${file}: ${pointer} ${message}`);

  if (!validateExactKeys(data, TOP_LEVEL_KEYS, TOP_LEVEL_KEYS, add, "$")) return;

  if (data.$schema !== schema.$id) add("$.$schema", `must equal ${schema.$id}`);
  if (!VERSION_PATTERN.test(data.report_version ?? "")) add("$.report_version", "must be a semantic candidate version");

  if (validateExactKeys(data.audit, AUDIT_KEYS, AUDIT_KEYS, add, "$.audit")) {
    if (!AUDIT_ID_PATTERN.test(data.audit.id ?? "")) add("$.audit.id", "must be a dated dogfood audit ID");
    if (globalState.auditIds.has(data.audit.id)) add("$.audit.id", `duplicates ${globalState.auditIds.get(data.audit.id)}`);
    else globalState.auditIds.set(data.audit.id, file);
    if (!isNonEmptyString(data.audit.performed_at) || Number.isNaN(Date.parse(data.audit.performed_at))) add("$.audit.performed_at", "must be an ISO date-time");
    if (data.audit.mode !== "read-only-inferred") add("$.audit.mode", "must be read-only-inferred");
    if (data.audit.standard_name !== "DenchCo Knowledge Base Wiki Standard") add("$.audit.standard_name", "must name this standard");
    if (!VERSION_PATTERN.test(data.audit.standard_version ?? "")) add("$.audit.standard_version", "must be a semantic candidate version");
    if (data.audit.standard_version !== data.report_version) add("$.audit.standard_version", "must match report_version");
    if (!isNonEmptyString(data.audit.standard_snapshot)) add("$.audit.standard_snapshot", "must be non-empty");
    if (JSON.stringify(data.audit.status_vocabulary) !== JSON.stringify(ADOPTION_STATUSES)) add("$.audit.status_vocabulary", "must declare the canonical ordered vocabulary");
    if (JSON.stringify(data.audit.confidence_vocabulary) !== JSON.stringify(ADOPTION_CONFIDENCE)) add("$.audit.confidence_vocabulary", "must declare the canonical bounded confidence vocabulary");
    if (!ADOPTION_CONFIDENCE.includes(data.audit.confidence)) add("$.audit.confidence", "is outside the bounded confidence vocabulary");
    if (!Number.isInteger(data.audit.waivers_recognized) || data.audit.waivers_recognized < 0) add("$.audit.waivers_recognized", "must be a non-negative integer");
    validateStringList(data.audit.method, add, "$.audit.method");
  }

  if (validateExactKeys(data.project, PROJECT_KEYS, PROJECT_KEYS, add, "$.project")) {
    if (!isNonEmptyString(data.project.name)) add("$.project.name", "must be a non-empty string");
    if (globalState.projectNames.has(data.project.name)) add("$.project.name", `duplicates ${globalState.projectNames.get(data.project.name)}`);
    else globalState.projectNames.set(data.project.name, file);
    if (!isPortablePath(data.project.root)) add("$.project.root", "must be portable and must not expose a machine-specific absolute root");
    if (globalState.projectRoots.has(data.project.root)) add("$.project.root", `duplicates ${globalState.projectRoots.get(data.project.root)}`);
    else globalState.projectRoots.set(data.project.root, file);
    if (!/^[0-9a-f]{40}$/.test(data.project.git_head ?? "")) add("$.project.git_head", "must be a 40-character lowercase Git object ID");
    if (!Number.isInteger(data.project.working_tree_entries_at_audit) || data.project.working_tree_entries_at_audit < 0) add("$.project.working_tree_entries_at_audit", "must be a non-negative integer");
    if (typeof data.project.graphify_graph_present !== "boolean") add("$.project.graphify_graph_present", "must be boolean");
    if (!isNonEmptyString(data.project.graph_query)) add("$.project.graph_query", "must be a non-empty string");

    const probe = data.project.local_runtime_probe;
    if (validateExactKeys(probe, RUNTIME_KEYS, ["url", "http_status", "status"], add, "$.project.local_runtime_probe")) {
      if (probe.url !== null) {
        try {
          new URL(probe.url);
        } catch {
          add("$.project.local_runtime_probe.url", "must be an absolute URI or null");
        }
      }
      if (probe.http_status !== null && (!Number.isInteger(probe.http_status) || probe.http_status < 100 || probe.http_status > 599)) add("$.project.local_runtime_probe.http_status", "must be an HTTP status code or null");
      if (!ADOPTION_STATUSES.includes(probe.status)) add("$.project.local_runtime_probe.status", "is outside the adoption status vocabulary");
      if (probe.listener_present !== undefined && typeof probe.listener_present !== "boolean") add("$.project.local_runtime_probe.listener_present", "must be boolean");
      for (const key of ["listener_process", "finding"]) {
        if (probe[key] !== undefined && !isNonEmptyString(probe[key])) add(`$.project.local_runtime_probe.${key}`, "must be a non-empty string");
      }
    }
  }

  if (validateExactKeys(data.formal_conformance, ["status", "reason"], ["status", "reason"], add, "$.formal_conformance")) {
    if (!["PASS", "FAIL"].includes(data.formal_conformance.status)) add("$.formal_conformance.status", "must be PASS or FAIL");
    if (!isNonEmptyString(data.formal_conformance.reason)) add("$.formal_conformance.reason", "must be a non-empty string");
  }

  if (validateExactKeys(data.profile_assessment, PROFILE_KEYS, ["declared_legacy_profile", "closest_candidate_profile", "topic_profiles", "confidence", "summary"], add, "$.profile_assessment")) {
    for (const key of ["declared_legacy_profile", "closest_candidate_profile", "summary"]) {
      if (!isNonEmptyString(data.profile_assessment[key])) add(`$.profile_assessment.${key}`, "must be a non-empty string");
    }
    validateStringList(data.profile_assessment.topic_profiles, add, "$.profile_assessment.topic_profiles");
    if (!ADOPTION_CONFIDENCE.includes(data.profile_assessment.confidence)) add("$.profile_assessment.confidence", "is outside the bounded confidence vocabulary");
    const readiness = ["managed_full_readiness", "standard_production_readiness"].filter((key) => data.profile_assessment[key] !== undefined);
    if (readiness.length !== 1) add("$.profile_assessment", "must contain exactly one readiness assessment");
    for (const key of readiness) {
      if (!isNonEmptyString(data.profile_assessment[key])) add(`$.profile_assessment.${key}`, "must be a non-empty string");
    }
  }

  if (!isObject(data.role_mappings) || Object.keys(data.role_mappings).length === 0) {
    add("$.role_mappings", "must be a non-empty object");
  } else {
    for (const [role, mapping] of Object.entries(data.role_mappings)) {
      if (!/^[a-z][a-z0-9_]*$/.test(role)) add(`$.role_mappings.${role}`, "has an invalid role name");
      validateAssessment(mapping, add, `$.role_mappings.${role}`);
    }
  }

  if (!Array.isArray(data.capabilities) || data.capabilities.length === 0) {
    add("$.capabilities", "must be a non-empty array");
  } else {
    data.capabilities.forEach((item, index) => validateResult(item, add, `$.capabilities[${index}]`, "capability"));
    const repeated = duplicates(data.capabilities.map((item) => item?.id));
    if (repeated.length > 0) add("$.capabilities", `contains duplicate IDs: ${repeated.join(", ")}`);
  }

  if (!Array.isArray(data.requirements) || data.requirements.length === 0) {
    add("$.requirements", "must be a non-empty array");
  } else {
    data.requirements.forEach((item, index) => validateResult(item, add, `$.requirements[${index}]`, "requirement"));
    const requirementIds = data.requirements.map((item) => item?.id);
    const repeated = duplicates(requirementIds);
    if (repeated.length > 0) add("$.requirements", `contains duplicate IDs: ${repeated.join(", ")}`);
    if (!sameMembers(requirementIds, catalogueIds)) {
      const actual = new Set(requirementIds);
      const expected = new Set(catalogueIds);
      const missing = catalogueIds.filter((id) => !actual.has(id));
      const unknown = requirementIds.filter((id) => !expected.has(id));
      if (missing.length > 0) add("$.requirements", `does not cover catalogue IDs: ${missing.join(", ")}`);
      if (unknown.length > 0) add("$.requirements", `contains IDs outside the catalogue: ${[...new Set(unknown)].sort().join(", ")}`);
    } else if (requirementIds.join("\n") !== catalogueIds.join("\n")) {
      add("$.requirements", "must follow the canonical catalogue order");
    }

    if (validateExactKeys(data.requirement_summary, ADOPTION_STATUSES, ADOPTION_STATUSES, add, "$.requirement_summary")) {
      const actualCounts = Object.fromEntries(ADOPTION_STATUSES.map((status) => [status, 0]));
      for (const result of data.requirements) {
        if (Object.hasOwn(actualCounts, result?.status)) actualCounts[result.status] += 1;
      }
      for (const status of ADOPTION_STATUSES) {
        if (!Number.isInteger(data.requirement_summary[status]) || data.requirement_summary[status] < 0) add(`$.requirement_summary.${status}`, "must be a non-negative integer");
        if (data.requirement_summary[status] !== actualCounts[status]) add(`$.requirement_summary.${status}`, `is ${data.requirement_summary[status]}; calculated count is ${actualCounts[status]}`);
      }
      if (data.audit?.waivers_recognized !== actualCounts.WAIVED) add("$.audit.waivers_recognized", `is ${data.audit?.waivers_recognized}; requirement WAIVED count is ${actualCounts.WAIVED}`);
    }
  }

  const riskIds = [];
  for (const [key, prefix] of [["candidate_false_positive_risks", "FP-"], ["candidate_false_negative_risks", "FN-"]]) {
    const risks = data[key];
    if (!Array.isArray(risks) || risks.length === 0) {
      add(`$.${key}`, "must be a non-empty array");
      continue;
    }
    risks.forEach((risk, index) => {
      const pointer = `$.${key}[${index}]`;
      if (!validateExactKeys(risk, ["id", "finding"], ["id", "finding"], add, pointer)) return;
      if (!isNonEmptyString(risk.id) || !risk.id.startsWith(prefix) || !/^(?:FP|FN)-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(risk.id)) add(`${pointer}.id`, `must be a valid ${prefix.slice(0, 2)} risk ID`);
      if (!isNonEmptyString(risk.finding)) add(`${pointer}.finding`, "must be a non-empty string");
      riskIds.push(risk.id);
    });
  }
  const repeatedRiskIds = duplicates(riskIds);
  if (repeatedRiskIds.length > 0) add("$", `contains duplicate risk IDs: ${repeatedRiskIds.join(", ")}`);

  validateStringList(data.recommendations, add, "$.recommendations");
  validateStringList(data.audit_limitations, add, "$.audit_limitations");

  walkStrings(data, (value, pointer) => {
    if (hasMachineSpecificRoot(value)) add(pointer, "contains a machine-specific absolute root; use a portable placeholder or repository-relative path");
  });
}

export function loadAdoptionAuditInputs(root = STANDARD_ROOT) {
  const reportRoot = path.join(root, REPORT_DIRECTORY);
  const reportFiles = readdirSync(reportRoot)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const reports = reportFiles.map((name) => ({
    file: path.posix.join(REPORT_DIRECTORY, name),
    data: JSON.parse(readFileSync(path.join(reportRoot, name), "utf8")),
  }));
  const requirementsText = readFileSync(path.join(root, REQUIREMENTS_PATH), "utf8");
  const catalogueIds = [...requirementsText.matchAll(/^\|\s*(DKBWS-[A-Z]+-[0-9]{3})\s*\|/gm)].map((match) => match[1]);
  const schema = JSON.parse(readFileSync(path.join(root, SCHEMA_PATH), "utf8"));
  return { reports, catalogueIds, schema };
}

export function validateAdoptionAuditRecords({ reports, catalogueIds, schema }) {
  const errors = [];
  if (!isObject(schema)) errors.push(`${SCHEMA_PATH}: schema must be a JSON object`);
  else {
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") errors.push(`${SCHEMA_PATH}: must declare JSON Schema Draft 2020-12`);
    if (schema.$id !== ADOPTION_AUDIT_SCHEMA_ID) errors.push(`${SCHEMA_PATH}: $id must equal ${ADOPTION_AUDIT_SCHEMA_ID}`);
    if (JSON.stringify(schema.$defs?.status?.enum) !== JSON.stringify(ADOPTION_STATUSES)) errors.push(`${SCHEMA_PATH}: status definition must match the canonical adoption vocabulary`);
    if (JSON.stringify(schema.$defs?.confidence?.enum) !== JSON.stringify(ADOPTION_CONFIDENCE)) errors.push(`${SCHEMA_PATH}: confidence definition must match the canonical bounded vocabulary`);
    if (!sameMembers(schema.required ?? [], TOP_LEVEL_KEYS)) errors.push(`${SCHEMA_PATH}: top-level required properties must match the report contract`);
  }
  const repeatedCatalogueIds = duplicates(catalogueIds);
  if (catalogueIds.length === 0) errors.push(`${REQUIREMENTS_PATH}: no requirement IDs found`);
  if (repeatedCatalogueIds.length > 0) errors.push(`${REQUIREMENTS_PATH}: duplicate requirement IDs: ${repeatedCatalogueIds.join(", ")}`);
  if (!Array.isArray(reports) || reports.length === 0) errors.push(`${REPORT_DIRECTORY}: no adoption-audit JSON records found`);

  const globalState = {
    auditIds: new Map(),
    projectNames: new Map(),
    projectRoots: new Map(),
  };
  for (const report of reports ?? []) validateReport(report, catalogueIds, schema, globalState, errors);
  return errors.sort();
}

export function checkAdoptionAudits(root = STANDARD_ROOT) {
  const inputs = loadAdoptionAuditInputs(root);
  const errors = validateAdoptionAuditRecords(inputs);
  if (errors.length > 0) {
    throw new Error(`Adoption-audit validation failed:\n- ${errors.join("\n- ")}`);
  }
  return {
    reports: inputs.reports.length,
    requirementsPerReport: inputs.catalogueIds.length,
  };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const result = checkAdoptionAudits();
    console.log(`Adoption audits valid: ${result.reports} reports · ${result.requirementsPerReport} catalogue requirements each · counts and IDs consistent`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
