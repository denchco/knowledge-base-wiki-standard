import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

const required = [
  "README.md", "LICENSE", "AGENTS.md", "CLAUDE.md", "DESIGN.md", "DEPENDENCIES.md", ".wiki-standard.yaml",
  ".github/ISSUE_TEMPLATE/config.yml", ".github/ISSUE_TEMPLATE/standard-change.yml",
  ".agents/skills/denchco-kb-wiki-standard/SKILL.md",
  ".claude/skills/denchco-kb-wiki-standard/SKILL.md",
  "GOVERNANCE.md", "SECURITY.md", "SOURCE_POLICY.md", "LICENSING.md", "CHANGELOG.md",
  "docs/index.md", "docs/spec/index.md", "docs/spec/requirements.md",
  "docs/sources.md", "docs/evidence-matrix.md", "docs/validation-queue.md",
  "docs/log.md", "docs/llms.txt", "docs/llm-wiki/index.md", "docs/llm-wiki/standard-proposals.md", "prompts/instantiate-wiki.md",
  "starter/README.md", "starter/starter.yaml", "starter/templates/wiki-standard.yaml.tmpl",
  "starter/templates/AGENTS.md.tmpl", "starter/templates/CLAUDE.md.tmpl",
  "starter/templates/LICENSING.md.tmpl",
  "starter/templates/docs/graph/index.md.tmpl",
  "starter/templates/docs/graph/two-dimensional.md.tmpl",
  "starter/templates/docs/graph/three-dimensional.md.tmpl",
  "starter/templates/docs/assets/service-identity.json.tmpl",
  "starter/templates/docs/project/status.md.tmpl",
  "starter/templates/docs/llm-wiki/standard-proposals.md.tmpl",
  "starter/templates/standard-proposals/README.md.tmpl",
  "docs/conformance/index.md", "docs/conformance/dogfood/comparison.md",
  "docs/llm-wiki/graphify.md", "docs/graph/index.md",
  "docs/graph/two-dimensional.md", "docs/graph/three-dimensional.md",
  "docs/assets/brand/denchco-wordmark.png",
  "docs/assets/pen-circle.svg", "docs/assets/service-identity.json",
  "knowledge/index.md", "knowledge/log.md", "schema/manifest-v1.json", "schema/service-identity-v1.json",
  "schema/conformance-report-v1.json", "schema/okf-v0.2-frontmatter.json",
  "schema/okf-export-v1.json", "schema/lifecycle-plan-v1.json",
  "schema/adoption-audit-report-v1.json", "schema/verification-receipt-v1.json",
  "schema/documentation-sync-snapshot-v1.json",
  "schema/standard-proposal-record-v1.json", "schema/standard-proposal-registry-v1.json",
  "fixtures/conforming/standard-proposal-valid/record.json",
  "fixtures/conforming/standard-proposal-valid/standard-change.yml",
  "fixtures/conforming/standard-proposal-valid/remote/standard-change.yml",
  "fixtures/conforming/standard-proposal-valid/remote/labels.json",
  "fixtures/conforming/standard-proposal-valid/remote/issues.json",
  "fixtures/conforming/standard-proposal-valid/remote/registry.json",
  "fixtures/nonconforming/standard-proposal-state/record.json",
  "fixtures/nonconforming/standard-proposal-safety/record.json",
  "fixtures/nonconforming/standard-proposal-duplicate/first.json",
  "fixtures/nonconforming/standard-proposal-duplicate/second.json",
  "fixtures/nonconforming/standard-proposal-form/standard-change.yml",
  "fixtures/conforming/reader-source-links/docs/sources.md",
  "fixtures/conforming/reader-source-links/docs/evidence-matrix.md",
  "fixtures/nonconforming/reader-source-links/docs/sources.md",
  "fixtures/nonconforming/reader-source-links/docs/evidence-matrix.md",
  "fixtures/conforming/governing-question-repetitions/.wiki-standard.yaml",
  "fixtures/conforming/governing-question-repetitions/docs/index.md",
  "fixtures/conforming/governing-question-repetitions/docs/research/answer.md",
  "fixtures/conforming/governing-question-subject-empty/.wiki-standard.yaml",
  "fixtures/nonconforming/governing-question-repetitions/.wiki-standard.yaml",
  "fixtures/nonconforming/governing-question-repetitions/docs/plain.md",
  "profiles/portable-core.yaml",
  "profiles/standard-production.yaml", "scripts/sync-runtime-assets.mjs",
  "schema/graph-publication-v1.json", "schema/graph-publication-summary-v1.json",
  "scripts/publish-graphify-assets.mjs", "scripts/check-graphify-assets.mjs",
  "scripts/check-visual-shape-contract.mjs", "scripts/check-runtime-browser-contract.mjs",
  "scripts/runtime-browser-contract-config.mjs", "scripts/runtime-browser-contract-config.test.mjs",
  "scripts/runtime-browser-contract.playwright.js", "scripts/serve-built-site.mjs",
  "scripts/check-provenance.mjs", "scripts/check-provenance-mode.mjs", "scripts/check-canonical-content.mjs",
  "scripts/check-governing-question-repetitions.mjs", "scripts/check-governing-question-repetitions.test.mjs",
  "scripts/link-source-citations.mjs", "scripts/link-source-citations.test.mjs",
  "scripts/development-response-links.mjs", "scripts/development-response-links.test.mjs",
  "scripts/check-schema-artifacts.mjs", "scripts/full-profile-report.mjs", "scripts/dev-service.mjs", "scripts/dev-service.test.mjs",
  "scripts/html-script-json.mjs", "scripts/html-script-json.test.mjs", "scripts/jj-phase.mjs", "scripts/jj-phase.test.mjs", "scripts/verify.mjs",
  "scripts/sync-documentation-snapshot.mjs", "scripts/sync-documentation-snapshot.test.mjs",
  "scripts/standard-proposal-core.mjs", "scripts/standard-proposal-cli.mjs", "scripts/standard-proposal-cli.test.mjs",
  "standard-proposals/README.md", "standard-proposals/registry.json", "standard-proposals/standard-change-form-v1.yml",
  "sync/documentation-sync-contract-v1.json"
];

