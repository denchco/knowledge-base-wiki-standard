---
type: Conformance Hub
title: Conformance evidence
description: Machine-readable reports, cross-project dogfooding, and interpretation rules.
status: draft
---

# Conformance evidence

This area records evidence produced by the standard's verification and adoption-audit workflows. It does not replace the normative [conformance specification](../spec/conformance.md).

The first dogfood set inspects five deliberately different local wikis without modifying them. Read the [comparative report](dogfood/comparison.md) for the findings and follow its links to the five machine-readable audit records.

Formal conformance requires a project-owned `.wiki-standard.yaml`. Adoption audits may infer mappings and capabilities, but their output remains a review proposal rather than a declaration on behalf of the target project.

The JSON records declare the portable `schema/adoption-audit-report-v1.json` contract. `npm run check:adoption-audits` checks all records, complete requirement-catalogue coverage, summary counts, unique IDs, repository-relative evidence paths, and the bounded `HIGH` / `MEDIUM` / `LOW` inference-confidence vocabulary.
