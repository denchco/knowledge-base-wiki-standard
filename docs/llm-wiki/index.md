---
type: Agent Guide
title: LLM Wiki entry point
description: Minimum reliable context for agents maintaining or applying the standard.
status: draft
---

# LLM Wiki entry point

## Read first

1. Repository `AGENTS.md`.
2. `.wiki-standard.yaml`.
3. [Normative specification](../spec/index.md).
4. [Context map](context-map.md).
5. [Project status](../project/status.md).
6. `DESIGN.md` for rendered changes.
7. Graphify query results when available.

Use the [Graphify workflow](graphify.md) for query-first discovery, the six required enrichment layers, and repeatable 2D/3D publication.

## Operating model

- **Ingest**: register the source, preserve raw identity, add its stable exact-row anchor, update relevant concepts and evidence, add links, and record the change.
- **Query**: start from the context map and graph, read the smallest authoritative set, expose uncertainty, and cite registered evidence through individual internal source-row links.
- **Lint**: find contradictions, stale claims, unsupported authority language, ungoverned exact repetitions of the declared canonical question, bare or misdirected source identities, unregistered named-authority URLs, orphans, duplicate concepts, missing contextual links, broken generated surfaces, and profile drift.
- **Promote**: after a user-authored local innovation is complete and verified, preserve its immutable origin, search upstream issues read-only, scrub an ignored proposal draft, and require exact-payload authority before remote submission. A pattern becomes Standard only with applicability, fallback, verification, fixture, migration impact, and maintainer classification.

Never treat an LLM answer, rendered page, graph edge, or generated export as new evidence.

In a Standard Production maintenance workspace, a file-changing development turn remains incomplete until its persistent changes are recorded in the required end-of-turn JJ commit under `DKBWS-PROV-001`.

Codex reads the shared root `AGENTS.md`; Claude Code reaches the same contract through the root `CLAUDE.md` import. Use project status for zero to three current priorities and the validation queue for parked work. A completed response does not acquire a Next Steps section merely as boilerplate: apply the completion and cycle guard in `AGENTS.md` first.
