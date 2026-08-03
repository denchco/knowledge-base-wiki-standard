---
type: Security and Source Policy
title: Security, privacy, and source handling
description: Normative policy pointers and minimum controls.
status: draft
---

# Security, privacy, and source handling

Implementations MUST declare source retention, copyright/licensing, confidentiality, personal-data, secrets, generated-content, and deletion/correction boundaries appropriate to their scope.

`DKBWS-SEC-001` is evaluated through four independent subcontrols so a useful partial policy cannot hide a material gap:

| Subcontrol | Minimum declaration |
|---|---|
| `secrets-and-authorization` | Secret locations and exclusions, credential rotation/reporting, and the authority required for state-changing local or external tools. |
| `personal-and-confidential-data` | Collection boundary, minimisation, access, redaction, correction/deletion, and incident handling. |
| `copyright-licensing-and-retention` | Source rights, quotation/redistribution limits, repository licence boundary, retention, and source removal consequences. |
| `untrusted-and-generated-content` | Non-execution of source instructions, safe parsing/rendering, generated-file authority, and review before generated claims become canonical. |

Each subcontrol is reported as pass, fail, waived, not applicable, or not checked. The aggregate requirement passes only when every applicable subcontrol passes.

The canonical repository policies are `SECURITY.md` and `SOURCE_POLICY.md`. Selected profiles MAY strengthen them but MUST NOT weaken secret handling, evidence authority, non-execution of untrusted source content, or explicit authorization for state-changing external operations.

An MCP server is optional. It MUST NOT become the only means of reading the standard, and write-capable tools MUST be separately authorized from read-only resources and validation.
