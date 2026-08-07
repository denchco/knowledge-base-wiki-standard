---
type: Workflow Guide
title: Standard proposals
description: Durable consumer-to-Standard intake, decision, release, and optional adoption boundaries.
status: draft
---

# Standard proposals

`DKBWS-UPDATE-002` keeps a reusable consumer improvement reviewable from its first observation through optional later adoption. The tracked JSON record under `standard-proposals/` is authoritative. A generated payload under `output/standard-proposals/` is a disposable, scrubbed projection and must never replace the record.

## Consumer workflow

1. Finish and verify the project-owned implementation, then record its full Git commit, optional JJ change ID, and immutable pinned Standard revision.
2. Create and complete a tracked proposal record with `npm run standard:proposal -- new <slug>`.
3. Run `npm run standard:proposal -- check <id>` or `check --all`. This validation is read-only and offline.
4. Run `prepare <id>` to produce a sanitised preview, then `show <id>` to inspect the exact repository, title, body, labels, marker, form revision, and payload digest.
5. Record explicit approval bound to that exact digest and form revision. Any payload or form change makes the approval stale.
6. Run `open <id>` only when requested. It checks the governed form, required labels, marker duplicates, and immutable payload before opening the browser. It does not submit or upload anything; the user performs the final Submit action.
7. Record the observed issue URL only after an unambiguous marker match. If submission outcome is unclear, preserve the ambiguous state and search by marker before retrying.

The proposal must contain safe summaries and references rather than consumer files. Reject secrets, private absolute paths, personal or confidential material, restricted evidence, public vulnerability detail, and material without sharing rights.

## Independent states and authorities

| State | Authority | What it proves |
|---|---|---|
| Local implementation and verification | Consumer project | The change works at the recorded immutable revision. |
| Payload approval and form submission | Authorised consumer user | This exact scrubbed payload may be submitted through the governed form. |
| Classification and acceptance | Standard maintainers | The proposal is explicitly accepted, rejected, withdrawn, or remains pending; issue closure alone proves nothing. |
| Release inclusion | Named release authority | A published immutable tag and revision include the accepted change. |
| Consumer adoption | That consumer project's authority | The consumer deliberately changed its pin or recorded a justified decision not to adopt. |

Neither acceptance nor release automatically changes a consumer repository. A consumer may keep its current pin, assess an available release, or deliberately adopt it; each outcome is recorded in its own JJ phase.

## Standard-maintainer registry

The Standard maintains `standard-proposals/registry.json` separately from consumer records. It binds the proposal marker and origin to any governed issue, explicit decision revision, stable accepted requirement IDs, and immutable release inclusion. Historical accepted work may use a declared pre-registry bridge without inventing an issue.

Release inclusion is recorded after publication: a commit cannot truthfully contain its own final Git hash. The release authority first publishes the immutable tag, then records the observed tag and revision in a follow-up registry commit and verifies that mapping. Until both exist, the registry remains `pending` and no public release or consumer pin is inferred.

## Command safety

`check`, `show`, and registry comparison are read-only. `new`, `prepare`, and `record` write only local tracked or generated proposal state. `open` performs GET-only remote checks and opens a browser. No command creates or edits a GitHub issue, publishes a release, changes a Standard decision, updates a consumer pin, or uploads attachments automatically.
