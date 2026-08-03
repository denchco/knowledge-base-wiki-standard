# Agent Instructions

## Read order

1. `.wiki-standard.yaml`
2. `docs/spec/index.md`
3. `docs/llm-wiki/index.md`
4. `DESIGN.md` for visual changes
5. Graphify query results when `graphify-out/graph.json` exists

## Authority and safety

- Canonical knowledge lives in maintained Markdown and registered evidence, never in generated HTML, LLM artifacts, Graphify output, or conversational answers.
- Preserve unknown OKF frontmatter fields and documented local deviations.
- Do not silently change the declared profile, waive a requirement, publish to GitHub, deploy, or alter evidence status.
- `npm run check` and `npm run verify` never rewrite canonical source. Verification may rebuild only the declared derived paths (`site/`, `graphify-out/`, `.cache/`, `output/verification/`, `GRAPH_REPORT.md`, and generated runtime/graph assets); unexpected tracked or unignored canonical changes fail the contract.
- Conformance `inspect`, `validate`, `export-okf`, and `diff` are read-only. Candidate `upgrade` and `init` require `--dry-run`, emit review plans only, and have no apply mode.
- Use Git for interoperable history and GitHub releases. Standard Production maintenance workspaces use colocated Jujutsu for local phase provenance under `DKBWS-PROV-001`; explicit distribution/CI mode is Git-only and does not prove that maintainer obligation.

## Clarification protocol

Where requirements are uncertain, ask sequential, individual, independent questions only. Each answer must inform the next question. Prefix each question with the current running form:

```text
Question 1 of N
Question 2 of N
```

Update `N` as uncertainty narrows or expands. Do not ask a routine question when the standard, manifest, target evidence, or a reversible default resolves it safely.

## Change protocol

- Normative changes require a stable requirement ID, applicability, verification method, migration impact, changelog entry, and fixture change where automatable.
- Changes derived from a project remain proposals until classified as project-specific, reusable, preferred, or core.
- Run `npm run verify`, run the read-only provenance check in maintainer mode, inspect `git status` and `jj status`, then record a JJ phase for substantive validated work.
- After modifying canonical content or code, run `npm run graph:update` when Graphify is available.
- If a Graphify query has insufficient recall, continue through its wiki/report and then the smallest relevant canonical source set; never treat graph absence as evidence absence.
