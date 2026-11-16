import { maskCode } from "./development-response-links.mjs";
import { checkNextStepsResponse, NO_UPDATE } from "./development-next-steps.mjs";

/** Structural subset of DKBWS-PROMPT-001. Goal relevance needs agent review. */
export function lintDevelopmentResponseHandoff(source) {
  const visible = maskCode(source).replace(/<!--[\s\S]*?-->/g, "");
  const diagnostics = [];
  const headings = [...visible.matchAll(/^[ \t]{0,3}(?:#{1,6}[ \t]+|\*\*)?Next steps(?:\*\*)?[ \t]*:?[ \t]*$/gim)];
  if (headings.length > 1) diagnostics.push({ code: "DKBWS-RESPONSE-HANDOFF-DUPLICATE-001", line: 1 });
  for (const heading of headings) {
    const rest = visible.slice(heading.index + heading[0].length);
    const section = rest.split(/^#{1,6}\s+/m, 1)[0];
    const items = [...section.matchAll(/^(?:[-*+] |\d+[.)] )(.+)$/gm)];
    if (items.length > 3) diagnostics.push({ code: "DKBWS-RESPONSE-HANDOFF-LIMIT-001", line: visible.slice(0, heading.index).split("\n").length });
    if (items.length === 0) diagnostics.push({ code: "DKBWS-RESPONSE-HANDOFF-EMPTY-001", line: visible.slice(0, heading.index).split("\n").length });
  }
  // Stop sees all answers. Only inspect an explicit handoff; the dedicated CLI
  // is used when the agent knows this is a development-cycle completion.
  if (headings.length || visible.split(/\r?\n/).some((line) => line.trim() === NO_UPDATE)) {
    for (const code of checkNextStepsResponse(visible)) diagnostics.push({ code: `DKBWS-RESPONSE-HANDOFF-FORMAT-001:${code}`, line: 1 });
  }
  return { status: diagnostics.length ? "invalid" : "valid", diagnostics };
}
