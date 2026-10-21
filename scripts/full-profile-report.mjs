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
// Portable proof obligations, not reference command names. A consumer can split
// these across its own gates, but no gate's generic PASS fills an absent proof.
export const REQUIREMENT_PROOFS = Object.freeze(Object.fromEntries(Object.entries({
  "DKBWS-CORE-001": ["canonical-source"],
  "DKBWS-CORE-002": ["manifest"],
  "DKBWS-OKF-001": ["okf-validation", "source-identity", "lossless-fixtures"],
  "DKBWS-OKF-002": ["lossless-fixtures"],
  "DKBWS-OKF-003": ["bundle-mapping"],
  "DKBWS-EVID-001": ["source-register"],
  "DKBWS-EVID-002": ["evidence-review"],
  "DKBWS-HUMAN-001": ["strict-build", "http", "browser-navigation"],
  "DKBWS-HUMAN-002": ["browser-presentation"],
  "DKBWS-HUMAN-004": ["source-consistency", "browser-repetitions"],
  "DKBWS-LLM-001": ["agent-contract"],
  "DKBWS-LINK-001": ["source-links"],
  "DKBWS-LINK-002": ["source-links", "renderer-fixtures", "built-citations", "browser-citations"],
  "DKBWS-GRAPH-001": ["publication", "browser-2d", "browser-3d"],
  "DKBWS-DESIGN-001": ["design-source", "design-fixtures", "browser-layout", "browser-defaults", "browser-saved-preferences", "browser-appearance"],
  "DKBWS-RENDER-001": ["dependencies", "browser-network"],
  "DKBWS-PROV-001": ["turn-policy"],
  "DKBWS-VERIFY-001": ["toolchain", "canonical-mutation"],
  "DKBWS-VERIFY-002": ["report-fixtures"],
  "DKBWS-RUNTIME-001": ["canonical-http"],
  "DKBWS-RUNTIME-002": ["service-fixtures", "live-service"],
  "DKBWS-PROMPT-001": ["policy-source", "policy-fixtures"],
  "DKBWS-PROMPT-002": ["policy-source", "response-fixtures"],
  "DKBWS-UPDATE-001": ["lifecycle-fixtures"],
  "DKBWS-UPDATE-002": ["record-validation", "lifecycle-fixtures", "approval-fixtures", "release-fixtures", "remote-write-fixtures"],
  "DKBWS-RELEASE-001": ["immutable-release", "migration-notes"],
}).map(([requirement, proofs]) => [requirement, Object.freeze(proofs)])));
const CAPABILITY_REQUIREMENTS = Object.freeze({
  evidence_governance: ["DKBWS-EVID-001", "DKBWS-EVID-002"],
  human_wiki: ["DKBWS-HUMAN-001", "DKBWS-HUMAN-002", "DKBWS-HUMAN-004", "DKBWS-LINK-002"],
  llm_wiki: ["DKBWS-LLM-001"],
  development_response_links: ["DKBWS-PROMPT-002"],
  source_citation_style: ["DKBWS-LINK-002"],
  human_renderer: ["DKBWS-HUMAN-001", "DKBWS-HUMAN-002", "DKBWS-HUMAN-004", "DKBWS-LINK-002", "DKBWS-RENDER-001"],
  graphify: ["DKBWS-GRAPH-001"],
  local_browser_runtimes: ["DKBWS-RENDER-001"],
  browser_verification: ["DKBWS-HUMAN-001", "DKBWS-HUMAN-002", "DKBWS-HUMAN-004", "DKBWS-LINK-002", "DKBWS-GRAPH-001", "DKBWS-DESIGN-001", "DKBWS-RENDER-001", "DKBWS-VERIFY-001", "DKBWS-VERIFY-002"],
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
      if (gate.status !== "pass" && result.subcontrols?.some((item) => item.status === "pass")) {
        throw new ReceiptError(`Gate ${gate.id} cannot emit a passing security subcontrol when the gate is ${gate.status}.`);
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
      validateProofs(result, `Gate ${gate.id}`);
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
    validateProofs(check, `Manual check ${check.id}`);
  }
}

function validateProofs(result, label) {
  for (const proof of result.proofs ?? []) {
    if (!REQUIREMENT_PROOFS[result.requirement]?.includes(proof)) {
      throw new ReceiptError(`${label} uses unknown proof ${proof} for ${result.requirement}.`);
    }
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

function aggregateProofs(requirement, contributions) {
  const required = REQUIREMENT_PROOFS[requirement];
  if (!required) throw new ReceiptError(`No proof obligations are registered for ${requirement}.`);
  const proofResults = required.map((id) => {
    const states = contributions.filter((item) => item.proofs?.includes(id));
    return {
      id,
      status: mergeStatus(states),
      reason: combineReason(states, `No explicit evidence supplied for proof ${id}.`),
      evidence: combineEvidence(states),
    };
  });
  const missing = proofResults.filter((item) => item.status === "not-checked").map((item) => item.id);
  const status = contributions.some((item) => item.status === "fail")
    || proofResults.some((item) => item.status === "fail") ? "fail"
    : missing.length ? "not-checked" : "pass";
  return {
    requirement,
    status,
    reason: status === "fail"
      ? combineReason(contributions.filter((item) => item.status === "fail"), "A required proof or explicit requirement contribution failed.")
      : missing.length
        ? `Required proof obligations remain not checked: ${missing.join(", ")}.`
        : combineReason(contributions, "Every required proof obligation has explicit passing evidence."),
    evidence: combineEvidence(contributions),
    proofResults,
  };
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
    if (["pass", "waived", "not-applicable"].includes(result.status)) continue;
    if (result.subcontrols?.length || result.proofResults?.length) {
      for (const subcontrol of result.subcontrols ?? result.proofResults) {
        if (subcontrol.status !== "not-checked") continue;
        checks.push({
          id: `${result.requirement}:${subcontrol.id}`,
          requirement: result.requirement,
          ...(result.subcontrols ? { subcontrol: subcontrol.id } : { proof: subcontrol.id }),
          reason: subcontrol.reason || "Explicit manual or automated evidence remains outstanding.",
        });
      }
    } else if (result.status === "not-checked") {
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
  const policy = aggregateProofs("DKBWS-PROV-001", contributions);
  const provenance = receipt.provenance;
  const workspacePasses = provenance?.requirement === "DKBWS-PROV-001"
    && provenance.mode === "maintainer"
    && provenance.status === "pass"
    && provenance.readOnly === true
    && provenance.git?.status === "pass"
    && provenance.jujutsu?.status === "pass";
  const proofResults = [...policy.proofResults, {
    id: "maintainer-workspace",
    status: workspacePasses ? "pass" : "not-checked",
    reason: workspacePasses
      ? "The separate read-only maintainer receipt proves qualified colocated Git/Jujutsu provenance."
      : "No successful read-only maintainer-mode Git/Jujutsu receipt was supplied.",
    evidence: provenance ? ["provenance-receipt"] : [],
  }];
  if (policy.status === "fail") {
    return {
      ...policy,
      proofResults,
      reason: combineReason(contributions, "The maintainer provenance gate failed."),
    };
  }
  const turnPolicyPasses = policy.status === "pass";
  if (workspacePasses && turnPolicyPasses) {
    return {
      requirement: "DKBWS-PROV-001",
      status: "pass",
      reason: "The read-only maintainer receipt proves colocated, reference-qualified Git/Jujutsu provenance, and the successful instruction/helper gate proves the end-of-development-turn commit mechanism.",
      evidence: ["provenance-receipt", ...combineEvidence(contributions)],
      proofResults,
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
    proofResults,
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
        proofs: result.proofs ?? [],
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
      proofs: check.proofs ?? [],
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
    const result = aggregateProofs(requirement, states);
    let { status, reason, evidence } = result;
    if (requirement === "DKBWS-RUNTIME-002" && receipt.provenance?.mode !== "maintainer") {
      const live = result.proofResults.find((item) => item.id === "live-service");
      live.status = "not-checked";
      live.reason = "Live managed-service proof is available only in an explicit maintainer receipt.";
      if (status !== "fail") {
        status = "not-checked";
        reason = live.reason;
      }
    }
    if (requirement === "DKBWS-VERIFY-001") {
      const mutation = result.proofResults.find((item) => item.id === "canonical-mutation");
      if (receipt.canonicalMutation.status === "fail") {
        status = "fail";
        reason = receipt.canonicalMutation.reason || "The verification run changed canonical inputs.";
        mutation.status = "fail";
        mutation.reason = reason;
      } else if (receipt.canonicalMutation.status !== "pass") {
        mutation.status = "not-checked";
        mutation.reason = "The receipt did not establish canonical-input immutability.";
        if (status !== "fail") {
          status = "not-checked";
          reason = mutation.reason;
        }
      }
      evidence = [...new Set([...evidence, "verification-receipt"])].sort();
    }
    return { ...result, status, reason, evidence };
  });
  const overlaidRequirements = applyManifestDeviationOverlays(requirements, narrow.manifest.data)
    .map((result) => ["waived", "not-applicable"].includes(result.status) && result.proofResults ? {
      ...result,
      proofResults: result.proofResults.map((proof) => ({ ...proof, status: result.status, reason: result.reason })),
    } : result);
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

  const evaluationComplete = receipt.canonicalMutation.status !== "not-checked"
    && overlaidRequirements.every((item) => item.status !== "not-checked"
      && [...(item.proofResults ?? []), ...(item.subcontrols ?? [])].every((proof) => proof.status !== "not-checked"))
    && capabilityStates.filter((item) => item.expected !== null).every((item) => item.verificationStatus !== "not-checked");
  const requirementsConformant = overlaidRequirements.every((item) => ["pass", "waived", "not-applicable"].includes(item.status));
  const failedRequirements = overlaidRequirements.filter((item) => item.status === "fail").length;
  const selectedCapabilities = capabilityStates.filter((item) => item.expected !== null);
  const failedCapabilities = selectedCapabilities.filter((item) => item.verificationStatus === "fail").length;
  const notCheckedCapabilities = selectedCapabilities.filter((item) => item.verificationStatus === "not-checked").length;
  const conformant = requirementsConformant && failedCapabilities === 0 && notCheckedCapabilities === 0
    && receipt.canonicalMutation.status === "pass";
  const failedOutcomes = failedRequirements + failedCapabilities + (receipt.canonicalMutation.status === "fail" ? 1 : 0);
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
