import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

export const STANDARD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RECORD_SCHEMA_ID = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/standard-proposal-record-v1.json";
export const REGISTRY_SCHEMA_ID = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/standard-proposal-registry-v1.json";
export const TARGET_REPOSITORY = "https://github.com/denchco/knowledge-base-wiki-standard";
export const PROPOSAL_DIRECTORY = "standard-proposals";
export const REGISTRY_PATH = "standard-proposals/registry.json";
export const FORM_CONTRACT_PATH = "standard-proposals/standard-change-form-v1.yml";
export const GENERATED_DIRECTORY = "output/standard-proposals";

const CODEPOINT_SORT = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const HISTORICAL_PRE_REGISTRY_BRIDGE = Object.freeze({
  id: "DKBWS-PROP-uk-digital-health-reader-source-navigation-38f4b5cbcddce10fbcde32f70862143b",
  project: "UK Digital Health compliance",
  implementationCommit: "3a085ebbfa66dea87d96700c7a735cf65def5ef6",
  verificationCommit: "3d9e1379ec67fd378b16c4b50c77f57c0db3c871",
  pinnedStandardRevision: "46183bc02c3d818f5aac962a4fbebc49b6ac9659",
  decisionRevision: "6b9c686c66d2ef0e17342d666140bf4117f33a87",
  acceptedRequirements: ["DKBWS-LINK-002"],
});
const REQUIRED_FORM_FIELDS = [
  "schema_version",
  "proposal_id",
  "problem",
  "outcome",
  "origin",
  "origin_revision",
  "origin_jj",
  "standard_revision",
  "reuse_class",
  "affected_contract",
  "dependencies_fallback",
  "evidence",
  "accessibility_browser",
  "verification",
  "migration",
  "safety",
  "proposal_marker",
];

const REUSE_FORM_VALUES = {
  unknown: "Unknown — classify during intake",
  experimental: "Experimental",
  "project-specific": "Project-specific",
  reusable: "Reusable",
  preferred: "Preferred",
  core: "Core",
};

export class ProposalUsageError extends Error {
  constructor(message) {
    super(message);
    this.code = "DKBWS-PROP-USAGE-001";
  }
}

export class ProposalSafetyError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function strictJson(source, label = "JSON") {
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-SCHEMA-001",
      `${label} is invalid or contains duplicate keys: ${document.errors.map((error) => error.message).join("; ")}`,
    );
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new ProposalSafetyError("DKBWS-PROP-SCHEMA-001", `${label} is not strict JSON: ${error.message}`);
  }
}

function yamlMapping(source, label) {
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-FORM-CONTRACT-001",
      `${label} is invalid YAML: ${document.errors.map((error) => error.message).join("; ")}`,
    );
  }
  const value = document.toJS({ maxAliasCount: 100 });
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", `${label} must be a YAML mapping.`);
  }
  return value;
}

export function deriveProposalId({ slug, repository = TARGET_REPOSITORY, implementationCommit }) {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug ?? "") || slug.length < 3 || slug.length > 80) {
    throw new ProposalUsageError("Proposal slug must be 3-80 lowercase letters, digits, or internal hyphens.");
  }
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(implementationCommit ?? "")) {
    throw new ProposalUsageError("The implementation revision must resolve to a full Git-compatible commit ID.");
  }
  const repositoryIdentity = canonicalRepositoryIdentity(repository);
  const identity = `dkbws-standard-proposal-id-v1\0${repositoryIdentity}\0${implementationCommit}\0${slug}`;
  return `DKBWS-PROP-${slug}-${sha256(identity).slice(0, 32)}`;
}

function canonicalRepositoryIdentity(repository) {
  const match = String(repository).match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i);
  if (match) return `${match[1]}/${match[2]}`.toLowerCase();
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repository))) return String(repository).toLowerCase();
  throw new ProposalUsageError("Target repository must be a canonical GitHub HTTPS URL or owner/repository identity.");
}

export function markerFor(id) {
  return `<!-- dkbws-standard-proposal:v1:${id} -->`;
}

export function canonicalPayloadBytes(payload) {
  const exact = {
    repository: payload.repository,
    title: payload.title,
    labels: payload.labels,
    body: payload.body,
  };
  return Buffer.from(JSON.stringify(exact), "utf8");
}

export function payloadDigest(payload) {
  return sha256(canonicalPayloadBytes(payload));
}

export function loadFormContract({ root = STANDARD_ROOT, source = null } = {}) {
  const formSource = source ?? readFileSync(path.join(root, FORM_CONTRACT_PATH), "utf8");
  const form = yamlMapping(formSource, FORM_CONTRACT_PATH);
  const fields = (form.body ?? []).filter((entry) => entry?.type !== "markdown");
  const ids = fields.map((field) => field?.id);
  const repeated = duplicates(ids.filter(Boolean));
  if (repeated.length) {
    throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", `Issue-form field IDs repeat: ${repeated.join(", ")}`);
  }
  for (const id of REQUIRED_FORM_FIELDS) {
    if (!ids.includes(id)) {
      throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", `Versioned issue form is missing field ${id}.`);
    }
  }
  if (ids.at(-1) !== "proposal_marker") {
    throw new ProposalSafetyError(
      "DKBWS-PROP-FORM-CONTRACT-001",
      "proposal_marker must be the final submitted field so the stable marker is the final body token.",
    );
  }
  const labels = [...(form.labels ?? [])];
  if (JSON.stringify(labels) !== JSON.stringify(["enhancement", "standard-change"])) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-FORM-CONTRACT-001",
      "Versioned issue form must apply enhancement and standard-change in canonical order.",
    );
  }
  return { source: formSource, sha256: sha256(Buffer.from(formSource, "utf8")), form, fields, ids };
}

function fieldValues(record, formSha256) {
  const profiles = record.change.affectedProfiles.join(", ");
  const requirements = record.change.affectedRequirements.join(", ");
  const implementation = record.change.implementationEvidence.map((item) => `- ${item}`).join("\n");
  const verification = record.change.verificationEvidence.map((item) => (
    `- \`${item.command}\` — ${item.result}; ${item.evidence}` + (item.sha256 ? `; SHA-256 ${item.sha256}` : "")
  )).join("\n");
  const conditional = (value) => `${value.status}: ${value.evidence}`;
  return {
    schema_version: record.schemaVersion,
    proposal_id: record.id,
    problem: record.change.problem,
    outcome: record.change.intendedOutcome,
    origin: record.origin.publicUrl ? `${record.origin.project} — ${record.origin.publicUrl}` : record.origin.project,
    origin_revision: record.origin.implementationCommit,
    origin_jj: record.origin.jjChangeId ?? "Not recorded — Git commit is authoritative",
    standard_revision: record.origin.pinnedStandardRevision,
    reuse_class: REUSE_FORM_VALUES[record.change.reuseClassification],
    affected_contract: `Profiles: ${profiles}\nRequirements: ${requirements}`,
    dependencies_fallback: [
      "Dependencies:",
      ...record.change.dependencies.map((item) => `- ${item}`),
      "",
      "Limitations:",
      ...record.change.limitations.map((item) => `- ${item}`),
      "",
      `Simpler fallback: ${record.change.fallback}`,
    ].join("\n"),
    evidence: [
      implementation,
      "",
      `Licensing: ${record.disclosure.licensingStatus}`,
      ...record.disclosure.licensingEvidence.map((item) => `- ${item}`),
    ].join("\n"),
    accessibility_browser: `Accessibility — ${conditional(record.change.accessibility)}\nBrowser — ${conditional(record.change.browser)}`,
    verification,
    migration: record.change.migration,
    proposal_marker: `<!-- dkbws-standard-proposal-form-sha256:${formSha256} -->\n${record.workflow.payload.marker}`,
  };
}

export function renderIssuePayload(record, { formSource = null, formRoot = STANDARD_ROOT } = {}) {
  const contract = loadFormContract({ root: formRoot, source: formSource });
  const values = fieldValues(record, contract.sha256);
  const sections = [];
  for (const field of contract.fields) {
    const label = field?.attributes?.label;
    if (typeof label !== "string" || label.length === 0) {
      throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", `Issue-form field ${field?.id ?? "<unknown>"} has no label.`);
    }
    if (field.type === "checkboxes") {
      if (field.id !== "safety") {
        throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", `Unsupported checkbox field ${field.id}.`);
      }
      const options = field?.attributes?.options ?? [];
      if (!options.length || options.some((option) => option?.required !== true || typeof option?.label !== "string")) {
        throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", "Every safety checkbox must be required and have a label.");
      }
      sections.push(`### ${label}\n\n${options.map((option) => `- [x] ${option.label}`).join("\n")}`);
      continue;
    }
    if (!Object.hasOwn(values, field.id)) {
      throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", `No deterministic renderer exists for issue-form field ${field.id}.`);
    }
    const value = values[field.id];
    if (typeof value !== "string" || value.length === 0) {
      throw new ProposalSafetyError("DKBWS-PROP-FORM-CONTRACT-001", `Rendered issue-form field ${field.id} is empty.`);
    }
    sections.push(`### ${label}\n\n${value}`);
  }
  const body = sections.join("\n\n");
  if (body.trimEnd().split(record.workflow.payload.marker).length !== 2 || !body.trimEnd().endsWith(record.workflow.payload.marker)) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-MARKER-001",
      "Rendered body must contain the stable marker exactly once as its final token.",
    );
  }
  const title = record.title.startsWith("[Standard change]: ")
    ? record.title
    : `[Standard change]: ${record.title}`;
  const payload = {
    repository: record.target.repository,
    title,
    labels: [...record.target.labels],
    body,
  };
  return {
    payload,
    digest: payloadDigest(payload),
    formSha256: contract.sha256,
    formValues: values,
    form: contract.form,
  };
}

