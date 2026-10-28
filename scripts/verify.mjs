#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { selectedNotCheckedCapabilityIds } from "./full-profile-report.mjs";

const root = process.cwd();
const derivedOutputs = [
  "site/",
  "site-local/",
  "zensical.local.toml",
  "zensical.appearance.toml",
  "graphify-out/",
  ".cache/",
  "docs/assets/vendor/",
  "docs/assets/appearance/",
  "docs/assets/graphify/",
  "output/verification/",
  "output/standard-proposals/",
  "GRAPH_REPORT.md",
];
const environmentRoots = new Set([".git", ".jj", ".venv", "node_modules", ".playwright-cli"]);
const startedAt = new Date().toISOString();
const provenanceMode = process.env.DKBWS_PROVENANCE_MODE ?? "maintainer";
const gates = [
  "check:toolchain",
  "build",
  "check",
  "check:graphify",
  "check:citations-built",
  "check:browser",
  "check:appearance-browser",
  ...(provenanceMode === "maintainer" ? ["service:status"] : []),
];
const receiptDirectory = path.join(root, "output", "verification");
const receiptPath = path.join(receiptDirectory, "receipt.json");
const reportPath = path.join(receiptDirectory, "conformance-report.json");

for (const generatedReceipt of [receiptPath, reportPath]) rmSync(generatedReceipt, { force: true });

const ignoreFailures = derivedOutputs.filter((entry) => !isIgnored(entry));
if (ignoreFailures.length) {
  console.error("Verification cannot start because declared derived outputs are not ignored:");
  for (const entry of ignoreFailures) console.error(`- ${entry}`);
  process.exit(1);
}

const canonicalBefore = snapshotCanonical();
const protectedBefore = snapshotProtectedIgnored();
console.log(`Verification mutation guard: ${canonicalBefore.size} canonical files snapshotted before gates.`);

let gateFailure = null;
for (const gate of gates) {
  console.log(`\n[verify] npm run ${gate}`);
  const result = spawnSync("npm", ["run", gate], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    gateFailure = `${gate}: ${result.error.message}`;
    break;
  }
  if (result.status !== 0) {
    gateFailure = `${gate}: exited ${result.status ?? `after signal ${result.signal}`}`;
    break;
  }
}

const canonicalAfter = snapshotCanonical();
const protectedAfter = snapshotProtectedIgnored();
const mutations = [
  ...compareSnapshots(canonicalBefore, canonicalAfter, "canonical"),
  ...compareSnapshots(protectedBefore, protectedAfter, "ignored non-derived"),
];

if (gateFailure || mutations.length) {
  console.error("\nVerification failed.");
  if (gateFailure) console.error(`- gate failure: ${gateFailure}`);
  if (mutations.length) {
    console.error("- unexpected repository mutations:");
    for (const mutation of mutations) console.error(`  - ${mutation}`);
  }
  process.exit(1);
}

const provenance = commandJson(
  process.execPath,
  ["scripts/check-provenance.mjs", "--mode", provenanceMode, "--json"],
  "provenance receipt",
);
const receipt = buildReceipt(provenance, canonicalAfter.size);
mkdirSync(receiptDirectory, { recursive: true });
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

