import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDocument } from "yaml";

import {
  loadProfile,
  loadRequirementCatalogue,
  ProfileLoadError,
} from "./profile-catalogue.mjs";

export const REPORT_VERSION = "1.0";
export const SUPPORTED_OKF_VERSION = "0.2";
export const STANDARD_NAME = "DenchCo Knowledge Base Wiki Standard";

const STANDARD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESERVED_FILENAMES = new Set(["index.md", "log.md"]);
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".jj",
  ".venv",
  "venv",
  "node_modules",
  "site",
  "dist",
  "build",
  "graphify-out",
]);
const KNOWN_OKF_FIELDS = new Set([
  "type",
  "title",
  "description",
  "resource",
  "tags",
  "sources",
  "usage_window",
  "generated",
  "verified",
  "status",
  "stale_after",
  "runtime",
  "parameters",
  "computation",
  "executor",
  "attester",
]);
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };
const MANIFEST_TOP_LEVEL_KEYS = new Set([
  "schema",
  "standard",
  "profile",
  "okf_version",
  "roles",
  "capabilities",
  "deviations",
]);
const MANIFEST_STANDARD_KEYS = new Set(["name", "version", "source", "revision"]);
const DEVIATION_KEYS = new Set(["requirement", "status", "reason", "authority", "expires", "reviewed_at"]);
const DEVIATION_STATES = new Set(["pending", "waived", "deviates", "not-applicable"]);
const STATUS_VALUES = new Set(["draft", "stable", "deprecated"]);
export const SECURITY_SUBCONTROLS = Object.freeze([
  "secrets-and-authorization",
  "personal-and-confidential-data",
  "copyright-licensing-and-retention",
  "untrusted-and-generated-content",
]);
export class CliUsageError extends Error {}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function displayPath(filePath, projectRoot) {
  if (!filePath) return undefined;
  const relative = path.relative(projectRoot, filePath);
  if (relative === "") return ".";
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) return relative.split(path.sep).join("/");
  return path.resolve(filePath);
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function diagnostic(code, severity, message, options = {}) {
  const result = {
    code,
    severity,
    message,
  };
  for (const key of ["requirement", "file", "line", "field", "remediation"]) {
    if (options[key] !== undefined) result[key] = options[key];
  }
  return result;
}

function addDiagnostic(diagnostics, code, severity, message, options = {}) {
  diagnostics.push(diagnostic(code, severity, message, options));
}

function readUtf8(filePath, diagnostics, projectRoot) {
  let buffer;
  try {
    buffer = readFileSync(filePath);
  } catch (error) {
    addDiagnostic(diagnostics, "IO-READ-001", "error", `Cannot read file: ${error.message}`, {
      file: displayPath(filePath, projectRoot),
      remediation: "Make the file readable and run validation again.",
    });
    return null;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    addDiagnostic(diagnostics, "OKF-UTF8-001", "error", "The file is not valid UTF-8.", {
      requirement: "DKBWS-CORE-001",
      file: displayPath(filePath, projectRoot),
      remediation: "Encode canonical Markdown as UTF-8 without lossy replacement characters.",
    });
    return null;
  }
}

