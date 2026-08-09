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
3. Run `npm run standard:proposal -- check <id>` or `check --all`. This validation is read-only and offline, and checks direct state metadata, prerequisites, ordering, and terminal transitions rather than trusting that the CLI produced the JSON.
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
| Release inclusion | Named release authority | Exact registry bytes at the full recorded revision strictly descend from the release revision and map the accepted change to the exact public non-draft immutable tag and revision. |
| Consumer adoption | That consumer project's authority | The consumer deliberately changed its pin or recorded a justified decision not to adopt. |

Neither acceptance nor release automatically changes a consumer repository. A consumer may keep its current pin, assess an available release, or deliberately adopt it; each outcome is recorded in its own JJ phase.

## Standard-maintainer registry

The Standard maintains `standard-proposals/registry.json` separately from consumer records. It binds the proposal marker and origin to any governed issue, explicit decision revision, stable accepted requirement IDs, and immutable release inclusion. Governed issue intake requires exact issue linkage; new work cannot substitute a historical mode.

Workflow v1 has exactly one `pre-registry-local-history` exception: `DKBWS-PROP-uk-digital-health-reader-source-navigation-38f4b5cbcddce10fbcde32f70862143b`, from `UK Digital Health compliance`, with no public URL or issue; implementation `3a085ebbfa66dea87d96700c7a735cf65def5ef6`; verification `3d9e1379ec67fd378b16c4b50c77f57c0db3c871`; pinned Standard `46183bc02c3d818f5aac962a4fbebc49b6ac9659`; reusable accepted decision `6b9c686c66d2ef0e17342d666140bf4117f33a87`; and accepted requirement `DKBWS-LINK-002`. Any changed or additional bridge fails `DKBWS-PROP-HISTORICAL-BRIDGE-001`.

Release inclusion is recorded after publication: a commit cannot truthfully contain its own final Git hash. The release authority first publishes the release, then records the observed tag and revision in a follow-up registry commit. Read-only verification resolves the full `registryRevision`, loads and validates the exact registry bytes there, proves that registry revision strictly descends from the release revision, requires a public release whose exact tag has `draft: false` and `immutable: true`, resolves the tag to the release revision, and confirms the registry entry maps the accepted requirements to it. Until all checks pass, the registry remains `pending` and no public release or consumer pin is inferred.

## Direct state integrity

The schemas and executable checker reject impossible records even when they were edited directly: empty states cannot retain outcome metadata; preparation requires complete implementation and passing verification; approval and submission require the exact prepared payload; linked issue URL, number, state, digest, and timestamps agree; decisions require exact governed linkage; release requires acceptance; and adoption targets the exact included revision. Submission observation, issue linkage, decision, release inclusion, and adoption are one-way or terminal in workflow v1. The stable diagnostics are `DKBWS-PROP-STATE-TRANSITION-001`, `DKBWS-PROP-REGISTRY-REVISION-001`, `DKBWS-PROP-REGISTRY-ANCESTRY-001`, `DKBWS-PROP-RELEASE-IMMUTABLE-001`, and `DKBWS-PROP-HISTORICAL-BRIDGE-001`.

## Command safety

`check`, `show`, release/registry verification, and registry comparison are read-only. `new`, `prepare`, and `record` write only local tracked or generated proposal state. `open` performs GET-only remote checks and opens a browser. No command creates or edits a GitHub issue, publishes a release, changes a Standard decision, updates a consumer pin, or uploads attachments automatically.