function schemaValidator(name) {
  const schema = strictJson(readFileSync(path.join(STANDARD_ROOT, "schema", name), "utf8"), `schema/${name}`);
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  return ajv.compile(schema);
}

const validateRecordSchema = schemaValidator("standard-proposal-record-v1.json");
const validateRegistrySchema = schemaValidator("standard-proposal-registry-v1.json");

function diagnostic(code, severity, message, extra = {}) {
  return { code, severity, message, ...extra };
}

function schemaDiagnostics(validator, value, file) {
  if (validator(value)) return [];
  return (validator.errors ?? []).map((error) => diagnostic(
    "DKBWS-PROP-SCHEMA-001",
    "error",
    `${error.instancePath || "/"} ${error.message}`,
    { file, field: error.instancePath || "/" },
  ));
}

function lifecycleStateDiagnostics(record, file) {
  const workflow = record?.workflow;
  if (!workflow || typeof workflow !== "object") return [];
  const diagnostics = [];
  const requireNull = (state, fields, label) => {
    if (!state || fields.some((field) => state[field] !== null)) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-STATE-TRANSITION-001",
        "error",
        `${label} state must not retain outcome metadata.`,
        { file },
      ));
    }
  };
  if (workflow.payload?.status === "unprepared") {
    requireNull(workflow.payload, ["digest", "formSha256", "preparedAt"], "Unprepared payload");
  }
  if (workflow.payload?.status === "prepared"
    && (workflow.local?.implementationStatus !== "complete" || workflow.local?.verificationStatus !== "pass")) {
    diagnostics.push(diagnostic(
      "DKBWS-PROP-STATE-TRANSITION-001",
      "error",
      "Prepared payload requires a complete implementation and passing local verification.",
      { file },
    ));
  }
  if (workflow.approval?.status === "pending") {
    requireNull(workflow.approval, ["digest", "formSha256", "authority", "approvedAt"], "Pending approval");
  }
  if (["approved", "stale"].includes(workflow.approval?.status) && workflow.payload?.status !== "prepared") {
    diagnostics.push(diagnostic(
      "DKBWS-PROP-STATE-TRANSITION-001",
      "error",
      "Approved or stale approval requires a prepared payload.",
      { file },
    ));
  }
  if (workflow.issue?.status === "not-submitted") {
    requireNull(workflow.issue, ["url", "number", "linkedAt", "observedAt", "remotePayloadDigest"], "Not-submitted issue");
    if (workflow.issue.observedState !== "unknown") {
      diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Not-submitted issue state must remain unknown.", { file }));
    }
  }
  if (["submission-ambiguous", "submitted-unlinked"].includes(workflow.issue?.status)) {
    requireNull(workflow.issue, ["url", "number", "linkedAt", "remotePayloadDigest"], `${workflow.issue.status} issue`);
    if (workflow.issue.observedState !== "unknown" || workflow.issue.observedAt === null) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-STATE-TRANSITION-001",
        "error",
        `${workflow.issue.status} issue must record an observation time while its remote state remains unknown.`,
        { file },
      ));
    }
  }
  if (["submission-ambiguous", "submitted-unlinked", "linked"].includes(workflow.issue?.status)
    && (workflow.payload?.status !== "prepared" || workflow.approval?.status !== "approved")) {
    diagnostics.push(diagnostic(
      "DKBWS-PROP-STATE-TRANSITION-001",
      "error",
      "Submission observation or issue linkage requires a prepared payload with current explicit approval.",
      { file },
    ));
  }
  if (workflow.issue?.status === "linked") {
    const issueNumber = Number(workflow.issue.url?.match(/\/issues\/([1-9][0-9]*)$/)?.[1]);
    if (issueNumber !== workflow.issue.number
      || !["open", "closed"].includes(workflow.issue.observedState)
      || workflow.issue.linkedAt !== workflow.issue.observedAt) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-STATE-TRANSITION-001",
        "error",
        "Linked issue identity, observed state, and linkage observation timestamp must match the exact link transition.",
        { file },
      ));
    }
  }
  if (workflow.upstream?.decision === "pending") {
    requireNull(workflow.upstream, ["decidedAt", "decisionRevision", "evidence", "rationale"], "Pending upstream decision");
    if (workflow.upstream.classification !== "pending" || (workflow.acceptance?.requirementIds?.length ?? 0) !== 0) {
      diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Pending upstream decision cannot retain a classification or accepted requirements.", { file }));
    }
  } else if (workflow.issue?.status !== "linked") {
    diagnostics.push(diagnostic(
      "DKBWS-PROP-STATE-TRANSITION-001",
      "error",
      "An upstream decision requires exact governed issue linkage; historical pre-registry intake is allowed only in the Standard registry.",
      { file },
    ));
  }
  if (workflow.upstream?.decision === "accepted") {
    const requirementIds = workflow.acceptance?.requirementIds ?? [];
    if (JSON.stringify(requirementIds) !== JSON.stringify([...requirementIds].sort(CODEPOINT_SORT))) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-STATE-TRANSITION-001",
        "error",
        "Accepted requirement IDs must retain the codepoint-sorted command transition order.",
        { file },
      ));
    }
  }
  if (["pending", "not-applicable"].includes(workflow.release?.status)) {
    requireNull(workflow.release, ["tag", "revision", "recordedAt", "registryRevision"], `${workflow.release.status} release`);
  }
  if (workflow.release?.status === "included" && workflow.upstream?.decision !== "accepted") {
    diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Release inclusion requires an accepted upstream decision.", { file }));
  }
  if (workflow.adoption?.status === "adopted") {
    if (workflow.release?.status !== "included" || workflow.adoption.toStandardRevision !== workflow.release.revision) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-STATE-TRANSITION-001",
        "error",
        "Adoption requires and must target the exact included release revision.",
        { file },
      ));
    }
    if (workflow.adoption.authority?.at !== workflow.adoption.adoptedAt) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-STATE-TRANSITION-001",
        "error",
        "Adoption authority and adoption record must share the exact command transition timestamp.",
        { file },
      ));
    }
  } else if (workflow.adoption?.status === "not-considered") {
    requireNull(workflow.adoption, ["authority", "fromStandardRevision", "toStandardRevision", "consumerRevision", "adoptedAt"], "Not-considered adoption");
    if ((workflow.adoption.verification?.length ?? 0) !== 0) {
      diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Not-considered adoption cannot retain verification evidence.", { file }));
    }
  }
  return diagnostics;
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
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walkStrings(item, visitor, `${pointer}.${key}`);
  }
}

export function scanProposalSafety(record) {
  const findings = [];
  walkStrings(record, (value, field) => {
    const checks = [
      ["DKBWS-PROP-SECRET-001", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,})\b|\b(?:password|passwd|api[_-]?key|secret|token)\s*[:=]\s*[^\s]{8,}/i, "possible secret or credential"],
      ["DKBWS-PROP-PRIVATE-PATH-001", /(?:^|[\s"'`])(?:\/(?:Users|home|Volumes|private)\/[^\s"'`]+|[A-Za-z]:\\(?:Users|Documents and Settings)\\[^\s"'`]+|file:\/\/\/[^\s"'`]+)/, "private absolute path"],
      ["DKBWS-PROP-PERSONAL-DATA-001", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?44\s?\d{4}|0\d{4})\s?\d{6}\b/i, "possible personal contact data"],
      ["DKBWS-PROP-RESTRICTED-001", /\b(?:confidential|internal only|restricted evidence|under (?:an )?NDA)\b/i, "confidential or restricted material"],
      ["DKBWS-PROP-SECURITY-ROUTE-001", /\b(?:CVE-\d{4}-\d+|remote code execution|privilege escalation|auth(?:entication)? bypass|zero[- ]day|exploit chain|SQL injection|cross-site scripting)\b/i, "suspected vulnerability detail"],
    ];
    for (const [code, pattern, description] of checks) {
      if (pattern.test(value)) findings.push(diagnostic(code, "error", `Proposal contains ${description}.`, { field }));
    }
    if (/\r|\0|[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
      findings.push(diagnostic("DKBWS-PROP-PAYLOAD-CONTROL-001", "error", "Proposal text contains a prohibited control character or CR line ending.", { field }));
    }
  });
  return findings;
}

