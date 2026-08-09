#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";

import {
  applyManifestDeviationOverlays,
  inspectProject,
  publicReport,
  SECURITY_SUBCONTROLS,
} from "./okf-core.mjs";
import { loadRequirementCatalogue } from "./profile-catalogue.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECEIPT_SCHEMA_PATH = path.join(ROOT, "schema/verification-receipt-v1.json");
const REPORT_SCHEMA_PATH = path.join(ROOT, "schema/conformance-report-v1.json");
const RECEIPT_SCHEMA_ID = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/verification-receipt-v1.json";
const CAPABILITY_REQUIREMENTS = Object.freeze({
  evidence_governance: ["DKBWS-EVID-001", "DKBWS-EVID-002"],
  human_wiki: ["DKBWS-HUMAN-001", "DKBWS-HUMAN-002", "DKBWS-HUMAN-003", "DKBWS-HUMAN-004", "DKBWS-LINK-002"],
  llm_wiki: ["DKBWS-LLM-001"],
  development_response_links: ["DKBWS-PROMPT-002"],
  human_renderer: ["DKBWS-HUMAN-001", "DKBWS-HUMAN-002", "DKBWS-HUMAN-003", "DKBWS-HUMAN-004", "DKBWS-LINK-002", "DKBWS-RENDER-001"],
  graphify: ["DKBWS-GRAPH-001"],
  local_browser_runtimes: ["DKBWS-RENDER-001"],
  browser_verification: ["DKBWS-VERIFY-001", "DKBWS-VERIFY-002"],
  local_service: ["DKBWS-RUNTIME-001", "DKBWS-RUNTIME-002"],
  jujutsu: ["DKBWS-PROV-001"],
  standard_change_intake: ["DKBWS-UPDATE-002"],
});

const HELP = `DenchCo full-profile conformance report builder

Usage:
  node scripts/full-profile-report.mjs --target <repository> --receipt <receipt.json> [--compact]

The builder reads an explicit verification-receipt-v1 artifact and emits one
schema-valid conformance-report-v1 JSON object to stdout. It never infers a
pass for an absent gate and never writes to the target.`;

export class ReceiptError extends Error {}

export function selectedNotCheckedCapabilityIds(report) {
  return (report?.capabilityStates ?? [])
    .filter((capability) => capability.expected !== null && capability.verificationStatus === "not-checked")
    .map((capability) => capability.id);
}

function loadJson(filePath, label) {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new ReceiptError(`Cannot read ${label} ${filePath}: ${error.message}`);
  }
  try {
    return { source, data: JSON.parse(source) };
  } catch (error) {
    throw new ReceiptError(`${label} is not valid JSON: ${error.message}`);
  }
}

function validator(schemaPath) {
  const schema = loadJson(schemaPath, "schema").data;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

function validationMessage(validate) {
  return (validate.errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
}

function requireUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new ReceiptError(`${label} contains duplicate identifiers.`);
  }
}

function validateReceiptSemantics(receipt, canonicalRequirementIds) {
  requireUnique(receipt.gates.map((gate) => gate.id), "Receipt gates");
  for (const gate of receipt.gates) {
    requireUnique(gate.evidence.map((item) => item.id), `Gate ${gate.id} evidence`);
    requireUnique(gate.results.map((item) => item.requirement), `Gate ${gate.id} results`);
    const evidenceIds = new Set(gate.evidence.map((item) => item.id));
    for (const result of gate.results) {
      if (!canonicalRequirementIds.has(result.requirement)) {
        throw new ReceiptError(`Gate ${gate.id} references unknown requirement ${result.requirement}.`);
      }
      if (result.status === "pass" && gate.status !== "pass") {
        throw new ReceiptError(`Gate ${gate.id} cannot emit a passing requirement result when the gate is ${gate.status}.`);
      }
      if (result.status === "pass" && (!result.evidence || result.evidence.length === 0)) {
        throw new ReceiptError(`Gate ${gate.id} pass for ${result.requirement} has no explicit evidence reference.`);
      }
      for (const evidenceId of result.evidence ?? []) {
        if (!evidenceIds.has(evidenceId)) {
          throw new ReceiptError(`Gate ${gate.id} result ${result.requirement} references missing evidence ${evidenceId}.`);
        }
      }
      validateSecuritySubcontrols(result, evidenceIds, `Gate ${gate.id}`);
    }
  }

  requireUnique((receipt.manualChecks ?? []).map((check) => check.id), "Manual checks");
  for (const check of receipt.manualChecks ?? []) {
    if (!canonicalRequirementIds.has(check.requirement)) {
      throw new ReceiptError(`Manual check ${check.id} references unknown requirement ${check.requirement}.`);
    }
    requireUnique(check.evidence.map((item) => item.id), `Manual check ${check.id} evidence`);
    const evidenceIds = new Set(check.evidence.map((item) => item.id));
    validateSecuritySubcontrols(check, evidenceIds, `Manual check ${check.id}`);
  }
}

