import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

import {
  buildFullProfileReport,
  ReceiptError,
  selectedNotCheckedCapabilityIds,
} from "./full-profile-report.mjs";
import {
  listProfileIds,
  loadProfile,
  loadRequirementCatalogue,
  ProfileLoadError,
} from "./profile-catalogue.mjs";
import { checkProvenance } from "./check-provenance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/conformance-cli.mjs");
const FULL_REPORT_CLI = path.join(ROOT, "scripts/full-profile-report.mjs");
const POSITIVE = path.join(ROOT, "fixtures/conforming/okf-v0.2");
const NEGATIVE_OKF = path.join(ROOT, "fixtures/nonconforming/okf-v0.2");
const GUIDANCE = path.join(ROOT, "fixtures/nonconforming/okf-guidance");
const NEGATIVE_MANIFEST = path.join(ROOT, "fixtures/nonconforming/manifest");
const NEGATIVE_WAIVER = path.join(ROOT, "fixtures/nonconforming/waiver");
const INVALID_CONSUMER_RECEIPT = path.join(ROOT, "fixtures/nonconforming/verification-receipt/consumer-summary.json");
const OLD_CONSUMER = path.join(ROOT, "fixtures/lifecycle/consumer-old");
const RC3_CONSUMER = path.join(ROOT, "fixtures/lifecycle/consumer-rc3");
const STARTER_PATH = path.join(ROOT, "starter/starter.yaml");
const LIFECYCLE_SCHEMA = JSON.parse(readFileSync(path.join(ROOT, "schema/lifecycle-plan-v1.json"), "utf8"));
const MANIFEST_SCHEMA = JSON.parse(readFileSync(path.join(ROOT, "schema/manifest-v1.json"), "utf8"));
const OKF_SCHEMA_SOURCE = readFileSync(path.join(ROOT, "schema/okf-v0.2-frontmatter.json"), "utf8");
const REPORT_SCHEMA_SOURCE = readFileSync(path.join(ROOT, "schema/conformance-report-v1.json"), "utf8");
const RECEIPT_SCHEMA_SOURCE = readFileSync(path.join(ROOT, "schema/verification-receipt-v1.json"), "utf8");
const OKF_SCHEMA = JSON.parse(OKF_SCHEMA_SOURCE);
const REPORT_SCHEMA = JSON.parse(REPORT_SCHEMA_SOURCE);
const RECEIPT_SCHEMA = JSON.parse(RECEIPT_SCHEMA_SOURCE);

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function treeHash(root) {
  const hash = createHash("sha256");
  function visit(current) {
    const entries = readdirSync(current).sort();
    for (const entry of entries) {
      const full = path.join(current, entry);
      const relative = path.relative(root, full).split(path.sep).join("/");
      const stat = statSync(full);
      hash.update(relative);
      if (stat.isDirectory()) visit(full);
      else hash.update(readFileSync(full));
    }
  }
  visit(root);
  return hash.digest("hex");
}

function assertLifecycleSchemaShape(value) {
  for (const key of LIFECYCLE_SCHEMA.required) {
    assert.ok(key in value, `lifecycle output missing required field ${key}`);
  }
  const allowed = new Set(Object.keys(LIFECYCLE_SCHEMA.properties));
  for (const key of Object.keys(value)) {
    assert.ok(allowed.has(key), `lifecycle output has schema-unknown field ${key}`);
  }
  assert.equal(value.$schema, LIFECYCLE_SCHEMA.$id);
  assert.equal(value.readOnly, true);
  assert.equal(value.writesPerformed, false);
  const conditional = LIFECYCLE_SCHEMA.allOf.find((entry) => entry.if.properties.kind.const === value.kind);
  assert.ok(conditional, `schema has no branch for ${value.kind}`);
  for (const key of conditional.then.required) {
    assert.ok(key in value, `${value.kind} missing conditional field ${key}`);
  }
}

