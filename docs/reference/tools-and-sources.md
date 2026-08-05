---
type: Reference Catalogue
title: Tools and sources
description: Tooling bill of materials and upstream authorities.
status: draft
---

# Tools and sources

Upstream sources are authoritative only for the formats, ideas, or tools they define. The public [DenchCo Knowledge Base Wiki Standard repository](https://github.com/denchco/knowledge-base-wiki-standard) is the sole normative source for DenchCo requirements; this Wiki provides the linked explanation.

| Area | Primary tool/reference |
|---|---|
| Persistent wiki model | [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and the [DenchCo operating model](#persistent-compounding-wiki) |
| Portable format | [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) and the [DenchCo portability boundary](#portable-okf-v02) |
| Human renderer | [Zensical](https://zensical.org/docs/) and the [DenchCo reference implementation](#human-reference-implementation) |
| Visual contract | [Google DESIGN.md](https://github.com/google-labs-code/design.md) plus the canonical [DenchCo design contract](https://github.com/denchco/knowledge-base-wiki-standard/blob/main/DESIGN.md) |
| Codex discovery | `AGENTS.md`, `.agents/skills/`, and `llms.txt` |
| Claude Code discovery | `CLAUDE.md` importing `AGENTS.md`, plus `.claude/skills/` |
| Follow-up state | `docs/project/status.md` for zero to three active priorities; validation queue fields for parked work and reopen triggers |
| Knowledge graph | [Graphify](https://github.com/Graphify-Labs/graphify), vis-network, and 3d-force-graph |
| Diagrams | Mermaid, served locally |
| Browser proof | [Playwright](https://playwright.dev/docs/intro) with pinned Chromium |
| Versioning | Git and GitHub Releases |
| Development-turn commits | [Jujutsu](https://github.com/jj-vcs/jj): `0.39.0` reference-qualified; `0.42.0` available but awaiting deliberate requalification |
| Local service | Repo wrapper plus OS adapter and HTTP-200 health |
| Planned deployment adapter | Cloudflare Pages is the researched reference; it is not selected or installed in this local candidate |
| Repository integration | GitHub MCP Server |
| Future domain integration | DenchCo Wiki Standard MCP is currently no-go; reconsider only if a future consumer proves a named gap left by Git, GitHub, and the stable CLI |

## Persistent, compounding Wiki

[Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) supplies the upstream idea: immutable raw sources feed an agent-maintained, interlinked Markdown Wiki, guided by a schema or instruction file and improved through ingest, query, and lint. It deliberately leaves implementation details open. DenchCo adopts the persistent, compounding model and adds governed evidence, coordinated human and agent products, reproducible checks, and explicit authority boundaries. The operational version is documented in the Wiki's [LLM Wiki entry point](../llm-wiki/index.md#operating-model).

## Portable OKF v0.2

The upstream [Open Knowledge Format v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) defines a portable directory of Markdown documents with YAML frontmatter that remains readable by people and agents without a required runtime. DenchCo maps one explicit `knowledge/` bundle to that foundation, preserves unknown extension fields, and reports its stricter evidence and profile rules separately. See the Wiki's [OKF conformance boundary](../spec/conformance.md#okf-v02-boundary).

## DenchCo governance

DenchCo adds the controls that turn the two foundations into a reviewable production system:

- [Sources](../sources.md), the [evidence matrix](../evidence-matrix.md), the [validation queue](../validation-queue.md), and the [research log](../log.md) make authority, uncertainty, and gaps inspectable.
- The [standard architecture](../architecture.md#canonical-layers) and [repository graph](../graph/index.md) connect canonical knowledge to Human, Agent, and Graph discovery surfaces without granting generated views evidence authority.
- The [requirements catalogue](../spec/requirements.md), [profiles](../spec/profiles.md), and canonical [DenchCo design contract](https://github.com/denchco/knowledge-base-wiki-standard/blob/main/DESIGN.md) define the governed implementation choices.
- [Conformance](../spec/conformance.md), [dependencies](../spec/dependencies.md), and the [roadmap](../roadmap.md) explain verification, runtime, migration, and release state.

These choices are defined by the [DenchCo Standard repository](https://github.com/denchco/knowledge-base-wiki-standard), not by any upstream tool.

## Coordinated Human and LLM products

The [Human and LLM Wiki products](../architecture.md#human-and-llm-products) are different presentations of one canonical corpus. The Human Wiki optimizes comprehension, navigation, diagrams, and evidence inspection; the [LLM Wiki](../llm-wiki/index.md) optimizes context selection, maintenance, ingest, query, and lint. Neither becomes a duplicate knowledge store or an independent authority. This coordination is a DenchCo-defined product rule rather than a requirement imposed by Karpathy or OKF.

## Human reference implementation

The [Standard Production profile](../spec/profiles.md#profiles) selects pinned [Zensical](https://zensical.org/docs/) to render the Human Wiki with the DenchCo visual profile, repository-local diagram and graph assets, and built-output browser checks. [Google DESIGN.md](https://github.com/google-labs-code/design.md) supplies an agent-readable design-contract format; the actual colours, shapes, layout, accessibility rules, and adapter decisions are governed by the canonical [DenchCo `DESIGN.md`](https://github.com/denchco/knowledge-base-wiki-standard/blob/main/DESIGN.md). Exact pins and the offline/runtime boundary are recorded in [Dependencies](../spec/dependencies.md).

See the root dependency contract and source register for versions and authority.
