#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const failures = [];
const root = process.cwd();

const sources = read("docs/sources.md");
const sourceIds = [...sources.matchAll(/^\|\s*(SRC-\d{3})\s*\|/gm)].map((match) => match[1]);
if (sourceIds.length === 0) failures.push("DKBWS-EVID-001: source register contains no stable SRC-NNN identities");
if (new Set(sourceIds).size !== sourceIds.length) failures.push("DKBWS-EVID-001: source register contains duplicate identities");

const evidenceMatrix = read("docs/evidence-matrix.md");
const evidenceRows = evidenceMatrix.split(/\r?\n/)
  .filter((line) => line.startsWith("|") && !/^\|\s*(?:Claim|[-: ]+\|)/.test(line));
if (evidenceRows.length === 0) failures.push("DKBWS-EVID-002: evidence matrix has no claim rows");
for (const [index, row] of evidenceRows.entries()) {
  const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length < 4 || cells.slice(0, 4).some((cell) => cell === "")) {
    failures.push(`DKBWS-EVID-002: evidence row ${index + 1} lacks claim, support, state, or limitation`);
    continue;
  }
  const cited = cells[1].match(/SRC-\d{3}/g) ?? [];
  if (cited.length === 0) failures.push(`DKBWS-EVID-002: evidence row ${index + 1} has no registered source identity`);
  for (const id of cited) if (!sourceIds.includes(id)) failures.push(`DKBWS-EVID-001: evidence row ${index + 1} cites unknown ${id}`);
}
if (!read("docs/validation-queue.md").includes("# Validation queue")) {
  failures.push("DKBWS-EVID-002: validation queue is missing its canonical heading");
}

const llmWiki = read("docs/llm-wiki/index.md");
for (const [label, pattern] of [
  ["read order", /## Read first/],
  ["ingest workflow", /\*\*Ingest\*\*/],
  ["query workflow", /\*\*Query\*\*/],
  ["lint workflow", /\*\*Lint\*\*/],
  ["authority boundary", /authority/i],
  ["generated-content boundary", /generated/i],
]) {
  if (!pattern.test(llmWiki)) failures.push(`DKBWS-LLM-001: LLM Wiki lacks ${label}`);
}

const security = read("SECURITY.md");
const sourcePolicy = read("SOURCE_POLICY.md");
const licensing = read("LICENSING.md");
const securitySpec = read("docs/spec/security-and-sources.md");
for (const id of [
  "secrets-and-authorization",
  "personal-and-confidential-data",
  "copyright-licensing-and-retention",
  "untrusted-and-generated-content",
]) {
  if (!securitySpec.includes(id)) failures.push(`DKBWS-SEC-001: missing declared subcontrol ${id}`);
}
requirePatterns("DKBWS-SEC-001 secrets-and-authorization", security, [
  /Secrets stay outside/, /explicit authorization/, /least-privilege/,
]);
requirePatterns("DKBWS-SEC-001 personal-and-confidential-data", `${security}\n${sourcePolicy}`, [
  /Personal or confidential data/, /redacted/, /access-controlled/, /Deletion and correction/,
]);
requirePatterns("DKBWS-SEC-001 copyright-licensing-and-retention", `${sourcePolicy}\n${licensing}`, [
  /licen[cs]e/i, /Do not redistribute/, /retention/i, /removal consequences|Deletion and correction/,
]);
requirePatterns("DKBWS-SEC-001 untrusted-and-generated-content", security, [
  /untrusted inputs/, /must not execute/, /no independent evidence authority/, /sanitized/,
]);

const markdownFiles = [...walkMarkdown("docs"), ...walkMarkdown("knowledge")];
const known = new Set(markdownFiles);
const inbound = new Map(markdownFiles.map((file) => [file, []]));
for (const sourceFile of markdownFiles) {
  const content = read(sourceFile);
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const rawTarget = match[1].split("#")[0].split("?")[0].replace(/^<|>$/g, "");
    if (!rawTarget || /^(?:https?:|mailto:|tel:|data:)/i.test(rawTarget)) continue;
    const resolved = path.normalize(path.join(path.dirname(sourceFile), rawTarget)).split(path.sep).join("/");
    if (known.has(resolved) && resolved !== sourceFile) inbound.get(resolved).push(sourceFile);
  }
}
for (const [file, sourcesForFile] of inbound) {
  if (["docs/index.md", "knowledge/index.md"].includes(file)) continue;
  if (sourcesForFile.length === 0) failures.push(`DKBWS-LINK-001: ${file} has no contextual Markdown inbound link`);
}

if (failures.length) {
  console.error("Canonical content contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Canonical content contracts passed: ${sourceIds.length} stable sources, ${evidenceRows.length} governed claims, ` +
  `LLM operating model, ${markdownFiles.length - 2} context-linked pages, and four security subcontrols.`,
);

function read(file) {
  const absolute = path.join(root, file);
  if (!existsSync(absolute)) {
    failures.push(`missing ${file}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requirePatterns(label, source, patterns) {
  for (const pattern of patterns) if (!pattern.test(source)) failures.push(`${label}: missing declaration matching ${pattern}`);
}

function walkMarkdown(directory) {
  const found = [];
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (child === "docs/assets") continue;
      found.push(...walkMarkdown(child));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push(child);
    }
  }
  return found.sort();
}