const fullReport = spawnSync(
  process.execPath,
  ["scripts/full-profile-report.mjs", "--target", ".", "--receipt", receiptPath],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
if (fullReport.error) fail(`full-profile report could not run: ${fullReport.error.message}`);
let parsedReport;
try {
  parsedReport = JSON.parse(fullReport.stdout);
} catch (error) {
  fail(`full-profile report did not emit JSON: ${error.message}\n${fullReport.stderr.trim()}`);
}
writeFileSync(reportPath, `${JSON.stringify(parsedReport, null, 2)}\n`);

if (provenanceMode === "maintainer") {
  if (fullReport.status !== 0 || parsedReport.summary?.profileComplete !== true) {
    fail(`maintainer full-profile report is not conformant: ${fullReport.stderr.trim() || parsedReport.summary?.status}`);
  }
} else if (provenanceMode === "distribution") {
  const notChecked = (parsedReport.requirementResults ?? [])
    .filter((result) => result.status === "not-checked")
    .map((result) => result.requirement);
  const notCheckedCapabilities = selectedNotCheckedCapabilityIds(parsedReport);
  const failed = (parsedReport.requirementResults ?? []).filter((result) => result.status === "fail");
  const expectedDistributionGap = exactSet(notChecked, ["DKBWS-PROV-001", "DKBWS-RUNTIME-002"]);
  const expectedCapabilityGap = exactSet(notCheckedCapabilities, ["jujutsu", "local_service"]);
  if (![0, 1].includes(fullReport.status) || failed.length || parsedReport.summary?.failedCapabilities !== 0 || !expectedDistributionGap || !expectedCapabilityGap) {
    fail(`distribution report has gaps beyond the explicit maintainer-only provenance and managed-service checks: ${fullReport.stderr.trim() || JSON.stringify({ notChecked, notCheckedCapabilities, failed })}`);
  }
} else {
  fail(`unsupported DKBWS_PROVENANCE_MODE ${provenanceMode}`);
}

console.log("\n[verify] npm run check:schema-artifacts (generated receipt and report)");
const finalSchemaCheck = spawnSync("npm", ["run", "check:schema-artifacts"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (finalSchemaCheck.error || finalSchemaCheck.status !== 0) {
  fail(`generated receipt/report schema validation failed${finalSchemaCheck.error ? `: ${finalSchemaCheck.error.message}` : ""}`);
}

const finalMutations = [
  ...compareSnapshots(canonicalBefore, snapshotCanonical(), "canonical"),
  ...compareSnapshots(protectedBefore, snapshotProtectedIgnored(), "ignored non-derived"),
];
if (finalMutations.length) {
  console.error("\nVerification failed after report generation; unexpected repository mutations:");
  for (const mutation of finalMutations) console.error(`- ${mutation}`);
  process.exit(1);
}

console.log(
  `\nVerification passed without canonical mutation: ${canonicalAfter.size} files unchanged; ` +
  `writes were confined to declared ignored derived outputs. ` +
  `Full-profile report: ${path.relative(root, reportPath)} (${parsedReport.verification.result.evaluation}, ${parsedReport.verification.result.conformance}).`,
);

function buildReceipt(provenance) {
  const manifest = parse(readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"));
  const checkEvidence = [
    evidence("standard-check", "verification-script", "Canonical roles, dependency pins, prompt protocol, and portable source checks.", "scripts/check-standard.mjs"),
    evidence("canonical-content", "verification-script", "Stable sources, evidence rows, LLM workflow, contextual links, and four security subcontrols.", "scripts/check-canonical-content.mjs"),
    evidence("governing-question-repetitions", "verification-script", "Mapped canonical question, bounded reader-source equality, neutral exclusions, and exact repetition routes.", "scripts/check-governing-question-repetitions.mjs"),
    evidence("governing-question-fixtures", "test-suite", "Conforming, ungoverned, mismatched, historical-record, masked-region, and subject-empty fixtures.", "scripts/check-governing-question-repetitions.test.mjs"),
    evidence("reader-source-links", "verification-script", "Stable source-row anchors, individual visible identities, registered authority URLs, and optional idempotent migration.", "scripts/link-source-citations.mjs"),
    evidence("reader-source-link-fixtures", "test-suite", "Positive, negative, ignored-region, Unicode, fence, destination, authority, and idempotence fixtures.", "scripts/link-source-citations.test.mjs"),
    evidence("source-citation-renderer", "renderer-adapter", "Numeric superscript presentation preserves each stable source identity and exact registered destination.", "scripts/source_citations.py"),
    evidence("source-citation-renderer-fixtures", "test-suite", "Positive and negative citation rendering and built-page accounting fixtures.", "scripts/test_source_citations.py"),
    evidence("conformance-fixtures", "test-suite", "Positive, negative, lifecycle, receipt, and lossless OKF fixtures.", "scripts/conformance-cli.test.mjs"),
    evidence("standard-stack-resolver", "verification-script", "Read-only immutable release selection, exact revision and workflow evidence, fixed stack file hashes, and consumer update comparison.", "scripts/standard-stack.mjs"),
    evidence("standard-stack-fixtures", "test-suite", "Release ordering, tag and CI identity, unavailable evidence, read-only update checks, and unchanged-target regressions.", "scripts/standard-stack.test.mjs"),
    evidence("standard-proposal-core", "verification-script", "Tracked proposal validation, deterministic scrubbed rendering, form- and digest-bound approval, fail-closed marker/form/label reconciliation, direct-state invariants, and separately authorised lifecycle transitions.", "scripts/standard-proposal-core.mjs"),
    evidence("standard-proposal-cli", "command-adapter", "Thin local command boundary for read-only checks, disposable preparation, GET-only browser open, and explicit local record transitions.", "scripts/standard-proposal-cli.mjs"),
    evidence("standard-proposal-fixtures", "test-suite", "Positive and negative provenance, direct-edited state, safety, form/label, marker/deduplication, exact-revision registry, immutable release, adoption, and remote-write fixtures.", "scripts/standard-proposal-cli.test.mjs"),
    evidence("standard-proposal-record-schema", "schema-validation", "Versioned tracked consumer proposal authority.", "schema/standard-proposal-record-v1.json"),
    evidence("standard-proposal-registry", "decision-register", "Explicit Standard decision, accepted-requirement, and immutable-release ledger independent of issue state.", "standard-proposals/registry.json"),
    evidence("standard-proposal-form", "governed-form", "Versioned issue-form bytes, required labels, and stable field contract.", "standard-proposals/standard-change-form-v1.yml"),
    evidence("schema-artifacts", "schema-validation", "Ajv Draft 2020-12 compilation and validation of real generated artifacts.", "scripts/check-schema-artifacts.mjs"),
    evidence("design-contract", "design-validation", "Lintable design tokens and governed visual-shape checks.", "DESIGN.md"),
    evidence("design-validator-source", "verification-script", "Reviewed source adaptation and actual compiled dependency identities for all eleven upstream lint rules.", "scripts/design-validator.mjs"),
    evidence("design-validator-fixtures", "test-suite", "Upstream differential fixtures, invalid design data, source integrity and patched Zod implementation guards.", "scripts/design-validator.test.mjs"),
    evidence("node-tooling-fixtures", "test-suite", "URI security regressions and Ajv reference-resolution compatibility.", "scripts/check-tooling-dependencies.test.mjs"),
    evidence("python-tooling-fixtures", "test-suite", "Frozen audit-cache dependencies, lock behaviour, cache roundtrips and bounded malformed MessagePack regression.", "scripts/check-python-tooling.test.py"),
    evidence("appearance-core-fixtures", "test-suite", "Deterministic role derivation, rounded sRGB contrast, strict input validation, runtime width precedence and native configuration preservation.", "scripts/wiki-appearance.test.mjs"),
    evidence("appearance-generation-fixtures", "test-suite", "Absent-config passthrough, deterministic generation, invalid-input safety and shared graph roles.", "scripts/prepare-wiki-appearance.test.mjs"),
    evidence("dependency-lock", "dependency-lock", "Exact npm dependency graph used by build and browser checks.", "package-lock.json"),
    evidence("python-dependency-lock", "dependency-lock", "Exact resolved renderer and Python dependency graph.", "uv.lock"),
    evidence("graph-input-boundary", "verification-script", "Exact Graphify identity, bounded corpus and disabled external preprocessing.", "scripts/graphify-update.py"),
    evidence("graph-input-fixtures", "test-suite", "Benign corpus support and fail-closed preprocessing and symlink rejection.", "scripts/check-graphify-inputs.test.py"),
    evidence("runtime-dependency-contract", "verification-script", "Pinned local runtime asset identity and dependency provenance checks.", "scripts/sync-runtime-assets.mjs"),
    evidence("renderer-dependency-contract", "verification-script", "Exact renderer version, qualified adapter bytes and content-hash checks.", "scripts/patch-zensical-runtime.mjs"),
    evidence("security-policy", "policy", "Secrets, authorization, untrusted-input, and generated-authority boundaries.", "SECURITY.md"),
    evidence("source-policy", "policy", "Personal, confidential, copyright, retention, correction, and deletion boundaries.", "SOURCE_POLICY.md"),
    evidence("licensing-decision", "policy", "Repository-wide MIT licence for original work, with third-party boundaries.", "LICENSING.md"),
    evidence("source-register", "evidence-register", "Stable source identities.", "docs/sources.md"),
    evidence("evidence-matrix", "evidence-matrix", "Claims mapped to support, state, and limitations.", "docs/evidence-matrix.md"),
    evidence("llm-wiki", "agent-contract", "Read order plus ingest, query, lint, authority, and generation boundaries.", "docs/llm-wiki/index.md"),
    evidence("prompt-contract", "prompt-contract", "Sequential clarification, prospective authoring defaults, and content-first development-cycle handoff protocol.", "prompts/instantiate-wiki.md"),
    evidence("next-step-fixtures", "test-suite", "Cadence, three-field format, negative regressions and explicit no-update captured response cases; grounding and uncaptured host output remain outside automated proof.", "scripts/development-next-steps.test.mjs"),
    evidence("authoring-policy", "authoring-policy", "Prospective pragmatic writing scope, protected content and explicit limits of style verification.", "AUTHORING.md"),
    evidence("authoring-template", "authoring-policy", "Always-rendered policy carried by the pinned starter; collision preservation and older-pin boundaries are fixture-tested.", "starter/templates/AUTHORING.md.tmpl"),
    evidence("development-response-links", "verification-script", "Stable diagnostics reject Markdown, HTML, plain-GFM, file/editor and wrong-origin Wiki links; managed-live mode also requires the exact service identity and HTTP 200 for every displayed Wiki route.", "scripts/development-response-links.mjs"),
    evidence("development-response-link-fixtures", "test-suite", "Conforming syntax and managed-live routes plus nonconforming repository-relative, HTML, plain-GFM, absolute, file, editor, wrong-origin, service-identity and route-health cases.", "scripts/development-response-links.test.mjs"),
    evidence("agent-instruction-parity", "agent-contract", "Shared Codex/Claude instructions, import relay, skill parity, cycle guard, parked-work boundary, and end-of-development-turn JJ commit rule.", "AGENTS.md"),
    evidence("jj-turn-helper", "test-suite", "End-of-turn helper independently runs complete verification and maintainer provenance, inspects Git/Jujutsu state, commits changed turns with every failure disclosed, and refuses empty commits.", "scripts/jj-phase.test.mjs"),
    evidence("local-service-contract", "verification-script", "Serialized registry ownership, atomic publication, live-listener deconfliction, exact governed registration and LaunchAgent bytes, versioned marker health, and fail-closed status-gated preview handoff.", "scripts/dev-service.mjs"),
    evidence("local-service-fixtures", "test-suite", "Concurrent locking, stale-owner safety, atomic replacement, wrong-site HTTP 200, live-listener, exact registry/plist, loopback alias, composite status, and preview-refusal fixtures.", "scripts/dev-service.test.mjs"),
    evidence("service-identity-marker", "runtime-identity", "Static identity marker for the registered Standard service.", "docs/assets/service-identity.json"),
    evidence("service-identity-schema", "schema-validation", "Versioned machine contract for managed local service identity markers.", "schema/service-identity-v1.json"),
  ];
  const gatesWithEvidence = [
    {
      id: "reference-toolchain",
      status: "pass",
      command: "npm run check:toolchain",
      exitCode: 0,
      evidence: [
        evidence("reference-toolchain", "verification-script", "Exact Node, npm and uv checked before the Python version probe; all reference versions checked before build or project workload.", "scripts/check-reference-toolchain.mjs"),
        evidence("reference-node", "runtime-pin", "Exact reference Node version.", ".node-version"),
        evidence("reference-python", "runtime-pin", "Exact reference Python version.", ".python-version"),
        evidence("resolver-bootstrap", "dependency-policy", "Dependency-update resolver acceptance is separate from exact reference qualification.", "pyproject.toml"),
      ],
      results: [result("DKBWS-VERIFY-001", ["toolchain"], ["reference-toolchain", "reference-node", "reference-python", "resolver-bootstrap"], "The exact reference-toolchain preflight passed before build; subsequent gates and canonical-input mutation evidence establish the complete verification outcome.")],
    },
    {
      id: "build",
      status: "pass",
      command: "npm run build",
      exitCode: 0,
      evidence: [evidence("strict-site-build", "rendered-site", "Strict Zensical build output.", "site/index.html")],
      results: [result("DKBWS-HUMAN-001", ["strict-build"], ["strict-site-build"], "The strict Human Wiki build completed successfully.")],
    },
    {
      id: "check",
      status: "pass",
      command: "npm run check",
      exitCode: 0,
      evidence: checkEvidence,
      results: [
        result("DKBWS-CORE-001", ["canonical-source"], ["standard-check", "schema-artifacts"]),
        result("DKBWS-CORE-002", ["manifest"], ["standard-check", "schema-artifacts"]),
        result("DKBWS-OKF-001", ["okf-validation", "source-identity", "lossless-fixtures"], ["conformance-fixtures", "schema-artifacts"]),
        result("DKBWS-OKF-002", ["lossless-fixtures"], ["conformance-fixtures", "schema-artifacts"]),
        result("DKBWS-OKF-003", ["bundle-mapping"], ["conformance-fixtures", "schema-artifacts"]),
        result("DKBWS-EVID-001", ["source-register"], ["canonical-content", "source-register"]),
        result("DKBWS-EVID-002", ["evidence-review"], ["canonical-content", "evidence-matrix"]),
        result("DKBWS-LLM-001", ["agent-contract"], ["canonical-content", "llm-wiki"]),
        result("DKBWS-LINK-001", ["source-links"], ["canonical-content"]),
        result("DKBWS-HUMAN-004", ["source-consistency"], ["governing-question-repetitions", "governing-question-fixtures"], "The source gate proved one mapped canonical question and rejected ungoverned exact repetitions within the bounded reader set while leaving excluded records and subject-empty fixtures neutral."),
        result("DKBWS-LINK-002", ["source-links", "renderer-fixtures"], ["reader-source-links", "reader-source-link-fixtures", "source-register", "source-citation-renderer", "source-citation-renderer-fixtures"], "The source and renderer fixtures prove exact-row links, numeric superscripts with accessible stable identities, registered authority URLs, neutral excluded regions, and rejection of missing or malformed rendered citations."),
        result("DKBWS-DESIGN-001", ["design-source", "design-fixtures"], ["design-contract", "design-validator-source", "design-validator-fixtures", "appearance-core-fixtures", "appearance-generation-fixtures"], "Source validation and executable fixtures prove the design contract, runtime width precedence, appearance derivation, absent-config handling and deterministic generation."),
        result("DKBWS-RENDER-001", ["dependencies"], ["standard-check", "dependency-lock", "python-dependency-lock", "runtime-dependency-contract", "renderer-dependency-contract"], "Dependency and adapter checks prove the exact renderer and browser runtime pins, qualified runtime assets and their dependency provenance."),
        result("DKBWS-RUNTIME-002", ["service-fixtures"], ["local-service-contract", "local-service-fixtures"], "Service fixtures prove exact registration, installed-job and loaded-job contracts, static identity handling and fail-closed canonical browser handoff."),
        result("DKBWS-PROMPT-001", ["policy-source", "policy-fixtures"], ["standard-check", "prompt-contract", "agent-instruction-parity", "authoring-policy", "authoring-template", "next-step-fixtures", "standard-stack-resolver", "standard-stack-fixtures"], "Checks prove development-cycle handoff cadence and format, bootstrap, authoring-policy propagation, pinned-template boundaries and shared instruction integrity; they do not measure prose quality or ASD-STE100 compliance."),
        result("DKBWS-PROMPT-002", ["policy-source", "response-fixtures"], ["standard-check", "prompt-contract", "agent-instruction-parity", "development-response-links", "development-response-link-fixtures", "local-service-contract", "local-service-fixtures"], "The exact-valued capability, canonical URL, managed instruction parity, Markdown/HTML/plain-GFM fixtures, and managed-service identity/per-route HTTP contract make non-live Wiki-link substitution detectable and nonconforming for captured responses."),
        result("DKBWS-PROV-001", ["turn-policy"], ["standard-check", "agent-instruction-parity", "jj-turn-helper"], "The shared instructions and executable helper enforce a disclosed JJ commit at every file-changing development-turn boundary."),
        result("DKBWS-UPDATE-001", ["lifecycle-fixtures"], ["conformance-fixtures", "standard-stack-resolver", "standard-stack-fixtures"]),
        result("DKBWS-UPDATE-002", ["record-validation", "lifecycle-fixtures", "approval-fixtures", "release-fixtures", "remote-write-fixtures"], ["standard-check", "standard-proposal-core", "standard-proposal-cli", "standard-proposal-fixtures", "standard-proposal-record-schema", "standard-proposal-registry", "standard-proposal-form", "schema-artifacts"], "The proposal fixtures proved tracked immutable origin, deterministic form- and digest-bound approval, direct-edit state invariants, disclosure rejection, marker deduplication and ambiguous outcomes, fail-closed form/label checks, exact-revision registry bytes, strict release-to-ledger ancestry, immutable public release evidence, explicit issue/decision/release/adoption states, and absence of automatic remote writes or pin changes."),
        result("DKBWS-VERIFY-002", ["report-fixtures"], ["conformance-fixtures", "schema-artifacts"]),
        {
          ...result("DKBWS-SEC-001", [], ["canonical-content", "security-policy", "source-policy", "licensing-decision", "design-validator-source", "design-validator-fixtures", "node-tooling-fixtures", "python-tooling-fixtures"]),
          subcontrols: [
            subcontrol("secrets-and-authorization", ["security-policy"]),
            subcontrol("personal-and-confidential-data", ["security-policy", "source-policy"]),
            subcontrol("copyright-licensing-and-retention", ["source-policy", "licensing-decision"]),
            subcontrol("untrusted-and-generated-content", ["security-policy", "graph-input-boundary", "graph-input-fixtures", "design-validator-fixtures", "node-tooling-fixtures", "python-tooling-fixtures"]),
          ],
        },
      ],
    },
    ...(provenanceMode === "maintainer" ? [{
      id: "managed-service",
      status: "pass",
      command: "npm run service:status",
      exitCode: 0,
      evidence: [
        evidence("managed-service-status-contract", "verification-script", "Exact registry, LaunchAgent bytes, loaded job, canonical URL, and service identity status contract.", "scripts/dev-service.mjs"),
        evidence("managed-service-live-marker", "runtime-identity", "Static identity marker returned by the registered live Standard service.", "docs/assets/service-identity.json"),
      ],
      results: [
        result("DKBWS-RUNTIME-002", ["live-service"], ["managed-service-status-contract", "managed-service-live-marker"], "The maintainer status probe proved the live registered service, exact governed registry fields, byte-identical installed LaunchAgent contract, loaded job, HTTP identity and canonical URL."),
      ],
    }] : []),
    {
      id: "graph",
      status: "pass",
      command: "npm run check:graphify",
      exitCode: 0,
      evidence: [
        evidence("graph-publication", "graph-publication", "Shared schema-versioned 2D/3D graph data.", "docs/assets/graphify/graph.json"),
        evidence("graph-summary", "graph-publication-summary", "Graph counts and interconnection layers.", "docs/assets/graphify/summary.json"),
      ],
      results: [result("DKBWS-GRAPH-001", ["publication"], ["graph-publication", "graph-summary"])],
    },
    {
      id: "built-citations",
      status: "pass",
      command: "npm run check:citations-built",
      exitCode: 0,
      evidence: [
        evidence("built-source-citations", "verification-script", "Independent canonical-source and built-HTML comparison checks every citation-bearing reader page and rejects absent citation rendering.", "scripts/check_rendered_source_citations.py"),
        evidence("built-source-citation-result", "verification-result", "Current whole-built-output citation counts, identities, routes, and validation results.", "output/verification/citations.json"),
      ],
      results: [result("DKBWS-LINK-002", ["built-citations"], ["built-source-citations", "built-source-citation-result"], "The independent built-output check accounts for every canonical citation and verifies numeric superscript markup, full accessible identities, exact registered destinations and rejection of missing citation rendering.")],
    },
    {
      id: "browser",
      status: "pass",
      command: "npm run check:browser",
      exitCode: 0,
      evidence: [
        evidence("browser-contract", "browser-test", "Built-output HTTP, local-runtime, responsive, diagram, and 2D/3D checks.", "scripts/runtime-browser-contract.playwright.js"),
      ],
      results: [
        result("DKBWS-HUMAN-001", ["http", "browser-navigation"], ["browser-contract"], "The Human Wiki returned HTTP 200 and remained usable at tested viewports, including status-free navigation with accessible page links and section controls, and contained scrolling for a representative wide mobile table."),
        result("DKBWS-HUMAN-002", ["browser-presentation"], ["browser-contract"], "The governing-question marker rendered its rail and text in the resolved active accent at desktop and mobile widths while an ordinary quotation remained neutral."),
        result("DKBWS-HUMAN-004", ["browser-repetitions"], ["browser-contract"], "Every exact canonical-question repetition route rendered the same governed text and passed the desktop/mobile accent, neutral-quotation, and containment checks."),
        result("DKBWS-LINK-002", ["browser-citations"], ["browser-contract"], "Browser checks inspect every citation-bearing reader route and every citation at desktop and mobile widths for numeric superscripts, accessible identities, native keyboard focusability, exact-row target URLs and containment. A representative Tab/Enter journey proves the visible focus ring and arrival at the matching source-register row."),
        result("DKBWS-DESIGN-001", ["browser-layout"], ["browser-contract"], "Ordinary entry and architecture Mermaid diagrams retained renderer-default node treatment and passed desktop, tablet, mobile, collision, and accessibility checks."),
        result("DKBWS-GRAPH-001", ["browser-2d", "browser-3d"], ["browser-contract"], "The selected profile's required 2D/3D graph routes rendered at desktop and mobile widths with nonblank canvases and usable controls."),
        result("DKBWS-RENDER-001", ["browser-network"], ["browser-contract"], "The browser observes the required local runtime assets and rejects public CDN requests."),
        result("DKBWS-RUNTIME-001", ["canonical-http"], ["browser-contract"], "The verification runtime served the canonical built Wiki with HTTP 200."),
      ],
    },
    {
      id: "appearance-browser",
      status: "pass",
      command: "npm run check:appearance-browser",
      exitCode: 0,
      evidence: [
        evidence("appearance-browser-fixtures", "browser-test", "Real native palette, width, exact accent, contrast, persistence across adoption and default changes, storage failure and narrow-screen cases.", "scripts/check-wiki-appearance-browser.mjs"),
        evidence("appearance-browser-result", "browser-test", "Current generated fixture results.", "output/verification/appearance/contract.json"),
      ],
      results: [
        result("DKBWS-DESIGN-001", ["browser-defaults", "browser-saved-preferences", "browser-appearance"], ["appearance-browser-fixtures", "appearance-browser-result"], "Browser fixtures prove the Wide fresh-reader fallback, explicit configured defaults, saved Standard/Wide precedence through navigation and reload, missing or invalid storage recovery, mobile containment, contrasting themes, and readable derived roles when the appearance adapter is configured."),
      ],
    },
    {
      id: "canonical-input-mutation",
      status: "pass",
      command: "before/after SHA-256 canonical snapshot",
      exitCode: 0,
      evidence: [{
        id: "canonical-snapshot",
        kind: "mutation-guard",
        description: `${canonicalAfter.size} tracked and unignored canonical files were unchanged across all command gates.`,
        details: { canonicalFiles: canonicalAfter.size, changedPaths: [] },
      }],
      results: [result("DKBWS-VERIFY-001", ["canonical-mutation"], ["canonical-snapshot"])],
    },
  ];
  return {
    $schema: "https://denchco.github.io/knowledge-base-wiki-documentation/schema/verification-receipt-v1.json",
    receiptVersion: "1.0",
    target: root,
    profile: manifest.profile,
    evaluationDate: new Date().toISOString().slice(0, 10),
    startedAt,
    completedAt: new Date().toISOString(),
    environment: {
      runtime: "node",
      runtimeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      ci: Boolean(process.env.CI),
    },
    canonicalMutation: {
      status: "pass",
      changedPaths: [],
      method: "SHA-256 before/after snapshot of Git-tracked and unignored canonical files plus protected ignored non-derived files.",
    },
    gates: gatesWithEvidence,
    provenance,
  };
}

function evidence(id, kind, description, location) {
  const absolute = path.join(root, location);
  const item = { id, kind, description, location };
  try {
    item.sha256 = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  } catch (error) {
    fail(`receipt evidence ${location} is unavailable: ${error.message}`);
  }
  return item;
}

function result(requirement, proofs, evidenceIds, reason = "The successful gate supplied explicit current-repository evidence.") {
  return { requirement, status: "pass", reason, evidence: evidenceIds, ...(proofs.length ? { proofs } : {}) };
}

function subcontrol(id, evidenceIds) {
  return { id, status: "pass", reason: "The canonical content gate verified the required declaration boundary.", evidence: evidenceIds };
}

function exactSet(actual, expected) {
  return actual.length === expected.length
    && expected.every((item) => actual.includes(item));
}

function commandJson(command, args, label) {
  const outcome = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (outcome.error || outcome.status !== 0) fail(`${label} failed: ${outcome.error?.message ?? outcome.stderr.trim()}`);
  try {
    return JSON.parse(outcome.stdout);
  } catch (error) {
    fail(`${label} did not emit JSON: ${error.message}`);
  }
}

function fail(message) {
  console.error(`\nVerification failed: ${message}`);
  process.exit(1);
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: options.encoding ?? "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr).trim()}`);
  }
  return result.stdout;
}

function canonicalPaths() {
  const output = git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "buffer" });
  return output.toString("utf8").split("\0").filter(Boolean).sort();
}

function snapshotCanonical() {
  return snapshotPaths(canonicalPaths());
}

function snapshotProtectedIgnored() {
  const paths = [];
  visit("");
  return snapshotPaths(paths.sort());

  function visit(relativeDirectory) {
    const absoluteDirectory = path.join(root, relativeDirectory);
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const relative = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      if (environmentRoots.has(relative) || isDerived(relative)) continue;
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile() || entry.isSymbolicLink()) {
        if (isIgnored(relative)) paths.push(relative);
      }
    }
  }
}