function commitExists(root, commit) {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isAncestor(root, commit) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function adoptionProvenanceDiagnostics(record, root, file) {
  const adoption = record?.workflow?.adoption;
  if (adoption?.status !== "adopted") return [];
  if (!commitExists(root, adoption.consumerRevision)) {
    return [diagnostic(
      "DKBWS-PROP-ADOPTION-AUTHORITY-001",
      "error",
      "Recorded consumer adoption commit does not resolve in this repository.",
      { file },
    )];
  }
  if (!isAncestor(root, adoption.consumerRevision)) {
    return [diagnostic(
      "DKBWS-PROP-ADOPTION-AUTHORITY-001",
      "error",
      "Recorded consumer adoption commit is not an ancestor of the current consumer HEAD.",
      { file },
    )];
  }
  try {
    const adoptedManifest = yamlMapping(git(root, ["show", `${adoption.consumerRevision}:.wiki-standard.yaml`]), `${adoption.consumerRevision}:.wiki-standard.yaml`);
    const previousManifest = yamlMapping(git(root, ["show", `${adoption.consumerRevision}^1:.wiki-standard.yaml`]), `${adoption.consumerRevision}^1:.wiki-standard.yaml`);
    const diagnostics = [];
    if (adoptedManifest?.standard?.revision !== adoption.toStandardRevision) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-ADOPTION-AUTHORITY-001",
        "error",
        "Recorded consumer adoption commit does not pin its declared target Standard revision.",
        { file },
      ));
    }
    if (previousManifest?.standard?.revision !== adoption.fromStandardRevision) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-ADOPTION-AUTHORITY-001",
        "error",
        "Recorded consumer adoption commit's first parent does not pin its declared prior Standard revision.",
        { file },
      ));
    }
    return diagnostics;
  } catch (error) {
    return [diagnostic(
      "DKBWS-PROP-ADOPTION-AUTHORITY-001",
      "error",
      `Recorded consumer adoption transition cannot be inspected: ${error.message}`,
      { file },
    )];
  }
}

export function inspectRecord(record, {
  root = process.cwd(),
  file = null,
  formSource = null,
  resolveProvenance = true,
  allRecords = [],
} = {}) {
  const relativeFile = file ? portableRelative(root, file) : null;
  const diagnostics = schemaDiagnostics(validateRecordSchema, record, relativeFile);
  diagnostics.push(...lifecycleStateDiagnostics(record, relativeFile));
  if (diagnostics.length) return { record, diagnostics, payload: null };

  const expectedId = deriveProposalId({
    slug: record.slug,
    repository: record.target.repository,
    implementationCommit: record.origin.implementationCommit,
  });
  if (record.id !== expectedId) {
    diagnostics.push(diagnostic("DKBWS-PROP-ID-001", "error", `Proposal ID must be ${expectedId}.`, { file: relativeFile, field: "$.id" }));
  }
  const expectedMarker = markerFor(record.id);
  if (record.workflow.payload.marker !== expectedMarker) {
    diagnostics.push(diagnostic("DKBWS-PROP-MARKER-001", "error", "Stable marker is not derived from the proposal ID.", { file: relativeFile, field: "$.workflow.payload.marker" }));
  }
  if (file && path.basename(file, ".json") !== record.slug) {
    diagnostics.push(diagnostic("DKBWS-PROP-SLUG-001", "error", "Record filename must equal its immutable slug.", { file: relativeFile }));
  }
  const sameId = allRecords.filter((candidate) => candidate.record?.id === record.id);
  if (sameId.length > 1) diagnostics.push(diagnostic("DKBWS-PROP-ID-DUPLICATE-001", "error", `Proposal ID appears in ${sameId.length} records.`, { file: relativeFile }));
  const sameMarker = allRecords.filter((candidate) => candidate.record?.workflow?.payload?.marker === record.workflow.payload.marker);
  if (sameMarker.length > 1) diagnostics.push(diagnostic("DKBWS-PROP-MARKER-DUPLICATE-001", "error", `Proposal marker appears in ${sameMarker.length} records.`, { file: relativeFile }));

  if (resolveProvenance) {
    if (!commitExists(root, record.origin.implementationCommit)) {
      diagnostics.push(diagnostic("DKBWS-PROP-GIT-COMMIT-001", "error", "Implementation commit does not resolve in the consumer repository.", { file: relativeFile }));
    } else if (!isAncestor(root, record.origin.implementationCommit)) {
      diagnostics.push(diagnostic("DKBWS-PROP-GIT-COMMIT-001", "error", "Implementation commit is not an ancestor of the current consumer HEAD.", { file: relativeFile }));
    }
    diagnostics.push(...adoptionProvenanceDiagnostics(record, root, relativeFile));
  }

  const evidenceResults = record.change.verificationEvidence.map((item) => item.result);
  const expectedVerification = evidenceResults.includes("fail")
    ? "fail"
    : evidenceResults.every((status) => status === "pass")
      ? "pass"
      : "pending";
  if (record.workflow.local.verificationStatus !== expectedVerification) {
    diagnostics.push(diagnostic("DKBWS-PROP-VERIFY-001", "error", `Local verification status must be ${expectedVerification} from its evidence.`, { file: relativeFile }));
  }
  if (record.workflow.local.verificationStatus === "pass" && record.workflow.local.implementationStatus !== "complete") {
    diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Verification cannot pass before implementation is complete.", { file: relativeFile }));
  }

  for (const [pointer, value] of [
    ["$.title", record.title],
    ["$.change.problem", record.change.problem],
    ["$.change.intendedOutcome", record.change.intendedOutcome],
    ["$.change.fallback", record.change.fallback],
    ["$.change.migration", record.change.migration],
  ]) {
    if (/^TODO\b/i.test(value)) diagnostics.push(diagnostic("DKBWS-PROP-INCOMPLETE-001", "error", "Proposal scaffold still contains a TODO value.", { file: relativeFile, field: pointer }));
  }
  diagnostics.push(...scanProposalSafety(record).map((item) => ({ ...item, file: relativeFile })));

  let rendered = null;
  try {
    rendered = renderIssuePayload(record, { formSource });
  } catch (error) {
    diagnostics.push(diagnostic(error.code ?? "DKBWS-PROP-FORM-CONTRACT-001", "error", error.message, { file: relativeFile }));
  }
  if (rendered) {
    if (record.target.issueFormSha256 !== rendered.formSha256) {
      diagnostics.push(diagnostic("DKBWS-PROP-FORM-SHA-001", "error", "Target issue-form SHA-256 does not match the versioned local form.", { file: relativeFile }));
    }
    if (record.workflow.payload.status === "prepared") {
      if (record.workflow.payload.digest !== rendered.digest || record.workflow.payload.formSha256 !== rendered.formSha256) {
        diagnostics.push(diagnostic("DKBWS-PROP-PAYLOAD-DIGEST-001", "error", "Prepared payload digest or form binding is stale.", { file: relativeFile }));
      }
    }
    if (record.workflow.approval.status === "approved"
      && (record.workflow.approval.digest !== rendered.digest || record.workflow.approval.formSha256 !== rendered.formSha256)) {
      diagnostics.push(diagnostic("DKBWS-PROP-APPROVAL-STALE-001", "error", "Approval no longer matches the exact payload and form SHA-256.", { file: relativeFile }));
    }
    if (record.workflow.approval.status === "stale"
      && record.workflow.approval.digest === rendered.digest
      && record.workflow.approval.formSha256 === rendered.formSha256) {
      diagnostics.push(diagnostic("DKBWS-PROP-APPROVAL-STALE-001", "error", "A stale approval must be explicitly renewed even when bytes were restored.", { file: relativeFile }));
    }
    if (record.workflow.issue.status === "linked" && record.workflow.issue.remotePayloadDigest !== rendered.digest) {
      diagnostics.push(diagnostic("DKBWS-PROP-ISSUE-PAYLOAD-001", "error", "Linked issue digest must remain bound to the exact approved payload.", { file: relativeFile }));
    }
  }

  const issue = record.workflow.issue;
  if (["submission-ambiguous", "submitted-unlinked", "linked"].includes(issue.status)
    && record.workflow.approval.status !== "approved") {
    diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Submission/linkage requires current explicit payload approval.", { file: relativeFile }));
  }
  if (issue.observedState === "closed" && record.workflow.upstream.decision === "pending") {
    diagnostics.push(diagnostic("DKBWS-PROP-CLOSED-NOT-DECISION-001", "info", "Closed issue remains pending until an explicit upstream decision is recorded.", { file: relativeFile }));
  }

  const upstream = record.workflow.upstream;
  if (upstream.decision === "pending" && record.workflow.acceptance.requirementIds.length) {
    diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Pending proposal cannot have accepted requirement IDs.", { file: relativeFile }));
  }
  if (["rejected", "withdrawn"].includes(upstream.decision) && record.workflow.release.status !== "not-applicable") {
    diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "Rejected or withdrawn proposals have no applicable release.", { file: relativeFile }));
  }
  if (record.workflow.release.status === "included" && upstream.decision !== "accepted") {
    diagnostics.push(diagnostic("DKBWS-PROP-RELEASE-001", "error", "Release inclusion requires explicit acceptance.", { file: relativeFile }));
  }
  if (record.workflow.adoption.status === "adopted" && record.workflow.release.status !== "included") {
    diagnostics.push(diagnostic("DKBWS-PROP-ADOPTION-AUTHORITY-001", "error", "Consumer adoption requires an immutable included release.", { file: relativeFile }));
  }
  return { record, diagnostics, payload: rendered };
}

export function loadRecordEntries(root = process.cwd()) {
  const directory = path.join(root, PROPOSAL_DIRECTORY);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json") && name !== "registry.json")
    .sort(CODEPOINT_SORT)
    .map((name) => {
      const file = path.join(directory, name);
      const metadata = lstatSync(file);
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new ProposalSafetyError("DKBWS-PROP-PATH-001", `${portableRelative(root, file)} must be a regular non-symlink file.`);
      }
      return { file, record: strictJson(readFileSync(file, "utf8"), portableRelative(root, file)) };
    });
}