function parseYamlMapping(source, file, diagnostics, options = {}) {
  const { lineOffset = 0, code = "YAML-PARSE-001", requirement } = options;
  const document = parseDocument(source, {
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length) {
    for (const error of document.errors) {
      const pos = Array.isArray(error.linePos) ? error.linePos[0] : undefined;
      addDiagnostic(diagnostics, code, "error", `YAML is not parseable: ${error.message}`, {
        requirement,
        file,
        line: pos?.line ? pos.line + lineOffset : undefined,
        remediation: "Correct the YAML syntax and duplicate keys.",
      });
    }
    return null;
  }
  let value;
  try {
    value = document.toJS({ maxAliasCount: 100 });
  } catch (error) {
    addDiagnostic(diagnostics, code, "error", `YAML cannot be safely materialised: ${error.message}`, {
      requirement,
      file,
      remediation: "Remove cyclic or excessive YAML aliases.",
    });
    return null;
  }
  if (!isPlainObject(value)) {
    addDiagnostic(diagnostics, "YAML-ROOT-001", "error", "YAML frontmatter must be a mapping/object.", {
      requirement,
      file,
      line: lineOffset + 1,
      remediation: "Use named frontmatter fields rather than a scalar or sequence root.",
    });
    return null;
  }
  return value;
}

export function parseFrontmatter(text, file, diagnostics, options = {}) {
  const { required = false, requirement = "DKBWS-OKF-001" } = options;
  const withoutBom = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const lines = withoutBom.split(/\r?\n/);
  if (lines[0] !== "---") {
    if (required) {
      addDiagnostic(diagnostics, "OKF-FRONTMATTER-001", "error", "Concept document has no opening YAML frontmatter delimiter.", {
        requirement,
        file,
        line: 1,
        remediation: "Start the concept with an exact `---` line and add at least a non-empty `type` field.",
      });
    }
    return { present: false, data: null, body: withoutBom, raw: null, closingLine: null };
  }

  const closingIndex = lines.slice(1).findIndex((line) => line === "---");
  if (closingIndex === -1) {
    addDiagnostic(diagnostics, "OKF-FRONTMATTER-002", "error", "YAML frontmatter has no closing delimiter.", {
      requirement,
      file,
      line: 1,
      remediation: "Close frontmatter with an exact `---` line.",
    });
    return { present: true, data: null, body: "", raw: lines.slice(1).join("\n"), closingLine: null };
  }

  const actualClosingIndex = closingIndex + 1;
  const raw = lines.slice(1, actualClosingIndex).join("\n");
  const body = lines.slice(actualClosingIndex + 1).join("\n");
  const data = parseYamlMapping(raw, file, diagnostics, {
    code: "OKF-FRONTMATTER-003",
    lineOffset: 1,
    requirement,
  });
  return {
    present: true,
    data,
    body,
    raw,
    closingLine: actualClosingIndex + 1,
  };
}

function isDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isDateTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function validActor(value) {
  return typeof value === "string" && (
    /^human:[^\s:][^\s]*$/.test(value)
    || /^process:[^\s:][^\s]*$/.test(value)
    || /^[^\s/]+\/[^\s/]+$/.test(value)
  );
}

function validateDateRange(value, field, file, diagnostics) {
  if (!isPlainObject(value) || !isDateOnly(String(value.from ?? "")) || !isDateOnly(String(value.to ?? ""))) {
    addDiagnostic(diagnostics, "OKF-USAGE-WINDOW-001", "warning", `${field} should contain ISO date-only \`from\` and \`to\` fields.`, {
      file,
      field,
      remediation: "Use `{ from: YYYY-MM-DD, to: YYYY-MM-DD }`.",
    });
    return;
  }
  if (String(value.from) > String(value.to)) {
    addDiagnostic(diagnostics, "OKF-USAGE-WINDOW-002", "warning", `${field}.from is later than ${field}.to.`, {
      file,
      field,
      remediation: "Use a chronological usage window.",
    });
  }
}

function validateOptionalFamilies(frontmatter, body, file, diagnostics, evaluationDate) {
  for (const key of ["title", "description", "resource"]) {
    if (key in frontmatter && (typeof frontmatter[key] !== "string" || frontmatter[key].trim() === "")) {
      addDiagnostic(diagnostics, "OKF-FIELD-TYPE-001", "warning", `Optional field \`${key}\` should be a non-empty string when present.`, {
        file,
        field: key,
      });
    }
  }

  if ("tags" in frontmatter && (!Array.isArray(frontmatter.tags) || frontmatter.tags.some((tag) => typeof tag !== "string" || tag.trim() === ""))) {
    addDiagnostic(diagnostics, "OKF-TAGS-001", "warning", "`tags` should be a list of non-empty strings.", {
      file,
      field: "tags",
    });
  }

  const sourceIds = new Set();
  if ("sources" in frontmatter) {
    if (!Array.isArray(frontmatter.sources)) {
      addDiagnostic(diagnostics, "OKF-SOURCES-001", "warning", "`sources` should be a list.", {
        file,
        field: "sources",
        remediation: "Represent each source as a mapping containing at least `resource`.",
      });
    } else {
      frontmatter.sources.forEach((source, index) => {
        const field = `sources[${index}]`;
        if (!isPlainObject(source)) {
          addDiagnostic(diagnostics, "OKF-SOURCE-001", "warning", `${field} should be a mapping.`, { file, field });
          return;
        }
        if (typeof source.resource !== "string" || source.resource.trim() === "") {
          addDiagnostic(diagnostics, "OKF-SOURCE-RESOURCE-001", "warning", `${field}.resource is required within a source entry.`, {
            file,
            field: `${field}.resource`,
          });
        }
        if (source.id !== undefined) {
          if (typeof source.id !== "string" || source.id.trim() === "") {
            addDiagnostic(diagnostics, "OKF-SOURCE-ID-001", "warning", `${field}.id should be a non-empty string.`, { file, field: `${field}.id` });
          } else if (sourceIds.has(source.id)) {
            addDiagnostic(diagnostics, "OKF-SOURCE-ID-002", "warning", `Source id \`${source.id}\` is duplicated and cannot be an unambiguous claim join key.`, {
              file,
              field: `${field}.id`,
            });
          } else {
            sourceIds.add(source.id);
          }
        }
        if (source.usage_count !== undefined && (!Number.isInteger(source.usage_count) || source.usage_count < 0)) {
          addDiagnostic(diagnostics, "OKF-USAGE-COUNT-001", "warning", `${field}.usage_count should be a non-negative integer.`, {
            file,
            field: `${field}.usage_count`,
          });
        }
        if (source.last_modified !== undefined && !isDateOnly(String(source.last_modified))) {
          addDiagnostic(diagnostics, "OKF-LAST-MODIFIED-001", "warning", `${field}.last_modified should be an ISO date (YYYY-MM-DD).`, {
            file,
            field: `${field}.last_modified`,
          });
        }
        if (source.usage_window !== undefined) validateDateRange(source.usage_window, `${field}.usage_window`, file, diagnostics);
      });
    }
  }
  if (frontmatter.usage_window !== undefined) validateDateRange(frontmatter.usage_window, "usage_window", file, diagnostics);

  const citedIds = new Set([...body.matchAll(/\[\^([^\]]+)\](?!:)/g)].map((match) => match[1]));
  for (const id of citedIds) {
    if (!sourceIds.has(id)) {
      addDiagnostic(diagnostics, "OKF-SOURCE-CITATION-001", "warning", `Claim footnote \`[^${id}]\` has no matching \`sources[].id\`.`, {
        file,
        field: "sources",
        remediation: "Add a source entry with the same stable id or remove the attribution marker.",
      });
    }
  }

  if (frontmatter.generated !== undefined) {
    if (!isPlainObject(frontmatter.generated)) {
      addDiagnostic(diagnostics, "OKF-GENERATED-001", "warning", "`generated` should be a mapping.", { file, field: "generated" });
    } else {
      if (!validActor(frontmatter.generated.by)) {
        addDiagnostic(diagnostics, "OKF-ACTOR-001", "warning", "`generated.by` should follow the OKF actor convention.", {
          file,
          field: "generated.by",
        });
      }
      if (frontmatter.generated.at !== undefined && !isDateTime(String(frontmatter.generated.at))) {
        addDiagnostic(diagnostics, "OKF-DATETIME-001", "warning", "`generated.at` should be an ISO 8601 datetime.", {
          file,
          field: "generated.at",
        });
      }
    }
  }

  if (frontmatter.verified !== undefined) {
    const events = Array.isArray(frontmatter.verified) ? frontmatter.verified : [frontmatter.verified];
    if (events.length === 0) {
      addDiagnostic(diagnostics, "OKF-VERIFIED-001", "warning", "`verified` should contain at least one verification event when present.", {
        file,
        field: "verified",
      });
    }
    events.forEach((event, index) => {
      const field = `verified[${index}]`;
      if (!isPlainObject(event)) {
        addDiagnostic(diagnostics, "OKF-VERIFIED-002", "warning", `${field} should be a mapping.`, { file, field });
        return;
      }
      if (!validActor(event.by)) {
        addDiagnostic(diagnostics, "OKF-ACTOR-002", "warning", `${field}.by should follow the OKF actor convention.`, {
          file,
          field: `${field}.by`,
        });
      }
      if (!isDateTime(String(event.at ?? ""))) {
        addDiagnostic(diagnostics, "OKF-DATETIME-002", "warning", `${field}.at should be an ISO 8601 datetime.`, {
          file,
          field: `${field}.at`,
        });
      }
    });
  }

  if (frontmatter.status !== undefined && !STATUS_VALUES.has(frontmatter.status)) {
    addDiagnostic(diagnostics, "OKF-STATUS-001", "warning", "`status` should be `draft`, `stable`, or `deprecated`.", {
      file,
      field: "status",
    });
  }

  if (frontmatter.stale_after !== undefined) {
    const staleAfter = String(frontmatter.stale_after);
    if (!isDateOnly(staleAfter)) {
      addDiagnostic(diagnostics, "OKF-STALE-AFTER-001", "warning", "`stale_after` should be an ISO date (YYYY-MM-DD).", {
        file,
        field: "stale_after",
      });
    } else if (evaluationDate >= staleAfter) {
      addDiagnostic(diagnostics, "OKF-STALE-001", "info", `Concept is stale as of ${evaluationDate}.`, {
        file,
        field: "stale_after",
      });
    }
  }

  if (frontmatter.type === "Attested Computation") {
    if (typeof frontmatter.runtime !== "string" || frontmatter.runtime.trim() === "") {
      addDiagnostic(diagnostics, "OKF-ATTEST-RUNTIME-001", "warning", "An Attested Computation should declare a non-empty `runtime`.", {
        file,
        field: "runtime",
      });
    }
    if (frontmatter.parameters !== undefined) {
      if (!Array.isArray(frontmatter.parameters)) {
        addDiagnostic(diagnostics, "OKF-ATTEST-PARAMETERS-001", "warning", "`parameters` should be a list.", { file, field: "parameters" });
      } else {
        frontmatter.parameters.forEach((parameter, index) => {
          if (!isPlainObject(parameter)
            || typeof parameter.name !== "string"
            || typeof parameter.type !== "string"
            || typeof parameter.required !== "boolean") {
            addDiagnostic(diagnostics, "OKF-ATTEST-PARAMETER-001", "warning", `parameters[${index}] should contain string \`name\`, string \`type\`, and boolean \`required\`.`, {
              file,
              field: `parameters[${index}]`,
            });
          }
        });
      }
    }
    for (const key of ["executor", "attester"]) {
      const value = frontmatter[key];
      if (value !== undefined && (!isPlainObject(value) || typeof value.resource !== "string" || value.resource.trim() === "")) {
        addDiagnostic(diagnostics, "OKF-ATTEST-ENDPOINT-001", "warning", `\`${key}\` should be a mapping containing a non-empty \`resource\`.`, {
          file,
          field: key,
        });
      }
    }
    if (frontmatter.executor?.receipt !== undefined
      && (!Array.isArray(frontmatter.executor.receipt)
        || frontmatter.executor.receipt.some((entry) => typeof entry !== "string" || entry.trim() === ""))) {
      addDiagnostic(diagnostics, "OKF-ATTEST-RECEIPT-001", "warning", "`executor.receipt` should be a list of non-empty field names.", {
        file,
        field: "executor.receipt",
      });
    }
    const hasExternalComputation = typeof frontmatter.computation === "string" && frontmatter.computation.trim() !== "";
    const hasInlineComputation = /^#\s+Computation\s*$/m.test(body) && /```[^\n]*\n[\s\S]*?```/m.test(body);
    if (hasExternalComputation === hasInlineComputation) {
      addDiagnostic(diagnostics, "OKF-ATTEST-COMPUTATION-001", "warning", "An Attested Computation should provide exactly one computation: an external `computation` path or one fenced block under `# Computation`.", {
        file,
        field: "computation",
      });
    }
  }
}