function validateSecuritySubcontrols(result, evidenceIds, label) {
  if (!result.subcontrols) return;
  if (result.requirement !== "DKBWS-SEC-001") {
    throw new ReceiptError(`${label} attaches security subcontrols to ${result.requirement}.`);
  }
  requireUnique(result.subcontrols.map((item) => item.id), `${label} security subcontrols`);
  for (const subcontrol of result.subcontrols) {
    if (!SECURITY_SUBCONTROLS.includes(subcontrol.id)) {
      throw new ReceiptError(`${label} uses unknown DKBWS-SEC-001 subcontrol ${subcontrol.id}.`);
    }
    if (subcontrol.status === "pass" && (!subcontrol.evidence || subcontrol.evidence.length === 0)) {
      throw new ReceiptError(`${label} pass for subcontrol ${subcontrol.id} has no evidence reference.`);
    }
    for (const evidenceId of subcontrol.evidence ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        throw new ReceiptError(`${label} subcontrol ${subcontrol.id} references missing evidence ${evidenceId}.`);
      }
    }
  }
}

function prefixedEvidence(prefix, evidence, supports) {
  return evidence.map((item) => ({
    ...item,
    id: `${prefix}:${item.id}`,
    supports: [...new Set(supports)].sort(),
  }));
}

function prefixedReferences(prefix, references = []) {
  return references.map((id) => `${prefix}:${id}`);
}

function mergeStatus(contributions) {
  if (contributions.some((item) => item.status === "fail")) return "fail";
  if (contributions.some((item) => item.status === "pass")) return "pass";
  return "not-checked";
}

function combineReason(contributions, fallback) {
  const reasons = [...new Set(contributions.map((item) => item.reason).filter(Boolean))];
  return reasons.length ? reasons.join(" ") : fallback;
}

function combineEvidence(contributions) {
  return [...new Set(contributions.flatMap((item) => item.evidence ?? []))].sort();
}

function aggregateSecurity(contributions) {
  const explicitFailure = contributions.some((item) => item.status === "fail");
  const subcontrols = SECURITY_SUBCONTROLS.map((id) => {
    const states = contributions.flatMap((item) => item.subcontrols ?? []).filter((item) => item.id === id);
    return {
      id,
      status: mergeStatus(states),
      reason: combineReason(states, "No successful gate supplied explicit evidence for this security subcontrol."),
      evidence: combineEvidence(states),
    };
  });
  const status = explicitFailure
    ? "fail"
    : subcontrols.every((item) => item.status === "pass")
      ? "pass"
      : subcontrols.some((item) => item.status === "fail")
        ? "fail"
        : "not-checked";
  return {
    requirement: "DKBWS-SEC-001",
    status,
    reason: status === "pass"
      ? "All four DKBWS-SEC-001 subcontrols have explicit successful evidence."
      : combineReason(contributions, "One or more DKBWS-SEC-001 subcontrols remain unverified."),
    evidence: [...new Set(subcontrols.flatMap((item) => item.evidence))].sort(),
    subcontrols,
  };
}

function outstandingManualChecks(requirements) {
  const checks = [];
  for (const result of requirements) {
    if (result.status !== "not-checked") continue;
    if (result.subcontrols?.length) {
      for (const subcontrol of result.subcontrols) {
        if (subcontrol.status !== "not-checked") continue;
        checks.push({
          id: `${result.requirement}:${subcontrol.id}`,
          requirement: result.requirement,
          subcontrol: subcontrol.id,
          reason: subcontrol.reason || "Explicit manual or automated evidence remains outstanding.",
        });
      }
    } else {
      checks.push({
        id: result.requirement,
        requirement: result.requirement,
        reason: result.reason || "Explicit manual or automated evidence remains outstanding.",
      });
    }
  }
  return checks;
}

