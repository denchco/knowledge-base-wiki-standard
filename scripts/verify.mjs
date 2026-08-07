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
  "graphify-out/",
  ".cache/",
  "docs/assets/vendor/",
  "docs/assets/graphify/",
  "output/verification/",
  "GRAPH_REPORT.md",
];
const environmentRoots = new Set([".git", ".jj", ".venv", "node_modules", ".playwright-cli"]);
const gates = ["build", "check", "check:graphify", "check:browser"];
const startedAt = new Date().toISOString();
const provenanceMode = process.env.DKBWS_PROVENANCE_MODE ?? "maintainer";
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
  const expectedDistributionGap = notChecked.length === 1 && notChecked[0] === "DKBWS-PROV-001";
  const expectedCapabilityGap = notCheckedCapabilities.length === 1 && notCheckedCapabilities[0] === "jujutsu";
  if (![0, 1].includes(fullReport.status) || failed.length || parsedReport.summary?.failedCapabilities !== 0 || !expectedDistributionGap || !expectedCapabilityGap) {
    fail(`distribution report has gaps beyond explicit maintainer provenance: ${fullReport.stderr.trim() || JSON.stringify({ notChecked, notCheckedCapabilities, failed })}`);
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
    evidence("conformance-fixtures", "test-suite", "Positive, negative, lifecycle, receipt, and lossless OKF fixtures.", "scripts/conformance-cli.test.mjs"),
    evidence("schema-artifacts", "schema-validation", "Ajv Draft 2020-12 compilation and validation of real generated artifacts.", "scripts/check-schema-artifacts.mjs"),
    evidence("design-contract", "design-validation", "Lintable design tokens and governed visual-shape checks.", "DESIGN.md"),
    evidence("dependency-lock", "dependency-lock", "Exact npm dependency graph used by build and browser checks.", "package-lock.json"),
    evidence("security-policy", "policy", "Secrets, authorization, untrusted-input, and generated-authority boundaries.", "SECURITY.md"),
    evidence("source-policy", "policy", "Personal, confidential, copyright, retention, correction, and deletion boundaries.", "SOURCE_POLICY.md"),
    evidence("licensing-decision", "policy", "Repository-wide MIT licence for original work, with third-party boundaries.", "LICENSING.md"),
    evidence("source-register", "evidence-register", "Stable source identities.", "docs/sources.md"),
    evidence("evidence-matrix", "evidence-matrix", "Claims mapped to support, state, and limitations.", "docs/evidence-matrix.md"),
    evidence("llm-wiki", "agent-contract", "Read order plus ingest, query, lint, authority, and generation boundaries.", "docs/llm-wiki/index.md"),
    evidence("prompt-contract", "prompt-contract", "Sequential clarification plus completion-first, bounded, anti-rabbit-hole handoff protocol.", "prompts/instantiate-wiki.md"),
    evidence("agent-instruction-parity", "agent-contract", "Shared Codex/Claude instructions, import relay, skill parity, cycle guard, parked-work boundary, and end-of-development-turn JJ commit rule.", "AGENTS.md"),
    evidence("jj-turn-helper", "test-suite", "End-of-turn helper verifies, inspects Git/Jujutsu state, commits changed turns including disclosed verification failures, and refuses empty commits.", "scripts/jj-phase.test.mjs"),
    evidence("local-service-contract", "verification-script", "Serialized registry ownership, atomic publication, live-listener deconfliction, versioned marker health, and fail-closed managed status.", "scripts/dev-service.mjs"),
    evidence("local-service-fixtures", "test-suite", "Concurrent locking, stale-owner safety, atomic replacement, wrong-site HTTP 200, live-listener, registry ownership, loopback alias, and status-composition fixtures.", "scripts/dev-service.test.mjs"),
    evidence("service-identity-marker", "runtime-identity", "Static identity marker for the registered Standard service.", "docs/assets/service-identity.json"),
    evidence("service-identity-schema", "schema-validation", "Versioned machine contract for managed local service identity markers.", "schema/service-identity-v1.json"),
  ];
  const gatesWithEvidence = [
    {
      id: "build",
      status: "pass",
      command: "npm run build",
      exitCode: 0,
      evidence: [evidence("strict-site-build", "rendered-site", "Strict Zensical build output.", "site/index.html")],
      results: [result("DKBWS-HUMAN-001", ["strict-site-build"], "The strict Human Wiki build completed successfully.")],
    },
    {
      id: "check",
      status: "pass",
      command: "npm run check",
      exitCode: 0,
      evidence: checkEvidence,
      results: [
        result("DKBWS-CORE-001", ["standard-check", "schema-artifacts"]),
        result("DKBWS-CORE-002", ["standard-check", "schema-artifacts"]),
        result("DKBWS-OKF-001", ["conformance-fixtures", "schema-artifacts"]),
        result("DKBWS-OKF-002", ["conformance-fixtures", "schema-artifacts"]),
        result("DKBWS-OKF-003", ["conformance-fixtures", "schema-artifacts"]),
        result("DKBWS-EVID-001", ["canonical-content", "source-register"]),
        result("DKBWS-EVID-002", ["canonical-content", "evidence-matrix"]),
        result("DKBWS-LLM-001", ["canonical-content", "llm-wiki"]),
        result("DKBWS-LINK-001", ["canonical-content"]),
        result("DKBWS-HUMAN-004", ["governing-question-repetitions", "governing-question-fixtures"], "The source gate proved one mapped canonical question and rejected ungoverned exact repetitions within the bounded reader set while leaving excluded records and subject-empty fixtures neutral."),
        result("DKBWS-LINK-002", ["reader-source-links", "reader-source-link-fixtures", "source-register"], "The source-link gate proved stable row anchors, independent exact-row links, registered named-authority URLs, ignored non-reader regions, and an optional idempotent migration."),
        result("DKBWS-DESIGN-001", ["design-contract"]),
        result("DKBWS-PROMPT-001", ["standard-check", "prompt-contract", "agent-instruction-parity"]),
        result("DKBWS-PROV-001", ["standard-check", "agent-instruction-parity", "jj-turn-helper"], "The shared instructions and executable helper enforce a disclosed JJ commit at every file-changing development-turn boundary."),
        result("DKBWS-UPDATE-001", ["conformance-fixtures"]),
        result("DKBWS-VERIFY-002", ["conformance-fixtures", "schema-artifacts"]),
        result("DKBWS-RUNTIME-002", ["local-service-contract", "local-service-fixtures", "service-identity-marker", "service-identity-schema"], "The managed-service fixtures serialize concurrent reservations, recover only dead stale owners, atomically replace the register, reject registered and live-listener collisions, reject a wrong service returning HTTP 200, and require registry, installation, load, and exact marker identity for status."),
        {
          ...result("DKBWS-SEC-001", ["canonical-content", "security-policy", "source-policy", "licensing-decision"]),
          subcontrols: [
            subcontrol("secrets-and-authorization", ["security-policy"]),
            subcontrol("personal-and-confidential-data", ["security-policy", "source-policy"]),
            subcontrol("copyright-licensing-and-retention", ["source-policy", "licensing-decision"]),
            subcontrol("untrusted-and-generated-content", ["security-policy"]),
          ],
        },
      ],
    },
    {
      id: "graph",
      status: "pass",
      command: "npm run check:graphify",
      exitCode: 0,
      evidence: [
        evidence("graph-publication", "graph-publication", "Shared schema-versioned 2D/3D graph data.", "docs/assets/graphify/graph.json"),
        evidence("graph-summary", "graph-publication-summary", "Graph counts and interconnection layers.", "docs/assets/graphify/summary.json"),
      ],
      results: [result("DKBWS-GRAPH-001", ["graph-publication", "graph-summary"])],
    },
    {
      id: "browser",
      status: "pass",
      command: "npm run check:browser",
      exitCode: 0,
      evidence: [
        evidence("browser-contract", "browser-test", "Built-output HTTP, local-runtime, responsive, diagram, and 2D/3D checks.", "scripts/runtime-browser-contract.playwright.js"),
        evidence("browser-dependency-lock", "dependency-lock", "Playwright and browser runtimes are exactly locked.", "package-lock.json"),
      ],
      results: [
        result("DKBWS-HUMAN-001", ["browser-contract"], "The Human Wiki returned HTTP 200 and remained usable at tested viewports, including contained scrolling for a representative wide mobile table."),
        result("DKBWS-HUMAN-002", ["browser-contract"], "The governing-question marker rendered its rail and text in the resolved active accent at desktop and mobile widths while an ordinary quotation remained neutral."),
        result("DKBWS-HUMAN-004", ["browser-contract"], "Every exact canonical-question repetition route rendered the same governed text and passed the desktop/mobile accent, neutral-quotation, and containment checks."),
        result("DKBWS-HUMAN-003", ["browser-contract"], "Draft navigation markers rendered with readable status text, the dedicated Pen Circle asset, stock-chevron dimensions, shared trailing centreline, vertical row centring, and no page overflow."),
        result("DKBWS-LINK-002", ["browser-contract"], "A representative source identity retained visible brackets and an intelligible native link, accepted keyboard focus, targeted and reached its exact mapped source-register row, and stayed contained at desktop and mobile widths."),
        result("DKBWS-DESIGN-001", ["browser-contract"], "Ordinary entry and architecture Mermaid diagrams retained renderer-default node treatment and passed desktop, tablet, mobile, collision, and accessibility checks."),
        result("DKBWS-GRAPH-001", ["browser-contract"], "The selected profile's required 2D/3D graph routes rendered at desktop and mobile widths with nonblank canvases and usable controls."),
        result("DKBWS-RENDER-001", ["browser-contract", "browser-dependency-lock"]),
        result("DKBWS-RUNTIME-001", ["browser-contract"], "The verification runtime served the canonical built Wiki with HTTP 200."),
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
      results: [result("DKBWS-VERIFY-001", ["canonical-snapshot"])],
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

function result(requirement, evidenceIds, reason = "The successful gate supplied explicit current-repository evidence.") {
  return { requirement, status: "pass", reason, evidence: evidenceIds };
}

function subcontrol(id, evidenceIds) {
  return { id, status: "pass", reason: "The canonical content gate verified the required declaration boundary.", evidence: evidenceIds };
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
