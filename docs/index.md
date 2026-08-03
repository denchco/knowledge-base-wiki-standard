---
type: Standard
title: DenchCo Knowledge Base Wiki Standard
description: Canonical entry point for the human-readable standard.
status: draft
generated: { by: "human:denchco-maintainer", at: "2026-08-03T00:00:00Z" }
---

# DenchCo Knowledge Base Wiki Standard

> How should a durable knowledge base serve humans and AI agents while remaining portable, evidence-grounded, inspectable, and safely updateable?

Use an OKF-compatible canonical Markdown knowledge layer; add explicit evidence governance; publish coordinated Human and LLM Wikis; render the Human Wiki with Zensical and the DenchCo visual profile; expose relationships through Graphify; and prove every claimed capability through executable conformance checks.

## The system

```mermaid
flowchart LR
  A[Raw sources] --> B[Canonical OKF knowledge]
  B --> C[Evidence governance]
  C --> D[Human Zensical Wiki]
  C --> E[Operational LLM Wiki]
  C --> F[Graphify 2D and 3D]
  D --> G[Verification]
  E --> G
  F --> G
```

## Start here

- [Architecture](architecture.md) explains the complete system.
- [Normative specification](spec/index.md) defines conformance.
- [Requirements](spec/requirements.md) provides stable rule identifiers.
- [Profiles](spec/profiles.md) separates core portability from optional capabilities.
- [Agent entry point](llm-wiki/index.md) gives Codex and other agents the minimum reliable context.
- [Tools and sources](reference/tools-and-sources.md) records upstream authority.

This repository is at candidate status. Do not claim public release conformance until the GitHub release and migration workflow are completed.