function provenanceResult(receipt, contributions) {
  const explicitFailure = contributions.some((item) => item.status === "fail");
  if (explicitFailure) {
    return {
      requirement: "DKBWS-PROV-001",
      status: "fail",
      reason: combineReason(contributions, "The maintainer provenance gate failed."),
      evidence: combineEvidence(contributions),
    };
  }
  const provenance = receipt.provenance;
  const workspacePasses = provenance?.requirement === "DKBWS-PROV-001"
    && provenance.mode === "maintainer"
    && provenance.status === "pass"
    && provenance.readOnly === true
    && provenance.git?.status === "pass"
    && provenance.jujutsu?.status === "pass";
  const turnPolicyPasses = contributions.some((item) => item.status === "pass");
  if (workspacePasses && turnPolicyPasses) {
    return {
      requirement: "DKBWS-PROV-001",
      status: "pass",
      reason: "The read-only maintainer receipt proves colocated, reference-qualified Git/Jujutsu provenance, and the successful instruction/helper gate proves the end-of-development-turn commit mechanism.",
      evidence: ["provenance-receipt", ...combineEvidence(contributions)],
    };
  }
  return {
    requirement: "DKBWS-PROV-001",
    status: "not-checked",
    reason: provenance?.mode === "distribution"
      ? "Distribution mode proves only the Git-distributed surface; maintainer Jujutsu provenance remains not checked."
      : workspacePasses
        ? "The maintainer workspace passed, but no successful end-of-development-turn instruction/helper gate was supplied."
        : "No successful maintainer-mode Git/Jujutsu provenance receipt was supplied.",
    evidence: [...(provenance ? ["provenance-receipt"] : []), ...combineEvidence(contributions)],
  };
}

function receiptContributions(receipt, selectedRequirements) {
  const contributions = new Map(selectedRequirements.map((id) => [id, []]));
  const evidence = [];
  for (const gate of receipt.gates) {
    const support = gate.results.map((result) => result.requirement);
    const prefix = `gate:${gate.id}`;
    evidence.push(...prefixedEvidence(prefix, gate.evidence, support));
    for (const result of gate.results) {
      if (!contributions.has(result.requirement)) continue;
      const status = result.status === "pass" && gate.status !== "pass" ? "not-checked" : result.status;
      contributions.get(result.requirement).push({
        status,
        reason: result.reason ?? `Gate ${gate.id} reported ${status}.`,
        evidence: prefixedReferences(prefix, result.evidence),
        subcontrols: result.subcontrols?.map((item) => ({
          ...item,
          evidence: prefixedReferences(prefix, item.evidence),
        })),
      });
    }
  }
  for (const check of receipt.manualChecks ?? []) {
    if (!contributions.has(check.requirement)) continue;
    const prefix = `manual:${check.id}`;
    evidence.push(...prefixedEvidence(prefix, check.evidence, [check.requirement]));
    contributions.get(check.requirement).push({
      status: check.status,
      reason: check.reason,
      evidence: prefixedReferences(prefix, check.evidence.map((item) => item.id)),
      subcontrols: check.subcontrols?.map((item) => ({
        ...item,
        evidence: prefixedReferences(prefix, item.evidence),
      })),
    });
  }
  return { contributions, evidence };
}

