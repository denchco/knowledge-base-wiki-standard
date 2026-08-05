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

It incorporates:

- Karpathy's persistent LLM Wiki operating model;
- OKF v0.2 as the portable knowledge representation;
- DenchCo evidence, uncertainty, discoverability, design, graph, verification, runtime, and release governance;
- coordinated Human and LLM Wiki products;
- Zensical plus the DenchCo visual profile as the first-class human reference implementation.

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
- Standard Production maintenance MUST close every file-changing development turn with a disclosed Jujutsu commit after verification and state inspection.

See [Requirements](requirements.md), [Profiles](profiles.md), and [Conformance](conformance.md).
