---
type: Dependency Specification
title: Dependencies
description: Normative dependency classification and lock policy.
status: draft
---

# Dependencies

The canonical dependency contract is maintained in the repository root `DEPENDENCIES.md`.

Dependencies MUST be classified as universal, validation, renderer, graph, browser runtime, browser verification, design, provenance, service, deployment, or optional. Exact runtime pins and supported compatibility ranges MUST NOT be conflated.

Every profile MUST state installation commands, lockfiles, required external services, secret boundaries, offline/read-time behaviour, upgrade procedure, and corresponding checks.

An adapted consumer dependency closure includes only the commands and artifacts needed for its selected profile and declared capabilities. Standard-maintainer documentation synchronization, `verify:workspace`, and the sibling documentation repository contract are excluded unless the consumer independently declares and verifies that capability. When lifecycle tests compare historical revisions, CI MUST fetch the history needed to resolve their immutable commits.

When `DKBWS-LINK-002` applies, that closure includes the mapped source-link lint, its positive and negative fixtures, visible citation styling, and a browser representative that follows an identity to the manifest-mapped register row. A rewrite helper MAY be supplied but remains an explicit optional authoring command; read-only checks and lifecycle planning MUST NOT invoke it. A recorded not-applicable subject-empty or citation-free target skips the browser representative rather than inventing a source.

When `DKBWS-HUMAN-004` applies, the closure includes the mapped canonical-question source, bounded reader-source declaration, exact-text repetition lint, positive/negative/subject-empty fixtures, and a built-output browser journey over every discovered repetition route at desktop and mobile widths. Equivalent parsers and renderer markers MAY be used; the consumer's question string, route layout, and regular-expression implementation are not dependencies.

When `DKBWS-RUNTIME-002` applies, the closure includes a project-unique service ID, canonical loopback URL, shared-register adapter with serialized reservation and atomic replacement, live-listener preflight, exact comparison of all twelve governed registration fields, byte comparison of the generated and installed platform user-service definition, loaded-job checks, the `service-identity-v1` schema and project marker, composite status fixtures, and fail-closed `service:preview` handoff at the exact registered URL. A temporary server on another port is not a substitute for that evidence. Live service status runs only in maintainer verification; distribution/CI records the requirement and `local_service` capability as `not-checked`. Registry, lock, adapter, and log paths are user-local runtime state rather than repository content; they must not contain secrets.

When `DKBWS-PROMPT-002` applies, the closure includes an absolute HTTP(S) `human_wiki_url`, exact `development_response_links: live-wiki` capability, managed root/starter instructions, and the captured-draft response-link checker with Markdown, entity-decoded HTML, plain-GFM, code/comment, image, and managed-live fixtures. Before displaying local managed Wiki navigation, the implementation invokes `--managed-live` to prove the selected service's exact identity, equality with the registered canonical URL, and HTTP 200 for every displayed route. File/editor URLs and clickable local or repository-relative paths MUST NOT substitute for Wiki navigation; a plain path MAY identify only a non-Wiki implementation artifact. A conforming repository makes detected captured-draft violations fail, while absolute interception of an uncaptured response requires a host-provided pre-send hook or mandatory response artifact and MUST NOT be claimed without one.

When `DKBWS-UPDATE-002` applies, the closure includes the pinned proposal-record and proposal-registry schemas, deterministic renderer and SHA-256 implementation, disclosure validator, direct-state and terminal-transition checks, read-only issue/form inspection, exact remote registry bytes at the full `registryRevision`, strict release-to-registry ancestry, public release `draft: false`/`immutable: true` and exact-tag verification, the single immutable historical-bridge allowlist, and the repository's normal Jujutsu phase helper. Validation, verification, preparation, display, and synchronization checks require no write-capable GitHub credential and make no remote write. A browser opener is optional local integration: absence of the governed public form or a form-digest mismatch fails closed, and final submission remains a user action.

The reference verification adapter reserves `output/verification/receipt.json` for verification-receipt v1 and `output/verification/conformance-report.json` for the paired full-profile report. Consumer-specific summaries use different filenames. A consumer licence and rights-holder decision is explicit and does not inherit the Standard package's licence merely because implementation files were adapted.

The reference build MUST declare exact Node, npm, Python, uv and renderer versions separately from consumer minimums, pin Actions to full commits, and identify the runner OS release. The runtime sanitizer MUST be verified from the browser-executed bundle rather than inferred from a separate package lock entry. Runtime inspection MUST report opaque prebundle coverage honestly. Dependency updates remain reviewable changes requiring the complete selected-profile verification before release.