const failures = [];
for (const file of required) if (!existsSync(file)) failures.push(`missing ${file}`);

const requirements = readFileSync("docs/spec/requirements.md", "utf8");
for (const id of ["DKBWS-CORE-001", "DKBWS-OKF-001", "DKBWS-HUMAN-002", "DKBWS-HUMAN-003", "DKBWS-HUMAN-004", "DKBWS-LINK-002", "DKBWS-PROMPT-001", "DKBWS-PROMPT-002", "DKBWS-PROV-001", "DKBWS-RUNTIME-002", "DKBWS-UPDATE-001", "DKBWS-UPDATE-002", "DKBWS-VERIFY-001", "DKBWS-VERIFY-002"])
  if (!requirements.includes(id)) failures.push(`missing requirement ${id}`);

const agents = readFileSync("AGENTS.md", "utf8");
const starterAgents = readFileSync("starter/templates/AGENTS.md.tmpl", "utf8");
const maintenance = readFileSync("docs/llm-wiki/maintenance.md", "utf8");
const starterMaintenance = readFileSync("starter/templates/docs/llm-wiki/maintenance.md.tmpl", "utf8");
const claude = readFileSync("CLAUDE.md", "utf8");
const starterClaude = readFileSync("starter/templates/CLAUDE.md.tmpl", "utf8");
const codexSkill = readFileSync(".agents/skills/denchco-kb-wiki-standard/SKILL.md", "utf8");
const claudeSkill = readFileSync(".claude/skills/denchco-kb-wiki-standard/SKILL.md", "utf8");
const readme = readFileSync("README.md", "utf8");
const prompt = readFileSync("prompts/instantiate-wiki.md", "utf8");
const contributing = readFileSync("CONTRIBUTING.md", "utf8");
const standardManifest = YAML.parse(readFileSync(".wiki-standard.yaml", "utf8"));
const humanAndAgentProfile = YAML.parse(readFileSync("profiles/human-and-agent.yaml", "utf8"));
const starterManifest = YAML.parse(readFileSync("starter/starter.yaml", "utf8"));
const starterEntries = starterManifest?.entries ?? [];
const starterTargets = starterEntries.map((entry) => entry?.target);
if (new Set(starterTargets).size !== starterTargets.length) failures.push("starter target paths must be unique");
if (!(humanAndAgentProfile?.requires ?? []).includes("DKBWS-PROMPT-002")
  || humanAndAgentProfile?.capabilities?.development_response_links !== "live-wiki") {
  failures.push("human-and-agent profile must require DKBWS-PROMPT-002 and exact live-wiki response links");
}
for (const entry of starterEntries.filter((candidate) => candidate?.classification === "render-template")) {
  if (!entry.template || !existsSync(entry.template)) failures.push(`starter render-template ${entry.target} has no existing template`);
}
for (const target of ["AGENTS.md", "DEPENDENCIES.md", "docs/llm-wiki/index.md", "docs/llm-wiki/maintenance.md"]) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (!(entry?.requirements ?? []).includes("DKBWS-PROV-001")) {
    failures.push(`starter ${target} must carry the DKBWS-PROV-001 development-turn boundary`);
  }
}
const starterJjPhase = starterEntries.find((candidate) => candidate?.target === "scripts/jj-phase.mjs");
if (starterJjPhase?.classification !== "adapt-from-release"
  || starterJjPhase?.source !== "scripts/jj-phase.mjs"
  || starterJjPhase?.planning_only !== true
  || !(starterJjPhase?.requirements ?? []).includes("DKBWS-PROV-001")) {
  failures.push("starter must adapt the pinned end-of-development-turn JJ helper for DKBWS-PROV-001");
}
const starterSourceLinks = starterEntries.find((candidate) => candidate?.target === "scripts/link-source-citations.mjs");
if (starterSourceLinks?.classification !== "adapt-from-release"
  || starterSourceLinks?.source !== "scripts/link-source-citations.mjs"
  || starterSourceLinks?.planning_only !== true
  || !(starterSourceLinks?.requirements ?? []).includes("DKBWS-LINK-002")) {
  failures.push("starter must adapt the pinned reader source-link checker for DKBWS-LINK-002");
}
const starterGoverningQuestion = starterEntries.find((candidate) => candidate?.target === "scripts/check-governing-question-repetitions.mjs");
if (starterGoverningQuestion?.classification !== "adapt-from-release"
  || starterGoverningQuestion?.source !== "scripts/check-governing-question-repetitions.mjs"
  || starterGoverningQuestion?.planning_only !== true
  || !(starterGoverningQuestion?.requirements ?? []).includes("DKBWS-HUMAN-004")) {
  failures.push("starter must adapt the bounded governing-question consistency checker for DKBWS-HUMAN-004");
}
for (const target of ["scripts/development-response-links.mjs", "scripts/development-response-links.test.mjs"]) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (entry?.classification !== "adapt-from-release"
    || entry?.source !== target
    || entry?.planning_only !== true
    || !(entry?.requirements ?? []).includes("DKBWS-PROMPT-002")) {
    failures.push(`starter must adapt ${target} for DKBWS-PROMPT-002`);
  }
}
for (const [target, classification, source] of [
  ["scripts/standard-proposal-core.mjs", "adapt-from-release", "scripts/standard-proposal-core.mjs"],
  ["scripts/standard-proposal-cli.mjs", "adapt-from-release", "scripts/standard-proposal-cli.mjs"],
  ["scripts/standard-proposal-cli.test.mjs", "adapt-from-release", "scripts/standard-proposal-cli.test.mjs"],
  ["schema/standard-proposal-record-v1.json", "adapt-from-release", "schema/standard-proposal-record-v1.json"],
  ["schema/standard-proposal-registry-v1.json", "adapt-from-release", "schema/standard-proposal-registry-v1.json"],
  ["standard-proposals/standard-change-form-v1.yml", "adapt-from-release", "standard-proposals/standard-change-form-v1.yml"],
  ["fixtures/conforming/standard-proposal-valid/", "adapt-from-release", "fixtures/conforming/standard-proposal-valid/"],
  ["fixtures/nonconforming/standard-proposal-state/", "adapt-from-release", "fixtures/nonconforming/standard-proposal-state/"],
  ["fixtures/nonconforming/standard-proposal-safety/", "adapt-from-release", "fixtures/nonconforming/standard-proposal-safety/"],
  ["fixtures/nonconforming/standard-proposal-duplicate/", "adapt-from-release", "fixtures/nonconforming/standard-proposal-duplicate/"],
  ["fixtures/nonconforming/standard-proposal-form/", "adapt-from-release", "fixtures/nonconforming/standard-proposal-form/"],
]) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (entry?.classification !== classification
    || entry?.source !== source
    || entry?.planning_only !== true
    || !(entry?.requirements ?? []).includes("DKBWS-UPDATE-002")) {
    failures.push(`starter must adapt ${target} for DKBWS-UPDATE-002`);
  }
}
for (const [target, template] of [
  ["standard-proposals/README.md", "starter/templates/standard-proposals/README.md.tmpl"],
  ["docs/llm-wiki/standard-proposals.md", "starter/templates/docs/llm-wiki/standard-proposals.md.tmpl"],
]) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (entry?.classification !== "render-template"
    || entry?.template !== template
    || !(entry?.requirements ?? []).includes("DKBWS-UPDATE-002")) {
    failures.push(`starter must render ${target} for DKBWS-UPDATE-002`);
  }
}
for (const target of [".wiki-standard.yaml", "AGENTS.md", "DEPENDENCIES.md", "SECURITY.md", "SOURCE_POLICY.md", "LICENSING.md", "docs/llm-wiki/index.md", "docs/llm-wiki/context-map.md", "docs/llm-wiki/maintenance.md", "package.json", ".github/workflows/verify.yml"]) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (!(entry?.requirements ?? []).includes("DKBWS-UPDATE-002")) {
    failures.push(`starter ${target} must carry the DKBWS-UPDATE-002 proposal boundary`);
  }
}
for (const target of [".wiki-standard.yaml", "AGENTS.md", "CLAUDE.md", "docs/llm-wiki/index.md", "docs/llm-wiki/context-map.md", "docs/llm-wiki/maintenance.md", "package.json", ".github/workflows/verify.yml"]) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (!(entry?.requirements ?? []).includes("DKBWS-PROMPT-002")) {
    failures.push(`starter ${target} must carry the DKBWS-PROMPT-002 live-Wiki response boundary`);
  }
}
const starterWikiManifest = readFileSync("starter/templates/wiki-standard.yaml.tmpl", "utf8");
if (!starterWikiManifest.includes("standard_change_intake: true")) failures.push("starter manifest must select the DKBWS-UPDATE-002 proposal capability");
if (!starterWikiManifest.includes('development_response_links: "live-wiki"') || !starterWikiManifest.includes('human_wiki_url: "{{WIKI_URL}}"')) {
  failures.push("starter manifest must select DKBWS-PROMPT-002 with a rendered canonical Wiki URL");
}
if (standardManifest?.roles?.governing_question !== "docs/index.md") {
  failures.push("Standard manifest must map the authoritative governing-question source");
}
if (standardManifest?.capabilities?.standard_change_intake !== true) {
  failures.push("Standard manifest must select the DKBWS-UPDATE-002 standard_change_intake capability");
}
if (standardManifest?.capabilities?.development_response_links !== "live-wiki") {
  failures.push("Standard manifest must select the exact DKBWS-PROMPT-002 live-wiki capability");
}
if (standardManifest?.capabilities?.human_wiki_url !== "http://127.0.0.1:8017/") {
  failures.push("Standard manifest must declare its exact canonical live Wiki URL");
}
const questionReaderSources = standardManifest?.capabilities?.governing_question?.reader_sources;
if (!Array.isArray(questionReaderSources) || !questionReaderSources.includes("docs/index.md") || !questionReaderSources.includes("docs/architecture.md")) {
  failures.push("Standard manifest must bound both canonical governing-question reader routes");
}
const starterService = starterEntries.find((candidate) => candidate?.target === "scripts/dev-service.mjs");
if (starterService?.classification !== "adapt-from-release"
  || starterService?.source !== "scripts/dev-service.mjs"
  || starterService?.planning_only !== true
  || !(starterService?.requirements ?? []).includes("DKBWS-RUNTIME-002")) {
  failures.push("starter must adapt the managed local service contract for DKBWS-RUNTIME-002");
}
const starterServiceMarker = starterEntries.find((candidate) => candidate?.target === "docs/assets/service-identity.json");
if (starterServiceMarker?.classification !== "render-template"
  || starterServiceMarker?.template !== "starter/templates/docs/assets/service-identity.json.tmpl"
  || starterServiceMarker?.always !== true
  || !(starterServiceMarker?.requirements ?? []).includes("DKBWS-RUNTIME-002")) {
  failures.push("starter must render a project-owned managed service marker for DKBWS-RUNTIME-002");
}
for (const target of ["SECURITY.md", "SOURCE_POLICY.md", "LICENSING.md"]) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (entry?.classification !== "render-template" || entry?.always !== true || !(entry?.requirements ?? []).includes("DKBWS-SEC-001")) {
    failures.push(`starter ${target} must be an always-present DKBWS-SEC-001 render template`);
  }
}
const starterSecurity = readFileSync("starter/templates/SECURITY.md.tmpl", "utf8");
const starterSourcePolicy = readFileSync("starter/templates/SOURCE_POLICY.md.tmpl", "utf8");
const starterLicensing = readFileSync("starter/templates/LICENSING.md.tmpl", "utf8");
for (const [label, source, patterns] of [
  ["secrets-and-authorization", starterSecurity, [/Secrets stay outside/, /explicit authorization/, /least-privilege/]],
  ["personal-and-confidential-data", `${starterSecurity}\n${starterSourcePolicy}`, [/Personal or confidential data/, /redacted/, /access-controlled/, /Deletion and correction/]],
  ["copyright-licensing-and-retention", `${starterSourcePolicy}\n${starterLicensing}`, [/licen[cs]e/i, /Do not redistribute/, /retention/i, /removal consequences|Deletion and correction/]],
  ["untrusted-and-generated-content", starterSecurity, [/untrusted inputs/, /must not execute/, /no independent evidence authority/, /sanitized/]],
]) {
  for (const pattern of patterns) if (!pattern.test(source)) failures.push(`starter DKBWS-SEC-001 ${label} lacks ${pattern}`);
}
if (!starterLicensing.includes("{{REPOSITORY_LICENCE_DECISION}}")) failures.push("starter licensing must require an explicit repository licence decision");
if (/\bMIT\b/.test(starterLicensing)) failures.push("starter licensing must not hardcode the Standard's MIT licence into consumers");
const graphTemplates = [
  ["docs/graph/index.md", "starter/templates/docs/graph/index.md.tmpl", null],
  ["docs/graph/two-dimensional.md", "starter/templates/docs/graph/two-dimensional.md.tmpl", "2d"],
  ["docs/graph/three-dimensional.md", "starter/templates/docs/graph/three-dimensional.md.tmpl", "3d"],
];
for (const [target, template, view] of graphTemplates) {
  const entry = starterEntries.find((candidate) => candidate?.target === target);
  if (entry?.classification !== "render-template" || entry?.template !== template || !(entry?.requirements ?? []).includes("DKBWS-GRAPH-001")) {
    failures.push(`starter ${target} must use its governed DKBWS-GRAPH-001 render template`);
    continue;
  }
  const source = readFileSync(template, "utf8");
  if (/kb-graph|data-graph-source/.test(source)) failures.push(`${template} retains a stale graph mount hook`);
  if (view && (!source.includes('class="graph-shell"') || !source.includes(`data-graph-view="${view}"`))) {
    failures.push(`${template} lacks the ${view} graph-shell mount contract`);
  }
}
const starterGraphIndex = readFileSync("starter/templates/docs/graph/index.md.tmpl", "utf8");
for (const phrase of ["generated discovery aids", "not evidence", "canonical Markdown", "source register", "(two-dimensional.md)", "(three-dimensional.md)"]) {
  if (!starterGraphIndex.includes(phrase)) failures.push(`starter graph index lacks ${phrase}`);
}
const starterDependencies = readFileSync("starter/templates/DEPENDENCIES.md.tmpl", "utf8");
for (const phrase of ["output/verification/receipt.json", "verification-receipt v1", "output/verification/conformance-report.json", "project-only verification summary", "sync:documentation:*", "verify:workspace", "not part of a normal consumer dependency closure"]) {
  if (!starterDependencies.includes(phrase)) failures.push(`starter dependency contract lacks verification closure: ${phrase}`);
}
for (const [name, text] of [["AGENTS.md", agents], ["prompt", prompt]]) {
  if (!text.includes("Question 1 of N")) failures.push(`${name} lacks sequential question protocol`);
}
if (claude.trim() !== "@AGENTS.md") failures.push("CLAUDE.md must contain only the canonical @AGENTS.md import");
if (!starterClaude.split(/\r?\n/).some((line) => line.trim() === "@AGENTS.md")) {
  failures.push("starter CLAUDE.md template must import AGENTS.md");
}
if (codexSkill !== claudeSkill) failures.push("Codex and Claude Standard skills must be byte-identical");
for (const [name, source] of [
  ["AGENTS.md", agents],
  ["starter AGENTS.md", starterAgents],
  ["Standard skill", codexSkill],
  ["CONTRIBUTING.md", contributing],
  ["Standard maintenance", maintenance],
  ["starter maintenance", starterMaintenance],
]) {
  for (const phrase of ["tracked", "pinned Standard", "user", "closed issue", "acceptance", "release", "adoption"]) {
    if (!source.includes(phrase)) failures.push(`${name} lacks DKBWS-UPDATE-002 proposal safeguard: ${phrase}`);
  }
  if (source.includes("output/standard-change-proposal.md")) failures.push(`${name} retains the obsolete ignored Markdown proposal authority`);
}
for (const [name, source] of [["AGENTS.md", agents], ["starter AGENTS.md", starterAgents], ["Standard skill", codexSkill], ["CONTRIBUTING.md", contributing]]) {
  for (const phrase of ["standard-proposals/", "full Git", "standard:proposal"]) {
    if (!source.includes(phrase)) failures.push(`${name} lacks executable DKBWS-UPDATE-002 proposal contract: ${phrase}`);
  }
}
for (const phrase of [
  "output/standard-proposals/",
  "private paths",
  "stable hidden marker",
  "exact repository, title, body, labels, stable hidden marker, form revision, and payload digest",
  "must never submit it",
  "Issue state",
  "own JJ phase",
]) {
  if (!starterAgents.includes(phrase)) failures.push(`starter AGENTS.md lacks proposal safeguard: ${phrase}`);
}
for (const phrase of ["exact repository, title, labels, body", "`standard-change` label", "user performs GitHub's final submission", "never substitute an automatic issue write", "Do not upload patches, screenshots, or evidence automatically"]) {
  if (!contributing.includes(phrase)) failures.push(`CONTRIBUTING.md lacks proposal submission boundary: ${phrase}`);
}

