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
