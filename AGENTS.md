# Agent Instructions

## Read order

1. `.wiki-standard.yaml`
2. `docs/spec/index.md`
3. `docs/llm-wiki/index.md`
4. `docs/project/status.md`
5. `DESIGN.md` for visual changes
6. Graphify query results when `graphify-out/graph.json` exists

When the user's intent is to instantiate an independent wiki by pointing at this repository, route immediately to `prompts/instantiate-wiki.md` and its URL-only adaptive discovery. Do not require the user to construct the old field-based prompt.

## Authority and safety

- Canonical knowledge lives in maintained Markdown and registered evidence, never in generated HTML, LLM artifacts, Graphify output, or conversational answers.
- When a Human Wiki displays registered source identities, keep each identity as an independent internal link to its exact mapped source-register row; direct links naming official authorities or publications use registered source URLs. Do not invent citations for subject-empty or citation-free content.
- When a Human Wiki declares a canonical governing question, map its authoritative source and bounded reader-source set. Every verbatim repetition in that set uses the governed callout; paraphrases, unrelated quotations, and records outside the declared reader set remain neutral. Do not invent a question for a subject-empty Wiki.
- Preserve unknown OKF frontmatter fields and documented local deviations.
- Do not silently change the declared profile, waive a requirement, publish to GitHub, deploy, or alter evidence status.
- `npm run check` and `npm run verify` never rewrite canonical source. Verification may rebuild only the declared derived paths (`site/`, `graphify-out/`, `.cache/`, `output/verification/`, `output/standard-proposals/`, `GRAPH_REPORT.md`, and generated runtime/graph assets); unexpected tracked or unignored canonical changes fail the contract.
- Conformance `inspect`, `validate`, `export-okf`, and `diff` are read-only. Candidate `upgrade` and `init` require `--dry-run`, emit review plans only, and have no apply mode.
- Use Git for interoperable history and GitHub releases. Standard Production maintenance workspaces use colocated Jujutsu for local phase provenance under `DKBWS-PROV-001`; explicit distribution/CI mode is Git-only and does not prove that maintainer obligation.

## Clarification protocol

Where requirements are uncertain, ask sequential, individual, independent questions only. Each answer must inform the next question. Prefix each question with the current running form:

```text
Question 1 of N
Question 2 of N
```

Update `N` as uncertainty narrows or expands. Do not ask a routine question when the standard, manifest, target evidence, or a reversible default resolves it safely.

<!-- DKBWS-PROV-001-TURN:START -->
## Development-turn completion

- In a Standard Production maintenance workspace, every development turn that changes persistent repository files MUST end with that turn's changes recorded in a Jujutsu commit before the agent gives its final response.
- Run the repository's complete applicable verification and the read-only maintainer provenance check first, then inspect Git and Jujutsu state and commit the turn's changes. A failed or unrun required check MUST be reported in the commit description and final response; it does not permit an uncommitted final handoff.
- The boundary is the end of the development turn, not a subjective judgement that work is “substantive.” If the turn changed no persistent files, do not create an empty commit.
<!-- DKBWS-PROV-001-TURN:END -->

<!-- DKBWS-PROMPT-001-HANDOFF:START -->
## Completion and handoff

- Complete the requested scope before proposing further work.
- `Next Steps` are recommendations, not continuation authority. Include them only when the user asks for them, required work remains incomplete or blocked, or a named workflow requires a handoff.
- Include no more than three. Every item must map to an unfinished requested deliverable, a failed or unrun required check, or a decision requiring the user's authority. It must name the target artifact or outcome, be executable in one follow-up pass, and state its completion condition.
- Apply a cycle guard before selecting items. Do not reopen a bounded, parked, or evidence-blocked trail without new evidence, a due scheduled recheck, or explicit user instruction. Record parked work with `blocked_by`, `reopen_when`, and `last_checked` fields.
- Do not add optional adjacent research, generic improvements, passive waiting, invitations to continue, or filler merely to reach a count. If no item qualifies, omit the section and stop.
- Keep zero to three current project priorities in `docs/project/status.md`. Surface that list for status or roadmap work, not as automatic response boilerplate.
<!-- DKBWS-PROMPT-001-HANDOFF:END -->

## Change protocol

- Normative changes require a stable requirement ID, applicability, verification method, migration impact, changelog entry, and fixture change where automatable.
- Changes derived from a project remain proposals until classified as project-specific, reusable, preferred, or core.
- Route a user-authored consumer improvement through one tracked, schema-valid record under `standard-proposals/`, preserving the originating project, full Git-compatible implementation commit, optional JJ change ID, and pinned Standard revision. Finish, verify, and commit the project-owned implementation first. The tracked record is authoritative; generated sanitised payloads under ignored `output/standard-proposals/` are disposable.
- Use `npm run standard:proposal -- check|prepare|show|open|record|sync --check` for the governed lifecycle. Search open and closed issues read-only by the stable hidden marker, scrub private paths, secrets, personal or confidential data, restricted evidence, vulnerability detail, and unlicensed material, and bind approval to the SHA-256 of the exact repository, title, labels, body, and governed form bytes. Any payload or form edit invalidates approval.
- `open` may only read-check the published issue form and `standard-change` label, show the exact approved payload, and open that governed form; the user performs final submission. If the form or label is unavailable or a network outcome is ambiguous, fail closed and reconcile by marker. Do not substitute `gh issue create`, a connector write, or automatic patch/evidence upload.
- Record issue linkage, explicit Standard decision, accepted requirement IDs, immutable release inclusion, and any later consumer adoption as separate states and JJ commits. A closed issue is not acceptance, acceptance is not a release, and a release never authorises a consumer pin change or adoption.
- Before ending each file-changing development turn, apply the managed `DKBWS-PROV-001` completion policy above.
- After modifying canonical content or code, run `npm run graph:update` when Graphify is available.
- If a Graphify query has insufficient recall, continue through its wiki/report and then the smallest relevant canonical source set; never treat graph absence as evidence absence.
