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

The reference verification adapter reserves `output/verification/receipt.json` for verification-receipt v1 and `output/verification/conformance-report.json` for the paired full-profile report. Consumer-specific summaries use different filenames. A consumer licence and rights-holder decision is explicit and does not inherit the Standard package's licence merely because implementation files were adapted.
