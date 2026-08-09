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

The reader-source navigation precedent is backfilled as accepted `DKBWS-LINK-002`, pending release, using `pre-registry-local-history`; it has no fabricated or duplicate issue.