export function inspectAll({ root = process.cwd(), formSource = null, resolveProvenance = true } = {}) {
  const entries = loadRecordEntries(root);
  const results = entries.map((entry) => inspectRecord(entry.record, {
    root,
    file: entry.file,
    formSource,
    resolveProvenance,
    allRecords: entries,
  }));
  const registry = loadRegistry(root);
  const diagnostics = [
    ...results.flatMap((result) => result.diagnostics),
    ...registry.diagnostics,
  ];
  return {
    readOnly: true,
    writesPerformed: false,
    records: results,
    registry: registry.registry,
    diagnostics: sortDiagnostics(diagnostics),
    status: diagnostics.some((item) => item.severity === "error") ? "invalid" : "valid",
  };
}

export function findRecord(root, selector) {
  const entries = loadRecordEntries(root);
  const matches = entries.filter(({ file, record }) => (
    record.id === selector || record.slug === selector || path.basename(file, ".json") === selector
  ));
  if (matches.length === 0) throw new ProposalUsageError(`No proposal record matches ${JSON.stringify(selector)}.`);
  if (matches.length > 1) throw new ProposalSafetyError("DKBWS-PROP-ID-DUPLICATE-001", `Selector ${selector} matches multiple records.`);
  return matches[0];
}

export function loadRegistry(root = process.cwd()) {
  const file = path.join(root, REGISTRY_PATH);
  if (!existsSync(file)) return { file, registry: null, diagnostics: [] };
  const registry = strictJson(readFileSync(file, "utf8"), REGISTRY_PATH);
  const diagnostics = registryDiagnostics(registry, REGISTRY_PATH);
  return { file, registry, diagnostics: sortDiagnostics(diagnostics) };
}

function isHistoricalPreRegistryBridge(entry) {
  return entry?.id === HISTORICAL_PRE_REGISTRY_BRIDGE.id
    && entry.issue === null
    && entry.origin?.project === HISTORICAL_PRE_REGISTRY_BRIDGE.project
    && entry.origin?.publicUrl === null
    && entry.origin?.implementationCommit === HISTORICAL_PRE_REGISTRY_BRIDGE.implementationCommit
    && entry.origin?.verificationCommit === HISTORICAL_PRE_REGISTRY_BRIDGE.verificationCommit
    && entry.origin?.pinnedStandardRevision === HISTORICAL_PRE_REGISTRY_BRIDGE.pinnedStandardRevision
    && entry.classification === "reusable"
    && entry.decision === "accepted"
    && entry.decisionRevision === HISTORICAL_PRE_REGISTRY_BRIDGE.decisionRevision
    && JSON.stringify(entry.acceptedRequirements) === JSON.stringify(HISTORICAL_PRE_REGISTRY_BRIDGE.acceptedRequirements);
}

export function registryDiagnostics(registry, file = REGISTRY_PATH) {
  const diagnostics = schemaDiagnostics(validateRegistrySchema, registry, file);
  for (const entry of Array.isArray(registry?.entries) ? registry.entries : []) {
    if (entry?.intakeMode === "pre-registry-local-history" && !isHistoricalPreRegistryBridge(entry)) {
      diagnostics.push(diagnostic(
        "DKBWS-PROP-HISTORICAL-BRIDGE-001",
        "error",
        `${entry.id ?? "Unknown proposal"} is not the single immutable pre-registry bridge authorised by workflow v1.`,
        { file },
      ));
    }
  }
  if (diagnostics.length) return diagnostics;
  const ids = registry.entries.map((entry) => entry.id);
  const markers = registry.entries.map((entry) => entry.marker);
  const issueUrls = registry.entries.map((entry) => entry.issue?.url).filter(Boolean);
  const issueNumbers = registry.entries.map((entry) => entry.issue?.number).filter(Boolean);
  for (const id of duplicates(ids)) diagnostics.push(diagnostic("DKBWS-PROP-ID-DUPLICATE-001", "error", `Registry repeats proposal ID ${id}.`, { file }));
  for (const marker of duplicates(markers)) diagnostics.push(diagnostic("DKBWS-PROP-MARKER-DUPLICATE-001", "error", `Registry repeats proposal marker ${marker}.`, { file }));
  for (const url of duplicates(issueUrls)) diagnostics.push(diagnostic("DKBWS-PROP-ISSUE-DUPLICATE-001", "error", `Registry repeats issue URL ${url}.`, { file }));
  for (const number of duplicates(issueNumbers)) diagnostics.push(diagnostic("DKBWS-PROP-ISSUE-DUPLICATE-001", "error", `Registry repeats issue number ${number}.`, { file }));
  if (JSON.stringify(ids) !== JSON.stringify([...ids].sort(CODEPOINT_SORT))) {
    diagnostics.push(diagnostic("DKBWS-PROP-REGISTRY-ORDER-001", "error", "Registry entries must be codepoint-sorted by proposal ID.", { file }));
  }
  for (const entry of registry.entries) {
    if (entry.marker !== markerFor(entry.id)) diagnostics.push(diagnostic("DKBWS-PROP-MARKER-001", "error", `Registry marker is not derived from ${entry.id}.`, { file }));
    if (JSON.stringify(entry.acceptedRequirements) !== JSON.stringify([...entry.acceptedRequirements].sort(CODEPOINT_SORT))) {
      diagnostics.push(diagnostic("DKBWS-PROP-REGISTRY-ORDER-001", "error", `${entry.id} accepted requirements must be codepoint-sorted.`, { file }));
    }
    if (entry.intakeMode === "governed-issue" && entry.issue === null) {
      diagnostics.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", `${entry.id} governed intake requires an exact issue linkage.`, { file }));
    }
  }
  return diagnostics;
}

export function prepareProposal({ root = process.cwd(), selector, now = new Date(), formSource = null } = {}) {
  const { file, record } = findRecord(root, selector);
  const before = inspectRecord(record, { root, file, formSource, allRecords: loadRecordEntries(root) });
  const blocking = before.diagnostics.filter((item) => item.severity === "error" && ![
    "DKBWS-PROP-PAYLOAD-DIGEST-001",
    "DKBWS-PROP-APPROVAL-STALE-001",
    "DKBWS-PROP-FORM-SHA-001",
  ].includes(item.code));
  if (record.workflow.local.implementationStatus !== "complete" || record.workflow.local.verificationStatus !== "pass") {
    blocking.push(diagnostic("DKBWS-PROP-VERIFY-001", "error", "Prepare requires a complete, passing local implementation and verification phase."));
  }
  if (["submission-ambiguous", "submitted-unlinked", "linked"].includes(record.workflow.issue.status)) {
    blocking.push(diagnostic("DKBWS-PROP-STATE-TRANSITION-001", "error", "A submitted proposal payload is frozen in workflow v1."));
  }
  if (blocking.length) throwDiagnostics("Proposal preparation refused", blocking);
  const rendered = renderIssuePayload(record, { formSource });
  const updated = structuredClone(record);
  updated.target.issueFormSha256 = rendered.formSha256;
  updated.workflow.payload = {
    status: "prepared",
    marker: record.workflow.payload.marker,
    digest: rendered.digest,
    formSha256: rendered.formSha256,
    preparedAt: iso(now),
  };
  if (record.workflow.approval.status === "approved"
    && (record.workflow.approval.digest !== rendered.digest || record.workflow.approval.formSha256 !== rendered.formSha256)) {
    updated.workflow.approval.status = "stale";
  }
  const postRender = renderIssuePayload(updated, { formSource });
  const output = {
    payloadVersion: "1.0",
    formSha256: postRender.formSha256,
    repository: postRender.payload.repository,
    title: postRender.payload.title,
    labels: postRender.payload.labels,
    body: postRender.payload.body,
    sha256: postRender.digest,
  };
  writeRecordIfChanged(file, updated);
  const outputFile = path.join(root, GENERATED_DIRECTORY, `${updated.id}.json`);
  assertIgnoredOutput(root, outputFile);
  atomicWrite(outputFile, stableJson(output));
  return { file, outputFile, record: updated, payload: postRender, changed: stableJson(record) !== stableJson(updated) };
}

export function approveProposal({ root = process.cwd(), selector, digest, authority, now = new Date(), formSource = null } = {}) {
  if (!authority) throw new ProposalUsageError("Approval requires --by <authority>.");
  const { file, record } = findRecord(root, selector);
  const rendered = renderIssuePayload(record, { formSource });
  if (record.workflow.payload.status !== "prepared"
    || record.workflow.payload.digest !== rendered.digest
    || record.workflow.payload.formSha256 !== rendered.formSha256
    || digest !== rendered.digest) {
    throw new ProposalSafetyError("DKBWS-PROP-APPROVAL-STALE-001", "Approval digest must exactly match the freshly rendered prepared payload and form.");
  }
  const updated = structuredClone(record);
  updated.workflow.approval = {
    status: "approved",
    digest: rendered.digest,
    formSha256: rendered.formSha256,
    authority,
    approvedAt: iso(now),
  };
  writeRecordIfChanged(file, updated);
  return { file, record: updated, payload: rendered };
}

export function markSubmissionAmbiguous({ root = process.cwd(), selector, now = new Date(), formSource = null } = {}) {
  return recordSubmissionObservation({ root, selector, status: "submission-ambiguous", now, formSource });
}