function trustTier(frontmatter) {
  if (frontmatter?.verified === undefined) return "unverified";
  const events = Array.isArray(frontmatter.verified) ? frontmatter.verified : [frontmatter.verified];
  return events.some((event) => typeof event?.by === "string" && event.by.startsWith("human:"))
    ? "human-reviewed"
    : "machine-confirmed";
}

function markdownLinks(body) {
  const results = [];
  for (const match of body.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    results.push(match[1]);
  }
  return results;
}

function linkExists(target, documentPath, bundleRoot) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) return true;
  let clean = target.split("#", 1)[0].split("?", 1)[0];
  if (clean === "") return true;
  try {
    clean = decodeURIComponent(clean);
  } catch {
    return false;
  }
  const resolved = clean.startsWith("/")
    ? path.resolve(bundleRoot, `.${clean}`)
    : path.resolve(path.dirname(documentPath), clean);
  if (!inside(bundleRoot, resolved)) return false;
  try {
    const stat = statSync(resolved);
    if (stat.isFile()) return true;
    if (stat.isDirectory()) return statSync(path.join(resolved, "index.md")).isFile();
  } catch {
    return false;
  }
  return false;
}

function validateIndex(document, isRoot, diagnostics) {
  const { frontmatter, body, file } = document;
  if (frontmatter.present) {
    if (!isRoot) {
      addDiagnostic(diagnostics, "OKF-INDEX-FRONTMATTER-001", "error", "Only the bundle-root `index.md` may contain frontmatter.", {
        requirement: "DKBWS-OKF-001",
        file,
        line: 1,
        remediation: "Remove frontmatter from nested index files.",
      });
    } else if (frontmatter.data) {
      const keys = Object.keys(frontmatter.data);
      const unknown = keys.filter((key) => key !== "okf_version");
      if (unknown.length) {
        addDiagnostic(diagnostics, "OKF-INDEX-FRONTMATTER-002", "error", "Bundle-root `index.md` frontmatter may contain only `okf_version`.", {
          requirement: "DKBWS-OKF-001",
          file,
          line: 1,
          field: unknown.join(","),
          remediation: "Move concept metadata to concept documents and retain only `okf_version` here.",
        });
      }
      if (frontmatter.data.okf_version !== undefined && frontmatter.data.okf_version !== SUPPORTED_OKF_VERSION) {
        addDiagnostic(diagnostics, "OKF-VERSION-001", "error", `Unsupported OKF version \`${frontmatter.data.okf_version}\`.`, {
          requirement: "DKBWS-OKF-001",
          file,
          field: "okf_version",
          remediation: `Declare \`okf_version: "${SUPPORTED_OKF_VERSION}"\` or use a compatible validator.`,
        });
      }
    }
  }
  if (!/^#\s+\S+/m.test(body)) {
    addDiagnostic(diagnostics, "OKF-INDEX-STRUCTURE-001", "error", "`index.md` must contain at least one section heading.", {
      requirement: "DKBWS-OKF-001",
      file,
      remediation: "Add a heading and grouped links for progressive disclosure.",
    });
  }
  if (!/^\s*[-*+]\s+\[[^\]]+\]\([^)]+\)/m.test(body)) {
    addDiagnostic(diagnostics, "OKF-INDEX-ENTRIES-001", "warning", "`index.md` has no linked list entries for progressive disclosure.", {
      file,
      remediation: "List concepts or subdirectories using standard Markdown links.",
    });
  }
}

function validateLog(document, diagnostics) {
  const { frontmatter, body, file } = document;
  if (frontmatter.present) {
    addDiagnostic(diagnostics, "OKF-LOG-FRONTMATTER-001", "error", "`log.md` must not contain frontmatter.", {
      requirement: "DKBWS-OKF-001",
      file,
      line: 1,
      remediation: "Remove log frontmatter and keep a date-grouped Markdown history.",
    });
  }
  if (!/^#\s+\S+/m.test(body)) {
    addDiagnostic(diagnostics, "OKF-LOG-HEADING-001", "error", "`log.md` must contain a title heading.", {
      requirement: "DKBWS-OKF-001",
      file,
      remediation: "Add an H1 title before date groups.",
    });
  }
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]);
  if (headings.length === 0) {
    addDiagnostic(diagnostics, "OKF-LOG-DATE-001", "error", "`log.md` must contain at least one ISO date group.", {
      requirement: "DKBWS-OKF-001",
      file,
      remediation: "Add newest-first `## YYYY-MM-DD` headings.",
    });
    return;
  }
  for (const heading of headings) {
    if (!isDateOnly(heading)) {
      addDiagnostic(diagnostics, "OKF-LOG-DATE-002", "error", `Log date heading \`${heading}\` is not ISO 8601 YYYY-MM-DD.`, {
        requirement: "DKBWS-OKF-001",
        file,
        remediation: "Use only ISO date headings at H2 level.",
      });
    }
  }
  const valid = headings.filter(isDateOnly);
  for (let index = 1; index < valid.length; index += 1) {
    if (valid[index] > valid[index - 1]) {
      addDiagnostic(diagnostics, "OKF-LOG-ORDER-001", "error", "Log date groups are not newest first.", {
        requirement: "DKBWS-OKF-001",
        file,
        remediation: "Sort H2 date groups in descending chronological order.",
      });
      break;
    }
  }
}

function collectMarkdownFiles(root, diagnostics, projectRoot) {
  const files = [];
  function visit(current) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      addDiagnostic(diagnostics, "IO-DIRECTORY-001", "error", `Cannot inspect directory: ${error.message}`, {
        file: displayPath(current, projectRoot),
      });
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) visit(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(full);
      }
    }
  }
  visit(root);
  return files;
}

