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
| DKBWS-EVID-001 | Sources MUST have stable identities and provenance. | Evidence profile | Source-register check |
| DKBWS-EVID-002 | Material claims MUST route to evidence state, limitations, or a validation gap. | Evidence profile | Evidence check/manual review |
| DKBWS-HUMAN-001 | A Human Wiki MUST provide a stable navigable URL and strict build. | Human profile | Build/HTTP check |
| DKBWS-LLM-001 | An LLM Wiki MUST define read order, ingest, query, lint, authority, and generated boundaries. | Agent profile | Required-role check |
| DKBWS-LINK-001 | Canonical pages MUST have contextual inbound links beyond navigation. | Maintained wiki | Concept-link check |
| DKBWS-GRAPH-001 | Graph-Linked projects MUST publish shared graph data and real 2D/3D views. | Graph profile | Graph/browser check |
| DKBWS-DESIGN-001 | Design-Governed projects MUST maintain a lintable `DESIGN.md` and named tokens. | Design profile | Design/shape check |
| DKBWS-RENDER-001 | The standard production profile MUST use pinned Zensical and local browser runtimes. | Standard production | Dependency/network check |
| DKBWS-VERIFY-001 | Claimed capabilities MUST pass one read-only verification command. | Managed profiles | `npm run verify` |
| DKBWS-RUNTIME-001 | Runtime health MUST mean the canonical URL returns HTTP 200. | Runtime adapters | HTTP check |
| DKBWS-PROMPT-001 | Clarification MUST be sequential, individually numbered, and evidence-dependent. | Standard prompts | Prompt fixture |
| DKBWS-UPDATE-001 | Upgrades MUST preserve local deviations and produce reviewable patches or PRs. | Managed profiles | Migration fixture |
| DKBWS-RELEASE-001 | Public versions MUST use immutable Git tags/releases with migration notes. | Public distribution | Release check |
| DKBWS-SEC-001 | Secrets, personal data, copyright, and source-retention boundaries MUST be declared. | All | Policy check |

Candidate identifiers remain stable through `0.x`; incompatible renaming requires a migration map.