export function recordSubmissionObservation({ root = process.cwd(), selector, status, now = new Date(), formSource = null } = {}) {
  if (!['submission-ambiguous', 'submitted-unlinked'].includes(status)) {
    throw new ProposalUsageError("Submission observation must be submission-ambiguous or submitted-unlinked.");
  }
  const { file, record } = findRecord(root, selector);
  requireCurrentApproval(record, renderIssuePayload(record, { formSource }));
  if (record.workflow.issue.status !== "not-submitted") {
    throw new ProposalSafetyError("DKBWS-PROP-STATE-TRANSITION-001", "A recorded submission observation is frozen until marker reconciliation links the issue.");
  }
  const updated = structuredClone(record);
  updated.workflow.issue = {
    status,
    observedState: "unknown",
    url: null,
    number: null,
    linkedAt: null,
    observedAt: iso(now),
    remotePayloadDigest: null,
  };
  writeRecordIfChanged(file, updated);
  return { file, record: updated };
}

export async function linkIssue({ root = process.cwd(), selector, issueUrl, remote, now = new Date(), formSource = null } = {}) {
  const { file, record } = findRecord(root, selector);
  if (record.workflow.issue.status === "linked") {
    throw new ProposalSafetyError("DKBWS-PROP-STATE-TRANSITION-001", "Issue linkage is terminal in workflow v1.");
  }
  const rendered = renderIssuePayload(record, { formSource });
  requireCurrentApproval(record, rendered);
  const parsed = parseIssueUrl(issueUrl);
  const issue = await remote.getIssue(parsed.number);
  const observedIdentity = parseIssueUrl(issue?.html_url ?? issueUrl);
  if (issue?.number !== parsed.number || observedIdentity.number !== parsed.number) {
    throw new ProposalSafetyError("DKBWS-PROP-ISSUE-LINK-001", "Remote issue identity does not match the exact requested Standard issue URL.");
  }
  const remotePayload = issuePayload(issue, record.target.repository);
  const digest = payloadDigest(remotePayload);
  if (countOccurrences(issue.body ?? "", record.workflow.payload.marker) !== 1) {
    throw new ProposalSafetyError("DKBWS-PROP-ISSUE-MARKER-001", "Linked issue must contain the stable proposal marker exactly once.");
  }
  if (digest !== rendered.digest) {
    throw new ProposalSafetyError("DKBWS-PROP-ISSUE-PAYLOAD-001", `Remote issue payload digest ${digest} does not match approved digest ${rendered.digest}.`);
  }
  const updated = structuredClone(record);
  updated.workflow.issue = {
    status: "linked",
    observedState: issue.state === "closed" ? "closed" : "open",
    url: issue.html_url ?? issueUrl,
    number: parsed.number,
    linkedAt: iso(now),
    observedAt: iso(now),
    remotePayloadDigest: digest,
  };
  writeRecordIfChanged(file, updated);
  return { file, record: updated, issue, digest };
}

export function recordDecision({
  root = process.cwd(), selector, decision, classification, decisionRevision, evidence, rationale,
  requirementIds = [], now = new Date(), formSource = null,
} = {}) {
  if (!["accepted", "rejected", "withdrawn"].includes(decision)) throw new ProposalUsageError("Decision must be accepted, rejected, or withdrawn.");
  if (!["experimental", "project-specific", "reusable", "preferred", "core"].includes(classification)) {
    throw new ProposalUsageError("Decision classification must be experimental, project-specific, reusable, preferred, or core.");
  }
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(decisionRevision ?? "")) throw new ProposalUsageError("Decision requires a full immutable Standard revision.");
  if (!evidence || !rationale) throw new ProposalUsageError("Decision requires evidence and rationale.");
  if (decision === "accepted" && !requirementIds.length) throw new ProposalUsageError("Acceptance requires at least one requirement ID.");
  if (decision !== "accepted" && requirementIds.length) throw new ProposalUsageError("Rejected or withdrawn proposals cannot have accepted requirement IDs.");
  const { file, record } = findRecord(root, selector);
  if (record.workflow.upstream.decision !== "pending") throw new ProposalSafetyError("DKBWS-PROP-STATE-TRANSITION-001", "Upstream decision is terminal in workflow v1.");
  if (record.workflow.issue.status !== "linked") {
    throw new ProposalSafetyError("DKBWS-PROP-STATE-TRANSITION-001", "A v1 consumer proposal requires an exact governed issue linkage before an upstream decision can be recorded.");
  }
  const updated = structuredClone(record);
  updated.workflow.upstream = {
    classification,
    decision,
    decidedAt: iso(now),
    decisionRevision,
    evidence,
    rationale,
  };
  updated.workflow.acceptance.requirementIds = decision === "accepted" ? [...new Set(requirementIds)].sort(CODEPOINT_SORT) : [];
  updated.workflow.release = {
    status: decision === "accepted" ? "pending" : "not-applicable",
    tag: null,
    revision: null,
    recordedAt: null,
    registryRevision: null,
  };
  const validation = inspectRecord(updated, {
    root,
    file,
    formSource,
    allRecords: loadRecordEntries(root),
  });
  const errors = validation.diagnostics.filter((item) => item.severity === "error");
  if (errors.length) throwDiagnostics("Decision recording refused", errors);
  writeRecordIfChanged(file, updated);
  return { file, record: updated };
}

async function verifiedReleaseEvidence({ remote, tag, revision, registryRevision, proposalId, requirements }) {
  if (!remote) throw new ProposalUsageError("Release verification requires a read-only remote adapter.");
  for (const method of ["resolveTag", "resolveRevision", "isDescendant", "getRelease", "getRegistry"]) {
    if (typeof remote[method] !== "function") {
      throw new ProposalSafetyError("DKBWS-PROP-REMOTE-READ-001", `Read-only remote adapter lacks required ${method} support.`);
    }
  }

  let resolvedRegistryRevision;
  try {
    resolvedRegistryRevision = await remote.resolveRevision(registryRevision);
  } catch (error) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-REGISTRY-REVISION-001",
      `Registry revision ${registryRevision} could not be resolved exactly (${error.message}).`,
    );
  }
  if (resolvedRegistryRevision !== registryRevision) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-REGISTRY-REVISION-001",
      `Registry revision ${registryRevision} resolved to ${resolvedRegistryRevision ?? "no commit"}.`,
    );
  }

  let descendsFromRelease;
  try {
    descendsFromRelease = await remote.isDescendant(revision, registryRevision);
  } catch (error) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-REGISTRY-ANCESTRY-001",
      `Could not prove registry revision ${registryRevision} descends from release revision ${revision} (${error.message}).`,
    );
  }
  if (descendsFromRelease !== true) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-REGISTRY-ANCESTRY-001",
      `Registry revision ${registryRevision} does not descend from release revision ${revision}.`,
    );
  }

  let release;
  try {
    release = await remote.getRelease(tag);
  } catch (error) {
    throw new ProposalSafetyError("DKBWS-PROP-RELEASE-IMMUTABLE-001", `Public GitHub release ${tag} is unavailable (${error.message}).`);
  }
  if (!release || release.tag_name !== tag) {
    throw new ProposalSafetyError("DKBWS-PROP-RELEASE-IMMUTABLE-001", `Public GitHub release ${tag} is missing or names a different tag.`);
  }
  if (release.draft !== false) {
    throw new ProposalSafetyError("DKBWS-PROP-RELEASE-IMMUTABLE-001", `Public GitHub release ${tag} is still a draft.`);
  }
  if (release.immutable !== true) {
    throw new ProposalSafetyError("DKBWS-PROP-RELEASE-IMMUTABLE-001", `Public GitHub release ${tag} is not marked immutable.`);
  }

  let resolvedTag;
  try {
    resolvedTag = await remote.resolveTag(tag);
  } catch (error) {
    throw new ProposalSafetyError("DKBWS-PROP-RELEASE-001", `Release tag ${tag} could not be resolved (${error.message}).`);
  }
  if (resolvedTag !== revision) {
    throw new ProposalSafetyError("DKBWS-PROP-RELEASE-001", `Immutable tag ${tag} resolves to ${resolvedTag}, not ${revision}.`);
  }

  let registry;
  try {
    registry = await remote.getRegistry(registryRevision);
  } catch (error) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-REGISTRY-REVISION-001",
      `Registry bytes are unavailable at exact revision ${registryRevision} (${error.message}).`,
    );
  }
  const registryErrors = registry
    ? registryDiagnostics(registry, `remote ${REGISTRY_PATH}@${registryRevision}`).filter((item) => item.severity === "error")
    : [diagnostic("DKBWS-PROP-REGISTRY-REVISION-001", "error", `Registry bytes are unavailable at exact revision ${registryRevision}.`)];
  if (registryErrors.length) throwDiagnostics("Release verification refused", registryErrors);
  const entry = registry.entries.find((candidate) => candidate.id === proposalId);
  if (!entry || entry.decision !== "accepted"
    || JSON.stringify(entry.acceptedRequirements) !== JSON.stringify(requirements)
    || entry.release?.status !== "included" || entry.release.tag !== tag || entry.release.revision !== revision) {
    throw new ProposalSafetyError(
      "DKBWS-PROP-RELEASE-001",
      `Registry at ${registryRevision} does not map this accepted proposal and requirements to the exact immutable release.`,
    );
  }
  return { registry, entry, release, resolvedTag, resolvedRegistryRevision };
}