function inspectDocument(filePath, bundleRoot, projectRoot, diagnostics, evaluationDate) {
  const relativeToBundle = path.relative(bundleRoot, filePath).split(path.sep).join("/");
  const file = displayPath(filePath, projectRoot);
  const raw = readUtf8(filePath, diagnostics, projectRoot);
  if (raw === null) return null;
  const basename = path.basename(filePath);
  const kind = basename === "index.md" ? "index" : basename === "log.md" ? "log" : "concept";
  const frontmatter = parseFrontmatter(raw, file, diagnostics, { required: kind === "concept" });
  const document = {
    absolutePath: filePath,
    relativePath: relativeToBundle,
    file,
    kind,
    raw,
    sha256: createHash("sha256").update(raw).digest("hex"),
    frontmatter,
    body: frontmatter.body,
  };

  if (kind === "index") {
    validateIndex(document, path.resolve(filePath) === path.join(path.resolve(bundleRoot), "index.md"), diagnostics);
  } else if (kind === "log") {
    validateLog(document, diagnostics);
  } else if (frontmatter.data) {
    if (typeof frontmatter.data.type !== "string" || frontmatter.data.type.trim() === "") {
      addDiagnostic(diagnostics, "OKF-TYPE-001", "error", "Concept frontmatter must contain a non-empty string `type`.", {
        requirement: "DKBWS-OKF-001",
        file,
        field: "type",
        remediation: "Add a descriptive, non-empty `type`; unknown type values are allowed.",
      });
    }
    validateOptionalFamilies(frontmatter.data, frontmatter.body, file, diagnostics, evaluationDate);
  }

  const links = markdownLinks(frontmatter.body);
  document.links = links;
  document.brokenLinks = links.filter((target) => !linkExists(target, filePath, bundleRoot));
  return document;
}

export function inspectOkfBundle(bundleRoot, projectRoot, diagnostics, options = {}) {
  const evaluationDate = options.evaluationDate ?? new Date().toISOString().slice(0, 10);
  const absoluteRoot = path.resolve(bundleRoot);
  let stat;
  try {
    stat = lstatSync(absoluteRoot);
  } catch {
    addDiagnostic(diagnostics, "OKF-BUNDLE-001", "error", "Declared OKF bundle does not exist.", {
      requirement: "DKBWS-OKF-003",
      file: displayPath(absoluteRoot, projectRoot),
      remediation: "Correct the `roles.okf_bundle` mapping or create the bundle.",
    });
    return null;
  }
  if (!stat.isDirectory()) {
    addDiagnostic(diagnostics, "OKF-BUNDLE-002", "error", "An OKF bundle root must be a directory.", {
      requirement: "DKBWS-OKF-003",
      file: displayPath(absoluteRoot, projectRoot),
    });
    return null;
  }
  const files = collectMarkdownFiles(absoluteRoot, diagnostics, projectRoot);
  if (files.length === 0) {
    addDiagnostic(diagnostics, "OKF-BUNDLE-003", "error", "OKF bundle contains no Markdown files.", {
      requirement: "DKBWS-OKF-003",
      file: displayPath(absoluteRoot, projectRoot),
      remediation: "Add at least one concept document with YAML frontmatter.",
    });
  }
  const documents = files
    .map((filePath) => inspectDocument(filePath, absoluteRoot, projectRoot, diagnostics, evaluationDate))
    .filter(Boolean);
  const concepts = documents.filter((document) => document.kind === "concept");
  const fieldNames = new Set();
  const types = {};
  const statuses = { draft: 0, stable: 0, deprecated: 0, invalid: 0 };
  const trust = { unverified: 0, "machine-confirmed": 0, "human-reviewed": 0 };
  let stale = 0;
  for (const concept of concepts) {
    const frontmatter = concept.frontmatter.data;
    if (!frontmatter) continue;
    for (const field of Object.keys(frontmatter)) fieldNames.add(field);
    if (typeof frontmatter.type === "string" && frontmatter.type.trim()) {
      types[frontmatter.type] = (types[frontmatter.type] ?? 0) + 1;
    }
    const status = frontmatter.status ?? "stable";
    if (STATUS_VALUES.has(status)) statuses[status] += 1;
    else statuses.invalid += 1;
    trust[trustTier(frontmatter)] += 1;
    if (isDateOnly(String(frontmatter.stale_after ?? "")) && evaluationDate >= String(frontmatter.stale_after)) stale += 1;
  }
  const unknownFields = [...fieldNames].filter((field) => !KNOWN_OKF_FIELDS.has(field)).sort();
  const relevantErrors = diagnostics.filter((item) => item.severity === "error" && (
    item.file === displayPath(absoluteRoot, projectRoot)
    || documents.some((document) => item.file === document.file)
  ));
  return {
    root: displayPath(absoluteRoot, projectRoot),
    okfVersion: SUPPORTED_OKF_VERSION,
    conformant: relevantErrors.length === 0,
    counts: {
      markdown: documents.length,
      concepts: concepts.length,
      indexes: documents.filter((document) => document.kind === "index").length,
      logs: documents.filter((document) => document.kind === "log").length,
      links: documents.reduce((total, document) => total + document.links.length, 0),
      brokenLinksTolerated: documents.reduce((total, document) => total + document.brokenLinks.length, 0),
      stale,
    },
    types: Object.fromEntries(Object.entries(types).sort(([a], [b]) => a.localeCompare(b))),
    statuses,
    trust,
    unknownFieldsPreserved: unknownFields,
    documents,
  };
}

function loadYamlFile(filePath, diagnostics, projectRoot, code) {
  const source = readUtf8(filePath, diagnostics, projectRoot);
  if (source === null) return null;
  return parseYamlMapping(source, displayPath(filePath, projectRoot), diagnostics, { code });
}

