import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";

import { parseDocument } from "yaml";

import {
  CliUsageError,
  inspectProject,
  publicReport,
  standardRoot,
} from "./okf-core.mjs";
import {
  loadProfile,
  loadRequirementCatalogue,
  ProfileLoadError,
} from "./profile-catalogue.mjs";

const LIFECYCLE_SCHEMA = "https://denchco.github.io/knowledge-base-wiki-standard/schema/lifecycle-plan-v1.json";
const LIFECYCLE_VERSION = "1.0";
const STANDARD_ROOT = standardRoot();
const REQUIRED_PRODUCTION_ROLES = {
  okf_bundle: "knowledge",
  source_register: "docs/sources.md",
  evidence_matrix: "docs/evidence-matrix.md",
  validation_queue: "docs/validation-queue.md",
  research_log: "docs/log.md",
  human_wiki: "docs/index.md",
  llm_wiki: "docs/llm-wiki/index.md",
  design_contract: "DESIGN.md",
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readYaml(filePath) {
  const source = readFileSync(filePath, "utf8");
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length) {
    throw new Error(`Cannot parse canonical YAML ${filePath}: ${document.errors.map((error) => error.message).join("; ")}`);
  }
  const data = document.toJS({ maxAliasCount: 100 });
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Canonical YAML ${filePath} must contain a mapping.`);
  }
  return { source, data, sha256: sha256(source) };
}

function candidateState(profileId) {
  const manifestPath = path.join(STANDARD_ROOT, ".wiki-standard.yaml");
  const manifest = readYaml(manifestPath);
  let requirements;
  let profile;
  try {
    requirements = loadRequirementCatalogue({ standardRoot: STANDARD_ROOT });
    profile = loadProfile(profileId ?? manifest.data.profile, {
      standardRoot: STANDARD_ROOT,
      requirementIds: requirements.ids,
    });
  } catch (error) {
    if (error instanceof ProfileLoadError) {
      throw new CliUsageError(`${error.code}: ${error.message}`);
    }
    throw error;
  }
  return {
    standard: manifest.data.standard,
    okfVersion: manifest.data.okf_version,
    manifest: {
      path: ".wiki-standard.yaml",
      sha256: manifest.sha256,
    },
    requirements,
    profile,
  };
}

function parseVersion(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

function versionRelation(consumerVersion, candidateVersion) {
  if (consumerVersion === candidateVersion) return "same";
  const consumer = parseVersion(consumerVersion);
  const candidate = parseVersion(candidateVersion);
  if (!consumer || !candidate) return "unknown";
  for (const key of ["major", "minor", "patch"]) {
    if (candidate[key] > consumer[key]) return "candidate-newer";
    if (candidate[key] < consumer[key]) return "consumer-newer";
  }
  if (candidate.prerelease === consumer.prerelease) return "same";
  if (consumer.prerelease && !candidate.prerelease) return "candidate-newer";
  if (!consumer.prerelease && candidate.prerelease) return "consumer-newer";
  return candidate.prerelease.localeCompare(consumer.prerelease) > 0 ? "candidate-newer" : "consumer-newer";
}

function diffChange(id, kind, targetPath, current, proposed, reason, options = {}) {
  return {
    id,
    kind,
    path: targetPath,
    current: current ?? null,
    proposed: proposed ?? null,
    reason,
    automatic: options.automatic === true,
    blocking: options.blocking === true,
    requirement: options.requirement,
  };
}

function manifestSha(report) {
  if (!report.manifest.present) return null;
  const filePath = path.join(report.target, report.manifest.path);
  try {
    return sha256(readFileSync(filePath));
  } catch {
    return null;
  }
}

function deviationIndex(manifest) {
  return new Map((manifest?.deviations ?? [])
    .filter((item) => item && typeof item.requirement === "string")
    .map((item) => [item.requirement, item]));
}

function selectedRoleBaseline(profile) {
  const requirements = new Set(profile.requirements);
  const roles = { okf_bundle: "knowledge" };
  if (requirements.has("DKBWS-EVID-001")) roles.source_register = REQUIRED_PRODUCTION_ROLES.source_register;
  if (requirements.has("DKBWS-EVID-002")) {
    roles.evidence_matrix = REQUIRED_PRODUCTION_ROLES.evidence_matrix;
    roles.validation_queue = REQUIRED_PRODUCTION_ROLES.validation_queue;
    roles.research_log = REQUIRED_PRODUCTION_ROLES.research_log;
  }
  if (requirements.has("DKBWS-HUMAN-001")) roles.human_wiki = REQUIRED_PRODUCTION_ROLES.human_wiki;
  if (requirements.has("DKBWS-LLM-001")) roles.llm_wiki = REQUIRED_PRODUCTION_ROLES.llm_wiki;
  if (requirements.has("DKBWS-DESIGN-001")) roles.design_contract = REQUIRED_PRODUCTION_ROLES.design_contract;
  return roles;
}

export function lifecycleDiff(options = {}) {
  const inspection = inspectProject({ ...options, command: "inspect" });
  const consumer = inspection.manifest.data;
  const selectedProfile = options.profile ?? consumer?.profile ?? "standard-production";
  const candidate = candidateState(selectedProfile);
  const changes = [];

  if (!inspection.manifest.present || !consumer) {
    changes.push(diffChange(
      "manifest-create",
      "create",
      "/",
      null,
      ".wiki-standard.yaml",
      "A DenchCo lifecycle comparison requires a consumer manifest.",
      { blocking: true },
    ));
  } else {
    if (consumer.standard?.name !== candidate.standard.name) {
      changes.push(diffChange(
        "standard-name-review",
        "manual",
        "/standard/name",
        consumer.standard?.name,
        candidate.standard.name,
        "The consumer declares a different standard identity; automatic conversion would be unsafe.",
        { blocking: true, requirement: "DKBWS-CORE-002" },
      ));
    }
    const relation = versionRelation(consumer.standard?.version, candidate.standard.version);
    if (relation === "candidate-newer" && consumer.standard?.name === candidate.standard.name) {
      changes.push(diffChange(
        "standard-version-update",
        "replace",
        "/standard/version",
        consumer.standard?.version,
        candidate.standard.version,
        "The selected candidate is newer than the consumer declaration.",
        { automatic: true, requirement: "DKBWS-UPDATE-001" },
      ));
    } else if (relation === "consumer-newer") {
      changes.push(diffChange(
        "standard-version-newer-consumer",
        "manual",
        "/standard/version",
        consumer.standard?.version,
        candidate.standard.version,
        "The consumer is newer than this candidate; the planner will not propose a downgrade.",
        { blocking: true, requirement: "DKBWS-UPDATE-001" },
      ));
    } else if (relation === "unknown") {
      changes.push(diffChange(
        "standard-version-unparseable",
        "manual",
        "/standard/version",
        consumer.standard?.version,
        candidate.standard.version,
        "The version relationship cannot be established safely.",
        { blocking: true, requirement: "DKBWS-UPDATE-001" },
      ));
    }

    if (consumer.okf_version !== candidate.okfVersion) {
      changes.push(diffChange(
        "okf-version-review",
        "manual",
        "/okf_version",
        consumer.okf_version,
        candidate.okfVersion,
        "Changing the OKF target may require concept migration; it is never silently patched.",
        { blocking: true, requirement: "DKBWS-OKF-001" },
      ));
    }

    if (consumer.profile !== selectedProfile) {
      changes.push(diffChange(
        "profile-selection-review",
        "manual",
        "/profile",
        consumer.profile,
        selectedProfile,
        "Profile changes alter the conformance promise and require explicit authorization.",
        { blocking: true },
      ));
    }

    for (const [role, suggestedPath] of Object.entries(selectedRoleBaseline(candidate.profile))) {
      if (!(role in (consumer.roles ?? {}))) {
        changes.push(diffChange(
          `missing-role-${role}`,
          "manual",
          `/roles/${role}`,
          null,
          suggestedPath,
          `The selected profile needs an explicit ${role} role mapping; the path must be confirmed against the consumer repository.`,
          { blocking: role === "okf_bundle", requirement: role === "okf_bundle" ? "DKBWS-OKF-003" : undefined },
        ));
      }
    }

    for (const [capability, expected] of Object.entries(candidate.profile.capabilities)) {
      if (!(capability in (consumer.capabilities ?? {}))) {
        changes.push(diffChange(
          `missing-capability-${capability}`,
          "manual",
          `/capabilities/${capability}`,
          null,
          expected,
          "The profile declares this capability; implementation and verification must precede a manifest claim.",
          { blocking: false },
        ));
      }
    }

    for (const deviation of consumer.deviations ?? []) {
      if (!candidate.requirements.ids.has(deviation.requirement)) {
        changes.push(diffChange(
          `unknown-deviation-${deviation.requirement}`,
          "manual",
          "/deviations",
          deviation.requirement,
          null,
          "The deviation references an ID absent from the candidate requirement catalogue; retain it until a maintainer resolves the migration.",
          { blocking: true },
        ));
      }
      if (typeof deviation.expires === "string" && options.evaluationDate && deviation.expires <= options.evaluationDate) {
        changes.push(diffChange(
          `expired-deviation-${deviation.requirement}`,
          "manual",
          "/deviations",
          deviation.expires,
          null,
          "The deviation has reached its review date and must not be renewed automatically.",
          { blocking: false, requirement: deviation.requirement },
        ));
      }
    }
  }

  const deviations = deviationIndex(consumer);
  const inspectionResults = new Map(inspection.requirementResults.map((item) => [item.requirement, item]));
  const requirements = candidate.profile.requirements.map((id) => {
    const result = inspectionResults.get(id);
    const deviation = deviations.get(id);
    return {
      id,
      known: candidate.requirements.ids.has(id),
      validationStatus: result?.status ?? "not-checked",
      deviation: deviation ? {
        status: deviation.status,
        reason: deviation.reason,
        authority: deviation.authority ?? null,
        expires: deviation.expires ?? null,
        reviewedAt: deviation.reviewed_at ?? null,
      } : null,
    };
  });
  for (const requirement of requirements) {
    if (!requirement.known) {
      changes.push(diffChange(
        `profile-requirement-unknown-${requirement.id}`,
        "manual",
        "/profile",
        requirement.id,
        null,
        "The selected profile references an ID absent from the candidate catalogue.",
        { blocking: true },
      ));
    }
  }

  const versionState = consumer
    ? versionRelation(consumer.standard?.version, candidate.standard.version)
    : "manifest-missing";
  const blocking = changes.filter((change) => change.blocking).length
    + inspection.summary.errors;
  const automatic = changes.filter((change) => change.automatic).length;
  return {
    $schema: LIFECYCLE_SCHEMA,
    planVersion: LIFECYCLE_VERSION,
    kind: "lifecycle-diff",
    readOnly: true,
    writesPerformed: false,
    target: inspection.target,
    evaluationDate: inspection.evaluationDate,
    candidate: {
      standard: candidate.standard,
      okfVersion: candidate.okfVersion,
      profile: candidate.profile,
      manifest: candidate.manifest,
      requirementCatalogue: {
        path: candidate.requirements.path,
        sha256: candidate.requirements.sha256,
        count: candidate.requirements.rows.length,
      },
    },
    consumer: {
      manifestPresent: inspection.manifest.present,
      manifestPath: inspection.manifest.path,
      manifestSha256: manifestSha(inspection),
      standard: consumer?.standard ?? null,
      okfVersion: consumer?.okf_version ?? null,
      profile: consumer?.profile ?? null,
    },
    requirements,
    changes,
    inspection: publicReport(inspection),
    summary: {
      versionState,
      changes: changes.length,
      automatic,
      manual: changes.length - automatic,
      blocking,
      safeToPlanUpgrade: Boolean(consumer) && blocking === 0,
    },
  };
}

export function upgradePlan(options = {}) {
  if (options.dryRun !== true) {
    throw new CliUsageError("`upgrade` is planning-only in this candidate and requires --dry-run.");
  }
  const diff = lifecycleDiff(options);
  const operations = [];
  for (const change of diff.changes.filter((item) => item.automatic)) {
    operations.push({
      op: "test",
      path: change.path,
      value: change.current,
      reason: "Abort if the consumer changed after this plan was generated.",
    });
    operations.push({
      op: change.kind,
      path: change.path,
      value: change.proposed,
      reason: change.reason,
    });
  }
  return {
    $schema: LIFECYCLE_SCHEMA,
    planVersion: LIFECYCLE_VERSION,
    kind: "upgrade-plan",
    dryRun: true,
    readOnly: true,
    writesPerformed: false,
    applySupported: false,
    target: diff.target,
    candidate: diff.candidate,
    consumer: diff.consumer,
    patchPlan: {
      format: "json-patch-review-plan",
      target: diff.consumer.manifestPath,
      preconditions: [
        {
          kind: "sha256",
          path: diff.consumer.manifestPath,
          expected: diff.consumer.manifestSha256,
        },
        {
          kind: "clean-review-boundary",
          description: "Record Git/Jujutsu state and review local changes before applying any future patch.",
        },
      ],
      operations,
      preserved: [
        "/roles",
        "/capabilities",
        "/deviations",
        "unknown OKF concept fields",
        "all canonical Markdown bytes",
      ],
    },
    manualActions: diff.changes.filter((item) => !item.automatic),
    verificationPlan: [
      "Review every operation and manual action.",
      "Apply changes only in a separate explicitly authorized workflow.",
      "Run conformance:validate and the selected profile's complete verification command.",
      "Inspect Git and Jujutsu diffs before committing.",
    ],
    summary: {
      operations: operations.length,
      manualActions: diff.changes.length - diff.summary.automatic,
      blocking: diff.summary.blocking,
      readyForHumanReview: diff.consumer.manifestPresent && diff.summary.blocking === 0,
    },
    sourceDiff: diff,
  };
}

function targetInventory(target) {
  const absolute = path.resolve(target);
  if (!existsSync(absolute)) return { exists: false, type: "absent", entries: [] };
  const stat = lstatSync(absolute);
  if (!stat.isDirectory()) return { exists: true, type: "file", entries: [] };
  return {
    exists: true,
    type: "directory",
    entries: readdirSync(absolute).sort(),
  };
}

function plannedLayout(profile) {
  const selectedRequirements = new Set(profile.requirements);
  const catalogue = [
    [".wiki-standard.yaml", "manifest", ["DKBWS-CORE-002"]],
    ["AGENTS.md", "agent-contract", ["DKBWS-PROMPT-001"]],
    ["DEPENDENCIES.md", "dependency-contract", ["DKBWS-VERIFY-001"]],
    ["SECURITY.md", "security-policy", ["DKBWS-SEC-001"]],
    ["SOURCE_POLICY.md", "source-policy", ["DKBWS-SEC-001"]],
    ["knowledge/index.md", "okf-index", ["DKBWS-OKF-001", "DKBWS-OKF-003"]],
    ["knowledge/log.md", "okf-log", ["DKBWS-OKF-001"]],
    ["knowledge/concepts/", "okf-concepts", ["DKBWS-OKF-001"]],
    ["docs/sources.md", "source-register", ["DKBWS-EVID-001"]],
    ["docs/evidence-matrix.md", "evidence-matrix", ["DKBWS-EVID-002"]],
    ["docs/validation-queue.md", "validation-queue", ["DKBWS-EVID-002"]],
    ["docs/log.md", "research-log", ["DKBWS-EVID-002"]],
    ["docs/index.md", "human-wiki", ["DKBWS-HUMAN-001"]],
    ["docs/llm-wiki/index.md", "llm-wiki", ["DKBWS-LLM-001"]],
    ["docs/llm-wiki/context-map.md", "llm-context-map", ["DKBWS-LLM-001"]],
    ["docs/llm-wiki/maintenance.md", "llm-maintenance", ["DKBWS-LLM-001"]],
    ["DESIGN.md", "design-contract", ["DKBWS-DESIGN-001"]],
    ["zensical.toml", "renderer-config", ["DKBWS-RENDER-001"]],
    ["docs/assets/", "local-runtime-assets", ["DKBWS-RENDER-001"]],
    ["docs/graph/index.md", "graph-entry", ["DKBWS-GRAPH-001"]],
    ["docs/graph/two-dimensional.md", "graph-2d", ["DKBWS-GRAPH-001"]],
    ["docs/graph/three-dimensional.md", "graph-3d", ["DKBWS-GRAPH-001"]],
    ["package.json", "node-build-contract", ["DKBWS-VERIFY-001"]],
    ["package-lock.json", "node-lock", ["DKBWS-VERIFY-001"]],
    ["pyproject.toml", "python-build-contract", ["DKBWS-VERIFY-001"]],
    ["uv.lock", "python-lock", ["DKBWS-VERIFY-001"]],
    [".github/workflows/verify.yml", "ci-verification", ["DKBWS-VERIFY-001"]],
  ];
  const always = new Set(["manifest", "agent-contract", "dependency-contract", "security-policy", "source-policy", "okf-index", "okf-log", "okf-concepts"]);
  return catalogue.filter(([, role, requirements]) => (
    always.has(role) || requirements.some((requirement) => selectedRequirements.has(requirement))
  ));
}

function proposedManifest(candidate, profile) {
  const roles = selectedRoleBaseline(profile);
  const capabilities = Object.fromEntries(Object.entries(profile.capabilities).map(([key, value]) => [
    key,
    value === "required" ? true : value,
  ]));
  return {
    schema: "https://denchco.github.io/knowledge-base-wiki-standard/schema/manifest-v1.json",
    standard: {
      name: candidate.standard.name,
      version: candidate.standard.version,
      source: candidate.standard.source,
    },
    profile: profile.id,
    okf_version: candidate.okfVersion,
    roles,
    capabilities,
    deviations: [],
  };
}

export function initPlan(options = {}) {
  if (options.dryRun !== true) {
    throw new CliUsageError("`init` is planning-only in this candidate and requires --dry-run.");
  }
  const target = path.resolve(options.target ?? ".");
  const profileId = options.profile ?? "standard-production";
  const candidate = candidateState(profileId);
  const inventory = targetInventory(target);
  if (inventory.type === "file") throw new CliUsageError("`init --dry-run` target must be a directory path or an absent path.");
  const promptPath = path.join(STANDARD_ROOT, "prompts/instantiate-wiki.md");
  const promptSource = readFileSync(promptPath, "utf8");
  const layout = plannedLayout(candidate.profile).map(([relativePath, role, requirements]) => {
    const normalized = relativePath.replace(/\/$/, "");
    const collision = inventory.exists && existsSync(path.join(target, normalized));
    return {
      path: relativePath,
      role,
      requirements,
      action: collision ? "preserve-and-review" : "propose-create",
      collision,
    };
  });
  const unresolvedInputs = [];
  if (!options.topic) unresolvedInputs.push("topic, audience, governing question, and intended outcome");
  if (!options.title) unresolvedInputs.push("project title");
  const selectedRequirements = new Set(candidate.profile.requirements);
  const stages = [
    { id: "inspect", purpose: "Read target instructions, repository state, canonical roles, and existing evidence before proposing edits.", always: true },
    { id: "authority", purpose: "Define raw-source, canonical-evidence, generated-output, privacy, copyright, and retention boundaries.", requirements: ["DKBWS-SEC-001"] },
    { id: "okf", purpose: "Establish the first-class OKF v0.2 bundle, stable concepts, source identities, and newest-first logs.", requirements: ["DKBWS-OKF-001", "DKBWS-OKF-003"] },
    { id: "human-llm", purpose: "Build coordinated Human and LLM Wiki surfaces over shared canonical knowledge.", requirements: ["DKBWS-HUMAN-001", "DKBWS-LLM-001"] },
    { id: "renderer-design", purpose: "Apply the selected renderer and design-governance contracts.", requirements: ["DKBWS-RENDER-001", "DKBWS-DESIGN-001"] },
    { id: "graph-runtime", purpose: "Add Graphify publication, local runtimes, and stable service adapters required by the profile.", requirements: ["DKBWS-GRAPH-001", "DKBWS-RUNTIME-001"] },
    { id: "verification", purpose: "Run every selected deterministic and manual check without overstating proof.", always: true },
    { id: "provenance", purpose: "Record reviewable Git history and colocated Jujutsu phases after validation.", requirements: ["DKBWS-PROV-001"] },
  ].filter((stage) => stage.always || stage.requirements.some((requirement) => selectedRequirements.has(requirement)))
    .map(({ always, requirements, ...stage }) => stage);
  return {
    $schema: LIFECYCLE_SCHEMA,
    planVersion: LIFECYCLE_VERSION,
    kind: "init-plan",
    dryRun: true,
    readOnly: true,
    writesPerformed: false,
    applySupported: false,
    target,
    targetState: inventory,
    input: {
      title: options.title ?? null,
      topic: options.topic ?? null,
      profile: profileId,
    },
    candidate: {
      standard: candidate.standard,
      okfVersion: candidate.okfVersion,
      profile: candidate.profile,
      prompt: {
        path: "prompts/instantiate-wiki.md",
        sha256: sha256(promptSource),
      },
      requirementCatalogue: {
        path: candidate.requirements.path,
        sha256: candidate.requirements.sha256,
        count: candidate.requirements.rows.length,
      },
    },
    proposedManifest: proposedManifest(candidate, candidate.profile),
    layout,
    stages,
    unresolvedInputs,
    clarificationProtocol: {
      sequential: true,
      format: "Question 1 of N",
      rule: "Ask only the first material question; each answer determines the next question and revises N.",
      nextQuestion: unresolvedInputs.length
        ? `Question 1 of ${unresolvedInputs.length}: Confirm ${unresolvedInputs[0]}.`
        : null,
    },
    safety: {
      collisions: layout.filter((entry) => entry.collision).map((entry) => entry.path),
      policy: "Preserve existing files and stronger verified patterns; no file is created, replaced, or merged by this plan.",
      externalActions: "No GitHub, deployment, service, Git, or Jujutsu mutation is authorized by init planning.",
    },
    summary: {
      proposedPaths: layout.length,
      collisions: layout.filter((entry) => entry.collision).length,
      unresolvedInputs: unresolvedInputs.length,
      readyForImplementationReview: unresolvedInputs.length === 0,
    },
  };
}

export function lifecycleText(value) {
  if (value.kind === "lifecycle-diff") {
    const lines = [
      `Lifecycle diff: ${value.consumer.standard?.version ?? "no manifest"} → ${value.candidate.standard.version}`,
      `Target: ${value.target}`,
      `Result: ${value.summary.changes} changes · ${value.summary.automatic} plan-safe · ${value.summary.blocking} blocking`,
    ];
    for (const change of value.changes) {
      lines.push(`${change.blocking ? "BLOCK" : change.automatic ? "PLAN" : "REVIEW"} ${change.id} ${change.path} — ${change.reason}`);
    }
    return lines.join("\n");
  }
  if (value.kind === "upgrade-plan") {
    return [
      `Upgrade dry-run: ${value.consumer.standard?.version ?? "unknown"} → ${value.candidate.standard.version}`,
      `Target: ${value.target}`,
      `Writes performed: ${value.writesPerformed}`,
      `Patch operations: ${value.summary.operations} · manual actions: ${value.summary.manualActions} · blocking: ${value.summary.blocking}`,
      "No apply command exists in this candidate; review the JSON patch plan before any separate implementation.",
    ].join("\n");
  }
  return [
    `Init dry-run: ${value.input.title ?? "untitled"} · profile ${value.input.profile}`,
    `Target: ${value.target} (${value.targetState.type})`,
    `Writes performed: ${value.writesPerformed}`,
    `Proposed paths: ${value.summary.proposedPaths} · collisions preserved: ${value.summary.collisions} · unresolved inputs: ${value.summary.unresolvedInputs}`,
    value.clarificationProtocol.nextQuestion ?? "No material clarification is currently identified.",
  ].join("\n");
}
