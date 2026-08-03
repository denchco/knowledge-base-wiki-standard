---
type: Prompt Specification
title: Prompt and question contract
description: Canonical prompt distribution and clarification behaviour.
status: draft
---

# Prompt and question contract

The canonical instantiation prompt is `prompts/instantiate-wiki.md`. It MUST be self-contained through repository-relative references and MUST NOT depend on `/Users/andrew/Projects` paths after public release.

Where uncertainty is material, agents ask one question at a time using `Question 1 of N`. Each answer informs the next question and `N` is revised as uncertainty changes. Routine, reversible choices are resolved from the target, manifest, selected profile, and standard defaults.

The prompt MUST include read order, authority, new-versus-existing migration policy, profile selection, dependency installation, Graphify, Jujutsu, service, verification, conformance, handoff, and exactly three bounded next steps.