export async function recordRelease({ root = process.cwd(), selector, tag, revision, registryRevision, remote, now = new Date() } = {}) {
  const { file, record } = findRecord(root, selector);
  if (record.workflow.upstream.decision !== "accepted") throw new ProposalSafetyError("DKBWS-PROP-RELEASE-001", "Only accepted proposals can enter a release.");
  if (record.workflow.release.status !== "pending") throw new ProposalSafetyError("DKBWS-PROP-STATE-TRANSITION-001", "Release inclusion is terminal in workflow v1.");
  for (const [label, value] of [["release revision", revision], ["registry revision", registryRevision]]) {
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value ?? "")) throw new ProposalUsageError(`${label} must be a full immutable commit.`);
  }
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(tag ?? "")) throw new ProposalUsageError("Release tag is invalid.");
  await verifiedReleaseEvidence({
    remote,
    tag,
    revision,
    registryRevision,
    proposalId: record.id,
    requirements: record.workflow.acceptance.requirementIds,
  });
  const updated = structuredClone(record);
  updated.workflow.release = { status: "included", tag, revision, recordedAt: iso(now), registryRevision };
  writeRecordIfChanged(file, updated);
  return { file, record: updated };
}

export function recordAdoption({
  root = process.cwd(), selector, authority, fromStandardRevision, toStandardRevision,
  consumerRevision, verification = [], now = new Date(),
} = {}) {
  const { file, record } = findRecord(root, selector);
  if (record.workflow.adoption.status === "adopted") {
    throw new ProposalSafetyError("DKBWS-PROP-STATE-TRANSITION-001", "Consumer adoption is terminal in workflow v1.");
  }
  if (record.workflow.release.status !== "included" || record.workflow.release.revision !== toStandardRevision) {
    throw new ProposalSafetyError("DKBWS-PROP-ADOPTION-AUTHORITY-001", "Adoption target must be the proposal's immutable included release revision.");
  }
  if (!authority || !verification.length) throw new ProposalUsageError("Adoption requires separate authority and verification evidence.");
  for (const [label, value] of [["from Standard revision", fromStandardRevision], ["to Standard revision", toStandardRevision], ["consumer revision", consumerRevision]]) {
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value ?? "")) throw new ProposalUsageError(`${label} must be a full immutable commit.`);
  }
  if (!commitExists(root, consumerRevision)) {
    throw new ProposalSafetyError("DKBWS-PROP-ADOPTION-AUTHORITY-001", "Consumer adoption commit does not resolve in this repository.");
  }
  let adoptedManifest;
  let previousManifest;
  try {
    adoptedManifest = yamlMapping(git(root, ["show", `${consumerRevision}:.wiki-standard.yaml`]), `${consumerRevision}:.wiki-standard.yaml`);
    previousManifest = yamlMapping(git(root, ["show", `${consumerRevision}^1:.wiki-standard.yaml`]), `${consumerRevision}^1:.wiki-standard.yaml`);
  } catch (error) {
    throw new ProposalSafetyError("DKBWS-PROP-ADOPTION-AUTHORITY-001", `Cannot inspect consumer adoption or prior manifest: ${error.message}`);
  }
  if (adoptedManifest?.standard?.revision !== toStandardRevision) {
    throw new ProposalSafetyError("DKBWS-PROP-ADOPTION-AUTHORITY-001", "Consumer adoption commit does not pin the authorised target Standard revision.");
  }
  if (previousManifest?.standard?.revision !== fromStandardRevision) {
    throw new ProposalSafetyError("DKBWS-PROP-ADOPTION-AUTHORITY-001", "Declared from-Standard revision does not match the adoption commit's first-parent manifest.");
  }
  const updated = structuredClone(record);
  updated.workflow.adoption = {
    status: "adopted",
    authority: { by: authority, at: iso(now) },
    fromStandardRevision,
    toStandardRevision,
    consumerRevision,
    adoptedAt: iso(now),
    verification: [...new Set(verification)],
  };
  writeRecordIfChanged(file, updated);
  return { file, record: updated };
}

export function newProposal({ root = process.cwd(), slug, implementationRevision = "HEAD", now = new Date() } = {}) {
  const canonicalRoot = gitRoot(root);
  const status = git(canonicalRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new ProposalSafetyError("DKBWS-PROP-GIT-STATE-001", "Create the proposal only after committing the verified implementation; the working copy is not clean.");
  const implementationCommit = resolveCommit(canonicalRoot, implementationRevision);
  const manifestPath = path.join(canonicalRoot, ".wiki-standard.yaml");
  if (!existsSync(manifestPath)) throw new ProposalSafetyError("DKBWS-PROP-PIN-001", "Consumer manifest is missing.");
  const manifest = yamlMapping(readFileSync(manifestPath, "utf8"), ".wiki-standard.yaml");
  const pinnedStandardRevision = manifest?.standard?.revision;
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(pinnedStandardRevision ?? "")) {
    throw new ProposalSafetyError("DKBWS-PROP-PIN-001", "Consumer manifest must pin a full immutable Standard revision before proposal creation.");
  }
  const form = loadFormContract();
  const id = deriveProposalId({ slug, implementationCommit });
  const file = path.join(canonicalRoot, PROPOSAL_DIRECTORY, `${slug}.json`);
  if (existsSync(file)) throw new ProposalSafetyError("DKBWS-PROP-ID-DUPLICATE-001", `Proposal path already exists: ${portableRelative(canonicalRoot, file)}`);
  const project = projectName(canonicalRoot);
  const jjChangeId = jjChangeFor(canonicalRoot, implementationCommit);
  const timestamp = iso(now);
  const record = {
    $schema: RECORD_SCHEMA_ID,
    schemaVersion: "1.0",
    id,
    slug,
    title: `TODO: ${slug.split("-").join(" ")}`,
    target: {
      repository: TARGET_REPOSITORY,
      issueForm: ".github/ISSUE_TEMPLATE/standard-change.yml",
      issueFormVersion: "1.0",
      issueFormSha256: form.sha256,
      labels: ["enhancement", "standard-change"],
    },
    origin: {
      project,
      publicUrl: null,
      implementationCommit,
      jjChangeId,
      pinnedStandardRevision,
    },
    change: {
      problem: "TODO: describe the observed problem",
      intendedOutcome: "TODO: describe the reusable outcome",
      reuseClassification: "unknown",
      affectedProfiles: ["unknown"],
      affectedRequirements: ["unknown"],
      implementationEvidence: ["TODO: add repository-relative or public implementation evidence"],
      verificationEvidence: [{ command: "TODO: verification command", result: "not-checked", completedAt: timestamp, evidence: "TODO: verification evidence", sha256: null }],
      dependencies: ["TODO: record dependencies or an explicit none"],
      limitations: ["TODO: record limitations or an explicit none known"],
      fallback: "TODO: describe the simpler fallback",
      migration: "TODO: describe migration and compatibility impact",
      accessibility: { status: "not-applicable", evidence: "TODO: explain applicability" },
      browser: { status: "not-applicable", evidence: "TODO: explain applicability" },
    },
    disclosure: {
      licensingStatus: "not-applicable",
      licensingEvidence: ["TODO: explain licensing status"],
      authorityToShare: true,
      secrets: false,
      privateAbsolutePaths: false,
      personalData: false,
      confidentialOrRestrictedEvidence: false,
      vulnerabilityDetails: false,
      unlicensedMaterial: false,
      automaticUploads: false,
    },
    workflow: {
      local: { observationStatus: "recorded", implementationStatus: "pending", verificationStatus: "pending" },
      payload: { status: "unprepared", marker: markerFor(id), digest: null, formSha256: null, preparedAt: null },
      approval: { status: "pending", digest: null, formSha256: null, authority: null, approvedAt: null },
      issue: { status: "not-submitted", observedState: "unknown", url: null, number: null, linkedAt: null, observedAt: null, remotePayloadDigest: null },
      upstream: { classification: "pending", decision: "pending", decidedAt: null, decisionRevision: null, evidence: null, rationale: null },
      acceptance: { requirementIds: [] },
      release: { status: "pending", tag: null, revision: null, recordedAt: null, registryRevision: null },
      adoption: { status: "not-considered", authority: null, fromStandardRevision: null, toStandardRevision: null, consumerRevision: null, adoptedAt: null, verification: [] },
    },
  };
  atomicWrite(file, stableJson(record));
  return { file, record };
}

export function createFixtureRemote(fixtureDirectory) {
  const read = (name) => readFileSync(path.join(fixtureDirectory, name));
  const issues = () => strictJson(read("issues.json").toString("utf8"), `${fixtureDirectory}/issues.json`);
  const optionalJson = (name, fallback = null) => {
    const file = path.join(fixtureDirectory, name);
    return existsSync(file) ? strictJson(readFileSync(file, "utf8"), file) : fallback;
  };
  return {
    methods: [],
    async getForm() { this.methods.push("GET"); return read("standard-change.yml"); },
    async getLabels() { this.methods.push("GET"); return strictJson(read("labels.json").toString("utf8"), `${fixtureDirectory}/labels.json`); },
    async searchIssues(marker) { this.methods.push("GET"); return issues().filter((issue) => (issue.body ?? "").includes(marker)); },
    async searchTitle(title) { this.methods.push("GET"); return issues().filter((issue) => issue.title === title); },
    async getIssue(number) { this.methods.push("GET"); const issue = issues().find((item) => item.number === number); if (!issue) throw new ProposalSafetyError("DKBWS-PROP-ISSUE-LINK-001", `Fixture has no issue ${number}.`); return issue; },
    async getRegistry(revision = null) {
      this.methods.push("GET");
      if (revision) return optionalJson("registries.json", {})[revision] ?? null;
      return optionalJson("registry.json");
    },
    async getRelease(tag) { this.methods.push("GET"); return optionalJson("releases.json", {})[tag] ?? null; },
    async resolveRevision(revision) { this.methods.push("GET"); return optionalJson("revisions.json", {})[revision] ?? null; },
    async isDescendant(ancestor, descendant) { this.methods.push("GET"); return optionalJson("ancestry.json", {})[`${ancestor}..${descendant}`] === true; },
    async resolveTag(tag) { this.methods.push("GET"); const file = path.join(fixtureDirectory, "tags.json"); const tags = existsSync(file) ? strictJson(readFileSync(file, "utf8"), file) : {}; if (!tags[tag]) throw new ProposalSafetyError("DKBWS-PROP-RELEASE-001", `Fixture has no tag ${tag}.`); return tags[tag]; },
  };
}

