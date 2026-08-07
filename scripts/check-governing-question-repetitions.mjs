#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import YAML from "yaml";

import { loadProfile } from "./profile-catalogue.mjs";

const REQUIREMENT = "DKBWS-HUMAN-004";
const GOVERNING_MARKER = /<blockquote\b[^>]*\bclass=["'][^"']*\bgoverning-question\b[^"']*["'][^>]*>\s*<p>([^<]*)<\/p>\s*<\/blockquote>/g;
const ANY_MARKER = /class=["'][^"']*\bgoverning-question\b[^"']*["']/g;

export function inspectGoverningQuestionRepetitions(root = process.cwd()) {
  const absoluteRoot = path.resolve(root);
  const issues = [];
  const result = {
    requirement: REQUIREMENT,
    selected: false,
    applicable: false,
    canonicalSource: null,
    canonicalQuestion: null,
    readerSources: [],
    repetitionRoutes: [],
    issues,
  };

  const manifestPath = path.join(absoluteRoot, ".wiki-standard.yaml");
  let manifest;
  try {
    manifest = YAML.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    issues.push(issue("DKBWS-HUMAN-004-MANIFEST", ".wiki-standard.yaml", `manifest is missing or invalid: ${error.message}`));
    return result;
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || typeof manifest.profile !== "string") {
    issues.push(issue("DKBWS-HUMAN-004-MANIFEST", ".wiki-standard.yaml", "manifest must select a profile"));
    return result;
  }

  let profile;
  try {
    profile = loadProfile(manifest.profile, { standardRoot: absoluteRoot });
  } catch (error) {
    issues.push(issue("DKBWS-HUMAN-004-PROFILE", ".wiki-standard.yaml", error.message));
    return result;
  }
  result.selected = profile.requirements.includes(REQUIREMENT);
  if (!result.selected) return result;

  const notApplicable = (manifest.deviations ?? []).some(deviation => (
    deviation?.requirement === REQUIREMENT && deviation?.status === "not-applicable"
  ));
  if (notApplicable) return result;
  result.applicable = true;

  const canonicalSource = manifest.roles?.governing_question;
  if (!portableMarkdownPath(canonicalSource)) {
    issues.push(issue(
      "DKBWS-HUMAN-004-CANONICAL-PATH",
      ".wiki-standard.yaml",
      "roles.governing_question must map one safe repository-relative Markdown file",
    ));
  } else if (!regularFile(absoluteRoot, canonicalSource)) {
    issues.push(issue("DKBWS-HUMAN-004-CANONICAL-MISSING", canonicalSource, "mapped canonical question source is missing"));
  } else {
    result.canonicalSource = canonicalSource;
  }

  const readerSources = manifest.capabilities?.governing_question?.reader_sources;
  if (!Array.isArray(readerSources) || readerSources.length === 0) {
    issues.push(issue(
      "DKBWS-HUMAN-004-READER-SOURCES",
      ".wiki-standard.yaml",
      "capabilities.governing_question.reader_sources must be a nonempty bounded list",
    ));
  } else {
    const seen = new Set();
    for (const source of readerSources) {
      if (!portableMarkdownPath(source)) {
        issues.push(issue("DKBWS-HUMAN-004-READER-PATH", ".wiki-standard.yaml", `reader source is not a safe repository-relative Markdown path: ${String(source)}`));
        continue;
      }
      if (seen.has(source)) {
        issues.push(issue("DKBWS-HUMAN-004-READER-DUPLICATE", ".wiki-standard.yaml", `reader source is listed more than once: ${source}`));
        continue;
      }
      seen.add(source);
      if (!regularFile(absoluteRoot, source)) {
        issues.push(issue("DKBWS-HUMAN-004-READER-MISSING", source, "bounded reader source is missing"));
        continue;
      }
      result.readerSources.push(source);
    }
  }

  if (result.canonicalSource && !result.readerSources.includes(result.canonicalSource)) {
    issues.push(issue(
      "DKBWS-HUMAN-004-CANONICAL-UNBOUNDED",
      ".wiki-standard.yaml",
      "roles.governing_question must also appear in capabilities.governing_question.reader_sources",
    ));
  }
  if (!result.canonicalSource) return result;

  const canonicalMarkdown = readFileSync(path.join(absoluteRoot, result.canonicalSource), "utf8");
  const canonicalVisible = maskNonReaderMarkdown(canonicalMarkdown);
  const canonicalCallouts = governedCallouts(canonicalVisible);
  if (canonicalCallouts.length !== 1) {
    issues.push(issueAt(
      canonicalMarkdown,
      0,
      result.canonicalSource,
      "DKBWS-HUMAN-004-CANONICAL-CALLOUT",
      `canonical source must contain exactly one governing-question callout; found ${canonicalCallouts.length}`,
    ));
    return result;
  }
  const canonicalQuestion = canonicalCallouts[0].text.trim();
  if (!canonicalQuestion || canonicalQuestion !== canonicalCallouts[0].text) {
    issues.push(issueAt(
      canonicalMarkdown,
      canonicalCallouts[0].textStart,
      result.canonicalSource,
      "DKBWS-HUMAN-004-CANONICAL-TEXT",
      "canonical governing-question text must be nonempty and have no surrounding whitespace",
    ));
    return result;
  }
  result.canonicalQuestion = canonicalQuestion;

  for (const sourcePath of result.readerSources) {
    const markdown = readFileSync(path.join(absoluteRoot, sourcePath), "utf8");
    const visible = maskNonReaderMarkdown(markdown);
    const callouts = governedCallouts(visible);
    const validRanges = [];

    const markerCount = [...visible.matchAll(new RegExp(ANY_MARKER.source, "g"))].length;
    if (markerCount !== callouts.length) {
      issues.push(issueAt(
        markdown,
        0,
        sourcePath,
        "DKBWS-HUMAN-004-MARKER-SHAPE",
        `every governing-question marker must be on a blockquote containing one direct plain-text paragraph; found ${markerCount} marker(s) and ${callouts.length} valid callout(s)`,
      ));
    }

    for (const callout of callouts) {
      if (callout.text === canonicalQuestion) {
        validRanges.push([callout.textStart, callout.textEnd]);
      } else {
        issues.push(issueAt(
          markdown,
          callout.textStart,
          sourcePath,
          "DKBWS-HUMAN-004-MISMATCH",
          "governing-question marker contains text other than the mapped canonical question",
        ));
      }
    }

    let offset = 0;
    let repetitions = 0;
    while (true) {
      const index = visible.indexOf(canonicalQuestion, offset);
      if (index === -1) break;
      repetitions += 1;
      const end = index + canonicalQuestion.length;
      if (!validRanges.some(([start, rangeEnd]) => index >= start && end <= rangeEnd)) {
        issues.push(issueAt(
          markdown,
          index,
          sourcePath,
          "DKBWS-HUMAN-004-UNGOVERNED",
          "exact canonical governing-question repetition must be inside a matching governed callout",
        ));
      }
      offset = end;
    }

    if (repetitions > 0) {
      result.repetitionRoutes.push({
        source: sourcePath,
        route: routeFromMarkdownPath(sourcePath),
        repetitions,
      });
    }
  }

  return result;
}

export function routeFromMarkdownPath(sourcePath) {
  const portable = sourcePath.split("/");
  const relative = portable[0] === "docs" ? portable.slice(1) : portable;
  const joined = relative.join("/").replace(/\.md$/, "");
  if (joined === "index") return "/";
  if (joined.endsWith("/index")) return `/${joined.slice(0, -"/index".length)}/`;
  return `/${joined}/`;
}

export function maskNonReaderMarkdown(markdown) {
  const output = markdown.split("");
  const mask = (start, end) => {
    for (let index = start; index < end; index += 1) {
      if (output[index] !== "\n" && output[index] !== "\r") output[index] = " ";
    }
  };

  const frontmatter = markdown.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (frontmatter) mask(0, frontmatter[0].length);
  for (const match of markdown.matchAll(/<!--[\s\S]*?-->/g)) mask(match.index, match.index + match[0].length);

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

function governedCallouts(markdown) {
  return [...markdown.matchAll(new RegExp(GOVERNING_MARKER.source, "g"))].map(match => {
    const text = match[1];
    const relativeTextStart = match[0].indexOf(text);
    const textStart = match.index + relativeTextStart;
    return {
      text,
      start: match.index,
      end: match.index + match[0].length,
      textStart,
      textEnd: textStart + text.length,
    };
  });
}

function portableMarkdownPath(candidate) {
  if (typeof candidate !== "string" || candidate === "" || candidate.includes("\\") || candidate.includes("\0")) return false;
  if (candidate.startsWith("/") || /^[A-Za-z]:\//.test(candidate) || /^[a-z][a-z0-9+.-]*:/i.test(candidate)) return false;
  const segments = candidate.split("/");
  if (segments.some(segment => segment === "" || segment === "." || segment === "..")) return false;
  return candidate.endsWith(".md") && path.posix.normalize(candidate) === candidate;
}

function regularFile(root, candidate) {
  const absolute = path.resolve(root, ...candidate.split("/"));
  return absolute.startsWith(`${root}${path.sep}`)
    && existsSync(absolute)
    && lstatSync(absolute).isFile();
}

function issue(code, file, message) {
  return `${file}: ${code}: ${message}`;
}

function issueAt(markdown, index, file, code, message) {
  const prefix = markdown.slice(0, index);
  const line = prefix.split(/\r?\n/).length;
  const lastBreak = Math.max(prefix.lastIndexOf("\n"), prefix.lastIndexOf("\r"));
  const column = index - lastBreak;
  return `${file}:${line}:${column}: ${code}: ${message}`;
}

async function main() {
  const result = inspectGoverningQuestionRepetitions();
  if (result.issues.length) {
    console.error("Governing-question repetition contract failed:");
    for (const entry of result.issues) console.error(`- ${entry}`);
    process.exitCode = 1;
    return;
  }
  if (!result.selected) {
    console.log(`${REQUIREMENT} is not selected by the current profile.`);
  } else if (!result.applicable) {
    console.log(`${REQUIREMENT} is explicitly not applicable; no governing question was invented.`);
  } else {
    const count = result.repetitionRoutes.reduce((sum, entry) => sum + entry.repetitions, 0);
    console.log(`Governing-question repetition contract passed: ${count} exact repetition(s) across ${result.repetitionRoutes.length} route(s).`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