function withTemporaryRoot(callback) {
  const root = mkdtempSync(path.join(os.tmpdir(), "denchco-profile-test-"));
  try {
    mkdirSync(path.join(root, "profiles"), { recursive: true });
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeProfile(root, profileId, source) {
  writeFileSync(path.join(root, "profiles", `${profileId}.yaml`), source, "utf8");
}

function writePortableProject(root, { deviation = null, conceptBody = "# Fixture concept" } = {}) {
  mkdirSync(path.join(root, "knowledge"), { recursive: true });
  const deviations = deviation ? [deviation] : [];
  writeFileSync(path.join(root, ".wiki-standard.yaml"), [
    "schema: https://example.test/manifest-v1.json",
    "standard:",
    "  name: DenchCo Knowledge Base Wiki Standard",
    "  version: 0.1.0-candidate",
    "  source: local-test",
    "profile: portable-core",
    "okf_version: '0.2'",
    "roles:",
    "  okf_bundle: knowledge",
    "capabilities: {}",
    "deviations:",
    ...(deviations.length ? [
      `  - requirement: ${deviation.requirement}`,
      `    status: ${deviation.status}`,
      `    reason: ${deviation.reason}`,
      ...(deviation.authority ? [`    authority: ${deviation.authority}`] : []),
      ...(deviation.reviewed_at ? [`    reviewed_at: '${deviation.reviewed_at}'`] : []),
      ...(deviation.expires ? [`    expires: '${deviation.expires}'`] : []),
    ] : ["  []"]),
    "",
  ].join("\n"), "utf8");
  writeFileSync(path.join(root, "knowledge/index.md"), [
    "---",
    "okf_version: '0.2'",
    "---",
    "",
    "# Fixture index",
    "",
    "- [Concept](concept.md)",
    "",
  ].join("\n"), "utf8");
  writeFileSync(path.join(root, "knowledge/concept.md"), [
    "---",
    "type: Test Concept",
    "---",
    "",
    conceptBody,
    "",
  ].join("\n"), "utf8");
}

test("provenance preserves a filesystem-significant trailing-space repository root", () => {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "denchco-provenance-path-"));
  try {
    const repositoryRoot = path.join(fixtureRoot, "repository ");
    const nested = path.join(repositoryRoot, "nested");
    mkdirSync(nested, { recursive: true });
    const initialized = spawnSync("git", ["init", "--quiet"], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(initialized.status, 0, initialized.stderr);

    const report = checkProvenance({ root: repositoryRoot, mode: "distribution" });
    assert.equal(report.git.repositoryRoot, realpathSync(repositoryRoot));
    assert.match(report.git.repositoryRoot, /repository $/);
    assert.throws(
      () => checkProvenance({ root: nested, mode: "distribution" }),
      /does not equal Git root/,
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

function receiptFor(target, profile, results, options = {}) {
  return {
    $schema: RECEIPT_SCHEMA.$id,
    receiptVersion: "1.0",
    target: path.resolve(target),
    profile,
    evaluationDate: "2026-08-03",
    startedAt: "2026-08-03T10:00:00Z",
    completedAt: "2026-08-03T10:01:00Z",
    environment: {
      runtime: "node",
      runtimeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    canonicalMutation: options.canonicalMutation ?? {
      status: "pass",
      changedPaths: [],
      method: "fixture-tree-hash",
    },
    gates: options.gates ?? [{
      id: "fixture-suite",
      status: "pass",
      exitCode: 0,
      evidence: [{ id: "suite", kind: "command", description: "Fixture verification suite passed." }],
      results,
    }],
    ...(options.provenance ? { provenance: options.provenance } : {}),
  };
}

test("canonical profiles resolve inheritance and align with the requirement catalogue", () => {
  const catalogue = loadRequirementCatalogue({ standardRoot: ROOT });
  const profileIds = listProfileIds({ standardRoot: ROOT });
  assert.deepEqual(profileIds, ["evidence-governed", "human-and-agent", "managed-full", "portable-core", "standard-production"]);

  const profiles = profileIds.map((profileId) => loadProfile(profileId, {
    standardRoot: ROOT,
    requirementIds: catalogue.ids,
  }));
  const portable = profiles.find((profile) => profile.id === "portable-core");
  const production = profiles.find((profile) => profile.id === "standard-production");
  const managed = profiles.find((profile) => profile.id === "managed-full");
  assert.ok(portable);
  assert.ok(production);
  assert.ok(managed);
  assert.deepEqual(
    production.requirements.slice(0, portable.requirements.length),
    portable.requirements,
    "a child profile must retain its parent's ordered requirements",
  );
  assert.ok(portable.requirements.includes("DKBWS-OKF-003"));
  assert.ok(production.requirements.includes("DKBWS-OKF-003"));
  assert.ok(production.requirements.includes("DKBWS-HUMAN-002"));
  assert.ok(production.requirements.includes("DKBWS-LINK-002"));
  assert.ok(production.requirements.includes("DKBWS-VERIFY-002"));
  assert.ok(production.requirements.includes("DKBWS-RUNTIME-002"));
  assert.equal(production.capabilities.local_service, "required");
  assert.deepEqual(
    production.sources.map((source) => source.path),
    [
      "profiles/portable-core.yaml",
      "profiles/evidence-governed.yaml",
      "profiles/human-and-agent.yaml",
      "profiles/standard-production.yaml",
    ],
  );
  assert.ok(managed.requirements.includes("DKBWS-RELEASE-001"));
  for (const profile of profiles) {
    assert.deepEqual(
      profile.requirements.filter((requirement) => !catalogue.ids.has(requirement)),
      [],
      `${profile.id} contains a requirement absent from ${catalogue.path}`,
    );
  }
});

test("profile resolution rejects missing, cyclic, invalid, and catalogue-unknown definitions with stable codes", () => {
  withTemporaryRoot((root) => {
    assert.throws(
      () => loadProfile("missing", { standardRoot: root }),
      (error) => error instanceof ProfileLoadError && error.code === "DKBWS-PROFILE-MISSING-001",
    );

    writeProfile(root, "alpha", [
      "id: alpha",
      "version: '1.0.0'",
      "extends: [beta]",
      "requires: [DKBWS-CORE-001]",
      "capabilities: {}",
      "",
    ].join("\n"));
    writeProfile(root, "beta", [
      "id: beta",
      "version: '1.0.0'",
      "extends: [alpha]",
      "requires: []",
      "capabilities: {}",
      "",
    ].join("\n"));
    assert.throws(
      () => loadProfile("alpha", { standardRoot: root }),
      (error) => error instanceof ProfileLoadError && error.code === "DKBWS-PROFILE-CYCLE-001",
    );

    writeProfile(root, "invalid", [
      "id: invalid",
      "version: '1.0.0'",
      "requires: [DKBWS-CORE-001]",
      "capabilities: []",
      "",
    ].join("\n"));
    assert.throws(
      () => loadProfile("invalid", { standardRoot: root }),
      (error) => error instanceof ProfileLoadError && error.code === "DKBWS-PROFILE-CAPABILITIES-001",
    );

    writeProfile(root, "unknown-requirement", [
      "id: unknown-requirement",
      "version: '1.0.0'",
      "requires: [DKBWS-FAKE-999]",
      "capabilities: {}",
      "",
    ].join("\n"));
    assert.throws(
      () => loadProfile("unknown-requirement", {
        standardRoot: root,
        requirementIds: new Set(["DKBWS-CORE-001"]),
      }),
      (error) => error instanceof ProfileLoadError && error.code === "DKBWS-PROFILE-REQUIREMENT-UNKNOWN-001",
    );
  });
});

test("an unknown declared profile produces a stable diagnostic and read-only safe fallback", () => {
  withTemporaryRoot((root) => {
    mkdirSync(path.join(root, "knowledge"), { recursive: true });
    writeFileSync(path.join(root, ".wiki-standard.yaml"), [
      "schema: https://example.test/manifest-v1.json",
      "standard:",
      "  name: DenchCo Knowledge Base Wiki Standard",
      "  version: 0.1.0-candidate",
      "  source: local-test",
      "profile: missing-profile",
      "okf_version: '0.2'",
      "roles:",
      "  okf_bundle: knowledge",
      "capabilities: {}",
      "deviations: []",
      "",
    ].join("\n"), "utf8");
    writeFileSync(path.join(root, "knowledge", "index.md"), "# Fixture index\n", "utf8");
    writeFileSync(path.join(root, "knowledge", "concept.md"), [
      "---",
      "type: Test Concept",
      "---",
      "",
      "# Fixture concept",
      "",
    ].join("\n"), "utf8");

    const before = treeHash(root);
    const result = run("validate", root, "--date", "2026-08-03", "--json");
    const after = treeHash(root);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.equal(after, before);
    const report = JSON.parse(result.stdout);
    assert.equal(report.manifest.valid, false);
    assert.deepEqual(report.requirementResults, []);
    assert.ok(report.diagnostics.some((item) => item.code === "DKBWS-PROFILE-MISSING-001"));
  });
});

test("standard-production requirement results come from the resolved profile chain", () => {
  const result = run("validate", ROOT, "--date", "2026-08-03", "--json");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const requirements = new Map(report.requirementResults.map((item) => [item.requirement, item]));
  assert.equal(requirements.get("DKBWS-OKF-003")?.status, "pass");
  assert.equal(requirements.get("DKBWS-HUMAN-002")?.status, "not-checked");
  assert.equal(requirements.get("DKBWS-VERIFY-002")?.status, "not-checked");
  assert.match(requirements.get("DKBWS-VERIFY-002")?.reason ?? "", /complete profile verification pipeline/);

  const strict = run("validate", ROOT, "--date", "2026-08-03", "--json", "--strict");
  assert.equal(strict.status, 0, strict.stderr || strict.stdout);
  const strictReport = JSON.parse(strict.stdout);
  assert.equal(strictReport.diagnostics.some(item => item.code === "DKBWS-MANIFEST-ROLE-006"), false);
});

test("positive fixture validates as hard OKF v0.2 and preserves extension discovery", () => {
  const result = run("validate", POSITIVE, "--date", "2026-08-03", "--json");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.okf.conformant, true);
  assert.equal(report.manifest.valid, true);
  assert.deepEqual(report.manifest.data.deviations[0], {
    requirement: "DKBWS-SEC-001",
    status: "waived",
    reason: "Fixture waiver used only to prove the lifecycle contract.",
    authority: "human:fixture-maintainer",
    reviewed_at: "2026-08-02",
  });
  assert.deepEqual(report.okf.bundles[0].unknownFieldsPreserved, ["x-denchco"]);
  assert.equal(report.okf.bundles[0].trust["human-reviewed"], 1);
  const security = report.requirementResults.find((item) => item.requirement === "DKBWS-SEC-001");
  assert.equal(security.status, "waived");
  assert.equal(security.subcontrols.length, 4);
  assert.ok(security.subcontrols.every((item) => item.status === "waived"));
});

test("waivers require authority and an ISO expiry or review state while pending remains valid", () => {
  const deviationSchema = MANIFEST_SCHEMA.properties.deviations.items;
  assert.ok(deviationSchema.properties.authority);
  assert.ok(deviationSchema.properties.reviewed_at);
  assert.deepEqual(deviationSchema.allOf[0].then.required, ["authority"]);
  assert.deepEqual(
    deviationSchema.allOf[0].then.anyOf.map((branch) => branch.required[0]),
    ["expires", "reviewed_at"],
  );

  const invalid = run("validate", NEGATIVE_WAIVER, "--date", "2026-08-03", "--json");
  assert.equal(invalid.status, 1);
  const report = JSON.parse(invalid.stdout);
  const codes = new Set(report.diagnostics.map((item) => item.code));
  for (const code of [
    "DKBWS-MANIFEST-DEVIATION-006",
    "DKBWS-MANIFEST-DEVIATION-009",
    "DKBWS-MANIFEST-DEVIATION-010",
    "DKBWS-MANIFEST-DEVIATION-011",
  ]) {
    assert.ok(codes.has(code), `missing ${code}: ${invalid.stdout}`);
  }
  const invalidSecurity = report.requirementResults.find((item) => item.requirement === "DKBWS-SEC-001");
  assert.equal(invalidSecurity.status, "not-checked", "an invalid waiver must not overlay the base result");

  const pending = run("validate", OLD_CONSUMER, "--date", "2026-08-03", "--json");
  assert.equal(pending.status, 0, pending.stderr || pending.stdout);
  const pendingReport = JSON.parse(pending.stdout);
  assert.equal(pendingReport.manifest.valid, true);
  assert.equal(pendingReport.manifest.data.deviations[0].status, "pending");
  assert.equal(pendingReport.manifest.data.deviations[0].authority, undefined);
  const pendingSecurity = pendingReport.requirementResults.find((item) => item.requirement === "DKBWS-SEC-001");
  assert.equal(pendingSecurity.status, "not-checked");
  assert.ok(pendingSecurity.subcontrols.every((item) => item.status === "not-checked"));
});

test("validated not-applicable overlays apply while deviates cannot satisfy a checked requirement", () => {
  withTemporaryRoot((root) => {
    writePortableProject(root, {
      deviation: {
        requirement: "DKBWS-SEC-001",
        status: "not-applicable",
        reason: "The isolated fixture has no retained source or credential boundary.",
      },
    });
    const notApplicable = run("validate", root, "--date", "2026-08-03", "--json");
    assert.equal(notApplicable.status, 0, notApplicable.stderr || notApplicable.stdout);
    const naReport = JSON.parse(notApplicable.stdout);
    const security = naReport.requirementResults.find((item) => item.requirement === "DKBWS-SEC-001");
    assert.equal(security.status, "not-applicable");
    assert.ok(security.subcontrols.every((item) => item.status === "not-applicable"));

    writePortableProject(root, {
      deviation: {
        requirement: "DKBWS-CORE-001",
        status: "deviates",
        reason: "The fixture deliberately refuses the otherwise passing portable-core control.",
      },
    });
    const deviates = run("validate", root, "--date", "2026-08-03", "--json");
    assert.equal(deviates.status, 1);
    const deviatesReport = JSON.parse(deviates.stdout);
    const core = deviatesReport.requirementResults.find((item) => item.requirement === "DKBWS-CORE-001");
    assert.equal(core.status, "fail");
    assert.match(core.reason, /does not satisfy/);
  });
});

test("CORE-001 performs an independent strict UTF-8 and portable-link role scan", () => {
  withTemporaryRoot((root) => {
    writePortableProject(root, { conceptBody: "# Fixture concept\n\n[Broken](missing.md)" });
    const result = run("validate", root, "--date", "2026-08-03", "--json");
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.okf.conformant, true, "OKF portability tolerates broken links");
    assert.equal(report.requirementResults.find((item) => item.requirement === "DKBWS-CORE-001").status, "fail");
    assert.ok(report.diagnostics.some((item) => item.code === "DKBWS-CORE-LINK-001"));
  });
});

test("lossless export retains unknown nested frontmatter and exact source bytes", () => {
  const result = run("export-okf", POSITIVE, "--date", "2026-08-03", "--compact");
  assert.equal(result.status, 0, result.stderr);
  const exported = JSON.parse(result.stdout);
  const concept = exported.bundles[0].files.find((file) => file.path === "concepts/customer-orders.md");
  assert.ok(concept);
  assert.deepEqual(concept.frontmatter["x-denchco"], {
    evidence_state: "applicable",
    nested: { preserve_me: true },
  });
  const original = readFileSync(path.join(POSITIVE, "knowledge/concepts/customer-orders.md"), "utf8");
  assert.equal(concept.raw, original);
  assert.equal(concept.sha256, createHash("sha256").update(original).digest("hex"));
});

test("validation is read-only", () => {
  const before = treeHash(POSITIVE);
  const result = run("validate", POSITIVE, "--date", "2026-08-03", "--json");
  const after = treeHash(POSITIVE);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(after, before);
});

test("negative fixture produces stable structural diagnostic codes", () => {
  const result = run("validate", NEGATIVE_OKF, "--date", "2026-08-03", "--json");
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const codes = new Set(report.diagnostics.map((item) => item.code));
  for (const code of [
    "OKF-INDEX-FRONTMATTER-002",
    "OKF-FRONTMATTER-001",
    "OKF-FRONTMATTER-003",
    "OKF-TYPE-001",
    "OKF-INDEX-FRONTMATTER-001",
    "OKF-LOG-DATE-002",
    "OKF-LOG-ORDER-001",
  ]) {
    assert.ok(codes.has(code), `missing ${code}: ${result.stdout}`);
  }
});

test("OKF soft guidance passes portability mode and fails DenchCo strict mode", () => {
  const portable = run("validate", GUIDANCE, "--date", "2026-08-03", "--json");
  assert.equal(portable.status, 0, portable.stderr || portable.stdout);
  const portableReport = JSON.parse(portable.stdout);
  assert.equal(portableReport.okf.conformant, true);
  assert.ok(portableReport.summary.warnings >= 5);

  const strict = run("validate", GUIDANCE, "--date", "2026-08-03", "--json", "--strict");
  assert.equal(strict.status, 1);
  assert.equal(JSON.parse(strict.stdout).summary.strictFailure, true);
});

test("Attested Computation runtime remains soft guidance and report schemas reject duplicate keys", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
  const validateOkf = ajv.compile(OKF_SCHEMA);
  assert.equal(validateOkf({ type: "Attested Computation" }), true, JSON.stringify(validateOkf.errors));
  assert.equal(OKF_SCHEMA.allOf, undefined, "runtime must not be a hard conditional schema requirement");

  for (const [name, source] of [
    ["conformance report", REPORT_SCHEMA_SOURCE],
    ["verification receipt", RECEIPT_SCHEMA_SOURCE],
  ]) {
    const parsed = parseDocument(source, { strict: true, uniqueKeys: true });
    assert.deepEqual(parsed.errors, [], `${name} schema contains duplicate JSON object keys`);
  }

  const narrow = run("validate", POSITIVE, "--date", "2026-08-03", "--json");
  assert.equal(narrow.status, 0, narrow.stderr || narrow.stdout);
  const validateReport = ajv.compile(REPORT_SCHEMA);
  assert.equal(validateReport(JSON.parse(narrow.stdout)), true, JSON.stringify(validateReport.errors));
  const validateReceipt = ajv.compile(RECEIPT_SCHEMA);
  const sample = receiptFor(POSITIVE, "portable-core", [] , { gates: [] });
  assert.equal(validateReceipt(sample), true, JSON.stringify(validateReceipt.errors));

  const validateManifest = ajv.compile(MANIFEST_SCHEMA);
  const liveResponseManifest = {
    schema: "https://example.test/manifest-v1.json",
    standard: { name: "DenchCo Knowledge Base Wiki Standard", version: "fixture", source: "local-test" },
    profile: "human-and-agent",
    okf_version: "0.2",
    roles: { okf_bundle: "knowledge" },
    capabilities: { development_response_links: "live-wiki", human_wiki_url: "docs/index.md" },
    deviations: [],
  };
  assert.equal(validateManifest(liveResponseManifest), false);
  assert.ok(validateManifest.errors.some((item) => item.instancePath === "/capabilities/human_wiki_url"));
  liveResponseManifest.capabilities.human_wiki_url = "http://127.0.0.1:8017/";
  assert.equal(validateManifest(liveResponseManifest), true, JSON.stringify(validateManifest.errors));
});

test("invalid DenchCo manifest is diagnosed independently from OKF", () => {
  const result = run("validate", NEGATIVE_MANIFEST, "--date", "2026-08-03", "--json");
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const codes = new Set(report.diagnostics.map((item) => item.code));
  for (const code of [
    "DKBWS-MANIFEST-002",
    "DKBWS-MANIFEST-STANDARD-002",
    "DKBWS-MANIFEST-STANDARD-003",
    "DKBWS-MANIFEST-OKF-001",
    "DKBWS-MANIFEST-ROLE-003",
    "DKBWS-MANIFEST-ROLE-OKF-001",
    "DKBWS-MANIFEST-CAPABILITIES-001",
    "DKBWS-MANIFEST-DEVIATION-002",
  ]) {
    assert.ok(codes.has(code), `missing ${code}: ${result.stdout}`);
  }
  const bundleDiagnostics = report.diagnostics.filter((item) => (
    item.code.startsWith("OKF-BUNDLE-")
    || item.field === "roles.okf_bundle"
  ));
  assert.ok(bundleDiagnostics.length > 0);
  assert.ok(bundleDiagnostics.every((item) => item.requirement === "DKBWS-OKF-003"));
});

test("a bare OKF directory validates without pretending to be a DenchCo claim", () => {
  const result = run("validate", path.join(POSITIVE, "knowledge"), "--date", "2026-08-03", "--json");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.manifest.present, false);
  assert.equal(report.okf.conformant, true);
  assert.equal(report.summary.status, "partial");
});

test("invalid CLI usage has a distinct exit code", () => {
  const result = run("unknown-command");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage error/);
});

test("help and package scripts expose only lifecycle planning modes", () => {
  const help = run("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /diff \[target\]/);
  assert.match(help.stdout, /upgrade \[target\] --dry-run/);
  assert.match(help.stdout, /init \[target\] --dry-run/);
  assert.match(help.stdout, /no apply mode/i);
  assert.match(help.stdout, /--standard-revision/);
  assert.match(help.stdout, /--seed/);
  assert.match(help.stdout, /--blank/);
  assert.match(help.stdout, /--accent/);
  assert.match(help.stdout, /--wiki-url/);
  assert.match(help.stdout, /--deployment/);
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.scripts["conformance:diff"], "node scripts/conformance-cli.mjs diff");
  assert.match(pkg.scripts["conformance:upgrade-plan"], /upgrade --dry-run$/);
  assert.match(pkg.scripts["conformance:init-plan"], /init --dry-run$/);
});

test("subject-empty starter has an allowlisted, non-executable consumer boundary", () => {
  const source = readFileSync(STARTER_PATH, "utf8");
  const document = parseDocument(source, { prettyErrors: true, strict: true, uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  const starter = document.toJS({ maxAliasCount: 100 });
  assert.equal(starter.standard_source, "https://github.com/denchco/knowledge-base-wiki-standard");
  assert.equal(starter.documentation, "https://denchco.github.io/knowledge-base-wiki-documentation/");
  assert.equal(starter.root_copy, "forbidden");
  assert.equal(starter.content_policy, "subject-specific-create-fresh");
  assert.equal(starter.deployment_policy, "consumer-owned");
  assert.equal(starter.bootstrap.invocation, "standard-repository-url-only");
  assert.equal(starter.bootstrap.first_question, "research-topic-seed-or-subject-empty-local-wiki");
  assert.deepEqual(starter.bootstrap.modes, ["research-topic-seed", "subject-empty-local"]);
  assert.equal(starter.bootstrap.defaults.profile, "standard-production");
  assert.equal(starter.bootstrap.defaults.accent_color, "#0b7285");
  assert.equal(starter.bootstrap.defaults.wiki_url, "auto-reserve-conflict-free-loopback");
  assert.equal(starter.bootstrap.defaults.local_service, "auto-select-platform-user-service-adapter");
  assert.equal(starter.bootstrap.defaults.deployment, "none");
  assert.equal(starter.executable_scope.apply_supported, false);
  assert.match(starter.executable_scope.portable_core, /pinned standard release/i);
  assert.match(starter.executable_scope.standard_production, /complete .* dependency closure/i);
  assert.match(starter.executable_scope.standard_production, /documentation-sync commands and verify:workspace are excluded/i);

  const targets = starter.entries.map((entry) => entry.target);
  assert.equal(new Set(targets).size, targets.length, "starter target paths must be unique");
  assert.equal(targets.some((target) => target.startsWith("docs/spec/")), false);
  assert.equal(targets.some((target) => target.startsWith("docs/conformance/")), false);
  assert.equal(targets.some((target) => /pages|deploy/i.test(target)), false);
  const claudeEntry = starter.entries.find((entry) => entry.target === "CLAUDE.md");
  assert.equal(claudeEntry?.classification, "render-template");
  assert.equal(claudeEntry?.always, true);
  assert.equal(claudeEntry?.template, "starter/templates/CLAUDE.md.tmpl");
  const projectStatusEntry = starter.entries.find((entry) => entry.target === "docs/project/status.md");
  assert.equal(projectStatusEntry?.classification, "render-template");
  assert.equal(projectStatusEntry?.always, true);
  const packageEntry = starter.entries.find((entry) => entry.target === "package.json");
  assert.match(packageEntry?.dependency_closure ?? "", /exclude Standard-maintainer sync:documentation:\* and verify:workspace/i);
  assert.ok(packageEntry?.requirements.includes("DKBWS-RUNTIME-002"));
  const serviceEntry = starter.entries.find((entry) => entry.target === "scripts/dev-service.mjs");
  assert.equal(serviceEntry?.classification, "adapt-from-release");
  assert.ok(serviceEntry?.requirements.includes("DKBWS-RUNTIME-002"));
  const serviceMarkerEntry = starter.entries.find((entry) => entry.target === "docs/assets/service-identity.json");
  assert.equal(serviceMarkerEntry?.classification, "render-template");
  assert.equal(serviceMarkerEntry?.always, true);
  assert.ok(serviceMarkerEntry?.requirements.includes("DKBWS-RUNTIME-002"));
  const licensingEntry = starter.entries.find((entry) => entry.target === "LICENSING.md");
  assert.equal(licensingEntry?.classification, "render-template");
  assert.equal(licensingEntry?.always, true);
  const graphIndexEntry = starter.entries.find((entry) => entry.target === "docs/graph/index.md");
  assert.equal(graphIndexEntry?.classification, "render-template");
  const graphIndexTemplate = readFileSync(path.join(ROOT, graphIndexEntry.template), "utf8");
  assert.match(graphIndexTemplate, /generated discovery aids and are not evidence/);
  assert.match(graphIndexTemplate, /\[2D\]\(two-dimensional\.md\)/);
  assert.match(graphIndexTemplate, /\[3D\]\(three-dimensional\.md\)/);
  for (const [target, view] of [
    ["docs/graph/two-dimensional.md", "2d"],
    ["docs/graph/three-dimensional.md", "3d"],
  ]) {
    const graphEntry = starter.entries.find((entry) => entry.target === target);
    assert.equal(graphEntry?.classification, "render-template");
    const graphTemplate = readFileSync(path.join(ROOT, graphEntry.template), "utf8");
    assert.match(graphTemplate, /class="graph-shell"/);
    assert.match(graphTemplate, new RegExp(`data-graph-view="${view}"`));
    assert.doesNotMatch(graphTemplate, /class="kb-graph"/);
  }

  const forbiddenTemplateContent = /five-project|SRC-00[1-9]|candidate status|local-unpublished/i;
  for (const entry of starter.entries) {
    assert.ok(["render-template", "create-subject-content", "adapt-from-release"].includes(entry.classification));
    if (entry.classification === "render-template") {
      assert.match(entry.template, /^starter\/templates\//);
      const templatePath = path.join(ROOT, entry.template);
      assert.equal(existsSync(templatePath), true, `missing starter template ${entry.template}`);
      const template = readFileSync(templatePath, "utf8");
      assert.match(template, /\{\{[A-Z0-9_]+\}\}/, `${entry.template} needs an explicit placeholder`);
      assert.doesNotMatch(template, forbiddenTemplateContent, `${entry.template} leaks standard/example content`);
    }
    if (entry.classification === "adapt-from-release") {
      assert.equal(entry.planning_only, true, `${entry.target} must not pretend to be an executable scaffold entry`);
      assert.match(entry.dependency_closure, /\S/);
    }
  }
});

test("lifecycle diff compares the consumer version and selected profile without writing", () => {
  const before = treeHash(OLD_CONSUMER);
  const result = run("diff", OLD_CONSUMER, "--date", "2026-08-03", "--json");
  const after = treeHash(OLD_CONSUMER);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.equal(after, before);
  const diff = JSON.parse(result.stdout);
  assertLifecycleSchemaShape(diff);
  assert.equal(diff.kind, "lifecycle-diff");
  assert.equal(diff.readOnly, true);
  assert.equal(diff.writesPerformed, false);
  assert.equal(diff.summary.versionState, "candidate-newer");
  assert.equal(diff.summary.revisionState, "missing");
  assert.equal(diff.summary.blocking, 1);
  assert.equal(diff.summary.safeToPlanUpgrade, false);
  assert.ok(diff.requirements.some((item) => item.id === "DKBWS-OKF-001"));
  assert.deepEqual(
    diff.changes.map((change) => [change.id, change.path, change.current, change.proposed]),
    [
      ["standard-version-update", "/standard/version", "0.0.9", "0.1.0-candidate"],
      ["standard-revision-missing", "/standard/revision", null, diff.candidate.standard.revision],
    ],
  );
  const headManifest = spawnSync("git", ["show", `${diff.candidate.standard.revision}:.wiki-standard.yaml`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(headManifest.status, 0, headManifest.stderr);
  assert.equal(diff.candidate.manifest.sha256, createHash("sha256").update(headManifest.stdout).digest("hex"));
});

test("lifecycle diff compares equal version labels by immutable revision and requirement IDs", () => {
  const before = treeHash(RC3_CONSUMER);
  const result = run("diff", RC3_CONSUMER, "--date", "2026-08-04", "--json");
  const after = treeHash(RC3_CONSUMER);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.equal(after, before);
  const diff = JSON.parse(result.stdout);
  assertLifecycleSchemaShape(diff);
  assert.equal(diff.summary.versionState, "same");
  assert.equal(diff.summary.revisionState, "candidate-newer");
  assert.equal(diff.summary.safeToPlanUpgrade, false);
  assert.match(diff.consumer.resolvedRevision, /^[0-9a-f]{40}$/);
  assert.ok(diff.consumer.pinnedProfileRequirements.includes("DKBWS-HUMAN-002"));
  assert.equal(diff.consumer.pinnedProfileRequirements.includes("DKBWS-HUMAN-003"), false);
  assert.ok(diff.changes.some((change) => change.id === "standard-revision-review" && change.blocking));
  assert.ok(diff.changes.some((change) => (
    change.id === "requirement-introduced-DKBWS-HUMAN-003"
    && change.proposed === "DKBWS-HUMAN-003"
    && change.blocking
  )));
  assert.equal(
    diff.requirements.find((item) => item.id === "DKBWS-HUMAN-003")?.introducedSinceConsumerRevision,
    true,
  );
});

test("the current lifecycle catalogue introduces managed preview and live response links after rc.3", () => {
  const catalogue = loadRequirementCatalogue({ standardRoot: ROOT });
  const current = loadProfile("standard-production", {
    standardRoot: ROOT,
    requirementIds: catalogue.ids,
  });
  const readRc3Source = (relativePath) => {
    const result = spawnSync("git", ["show", `v0.1.0-rc.3:${relativePath}`], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  const rc3Catalogue = loadRequirementCatalogue({ standardRoot: ROOT, readSource: readRc3Source });
  const rc3 = loadProfile("standard-production", {
    standardRoot: ROOT,
    readSource: readRc3Source,
    requirementIds: rc3Catalogue.ids,
  });
  const introduced = current.requirements.filter((requirement) => !rc3.requirements.includes(requirement));
  assert.ok(introduced.includes("DKBWS-RUNTIME-002"));
  assert.ok(introduced.includes("DKBWS-PROMPT-002"));
  assert.equal(current.capabilities.development_response_links, "live-wiki");
});

test("lifecycle revision comparison distinguishes the same commit from an unresolved pin", () => {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "denchco-revision-diff-"));
  try {
    const same = path.join(fixtureRoot, "same");
    const unresolved = path.join(fixtureRoot, "unresolved");
    cpSync(RC3_CONSUMER, same, { recursive: true });
    cpSync(RC3_CONSUMER, unresolved, { recursive: true });
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();

    const sameManifest = path.join(same, ".wiki-standard.yaml");
    writeFileSync(
      sameManifest,
      readFileSync(sameManifest, "utf8").replace('revision: "v0.1.0-rc.3"', `revision: "${head}"`),
      "utf8",
    );
    const sameResult = run("diff", same, "--json");
    assert.equal(sameResult.status, 0, sameResult.stderr || sameResult.stdout);
    const sameDiff = JSON.parse(sameResult.stdout);
    assert.equal(sameDiff.summary.revisionState, "same");
    assert.equal(sameDiff.changes.some((change) => change.id.startsWith("standard-revision")), false);

    const unresolvedManifest = path.join(unresolved, ".wiki-standard.yaml");
    writeFileSync(
      unresolvedManifest,
      readFileSync(unresolvedManifest, "utf8").replace('revision: "v0.1.0-rc.3"', `revision: "${"f".repeat(40)}"`),
      "utf8",
    );
    const unresolvedResult = run("diff", unresolved, "--json");
    assert.equal(unresolvedResult.status, 1, unresolvedResult.stderr || unresolvedResult.stdout);
    const unresolvedDiff = JSON.parse(unresolvedResult.stdout);
    assert.equal(unresolvedDiff.summary.revisionState, "unresolved");
    assert.ok(unresolvedDiff.changes.some((change) => change.id === "standard-revision-unresolved" && change.blocking));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("lifecycle diff never plans a version update across Standard sources", () => {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "denchco-source-diff-"));
  try {
    const consumer = path.join(fixtureRoot, "consumer");
    cpSync(OLD_CONSUMER, consumer, { recursive: true });
    const manifestPath = path.join(consumer, ".wiki-standard.yaml");
    writeFileSync(
      manifestPath,
      readFileSync(manifestPath, "utf8").replace(
        "https://github.com/denchco/knowledge-base-wiki-standard",
        "https://example.invalid/different-standard",
      ),
      "utf8",
    );
    const result = run("diff", consumer, "--json");
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const diff = JSON.parse(result.stdout);
    assert.equal(diff.summary.revisionState, "not-compared");
    assert.ok(diff.changes.some((change) => change.id === "standard-source-review" && change.blocking));
    assert.equal(diff.changes.some((change) => change.id === "standard-version-update"), false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("upgrade requires dry-run and emits a guarded review plan rather than applying", () => {
  const unsafe = run("upgrade", OLD_CONSUMER, "--json");
  assert.equal(unsafe.status, 2);
  assert.match(unsafe.stderr, /requires --dry-run/);

  const before = treeHash(OLD_CONSUMER);
  const result = run("upgrade", OLD_CONSUMER, "--dry-run", "--date", "2026-08-03", "--json");
  const after = treeHash(OLD_CONSUMER);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.equal(after, before);
  const plan = JSON.parse(result.stdout);
  assertLifecycleSchemaShape(plan);
  assert.equal(plan.kind, "upgrade-plan");
  assert.equal(plan.dryRun, true);
  assert.equal(plan.applySupported, false);
  assert.equal(plan.writesPerformed, false);
  assert.match(plan.consumer.manifestSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(plan.patchPlan.operations.map((operation) => operation.op), ["test", "replace"]);
  assert.ok(plan.patchPlan.preserved.includes("/deviations"));
  assert.ok(plan.patchPlan.preserved.includes("unknown OKF concept fields"));
  assert.equal(plan.summary.blocking, 1);
  assert.equal(plan.summary.readyForHumanReview, false);
});

test("init requires dry-run and plans an absent target without creating it", () => {
  const target = path.join(ROOT, "fixtures/lifecycle/not-created-by-dry-run");
  assert.equal(existsSync(target), false, "test target must remain absent");
  const unsafe = run("init", target, "--profile", "portable-core", "--json");
  assert.equal(unsafe.status, 2);
  assert.match(unsafe.stderr, /requires --dry-run/);

  const result = run(
    "init",
    target,
    "--dry-run",
    "--profile",
    "portable-core",
    "--seed",
    "A bounded research brief supplied by the user",
    "--title",
    "Planned Wiki",
    "--topic",
    "A bounded reader task for a known audience",
    "--accent",
    "#0b7285",
    "--standard-revision",
    "v0.1.0-rc.1",
    "--wiki-url",
    "https://example.test/planned-wiki/",
    "--deployment",
    "none",
    "--json",
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(target), false, "init plan must not create the target");
  const plan = JSON.parse(result.stdout);
  assertLifecycleSchemaShape(plan);
  assert.equal(plan.kind, "init-plan");
  assert.equal(plan.writesPerformed, false);
  assert.equal(plan.applySupported, false);
  assert.equal(plan.targetState.type, "absent");
  assert.equal(plan.proposedManifest.profile, "portable-core");
  assert.equal(plan.proposedManifest.standard.source, "https://github.com/denchco/knowledge-base-wiki-standard");
  const resolvedRc1 = spawnSync("git", ["rev-parse", "--verify", "v0.1.0-rc.1^{commit}"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  assert.match(resolvedRc1, /^[0-9a-f]{40}$/);
  assert.equal(plan.proposedManifest.standard.revision, resolvedRc1);
  assert.equal(plan.input.standardRevision, resolvedRc1);
  assert.equal(plan.proposedManifest.roles.okf_bundle, "knowledge");
  assert.equal(plan.input.wikiUrl, "https://example.test/planned-wiki/");
  assert.equal(plan.input.deployment, "none");
  assert.equal(plan.input.startingPoint, "research-topic-seed");
  assert.equal(plan.input.accent, "#0b7285");
  assert.equal(plan.clarificationProtocol.nextQuestion, null);
  assert.equal(plan.automaticResolutions.length, 1);
  assert.match(plan.automaticResolutions[0], /inspect the supplied research seed/);
  assert.equal(plan.summary.readyForRendering, false);
  assert.ok(plan.layout.some((entry) => entry.path === "knowledge/index.md" && entry.classification === "render-template"));
  assert.equal(plan.layout.some((entry) => entry.path === "CLAUDE.md"), false, "the rc.1 plan must use the starter pinned at rc.1");
  assert.equal(plan.layout.some((entry) => entry.path === "docs/project/status.md"), false, "the rc.1 plan must not leak current HEAD starter entries");
  assert.equal(plan.candidate.starter.rootCopy, "forbidden");
  assert.equal(plan.candidate.starter.deploymentPolicy, "consumer-owned");
  assert.equal(plan.candidate.starter.executableScope.apply_supported, false);
  assert.match(plan.safety.standardContent, /reference-only/i);
  assert.ok(plan.stages.some((stage) => stage.id === "okf"));
  assert.equal(plan.stages.some((stage) => stage.id === "provenance"), false);
  assert.equal(plan.stages.some((stage) => stage.id === "human-llm"), false);
  assert.equal(plan.stages.some((stage) => stage.id === "graph-runtime"), false);
});

test("init plan preserves and reports collisions in an existing target", () => {
  const before = treeHash(POSITIVE);
  const result = run("init", POSITIVE, "--dry-run", "--profile", "portable-core", "--json");
  const after = treeHash(POSITIVE);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(after, before);
  const plan = JSON.parse(result.stdout);
  assertLifecycleSchemaShape(plan);
  assert.ok(plan.safety.collisions.includes(".wiki-standard.yaml"));
  assert.ok(plan.safety.collisions.includes("knowledge/index.md"));
  assert.ok(plan.layout.filter((entry) => entry.collision).every((entry) => entry.action === "preserve-and-review"));
  assert.match(plan.clarificationProtocol.nextQuestion, /^Question 1 of 2:/);
  assert.match(plan.clarificationProtocol.nextQuestion, /research topic seed.*subject-empty local wiki/i);
  assert.match(plan.input.standardRevision, /^[0-9a-f]{40}$/);
  assert.equal(plan.proposedManifest.standard.revision, plan.input.standardRevision);
  assert.equal(plan.input.wikiUrl, null);
  assert.equal(plan.input.wikiUrlResolution, "implementation-auto-reserve-conflict-free-loopback");
  assert.equal(plan.input.deployment, "none");
  assert.equal(plan.input.proposedAccent, "#0b7285");
  assert.equal(plan.proposedManifest.capabilities.deployment, false);
  assert.equal(plan.candidate.starter.bootstrap.invocation, "standard-repository-url-only");
  assert.ok(plan.layout.some((entry) => entry.path === "CLAUDE.md" && entry.classification === "render-template"));
  assert.ok(plan.layout.some((entry) => entry.path === "docs/project/status.md" && entry.classification === "render-template"));
  assert.deepEqual(plan.unresolvedInputs, [
    "starting point: research topic seed or subject-empty local wiki",
    "accent colour (proposed default #0b7285 when no evidenced brand colour exists)",
  ]);
  assert.deepEqual(plan.automaticResolutions, [
    "Implementation must serialize shared-register and live-listener checks, atomically reserve a conflict-free loopback endpoint, publish its exact service identity marker, and record the resulting concrete Wiki URL.",
  ]);
});

test("init discovery rejects conflicting starting modes and invalid accent input", () => {
  const target = path.join(ROOT, "fixtures/lifecycle/not-created-by-dry-run");
  const conflicting = run("init", target, "--dry-run", "--seed", "seed", "--blank", "--json");
  assert.equal(conflicting.status, 2);
  assert.match(conflicting.stderr, /either --seed or --blank, not both/);

  const invalidAccent = run("init", target, "--dry-run", "--blank", "--accent", "teal", "--json");
  assert.equal(invalidAccent.status, 2);
  assert.match(invalidAccent.stderr, /six-digit hex colour/);

  const sameRoot = run("init", ROOT, "--dry-run", "--blank", "--json");
  assert.equal(sameRoot.status, 2);
  assert.match(sameRoot.stderr, /independent repository path/);
});

test("subject-empty discovery asks for a title before the accent and invents no topic", () => {
  const target = path.join(ROOT, "fixtures/lifecycle/not-created-by-dry-run");
  const result = run("init", target, "--dry-run", "--blank", "--profile", "portable-core", "--json");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.input.startingPoint, "subject-empty-local");
  assert.equal(plan.input.subjectEmpty, true);
  assert.equal(plan.input.topic, null);
  assert.deepEqual(plan.unresolvedInputs, [
    "project title for the subject-empty local wiki",
    "accent colour (proposed default #0b7285 when no evidenced brand colour exists)",
  ]);
  assert.match(plan.clarificationProtocol.nextQuestion, /^Question 1 of 2: Confirm project title/);
  const homepageTemplate = readFileSync(path.join(ROOT, "starter/templates/docs/index.md.tmpl"), "utf8");
  assert.match(homepageTemplate, /GOVERNING_QUESTION_CALLOUT_OR_SUBJECT_EMPTY_NOTICE/);
  assert.doesNotMatch(homepageTemplate, /\{\{GOVERNING_QUESTION\}\}/);
});

test("full-profile module and CLI emit a schema-valid conformant report from explicit gate evidence", () => {
  const automated = [
    "DKBWS-CORE-001",
    "DKBWS-CORE-002",
    "DKBWS-OKF-001",
    "DKBWS-OKF-002",
    "DKBWS-OKF-003",
  ].map((requirement) => ({ requirement, status: "pass", evidence: ["suite"] }));
  const receipt = receiptFor(POSITIVE, "portable-core", automated);
  const report = buildFullProfileReport({ target: POSITIVE, receipt });
  assert.equal(report.command, "verify");
  assert.equal(report.summary.profileComplete, true);
  assert.equal(report.summary.evaluationComplete, true);
  assert.equal(report.verification.result.conformance, "conformant");
  assert.equal(report.requirementResults.find((item) => item.requirement === "DKBWS-SEC-001").status, "waived");

  const validate = new Ajv2020({ strict: false, allErrors: true }).compile(REPORT_SCHEMA);
  assert.equal(validate(report), true, JSON.stringify(validate.errors));

  const receiptDirectory = mkdtempSync(path.join(os.tmpdir(), "denchco-full-report-"));
  try {
    const receiptPath = path.join(receiptDirectory, "receipt.json");
    writeFileSync(receiptPath, JSON.stringify(receipt), "utf8");
    const cli = spawnSync(process.execPath, [
      FULL_REPORT_CLI,
      "--target",
      POSITIVE,
      "--receipt",
      receiptPath,
      "--compact",
    ], { cwd: ROOT, encoding: "utf8" });
    assert.equal(cli.status, 0, cli.stderr || cli.stdout);
    assert.equal(JSON.parse(cli.stdout).summary.profileComplete, true);
  } finally {
    rmSync(receiptDirectory, { recursive: true, force: true });
  }
});

test("full-profile reporting leaves absent gates not checked and rejects unsupported pass evidence", () => {
  const partialReceipt = receiptFor(POSITIVE, "portable-core", [], {
    gates: [],
    canonicalMutation: { status: "not-checked", changedPaths: [], reason: "Fixture omitted the mutation gate." },
  });
  const partial = buildFullProfileReport({ target: POSITIVE, receipt: partialReceipt });
  assert.equal(partial.summary.profileComplete, false);
  assert.equal(partial.summary.evaluationComplete, false);
  assert.ok(partial.summary.notCheckedRequirements >= 1);
  assert.ok(partial.outstandingManualChecks.length >= 1);

  const invalid = receiptFor(POSITIVE, "portable-core", [{
    requirement: "DKBWS-CORE-001",
    status: "pass",
    evidence: [],
  }], {
    gates: [{
      id: "unsupported-pass",
      status: "pass",
      exitCode: 0,
      evidence: [],
      results: [{ requirement: "DKBWS-CORE-001", status: "pass", evidence: [] }],
    }],
  });
  assert.throws(
    () => buildFullProfileReport({ target: POSITIVE, receipt: invalid }),
    (error) => error instanceof ReceiptError && /does not match|no explicit evidence/.test(error.message),
  );
});

test("reserved verification receipt paths reject project-only consumer summaries", () => {
  const summary = JSON.parse(readFileSync(INVALID_CONSUMER_RECEIPT, "utf8"));
  const validate = new Ajv2020({ strict: false, allErrors: true }).compile(RECEIPT_SCHEMA);
  assert.equal(validate(summary), false);
  assert.ok(validate.errors.some((error) => error.keyword === "required"));
  assert.throws(
    () => buildFullProfileReport({ target: ROOT, receipt: summary }),
    (error) => error instanceof ReceiptError && /does not match/.test(error.message),
  );
});

test("distribution provenance cannot satisfy Standard Production maintainer provenance", () => {
  const catalogue = loadRequirementCatalogue({ standardRoot: ROOT });
  const profile = loadProfile("standard-production", { standardRoot: ROOT, requirementIds: catalogue.ids });
  const results = profile.requirements
    .filter((requirement) => requirement !== "DKBWS-PROV-001")
    .map((requirement) => requirement === "DKBWS-SEC-001"
      ? {
        requirement,
        status: "pass",
        evidence: ["suite"],
        subcontrols: [
          "secrets-and-authorization",
          "personal-and-confidential-data",
          "copyright-licensing-and-retention",
          "untrusted-and-generated-content",
        ].map((id) => ({ id, status: "pass", evidence: ["suite"] })),
      }
      : { requirement, status: "pass", evidence: ["suite"] });
  const receipt = receiptFor(ROOT, "standard-production", results, {
    provenance: {
      requirement: "DKBWS-PROV-001",
      mode: "distribution",
      status: "not-checked",
      readOnly: true,
      git: { status: "pass" },
      jujutsu: { status: "not-checked", reason: "Distribution mode." },
    },
  });
  const report = buildFullProfileReport({ target: ROOT, receipt });
  assert.equal(report.requirementResults.find((item) => item.requirement === "DKBWS-PROV-001").status, "not-checked");
  assert.ok(report.capabilityStates.some((item) => item.expected === null && item.verificationStatus === "not-checked"));
  assert.deepEqual(selectedNotCheckedCapabilityIds(report), ["jujutsu"]);
  assert.equal(report.summary.profileComplete, false);
  assert.equal(report.summary.evaluationComplete, false);
});

test("maintainer provenance also requires the end-of-development-turn instruction and helper gate", () => {
  const provenance = {
    requirement: "DKBWS-PROV-001",
    mode: "maintainer",
    status: "pass",
    readOnly: true,
    git: { status: "pass" },
    jujutsu: { status: "pass" },
  };
  const missingPolicy = buildFullProfileReport({
    target: ROOT,
    receipt: receiptFor(ROOT, "standard-production", [], { provenance, gates: [] }),
  });
  const missingResult = missingPolicy.requirementResults.find((item) => item.requirement === "DKBWS-PROV-001");
  assert.equal(missingResult.status, "not-checked");
  assert.match(missingResult.reason, /instruction\/helper gate/);

  const completePolicy = buildFullProfileReport({
    target: ROOT,
    receipt: receiptFor(ROOT, "standard-production", [{
      requirement: "DKBWS-PROV-001",
      status: "pass",
      evidence: ["suite"],
    }], { provenance }),
  });
  const completeResult = completePolicy.requirementResults.find((item) => item.requirement === "DKBWS-PROV-001");
  assert.equal(completeResult.status, "pass");
  assert.match(completeResult.reason, /end-of-development-turn commit mechanism/);
});

test("full-profile conformance fails required-false and exact-value capability drift", () => {
  withTemporaryRoot((root) => {
    writePortableProject(root);
    writeFileSync(path.join(root, ".wiki-standard.yaml"), [
      "schema: https://example.test/manifest-v1.json",
      "standard:",
      "  name: DenchCo Knowledge Base Wiki Standard",
      "  version: 0.1.0-candidate",
      "  source: local-test",
      "profile: standard-production",
      "okf_version: '0.2'",
      "roles:",
      "  okf_bundle: knowledge",
      "capabilities:",
      "  evidence_governance: false",
      "  human_wiki: true",
      "  llm_wiki: true",
      "  human_renderer: wrong-renderer",
      "  graphify: true",
      "  local_browser_runtimes: true",
      "  browser_verification: true",
      "  local_service: fixture-user-service",
      "  jujutsu: true",
      "deviations: []",
      "",
    ].join("\n"), "utf8");
    const catalogue = loadRequirementCatalogue({ standardRoot: ROOT });
    const profile = loadProfile("standard-production", { standardRoot: ROOT, requirementIds: catalogue.ids });
    const results = profile.requirements
      .filter((requirement) => requirement !== "DKBWS-PROV-001")
      .map((requirement) => requirement === "DKBWS-SEC-001"
        ? {
          requirement,
          status: "pass",
          evidence: ["suite"],
          subcontrols: [
            "secrets-and-authorization",
            "personal-and-confidential-data",
            "copyright-licensing-and-retention",
            "untrusted-and-generated-content",
          ].map((id) => ({ id, status: "pass", evidence: ["suite"] })),
        }
        : { requirement, status: "pass", evidence: ["suite"] });
    const receipt = receiptFor(root, "standard-production", results, {
      provenance: {
        requirement: "DKBWS-PROV-001",
        mode: "maintainer",
        status: "pass",
        readOnly: true,
        git: { status: "pass" },
        jujutsu: { status: "pass" },
      },
    });
    const report = buildFullProfileReport({ target: root, receipt });
    assert.equal(report.summary.profileComplete, false);
    assert.equal(report.summary.failedCapabilities, 4);
    assert.equal(report.capabilityStates.find((item) => item.id === "evidence_governance").verificationStatus, "fail");
    assert.equal(report.capabilityStates.find((item) => item.id === "human_renderer").verificationStatus, "fail");
    assert.equal(report.capabilityStates.find((item) => item.id === "standard_change_intake").verificationStatus, "fail");
    assert.equal(report.capabilityStates.find((item) => item.id === "development_response_links").verificationStatus, "fail");
  });
});
