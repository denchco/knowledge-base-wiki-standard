---
name: denchco-kb-wiki-standard
description: Audit, instantiate, validate, or upgrade an OKF-compatible DenchCo Knowledge Base Wiki.
---

# DenchCo Knowledge Base Wiki Standard

Read the repository `AGENTS.md`, `.wiki-standard.yaml`, `docs/spec/index.md`, selected profile, `DEPENDENCIES.md`, and `docs/llm-wiki/index.md` before acting.

For instantiation, read `prompts/instantiate-wiki.md`. For audits, map required roles to actual project paths rather than relying on filenames. For upgrades, compare the pinned release and requirement IDs, preserve deviations, and produce a reviewable patch; never overwrite local changes from the latest template.

Use Graphify first when the target has a graph. Run the target's declared verification and report manual/unrun checks separately.