function snapshotPaths(paths) {
  const snapshot = new Map();
  for (const relative of paths) {
    const absolute = path.join(root, relative);
    try {
      const metadata = lstatSync(absolute);
      const payload = metadata.isSymbolicLink()
        ? Buffer.from(`symlink:${readlinkSync(absolute)}`)
        : readFileSync(absolute);
      snapshot.set(relative, {
        mode: metadata.mode & 0o777,
        sha256: createHash("sha256").update(payload).digest("hex"),
      });
    } catch (error) {
      if (error.code === "ENOENT") snapshot.set(relative, null);
      else throw error;
    }
  }
  return snapshot;
}

function compareSnapshots(before, after, label) {
  const messages = [];
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  for (const entry of paths) {
    if (!before.has(entry)) messages.push(`${label} file added: ${entry}`);
    else if (!after.has(entry)) messages.push(`${label} file deleted: ${entry}`);
    else if (JSON.stringify(before.get(entry)) !== JSON.stringify(after.get(entry))) {
      messages.push(`${label} file changed: ${entry}`);
    }
  }
  return messages;
}

function isIgnored(relative) {
  const probe = relative.endsWith("/") ? `${relative}.dkbws-derived-probe` : relative;
  const result = spawnSync("git", ["check-ignore", "--quiet", "--no-index", "--", probe], {
    cwd: root,
    stdio: "ignore",
  });
  return result.status === 0;
}

function isDerived(relative) {
  return derivedOutputs.some((entry) => {
    const normalized = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    return relative === normalized || relative.startsWith(`${normalized}/`);
  });
}
