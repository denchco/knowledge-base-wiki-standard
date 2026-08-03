import { existsSync, readFileSync } from "node:fs";

const required = [
  "README.md", "AGENTS.md", "DESIGN.md", "DEPENDENCIES.md", ".wiki-standard.yaml",
  "docs/index.md", "docs/spec/index.md", "docs/spec/requirements.md",
  "docs/sources.md", "docs/evidence-matrix.md", "docs/validation-queue.md",
  "docs/log.md", "docs/llm-wiki/index.md", "prompts/instantiate-wiki.md",
  "schema/manifest-v1.json", "profiles/portable-core.yaml",
  "profiles/standard-production.yaml"
];

const failures = [];
for (const file of required) if (!existsSync(file)) failures.push(`missing ${file}`);

const requirements = readFileSync("docs/spec/requirements.md", "utf8");
for (const id of ["DKBWS-CORE-001", "DKBWS-OKF-001", "DKBWS-PROMPT-001", "DKBWS-VERIFY-001"])
  if (!requirements.includes(id)) failures.push(`missing requirement ${id}`);

const agents = readFileSync("AGENTS.md", "utf8");
const prompt = readFileSync("prompts/instantiate-wiki.md", "utf8");
for (const [name, text] of [["AGENTS.md", agents], ["prompt", prompt]]) {
  if (!text.includes("Question 1 of N")) failures.push(`${name} lacks sequential question protocol`);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const dep of ["@google/design.md", "@playwright/test", "mermaid", "vis-network", "3d-force-graph", "wrangler"])
  if (!pkg.devDependencies?.[dep]) failures.push(`unlisted dependency ${dep}`);

const pyproject = readFileSync("pyproject.toml", "utf8");
for (const pin of ["zensical==0.0.51", "graphifyy==0.8.35"])
  if (!pyproject.includes(pin)) failures.push(`missing Python pin ${pin}`);

const schema = JSON.parse(readFileSync("schema/manifest-v1.json", "utf8"));
if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") failures.push("manifest schema dialect is not Draft 2020-12");

if (failures.length) {
  console.error("Standard checks failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Standard checks passed: ${required.length} canonical roles, stable IDs, prompt protocol, schema dialect, and dependency pins.`);