export function createGitHubRemote(repository = TARGET_REPOSITORY, { fetchImpl = globalThis.fetch } = {}) {
  const { owner, repo } = parseRepository(repository);
  const api = `https://api.github.com/repos/${owner}/${repo}`;
  const get = async (url) => {
    const response = await fetchImpl(url, { method: "GET", headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new ProposalSafetyError("DKBWS-PROP-REMOTE-READ-001", `GET ${url} failed with HTTP ${response.status}.`);
    return response;
  };
  const content = async (relativePath, revision = null) => {
    const suffix = revision ? `?ref=${encodeURIComponent(revision)}` : "";
    const response = await get(`${api}/contents/${relativePath.split("/").map(encodeURIComponent).join("/")}${suffix}`);
    const value = await response.json();
    if (value?.encoding !== "base64" || typeof value.content !== "string") throw new ProposalSafetyError("DKBWS-PROP-REMOTE-READ-001", `GitHub content response for ${relativePath} is invalid.`);
    return Buffer.from(value.content.replace(/\s/g, ""), "base64");
  };
  const search = async (query) => {
    const response = await get(`https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo} ${query}`)}&per_page=100`);
    return (await response.json()).items ?? [];
  };
  return {
    async getForm() { return content(".github/ISSUE_TEMPLATE/standard-change.yml"); },
    async getLabels() { const response = await get(`${api}/labels?per_page=100`); return (await response.json()).map((item) => item.name); },
    async searchIssues(marker) { return search(`\"${marker}\" in:body`); },
    async searchTitle(title) { return search(`\"${title}\" in:title`); },
    async getIssue(number) { const response = await get(`${api}/issues/${number}`); return response.json(); },
    async getRegistry(revision = null) {
      try {
        return strictJson((await content(REGISTRY_PATH, revision)).toString("utf8"), `remote ${REGISTRY_PATH}${revision ? `@${revision}` : ""}`);
      } catch (error) {
        if (error.code === "DKBWS-PROP-REMOTE-READ-001") return null;
        throw error;
      }
    },
    async getRelease(tag) {
      const response = await get(`${api}/releases/tags/${encodeURIComponent(tag)}`);
      return response.json();
    },
    async resolveRevision(revision) {
      const response = await get(`${api}/commits/${encodeURIComponent(revision)}`);
      const value = await response.json();
      return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value?.sha ?? "") ? value.sha : null;
    },
    async isDescendant(ancestor, descendant) {
      const response = await get(`${api}/compare/${encodeURIComponent(ancestor)}...${encodeURIComponent(descendant)}`);
      const value = await response.json();
      return value?.status === "ahead";
    },
    async resolveTag(tag) {
      let response = await get(`${api}/git/ref/tags/${encodeURIComponent(tag)}`);
      let object = (await response.json()).object;
      for (let depth = 0; object?.type === "tag" && depth < 4; depth += 1) {
        response = await get(`${api}/git/tags/${object.sha}`);
        object = (await response.json()).object;
      }
      if (object?.type !== "commit" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(object.sha ?? "")) {
        throw new ProposalSafetyError("DKBWS-PROP-RELEASE-001", `Tag ${tag} does not resolve to an immutable commit.`);
      }
      return object.sha;
    },
  };
}

export async function openProposal({ root = process.cwd(), selector, remote, formSource = null } = {}) {
  const { file, record } = findRecord(root, selector);
  const inspected = inspectRecord(record, { root, file, formSource, allRecords: loadRecordEntries(root) });
  const errors = inspected.diagnostics.filter((item) => item.severity === "error");
  if (errors.length) throwDiagnostics("Open refused", errors);
  const rendered = inspected.payload;
  requireCurrentApproval(record, rendered);
  let remoteForm;
  try {
    remoteForm = await remote.getForm();
  } catch (error) {
    const unavailable = new ProposalSafetyError(
      "DKBWS-PROP-FORM-UNPUBLISHED-001",
      `Governed issue form is unavailable on the public default branch; publish ${record.target.issueForm} before submission (${error.message}).`,
    );
    unavailable.details = payloadReview(rendered);
    throw unavailable;
  }
  const remoteFormSha256 = sha256(remoteForm);
  if (remoteFormSha256 !== rendered.formSha256) {
    const mismatch = new ProposalSafetyError("DKBWS-PROP-FORM-UNPUBLISHED-001", `Published default-branch form SHA-256 ${remoteFormSha256} does not match approved form ${rendered.formSha256}.`);
    mismatch.details = payloadReview(rendered);
    throw mismatch;
  }
  let labels;
  try {
    labels = await remote.getLabels();
  } catch (error) {
    const unavailable = new ProposalSafetyError(
      "DKBWS-PROP-LABEL-UNAVAILABLE-001",
      `Required target labels could not be read from the public repository (${error.message}).`,
    );
    unavailable.details = payloadReview(rendered);
    throw unavailable;
  }
  for (const label of record.target.labels) {
    if (!labels.includes(label)) {
      const unavailable = new ProposalSafetyError("DKBWS-PROP-LABEL-UNAVAILABLE-001", `Published target lacks required ${label} label.`);
      unavailable.details = payloadReview(rendered);
      throw unavailable;
    }
  }
  const matches = await remote.searchIssues(record.workflow.payload.marker);
  if (matches.length > 1) throw new ProposalSafetyError("DKBWS-PROP-REMOTE-DUPLICATE-001", `Stable marker matches ${matches.length} open or closed issues.`);
  if (matches.length === 1) {
    return { status: "reconcile-existing", readOnly: true, writesPerformed: false, record, payload: rendered, issue: matches[0], url: null, titleMatches: [] };
  }
  const titleMatches = await remote.searchTitle(rendered.payload.title);
  return {
    status: "ready-for-user-submission",
    readOnly: true,
    writesPerformed: false,
    record,
    payload: rendered,
    issue: null,
    titleMatches,
    url: prefilledFormUrl(record, rendered),
  };
}

function payloadReview(rendered) {
  return {
    repository: rendered.payload.repository,
    title: rendered.payload.title,
    labels: rendered.payload.labels,
    body: rendered.payload.body,
    formSha256: rendered.formSha256,
    sha256: rendered.digest,
  };
}

