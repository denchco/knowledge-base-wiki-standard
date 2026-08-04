import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const required = [
  "README.md", "LICENSE", "AGENTS.md", "CLAUDE.md", "DESIGN.md", "DEPENDENCIES.md", ".wiki-standard.yaml",
  ".agents/skills/denchco-kb-wiki-standard/SKILL.md",
  ".claude/skills/denchco-kb-wiki-standard/SKILL.md",
  "GOVERNANCE.md", "SECURITY.md", "SOURCE_POLICY.md", "LICENSING.md", "CHANGELOG.md",
  "docs/index.md", "docs/spec/index.md", "docs/spec/requirements.md",
  "docs/sources.md", "docs/evidence-matrix.md", "docs/validation-queue.md",
  "docs/log.md", "docs/llms.txt", "docs/llm-wiki/index.md", "prompts/instantiate-wiki.md",
  "starter/README.md", "starter/starter.yaml", "starter/templates/wiki-standard.yaml.tmpl",
  "starter/templates/AGENTS.md.tmpl", "starter/templates/CLAUDE.md.tmpl",
  "starter/templates/docs/project/status.md.tmpl",
  "docs/conformance/index.md", "docs/conformance/dogfood/comparison.md",
  "docs/llm-wiki/graphify.md", "docs/graph/index.md",
  "docs/graph/two-dimensional.md", "docs/graph/three-dimensional.md",
  "knowledge/index.md", "knowledge/log.md", "schema/manifest-v1.json",
  "schema/conformance-report-v1.json", "schema/okf-v0.2-frontmatter.json",
  "schema/okf-export-v1.json", "schema/lifecycle-plan-v1.json",
  "schema/adoption-audit-report-v1.json", "schema/verification-receipt-v1.json",
  "schema/documentation-sync-snapshot-v1.json",
  "profiles/portable-core.yaml",
  "profiles/standard-production.yaml", "scripts/sync-runtime-assets.mjs",
  "schema/graph-publication-v1.json", "schema/graph-publication-summary-v1.json",
  "scripts/publish-graphify-assets.mjs", "scripts/check-graphify-assets.mjs",
  "scripts/check-visual-shape-contract.mjs", "scripts/check-runtime-browser-contract.mjs",
  "scripts/runtime-browser-contract.playwright.js", "scripts/serve-built-site.mjs",
  "scripts/check-provenance.mjs", "scripts/check-provenance-mode.mjs", "scripts/check-canonical-content.mjs",
  "scripts/check-schema-artifacts.mjs", "scripts/full-profile-report.mjs",
  "scripts/html-script-json.mjs", "scripts/html-script-json.test.mjs", "scripts/verify.mjs",
  "scripts/sync-documentation-snapshot.mjs", "scripts/sync-documentation-snapshot.test.mjs",
  "sync/documentation-sync-contract-v1.json"
];

const failures = [];
for (const file of required) if (!existsSync(file)) failures.push(`missing ${file}`);

const requirements = readFileSync("docs/spec/requirements.md", "utf8");
for (const id of ["DKBWS-CORE-001", "DKBWS-OKF-001", "DKBWS-HUMAN-002", "DKBWS-PROMPT-001", "DKBWS-PROV-001", "DKBWS-VERIFY-001"])
  if (!requirements.includes(id)) failures.push(`missing requirement ${id}`);

const agents = readFileSync("AGENTS.md", "utf8");
const starterAgents = readFileSync("starter/templates/AGENTS.md.tmpl", "utf8");
const claude = readFileSync("CLAUDE.md", "utf8");
const starterClaude = readFileSync("starter/templates/CLAUDE.md.tmpl", "utf8");
const codexSkill = readFileSync(".agents/skills/denchco-kb-wiki-standard/SKILL.md", "utf8");
const claudeSkill = readFileSync(".claude/skills/denchco-kb-wiki-standard/SKILL.md", "utf8");
const prompt = readFileSync("prompts/instantiate-wiki.md", "utf8");
for (const [name, text] of [["AGENTS.md", agents], ["prompt", prompt]]) {
  if (!text.includes("Question 1 of N")) failures.push(`${name} lacks sequential question protocol`);
}
if (claude.trim() !== "@AGENTS.md") failures.push("CLAUDE.md must contain only the canonical @AGENTS.md import");
if (!starterClaude.split(/\r?\n/).some((line) => line.trim() === "@AGENTS.md")) {
  failures.push("starter CLAUDE.md template must import AGENTS.md");
}
if (codexSkill !== claudeSkill) failures.push("Codex and Claude Standard skills must be byte-identical");

const agentsHandoff = managedSection(agents, "DKBWS-PROMPT-001-HANDOFF");
const starterHandoff = managedSection(starterAgents, "DKBWS-PROMPT-001-HANDOFF");
if (!agentsHandoff) failures.push("AGENTS.md lacks the managed completion and handoff policy");
if (!starterHandoff) failures.push("starter AGENTS.md template lacks the managed completion and handoff policy");
if (agentsHandoff && starterHandoff && agentsHandoff !== starterHandoff) {
  failures.push("root and starter completion/handoff policies have drifted");
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
  "Target Wiki URL",
  "Target deployment",
  "governing-question",
  "ordinary quotations neutral",
]) {
  if (!prompt.includes(boundary)) failures.push(`prompt lacks independent-consumer boundary: ${boundary}`);
}
if (/\[immutable release tag or commit\]/i.test(prompt)) failures.push("prompt still requires a user-supplied standard revision");

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
