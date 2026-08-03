---
type: Validation Queue
title: Validation queue
description: Outstanding evidence and implementation work.
status: draft
---

# Validation queue

| ID | Gap or decision | State | Next bounded action | `blocked_by` | `reopen_when` | `last_checked` |
|---|---|---|---|---|---|---|
| STD-VAL-001 | Future OKF v0.2 changes may require validator changes. | Parked | None. Retain the current hard boundary, guidance diagnostics, lossless export, and fixtures. | No evidenced upstream format change. | An upstream OKF revision or erratum changes a supported rule. | 2026-08-03 |
| STD-VAL-002 | Built-output coverage may need environments beyond the current desktop/mobile, diagram, graph, local-network, geometry, and console contracts. | Open, evidence-led | Add one fixture for an exact failing or newly supported environment. | No current failing environment. | A consumer or supported adapter supplies a reproducible gap. | 2026-08-03 |
| STD-VAL-003 | Zensical and graph-publication compatibility needs versioned evidence. | Open, evidence-led | Qualify only the exact version pair selected by a consumer or intentional upgrade. | No second independent consumer result yet. | A consumer or intentional dependency upgrade selects a new pair. | 2026-08-03 |
| STD-VAL-004 | Jujutsu `0.42.0` is not reference-qualified. | Parked | Retain `0.39.0`. | Provenance and complete Standard Production verification have not been recorded for `0.42.0`. | An intentional Jujutsu qualification pass is in scope. | 2026-08-03 |
| STD-VAL-005 | Five dogfood audits are inferred rather than project-owned conformance claims. | Parked | None at Standard level. | Each project owner has not made an explicit adoption decision. | A project owner explicitly requests formal adoption. | 2026-08-03 |
| STD-VAL-006 | The lifecycle and dual-agent instruction contract lacks a second independently maintained consumer proof. | Open | Run inspect, validate, diff/upgrade planning, Codex instruction loading, and Claude import loading against one consenting consumer; record one schema-valid report and observed defects. | Consumer selection and owner decision. | A consumer is selected for the bounded pass. | 2026-08-03 |
| STD-VAL-007 | A dedicated Standard MCP may or may not add value beyond GitHub MCP and the stable CLI. | Parked | None before the second-consumer comparison. | No observed unmet discovery or update-inspection gap. | `STD-VAL-006` records a named task the existing surfaces cannot serve cleanly. | 2026-08-03 |

Parked rows are not recurring handoff recommendations. Reopen one only when its recorded trigger occurs or the user explicitly changes scope.
