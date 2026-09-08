---
type: Validation Queue
title: Validation queue
description: Outstanding evidence and implementation work.
status: draft
---

# Validation queue

| ID | Gap or decision | State | Next bounded action | `blocked_by` | `reopen_when` | `last_checked` |
|---|---|---|---|---|---|---|
| STD-VAL-001 | The canonical OKF location and offset-datetime rules differ from the former unpinned DenchCo assumption. | Resolved for pinned source; future drift parked | Retain the [source lock and timestamp migration](spec/conformance.md#okf-source-and-timestamp-migration), strict guidance, and lossless fixtures. | No later reviewed specification change. The earlier registration lacks immutable bytes, so the wording change date is unknown. | A new upstream commit, digest, or erratum changes a supported rule. | 2026-09-07 |
| STD-VAL-002 | Built-output coverage may need environments beyond the current desktop/mobile, diagram, graph, local-network, geometry, table-overflow, and console contracts. | Parked | None. The second consumer supplied route, graph fail-closed, draft row-centre, and mobile-table gaps, all now covered. | No current failing environment. | A consumer or supported adapter supplies another reproducible gap. | 2026-08-04 |
| STD-VAL-005 | Five dogfood audits are inferred rather than project-owned conformance claims. | Parked | None at Standard level. | Each project owner has not made an explicit adoption decision. | A project owner explicitly requests formal adoption. | 2026-08-03 |
| STD-VAL-007 | The [optional Codex adapter](llm-wiki/codex-adapter.md) can check captured Stop messages and request one correction; Stop is a continuation guardrail, not absolute pre-send rejection. | Optional adapter implemented; absolute interception parked | Keep shared captured-draft checks, bounded retry fixtures, explicit project opt-in and exact hook trust. Qualify actual host activation only when selected locally. | Hooks may be untrusted, disabled or unavailable; absent messages, execution failures and exhausted retries do not establish validation. | A selected host offers a demonstrably stronger delivery boundary, or local activation reveals a reproducible adapter gap. | 2026-09-07 |

Parked rows are not recurring handoff recommendations. Reopen one only when its recorded trigger occurs or the user explicitly changes scope.
