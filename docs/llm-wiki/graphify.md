---
type: Agent Guide
title: Graphify workflow
description: Query, generation, enrichment, publication, and authority rules for Graphify.
status: draft
---

# Graphify workflow

When `graphify-out/graph.json` exists, query Graphify before broad source browsing for repository structure, relationships, or project content.

## Query first

```sh
graphify query "<question>"
graphify path "<concept A>" "<concept B>"
graphify explain "<concept>"
```

Use the scoped result to select canonical files. A graph edge is a discovery aid, never evidence.

If a query is empty, shallow, stale, or does not expose enough context, continue in this order: the generated Graphify wiki index when present, the scoped `GRAPH_REPORT.md`, then the smallest relevant set of canonical source files. Record the fallback in an audit report. Query-first does not mean graph-only, and graph recall is never assumed complete.

## Repeatable publication

`npm run graph:update` performs deterministic source/runtime preparation, updates Graphify, enriches its output, and publishes:

- `GRAPH_REPORT.md`
- `docs/assets/graphify/graph.html`
- `docs/assets/graphify/graph-3d.html`
- `docs/assets/graphify/graph.json`
- `docs/assets/graphify/summary.json`

These outputs are derived and ignored by Git. Regenerate them; do not edit them as canonical content.

The published `graph.json` and `summary.json` both declare `publicationSchemaVersion: "1.0"`. Their normative machine contracts are `schema/graph-publication-v1.json` and `schema/graph-publication-summary-v1.json`. A schema-version change requires an explicit migration rather than a silent consumer break.

`graph.json` and `summary.json` declare their DenchCo publication schema version. A consumer MUST select a compatible adapter or migrate explicitly; key-shape guessing is not conformance.

## Required enrichment layers

The shared graph preserves:

1. Markdown document nodes.
2. Markdown `links to` edges.
3. Source-register `defines source` and citation `cites source` edges.
4. Zensical `nav contains` edges.
5. Repository `filesystem contains` edges.
6. Explicit `references file` edges.

Run `npm run check:graphify` after publication. The [2D](../graph/two-dimensional.md) and [3D](../graph/three-dimensional.md) pages consume the same enriched `graph.json`.
