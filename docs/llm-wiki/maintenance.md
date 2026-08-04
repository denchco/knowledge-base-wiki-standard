---
type: Maintenance Guide
title: Maintenance
description: Repeatable standard maintenance cycle.
status: draft
---

# Maintenance

1. Inspect repository and manifest state.
2. Query Graphify where available.
3. Identify canonical and generated surfaces.
4. Register new external evidence before changing normative claims.
5. Add or amend stable requirements, applicability, diagnostics, and migration effects.
6. Update schemas, profile, prompts, LLM context, fixtures, and changelog together.
7. Run `npm run verify`.
8. Refresh Graphify explicitly.
9. Inspect Git and Jujutsu state.
10. Record a validated JJ phase and prepare a reviewable Git change.

## Consumer-derived proposals

When a user-authored consumer change appears reusable, preserve its originating project and immutable revision and use the [standard-change issue form](https://github.com/denchco/knowledge-base-wiki-standard/issues/new?template=standard-change.yml). Complete and verify the project-owned request first, search existing issues read-only, and prepare ignored `output/standard-change-proposal.md` with classification, affected contract, evidence, accessibility/browser results, dependencies, fallback, fixtures, and migration impact. Scrub private paths, secrets, personal or confidential data, restricted evidence, vulnerability detail, and unlicensed material.

Before any remote write, show the exact repository, title, body, and labels and obtain explicit authority. If the form is unavailable, stop with the local draft rather than substituting a connector or CLI write. Filing does not promote the pattern or authorize a PR, release, publication, migration, pin, or conformance change.

Clarification follows the sequential `Question 1 of N` protocol in `AGENTS.md`.

Follow-up selection follows the same file's completion and cycle guard. A candidate is eligible only when it advances unfinished requested scope, addresses a failed or unrun required check, or asks for authority needed to continue. It must fit one follow-up pass and state a completion condition. Park blocked work in project status or the validation queue with `blocked_by`, `reopen_when`, and `last_checked`; it remains ineligible until that trigger occurs. Do not recommend optional adjacent research or generic maintenance merely to fill a list.