const liveIssueFormBytes = readFileSync(".github/ISSUE_TEMPLATE/standard-change.yml");
const versionedIssueFormBytes = readFileSync("standard-proposals/standard-change-form-v1.yml");
if (!liveIssueFormBytes.equals(versionedIssueFormBytes)) {
  failures.push("published standard-change issue form must be byte-identical to standard-proposals/standard-change-form-v1.yml");
}
const fixtureIssueFormBytes = readFileSync("fixtures/conforming/standard-proposal-valid/standard-change.yml");
const fixtureRemoteIssueFormBytes = readFileSync("fixtures/conforming/standard-proposal-valid/remote/standard-change.yml");
const changedFixtureIssueFormBytes = readFileSync("fixtures/nonconforming/standard-proposal-form/standard-change.yml");
if (!fixtureIssueFormBytes.equals(fixtureRemoteIssueFormBytes)) failures.push("conforming proposal form fixture must be byte-identical to its remote observation");
if (fixtureIssueFormBytes.equals(changedFixtureIssueFormBytes)) failures.push("nonconforming proposal form fixture must change the bound form bytes");
const fixtureLabels = JSON.parse(readFileSync("fixtures/conforming/standard-proposal-valid/remote/labels.json", "utf8"));
if (JSON.stringify(fixtureLabels) !== JSON.stringify(["enhancement", "standard-change"])) failures.push("conforming proposal remote fixture must expose both governed labels");
const issueForm = YAML.parse(liveIssueFormBytes.toString("utf8"));
const issueConfig = YAML.parse(readFileSync(".github/ISSUE_TEMPLATE/config.yml", "utf8"));
if (issueForm?.name !== "Propose a standard change") failures.push("standard-change issue form must retain its governed name");
if (JSON.stringify(issueForm?.labels) !== JSON.stringify(["enhancement", "standard-change"])) {
  failures.push("standard-change issue form must require exactly the enhancement and standard-change labels in governed order");
}
const issueFieldIds = new Set((issueForm?.body ?? []).map((field) => field?.id).filter(Boolean));
for (const id of [
  "schema_version", "proposal_id", "problem", "outcome", "origin", "origin_revision", "origin_jj",
  "standard_revision", "reuse_class", "affected_contract", "dependencies_fallback", "evidence",
  "accessibility_browser", "verification", "migration", "safety", "proposal_marker",
]) {
  if (!issueFieldIds.has(id)) failures.push(`standard-change issue form lacks ${id}`);
}
if (issueConfig?.blank_issues_enabled !== false) failures.push("issue configuration must disable blank issues");
if (!(issueConfig?.contact_links ?? []).some((link) => link?.url === "https://github.com/denchco/knowledge-base-wiki-standard/security/advisories/new")) {
  failures.push("issue configuration must route security reports to private vulnerability reporting");
}

