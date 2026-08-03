---
type: Requirements Catalogue
title: Requirements
description: Stable candidate requirement identifiers.
status: draft
---

# Requirements

| ID | Requirement | Applicability | Verification |
|---|---|---|---|
| DKBWS-CORE-001 | Canonical knowledge MUST be UTF-8 Markdown with portable links. | All | Filesystem/schema check |
| DKBWS-CORE-002 | The repository MUST declare its standard version, profile, role paths, capabilities, and deviations. | All | Manifest check |
| DKBWS-OKF-001 | Concept pages MUST be consumable as OKF v0.2 or declare a mapped extension. | OKF core | Frontmatter validation |
| DKBWS-OKF-002 | Unknown OKF fields MUST be preserved by standard tooling. | Tooling | Round-trip fixture |
| DKBWS-OKF-003 | A DenchCo manifest MUST map one repository-relative canonical `okf_bundle` directory. | DenchCo claims | Manifest and filesystem check |
| DKBWS-EVID-001 | Sources MUST have stable identities and provenance. | Evidence profile | Source-register check |
| DKBWS-EVID-002 | Material claims MUST route to evidence state, limitations, or a validation gap. | Evidence profile | Evidence check/manual review |
| DKBWS-HUMAN-001 | A Human Wiki MUST provide a stable navigable URL and strict build. | Human profile | Build/HTTP check |
| DKBWS-LLM-001 | An LLM Wiki MUST define read order, ingest, query, lint, authority, and generated boundaries. | Agent profile | Required-role check |
| DKBWS-LINK-001 | Canonical pages MUST have contextual inbound links beyond navigation. | Maintained wiki | Concept-link check |
| DKBWS-GRAPH-001 | Graph-Linked projects MUST publish shared data under a declared, versioned graph-publication schema and provide real 2D/3D views. | Graph profile | Graph/schema/browser check |
| DKBWS-DESIGN-001 | Design-Governed projects MUST maintain a lintable `DESIGN.md` and named tokens. | Design profile | Design/shape check |
| DKBWS-RENDER-001 | The standard production profile MUST use an exact Zensical pin within its adapter's tested compatibility range and repository-local browser runtimes. | Standard production | Dependency/network check |
| DKBWS-PROV-001 | A Standard Production maintenance workspace MUST use Git-interoperable history and MUST record local validated phases in a colocated Jujutsu workspace at the same repository root. A Portable Core repository or distribution MAY remain Git-only. | Standard Production maintenance workspaces | Read-only Git/Jujutsu root, version, colocation, and current-change check |
| DKBWS-VERIFY-001 | Claimed capabilities MUST pass one verification command that leaves canonical inputs unchanged; it MAY rebuild declared derived outputs in deterministic paths. | Managed profiles | `npm run verify` plus canonical-input diff |
| DKBWS-VERIFY-002 | Automated conformance MUST emit schema-valid reports with stable diagnostic codes and explicit `not-checked` results. | Tooling | CLI fixture suite |
| DKBWS-RUNTIME-001 | Runtime health MUST mean the canonical URL returns HTTP 200. | Runtime adapters | HTTP check |
| DKBWS-PROMPT-001 | Clarification MUST be sequential, individually numbered, and evidence-dependent. Agent handoffs MUST be completion-first, offer no more than three goal-linked and executable recommendations, apply a parked-work cycle guard, and never invent adjacent work to fill a list. | Standard prompts and agent profiles | Instruction parity and prompt fixture |
| DKBWS-UPDATE-001 | Upgrades MUST preserve local deviations and produce reviewable, preconditioned patches or PRs; candidate planning MUST NOT overwrite files or propose downgrades. | Managed profiles | Lifecycle diff/plan fixture |
| DKBWS-RELEASE-001 | Public releases of the standard, and public implementation releases advertising conformance, MUST use immutable Git tags/releases with migration notes. | Public distributions claiming conformance | Release check |
| DKBWS-SEC-001 | Security and source-handling boundaries MUST be declared and separately report secrets/authorization, personal/confidential data, copyright/licensing/retention, and untrusted/generated content. | All | Policy and subcontrol check |

Candidate identifiers remain stable through `0.x`; incompatible renaming requires a migration map.