export function buildFullProfileReport({ target = ".", receipt, receiptPath = null, receiptSource = null } = {}) {
  const targetRoot = path.resolve(target);
  if (!receipt || typeof receipt !== "object") throw new ReceiptError("A parsed verification receipt is required.");

  const validateReceipt = validator(RECEIPT_SCHEMA_PATH);
  if (!validateReceipt(receipt)) {
    throw new ReceiptError(`Verification receipt does not match verification-receipt-v1: ${validationMessage(validateReceipt)}`);
  }
  const catalogue = loadRequirementCatalogue({ standardRoot: ROOT });
  validateReceiptSemantics(receipt, catalogue.ids);

  const receiptTarget = path.resolve(receipt.target);
  if (receiptTarget !== targetRoot) {
    throw new ReceiptError(`Receipt target ${receiptTarget} does not match requested target ${targetRoot}.`);
  }

  const narrowInternal = inspectProject({
    target: targetRoot,
    command: "validate",
    evaluationDate: receipt.evaluationDate,
  });
  const narrow = publicReport(narrowInternal);
  if (!narrow.manifest.present) throw new ReceiptError("A full-profile report requires a DenchCo manifest.");
  if (narrow.manifest.profile !== receipt.profile) {
    throw new ReceiptError(`Receipt profile ${receipt.profile} does not match manifest profile ${narrow.manifest.profile}.`);
  }
  if (narrow.requirementResults.length === 0) {
    throw new ReceiptError("The declared profile could not be resolved to canonical requirements.");
  }

  const selected = narrow.requirementResults.map((item) => item.requirement);
  const { contributions, evidence: receiptEvidence } = receiptContributions(receipt, selected);

  const narrowEvidence = narrow.evidence.map((item) => ({
    ...item,
    id: `narrow:${item.id}`,
  }));
  for (const narrowResult of narrow.requirementResults) {
    if (narrowResult.status !== "fail" || !contributions.has(narrowResult.requirement)) continue;
    contributions.get(narrowResult.requirement).push({
      status: "fail",
      reason: narrowResult.reason ?? "The current narrow validator found contradictory evidence.",
      evidence: (narrowResult.evidence ?? []).map((id) => `narrow:${id}`),
      subcontrols: narrowResult.subcontrols,
    });
  }

  const requirements = selected.map((requirement) => {
    const states = contributions.get(requirement) ?? [];
    if (requirement === "DKBWS-PROV-001") return provenanceResult(receipt, states);
    if (requirement === "DKBWS-SEC-001") return aggregateSecurity(states);
    let status = mergeStatus(states);
    let reason = combineReason(states, "No explicit successful verification gate supplied evidence for this selected-profile requirement.");
    let evidence = combineEvidence(states);
    if (requirement === "DKBWS-VERIFY-001") {
      if (receipt.canonicalMutation.status === "fail") {
        status = "fail";
        reason = receipt.canonicalMutation.reason || "The verification run changed canonical inputs.";
      } else if (receipt.canonicalMutation.status !== "pass" && status === "pass") {
        status = "not-checked";
        reason = "A gate reported verification success, but canonical-input immutability was not checked.";
      }
      evidence = [...new Set([...evidence, "verification-receipt"])].sort();
    }
    return { requirement, status, reason, evidence };
  });
  const overlaidRequirements = applyManifestDeviationOverlays(requirements, narrow.manifest.data);
  const requirementById = new Map(overlaidRequirements.map((item) => [item.requirement, item]));
  const capabilityStates = narrow.capabilityStates.map((capability) => {
    const expectationSatisfied = capability.expected === null
      ? capability.declared
      : capability.expected === "required"
        ? capability.declared && capability.value !== false && capability.value !== null
        : capability.declared && isDeepStrictEqual(capability.value, capability.expected);
    const mappedRequirements = CAPABILITY_REQUIREMENTS[capability.id] ?? [];
    const mappedResults = mappedRequirements.map((id) => requirementById.get(id)).filter(Boolean);
    let verificationStatus;
    if (!expectationSatisfied) verificationStatus = "fail";
    else if (capability.expected === null) verificationStatus = "not-checked";
    else if (mappedResults.length !== mappedRequirements.length || mappedRequirements.length === 0) verificationStatus = "not-checked";
    else if (mappedResults.some((item) => item.status === "fail")) verificationStatus = "fail";
    else if (mappedResults.every((item) => ["pass", "waived", "not-applicable"].includes(item.status))) verificationStatus = "pass";
    else verificationStatus = "not-checked";
    return {
      ...capability,
      verificationStatus,
    };
  });

  const receiptText = receiptSource ?? JSON.stringify(receipt);
  const commonEvidence = [{
    id: "verification-receipt",
    kind: "verification-receipt",
    ...(receiptPath ? { location: path.relative(targetRoot, path.resolve(receiptPath)).split(path.sep).join("/") } : {}),
    description: "Explicit verification orchestrator receipt consumed by this report.",
    supports: selected,
    sha256: createHash("sha256").update(receiptText).digest("hex"),
  }];
  if (receipt.provenance) {
    commonEvidence.push({
      id: "provenance-receipt",
      kind: "provenance-receipt",
      description: `Read-only ${receipt.provenance.mode} Git/Jujutsu provenance receipt.`,
      supports: ["DKBWS-PROV-001"],
      details: receipt.provenance,
    });
  }

  const evaluationComplete = overlaidRequirements.every((item) => item.status !== "not-checked")
    && capabilityStates.filter((item) => item.expected !== null).every((item) => item.verificationStatus !== "not-checked");
  const requirementsConformant = overlaidRequirements.every((item) => ["pass", "waived", "not-applicable"].includes(item.status));
  const failedRequirements = overlaidRequirements.filter((item) => item.status === "fail").length;
  const selectedCapabilities = capabilityStates.filter((item) => item.expected !== null);
  const failedCapabilities = selectedCapabilities.filter((item) => item.verificationStatus === "fail").length;
  const notCheckedCapabilities = selectedCapabilities.filter((item) => item.verificationStatus === "not-checked").length;
  const conformant = requirementsConformant && failedCapabilities === 0 && notCheckedCapabilities === 0;
  const failedOutcomes = failedRequirements + failedCapabilities;
  const notCheckedRequirements = overlaidRequirements.filter((item) => item.status === "not-checked").length;
  const outstanding = outstandingManualChecks(overlaidRequirements);
  const report = {
    $schema: narrow.$schema,
    reportVersion: narrow.reportVersion,
    command: "verify",
    readOnly: true,
    evaluationDate: receipt.evaluationDate,
    target: targetRoot,
    manifest: narrow.manifest,
    okf: narrow.okf,
    capabilityStates,
    requirementResults: overlaidRequirements,
    verification: {
      scope: "full-profile-explicit-receipt",
      environment: receipt.environment,
      result: {
        status: conformant ? "pass" : (failedOutcomes > 0 ? "fail" : "partial"),
        strict: true,
        startedAt: receipt.startedAt,
        completedAt: receipt.completedAt,
        receipt: receiptPath ? path.resolve(receiptPath) : "in-memory",
        evaluation: evaluationComplete ? "complete" : "incomplete",
        conformance: conformant ? "conformant" : (failedOutcomes > 0 ? "nonconformant" : "partial"),
      },
      canonicalMutation: receipt.canonicalMutation,
    },
    evidence: [...narrowEvidence, ...receiptEvidence, ...commonEvidence],
    outstandingManualChecks: outstanding,
    summary: {
      status: conformant ? "conformant" : (failedOutcomes > 0 ? "nonconformant" : "partial"),
      errors: narrow.summary.errors,
      warnings: narrow.summary.warnings,
      info: narrow.summary.info,
      strictFailure: !conformant,
      profileComplete: conformant,
      evaluationComplete,
      failedRequirements,
      failedCapabilities,
      notCheckedCapabilities,
      notCheckedRequirements,
      markdown: narrow.summary.markdown,
      concepts: narrow.summary.concepts,
    },
    diagnostics: narrow.diagnostics,
  };

  const validateReport = validator(REPORT_SCHEMA_PATH);
  if (!validateReport(report)) {
    throw new ReceiptError(`Generated report does not match conformance-report-v1: ${validationMessage(validateReport)}`);
  }
  return report;
}

function parseArguments(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const options = { target: ".", compact: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--compact") {
      options.compact = true;
      continue;
    }
    if (["--target", "--receipt"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new ReceiptError(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new ReceiptError(`Unsupported argument ${argument}.`);
  }
  if (!options.receipt) throw new ReceiptError("--receipt is required.");
  return options;
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  const receiptPath = path.resolve(options.receipt);
  const loaded = loadJson(receiptPath, "verification receipt");
  const report = buildFullProfileReport({
    target: options.target,
    receipt: loaded.data,
    receiptPath,
    receiptSource: loaded.source,
  });
  process.stdout.write(`${JSON.stringify(report, null, options.compact ? 0 : 2)}\n`);
  return report.summary.profileComplete ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`Full-profile report failed: ${error.message}\n`);
    process.exitCode = error instanceof ReceiptError ? 2 : 2;
  }
}
