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

When a user-authored consumer implementation may be reusable, preserve its project and immutable revision and prepare the Standard's `standard-change.yml` issue form with reuse class, dependencies, fallback, evidence, accessibility/browser results, fixtures, and migration impact. Do not submit a remote issue without explicit authority. A filed proposal remains unpromoted until maintainer classification and review.

For `standard-production`, treat `DKBWS-PROV-001` as a maintenance-workspace obligation: use Git-interoperable history and colocated Jujutsu at the same repository root, then run the read-only provenance checker before recording a validated phase. Use distribution/CI mode only for an explicitly Git-only checkout; it reports Jujutsu maintainer provenance as not checked and must not be described as a maintainer-workspace pass. Portable Core remains Git-only compatible.

When material information is genuinely missing, ask one sequential question using `Question 1 of N`; revise `N` after each answer. Do not ask for choices already resolved by the manifest, target evidence, or a reversible standard default.

Complete the requested scope before recommending more work. Apply the repository handoff cycle guard and use `docs/project/status.md` plus the validation queue to distinguish active work from parked work. Include no more than three Next Steps, and only when the user requests them, work remains incomplete or blocked, or a named workflow requires a handoff. Every item must map to unfinished requested scope, a failed or unrun required check, or a decision requiring user authority; never invent adjacent work to fill a list.