const proposalRegistry = JSON.parse(readFileSync("standard-proposals/registry.json", "utf8"));
const registryEntries = proposalRegistry?.entries ?? [];
const registryIds = registryEntries.map((entry) => entry?.id);
if (new Set(registryIds).size !== registryIds.length) failures.push("standard proposal registry IDs must be unique");
if (JSON.stringify(registryIds) !== JSON.stringify([...registryIds].sort())) failures.push("standard proposal registry entries must be sorted by ID");
const registryMarkers = registryEntries.map((entry) => entry?.marker);
if (new Set(registryMarkers).size !== registryMarkers.length) failures.push("standard proposal registry markers must be unique");
const registryIssueNumbers = registryEntries.filter((entry) => entry?.issue).map((entry) => entry.issue.number);
if (new Set(registryIssueNumbers).size !== registryIssueNumbers.length) failures.push("standard proposal registry issue numbers must be unique");
for (const entry of registryEntries) {
  if (entry.marker !== `<!-- dkbws-standard-proposal:v1:${entry.id} -->`) failures.push(`standard proposal registry marker does not match ${entry.id}`);
  const accepted = entry.acceptedRequirements ?? [];
  if (new Set(accepted).size !== accepted.length || JSON.stringify(accepted) !== JSON.stringify([...accepted].sort())) {
    failures.push(`standard proposal registry accepted requirements must be unique and sorted for ${entry.id}`);
  }
}
const gitignore = readFileSync(".gitignore", "utf8");
if (/^\/?standard-proposals\/?$/m.test(gitignore)) failures.push("tracked standard-proposals/ authority must not be ignored");
if (!/^output\/$/m.test(gitignore)) failures.push("generated proposal payloads must remain under ignored output/");
const proposalCoreSource = readFileSync("scripts/standard-proposal-core.mjs", "utf8");
const proposalCliSource = readFileSync("scripts/standard-proposal-cli.mjs", "utf8");
if (!proposalCoreSource.includes('method: "GET"')) failures.push("proposal remote adapter must expose an explicit GET-only request boundary");
if (/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(proposalCoreSource)) failures.push("proposal remote adapter contains a write-capable HTTP method");
if (/gh\s+issue\s+create|\b(?:createIssue|updateIssue|uploadFile|uploadAttachment)\s*\(/i.test(`${proposalCoreSource}\n${proposalCliSource}`)) {
  failures.push("proposal CLI contains a forbidden issue-write or upload path");
}

const agentsHandoff = managedSection(agents, "DKBWS-PROMPT-001-HANDOFF");
const starterHandoff = managedSection(starterAgents, "DKBWS-PROMPT-001-HANDOFF");
if (!agentsHandoff) failures.push("AGENTS.md lacks the managed completion and handoff policy");
if (!starterHandoff) failures.push("starter AGENTS.md template lacks the managed completion and handoff policy");
if (agentsHandoff && starterHandoff && agentsHandoff !== starterHandoff) {
  failures.push("root and starter completion/handoff policies have drifted");
}

const agentsLiveWikiLinks = managedSection(agents, "DKBWS-PROMPT-002-LIVE-URL");
const starterLiveWikiLinks = managedSection(starterAgents, "DKBWS-PROMPT-002-LIVE-URL");
if (!agentsLiveWikiLinks) failures.push("AGENTS.md lacks the managed live-Wiki response-link policy");
if (!starterLiveWikiLinks) failures.push("starter AGENTS.md template lacks the managed live-Wiki response-link policy");
if (agentsLiveWikiLinks && starterLiveWikiLinks && agentsLiveWikiLinks !== starterLiveWikiLinks) {
  failures.push("root and starter live-Wiki response-link policies have drifted");
}
for (const phrase of [
  "live absolute HTTP(S) URLs",
  "capabilities.human_wiki_url",
  "Verify the exact service identity and every displayed route",
  "clickable local-filesystem paths",
  "MUST NOT substitute for Wiki navigation",
  "MUST NOT be clickable",
  "response:links:check",
]) {
  if (!agentsLiveWikiLinks?.includes(phrase)) failures.push(`live-Wiki response-link policy lacks: ${phrase}`);
}
for (const [name, source] of [
  ["Standard skill", codexSkill],
  ["Standard maintenance", maintenance],
  ["starter maintenance", starterMaintenance],
  ["canonical prompt", prompt],
]) {
  for (const phrase of ["live", "HTTP(S)", "file", "Wiki navigation"]) {
    if (!source.includes(phrase)) failures.push(`${name} lacks DKBWS-PROMPT-002 phrase: ${phrase}`);
  }
}
if (/canonical file links/i.test(prompt)) failures.push("prompt still permits canonical file links in development handoffs");

const agentsTurnCompletion = managedSection(agents, "DKBWS-PROV-001-TURN");
const starterTurnCompletion = managedSection(starterAgents, "DKBWS-PROV-001-TURN");
if (!agentsTurnCompletion) failures.push("AGENTS.md lacks the managed development-turn completion policy");
if (!starterTurnCompletion) failures.push("starter AGENTS.md template lacks the managed development-turn completion policy");
if (agentsTurnCompletion && starterTurnCompletion && agentsTurnCompletion !== starterTurnCompletion) {
  failures.push("root and starter development-turn completion policies have drifted");
}
for (const phrase of [
  "every development turn that changes persistent repository files",
  "before the agent gives its final response",
  "failed or unrun required check",
  "does not permit an uncommitted final handoff",
  "not a subjective judgement",
  "do not create an empty commit",
]) {
  if (!agentsTurnCompletion?.includes(phrase)) failures.push(`development-turn completion policy lacks: ${phrase}`);
}
for (const [name, source] of [
  ["Standard maintenance", maintenance],
  ["starter maintenance", starterMaintenance],
  ["Standard skill", codexSkill],
]) {
  for (const phrase of ["development turn", "failed or unrun", "substantive", "empty commit"]) {
    if (!source.includes(phrase)) failures.push(`${name} lacks development-turn completion phrase: ${phrase}`);
  }
}
for (const phrase of [
  "Complete the requested scope before proposing further work",
  "recommendations, not continuation authority",
  "Include no more than three",
  "failed or unrun required check",
  "blocked_by",
  "reopen_when",
  "last_checked",
  "If no item qualifies, omit the section and stop",
]) {
  if (!agentsHandoff?.includes(phrase)) failures.push(`completion/handoff policy lacks: ${phrase}`);
}
if (/exactly three/i.test(prompt)) failures.push("prompt retains an unconditional exactly-three handoff quota");
for (const phrase of ["completion-first", "no more than three", "If no item qualifies, omit the section"]) {
  if (!prompt.includes(phrase)) failures.push(`prompt lacks anti-rabbit-hole handoff contract: ${phrase}`);
}
for (const boundary of [
  "starter/starter.yaml",
  "current default-branch HEAD",
  "Do not ask the user to choose or supply a release tag or commit",
  "Never recursively copy the standard root",
  "URL-only invocation",
  "research topic seed",
  "subject-empty local wiki",
  "#0b7285",
  "no external deployment",
  "governing-question",
  "bounded reader-source set",
  "every discovered repetition route",
  "ordinary quotations neutral",
  "verification-receipt-v1",
  "project-only summary must use a different path",
  "Do not copy Standard-maintainer `sync:documentation:*` commands",
  "shared local register",
  "service-identity-v1",
  "exact registered canonical URL",
]) {
  if (!prompt.includes(boundary)) failures.push(`prompt lacks independent-consumer boundary: ${boundary}`);
}
if (/\[immutable release tag or commit\]/i.test(prompt)) failures.push("prompt still requires a user-supplied standard revision");
if (/Topic and intended scope:|Selected profile:|Target Wiki URL:|Target deployment:/i.test(prompt)) {
  failures.push("prompt still exposes the removed field-based bootstrap");
}
for (const phrase of ["Give this URL to an AI agent", "research topic seed", "subject-empty local wiki", "accent colour"]) {
  if (!readme.includes(phrase)) failures.push(`README lacks URL-only agent bootstrap: ${phrase}`);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const licence = readFileSync("LICENSE", "utf8");
if (!licence.startsWith("MIT License\n\nCopyright (c) 2026 Andrew Dench")) failures.push("LICENSE must identify MIT and copyright Andrew Dench");
if (pkg.license !== "MIT") failures.push(`package licence must be MIT; found ${pkg.license ?? "unlisted"}`);
const exactNodePins = {
  "@google/design.md": "0.4.0",
  "@playwright/test": "1.62.1",
  "3d-force-graph": "1.80.0",
  "ajv": "8.20.0",
  "mermaid": "11.16.0",
  "vis-network": "10.1.0",
  "yaml": "2.9.0",
};
for (const [dependency, expected] of Object.entries(exactNodePins)) {
  const actual = pkg.devDependencies?.[dependency];
  if (actual !== expected) failures.push(`dependency ${dependency} must be exactly ${expected}; found ${actual ?? "unlisted"}`);
}
if (pkg.devDependencies?.wrangler) failures.push("wrangler must remain absent until a deployment adapter is selected");
for (const command of ["check:source-links", "sources:link"]) {
  if (!pkg.scripts?.[command]?.includes("link-source-citations.mjs")) failures.push(`missing ${command} reader source-link command`);
}
if (!pkg.scripts?.["check:governing-question"]?.includes("check-governing-question-repetitions.mjs")) failures.push("missing check:governing-question command");
if (!pkg.scripts?.check?.includes("check:governing-question")) failures.push("npm run check must include the governing-question repetition gate");
if (!pkg.scripts?.["conformance:test"]?.includes("check-governing-question-repetitions.test.mjs")) failures.push("conformance:test must include governing-question repetition fixtures");
if (!pkg.scripts?.check?.includes("check:source-links")) failures.push("npm run check must include the reader source-link gate");
if (!pkg.scripts?.["conformance:test"]?.includes("link-source-citations.test.mjs")) failures.push("conformance:test must include reader source-link fixtures");
if (pkg.scripts?.["standard:proposal"] !== "node scripts/standard-proposal-cli.mjs") failures.push("standard:proposal must use the governed proposal CLI");
if (!pkg.scripts?.check?.includes("standard:proposal -- check --all")) failures.push("npm run check must validate every tracked proposal record offline");
if (!pkg.scripts?.["conformance:test"]?.includes("standard-proposal-cli.test.mjs")) failures.push("conformance:test must include proposal lifecycle fixtures");
if (!pkg.scripts?.["conformance:test"]?.includes("dev-service.test.mjs")) failures.push("conformance:test must include managed local service fixtures");
if (pkg.scripts?.["response:links:check"] !== "node scripts/development-response-links.mjs") failures.push("response:links:check must use the governed DKBWS-PROMPT-002 linter");
if (!pkg.scripts?.["conformance:test"]?.includes("development-response-links.test.mjs")) failures.push("conformance:test must include development-response-link fixtures");
if (pkg.codexDevServer?.serviceId !== "denchco-kb-wiki-standard") failures.push("managed local service must retain its stable Standard identity");
if (pkg.codexDevServer?.host !== "127.0.0.1" || pkg.codexDevServer?.port !== 8017) failures.push("managed local service must retain its canonical loopback endpoint");
if (pkg.codexDevServer?.healthPath !== "/assets/service-identity.json") failures.push("managed local service must declare the static identity health path");
const serviceIdentity = JSON.parse(readFileSync("docs/assets/service-identity.json", "utf8"));
if (serviceIdentity.schemaVersion !== 1 || serviceIdentity.serviceId !== pkg.codexDevServer.serviceId) {
  failures.push("static managed service marker must match the configured service identity");
}
if (pkg.version !== "0.1.0-candidate") failures.push(`package version must be 0.1.0-candidate; found ${pkg.version}`);
if (pkg.engines?.node !== ">=24") failures.push(`Node engine must be >=24; found ${pkg.engines?.node ?? "unlisted"}`);
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const lockRoot = packageLock.packages?.[""] ?? {};
if (packageLock.version !== pkg.version || lockRoot.version !== pkg.version) failures.push("package-lock candidate version does not match package.json");
if (lockRoot.engines?.node !== pkg.engines.node) failures.push("package-lock Node engine does not match package.json");
if (lockRoot.license !== pkg.license) failures.push("package-lock licence does not match package.json");
for (const [dependency, expected] of Object.entries(exactNodePins)) {
  if (lockRoot.devDependencies?.[dependency] !== expected) failures.push(`package-lock root must pin ${dependency} exactly ${expected}`);
}
if (packageLock.packages?.["node_modules/wrangler"]) failures.push("package-lock retains Wrangler without a selected deployment adapter");
for (const script of ["prepare:runtime", "graph:update", "graph:publish", "check:visual-shape", "check:graphify", "check:browser", "check:canonical-content", "check:adoption-audits", "check:schema-artifacts", "check:provenance", "audit:node", "audit:python"]) {
  if (!pkg.scripts?.[script]) failures.push(`missing executable script ${script}`);
}
if (!pkg.scripts?.["conformance:full-report"]) failures.push("missing full-profile report command");
if (pkg.scripts?.["verify:workspace"] !== "npm run verify && npm run sync:documentation:check") failures.push("verify:workspace must finish with the real sibling documentation sync check");
for (const script of ["sync:documentation:check", "sync:documentation:apply", "sync:documentation:test"]) {
  if (!pkg.scripts?.[script]) failures.push(`missing documentation synchronization command ${script}`);
}
if (!pkg.scripts?.["conformance:test"]?.includes("sync-documentation-snapshot.test.mjs")) {
  failures.push("conformance:test does not exercise documentation synchronization safety");
}
if (!pkg.scripts?.["conformance:test"]?.includes("html-script-json.test.mjs")) {
  failures.push("conformance:test does not exercise script-safe graph JSON serialization");
}
if (!pkg.scripts?.["conformance:test"]?.includes("runtime-browser-contract-config.test.mjs")) {
  failures.push("conformance:test does not exercise fail-closed representative browser route selection");
}
if (!pkg.scripts?.["conformance:test"]?.includes("jj-phase.test.mjs")) {
  failures.push("conformance:test does not exercise end-of-development-turn JJ commit semantics");
}
if (!pkg.scripts?.check?.includes("check:visual-shape")) failures.push("check does not exercise check:visual-shape");
if (!pkg.scripts?.check?.includes("check:schema-artifacts")) failures.push("check does not exercise Draft 2020-12 artifact validation");
if (!pkg.scripts?.check?.includes("check:provenance")) failures.push("check does not exercise the explicit provenance mode");
if (!pkg.scripts?.check?.includes("audit:node") || !pkg.scripts?.check?.includes("audit:python")) failures.push("check does not exercise both locked dependency audits");
if (pkg.scripts?.verify !== "node scripts/verify.mjs") failures.push("verify must use the mutation-safe orchestrator");

const documentationSyncContract = JSON.parse(readFileSync("sync/documentation-sync-contract-v1.json", "utf8"));
const documentationAllowlist = new Set(documentationSyncContract.allowlist ?? []);
for (const file of sourceFiles(["schema", "profiles", "docs/spec", "docs/conformance", "prompts", "starter", "sync"], /./)) {
  if (!documentationAllowlist.has(file)) failures.push(`documentation snapshot contract omits canonical path ${file}`);
}
for (const file of [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/standard-change.yml",
  "docs/llm-wiki/standard-proposals.md",
  "docs/assets/pen-circle.svg",
  "docs/assets/service-identity.json",
  "scripts/dev-service.test.mjs",
  "scripts/check-governing-question-repetitions.mjs",
  "scripts/check-governing-question-repetitions.test.mjs",
  "fixtures/conforming/governing-question-repetitions/.wiki-standard.yaml",
  "fixtures/conforming/governing-question-repetitions/profiles/fixture.yaml",
  "fixtures/conforming/governing-question-repetitions/docs/index.md",
  "fixtures/conforming/governing-question-repetitions/docs/research/answer.md",
  "fixtures/conforming/governing-question-repetitions/docs/research/neutral.md",
  "fixtures/conforming/governing-question-repetitions/docs/research/masked.md",
  "fixtures/conforming/governing-question-repetitions/knowledge/history.md",
  "fixtures/conforming/governing-question-subject-empty/.wiki-standard.yaml",
  "fixtures/conforming/governing-question-subject-empty/profiles/fixture.yaml",
  "fixtures/conforming/governing-question-subject-empty/docs/index.md",
  "fixtures/nonconforming/governing-question-repetitions/.wiki-standard.yaml",
  "fixtures/nonconforming/governing-question-repetitions/profiles/fixture.yaml",
  "fixtures/nonconforming/governing-question-repetitions/docs/index.md",
  "fixtures/nonconforming/governing-question-repetitions/docs/plain.md",
  "fixtures/nonconforming/governing-question-repetitions/docs/mismatch.md",
  "fixtures/conforming/standard-proposal-valid/record.json",
  "fixtures/conforming/standard-proposal-valid/standard-change.yml",
  "fixtures/conforming/standard-proposal-valid/remote/standard-change.yml",
  "fixtures/conforming/standard-proposal-valid/remote/labels.json",
  "fixtures/conforming/standard-proposal-valid/remote/issues.json",
  "fixtures/conforming/standard-proposal-valid/remote/registry.json",
  "fixtures/nonconforming/standard-proposal-state/record.json",
  "fixtures/nonconforming/standard-proposal-safety/record.json",
  "fixtures/nonconforming/standard-proposal-duplicate/first.json",
  "fixtures/nonconforming/standard-proposal-duplicate/second.json",
  "fixtures/nonconforming/standard-proposal-form/standard-change.yml",
  "scripts/standard-proposal-core.mjs",
  "scripts/standard-proposal-cli.mjs",
  "scripts/standard-proposal-cli.test.mjs",
  "standard-proposals/README.md",
  "standard-proposals/registry.json",
  "standard-proposals/standard-change-form-v1.yml",
]) {
  if (!documentationAllowlist.has(file)) failures.push(`documentation snapshot contract omits reusable path ${file}`);
}
const verifyOrchestrator = readFileSync("scripts/verify.mjs", "utf8");
for (const gate of ["build", "check", "check:graphify", "check:browser"]) {
  if (!verifyOrchestrator.includes(`"${gate}"`)) failures.push(`verify orchestrator does not exercise ${gate}`);
}

const pyproject = readFileSync("pyproject.toml", "utf8");
for (const pin of ["zensical==0.0.52", "graphifyy==0.9.32", "pip-audit==2.10.1"])
  if (!pyproject.includes(pin)) failures.push(`missing Python pin ${pin}`);
if (!pyproject.includes('version = "0.1.0rc0"')) failures.push("Python project version must encode 0.1.0-candidate as PEP 440 0.1.0rc0");
if (!pyproject.includes('license = "MIT"')) failures.push("Python project licence must be MIT");

const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
for (const pin of [
  "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2",
  "actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
  "astral-sh/setup-uv@08807647e7069bb48b6ef5acd8ec9567f424441b # v8.1.0",
  "node-version: 24",
  "fetch-depth: 0",
  "DKBWS_PROVENANCE_MODE: distribution",
]) {
  if (!workflow.includes(pin)) failures.push(`CI verification is missing exact contract: ${pin}`);
}

const schema = JSON.parse(readFileSync("schema/manifest-v1.json", "utf8"));
if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") failures.push("manifest schema dialect is not Draft 2020-12");

for (const file of sourceFiles(["docs", "knowledge", "prompts", "starter"])) {
  const source = readFileSync(file, "utf8");
  if (/(?:\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/|[A-Za-z]:\\Users\\)/.test(source)) {
    failures.push(`${file} contains a machine-specific user path`);
  }
}

if (failures.length) {
  console.error("Standard checks failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Standard checks passed: ${required.length} canonical roles, stable IDs, Codex/Claude instruction parity, prompt protocol, schema dialect, and dependency pins.`);

function managedSection(source, id) {
  const start = `<!-- ${id}:START -->`;
  const end = `<!-- ${id}:END -->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return null;
  return source.slice(startIndex + start.length, endIndex).trim();
}

function sourceFiles(roots, filePattern = /\.(?:json|md|toml|ya?ml)$/i) {
  const found = [];
  for (const root of roots) visit(root);
  return found;

  function visit(entryPath) {
    for (const entry of readdirSync(entryPath, { withFileTypes: true })) {
      const child = path.join(entryPath, entry.name);
      if (entry.isDirectory()) {
        if (!["assets"].includes(entry.name)) visit(child);
      } else if (filePattern.test(entry.name)) {
        found.push(child);
      }
    }
  }
}
