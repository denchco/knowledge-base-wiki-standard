import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { parseDocument } from "yaml";
import Ajv2020 from "ajv/dist/2020.js";

import {
  CliUsageError,
  inspectProject,
  isDateTime,
  publicReport,
  standardRoot,
} from "./okf-core.mjs";
import {
  loadProfile,
  loadRequirementCatalogue,
  ProfileLoadError,
} from "./profile-catalogue.mjs";
import { parseReleaseVersion, STACK_FILES } from "./standard-stack.mjs";

const LIFECYCLE_SCHEMA = "https://denchco.github.io/knowledge-base-wiki-documentation/schema/lifecycle-plan-v1.json";
const LIFECYCLE_VERSION = "1.0";
const STANDARD_ROOT = standardRoot();
const STARTER_PATH = "starter/starter.yaml";
const DEFAULT_ACCENT = "#0b7285";
let validateStackReport;
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

function stripFinalLineEnding(value) {
  return value.endsWith("\r\n")
    ? value.slice(0, -2)
    : value.endsWith("\n")
      ? value.slice(0, -1)
      : value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseYaml(source, label) {
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length) {
    throw new Error(`Cannot parse canonical YAML ${label}: ${document.errors.map((error) => error.message).join("; ")}`);
  }
  const data = document.toJS({ maxAliasCount: 100 });
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Canonical YAML ${label} must contain a mapping.`);
  }
  return { source, data, sha256: sha256(source) };
}

function candidateSelection(options) {
  if (options.standardRevision && options.resolvedStack) {
    throw new CliUsageError("Choose a verified release selection or an explicit --standard-revision, not both.");
  }
  if (options.standardRevision) {
    return {
      mode: "explicit-unverified",
      revision: options.standardRevision,
      releaseTag: parseReleaseVersion(options.standardRevision) ? options.standardRevision : null,
      bootstrapEligible: false,
      currentVulnerabilityClearance: "not-checked",
      evidence: null,
    };
  }
  const report = options.resolvedStack;
  // Compile only when selecting a verified release. Explicit historical plans
  // stay offline and do not depend on the newer release-report schema.
  if (report && !validateStackReport) {
    const schema = JSON.parse(readFileSync(path.join(STANDARD_ROOT, "schema/standard-stack-report-v1.json"), "utf8"));
    validateStackReport = new Ajv2020({ strict: true, strictRequired: false, allErrors: true }).compile(schema);
  }
  const reject = () => {
    throw new CliUsageError("Default lifecycle planning requires a resolved latest verified immutable Standard release with complete dated schema-valid evidence and matching release and verification identities. Use the CLI's live resolver, or supply --standard-revision for an explicit unverified historical/development dry-run; checkout HEAD is never a default.");
  };
  if (!report || !validateStackReport(report)) reject();
  const stack = report?.stack;
  const release = stack?.release;
  const qualification = stack?.qualification;
  if (report.operation !== "resolve" || !parseReleaseVersion(stack.tag)
    || release.tag !== stack.tag || release.url !== `${report.source}/releases/tag/${stack.tag}`
    || qualification.headSha !== stack.revision || qualification.url !== `${report.source}/actions/runs/${qualification.runId}`
    || ![report.observedAt, release.publishedAt, qualification.updatedAt].every(isDateTime)
    || Date.parse(release.publishedAt) > Date.parse(report.observedAt)
    || Date.parse(qualification.updatedAt) > Date.parse(report.observedAt)
    || !STACK_FILES.every(file => stack.files.some(item => item.path === file))) reject();
  return {
    mode: "latest-verified-immutable", revision: stack.revision, releaseTag: stack.tag,
    bootstrapEligible: true, currentVulnerabilityClearance: "not-checked", evidence: report,
  };
}

function candidateState(profileId, options = {}) {
  const selection = candidateSelection(options);
  const revision = selection.revision;
  const commit = resolveStandardRevision(revision);
  if (!commit) {
    throw new CliUsageError(`Cannot resolve selected Standard revision ${JSON.stringify(revision)} locally. Fetch that exact immutable revision before planning; no checkout HEAD fallback is permitted.`);
  }
  selection.revision = commit;
  const readSource = (relativePath) => gitSource(commit, relativePath);
  const manifest = parseYaml(readSource(".wiki-standard.yaml"), `${commit}:.wiki-standard.yaml`);
  if (selection.evidence) {
    if (manifest.data.standard?.source !== selection.evidence.source) throw new CliUsageError("Verified release source differs from its committed Standard manifest.");
    const observedPaths = new Set();
    for (const file of selection.evidence.stack.files) {
      if (typeof file.path !== "string" || path.isAbsolute(file.path) || file.path.includes("\\")
        || file.path.split("/").some(segment => !segment || segment === "." || segment === "..") || observedPaths.has(file.path)) {
        throw new CliUsageError("Verified stack evidence contains duplicate or nonportable file paths.");
      }
      observedPaths.add(file.path);
      const bytes = Buffer.from(readSource(file.path));
      if (file.bytes !== bytes.length || file.sha256 !== sha256(bytes)
        || file.gitBlob !== gitText(["rev-parse", `${commit}:${file.path}`])) {
        throw new CliUsageError(`Verified stack evidence differs from selected immutable revision: ${file.path}`);
      }
    }
  }
  let requirements;
  let profile;
  try {
    requirements = loadRequirementCatalogue({ standardRoot: STANDARD_ROOT, readSource });
    profile = loadProfile(profileId ?? manifest.data.profile, {
      standardRoot: STANDARD_ROOT,
      readSource,
      requirementIds: requirements.ids,
    });
  } catch (error) {
    if (error instanceof ProfileLoadError) {
      throw new CliUsageError(`${error.code}: ${error.message}`);
    }
    throw error;
  }
  return {
    standard: {
      ...manifest.data.standard,
      revision: commit,
    },
    selection,
    okfVersion: manifest.data.okf_version,
    manifest: {
      path: ".wiki-standard.yaml",
      sha256: manifest.sha256,
    },
    requirements,
    profile,
  };
}

function gitText(args) {
  return stripFinalLineEnding(execFileSync("git", args, {
    cwd: STANDARD_ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }));
}

function gitSource(commit, relativePath) {
  return execFileSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: STANDARD_ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function resolveStandardRevision(revision) {
  if (typeof revision !== "string" || revision.length === 0) return null;
  try {
    const commit = gitText(["rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`]);
    return /^[0-9a-f]{40,64}$/.test(commit) ? commit : null;
  } catch {
    return null;
  }
}