function validateManifest(data, manifestPath, projectRoot, diagnostics) {
  const file = displayPath(manifestPath, projectRoot);
  if (!data) return;
  for (const key of MANIFEST_TOP_LEVEL_KEYS) {
    if (!(key in data)) {
      addDiagnostic(diagnostics, "DKBWS-MANIFEST-001", "error", `Manifest is missing required field \`${key}\`.`, {
        requirement: "DKBWS-CORE-002",
        file,
        field: key,
      });
    }
  }
  for (const key of Object.keys(data)) {
    if (!MANIFEST_TOP_LEVEL_KEYS.has(key)) {
      addDiagnostic(diagnostics, "DKBWS-MANIFEST-002", "error", `Manifest contains unsupported top-level field \`${key}\`.`, {
        requirement: "DKBWS-CORE-002",
        file,
        field: key,
        remediation: "Move implementation-specific metadata into `capabilities` or a documented manifest schema revision.",
      });
    }
  }
  if (typeof data.schema !== "string" || data.schema.trim() === "") {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-SCHEMA-001", "error", "`schema` must be a non-empty URI string.", {
      requirement: "DKBWS-CORE-002",
      file,
      field: "schema",
    });
  }
  if (!isPlainObject(data.standard)) {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-STANDARD-001", "error", "`standard` must be a mapping.", {
      requirement: "DKBWS-CORE-002",
      file,
      field: "standard",
    });
  } else {
    for (const key of ["name", "version", "source"]) {
      if (typeof data.standard[key] !== "string" || data.standard[key].trim() === "") {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-STANDARD-002", "error", `\`standard.${key}\` must be a non-empty string.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `standard.${key}`,
        });
      }
    }
    if (data.standard.name !== undefined && data.standard.name !== STANDARD_NAME) {
      addDiagnostic(diagnostics, "DKBWS-MANIFEST-STANDARD-003", "error", `\`standard.name\` must be \`${STANDARD_NAME}\`.`, {
        requirement: "DKBWS-CORE-002",
        file,
        field: "standard.name",
      });
    }
    for (const key of Object.keys(data.standard)) {
      if (!MANIFEST_STANDARD_KEYS.has(key)) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-STANDARD-004", "error", `Unsupported \`standard.${key}\` field.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `standard.${key}`,
        });
      }
    }
  }
  if (typeof data.profile !== "string" || data.profile.trim() === "") {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-PROFILE-001", "error", "`profile` must be a non-empty string.", {
      requirement: "DKBWS-CORE-002",
      file,
      field: "profile",
    });
  }
  if (data.okf_version !== SUPPORTED_OKF_VERSION) {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-OKF-001", "error", `\`okf_version\` must be \`${SUPPORTED_OKF_VERSION}\`.`, {
      requirement: "DKBWS-OKF-001",
      file,
      field: "okf_version",
    });
  }
  if (!isPlainObject(data.roles) || Object.keys(data.roles).length === 0) {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLES-001", "error", "`roles` must be a non-empty mapping.", {
      requirement: "DKBWS-CORE-002",
      file,
      field: "roles",
    });
  } else {
    const seenPaths = new Map();
    for (const [role, value] of Object.entries(data.roles)) {
      const roleRequirement = role === "okf_bundle" ? "DKBWS-OKF-003" : "DKBWS-CORE-002";
      if (typeof value !== "string" || value.trim() === "") {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-001", "error", `Role \`${role}\` must map to a non-empty relative path.`, {
          requirement: roleRequirement,
          file,
          field: `roles.${role}`,
        });
        continue;
      }
      if (path.isAbsolute(value)) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-002", "error", `Role \`${role}\` uses a non-portable absolute path.`, {
          requirement: roleRequirement,
          file,
          field: `roles.${role}`,
          remediation: "Use a repository-relative path.",
        });
        continue;
      }
      const resolved = path.resolve(projectRoot, value);
      if (!inside(projectRoot, resolved)) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-003", "error", `Role \`${role}\` escapes the repository root.`, {
          requirement: roleRequirement,
          file,
          field: `roles.${role}`,
        });
        continue;
      }
      try {
        const stat = lstatSync(resolved);
        if (role === "okf_bundle" && !stat.isDirectory()) {
          addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-004", "error", "`roles.okf_bundle` must identify a directory.", {
            requirement: "DKBWS-OKF-003",
            file,
            field: "roles.okf_bundle",
          });
        }
      } catch {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-005", "error", `Role \`${role}\` points to a missing path.`, {
          requirement: roleRequirement,
          file,
          field: `roles.${role}`,
          remediation: "Create the canonical role target or correct its mapping.",
        });
      }
      if (seenPaths.has(value)) {
        const priorRole = seenPaths.get(value);
        const intentionalQuestionOverlap = new Set([priorRole, role]);
        if (intentionalQuestionOverlap.size === 2
          && intentionalQuestionOverlap.has("human_wiki")
          && intentionalQuestionOverlap.has("governing_question")) continue;
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-006", "warning", `Roles \`${priorRole}\` and \`${role}\` map to the same path.`, {
          file,
          field: `roles.${role}`,
        });
      } else {
        seenPaths.set(value, role);
      }
    }
    if (!("okf_bundle" in data.roles)) {
      addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-OKF-001", "error", "Manifest does not map the canonical `okf_bundle` role.", {
        requirement: "DKBWS-OKF-003",
        file,
        field: "roles.okf_bundle",
        remediation: "Map `roles.okf_bundle` to the root of the portable OKF v0.2 directory tree.",
      });
    }
  }
  if (!isPlainObject(data.capabilities)) {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-CAPABILITIES-001", "error", "`capabilities` must be a mapping.", {
      requirement: "DKBWS-CORE-002",
      file,
      field: "capabilities",
    });
  }
  if (!Array.isArray(data.deviations)) {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATIONS-001", "error", "`deviations` must be a list.", {
      requirement: "DKBWS-CORE-002",
      file,
      field: "deviations",
    });
  } else {
    const seen = new Set();
    data.deviations.forEach((entry, index) => {
      const field = `deviations[${index}]`;
      if (!isPlainObject(entry)) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-001", "error", `${field} must be a mapping.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field,
        });
        return;
      }
      if (typeof entry.requirement !== "string" || !/^DKBWS-[A-Z]+-\d{3}$/.test(entry.requirement)) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-002", "error", `${field}.requirement must be a stable DKBWS requirement id.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `${field}.requirement`,
        });
      } else if (seen.has(entry.requirement)) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-003", "warning", `Requirement \`${entry.requirement}\` has more than one deviation entry.`, {
          file,
          field: `${field}.requirement`,
        });
      } else {
        seen.add(entry.requirement);
      }
      if (!DEVIATION_STATES.has(entry.status)) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-004", "error", `${field}.status is not a supported deviation state.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `${field}.status`,
        });
      }
      if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-005", "error", `${field}.reason must explain the deviation.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `${field}.reason`,
        });
      }
      if (entry.expires !== undefined && !isDateOnly(String(entry.expires))) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-006", "error", `${field}.expires must be an ISO date.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `${field}.expires`,
        });
      }
      if (entry.reviewed_at !== undefined && !isDateOnly(String(entry.reviewed_at))) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-008", "error", `${field}.reviewed_at must be an ISO date.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `${field}.reviewed_at`,
        });
      }
      if (entry.authority !== undefined && (typeof entry.authority !== "string" || entry.authority.trim() === "")) {
        addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-009", "error", `${field}.authority must be a non-empty string when present.`, {
          requirement: "DKBWS-CORE-002",
          file,
          field: `${field}.authority`,
        });
      }
      if (entry.status === "waived") {
        if (entry.authority === undefined) {
          addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-010", "error", `${field} is waived but does not name a non-empty authority.`, {
            requirement: "DKBWS-CORE-002",
            file,
            field: `${field}.authority`,
            remediation: "Name the person or governing body that authorized the waiver.",
          });
        }
        const hasExpiryOrReview = isDateOnly(String(entry.expires ?? "")) || isDateOnly(String(entry.reviewed_at ?? ""));
        if (!hasExpiryOrReview) {
          addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-011", "error", `${field} is waived but has neither a valid expiry nor review date.`, {
            requirement: "DKBWS-CORE-002",
            file,
            field: `${field}.expires|reviewed_at`,
            remediation: "Add ISO `expires: YYYY-MM-DD` or `reviewed_at: YYYY-MM-DD` so the waiver has an explicit lifecycle state.",
          });
        }
      }
      for (const key of Object.keys(entry)) {
        if (!DEVIATION_KEYS.has(key)) {
          addDiagnostic(diagnostics, "DKBWS-MANIFEST-DEVIATION-007", "error", `${field} contains unsupported field \`${key}\`.`, {
            requirement: "DKBWS-CORE-002",
            file,
            field: `${field}.${key}`,
          });
        }
      }
    });
  }
}

function resolveProject(options, diagnostics) {
  const requested = path.resolve(options.target ?? ".");
  let projectRoot = requested;
  let manifestPath = options.manifest ? path.resolve(requested, options.manifest) : null;
  try {
    const requestedStat = lstatSync(requested);
    if (requestedStat.isFile()) {
      projectRoot = path.dirname(requested);
      if (!manifestPath && path.basename(requested) === ".wiki-standard.yaml") manifestPath = requested;
    }
  } catch {
    addDiagnostic(diagnostics, "TARGET-001", "error", "Target does not exist.", {
      file: requested,
      remediation: "Provide a repository or bundle directory.",
    });
    return { projectRoot: requested, manifestPath: null, manifest: null, bundleRoots: [] };
  }
  if (!manifestPath) {
    const candidate = path.join(projectRoot, ".wiki-standard.yaml");
    try {
      if (lstatSync(candidate).isFile()) manifestPath = candidate;
    } catch {
      // A bare OKF bundle need not contain a DenchCo manifest.
    }
  }
  const manifest = manifestPath
    ? loadYamlFile(manifestPath, diagnostics, projectRoot, "DKBWS-MANIFEST-YAML-001")
    : null;
  if (manifestPath) validateManifest(manifest, manifestPath, projectRoot, diagnostics);

  let bundleRoots = [];
  if (options.bundles?.length) {
    bundleRoots = options.bundles.map((bundle) => path.resolve(projectRoot, bundle));
  } else if (typeof manifest?.roles?.okf_bundle === "string") {
    bundleRoots = [path.resolve(projectRoot, manifest.roles.okf_bundle)];
  } else if (!manifestPath) {
    bundleRoots = [projectRoot];
  }
  return { projectRoot, manifestPath, manifest, bundleRoots };
}

