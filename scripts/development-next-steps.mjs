#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const NO_UPDATE = "No further grounded content update is available.";

// Instruction checks prove propagation. Grounding and cycle eligibility require human/agent review.
export function checkHandoffInstructions(source) {
  const failures = [];
  const required = [
    [/every development cycle/i, "cadence"],
    [/continuing subject/i, "continuing-subject"],
    [/content maturity/i, "content-maturity"],
    [/no more than three/i, "bounded-count"],
    [/prioritise subject content and evidence/i, "content-first"],
    [/failed or unrun required check/i, "required-verification"],
    [/Proposed update:/, "proposed-update"],
    [/Why it matters:/, "why-it-matters"],
    [/Done when:/, "done-when"],
    [/not continuation authority/i, "execution-boundary"],
    [/handoff evidence/i, "handoff-evidence"],
    [/blocked_by/, "parked-blocker"],
    [/reopen_when/, "parked-trigger"],
    [/last_checked/, "parked-date"],
    [/No further grounded content update is available\./, "no-update-outcome"],
  ];
  for (const [pattern, id] of required) if (!pattern.test(source)) failures.push(`handoff.${id}`);
  if (/include (?:them |next steps )?only when|only when (?:the user|requested)|if no item qualifies, omit|a completed answer does not need/i.test(source)) failures.push("handoff.conditional-only-policy");
  return failures;
}

function visibleText(source) {
  return source.replace(/<!--[^]*?-->/g, "").replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[^]*?^ {0,3}\1[^\n]*(?:\n|$)/gm, "");
}

export function checkNextStepsResponse(source) {
  const text = visibleText(source);
  const failures = [];
  const heading = /^(?:#{1,6}\s+|\*\*)?Next steps:?(?:\*\*)?\s*$/im;
  const match = heading.exec(text);
  if ([...text.matchAll(new RegExp(heading.source, "gim"))].length > 1) failures.push("next-steps.duplicate-sections");
  const noUpdate = text.split(/\r?\n/).some((line) => line.trim() === NO_UPDATE);
  if (!match) return noUpdate ? [] : ["next-steps.missing-outcome"];
  if (noUpdate) failures.push("next-steps.conflicting-outcomes");
  const rest = text.slice(match.index + match[0].length).split(/^#{1,6}\s/m)[0];
  const starts = [...rest.matchAll(/^([1-9]\d*)\.\s+/gm)];
  if (starts.length < 1 || starts.length > 3) failures.push("next-steps.item-count");
  if (rest.slice(0, starts[0]?.index ?? rest.length).trim()) failures.push("next-steps.unstructured-content");
  starts.forEach((start, index) => {
    if (Number(start[1]) !== index + 1) failures.push(`next-steps.item-${index + 1}.priority-order`);
    const item = rest.slice(start.index + start[0].length, starts[index + 1]?.index ?? rest.length).replace(/\*\*/g, "").trim();
    const fields = /^(?:Proposed update:)\s*([^]+?)\s+Why it matters:\s*([^]+?)\s+Done when:\s*([^]+)$/;
    const parts = fields.exec(item);
    if (!parts || parts.slice(1).some((part) => !part.trim()) || ["Proposed update:", "Why it matters:", "Done when:"].some((label) => item.split(label).length !== 2)) failures.push(`next-steps.item-${index + 1}.required-fields`);
  });
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--input")) {
    console.error("Usage: development-next-steps.mjs [--input <draft>]");
    process.exitCode = 2;
  } else {
    try {
      const failures = checkNextStepsResponse(readFileSync(args[1] ?? 0, "utf8"));
      if (failures.length) {
        console.error(failures.join("\n"));
        process.exitCode = 1;
      } else console.log("Next-step format passed; grounding, priority and cycle eligibility require review.");
    } catch (error) {
      console.error(`Cannot read response draft: ${error.message}`);
      process.exitCode = 2;
    }
  }
}
