// Bundle the external-dependency core; Mermaid's prebuilt browser bundles embed
// their own DOMPurify and are therefore outside the npm lock's sanitizer audit.
import mermaid from "mermaid/dist/mermaid.core.mjs";
import DOMPurify from "dompurify";
import katex from "katex";

// This refers to the same aliased module imported by every Mermaid core chunk.
if (DOMPurify.version !== "3.4.16") throw new Error("Unqualified Mermaid sanitizer runtime");
if (katex.version !== "0.18.2") throw new Error("Unqualified Mermaid math runtime");
globalThis.mermaid = mermaid;