function declaredProfile(manifest, diagnostics) {
  if (!manifest || typeof manifest.profile !== "string" || manifest.profile.trim() === "") return null;
  try {
    const catalogue = loadRequirementCatalogue({ standardRoot: STANDARD_ROOT });
    return loadProfile(manifest.profile, {
      standardRoot: STANDARD_ROOT,
      requirementIds: catalogue.ids,
    });
  } catch (error) {
    if (!(error instanceof ProfileLoadError)) throw error;
    addDiagnostic(diagnostics, error.code, "error", error.message, {
      requirement: "DKBWS-CORE-002",
      file: error.filePath ? displayPath(error.filePath, STANDARD_ROOT) : undefined,
      field: error.field ?? "profile",
      remediation: "Select a valid canonical profile and repair its inheritance or catalogue references before claiming conformance.",
    });
    return null;
  }
}

function canonicalOkfBundleMapped(resolved) {
  const declared = resolved.manifest?.roles?.okf_bundle;
  if (typeof declared !== "string" || declared.trim() === "" || path.isAbsolute(declared)) return false;
  const target = path.resolve(resolved.projectRoot, declared);
  if (!inside(resolved.projectRoot, target)) return false;
  try {
    return lstatSync(target).isDirectory();
  } catch {
    return false;
  }
}

function portableLinkTarget(target, documentPath, projectRoot) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) return { portable: true };
  let clean = target.split("#", 1)[0].split("?", 1)[0];
  if (clean === "") return { portable: true };
  try {
    clean = decodeURIComponent(clean);
  } catch {
    return { portable: false, reason: "the target is not valid percent-encoded text" };
  }
  if (clean.startsWith("/") || clean.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(clean)) {
    return { portable: false, reason: "the target is an absolute filesystem/root path" };
  }
  if (clean.includes("\\")) {
    return { portable: false, reason: "the target uses platform-specific backslashes" };
  }
  const resolved = path.resolve(path.dirname(documentPath), clean);
  if (!inside(projectRoot, resolved)) {
    return { portable: false, reason: "the target escapes the repository root" };
  }
  const candidates = [resolved, `${resolved}.md`, path.join(resolved, "index.md")];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return { portable: true };
    } catch {
      // Try the next conventional Markdown target.
    }
  }
  return { portable: false, reason: "the repository-relative target does not exist" };
}

function documentLinkTargets(source) {
  const inline = [...source.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)]
    .map((match) => match[1]);
  const references = [...source.matchAll(/^\s*\[(?!\^)[^\]]+\]:\s*(\S+)/gm)]
    .map((match) => match[1].replace(/^<|>$/g, ""));
  return [...inline, ...references];
}

function canonicalRoleScan(resolved, diagnostics) {
  const roles = resolved.manifest?.roles;
  if (!isPlainObject(roles) || Object.keys(roles).length === 0) {
    return {
      status: "not-checked",
      reason: "Canonical roles are not available for the UTF-8 and portable-link scan.",
      files: [],
      links: 0,
    };
  }

  const files = new Set();
  let incomplete = false;
  for (const [role, declared] of Object.entries(roles)) {
    if (typeof declared !== "string" || declared.trim() === "" || path.isAbsolute(declared)) {
      incomplete = true;
      continue;
    }
    const target = path.resolve(resolved.projectRoot, declared);
    if (!inside(resolved.projectRoot, target)) {
      incomplete = true;
      continue;
    }
    let metadata;
    try {
      metadata = lstatSync(target);
    } catch {
      incomplete = true;
      continue;
    }
    if (metadata.isSymbolicLink()) {
      addDiagnostic(diagnostics, "DKBWS-CORE-ROLE-001", "error", `Canonical role \`${role}\` is a symbolic link and cannot be bounded to the repository.`, {
        requirement: "DKBWS-CORE-001",
        file: displayPath(target, resolved.projectRoot),
        field: `roles.${role}`,
        remediation: "Map canonical roles to regular repository files or directories.",
      });
      continue;
    }
    if (metadata.isFile()) {
      if (path.extname(target).toLowerCase() !== ".md") {
        addDiagnostic(diagnostics, "DKBWS-CORE-ROLE-002", "error", `Canonical role \`${role}\` does not identify a Markdown file.`, {
          requirement: "DKBWS-CORE-001",
          file: displayPath(target, resolved.projectRoot),
          field: `roles.${role}`,
          remediation: "Use UTF-8 Markdown for canonical knowledge roles.",
        });
      } else {
        files.add(target);
      }
      continue;
    }
    if (metadata.isDirectory()) {
      const nested = collectMarkdownFiles(target, diagnostics, resolved.projectRoot);
      if (nested.length === 0) {
        addDiagnostic(diagnostics, "DKBWS-CORE-ROLE-003", "error", `Canonical role \`${role}\` contains no Markdown files.`, {
          requirement: "DKBWS-CORE-001",
          file: displayPath(target, resolved.projectRoot),
          field: `roles.${role}`,
        });
      }
      for (const nestedFile of nested) files.add(nestedFile);
      continue;
    }
    incomplete = true;
  }

  let links = 0;
  for (const filePath of [...files].sort()) {
    const source = readUtf8(filePath, diagnostics, resolved.projectRoot);
    if (source === null) continue;
    for (const target of documentLinkTargets(source)) {
      links += 1;
      const result = portableLinkTarget(target, filePath, resolved.projectRoot);
      if (!result.portable) {
        addDiagnostic(diagnostics, "DKBWS-CORE-LINK-001", "error", `Markdown link \`${target}\` is not portable: ${result.reason}.`, {
          requirement: "DKBWS-CORE-001",
          file: displayPath(filePath, resolved.projectRoot),
          field: "link",
          remediation: "Use an existing repository-relative Markdown target, an anchor, or a fully qualified external URI.",
        });
      }
    }
  }

  const failed = diagnostics.some((item) => item.severity === "error" && item.requirement === "DKBWS-CORE-001");
  if (failed) {
    return {
      status: "fail",
      reason: "At least one canonical-role file or link failed the UTF-8/portable-link scan.",
      files: [...files].map((filePath) => displayPath(filePath, resolved.projectRoot)).sort(),
      links,
    };
  }
  if (incomplete || files.size === 0) {
    return {
      status: "not-checked",
      reason: "The canonical-role scan could not bound every declared target.",
      files: [...files].map((filePath) => displayPath(filePath, resolved.projectRoot)).sort(),
      links,
    };
  }
  return {
    status: "pass",
    reason: `Read ${files.size} canonical Markdown file(s) as strict UTF-8 and checked ${links} portable link target(s).`,
    files: [...files].map((filePath) => displayPath(filePath, resolved.projectRoot)).sort(),
    links,
  };
}

