import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  inspectGoverningQuestionRepetitions,
  maskNonReaderMarkdown,
  routeFromMarkdownPath,
} from "./check-governing-question-repetitions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = path.join(ROOT, "fixtures");

test("conforming bounded repetitions produce exact reader routes", () => {
  const result = inspectGoverningQuestionRepetitions(path.join(FIXTURES, "conforming/governing-question-repetitions"));
  assert.deepEqual(result.issues, []);
  assert.equal(result.selected, true);
  assert.equal(result.applicable, true);
  assert.equal(result.canonicalQuestion, "How should this maintained wiki remain inspectable and reviewable?");
  assert.deepEqual(result.repetitionRoutes, [
    { source: "docs/index.md", route: "/", repetitions: 1 },
    { source: "docs/research/answer.md", route: "/research/answer/", repetitions: 1 },
  ]);
});

test("plain exact repetitions and mismatched governed callouts fail with stable diagnostics", () => {
  const result = inspectGoverningQuestionRepetitions(path.join(FIXTURES, "nonconforming/governing-question-repetitions"));
  const issues = result.issues.join("\n");
  assert.match(issues, /DKBWS-HUMAN-004-UNGOVERNED/);
  assert.match(issues, /DKBWS-HUMAN-004-MISMATCH/);
  assert.match(issues, /DKBWS-HUMAN-004-READER-PATH/);
});

test("an explicit subject-empty deviation skips mappings and does not invent a question", () => {
  const result = inspectGoverningQuestionRepetitions(path.join(FIXTURES, "conforming/governing-question-subject-empty"));
  assert.deepEqual(result.issues, []);
  assert.equal(result.selected, true);
  assert.equal(result.applicable, false);
  assert.equal(result.canonicalQuestion, null);
  assert.deepEqual(result.repetitionRoutes, []);
});

test("masking preserves offsets while excluding frontmatter, comments, fences, and inline code", () => {
  const question = "How should this maintained wiki remain inspectable and reviewable?";
  const markdown = [
    "---",
    `description: \"${question}\"`,
    "---",
    `<!-- ${question} -->`,
    `\`${question}\``,
    "````text",
    question,
    "```",
    question,
    "````",
    `Visible: ${question}`,
  ].join("\n");
  const visible = maskNonReaderMarkdown(markdown);
  assert.equal(visible.length, markdown.length);
  assert.equal(visible.split(question).length - 1, 1);
  assert.equal(visible.indexOf(question), markdown.lastIndexOf(question));
});

test("route derivation handles home, nested pages, and nested indexes", () => {
  assert.equal(routeFromMarkdownPath("docs/index.md"), "/");
  assert.equal(routeFromMarkdownPath("docs/research/answer.md"), "/research/answer/");
  assert.equal(routeFromMarkdownPath("docs/research/index.md"), "/research/");
});
