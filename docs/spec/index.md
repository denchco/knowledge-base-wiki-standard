---
type: Specification
title: Normative specification
description: Normative scope and interpretation of the DenchCo standard.
status: draft
okf_version: "0.2"
---

# Normative specification

## Scope

The DenchCo Knowledge Base Wiki Standard defines a canonical and repeatable repository pattern for evidence-governed knowledge bases maintained by humans and AI agents.

This Wiki is the separate human help, explanation, and documentation publication available at <https://denchco.github.io/knowledge-base-wiki-documentation/>. The public [DenchCo Knowledge Base Wiki Standard repository](https://github.com/denchco/knowledge-base-wiki-standard) is the sole normative authority; its URL is the complete starting prompt given to an AI agent to create an independent Knowledge Base Wiki, and the repository links back to this Wiki for human guidance. This Wiki explains how to understand and use the Standard but cannot define or change conformance requirements.

It incorporates five distinct foundations and governed choices. Each item links to this Wiki's explanation and to the upstream or canonical online source:

- **Persistent, compounding Wiki.** DenchCo's [LLM Wiki operating model](../llm-wiki/index.md#operating-model) carries forward the pattern in [Karpathy's original LLM Wiki idea file](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f): immutable sources feed an agent-maintained, interlinked Markdown Wiki that compounds through ingest, query, and lint. Karpathy's note informs the model but is not normative for DenchCo.
- **Portable knowledge.** The Wiki's [OKF v0.2 boundary](conformance.md#okf-v02-boundary) explains how the Standard uses human- and agent-readable Markdown bundles, extensible YAML frontmatter, and lossless field preservation; the [upstream OKF v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) remains authoritative for OKF interoperability.
- **DenchCo governance.** The [governed architecture](../reference/tools-and-sources.md#denchco-governance) adds explicit evidence authority and uncertainty, linked discovery, agent-readable design, graph publication, executable verification, stable runtime, migration, and release controls. These are DenchCo-defined choices whose canonical online source is the public [Standard repository](https://github.com/denchco/knowledge-base-wiki-standard).
- **Coordinated Human and LLM products.** The [Human and LLM Wiki products](../architecture.md#human-and-llm-products) present the same canonical knowledge through comprehension-first human pages and context-efficient agent guidance, avoiding independent corpora that drift. The normative definition remains in the online [requirement catalogue](https://github.com/denchco/knowledge-base-wiki-standard/blob/main/docs/spec/requirements.md).
- **Human reference implementation.** [Standard Production](profiles.md#profiles) selects Zensical plus the DenchCo visual profile as its first-class Human Wiki implementation while retaining an adapter boundary. See the Wiki's [reference implementation explanation](../reference/tools-and-sources.md#human-reference-implementation), the upstream [Zensical documentation](https://zensical.org/docs/), and the canonical [DenchCo design contract](https://github.com/denchco/knowledge-base-wiki-standard/blob/main/DESIGN.md).

## Normative language

`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are normative. Only this directory, released schemas, and released profiles define conformance.

## Core principles

- Canonical knowledge MUST remain readable without a renderer or MCP server.
- Unknown OKF extension fields MUST survive round trips.
- Evidence authority MUST be explicit.
- Generated outputs MUST be reproducible and visibly non-authoritative.
- Human and LLM experiences MUST share canonical knowledge rather than drift as separate corpora.
- Every claimed capability MUST identify its dependency, applicability, verification, and deviation state.
- Existing projects MUST retain stronger working patterns unless an explicit migration is authorized.
- Updates MUST be reviewable migrations, never “download latest and overwrite.”
- Consumers MUST live in an independent repository, pin an immutable standard revision, author their own subject content, and own their Wiki URL and deployment choice.
- The standard's help, knowledge, evidence, dogfood, fixture, and documentation-deployment content MUST NOT be installed as a consumer's subject corpus.
- OKF portability results MUST remain distinct from stricter DenchCo profile results.
- Conformance inspection and validation MUST be read-only and emit stable machine diagnostics.
- A displayed registered source identity in a Human Wiki MUST navigate to its exact internal source-register row.
- Standard Production maintenance MUST close every file-changing development turn with a disclosed Jujutsu commit after verification and state inspection.

See [Requirements](requirements.md), [Profiles](profiles.md), and [Conformance](conformance.md).
