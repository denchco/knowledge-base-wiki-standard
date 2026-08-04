# Instantiate a DenchCo Knowledge Base Wiki

Use this prompt from an immutable released copy of the standard. Human guidance is published at <https://denchco.github.io/knowledge-base-wiki-documentation/>; normative files remain in <https://github.com/denchco/knowledge-base-wiki-standard>.

```text
Apply the DenchCo Knowledge Base Wiki Standard from
https://github.com/denchco/knowledge-base-wiki-standard at
[immutable release tag or commit] to [absolute independent target path].

Topic and intended scope: [topic, audience, governing question or reader task,
and the outcome the wiki must support].

Selected profile: [standard-production unless explicitly overridden].

Target Wiki URL: [consumer-owned canonical URL].

Target deployment: [consumer-selected adapter or none].
```

## Instruction to the implementation agent

1. Resolve the exact release tag or commit before acting. Do not use a moving branch, `latest`, or the public documentation site as normative input.
2. Read the pinned standard repository `AGENTS.md`, manifest, normative specification, selected profile, dependency contract, LLM Wiki entry point, `starter/starter.yaml`, and this prompt completely.
3. Treat the standard and target as different repositories. Never recursively copy the standard root, and never install its help pages, `knowledge/` bundle, source/evidence records, dogfood reports, fixtures, project status, or documentation deployment as target content.
4. Read the target's nearest instructions and inspect its repository, renderer, design, evidence, generated artifacts, services, and version-control state.
5. If the target has `graphify-out/graph.json`, query Graphify before broad browsing. If recall is insufficient, continue through its generated wiki/report and then scoped canonical target sources; record the fallback.
6. Preserve existing work and stronger verified patterns. New wikis use the subject-empty starter boundary, pinned Zensical, and the DenchCo visual profile; existing wikis retain their renderer unless migration is explicitly authorized.
7. Render only allowlisted starter templates. Build the target's topic, sources, evidence, validation queue, synthesis, Human Wiki, LLM Wiki, concept registry, logs, navigation, and graph from its own subject matter. Resolve every placeholder before claiming readiness.
8. Establish the OKF v0.2-compatible canonical Markdown, generated discovery, Graphify, design, conformance, runtime, and release roles required by the selected profile.
9. If the Human Wiki displays a governing-question callout, expose the `governing-question` marker and bind both its inline-start rail and question text to the active accent colour at every supported viewport. Keep ordinary quotations neutral and prove the distinction in built-output browser checks.
10. Install dependencies from locks. Distinguish universal, build, runtime, verification, deployment, and optional dependencies.
11. Record the standard source and immutable revision in the target manifest. Record the target's own Wiki URL and deployment choice; do not inherit either from the standard or documentation repository.
12. Initialize Git only at a maintainable child boundary. For Standard Production maintenance workspaces, satisfy `DKBWS-PROV-001`: retain Git-interoperable history, colocate Jujutsu at the same repository root, use the reference-qualified dependency boundary, and record validated phase history. A Portable Core or explicit distribution/CI checkout may remain Git-only but MUST NOT claim maintainer-workspace provenance.
13. Use the target's selected local service adapter and reserve a conflict-free endpoint when persistent serving applies. Health means HTTP 200.
14. Run the complete verification contract for every claimed capability. Do not claim unrun or source-only checks as rendered proof.
15. Record profile, versions, capabilities, deviations, verification, and reusable contributions in the target manifest/conformance record. A waiver is valid only when it names authority, rationale, and an expiry or review state.

Where a material uncertainty remains, ask one question at a time using `Question 1 of N`. Each answer informs the next question and `N` is updated as uncertainty changes. Do not ask when evidence or a safe reversible default resolves the choice.

Use a completion-first handoff: complete the requested implementation before proposing further work. The handoff must state what was built, profile and versions, validation and limitations, canonical file links, and available Wiki URLs.

Next Steps are recommendations, not authority to expand the implementation. Include them only when requested, required work remains incomplete or blocked, or this named instantiation workflow needs a handoff. Include no more than three. Every item must map to an unfinished requested deliverable, a failed or unrun required check, or a decision requiring user authority; name its target and completion condition. Do not add adjacent research, generic improvements, passive waits, invitations to continue, or filler to reach a count. If no item qualifies, omit the section.
