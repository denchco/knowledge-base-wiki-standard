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
| DKBWS-HUMAN-002 | Every callout designated as a Human Wiki's governing question MUST be machine-identifiable as `governing-question` and MUST render both its inline-start rail and all question text using the implementation's active accent colour. Ordinary quotations MUST remain neutral. | Human profile when a governing-question callout is present | Built-output browser comparison with the resolved active accent token |
| DKBWS-HUMAN-003 | When a Human Wiki exposes `draft` status in primary navigation, it MUST use a dedicated draft-edit marker rather than a generic information marker, MUST provide human-readable draft-status text, MUST align the marker with the navigation's trailing expand/collapse-control column, and MUST keep both the marker and stock control vertically centred in their own rows without page overflow. | Human profile when draft status is displayed in primary navigation | Built-output browser check of status text, marker asset, row/trailing-centre geometry, and overflow |
| DKBWS-LLM-001 | An LLM Wiki MUST define read order, ingest, query, lint, authority, and generated boundaries. | Agent profile | Required-role check |
| DKBWS-LINK-001 | Canonical pages MUST have contextual inbound links beyond navigation. | Maintained wiki | Concept-link check |
| DKBWS-GRAPH-001 | Graph-Linked projects MUST publish shared data under a declared, versioned graph-publication schema and provide real 2D/3D views. Complete verification MUST fail when either required view is absent and MUST exercise both views at desktop and mobile widths. | Graph profile | Graph/schema/browser check derived from the selected profile |
| DKBWS-DESIGN-001 | Design-Governed projects MUST maintain a lintable `DESIGN.md` and named tokens. Under the DenchCo reference adapter, ordinary entry and architecture Mermaid diagrams MUST begin with renderer-default node treatment; any diagram-level styling override MUST express a material distinction, remain accessible without colour, and record its reason. | Design profile | Design/shape check plus built-output browser verification |
| DKBWS-RENDER-001 | The standard production profile MUST use an exact Zensical pin within its adapter's tested compatibility range and repository-local browser runtimes. | Standard production | Dependency/network check |
| DKBWS-PROV-001 | A Standard Production maintenance workspace MUST use Git-interoperable history and a colocated Jujutsu workspace at the same repository root. Before every development turn that changed persistent repository files ends, the turn's changes MUST be recorded in a Jujutsu commit. Applicable verification and the read-only maintainer provenance check MUST run first; failed or unrun required checks MUST be disclosed in the commit description and final response rather than leaving the changes only in the working copy. The commit boundary MUST NOT depend on a subjective “substantive work” judgement, and a no-change turn MUST NOT create an empty commit. Root discovery MUST preserve filesystem-significant path bytes, including trailing spaces. A Portable Core repository or distribution MAY remain Git-only. | Standard Production maintenance workspaces during file-changing development turns | Instruction/helper fixture, read-only Git/Jujutsu root, version, colocation, path-preservation and current-change check, plus reviewable turn-commit history |
| DKBWS-VERIFY-001 | Claimed capabilities MUST pass one verification command that leaves canonical inputs unchanged; it MAY rebuild declared derived outputs in deterministic paths. | Managed profiles | `npm run verify` plus canonical-input diff |
| DKBWS-VERIFY-002 | Automated conformance MUST emit schema-valid reports with stable diagnostic codes and explicit `not-checked` results. Reserved verification receipt and conformance-report paths MUST contain their declared schema artifacts rather than project-only summaries. | Tooling | CLI and receipt fixture suite |
| DKBWS-RUNTIME-001 | Runtime health MUST mean the canonical URL returns HTTP 200. | Runtime adapters | HTTP check |
| DKBWS-PROMPT-001 | Clarification MUST be sequential, individually numbered, and evidence-dependent. The normative repository URL MUST be a complete bootstrap invocation: when the starting mode is not already supplied, the agent MUST begin with research-seed-versus-subject-empty discovery; it MUST inspect supplied evidence before follow-up, infer routine local defaults, state and confirm the exact accent hex, and MUST NOT require a field-based prompt or user-supplied revision. The implementation MUST resolve the repository's current default-branch HEAD to an exact commit SHA and pin that SHA before acting. Agent handoffs MUST be completion-first, offer no more than three goal-linked and executable recommendations, apply a parked-work cycle guard, and never invent adjacent work to fill a list. | Standard prompts, initialization planning, and agent profiles | Instruction parity, URL-only bootstrap/automatic-revision initializer tests, and prompt fixture |
| DKBWS-UPDATE-001 | Upgrades MUST preserve local deviations and produce reviewable, preconditioned patches or PRs; candidate planning MUST NOT overwrite files or propose downgrades. Standard identity and ordering MUST compare name, canonical source, version label, and immutable revision; equal version labels MUST NOT suppress revision or inherited-requirement changes. | Managed profiles | Revision-aware lifecycle diff/plan fixtures |
| DKBWS-RELEASE-001 | Public releases of the standard, and public implementation releases advertising conformance, MUST use immutable Git tags/releases with migration notes. | Public distributions claiming conformance | Release check |
| DKBWS-SEC-001 | Security and source-handling boundaries MUST be declared and separately report secrets/authorization, personal/confidential data, copyright/licensing/retention, and untrusted/generated content. | All | Policy and subcontrol check |