function validDeviationOverlay(entry, duplicate) {
  if (duplicate || !isPlainObject(entry)) return false;
  if (typeof entry.requirement !== "string" || !/^DKBWS-[A-Z]+-\d{3}$/.test(entry.requirement)) return false;
  if (!DEVIATION_STATES.has(entry.status)) return false;
  if (typeof entry.reason !== "string" || entry.reason.trim() === "") return false;
  if (Object.keys(entry).some((key) => !DEVIATION_KEYS.has(key))) return false;
  if (entry.expires !== undefined && !isDateOnly(String(entry.expires))) return false;
  if (entry.reviewed_at !== undefined && !isDateOnly(String(entry.reviewed_at))) return false;
  if (entry.authority !== undefined && (typeof entry.authority !== "string" || entry.authority.trim() === "")) return false;
  if (entry.status === "waived") {
    if (typeof entry.authority !== "string" || entry.authority.trim() === "") return false;
    if (!isDateOnly(String(entry.expires ?? "")) && !isDateOnly(String(entry.reviewed_at ?? ""))) return false;
  }
  return true;
}

export function manifestDeviationOverlays(manifest) {
  if (!Array.isArray(manifest?.deviations)) return new Map();
  const counts = new Map();
  for (const entry of manifest.deviations) {
    if (typeof entry?.requirement === "string") {
      counts.set(entry.requirement, (counts.get(entry.requirement) ?? 0) + 1);
    }
  }
  return new Map(manifest.deviations
    .filter((entry) => validDeviationOverlay(entry, counts.get(entry?.requirement) > 1))
    .map((entry) => [entry.requirement, entry]));
}

function applyDeviationOverlay(result, overlay) {
  if (!overlay) return result;
  let status;
  if (overlay.status === "waived") status = "waived";
  else if (overlay.status === "not-applicable") status = "not-applicable";
  else status = result.status === "not-checked" ? "not-checked" : "fail";
  const reason = overlay.status === "pending" || overlay.status === "deviates"
    ? `Manifest deviation is ${overlay.status} and does not satisfy the requirement: ${overlay.reason}`
    : overlay.reason;
  return {
    ...result,
    status,
    reason,
    ...(result.subcontrols ? {
      subcontrols: result.subcontrols.map((subcontrol) => ({
        ...subcontrol,
        status: ["waived", "not-applicable"].includes(status) ? status : subcontrol.status,
        reason: ["waived", "not-applicable"].includes(status) ? reason : subcontrol.reason,
      })),
    } : {}),
  };
}

export function applyManifestDeviationOverlays(results, manifest) {
  const overlays = manifestDeviationOverlays(manifest);
  return results.map((result) => applyDeviationOverlay(result, overlays.get(result.requirement)));
}

function requirementResults(profile, resolved, diagnostics, bundles, roleScan) {
  const required = profile?.requirements ?? [];
  const checks = new Map([
    ["DKBWS-CORE-001", {
      status: roleScan.status,
      reason: roleScan.reason,
      evidence: ["canonical-role-scan"],
    }],
    ["DKBWS-CORE-002", {
      status: diagnostics.some((item) => item.severity === "error" && item.requirement === "DKBWS-CORE-002") ? "fail" : "pass",
      evidence: ["manifest-declaration"],
    }],
    ["DKBWS-OKF-001", {
      status: bundles.length > 0 && bundles.every((bundle) => bundle?.conformant) ? "pass" : "fail",
      evidence: bundles.map((_, index) => `okf-bundle-${index + 1}`),
    }],
    ["DKBWS-OKF-002", {
      status: "pass",
      reason: "The lossless exporter retains exact source text, parsed unknown fields, and SHA-256 digests.",
      evidence: ["lossless-export-contract"],
    }],
    ["DKBWS-OKF-003", {
      status: canonicalOkfBundleMapped(resolved)
        && !diagnostics.some((item) => item.severity === "error" && item.requirement === "DKBWS-OKF-003")
        ? "pass"
        : "fail",
      evidence: ["manifest-declaration"],
    }],
    ["DKBWS-SEC-001", {
      status: "not-checked",
      reason: "The narrow OKF/manifest validator does not inspect operational security and source-handling policy evidence.",
      subcontrols: SECURITY_SUBCONTROLS.map((id) => ({
        id,
        status: "not-checked",
        reason: "Requires the complete policy/evidence verification gate.",
      })),
    }],
  ]);
  const results = required.map((requirement) => {
    if (!checks.has(requirement)) {
      return {
        requirement,
        status: "not-checked",
        reason: "This OKF/manifest validator does not claim to verify this capability; use the complete profile verification pipeline.",
      };
    }
    return {
      requirement,
      ...checks.get(requirement),
    };
  });
  return applyManifestDeviationOverlays(results, resolved.manifest);
}

function sortDiagnostics(diagnostics) {
  diagnostics.sort((a, b) => (
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    || String(a.file ?? "").localeCompare(String(b.file ?? ""))
    || Number(a.line ?? 0) - Number(b.line ?? 0)
    || a.code.localeCompare(b.code)
  ));
}

function reportCapabilityStates(profile, manifest) {
  const expected = isPlainObject(profile?.capabilities) ? profile.capabilities : {};
  const declared = isPlainObject(manifest?.capabilities) ? manifest.capabilities : {};
  const ids = [...new Set([...Object.keys(expected), ...Object.keys(declared)])].sort();
  return ids.map((id) => {
    const isDeclared = Object.hasOwn(declared, id);
    return {
      id,
      expected: Object.hasOwn(expected, id) ? expected[id] : null,
      declared: isDeclared,
      value: isDeclared ? declared[id] : null,
      declarationStatus: isDeclared ? "declared" : "missing",
      verificationStatus: "not-checked",
    };
  });
}

function narrowEvidence(resolved, bundles, roleScan) {
  const evidence = [];
  if (resolved.manifestPath) {
    evidence.push({
      id: "manifest-declaration",
      kind: "file",
      location: displayPath(resolved.manifestPath, resolved.projectRoot),
      description: "Parsed DenchCo manifest declaration.",
      supports: ["DKBWS-CORE-002", "DKBWS-OKF-003"],
    });
  }
  bundles.forEach((bundle, index) => {
    evidence.push({
      id: `okf-bundle-${index + 1}`,
      kind: "bundle",
      location: bundle.root,
      description: `Inspected OKF v${bundle.okfVersion} bundle with ${bundle.counts.markdown} Markdown file(s).`,
      supports: ["DKBWS-OKF-001"],
    });
  });
  evidence.push({
    id: "canonical-role-scan",
    kind: "scan",
    location: ".",
    description: roleScan.reason,
    supports: ["DKBWS-CORE-001"],
    details: {
      status: roleScan.status,
      files: roleScan.files,
      links: roleScan.links,
    },
  });
  evidence.push({
    id: "lossless-export-contract",
    kind: "tool-contract",
    location: "scripts/okf-core.mjs",
    description: "Lossless export retains parsed fields, exact source, and file digests.",
    supports: ["DKBWS-OKF-002"],
  });
  return evidence;
}

function manualChecks(requirements) {
  const checks = [];
  for (const result of requirements) {
    if (result.status !== "not-checked") continue;
    if (result.subcontrols?.length) {
      for (const subcontrol of result.subcontrols) {
        if (subcontrol.status !== "not-checked") continue;
        checks.push({
          id: `${result.requirement}:${subcontrol.id}`,
          requirement: result.requirement,
          subcontrol: subcontrol.id,
          reason: subcontrol.reason ?? result.reason ?? "Manual evidence is outstanding.",
        });
      }
    } else {
      checks.push({
        id: result.requirement,
        requirement: result.requirement,
        reason: result.reason ?? "Manual evidence is outstanding.",
      });
    }
  }
  return checks;
}