export async function syncCheck({ root = process.cwd(), remote, formSource = null, resolveProvenance = true } = {}) {
  const local = inspectAll({ root, formSource, resolveProvenance });
  const diagnostics = [...local.diagnostics];
  const remoteRegistry = await remote.getRegistry();
  if (remoteRegistry) diagnostics.push(...registryDiagnostics(remoteRegistry, `remote ${REGISTRY_PATH}`));
  let currentPin = null;
  const manifestFile = path.join(root, ".wiki-standard.yaml");
  if (existsSync(manifestFile)) {
    try {
      currentPin = yamlMapping(readFileSync(manifestFile, "utf8"), ".wiki-standard.yaml")?.standard?.revision ?? null;
    } catch (error) {
      diagnostics.push(diagnostic("DKBWS-PROP-PIN-001", "error", error.message, { file: ".wiki-standard.yaml" }));
    }
  }
  for (const result of local.records) {
    const { record, payload } = result;
    if (payload && record.workflow.payload.status === "prepared") {
      try {
        const remoteForm = await remote.getForm();
        if (sha256(remoteForm) !== payload.formSha256) diagnostics.push(diagnostic("DKBWS-PROP-FORM-UNPUBLISHED-001", "error", `Published form does not match ${record.id}'s prepared form.`));
      } catch (error) {
        diagnostics.push(diagnostic("DKBWS-PROP-FORM-UNPUBLISHED-001", "error", `Published form cannot be read for ${record.id}: ${error.message}`));
      }
      const matches = await remote.searchIssues(record.workflow.payload.marker);
      if (matches.length > 1) diagnostics.push(diagnostic("DKBWS-PROP-REMOTE-DUPLICATE-001", "error", `${record.id} marker matches ${matches.length} issues.`));
      else if (matches.length === 1 && record.workflow.issue.status !== "linked") diagnostics.push(diagnostic("DKBWS-PROP-ISSUE-UNLINKED-001", "warning", `${record.id} has one marker match and can be linked to ${matches[0].html_url}.`));
      else if (matches.length === 0 && record.workflow.issue.status === "linked") diagnostics.push(diagnostic("DKBWS-PROP-ISSUE-MARKER-001", "error", `${record.id} linked issue marker could not be reconciled.`));
      else if (matches.length === 1 && record.workflow.issue.status === "linked") {
        const match = matches[0];
        const exactIdentity = match.html_url === record.workflow.issue.url && match.number === record.workflow.issue.number;
        const exactDigest = countOccurrences(match.body ?? "", record.workflow.payload.marker) === 1
          && payloadDigest(issuePayload(match, record.target.repository)) === payload.digest;
        if (!exactIdentity || !exactDigest) {
          diagnostics.push(diagnostic("DKBWS-PROP-ISSUE-PAYLOAD-001", "error", `${record.id} marker match is not the exact recorded issue and approved payload.`));
        }
      }
    }
    const registryEntry = remoteRegistry?.entries?.find((entry) => entry.id === record.id);
    if (record.workflow.release.status === "included") {
      try {
        await verifiedReleaseEvidence({
          remote,
          tag: record.workflow.release.tag,
          revision: record.workflow.release.revision,
          registryRevision: record.workflow.release.registryRevision,
          proposalId: record.id,
          requirements: record.workflow.acceptance.requirementIds,
        });
      } catch (error) {
        diagnostics.push(diagnostic(error.code ?? "DKBWS-PROP-RELEASE-001", "error", error.message));
      }
    }
    if (record.workflow.upstream.decision === "accepted") {
      if (!registryEntry) {
        diagnostics.push(diagnostic("DKBWS-PROP-REGISTRY-MAPPING-001", "error", `${record.id} is locally accepted but absent from the published registry.`));
      } else if (registryEntry.decision !== "accepted"
        || JSON.stringify(registryEntry.acceptedRequirements) !== JSON.stringify(record.workflow.acceptance.requirementIds)) {
        diagnostics.push(diagnostic("DKBWS-PROP-REGISTRY-MAPPING-001", "error", `${record.id} published decision or accepted-requirement mapping differs from the tracked record.`));
      }
    } else if (registryEntry && registryEntry.decision !== record.workflow.upstream.decision) {
      diagnostics.push(diagnostic("DKBWS-PROP-UPSTREAM-DRIFT-001", "warning", `${record.id} local decision ${record.workflow.upstream.decision} differs from registry decision ${registryEntry.decision}.`));
    }
    if (record.workflow.release.status === "included"
      && (!registryEntry || registryEntry.release?.status !== "included"
        || registryEntry.release.tag !== record.workflow.release.tag
        || registryEntry.release.revision !== record.workflow.release.revision)) {
      diagnostics.push(diagnostic("DKBWS-PROP-REGISTRY-MAPPING-001", "error", `${record.id} tracked release is not mapped to the exact published registry release.`));
    }
    if (registryEntry?.release?.status === "included") {
      let resolved = null;
      let release = null;
      try {
        release = await remote.getRelease(registryEntry.release.tag);
        if (!release || release.tag_name !== registryEntry.release.tag || release.draft !== false || release.immutable !== true) {
          diagnostics.push(diagnostic(
            "DKBWS-PROP-RELEASE-IMMUTABLE-001",
            "error",
            `${registryEntry.release.tag} does not have a matching non-draft immutable public GitHub release.`,
          ));
        }
        resolved = await remote.resolveTag(registryEntry.release.tag);
      } catch (error) {
        diagnostics.push(diagnostic(
          error.code ?? "DKBWS-PROP-RELEASE-IMMUTABLE-001",
          "error",
          `Could not verify public release ${registryEntry.release.tag}: ${error.message}`,
        ));
      }
      if (resolved && resolved !== registryEntry.release.revision) diagnostics.push(diagnostic("DKBWS-PROP-RELEASE-001", "error", `${registryEntry.release.tag} resolves to ${resolved}, not registry revision ${registryEntry.release.revision}.`));
      if (currentPin !== registryEntry.release.revision) diagnostics.push(diagnostic("DKBWS-PROP-RELEASE-AVAILABLE-001", "info", `${record.id} is available in ${registryEntry.release.tag}; consumer pin remains unchanged at ${currentPin ?? "unresolved"}.`));
    }
  }
  const sorted = sortDiagnostics(diagnostics);
  return {
    mode: "check",
    readOnly: true,
    writesPerformed: false,
    status: sorted.some((item) => item.severity === "error") ? "invalid" : sorted.some((item) => item.severity === "warning") ? "drift" : "current",
    records: local.records.length,
    diagnostics: sorted,
  };
}

function prefilledFormUrl(record, rendered) {
  const values = rendered.formValues;
  const url = new URL(`${record.target.repository}/issues/new`);
  url.searchParams.set("template", path.basename(record.target.issueForm));
  url.searchParams.set("title", rendered.payload.title);
  for (const field of rendered.form.body.filter((entry) => entry?.type !== "markdown" && entry?.type !== "checkboxes")) {
    if (Object.hasOwn(values, field.id)) url.searchParams.set(field.id, values[field.id]);
  }
  return url.toString();
}

function issuePayload(issue, repository) {
  return {
    repository,
    title: issue.title,
    labels: (issue.labels ?? []).map((label) => typeof label === "string" ? label : label.name).sort(CODEPOINT_SORT),
    body: issue.body,
  };
}

function requireCurrentApproval(record, rendered) {
  if (record.workflow.approval.status !== "approved"
    || record.workflow.approval.digest !== rendered.digest
    || record.workflow.approval.formSha256 !== rendered.formSha256) {
    throw new ProposalSafetyError("DKBWS-PROP-APPROVAL-STALE-001", "Operation requires explicit approval for the exact current payload and form.");
  }
}

function parseIssueUrl(value) {
  const match = value?.match(/^https:\/\/github\.com\/denchco\/knowledge-base-wiki-standard\/issues\/([1-9][0-9]*)$/);
  if (!match) throw new ProposalUsageError("Issue URL must identify this Standard repository exactly.");
  return { number: Number(match[1]) };
}

function parseRepository(repository) {
  const match = repository.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (!match) throw new ProposalUsageError("Target repository must be a canonical GitHub HTTPS URL.");
  return { owner: match[1], repo: match[2] };
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort(CODEPOINT_SORT);
}

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}

function sortDiagnostics(values) {
  return [...values].sort((left, right) => (
    CODEPOINT_SORT(left.file ?? "", right.file ?? "")
    || CODEPOINT_SORT(left.code, right.code)
    || CODEPOINT_SORT(left.field ?? "", right.field ?? "")
    || CODEPOINT_SORT(left.message, right.message)
  ));
}

function portableRelative(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function iso(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new ProposalUsageError("Timestamp is invalid.");
  return parsed.toISOString();
}

function atomicWrite(file, source) {
  mkdirSync(path.dirname(file), { recursive: true });
  if (existsSync(file) && lstatSync(file).isSymbolicLink()) throw new ProposalSafetyError("DKBWS-PROP-PATH-001", `Refusing to replace symlink ${file}.`);
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.tmp-${process.pid}`);
  writeFileSync(temporary, source, "utf8");
  renameSync(temporary, file);
}

function writeRecordIfChanged(file, record) {
  const desired = stableJson(record);
  if (readFileSync(file, "utf8") !== desired) atomicWrite(file, desired);
}

function assertIgnoredOutput(root, file) {
  const relative = portableRelative(root, file);
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", relative], { cwd: root, stdio: "ignore" });
  } catch {
    throw new ProposalSafetyError("DKBWS-PROP-OUTPUT-TRACKED-001", `${relative} must be ignored before prepare writes a disposable payload.`);
  }
}

function throwDiagnostics(prefix, diagnostics) {
  const error = new ProposalSafetyError(diagnostics[0]?.code ?? "DKBWS-PROP-CHECK-001", `${prefix}:\n${diagnostics.map((item) => `- ${item.code}: ${item.message}`).join("\n")}`);
  error.diagnostics = diagnostics;
  throw error;
}

function gitRoot(root) {
  const requested = realpathSync(path.resolve(root));
  const discovered = realpathSync(git(requested, ["rev-parse", "--show-toplevel"]));
  if (requested !== discovered) throw new ProposalSafetyError("DKBWS-PROP-GIT-STATE-001", "Proposal root must be the Git repository root.");
  return requested;
}

function git(root, args) {
  try {
    const output = execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    return output.replace(/\r?\n$/, "");
  } catch (error) {
    throw new ProposalSafetyError("DKBWS-PROP-GIT-STATE-001", `git ${args.join(" ")} failed: ${String(error.stderr ?? error.message).trim()}`);
  }
}

function resolveCommit(root, revision) {
  const commit = git(root, ["rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`]);
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(commit)) throw new ProposalSafetyError("DKBWS-PROP-GIT-COMMIT-001", `${revision} did not resolve to a full commit ID.`);
  return commit;
}

function projectName(root) {
  const file = path.join(root, "package.json");
  if (existsSync(file)) {
    try {
      const name = strictJson(readFileSync(file, "utf8"), "package.json").name;
      if (typeof name === "string" && name.length) return name;
    } catch {
      // A project can use another package format; the repository basename is stable enough for the scaffold.
    }
  }
  return path.basename(root);
}

function jjChangeFor(root, commit) {
  try {
    const jjRoot = realpathSync(execFileSync("jj", ["root"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
    if (jjRoot !== realpathSync(root)) return null;
    const value = execFileSync("jj", ["log", "-r", commit, "--no-graph", "-T", "change_id"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^[a-z0-9]{16,64}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}