Candidate identifiers remain stable through `0.x`; incompatible renaming requires a migration map.

## Governing-question rendering

`DKBWS-HUMAN-002` is conditional on presenting a governing-question callout; it does not require every Human Wiki to invent one. A conforming renderer MAY choose its native semantic element, but the built output MUST expose a stable `governing-question` marker so agents and verification tools can distinguish the callout from quoted evidence.

The Zensical reference adapter uses `<blockquote class="governing-question">`. Its rail and question text resolve from the same active accent token at every supported viewport, while unmarked blockquotes retain the renderer's neutral quotation treatment. Source markup or CSS inspection alone cannot prove this rendered requirement.

Migration from a release without this rule requires three reviewable changes where a governing-question callout already exists: add the semantic marker, bind both rendered colours to the active accent family, and add browser evidence that compares computed colours with the resolved token. A project with no governing-question callout records the requirement as not applicable rather than creating decorative content.

## Draft navigation rendering

`DKBWS-HUMAN-003` is conditional on rendering draft state inside primary navigation; it does not require lifecycle markers in a Wiki that omits them. The visible marker supplements, rather than replaces, readable status text exposed through a tooltip or equivalent accessible description. Other lifecycle states must not inherit draft artwork.

The Zensical reference adapter maps `.md-status--draft` to the registered CC0 Pen Circle asset, exposes “Draft — research in progress”, and sizes the marker so its trailing centre matches the stock nested-navigation chevron. Its browser evidence also compares each control's vertical centre with its own navigation row and rejects page overflow. Another renderer MAY use an equivalent open-licensed draft-edit glyph and native status affordance when its own built-output check proves the same semantic distinction and alignment outcome.

Migration from a generic information marker requires the dedicated draft asset, readable status mapping, renderer-local alignment rule, third-party licence record, and positive browser evidence. A simpler renderer without navigation status markers records the conditional requirement as not applicable; it need not add decoration solely for conformance.

## Lifecycle identity and migration

`DKBWS-UPDATE-001` treats a version label as descriptive metadata, not an immutable identity. A lifecycle comparison first requires the same Standard name and canonical source, resolves both revisions to commits, compares ancestry, loads the manifest, selected profile, and requirement catalogue from those exact commits, and reports introduced or removed inherited requirement IDs. A missing, unresolved, newer, or diverged consumer revision is a manual blocking action. Candidate hashes must describe the same immutable revision named in the report; a dirty working-tree file must never be labelled as `HEAD` evidence.

Migration from a manifest without `standard.revision` first records a resolvable immutable commit and reconciles its version label with the Standard manifest at that commit. A same-version older revision still requires review and repinning when the candidate adds requirements. Source changes are identity changes, not automatic version upgrades.

## Verification artifact names

For the reference verification adapter, `output/verification/receipt.json` is reserved for `schema/verification-receipt-v1.json` and `output/verification/conformance-report.json` is reserved for its paired `schema/conformance-report-v1.json` output. A consumer-specific build or browser summary uses a distinct filename. Migration renames an ad hoc summary, emits explicit gate IDs, exit codes, evidence and requirement results, then validates both reserved artifacts before claiming complete conformance.

## Consumer dependency boundary

Standard-maintainer documentation synchronization is not part of an ordinary consumer's `DKBWS-VERIFY-001` closure. An implementation agent must exclude `sync:documentation:*`, `verify:workspace`, and the sibling-documentation contract unless that consumer separately declares, implements, and verifies its own synchronization capability. Consumer licensing is likewise an explicit owner decision; the starter records the decision and third-party boundary without inheriting the Standard repository's MIT licence automatically.
