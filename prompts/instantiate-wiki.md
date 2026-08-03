# Instantiate a DenchCo Knowledge Base Wiki

Use this prompt from a cloned or released copy of the standard:

```text
Apply the DenchCo Knowledge Base Wiki Standard from [path or release URL]
to [absolute target path].

Topic and intended scope: [topic, audience, governing question or reader task,
and the outcome the wiki must support].

Selected profile: [standard-production unless explicitly overridden].
```

## Instruction to the implementation agent

1. Read the standard repository `AGENTS.md`, manifest, normative specification, selected profile, dependency contract, LLM Wiki entry point, and this prompt completely.
2. Read the target's nearest instructions and inspect its repository, renderer, design, evidence, generated artifacts, services, and version-control state.
3. If the target has `graphify-out/graph.json`, query Graphify before broad browsing. If recall is insufficient, continue through its generated wiki/report and then scoped canonical sources; record the fallback.
4. Preserve existing work and stronger verified patterns. New wikis use pinned Zensical plus the DenchCo visual profile; existing wikis retain their renderer unless migration is explicitly authorized.
5. Establish OKF v0.2-compatible canonical Markdown, sources, evidence, validation queue, synthesis, Human Wiki, LLM Wiki, concept registry, logs, generated discovery, Graphify, design, conformance, runtime, and release roles required by the selected profile.
6. Install dependencies from locks. Distinguish universal, build, runtime, verification, deployment, and optional dependencies.
7. Initialize Git only at a maintainable child boundary. For Standard Production maintenance workspaces, satisfy `DKBWS-PROV-001`: retain Git-interoperable history, colocate Jujutsu at the same repository root, use the reference-qualified dependency boundary, and record validated phase history. A Portable Core or explicit distribution/CI checkout may remain Git-only but MUST NOT claim maintainer-workspace provenance.
8. Use the standard local service adapter and reserve a conflict-free endpoint when persistent serving applies. Health means HTTP 200.
9. Run the complete verification contract for every claimed capability. Do not claim unrun or source-only checks as rendered proof.
10. Record profile, versions, capabilities, deviations, verification, and reusable contributions in the target manifest/conformance record. A waiver is valid only when it names authority, rationale, and an expiry or review state.

Where a material uncertainty remains, ask one question at a time using `Question 1 of N`. Each answer informs the next question and `N` is updated as uncertainty changes. Do not ask when evidence or a safe reversible default resolves the choice.

Complete the implementation unless blocked. The handoff must state what was built, profile and versions, validation and limitations, canonical file links, available Wiki URLs, and exactly three discrete high-impact next steps.
