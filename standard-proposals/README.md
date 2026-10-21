---
type: Standard Proposal Registry
title: Standard proposals
description: Tracked proposal records and the Standard-owned acceptance and release ledger.
status: draft
---

# Standard proposals

Consumer projects keep one strict JSON record per proposal at `standard-proposals/<slug>.json`. The tracked record is authoritative for local implementation evidence, the prepared public payload, explicit approval, issue linkage, upstream observations, release detection, and any later separately authorised adoption. Generated payloads are disposable and remain ignored under `output/standard-proposals/`.

The Standard-owned [registry](registry.json) is authoritative for classification, an explicit maintainer decision, accepted requirement IDs, and immutable release inclusion. GitHub issue state is only an observation: closing an issue never means acceptance. A consumer manifest pin changes only through a later, separately authorised and verified JJ phase.

## Stable identity

`new` resolves the full Git-compatible implementation commit and derives the identifier as:

```text
DKBWS-PROP-<slug>-<first 32 lowercase hex characters of SHA-256>
```

The hash input is the UTF-8 byte sequence `dkbws-standard-proposal-id-v1`, NUL, canonical target `owner/repository`, NUL, full implementation commit, NUL, and slug. The marker is derived only from that identifier:

```text
<!-- dkbws-standard-proposal:v1:<identifier> -->
```

The identifier and marker never change when proposal wording changes. The marker appears exactly once as the final non-whitespace token in the rendered body. Duplicate identifiers, markers, or issue links fail validation.

## Exact approval

The renderer normalises text to LF, rejects NUL and other controls, sorts unique labels by Unicode code point, and constructs this fixed-key object in this exact order:

```json
{"repository":"https://github.com/denchco/knowledge-base-wiki-standard","title":"…","labels":["enhancement","standard-change"],"body":"…"}
```

The approval digest is lowercase SHA-256 over the compact UTF-8 JSON bytes with no trailing newline. Approval also binds the SHA-256 of the byte-identical versioned [issue form](standard-change-form-v1.yml). Any payload or form change makes the prior approval stale. The digest is not placed inside its own hash input.

`open` may use only remote reads. It compares the public default-branch form with the bound form, checks the required labels, and searches open and closed issues by marker before providing the governed form. If publication, label availability, or reconciliation is uncertain it fails closed; there is no direct issue-creation fallback. The user performs GitHub's final submission.

## Independent lifecycle facts

- Local observation, committed implementation, and verification precede preparation.
- Preparation, approval, submission outcome, and verified issue linkage are distinct.
- Classification and the explicit Standard decision come from the Standard registry, not issue closure.
- An accepted proposal remains release-pending until a separately authorised immutable tag resolves to the recorded commit.
- The release ledger is recorded in a later JJ commit because a tracked file cannot contain the commit identifier of the commit that contains itself.
- Consumer adoption requires separate authority, the old and new Standard pins, a committed consumer revision, and post-adoption verification. Synchronisation never changes the pin.

The reader-source navigation precedent is recorded as accepted `DKBWS-LINK-002` and included in immutable `v0.1.0-rc.4`, using the sole `pre-registry-local-history` bridge. It has no fabricated or duplicate issue. This historical exact-row navigation acceptance does not accept the separate numeric-citation contribution.

## Decision: three consumer contributions, 20 October 2026

The Standard accepts the three contributions below with the stated classifications and requirement mappings. Each governed issue was read back and matched to its exact approved payload and single stable marker.

Andrew Dench authorised acceptance of these contributions on 19 October 2026. He approved their exact prepared payloads and explicitly delegated their final governed-form submissions. This delegation applies only to these three payloads. The standing manual-submission rule remains unchanged.

The reviewed local Standard implementation is `ced1ee1588ce3640b6c0a680b15f5dec4f2fdee7`. Its completed verification includes 209 Node tests, 14 Python tests, 23 appearance scenarios and browser checks for 103 citations across 11 routes. Independent removal of browser evidence made all five affected requirements incomplete. The local implementation and its verification archive were reviewed; this acceptance record does not publish that candidate implementation.

| Contribution | Verified governed issue | Classification | Accepted requirements |
|---|---|---|---|
| Stable numeric superscript citations | [#32](https://github.com/denchco/knowledge-base-wiki-standard/issues/32) | Preferred | `DKBWS-LINK-002` |
| Configurable appearance family | [#33](https://github.com/denchco/knowledge-base-wiki-standard/issues/33) | Reusable | `DKBWS-DESIGN-001`, `DKBWS-PROMPT-001`, `DKBWS-RENDER-001`, `DKBWS-VERIFY-001` |
| Content-first development handoff | [#34](https://github.com/denchco/knowledge-base-wiki-standard/issues/34) | Reusable | `DKBWS-PROMPT-001` |

Numeric citations preserve identity-derived numbers, leading zeroes, authored order, exact source-register targets, accessible identities and explanatory notes. The original proposal's `DKBWS-RENDER-001` mapping remains an affected compatibility constraint; this decision accepts the citation behaviour under `DKBWS-LINK-002`.

The appearance mechanism supplies validated configuration, deterministic colour derivation, renderer and graph integration, saved reader preferences, and source and browser checks. The originating pale-green colour remains project-specific. The Standard-owned Wide baseline is a separate correction.

The handoff mechanism requires a grounded assessment of the continuing Wiki subject and evidence after each development cycle. Instruction and fixture checks enforce cadence, structure and explicit selection rules. They do not certify the quality of uncaptured responses.

The registry records the exact originating commits, pins, approved payloads, issue identities and this decision revision. The source implementations remain in their originating repositories. No subject evidence or attachments are published here.

At this acceptance decision, all three contributions remained release-pending. That decision changed neither released requirements nor consumer pins. Publication of the candidate implementation, immutable-release inclusion, Documentation synchronization and consumer adoption were separate later transitions.

## Release inclusion, 21 October 2026

Immutable `v0.1.0-rc.6` at `8c134952dacfcd7a60c8da82d59aecb67117c512` includes these three contributions and the earlier accepted native appearance contribution (#7). The release was read back as public, non-draft and immutable after exact-revision post-merge Verify passed. This strictly later registry records inclusion while preserving every immutable origin, accepted requirement and decision-evidence field, together with the earlier rc.4 bridge.

Originating consumer records and pins remain unchanged. The three records still show accepted, release pending and adoption not considered until their separate governed release transitions are authorised. Documentation has separately adopted rc.6 at `4df1493c737b355b25c7846f40bb13b997f100c3` and passed protected deployment and public reader verification. Standard publication does not authorise other consumer adoption.