export function inspectProject(options = {}) {
  const diagnostics = [];
  const evaluationDate = options.evaluationDate ?? new Date().toISOString().slice(0, 10);
  if (!isDateOnly(evaluationDate)) throw new CliUsageError("--date must use YYYY-MM-DD.");
  const resolved = resolveProject(options, diagnostics);
  const bundles = resolved.bundleRoots
    .map((root) => inspectOkfBundle(root, resolved.projectRoot, diagnostics, { evaluationDate }))
    .filter(Boolean);
  if (resolved.manifestPath && resolved.bundleRoots.length === 0
    && !diagnostics.some((item) => item.code === "DKBWS-MANIFEST-ROLE-OKF-001")) {
    addDiagnostic(diagnostics, "DKBWS-MANIFEST-ROLE-OKF-001", "error", "No OKF bundle is declared or selected.", {
      requirement: "DKBWS-OKF-003",
      file: displayPath(resolved.manifestPath, resolved.projectRoot),
      field: "roles.okf_bundle",
    });
  }
  const profile = declaredProfile(resolved.manifest, diagnostics);
  const roleScan = canonicalRoleScan(resolved, diagnostics);
  sortDiagnostics(diagnostics);
  const errors = diagnostics.filter((item) => item.severity === "error").length;
  const warnings = diagnostics.filter((item) => item.severity === "warning").length;
  const info = diagnostics.filter((item) => item.severity === "info").length;
  const requirements = requirementResults(profile, resolved, diagnostics, bundles, roleScan);
  const complete = requirements.length > 0 && requirements.every((result) => ["pass", "waived", "not-applicable"].includes(result.status));
  const requirementFailure = requirements.some((result) => result.status === "fail");
  const okfConformant = bundles.length > 0 && bundles.every((bundle) => bundle.conformant);
  const evidence = narrowEvidence(resolved, bundles, roleScan);
  const outstandingManualChecks = manualChecks(requirements);
  return {
    $schema: "https://denchco.github.io/knowledge-base-wiki-documentation/schema/conformance-report-v1.json",
    reportVersion: REPORT_VERSION,
    command: options.command ?? "inspect",
    readOnly: true,
    evaluationDate,
    target: path.resolve(resolved.projectRoot),
    manifest: {
      present: Boolean(resolved.manifestPath),
      path: resolved.manifestPath ? displayPath(resolved.manifestPath, resolved.projectRoot) : null,
      valid: Boolean(resolved.manifestPath) && !diagnostics.some((item) => (
        item.severity === "error"
        && (item.code.startsWith("DKBWS-MANIFEST") || item.code.startsWith("DKBWS-PROFILE"))
      )),
      profile: resolved.manifest?.profile ?? null,
      standardVersion: resolved.manifest?.standard?.version ?? null,
      data: resolved.manifest,
    },
    okf: {
      version: SUPPORTED_OKF_VERSION,
      conformant: okfConformant,
      bundles: bundles.map(({ documents, ...summary }) => summary),
    },
    capabilityStates: reportCapabilityStates(profile, resolved.manifest),
    requirementResults: requirements,
    verification: {
      scope: "okf-manifest-read-only",
      environment: {
        runtime: "node",
        runtimeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
      result: {
        status: errors > 0 || requirementFailure ? "fail" : (complete ? "pass" : "partial"),
        strict: options.strict === true,
        evaluation: outstandingManualChecks.length === 0 ? "complete" : "incomplete",
        conformance: errors > 0 || requirementFailure ? "nonconformant" : (complete ? "conformant" : "partial"),
      },
      canonicalMutation: {
        status: "not-checked",
        changedPaths: [],
        reason: "This narrow command is implemented read-only; an external before/after canonical-input comparison was not supplied.",
      },
    },
    evidence,
    outstandingManualChecks,
    summary: {
      status: errors === 0 && !requirementFailure ? (complete ? "conformant" : "partial") : "nonconformant",
      errors,
      warnings,
      info,
      strictFailure: errors > 0 || requirementFailure || (options.strict === true && warnings > 0),
      profileComplete: complete,
      evaluationComplete: outstandingManualChecks.length === 0,
      markdown: bundles.reduce((total, bundle) => total + bundle.counts.markdown, 0),
      concepts: bundles.reduce((total, bundle) => total + bundle.counts.concepts, 0),
    },
    diagnostics,
    _documents: bundles.flatMap((bundle) => bundle.documents.map((document) => ({ bundle, document }))),
  };
}

export function losslessExport(options = {}) {
  const report = inspectProject({ ...options, command: "export-okf" });
  if (report.summary.errors > 0 || (options.strict && report.summary.warnings > 0)) {
    return { report, exportData: null };
  }
  const byRoot = new Map();
  for (const { bundle, document } of report._documents) {
    if (!byRoot.has(bundle.root)) byRoot.set(bundle.root, []);
    byRoot.get(bundle.root).push({
      path: document.relativePath,
      kind: document.kind,
      conceptId: document.kind === "concept" ? document.relativePath.replace(/\.md$/, "") : null,
      sha256: document.sha256,
      frontmatter: document.frontmatter.data,
      body: document.frontmatter.body,
      raw: document.raw,
    });
  }
  const exportData = {
    $schema: "https://denchco.github.io/knowledge-base-wiki-documentation/schema/okf-export-v1.json",
    format: "denchco-okf-lossless-json",
    formatVersion: "1.0",
    okfVersion: SUPPORTED_OKF_VERSION,
    readOnlySource: true,
    bundles: [...byRoot.entries()].map(([root, files]) => ({
      root,
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
    })),
  };
  return { report, exportData };
}

export function publicReport(report) {
  const { _documents, ...result } = report;
  return result;
}

export function reportText(report) {
  const lines = [
    `${STANDARD_NAME} conformance ${report.reportVersion}`,
    `Target: ${report.target}`,
    `Result: ${report.summary.status.toUpperCase()} · ${report.summary.errors} errors · ${report.summary.warnings} warnings · ${report.summary.info} info`,
    `OKF v${report.okf.version}: ${report.okf.conformant ? "PASS" : "FAIL"} · ${report.summary.concepts} concepts in ${report.okf.bundles.length} bundle(s)`,
  ];
  if (report.manifest.present) {
    lines.push(`Manifest: ${report.manifest.valid ? "PASS" : "FAIL"} · profile ${report.manifest.profile ?? "unknown"}`);
  } else {
    lines.push("Manifest: not present (valid for a bare OKF bundle; not a DenchCo conformance claim)");
  }
  if (report.requirementResults.length) {
    const unchecked = report.requirementResults.filter((item) => item.status === "not-checked").length;
    lines.push(`Profile checks: ${report.summary.profileComplete ? "COMPLETE" : `PARTIAL (${unchecked} not checked by this CLI)`}`);
  }
  for (const item of report.diagnostics) {
    const where = item.file ? ` ${item.file}${item.line ? `:${item.line}` : ""}` : "";
    lines.push(`${item.severity.toUpperCase()} ${item.code}${where} — ${item.message}`);
  }
  return lines.join("\n");
}

export function standardRoot() {
  return STANDARD_ROOT;
}
