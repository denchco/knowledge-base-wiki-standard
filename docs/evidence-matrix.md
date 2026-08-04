---
type: Evidence Matrix
title: Evidence matrix
description: Support and remaining limitations for candidate standard decisions.
status: draft
---

# Evidence matrix

| Claim | Support | State | Limitation |
|---|---|---|---|
| Persistent synthesis should compound rather than be rediscovered for every query. | SRC-001 | Supported | Requires lint and evidence safeguards against propagated errors. |
| OKF v0.2 is the portable knowledge foundation. | SRC-002 | Implemented candidate | Public schema endpoints are published through the documentation Pages site; validation still uses the pinned local schema copy. Hard validation, strict guidance, and unknown-field round-trip fixtures pass locally. |
| Human and LLM products should share canonical knowledge. | SRC-001, SRC-002, SRC-011 | Implemented candidate | More cross-renderer and independently maintained consumer fixtures are still needed. |
| A displayed governing question should be semantically distinct and use the active accent for both its rail and text. | SRC-009, SRC-012 | Implemented candidate (`DKBWS-HUMAN-002`) | The reference Zensical implementation has desktop/mobile browser evidence; broader cross-renderer evidence remains to be gathered. |
| Draft pages displayed in primary navigation should use a dedicated edit marker with readable status text and share the trailing control column with navigation chevrons. | SRC-005, SRC-009, SRC-017, SRC-018 | Implemented candidate (`DKBWS-HUMAN-003`) | The exact Pen Circle asset and geometry are reference-adapter decisions; other renderers still need equivalent built-output evidence. |
| Zensical plus the DenchCo style should lead the reference distribution. | SRC-005, SRC-011, SRC-012 | Candidate preferred | Cross-renderer accessibility evidence remains incomplete. |
| Graphify adds useful explicit relationships but not evidence authority. | SRC-006, SRC-011, SRC-012 | Supported | Semantic extraction coverage varies by corpus. |
| A dedicated MCP is useful later but should not be required to read the standard. | SRC-002, SRC-007, SRC-008 | Adopted | MCP tool surface is not yet implemented. |
| Jujutsu should be included in DenchCo Standard Production maintenance workspaces. | SRC-011, SRC-012, SRC-013 | Executable candidate (`DKBWS-PROV-001`) | Portable Core and explicit distribution/CI checkouts remain Git-only compatible; Jujutsu 0.42.0 is available upstream but not yet reference-qualified beyond the locally tested 0.39.0 boundary. |
| One MIT License is the minimal clear permission for friends to reuse the repository's original work. | SRC-014 | Adopted | Third-party material and registered sources retain their own terms; the licence does not transfer ownership of the DenchCo name. |
| Shared Codex/Claude instructions should finish requested scope before offering at most three goal-linked recommendations and should park trigger-blocked work rather than repeat it. | SRC-011, SRC-012, SRC-015, SRC-016 | Implemented candidate (`DKBWS-PROMPT-001`) | Static checks prove instruction presence, import, and skill parity; model adherence remains behavioural and must be observed in consumer use. |
