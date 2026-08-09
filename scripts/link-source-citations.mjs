#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";

const SOURCE_ID = "SRC-\\d{3}";
const SOURCE_TOKEN = new RegExp(`(?<![A-Z0-9-])${SOURCE_ID}(?![A-Z0-9-])`, "g");
const SOURCE_LINK = new RegExp(
  `(?<!!)\\[(${SOURCE_ID})\\]\\(([^)\\s]+)(?:\\s+[\"'][^\"']*[\"'])?\\)`,
  "g",
);
const COMBINED_SOURCE_LINK = new RegExp(
  `(?<!!)\\[((?:${SOURCE_ID})(?:(?:\\s*(?:,|–|-)\\s*)${SOURCE_ID})+)\\]\\(([^)\\s]+)(?:\\s+[\"'][^\"']*[\"'])?\\)`,
  "g",
);
const UNLINKED_GROUP = new RegExp(
  `\\[((?:${SOURCE_ID})(?:(?:\\s*(?:,|–|-)\\s*)${SOURCE_ID})*)\\](?!\\()`,
  "g",
);

export function readerMarkdownFiles(root = process.cwd()) {
  const docsRoot = path.join(root, "docs");
  if (!existsSync(docsRoot)) return [];
  const sourceRegister = mappedSourceRegister(root);
  return walkMarkdown(root, docsRoot)
    .filter(file => file !== sourceRegister && !file.startsWith("docs/assets/"))
    .sort();
}

export function authorityMarkdownFiles(root = process.cwd()) {
  const roles = manifestRoles(root);
  const candidates = new Set([
    roles.human_wiki ?? "docs/index.md",
    roles.evidence_matrix ?? "docs/evidence-matrix.md",
    roles.research_log ?? "docs/log.md",
    roles.validation_queue ?? "docs/validation-queue.md",
  ]);
  const researchRoot = path.join(root, "docs", "research");
  if (existsSync(researchRoot)) {
    for (const file of walkMarkdown(root, researchRoot)) candidates.add(file);
  }
  return new Set([...candidates].filter(file => existsSync(path.join(root, file))));
}

export function registeredSourceIds(sourceRegister) {
  return new Set(
    [...sourceRegister.matchAll(/^\|\s*(SRC-\d{3})\s*\|\s*<span id="(src-\d{3})"><\/span>/gm)]
      .filter(([, id, anchor]) => anchor === id.toLowerCase())
      .map(([, id]) => id),
  );
}

export function registeredSourceUrls(sourceRegister) {
  return new Set(
    [...sourceRegister.matchAll(/\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/g)]
      .map(([, url]) => url),
  );
}

export function sourceRegisterAnchorIssues(sourceRegister) {
  const issues = [];
  for (const match of sourceRegister.matchAll(/^\|\s*(SRC-\d{3})\s*\|([^\n]*)$/gm)) {
    const id = match[1];
    const anchor = match[2].match(/<span id="([^"]+)"><\/span>/)?.[1] ?? "";
    if (anchor !== id.toLowerCase()) {
      issues.push(`DKBWS-LINK-002-ANCHOR: ${id} must declare <span id="${id.toLowerCase()}"></span>; found ${anchor || "no anchor"}`);
    }
  }
  return issues;
}

export function linkCitationGroups(markdown, sourceTarget) {
  const visible = visibleMarkdown(markdown);
  return replaceVisibleMatches(markdown, visible, UNLINKED_GROUP, match => (
    match[1].replace(new RegExp(SOURCE_ID, "g"), id => `[${id}](${sourceTarget}#${id.toLowerCase()})`)
  ));
}

export function linkBareSourceIdentities(markdown, sourceTarget) {
  const visible = visibleMarkdown(markdown);
  const output = visible.split("");
  for (const match of visible.matchAll(/(?<!!)\[[^\]\n]+\]\((?:\\.|[^)\n])*\)/g)) {
    for (let index = match.index; index < match.index + match[0].length; index += 1) {
      if (output[index] !== "\n" && output[index] !== "\r") output[index] = " ";
    }
  }
  const readerText = maskMarkdownDestinations(output.join(""));
  return replaceVisibleMatches(markdown, readerText, new RegExp(SOURCE_TOKEN.source, "g"), match => {
    const id = match[0];
    return `[${id}](${sourceTarget}#${id.toLowerCase()})`;
  });
}

