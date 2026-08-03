---
type: Prompt Specification
title: Prompt and question contract
description: Canonical prompt distribution and clarification behaviour.
status: draft
---

# Prompt and question contract

The canonical instantiation prompt is `prompts/instantiate-wiki.md`. It MUST be self-contained through repository-relative references and MUST NOT depend on machine-specific absolute paths after public release. Human guidance MAY route to <https://denchco.github.io/knowledge-base-wiki-documentation/>, but an implementation MUST resolve normative input from an immutable tag or commit of <https://github.com/denchco/knowledge-base-wiki-standard>.

Where uncertainty is material, agents ask one question at a time using `Question 1 of N`. Each answer informs the next question and `N` is revised as uncertainty changes. Routine, reversible choices are resolved from the target, manifest, selected profile, and standard defaults.

The prompt MUST include read order, authority, new-versus-existing migration policy, profile selection, dependency installation, Graphify, the `DKBWS-PROV-001` Git/Jujutsu boundary, service, verification, conformance, handoff, and exactly three bounded next steps. It MUST distinguish a Standard Production maintainer workspace from an explicit Git-only distribution/CI checkout. It MUST also distinguish the standard repository from the independent target, require an immutable revision, use `starter/starter.yaml` as the copy boundary, create subject content fresh, and record the target's own Wiki URL and deployment choice.

An initialization planner MUST cite the canonical prompt, selected profile, and starter contract by content hash. Planning does not authorize scaffolding: it MUST report existing-path collisions as preserve-and-review, MUST NOT create files, and MUST carry unresolved material inputs into the same sequential question protocol. Its layout MUST classify allowlisted subject-empty templates, target-authored subject content, and release-adapted implementation files; recursive root copying and reuse of the standard corpus are forbidden.
