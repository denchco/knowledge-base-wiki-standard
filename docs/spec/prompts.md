---
type: Prompt Specification
title: Prompt and question contract
description: Canonical prompt distribution and clarification behaviour.
status: draft
---

# Prompt and question contract

The canonical instantiation prompt is `prompts/instantiate-wiki.md`. It MUST be self-contained through repository-relative references and MUST NOT depend on machine-specific absolute paths after public release. Human guidance MAY route to <https://denchco.github.io/knowledge-base-wiki-documentation/>, but an implementation MUST resolve normative input from an immutable tag or commit of <https://github.com/denchco/knowledge-base-wiki-standard>.

Where uncertainty is material, agents ask one question at a time using `Question 1 of N`. Each answer informs the next question and `N` is revised as uncertainty changes. Routine, reversible choices are resolved from the target, manifest, selected profile, and standard defaults.

The prompt MUST include read order, authority, new-versus-existing migration policy, profile selection, dependency installation, Graphify, the `DKBWS-PROV-001` Git/Jujutsu boundary, service, verification, conformance, and a completion-first handoff. It MUST distinguish a Standard Production maintainer workspace from an explicit Git-only distribution/CI checkout. It MUST also distinguish the standard repository from the independent target, require an immutable revision, use `starter/starter.yaml` as the copy boundary, create subject content fresh, and record the target's own Wiki URL and deployment choice.

Next Steps are recommendations, not continuation authority. An agent includes them only when the user requests them, required work remains incomplete or blocked, or a named workflow requires a handoff. The list MUST contain no more than three items. Each item MUST map to an unfinished requested deliverable, a failed or unrun required check, or a decision requiring user authority; it MUST identify a target artifact or outcome, fit one follow-up pass, and state a completion condition.

The agent MUST apply a cycle guard before selecting an item. Bounded, parked, or evidence-blocked work is ineligible until new evidence appears, a scheduled recheck becomes due, or the user explicitly reopens it. Parked work records `blocked_by`, `reopen_when`, and `last_checked`. Optional adjacent research, generic improvements, passive waiting, invitations to continue, and filler are not Next Steps. If no candidate passes these gates, the handoff omits the section. A project MAY keep zero to three current priorities in its status record, but they are surfaced for status or roadmap work rather than appended automatically to unrelated responses.

An initialization planner MUST cite the canonical prompt, selected profile, and starter contract by content hash. Planning does not authorize scaffolding: it MUST report existing-path collisions as preserve-and-review, MUST NOT create files, and MUST carry unresolved material inputs into the same sequential question protocol. Its layout MUST classify allowlisted subject-empty templates, target-authored subject content, and release-adapted implementation files; recursive root copying and reuse of the standard corpus are forbidden.

Migration impact: agent-profile consumers upgrading from `v0.1.0-rc.1` add the completion/cycle policy to `AGENTS.md`, provide a root `CLAUDE.md` that imports `AGENTS.md` when Claude Code is supported, and separate active priorities from parked validation work. No manifest or OKF content migration is required.