export function sourceLinkIssues(markdown, options) {
  const {
    file,
    registeredIds,
    registeredUrls,
    canonicalSourceFile = "docs/sources.md",
  } = options;
  const issues = [];
  const visible = visibleMarkdown(markdown);
  const linkedTokenStarts = new Set();

  for (const match of visible.matchAll(COMBINED_SOURCE_LINK)) {
    for (const token of match[1].matchAll(new RegExp(SOURCE_ID, "g"))) {
      linkedTokenStarts.add(match.index + 1 + token.index);
    }
    issues.push(at(markdown, match.index + 1, file, "DKBWS-LINK-002-COMBINED", "each displayed source identity must be a separate link"));
  }

  for (const match of visible.matchAll(SOURCE_LINK)) {
    const [full, id, rawTarget] = match;
    const tokenStart = match.index + full.indexOf(id);
    linkedTokenStarts.add(tokenStart);

    const [targetPath, fragment = ""] = rawTarget.split("#", 2);
    const resolved = path.normalize(path.join(path.dirname(file), targetPath)).split(path.sep).join("/");
    if (resolved !== canonicalSourceFile) {
      issues.push(at(markdown, tokenStart, file, "DKBWS-LINK-002-TARGET", `${id} must link to ${relativeSourceTarget(file, canonicalSourceFile)}#${id.toLowerCase()}`));
    }
    if (fragment !== id.toLowerCase()) {
      issues.push(at(markdown, tokenStart, file, "DKBWS-LINK-002-FRAGMENT", `${id} fragment must be #${id.toLowerCase()}; found #${fragment || "(none)"}`));
    }
    if (!registeredIds.has(id)) {
      issues.push(at(markdown, tokenStart, file, "DKBWS-LINK-002-UNKNOWN", `${id} is not present in the source register`));
    }
  }

  const readerText = maskMarkdownDestinations(visible);
  for (const match of readerText.matchAll(new RegExp(SOURCE_TOKEN.source, "g"))) {
    if (linkedTokenStarts.has(match.index)) continue;
    const id = match[0];
    const expected = `[${id}](${relativeSourceTarget(file, canonicalSourceFile)}#${id.toLowerCase()})`;
    issues.push(at(markdown, match.index, file, "DKBWS-LINK-002-BARE", `${id} must be an individual source-row link: ${expected}`));
  }

  if (registeredUrls) {
    for (const match of visible.matchAll(/(?<!!)\[[^\]\n]+\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
      const [, url] = match;
      if (!registeredUrls.has(url)) {
        issues.push(at(markdown, match.index, file, "DKBWS-LINK-002-AUTHORITY", `external authority link is not registered: ${url}`));
      }
    }
  }

  return issues;
}

export function validateReaderSourceLinks(root = process.cwd()) {
  const canonicalSourceFile = mappedSourceRegister(root);
  const registerFile = path.join(root, canonicalSourceFile);
  if (!existsSync(registerFile)) {
    return [`${canonicalSourceFile}: DKBWS-LINK-002-REGISTER: mapped source register is missing`];
  }
  const sourceRegister = readFileSync(registerFile, "utf8");
  const registeredIds = registeredSourceIds(sourceRegister);
  const registeredUrls = registeredSourceUrls(sourceRegister);
  const authorityFiles = authorityMarkdownFiles(root);
  const issues = sourceRegisterAnchorIssues(sourceRegister).map(issue => `${canonicalSourceFile}: ${issue}`);
  for (const file of readerMarkdownFiles(root)) {
    const markdown = readFileSync(path.join(root, file), "utf8");
    issues.push(...sourceLinkIssues(markdown, {
      file,
      registeredIds,
      registeredUrls: authorityFiles.has(file) ? registeredUrls : undefined,
      canonicalSourceFile,
    }));
  }
  return issues;
}

export function rewriteReaderSourceLinks(root = process.cwd()) {
  const canonicalSourceFile = mappedSourceRegister(root);
  let changedFiles = 0;
  let linkedGroups = 0;
  for (const file of readerMarkdownFiles(root)) {
    const absolute = path.join(root, file);
    const before = readFileSync(absolute, "utf8");
    const target = relativeSourceTarget(file, canonicalSourceFile);
    const grouped = linkCitationGroups(before, target);
    const after = linkBareSourceIdentities(grouped, target);
    if (after === before) continue;
    linkedGroups += countSourceLinks(after) - countSourceLinks(before);
    writeFileSync(absolute, after);
    changedFiles += 1;
  }
  return { changedFiles, linkedGroups };
}

function manifestRoles(root) {
  const manifestPath = path.join(root, ".wiki-standard.yaml");
  if (!existsSync(manifestPath)) return {};
  try {
    return YAML.parse(readFileSync(manifestPath, "utf8"))?.roles ?? {};
  } catch {
    return {};
  }
}

function mappedSourceRegister(root) {
  const candidate = manifestRoles(root).source_register ?? "docs/sources.md";
  if (typeof candidate !== "string" || path.isAbsolute(candidate) || candidate.includes("\\")) return "docs/sources.md";
  const normalized = path.normalize(candidate).split(path.sep).join("/");
  return normalized.startsWith("../") || normalized === ".." ? "docs/sources.md" : normalized;
}

function relativeSourceTarget(file, canonicalSourceFile) {
  const relative = path.relative(path.dirname(file), canonicalSourceFile).split(path.sep).join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function visibleMarkdown(markdown) {
  const output = markdown.split("");
  const mask = (start, end) => {
    for (let index = start; index < end; index += 1) {
      if (output[index] !== "\n" && output[index] !== "\r") output[index] = " ";
    }
  };

  const frontmatter = markdown.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (frontmatter) mask(0, frontmatter[0].length);
  for (const match of markdown.matchAll(/<!--[\s\S]*?-->/g)) mask(match.index, match.index + match[0].length);
  for (const match of markdown.matchAll(/^\s{0,3}\[[^\]\n]+\]:[^\n]*(?:\n|$)/gm)) mask(match.index, match.index + match[0].length);
  for (const match of markdown.matchAll(/<[^>\n]+>/g)) mask(match.index, match.index + match[0].length);

  let fence = null;
  let offset = 0;
  for (const line of markdown.split(/(?<=\n)/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { character: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.character && marker[1].length >= fence.length) fence = null;
      mask(offset, offset + line.length);
    } else if (fence) {
      mask(offset, offset + line.length);
    }
    offset += line.length;
  }

  const withoutBlocks = output.join("");
  for (const match of withoutBlocks.matchAll(/(`+)([^\n]*?)\1/g)) mask(match.index, match.index + match[0].length);
  return output.join("");
}

function maskMarkdownDestinations(markdown) {
  const output = markdown.split("");
  for (const match of markdown.matchAll(/!\[[^\]\n]*\]\((?:\\.|[^)\n])*\)/g)) {
    for (let index = match.index; index < match.index + match[0].length; index += 1) {
      if (output[index] !== "\n" && output[index] !== "\r") output[index] = " ";
    }
  }
  for (const match of markdown.matchAll(/\]\((?:\\.|[^)\n])*\)/g)) {
    for (let index = match.index; index < match.index + match[0].length; index += 1) {
      if (output[index] !== "\n" && output[index] !== "\r") output[index] = " ";
    }
  }
  return output.join("");
}

function replaceVisibleMatches(markdown, visible, pattern, replacement) {
  const matches = [...visible.matchAll(pattern)];
  let result = markdown;
  for (const match of matches.reverse()) {
    result = `${result.slice(0, match.index)}${replacement(match)}${result.slice(match.index + match[0].length)}`;
  }
  return result;
}

function countSourceLinks(markdown) {
  return [...markdown.matchAll(new RegExp(SOURCE_LINK.source, "g"))].length;
}

function at(markdown, index, file, code, message) {
  const prefix = markdown.slice(0, index);
  const line = prefix.split(/\r?\n/).length;
  const column = index - Math.max(prefix.lastIndexOf("\n"), prefix.lastIndexOf("\r"));
  return `${file}:${line}:${column}: ${code}: ${message}`;
}

function walkMarkdown(root, directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walkMarkdown(root, absolute));
    else if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  return found;
}

async function main() {
  const root = process.cwd();
  if (process.argv.includes("--write")) {
    const result = rewriteReaderSourceLinks(root);
    console.log(`Linked ${result.linkedGroups} source citations across ${result.changedFiles} reader-facing files.`);
  }
  const issues = validateReaderSourceLinks(root);
  if (issues.length) {
    console.error("Reader source-link contract failed:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log("Reader source-link contract passed: every visible SRC-NNN resolves to its exact registered source row.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
