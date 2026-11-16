---
type: Agent Guide
title: LLM Wiki entry point
description: Minimum reliable context for agents maintaining or applying the standard.
status: draft
---

# LLM Wiki entry point

## Read first

1. Repository `AGENTS.md`.
2. `.wiki-standard.yaml`.
3. [Normative specification](../spec/index.md).
4. [Context map](context-map.md).
5. [Project status](../project/status.md).
6. `DESIGN.md` for rendered changes.
7. Graphify query results when available.

For new original English prose, read the mapped `AUTHORING.md` and [writing policy](../spec/writing-style.md). Apply the pragmatic ASD-STE100-inspired 80% default while preserving technical meaning and protected content. Review changed passages; do not claim a computed compliance score. Existing pinned consumers retain their own policy until adoption.

Use the [Graphify workflow](graphify.md) for query-first discovery, the six required enrichment layers, and repeatable 2D/3D publication.

The [optional Codex adapter](codex-adapter.md) packages the shared workflow and a locally trusted Stop guardrail. [Web discovery](web-discovery.md) explains the path-scoped llms.txt and derived Markdown alternatives for reading the Wiki through HTTP.

## Select and retain a released stack

For a first build, follow the [first-wiki guide](../guides/first-wiki.md) and canonical instantiation prompt. Run `npm run standard:stack -- resolve --json`. Use its verified published, non-draft, native-immutable release and exact SHA, including numeric `rc` prereleases under the default channel. Require exact tag resolution and successful trusted `Verify` push/main evidence; do not substitute default-branch HEAD or an older release when proof fails. Read the selected source and install its exact tools and frozen locks.

For an existing Wiki, run `npm run standard:stack -- check <wiki>`. This only reads release availability and identity. It never installs, changes the pin or migrates content. A user-authorised migration checks compatibility, preserves unknown fields and deviations, and runs full selected-profile verification. Improvements require a new immutable release. Historical qualification is date-bound and does not waive current audits. Explicit historical/development revision plans remain unverified release selections.

## Operating model

- **Ingest**: register the source, preserve raw identity, add its stable exact-row anchor, update relevant concepts and evidence, add links, and record the change.
- **Query**: start from the context map and graph, read the smallest authoritative set, expose uncertainty, and cite registered evidence through individual internal source-row links.
- **Lint**: find contradictions, stale claims, unsupported authority language, ungoverned exact repetitions of the declared canonical question, bare or misdirected source identities, unregistered named-authority URLs, orphans, duplicate concepts, missing contextual links, broken generated surfaces, and profile drift.
- **Propose**: after a user-authored local innovation is complete and verified, preserve its immutable origin in a tracked [Standard proposal](standard-proposals.md). Validate direct states and terminal transitions offline, generate a disposable scrubbed payload, bind approval to its exact digest and governed form revision, and leave final submission with the user. Intake, explicit Standard acceptance, exact registry/release evidence, and optional consumer adoption are separate authorities and JJ phases; the one historical bridge is not available to new work.

Development responses route Human or LLM Wiki destinations through the configured live canonical HTTP(S) origin under `DKBWS-PROMPT-002`. File, editor, absolute-path, and repository-relative Markdown links do not substitute for Wiki navigation; plain repository paths identify only implementation artifacts with no rendered route. Captured drafts check Markdown, HTML links, and plain GFM-autolinked URLs. Managed local drafts add `--managed-live` to require exact service identity, canonical URL equality, and HTTP 200 for every displayed route; `STD-VAL-007` remains the host boundary for uncaptured output.

Persistent preview handoff uses `npm run service:preview` only after all twelve registry fields, the exact installed/loaded job, canonical URL, and marker identity pass. Live service evidence belongs to maintainer verification; distribution/CI leaves `DKBWS-RUNTIME-002` not checked.

Never treat an LLM answer, rendered page, graph edge, or generated export as new evidence.

In a Standard Production maintenance workspace, a file-changing development turn remains incomplete until its persistent changes are recorded in the required end-of-turn JJ commit under `DKBWS-PROV-001`.

Codex reads the shared root `AGENTS.md`; Claude Code reaches the same contract through the root `CLAUDE.md` import. Complete the requested scope before recommending more work. At the end of every development cycle, assess the Wiki's continuing subject, governing question when declared, evidence and content maturity. Prioritise subject content and evidence work; address a failed or unrun required check before optional content work. Include no more than three prioritised Next Steps. Each must fit one follow-up pass and state `Proposed update:`, `Why it matters:` and `Done when:`. Suggestions are recommendations, not continuation authority. Use project status, the validation queue and relevant handoff evidence to exclude completed work. Do not reopen bounded, parked or evidence-blocked work without new evidence, a due scheduled recheck or explicit user instruction. Parked work retains `blocked_by`, `reopen_when` and `last_checked`. If no grounded content update or required follow-up qualifies, state `No further grounded content update is available.` Never invent filler. Check captured drafts with `response:next-steps:check` when available; format checks do not prove grounding or intercept uncaptured responses.
