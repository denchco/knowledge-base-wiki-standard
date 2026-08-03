---
type: Architecture
title: Standard architecture
description: Human, LLM, evidence, graph, conformance, and operational layers.
status: draft
---

# Standard architecture

## Canonical layers

1. **Raw sources** — immutable or content-addressed source material.
2. **Staging** — optional deterministic extraction, OCR, transcription, or normalization.
3. **Canonical knowledge** — OKF-compatible Markdown concepts and structured records.
4. **Evidence governance** — source register, evidence matrix, validation queue, and research log.
5. **Human Wiki** — first-class Zensical site using the DenchCo visual profile.
6. **LLM Wiki** — compact routing, context, maintenance, ingest, query, and lint instructions.
7. **Discovery outputs** — `llms.txt`, indexes, search, Graphify 2D/3D, and optional OKF bundles.
8. **Conformance** — schemas, deterministic checks, browser evidence, fixtures, and reports.
9. **Operations** — Git, Jujutsu phases, stable local runtime, CI, release, deployment, and migration.

## Authority

```text
primary source
  → source register
    → evidence record
      → canonical synthesis
        → operational LLM context
          → generated discovery/rendering outputs
```

Derived output assists navigation but cannot create evidence.

## Human and LLM products

The Human Wiki and LLM Wiki share canonical knowledge. The Human Wiki optimizes comprehension, navigation, decisions, diagrams, and evidence inspection. The LLM Wiki optimizes context selection, maintenance discipline, machine-readable routing, and bounded workflows. Neither is maintained as an independent duplicate corpus.
