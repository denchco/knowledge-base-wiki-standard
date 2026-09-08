---
type: Reference
sources:
  - resource: fixture-original-source
    last_modified: 2026-07-31
usage_window: { from: 2026-07-01, to: 2026-07-31 }
stale_after: 2099-01-01
x-local:
  source_date_precision: day
  reason: Original source records only a date; no time or UTC offset is known.
---

# Preserved legacy date precision

This synthetic fixture deliberately retains the previous date-only metadata.
Portability accepts it, strict guidance identifies the timestamp deviation, and
lossless export preserves the source without inventing an instant.