function revisionIsAncestor(ancestor, descendant) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: STANDARD_ROOT,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    throw error;
  }
}

function revisionState(consumerCommit, candidateCommit) {
  if (consumerCommit === candidateCommit) return "same";
  if (revisionIsAncestor(consumerCommit, candidateCommit)) return "candidate-newer";
  if (revisionIsAncestor(candidateCommit, consumerCommit)) return "consumer-newer";
  return "diverged";
}

function standardStateAtRevision(profileId, revision) {
  const commit = resolveStandardRevision(revision);
  if (!commit) return null;
  const readSource = (relativePath) => gitSource(commit, relativePath);
  try {
    const manifest = parseYaml(readSource(".wiki-standard.yaml"), `${commit}:.wiki-standard.yaml`);
    const requirements = loadRequirementCatalogue({ standardRoot: STANDARD_ROOT, readSource });
    const profile = loadProfile(profileId, {
      standardRoot: STANDARD_ROOT,
      readSource,
      requirementIds: requirements.ids,
    });
    return {
      commit,
      standard: manifest.data.standard,
      okfVersion: manifest.data.okf_version,
      requirements,
      profile,
    };
  } catch {
    return null;
  }
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
  const candidate = candidateState(selectedProfile, options);
  const changes = [];
  const versionState = consumer
    ? versionRelation(consumer.standard?.version, candidate.standard.version)
    : "manifest-missing";
  let comparedRevisionState = consumer ? "not-compared" : "manifest-missing";
  let pinnedState = null;

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
    if (consumer.standard?.source !== candidate.standard.source) {
      changes.push(diffChange(
        "standard-source-review",
        "manual",
        "/standard/source",
        consumer.standard?.source,
        candidate.standard.source,
        "The consumer declares a different Standard source; version and revision ordering cannot establish a safe upgrade across identities.",
        { blocking: true, requirement: "DKBWS-UPDATE-001" },
      ));
    }
    const sameStandardIdentity = consumer.standard?.name === candidate.standard.name
      && consumer.standard?.source === candidate.standard.source;
    if (versionState === "candidate-newer" && sameStandardIdentity) {
      changes.push(diffChange(
        "standard-version-update",
        "replace",
        "/standard/version",
        consumer.standard?.version,
        candidate.standard.version,
        "The selected candidate is newer than the consumer declaration.",
        { automatic: true, requirement: "DKBWS-UPDATE-001" },
      ));
    } else if (versionState === "consumer-newer") {
      changes.push(diffChange(
        "standard-version-newer-consumer",
        "manual",
        "/standard/version",
        consumer.standard?.version,
        candidate.standard.version,
        "The consumer is newer than this candidate; the planner will not propose a downgrade.",
        { blocking: true, requirement: "DKBWS-UPDATE-001" },
      ));
    } else if (versionState === "unknown") {
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

    if (sameStandardIdentity) {
      if (candidate.selection.bootstrapEligible && consumer.capabilities?.standard_release_tag !== candidate.selection.releaseTag) {
        changes.push(diffChange("standard-release-tag-review", "manual", "/capabilities/standard_release_tag",
          consumer.capabilities?.standard_release_tag, candidate.selection.releaseTag,
          "Adoption must record the selected immutable release tag together with its full revision after stack verification and review.",
          { blocking: true, requirement: "DKBWS-UPDATE-001" }));
      }
      const declaredRevision = consumer.standard?.revision;
      if (typeof declaredRevision !== "string" || declaredRevision.length === 0) {
        comparedRevisionState = "missing";
        changes.push(diffChange(
          "standard-revision-missing",
          "manual",
          "/standard/revision",
          null,
          candidate.standard.revision,
          "Version labels alone are insufficient for lifecycle comparison; the consumer must preserve an immutable Standard revision before requirement changes can be assessed.",
          { blocking: true, requirement: "DKBWS-UPDATE-001" },
        ));
      } else {
        pinnedState = standardStateAtRevision(selectedProfile, declaredRevision);
        if (!pinnedState) {
          comparedRevisionState = "unresolved";
          changes.push(diffChange(
            "standard-revision-unresolved",
            "manual",
            "/standard/revision",
            declaredRevision,
            candidate.standard.revision,
            "The consumer's immutable Standard revision or its selected profile cannot be resolved from this checkout; no current or upgrade conclusion is safe.",
            { blocking: true, requirement: "DKBWS-UPDATE-001" },
          ));
        } else {
          comparedRevisionState = revisionState(pinnedState.commit, candidate.standard.revision);
          if (consumer.standard?.version !== pinnedState.standard.version) {
            changes.push(diffChange(
              "standard-version-revision-mismatch",
              "manual",
              "/standard/version",
              consumer.standard?.version,
              pinnedState.standard.version,
              "The declared version does not match the Standard manifest at the pinned immutable revision; correct the identity record before planning an upgrade.",
              { blocking: true, requirement: "DKBWS-UPDATE-001" },
            ));
          }
          if (comparedRevisionState !== "same") {
            const reason = comparedRevisionState === "candidate-newer"
              ? "The candidate commit is newer than the consumer's immutable revision; review requirement and implementation changes independently of the version labels before repinning."
              : comparedRevisionState === "consumer-newer"
                ? "The consumer revision is newer than this candidate; the planner will not propose a downgrade."
                : "The consumer and candidate revisions have diverged; ancestry and migration require maintainer review.";
            changes.push(diffChange(
              "standard-revision-review",
              "manual",
              "/standard/revision",
              declaredRevision,
              candidate.standard.revision,
              reason,
              { blocking: true, requirement: "DKBWS-UPDATE-001" },
            ));
          }

          const pinnedRequirements = new Set(pinnedState.profile.requirements);
          const candidateRequirements = new Set(candidate.profile.requirements);
          for (const requirement of candidate.profile.requirements.filter((id) => !pinnedRequirements.has(id))) {
            changes.push(diffChange(
              `requirement-introduced-${requirement}`,
              "manual",
              "/profile",
              null,
              requirement,
              `The selected profile introduces ${requirement} after the consumer's pinned revision; implementation evidence and migration impact require review before repinning.`,
              { blocking: true, requirement },
            ));
          }
          for (const requirement of pinnedState.profile.requirements.filter((id) => !candidateRequirements.has(id))) {
            changes.push(diffChange(
              `requirement-removed-${requirement}`,
              "manual",
              "/profile",
              requirement,
              null,
              `The consumer's pinned profile includes ${requirement}, which is absent from the candidate profile; preserve deviations and require an explicit migration map.`,
              { blocking: true, requirement: "DKBWS-UPDATE-001" },
            ));
          }
        }
      }
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
  const pinnedRequirementIds = pinnedState ? new Set(pinnedState.profile.requirements) : null;
  const requirements = candidate.profile.requirements.map((id) => {
    const result = inspectionResults.get(id);
    const deviation = deviations.get(id);
    return {
      id,
      known: candidate.requirements.ids.has(id),
      introducedSinceConsumerRevision: pinnedRequirementIds ? !pinnedRequirementIds.has(id) : null,
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
      selection: candidate.selection,
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
      resolvedRevision: pinnedState?.commit ?? null,
      pinnedProfileRequirements: pinnedState?.profile.requirements ?? null,
    },
    requirements,
    changes,
    inspection: publicReport(inspection),
    summary: {
      versionState,
      revisionState: comparedRevisionState,
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

function starterContract(revision) {
  const contract = parseYaml(gitSource(revision, STARTER_PATH), `${revision}:${STARTER_PATH}`);
  if (!Array.isArray(contract.data.entries)) {
    throw new Error(`${STARTER_PATH} must define an entries list.`);
  }
  return contract;
}

function assertPortableAuthoringPath(value) {
  if (typeof value !== "string" || !value.trim() || value.includes("\\") || value.includes("\0")
    || value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value) || /^~(?:\/|$)/.test(value)
    || value.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new CliUsageError("Existing authoring_policy role must be a normalized repository-relative POSIX path; preserve and review the target manifest before initialization planning.");
  }
}

function plannedLayout(profile, starter) {
  const selectedRequirements = new Set(profile.requirements);
  return starter.entries.filter((entry) => (
    entry.always === true
    || (entry.requirements ?? []).some((requirement) => selectedRequirements.has(requirement))
  ));
}

function proposedManifest(candidate, profile, starter, options = {}) {
  const existing = options.existingManifest ?? {};
  const roles = selectedRoleBaseline(profile);
  const authoringEntry = plannedLayout(profile, starter).find((entry) => entry.role === "authoring_policy");
  if (authoringEntry) roles.authoring_policy = options.existingAuthoringPolicy ?? authoringEntry.target;
  const capabilities = Object.fromEntries(Object.entries(profile.capabilities).map(([key, value]) => [
    key,
    value === "required" ? true : value,
  ]));
  if (options.wikiUrl) capabilities.human_wiki_url = options.wikiUrl;
  if (options.deployment) capabilities.deployment = options.deployment === "none" ? false : options.deployment;
  if (candidate.selection.releaseTag) capabilities.standard_release_tag = candidate.selection.releaseTag;
  const proposedCapabilities = {
    ...capabilities, ...existing.capabilities,
    ...(options.wikiUrl ? { human_wiki_url: options.wikiUrl } : {}),
  };
  if (candidate.selection.releaseTag) proposedCapabilities.standard_release_tag = candidate.selection.releaseTag;
  else delete proposedCapabilities.standard_release_tag;
  const revision = candidate.standard.revision;
  return {
    ...existing,
    schema: existing.schema ?? "https://denchco.github.io/knowledge-base-wiki-documentation/schema/manifest-v1.json",
    standard: {
      ...existing.standard,
      name: candidate.standard.name,
      version: candidate.standard.version,
      source: starter.standard_source,
      ...(revision ? { revision } : {}),
    },
    profile: profile.id,
    okf_version: candidate.okfVersion,
    roles: { ...roles, ...existing.roles },
    capabilities: proposedCapabilities,
    deviations: existing.deviations ?? [],
  };
}

export function validateInitOptions(options = {}) {
  if (options.dryRun !== true) {
    throw new CliUsageError("`init` is planning-only in this candidate and requires --dry-run.");
  }
  if (options.blank && options.seed) {
    throw new CliUsageError("`init --dry-run` accepts either --seed or --blank, not both.");
  }
  if (options.accent && !/^#[0-9a-fA-F]{6}$/.test(options.accent)) {
    throw new CliUsageError("`--accent` must be a six-digit hex colour such as #0b7285.");
  }
  const target = path.resolve(options.target ?? ".");
  if (target === STANDARD_ROOT) {
    throw new CliUsageError("`init --dry-run` target must be an independent repository path, not the standard repository root.");
  }
  return target;
}

export function initPlan(options = {}) {
  const target = validateInitOptions(options);
  const targetManifestPath = path.join(target, ".wiki-standard.yaml");
  const existingManifest = existsSync(targetManifestPath)
    ? parseYaml(readFileSync(targetManifestPath, "utf8"), targetManifestPath).data : null;
  const profileId = options.profile ?? existingManifest?.profile ?? "standard-production";
  const candidate = candidateState(profileId, options);
  const standardRevision = candidate.standard.revision;
  const starter = starterContract(candidate.standard.revision);
  if (starter.data.standard_source !== candidate.standard.source) {
    throw new CliUsageError("The selected starter and Standard manifest disagree on their source repository.");
  }
  const inventory = targetInventory(target);
  if (inventory.type === "file") throw new CliUsageError("`init --dry-run` target must be a directory path or an absent path.");
  const promptSource = gitSource(candidate.standard.revision, "prompts/instantiate-wiki.md");
  const selectedEntries = plannedLayout(candidate.profile, starter.data);
  let existingAuthoringPolicy;
  if (selectedEntries.some((entry) => entry.role === "authoring_policy") && existingManifest) {
    const targetManifest = existingManifest;
    if (targetManifest.roles !== undefined && (!targetManifest.roles || typeof targetManifest.roles !== "object" || Array.isArray(targetManifest.roles))) {
      throw new CliUsageError("Existing target manifest roles must be a mapping; preserve and review it before initialization planning.");
    }
    if (Object.hasOwn(targetManifest.roles ?? {}, "authoring_policy")) {
      existingAuthoringPolicy = targetManifest.roles.authoring_policy;
      assertPortableAuthoringPath(existingAuthoringPolicy);
    }
  }
  const layout = selectedEntries.map((entry) => {
    const relativePath = entry.role === "authoring_policy" ? existingAuthoringPolicy ?? entry.target : entry.target;
    if (entry.role === "authoring_policy") assertPortableAuthoringPath(relativePath);
    const normalized = relativePath.replace(/\/$/, "");
    const collision = inventory.exists && existsSync(path.join(target, normalized));
    return {
      path: relativePath,
      role: entry.role,
      requirements: entry.requirements ?? [],
      classification: entry.classification,
      ...(entry.template ? { template: entry.template } : {}),
      ...(entry.source ? { source: entry.source } : {}),
      ...(entry.planning_only === true ? { planningOnly: true } : {}),
      ...(entry.dependency_closure ? { dependencyClosure: entry.dependency_closure } : {}),
      action: collision
        ? "preserve-and-review"
        : entry.classification === "render-template"
          ? "propose-render"
          : entry.classification === "create-subject-content"
            ? "propose-author"
            : "propose-adapt",
      collision,
    };
  });
  const unresolvedInputs = [];
  if (!options.seed && !options.blank) {
    unresolvedInputs.push("starting point: research topic seed or subject-empty local wiki");
  } else if (options.blank && !options.title) {
    unresolvedInputs.push("project title for the subject-empty local wiki");
  }
  if (!options.accent) unresolvedInputs.push(`accent colour (proposed default ${DEFAULT_ACCENT} when no evidenced brand colour exists)`);
  const automaticResolutions = [];
  if (options.seed) {
    automaticResolutions.push("Implementation agent must inspect the supplied research seed before deriving subject fields or rendering content; the read-only planner does not fetch or ingest arbitrary seed material.");
  }
  if (!options.wikiUrl) {
    automaticResolutions.push("Implementation must serialize shared-register and live-listener checks, atomically reserve a conflict-free loopback endpoint, publish its exact service identity marker, and record the resulting concrete Wiki URL.");
  }
  const selectedRequirements = new Set(candidate.profile.requirements);
  const stages = [
    { id: "inspect", purpose: "Read target instructions, repository state, canonical roles, and existing evidence before proposing edits.", always: true },
    { id: "bootstrap-discovery", purpose: "Inspect the research seed or establish an explicit subject-empty state, infer discoverable setup details, and resolve only material questions sequentially.", always: true },
    { id: "authority", purpose: "Define raw-source, canonical-evidence, generated-output, privacy, copyright, and retention boundaries.", requirements: ["DKBWS-SEC-001"] },
    { id: "okf", purpose: "Establish the first-class OKF v0.2 bundle, stable concepts, source identities, and newest-first logs.", requirements: ["DKBWS-OKF-001", "DKBWS-OKF-003"] },
    { id: "human-llm", purpose: "Build coordinated Human and LLM Wiki surfaces over shared canonical knowledge, including governed accent treatment and exact repetition consistency wherever a canonical governing question is declared.", requirements: ["DKBWS-HUMAN-001", "DKBWS-HUMAN-002", "DKBWS-HUMAN-004", "DKBWS-LLM-001"] },
    { id: "renderer-design", purpose: "Apply the selected renderer and design-governance contracts.", requirements: ["DKBWS-RENDER-001", "DKBWS-DESIGN-001"] },
    { id: "graph-runtime", purpose: "Add Graphify publication, local runtimes, and identity-verified managed service adapters required by the profile.", requirements: ["DKBWS-GRAPH-001", "DKBWS-RUNTIME-001", "DKBWS-RUNTIME-002"] },
    { id: "verification", purpose: "Run every selected deterministic and manual check without overstating proof.", always: true },
    { id: "provenance", purpose: "End every file-changing development turn with a disclosed Jujutsu commit after verification and Git/Jujutsu inspection.", requirements: ["DKBWS-PROV-001"] },
  ].filter((stage) => stage.always || stage.requirements.some((requirement) => selectedRequirements.has(requirement)))
    .map(({ always, requirements, ...stage }) => stage);
  const deployment = options.deployment ?? "none";
  const wikiUrl = options.wikiUrl ?? null;
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
      startingPoint: options.seed ? "research-topic-seed" : options.blank ? "subject-empty-local" : null,
      seed: options.seed ?? null,
      subjectEmpty: options.blank === true,
      title: options.title ?? null,
      topic: options.topic ?? null,
      accent: options.accent ?? null,
      proposedAccent: options.accent ?? DEFAULT_ACCENT,
      profile: profileId,
      standardRevision,
      standardReleaseTag: candidate.selection.releaseTag,
      wikiUrl,
      wikiUrlResolution: options.wikiUrl ? "explicit-override" : "implementation-auto-reserve-conflict-free-loopback",
      deployment,
    },
    candidate: {
      standard: candidate.standard,
      selection: candidate.selection,
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
      starter: {
        path: STARTER_PATH,
        sha256: starter.sha256,
        id: starter.data.id,
        repositoryBoundary: starter.data.repository_boundary,
        rootCopy: starter.data.root_copy,
        contentPolicy: starter.data.content_policy,
        deploymentPolicy: starter.data.deployment_policy,
        bootstrap: starter.data.bootstrap,
        executableScope: starter.data.executable_scope,
        documentation: starter.data.documentation,
      },
    },
    proposedManifest: proposedManifest(candidate, candidate.profile, starter.data, { ...options, standardRevision, deployment, existingAuthoringPolicy, existingManifest }),
    layout,
    stages,
    unresolvedInputs,
    automaticResolutions,
    clarificationProtocol: {
      sequential: true,
      format: "Question 1 of N",
      rule: "Ask only the first material question; each answer determines the next question and revises N.",
      nextQuestion: unresolvedInputs.length
        ? unresolvedInputs[0].startsWith("starting point:")
          ? `Question 1 of ${unresolvedInputs.length}: What should this wiki start from: a research topic seed (text, file, folder, URL, or repository), or a subject-empty local wiki?`
          : `Question 1 of ${unresolvedInputs.length}: Confirm ${unresolvedInputs[0]}.`
        : null,
    },
    safety: {
      collisions: layout.filter((entry) => entry.collision).map((entry) => entry.path),
      policy: "Preserve existing files and stronger verified patterns; no file is created, replaced, or merged by this plan. The standard repository root and its subject matter are never copied into a consumer.",
      standardContent: "Reference-only: standard help, specification pages, standard knowledge, evidence, dogfood reports, and fixtures are not consumer content.",
      consumerContent: "The target's docs, knowledge, sources, synthesis, navigation, accent, URL, and deployment are consumer-owned and subject-specific; a subject-empty start invents none of them beyond explicit local defaults.",
      rootCopy: starter.data.root_copy,
      deployment: starter.data.deployment_policy,
      externalActions: "No GitHub, deployment, service, Git, or Jujutsu mutation is authorized by init planning.",
      standardSelection: candidate.selection.bootstrapEligible
        ? "The latest immutable release and exact-revision Verify evidence were resolved read-only. This dated proof is not current vulnerability clearance."
        : "Explicit historical/development dry-run only. Release status and qualification are unverified; this plan is not an automatic production bootstrap.",
    },
    summary: {
      proposedPaths: layout.length,
      collisions: layout.filter((entry) => entry.collision).length,
      unresolvedInputs: unresolvedInputs.length,
      readyForImplementationReview: unresolvedInputs.length === 0,
      pendingAutomaticResolutions: automaticResolutions.length,
      readyForRendering: candidate.selection.bootstrapEligible && unresolvedInputs.length === 0 && automaticResolutions.length === 0,
    },
  };
}

export function lifecycleText(value) {
  if (value.kind === "lifecycle-diff") {
    const lines = [
      `Lifecycle diff: ${value.consumer.standard?.version ?? "no manifest"} → ${value.candidate.standard.version}`,
      `Target: ${value.target}`,
      `Standard selection: ${value.candidate.selection.mode} · ${value.candidate.selection.releaseTag ?? "no verified tag"} · ${value.candidate.standard.revision}`,
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
      `Standard selection: ${value.candidate.selection.mode} · ${value.candidate.selection.releaseTag ?? "no verified tag"} · ${value.candidate.standard.revision}`,
      `Writes performed: ${value.writesPerformed}`,
      `Patch operations: ${value.summary.operations} · manual actions: ${value.summary.manualActions} · blocking: ${value.summary.blocking}`,
      "No apply command exists in this candidate; review the JSON patch plan before any separate implementation.",
    ].join("\n");
  }
  return [
    `Init dry-run: ${value.input.title ?? "untitled"} · profile ${value.input.profile}`,
    `Target: ${value.target} (${value.targetState.type})`,
    `Standard selection: ${value.candidate.selection.mode} · ${value.candidate.selection.releaseTag ?? "no verified tag"} · ${value.candidate.standard.revision}`,
    `Writes performed: ${value.writesPerformed}`,
    `Proposed paths: ${value.summary.proposedPaths} · collisions preserved: ${value.summary.collisions} · unresolved inputs: ${value.summary.unresolvedInputs}`,
    value.clarificationProtocol.nextQuestion ?? "No material clarification is currently identified.",
  ].join("\n");
}
