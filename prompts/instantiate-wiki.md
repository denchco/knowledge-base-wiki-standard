# Instantiate a DenchCo Knowledge Base Wiki

## URL-only invocation

Give an AI implementation agent only this repository URL:

```text
https://github.com/denchco/knowledge-base-wiki-standard
```

When the user points at this repository to start or apply the standard, do not ask them to compose a bootstrap prompt or provide a version, profile, target URL, deployment adapter, or pre-written project brief. Resolve safe defaults and run the adaptive discovery below. Human guidance is published at <https://denchco.github.io/knowledge-base-wiki-documentation/>; normative files remain in the repository above.

## Required first unresolved response

When the user's message contains only the repository URL or otherwise does not already identify a seed or subject-empty intent, ask this first before writing files:

```text
Question 1 of 2
What should this wiki start from: a research topic seed (paste text or provide a
file, folder, URL, or repository), or a subject-empty local wiki?
```

If the user already supplied a seed or explicitly requested a subject-empty start, treat that as the answer and do not repeat the question. The total may grow or shrink after each answer. Ask only one question in each response and inspect any supplied seed or existing target before choosing the next question.

## Adaptive discovery

- **Research topic seed**: read the supplied material first. Infer the proposed title, topic, audience, governing question or reader task, intended outcome, source boundary, target directory name, and candidate accent colour. Do not ask the user to repeat information already present in the seed.
- **Subject-empty local wiki**: create the governed structure without inventing research content, evidence, concepts, or a governing question. Ask for a project title, then use a clearly marked awaiting-seed state until research material arrives.
- **Research extent**: when a seed does not say whether it is the complete source set, ask whether to structure only the supplied material or expand it with authoritative external sources.
- **Sensitive or restricted material**: ask a conditional question only when privacy, licensing, retention, or source authority cannot be determined safely from the seed and target evidence.
- **Accent colour**: derive a candidate from an evidenced brand or existing design contract when available; otherwise propose the DenchCo default `#0b7285`. State the exact hex value and ask whether to use it or replace it. Derive the accessible accent family and contrast token automatically, record the derivation in `DESIGN.md`, and verify at least 4.5:1 contrast for normal accent-coloured text and 3:1 for non-text interactive boundaries against their rendered backgrounds. Do not make the user choose every colour token.
- **Purpose details**: ask separately for a missing audience, governing question or reader task, or intended outcome only when the seed does not support a responsible inference and the omission would change the wiki's structure.
- **Target path**: infer an independent local path from the active workspace and project title. Ask only when more than one maintainable boundary is plausible or a collision exists.

Do not ask about routine defaults. Use `standard-production`, a subject-appropriate title inferred from the seed, an automatically reserved conflict-free loopback Wiki URL, the platform-appropriate local service adapter, and no external deployment. Publication, remote repository creation, credentials, and deployment require separate explicit authority.

After the last material answer, report the inferred and user-selected setup—starting mode or seed, title and purpose, audience and governing question state, research/source scope, target path, profile, accent hex, local Wiki URL, and deployment state—then implement the local wiki. The answers authorise the described local initialization; do not add a redundant confirmation question unless a destructive collision or external action remains.

## Instruction to the implementation agent

1. Resolve the standard repository's current default-branch HEAD to its exact commit SHA before acting, then use that immutable commit for the complete run. Do not ask the user to choose or supply a release tag or commit. Do not retain a moving branch, `latest`, or the public documentation site as normative input.
2. Read the pinned standard repository `AGENTS.md`, manifest, normative specification, selected profile, dependency contract, LLM Wiki entry point, `starter/starter.yaml`, and this prompt completely.
3. Treat the standard and target as different repositories. Never recursively copy the standard root, and never install its help pages, `knowledge/` bundle, source/evidence records, dogfood reports, fixtures, project status, or documentation deployment as target content.
4. Read the target's nearest instructions and inspect its repository, renderer, design, evidence, generated artifacts, services, and version-control state. If no target was supplied, derive an independent local path from the active workspace and inferred title, and stop for clarification only on a collision or ambiguous repository boundary.
5. If the target has `graphify-out/graph.json`, query Graphify before broad browsing. If recall is insufficient, continue through its generated wiki/report and then scoped canonical target sources; record the fallback.
6. Preserve existing work and stronger verified patterns. New wikis use the subject-empty starter boundary, pinned Zensical, and the DenchCo visual profile; existing wikis retain their renderer unless migration is explicitly authorized. A subject-empty initialization does not invent topic claims or render a governing-question callout.
7. Render only allowlisted starter templates. Build the target's topic, sources, evidence, validation queue, synthesis, Human Wiki, LLM Wiki, concept registry, logs, navigation, and graph from its own subject matter. Resolve every placeholder before claiming readiness.
8. Establish the OKF v0.2-compatible canonical Markdown, generated discovery, Graphify, design, conformance, runtime, and release roles required by the selected profile.
9. If the Human Wiki displays a governing-question callout, expose the `governing-question` marker and bind both its inline-start rail and question text to the active accent colour at every supported viewport. Keep ordinary quotations neutral and prove the distinction in built-output browser checks.
10. Install dependencies from locks. Distinguish universal, build, runtime, verification, deployment, and optional dependencies. Do not copy Standard-maintainer `sync:documentation:*` commands, `verify:workspace`, or their sibling-repository contract into a consumer unless it independently declares and implements that capability.
11. Record the standard source and immutable revision in the target manifest. Automatically reserve and record the target's conflict-free loopback Wiki URL and default deployment to none; do not inherit either from the standard or documentation repository.
12. Initialize Git only at a maintainable child boundary. For Standard Production maintenance workspaces, satisfy `DKBWS-PROV-001`: retain Git-interoperable history, colocate Jujutsu at the same repository root, use the reference-qualified dependency boundary, and record validated phase history. A Portable Core or explicit distribution/CI checkout may remain Git-only but MUST NOT claim maintainer-workspace provenance.
13. Use the target's selected local service adapter and reserve a conflict-free endpoint when persistent serving applies. Health means HTTP 200.
14. Run the complete verification contract for every claimed capability. Emit a schema-valid verification-receipt-v1 artifact at `output/verification/receipt.json` and build its paired schema-valid `output/verification/conformance-report.json`; a project-only summary must use a different path. Do not claim unrun or source-only checks as rendered proof.
15. Record profile, versions, capabilities, deviations, verification, and reusable contributions in the target manifest/conformance record. A waiver is valid only when it names authority, rationale, and an expiry or review state.

Where a material uncertainty remains, ask one question at a time using `Question 1 of N`. Each answer informs the next question and `N` is updated as uncertainty changes. Do not ask when evidence or a safe reversible default resolves the choice.

Use a completion-first handoff: complete the requested implementation before proposing further work. The handoff must state what was built, profile and versions, validation and limitations, canonical file links, and available Wiki URLs.

Next Steps are recommendations, not authority to expand the implementation. Include them only when requested, required work remains incomplete or blocked, or this named instantiation workflow needs a handoff. Include no more than three. Every item must map to an unfinished requested deliverable, a failed or unrun required check, or a decision requiring user authority; name its target and completion condition. Do not add adjacent research, generic improvements, passive waits, invitations to continue, or filler to reach a count. If no item qualifies, omit the section.
