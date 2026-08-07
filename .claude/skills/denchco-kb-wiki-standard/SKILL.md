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

When a user-authored consumer implementation may be reusable, preserve its project and immutable revision, finish and verify the project-owned implementation, search existing issues read-only, and prepare ignored `output/standard-change-proposal.md` for the Standard's `standard-change.yml` form with reuse class, dependencies, fallback, evidence, accessibility/browser results, fixtures, and migration impact. Scrub private paths, secrets, personal or confidential data, restricted evidence, vulnerability detail, and unlicensed material. Before any remote write, show the exact repository, title, body, and labels and obtain explicit authority; if the form is unavailable, stop with the local draft rather than using a connector or CLI fallback. Filing remains unpromoted and does not authorize a PR, release, publication, migration, pin, or conformance change.

When `DKBWS-LINK-002` applies, verify that every registered source identity displayed in the Human Wiki is an independent internal link to its exact mapped source-register row. Lists retain one link per displayed identity, compact ranges link their displayed endpoints, and direct links naming official authorities or publications use registered source URLs. Require source lint plus a built-output keyboard-focus, accessible-identity, exact-fragment, destination-row, and responsive-containment journey. Keep rewriting optional and reviewable; subject-empty, agent-only, and citation-free targets record the rule as not applicable rather than inventing evidence.

When `DKBWS-RUNTIME-002` applies, derive a project-unique stable service ID and serialize the shared-register reload, conflict checks, live exclusive bind, and atomic reservation publication under a bounded user-local lock. Refuse another project's identity, registered endpoint, or unmanaged listener without killing or overwriting it. Publish the `service-identity-v1` marker and require exact registration, adapter installation, adapter load, HTTP 200, and marker identity for status. A requested preview uses the exact registered URL in the selected browser after status passes; a temporary alternate-port server proves only `DKBWS-RUNTIME-001`.

For `standard-production`, treat `DKBWS-PROV-001` as a maintenance-workspace and development turn obligation: use Git-interoperable history and colocated Jujutsu at the same repository root. Before ending every turn that changed persistent repository files, run the complete applicable verification and read-only maintainer provenance check, inspect Git and Jujutsu state, and commit that turn's changes in Jujutsu before the final response. Disclose failed or unrun checks in the commit and response instead of leaving the changes only in the working copy. Do not apply a subjective “substantive work” threshold, and do not create an empty commit for a no-change turn. Use distribution/CI mode only for an explicitly Git-only checkout; it reports Jujutsu maintainer provenance as not checked and must not be described as a maintainer-workspace pass. Portable Core remains Git-only compatible.

When material information is genuinely missing, ask one sequential question using `Question 1 of N`; revise `N` after each answer. Do not ask for choices already resolved by the manifest, target evidence, or a reversible standard default.

Complete the requested scope before recommending more work. Apply the repository handoff cycle guard and use `docs/project/status.md` plus the validation queue to distinguish active work from parked work. Include no more than three Next Steps, and only when the user requests them, work remains incomplete or blocked, or a named workflow requires a handoff. Every item must map to unfinished requested scope, a failed or unrun required check, or a decision requiring user authority; never invent adjacent work to fill a list.
