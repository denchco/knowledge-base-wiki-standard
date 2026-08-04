#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import { parse, parseDocument } from "yaml";

const root = process.cwd();
const schemaDirectory = path.join(root, "schema");
const failures = [];
const validated = [];

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
  // Several schemas use conditional `required` keywords whose properties are
  // declared in the parent schema. That is valid JSON Schema but Ajv cannot
  // prove the relationship during its optional strictRequired lint.
  strictRequired: false,
});

ajv.addFormat("date-time", {
  type: "string",
  validate(value) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      && !Number.isNaN(Date.parse(value));
  },
});
ajv.addFormat("uri", {
  type: "string",
  validate(value) {
    try {
      const parsed = new URL(value);
      return Boolean(parsed.protocol);
    } catch {
      return false;
    }
  },
});

const schemas = new Map();
for (const name of readdirSync(schemaDirectory).filter((entry) => entry.endsWith(".json")).sort()) {
  const file = path.join(schemaDirectory, name);
  try {
    const schema = parseJsonStrict(readFileSync(file, "utf8"), `schema/${name}`);
    if (!schema.$id) throw new Error("schema has no $id");
    ajv.addSchema(schema);
    schemas.set(name, schema);
  } catch (error) {
    failures.push(`schema/${name}: could not compile as Draft 2020-12: ${error.message}`);
  }
}

for (const [name, schema] of schemas) {
  try {
    if (!ajv.getSchema(schema.$id)) throw new Error("Ajv did not retain a compiled validator");
  } catch (error) {
    failures.push(`schema/${name}: compiled validator unavailable: ${error.message}`);
  }
}

const manifest = parse(readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"));
validate("manifest-v1.json", manifest, ".wiki-standard.yaml");

const conformance = runJson([
  "scripts/conformance-cli.mjs", "validate", ".", "--strict", "--json",
], "self conformance report");
validate("conformance-report-v1.json", conformance, "generated self conformance report");

const okfExport = runJson([
  "scripts/conformance-cli.mjs", "export-okf", ".",
], "self OKF export");
validate("okf-export-v1.json", okfExport, "generated self OKF export");
for (const bundle of okfExport?.bundles ?? []) {
  for (const file of bundle.files ?? []) {
    if (file.kind === "concept" && file.frontmatter !== null) {
      validate(
        "okf-v0.2-frontmatter.json",
        file.frontmatter,
        `generated OKF export ${bundle.root}/${file.path} frontmatter`,
      );
    }
  }
}

const lifecycleCases = [
  {
    label: "generated lifecycle diff",
    args: ["scripts/conformance-cli.mjs", "diff", "fixtures/lifecycle/consumer-old", "--json"],
    allowedStatuses: [1],
    expectsBlocking: true,
  },
  {
    label: "generated upgrade plan",
    args: ["scripts/conformance-cli.mjs", "upgrade", "fixtures/lifecycle/consumer-old", "--dry-run", "--json"],
    allowedStatuses: [1],
    expectsBlocking: true,
  },
  {
    label: "generated init plan",
    args: [
      "scripts/conformance-cli.mjs", "init", path.join(os.tmpdir(), "denchco-kb-schema-probe"),
      "--dry-run", "--title", "Schema probe", "--topic", "Read-only schema validation", "--json",
    ],
  },
];
for (const lifecycleCase of lifecycleCases) {
  const artifact = runJson(
    lifecycleCase.args,
    lifecycleCase.label,
    lifecycleCase.allowedStatuses,
  );
  validate(
    "lifecycle-plan-v1.json",
    artifact,
    lifecycleCase.label,
  );
  if (lifecycleCase.expectsBlocking && !(artifact?.summary?.blocking > 0)) {
    failures.push(`${lifecycleCase.label}: revision-less fixture must retain a blocking lifecycle result`);
  }
}

const adoptionDirectory = path.join(root, "docs", "conformance", "dogfood");
for (const name of readdirSync(adoptionDirectory).filter((entry) => entry.endsWith(".json")).sort()) {
  const report = parseJsonStrict(
    readFileSync(path.join(adoptionDirectory, name), "utf8"),
    `docs/conformance/dogfood/${name}`,
  );
  validate("adoption-audit-report-v1.json", report, `docs/conformance/dogfood/${name}`);
}

const graphPath = path.join(root, "docs", "assets", "graphify", "graph.json");
const summaryPath = path.join(root, "docs", "assets", "graphify", "summary.json");
const graphPresent = fileExists(graphPath);
const summaryPresent = fileExists(summaryPath);
if (graphPresent !== summaryPresent) {
  failures.push("generated Graphify publication is incomplete: graph.json and summary.json must appear together");
} else if (graphPresent) {
  validate("graph-publication-v1.json", parseJsonStrict(readFileSync(graphPath, "utf8"), "generated Graphify graph.json"), "generated Graphify graph.json");
  validate("graph-publication-summary-v1.json", parseJsonStrict(readFileSync(summaryPath, "utf8"), "generated Graphify summary.json"), "generated Graphify summary.json");
}

const verificationReceiptPath = path.join(root, "output", "verification", "receipt.json");
const fullReportPath = path.join(root, "output", "verification", "conformance-report.json");
const receiptPresent = fileExists(verificationReceiptPath);
const fullReportPresent = fileExists(fullReportPath);
if (receiptPresent !== fullReportPresent) {
  failures.push("generated verification output is incomplete: receipt.json and conformance-report.json must appear together");
} else if (receiptPresent) {
  validate(
    "verification-receipt-v1.json",
    parseJsonStrict(readFileSync(verificationReceiptPath, "utf8"), "generated verification receipt"),
    "generated verification receipt",
  );
  validate(
    "conformance-report-v1.json",
    parseJsonStrict(readFileSync(fullReportPath, "utf8"), "generated full-profile conformance report"),
    "generated full-profile conformance report",
  );
}

if (failures.length) {
  console.error("Draft 2020-12 schema and artifact validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Draft 2020-12 validation passed: ${schemas.size} schemas compiled and ${validated.length} real artifacts validated` +
  `${graphPresent ? ", including generated graph and summary" : " (graph artifacts not present; build-time validation deferred)"}` +
  `${receiptPresent ? ", plus the verification receipt and full-profile report" : ""}.`,
);

function validate(schemaName, value, label) {
  if (value === undefined) return;
  const schema = schemas.get(schemaName);
  if (!schema) {
    failures.push(`${label}: validator schema/${schemaName} is unavailable`);
    return;
  }
  const validator = ajv.getSchema(schema.$id);
  if (!validator(value)) {
    const details = (validator.errors ?? [])
      .map((error) => `${error.instancePath || "/"} ${error.message}`)
      .join("; ");
    failures.push(`${label}: ${details}`);
    return;
  }
  validated.push(label);
}

function runJson(args, label, allowedStatuses = [0]) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    failures.push(`${label}: could not run generator: ${result.error.message}`);
    return undefined;
  }
  if (!allowedStatuses.includes(result.status)) {
    failures.push(`${label}: generator exited ${result.status}: ${result.stderr.trim()}`);
    return undefined;
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    failures.push(`${label}: generator did not emit JSON: ${error.message}`);
    return undefined;
  }
}

function fileExists(file) {
  try {
    readFileSync(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function parseJsonStrict(source, label) {
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length) {
    throw new Error(`${label}: duplicate or invalid JSON key: ${document.errors.map((error) => error.message).join("; ")}`);
  }
  return JSON.parse(source);
}
