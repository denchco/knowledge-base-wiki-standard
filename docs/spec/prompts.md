---
type: Prompt Specification
title: Prompt and question contract
description: Canonical prompt distribution and clarification behaviour.
status: draft
---

# Prompt and question contract

The canonical instantiation prompt is `prompts/instantiate-wiki.md`. It MUST be self-contained through repository-relative references and MUST NOT depend on machine-specific absolute paths after public release.

Where uncertainty is material, agents ask one question at a time using `Question 1 of N`. Each answer informs the next question and `N` is revised as uncertainty changes. Routine, reversible choices are resolved from the target, manifest, selected profile, and standard defaults.

The prompt MUST include read order, authority, new-versus-existing migration policy, profile selection, dependency installation, Graphify, the `DKBWS-PROV-001` Git/Jujutsu boundary, service, verification, conformance, handoff, and exactly three bounded next steps. It MUST distinguish a Standard Production maintainer workspace from an explicit Git-only distribution/CI checkout.

An initialization planner MUST cite the canonical prompt and selected profile by content hash. Planning does not authorize scaffolding: it MUST report existing-path collisions as preserve-and-review, MUST NOT copy a template or create files, and MUST carry unresolved material inputs into the same sequential question protocol.
