import { maskCode } from "./development-response-links.mjs";

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
  return { status: diagnostics.length ? "invalid" : "valid", diagnostics };
}
