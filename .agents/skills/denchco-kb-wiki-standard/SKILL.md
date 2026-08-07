---
name: denchco-kb-wiki-standard
description: Audit, instantiate, validate, or upgrade an OKF-compatible DenchCo Knowledge Base Wiki.
---

# DenchCo Knowledge Base Wiki Standard

Read the repository `AGENTS.md`, `.wiki-standard.yaml`, `docs/spec/index.md`, selected profile, `DEPENDENCIES.md`, and `docs/llm-wiki/index.md` completely before acting. Treat `knowledge/` as the explicit OKF bundle; renderer pages and generated files are not implicit OKF concepts.

For instantiation, read `prompts/instantiate-wiki.md`. For audits, distinguish a project-owned formal claim from a read-only inferred adoption assessment, and map required roles to actual paths rather than relying on filenames. For upgrades, compare the pinned release and requirement IDs, preserve deviations and unknown OKF fields, and produce a reviewable patch; never overwrite local changes from the latest template.

Use Graphify first when the target has a graph. If query recall is insufficient, continue through its graph wiki/report and then scoped canonical sources. Run the target's declared verification and report manual, failed, and unrun checks separately.

Prefer the repository CLI:

```sh
npm run conformance:inspect -- <target> --json
npm run conformance:validate -- <target> --strict --json
npm run conformance:diff -- <target> --json
npm run conformance:upgrade-plan -- <target> --json
npm run conformance:init-plan -- <target> --profile <profile> --json
```

`init` and `upgrade` are planning-only in this candidate and never apply changes. Do not publish, deploy, create a repository, or make a formal claim without explicit authority. A waiver requires a named authority and an expiry or review state.

When a user-authored consumer implementation may be reusable, finish, verify, and JJ-commit the project-owned implementation first, then create one tracked schema-valid record under `standard-proposals/` with its full Git-compatible commit, optional JJ change ID, and pinned Standard revision. Treat that record as authoritative and generated sanitised payloads under ignored `output/standard-proposals/` as disposable. Use the repository's `standard:proposal` CLI to validate and scrub the record, render the exact repository/title/labels/body deterministically, bind approval to the SHA-256 of that payload plus the governed form bytes, and search open and closed issues read-only by its stable hidden marker. `open` only read-checks and opens the published governed form after showing the exact approved payload; the user submits. A payload or form change invalidates approval. Fail closed if the form or `standard-change` label is unavailable or a network result is ambiguous, and reconcile by marker rather than creating again. Never upload patches, screenshots, or evidence automatically. Record issue linkage, explicit Standard decision, accepted requirement IDs, immutable release inclusion, and separately authorised consumer adoption as distinct JJ phases. A closed issue is not acceptance; filing, acceptance, and release never imply a PR, publication, migration, pin, or conformance change.

When `DKBWS-LINK-002` applies, verify that every registered source identity displayed in the Human Wiki is an independent internal link to its exact mapped source-register row. Lists retain one link per displayed identity, compact ranges link their displayed endpoints, and direct links naming official authorities or publications use registered source URLs. Require source lint plus a built-output keyboard-focus, accessible-identity, exact-fragment, destination-row, and responsive-containment journey. Keep rewriting optional and reviewable; subject-empty, agent-only, and citation-free targets record the rule as not applicable rather than inventing evidence.

When `DKBWS-HUMAN-004` applies, require one mapped authoritative canonical-question source and a bounded reader-source set. Exact-text lint must reject every verbatim repetition in that set that is not the same `governing-question` callout, and built-output checks must visit every repetition route at desktop and mobile widths. Keep paraphrases, unrelated quotations, and historical/source records outside the declared reader set neutral. A subject-empty Wiki records the rule as not applicable rather than inventing a question.

When `DKBWS-RUNTIME-002` applies, derive a project-unique stable service ID and serialize the shared-register reload, conflict checks, live exclusive bind, and atomic reservation publication under a bounded user-local lock. Refuse another project's identity, registered endpoint, or unmanaged listener without killing or overwriting it. Publish the `service-identity-v1` marker and require exact registration, adapter installation, adapter load, HTTP 200, and marker identity for status. A requested preview uses the exact registered URL in the selected browser after status passes; a temporary alternate-port server proves only `DKBWS-RUNTIME-001`.

For `standard-production`, treat `DKBWS-PROV-001` as a maintenance-workspace and development turn obligation: use Git-interoperable history and colocated Jujutsu at the same repository root. Before ending every turn that changed persistent repository files, run the complete applicable verification and read-only maintainer provenance check, inspect Git and Jujutsu state, and commit that turn's changes in Jujutsu before the final response. Disclose failed or unrun checks in the commit and response instead of leaving the changes only in the working copy. Do not apply a subjective “substantive work” threshold, and do not create an empty commit for a no-change turn. Use distribution/CI mode only for an explicitly Git-only checkout; it reports Jujutsu maintainer provenance as not checked and must not be described as a maintainer-workspace pass. Portable Core remains Git-only compatible.

When material information is genuinely missing, ask one sequential question using `Question 1 of N`; revise `N` after each answer. Do not ask for choices already resolved by the manifest, target evidence, or a reversible standard default.

Complete the requested scope before recommending more work. Apply the repository handoff cycle guard and use `docs/project/status.md` plus the validation queue to distinguish active work from parked work. Include no more than three Next Steps, and only when the user requests them, work remains incomplete or blocked, or a named workflow requires a handoff. Every item must map to unfinished requested scope, a failed or unrun required check, or a decision requiring user authority; never invent adjacent work to fill a list.
