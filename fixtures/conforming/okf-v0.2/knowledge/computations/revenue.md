---
type: Attested Computation
title: Revenue
description: Recognized revenue for a fiscal year.
runtime: bigquery
parameters:
  - { name: year, type: integer, required: true }
generated: { by: reference_agent/fixture-1.0, at: 2026-08-01T11:00:00Z }
verified:
  - { by: process:fixture-check, at: 2026-08-01T12:00:00Z }
status: stable
---

# Computation

```sql
SELECT SUM(amount) AS revenue
FROM finance.recognized_revenue
WHERE fiscal_year = @year
```
