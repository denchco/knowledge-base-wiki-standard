---
type: BigQuery Table
title: Customer Orders
description: One row per completed customer order across all channels.
resource: https://example.invalid/bigquery/sales/orders
tags: [sales, orders]
sources:
  - id: orders-schema
    resource: https://example.invalid/schemas/orders
    title: Orders schema
    author: process:schema-registry
    usage_count: 1200
    last_modified: 2026-07-31
usage_window: { from: 2026-07-01, to: 2026-07-31 }
generated: { by: process:fixture-builder, at: 2026-08-01T09:30:00Z }
verified: { by: human:reviewer, at: 2026-08-02T10:00:00Z }
status: stable
stale_after: 2099-01-01
x-denchco:
  evidence_state: applicable
  nested:
    preserve_me: true
---

# Schema

`order_id` is the stable order key.[^orders-schema]

[^orders-schema]: Orders schema

Revenue is calculated by the [sanctioned computation](../computations/revenue.md).
