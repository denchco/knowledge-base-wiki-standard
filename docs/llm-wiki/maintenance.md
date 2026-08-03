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

Clarification follows the sequential `Question 1 of N` protocol in `AGENTS.md`.

Follow-up selection follows the same file's completion and cycle guard. A candidate is eligible only when it advances unfinished requested scope, addresses a failed or unrun required check, or asks for authority needed to continue. It must fit one follow-up pass and state a completion condition. Park blocked work in project status or the validation queue with `blocked_by`, `reopen_when`, and `last_checked`; it remains ineligible until that trigger occurs. Do not recommend optional adjacent research or generic maintenance merely to fill a list.
