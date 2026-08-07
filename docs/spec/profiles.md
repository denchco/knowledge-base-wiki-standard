---
type: Profile Catalogue
title: Profiles and capabilities
description: Separates portable conformance from optional implementation choices.
status: draft
---

# Profiles and capabilities

## Profiles

- **Portable Core** (`portable-core`) — UTF-8 Markdown with portable links, a DenchCo manifest, one mapped OKF v0.2 bundle, declared security/source boundaries, and narrow validation. Reserved OKF index/log files conform when present; this profile does not require rendered or managed research-log surfaces.
- **Evidence Governed** (`evidence-governed`) — source register, evidence matrix, validation queue, quality/status language, and research discipline.
- **Human and Agent** (`human-and-agent`) — coordinated Human Wiki and operational LLM Wiki; any displayed governing-question callout is semantically marked and uses the active accent for both its rail and text, every exact reader-facing repetition of a declared canonical question is governed across its bounded reader set, ordinary quotations and paraphrases remain neutral, and any displayed registered source identity navigates to its exact internal source-register row.
- **Standard Production** (`standard-production`) — Zensical, DenchCo style, local Mermaid, Graphify 2D/3D, browser verification, an identity-verified managed local service, Git interoperability, and a colocated Jujutsu commit at the end of every file-changing development turn.
- **Managed Full** (`managed-full`) — a planning profile that currently adds immutable release governance and declares future CI, deployment, portfolio, and complete-report capability targets.

Each named profile has an executable YAML declaration in `profiles/` and inherits the preceding obligations. The candidate repository selects Standard Production; Managed Full exists for planning and validation but is not claimed because deployment and public release are deliberately unselected.

Profile YAML is normative. A `required` capability value means the manifest must declare a non-false value; a specific profile value must match exactly. Capability declaration is not implementation evidence: a full-profile receipt must still name the requirement gates that prove behaviour. Managed Full's capability labels remain planning targets until stable requirement IDs and checks cover them, so the candidate MUST NOT advertise Managed Full conformance from those labels alone.

## Optional topic profiles

- Question-Led Decision Wiki.
- Generated Analytical Wiki.
- Revision and Learning Wiki.
- Source Extraction/OCR Wiki.
- Bounded Ask Wiki.

## Adapters

- Renderer: Zensical first; Material for MkDocs compatibility; future renderers permitted.
- Runtime: foreground portable for `DKBWS-RUNTIME-001`; macOS user LaunchAgent as the identity-verified `DKBWS-RUNTIME-002` reference, with equivalent future Linux systemd-user and Windows user-service adapters.
- Deployment: Cloudflare Pages reference; other hosts may conform.
- Agent access: filesystem/CLI first, repository skill, GitHub MCP, future DenchCo standard MCP.

Profiles are cumulative promises. Capabilities remain independently `PASS`, `FAIL`, `WAIVED`, `NOT APPLICABLE`, or `NOT IMPLEMENTED`.

Selected-profile closure is exhaustive: every inherited requirement ID must appear in the conformance result. “Explicit and absolute” applies to accounting for the normative outcome, not to copying a reference adapter or consumer implementation byte for byte. An applicable requirement passes or is reported as failed, waived, deviating, or not checked; a conditional requirement is `NOT APPLICABLE` only when the implementation records evidence that its predicate is absent. No requirement may disappear because its implementation mechanism differs.

`DKBWS-HUMAN-004` is inherited by the Human and Agent profile but activates only when the Wiki declares a canonical governing question. The manifest maps the authoritative question source and the implementation declares a bounded reader-source set. Exact repetitions in that set are governed callouts; paraphrases, unrelated quotations, and records outside that set remain ordinary content. This preserves an absolute consistency outcome without imposing one project's question text, route names, or checker architecture.

`DKBWS-LINK-002` is inherited by the Human and Agent profile because it combines the Evidence Governed source-register role with a reader-facing Human Wiki. It remains factually conditional: a subject-empty, agent-only, or citation-free implementation records it as not applicable instead of manufacturing evidence. The Standard Production adapter proves the applicable case through lint, stable row anchors, and a built-output journey inside the Wiki.

`DKBWS-PROV-001` makes Jujutsu part of the DenchCo Standard Production **maintenance-workspace** contract: history remains Git-interoperable, while a colocated Jujutsu workspace at the same repository root records the persistent changes from every file-changing development turn before its final response. The boundary is the turn ending, not whether an agent considers the work substantive. Verification runs first; any failed or unrun required check is named in the turn commit and response, and no-change turns do not create empty commits. This is not a distribution-format requirement. Portable Core repositories, release archives, and explicit distribution/CI checkouts may remain Git-only; they MUST NOT present that narrower check as proof of a Standard Production maintainer workspace.

`DKBWS-RUNTIME-002` makes the selected Standard Production `local_service` capability executable rather than descriptive. The platform adapter may vary, but serialized and atomically published shared-register ownership, live-listener refusal, versioned exact-identity marker, composite status, and registered-URL browser handoff do not. A project choosing only a foreground runtime must select a profile or deviation where the persistent managed requirement does not apply.
