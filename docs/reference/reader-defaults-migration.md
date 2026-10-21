---
type: Migration Guide
title: Reader defaults migration
description: Adopt Wide layout, numeric source citations and complete conformance evidence.
status: draft
---

# Reader defaults migration

The current candidate makes Wide the unconfigured desktop default under `DKBWS-DESIGN-001` and numeric superscripts the Human citation default under `DKBWS-LINK-002`. `DKBWS-VERIFY-002` now requires every applicable proof obligation before a requirement can pass. The [release preparation record](../project/release-readiness.md) separates local implementation from acceptance, publication and consumer adoption.

This migration preserves canonical Markdown, source identities, evidence states, explanatory notes and navigation accessibility. It does not change an existing consumer's pinned contract. Apply the changes only in a reviewed consumer adoption.

## Width

1. Carry the current width runtime, styles, starter defaults and browser checks together. Without appearance configuration, a fresh desktop reader must receive Wide.
2. Preserve the existing preference key and valid saved Standard or Wide choices. A saved Standard choice remains Standard after adoption.
3. If the project explicitly chooses another initial width, record it in its appearance configuration and design contract. The runtime must use that setting when storage is missing, invalid or unavailable.
4. Check initial load, reload and navigation with no stored choice, each valid saved choice, an invalid value and blocked storage. Resize to mobile and back. Mobile must remain contained and must not overwrite the saved desktop choice.

## Source citations

1. Declare `source_citation_style: numeric-superscript` in the Human Wiki manifest. Preserve the mapped source register and every exact row anchor.
2. Carry the parsed-tree renderer adapter, its build and live-preview wiring, source-link lint, superscript styles, renderer fixtures and all-page output check together. The reference adapter is `scripts/source_citations.py` and uses the pinned renderer's Markdown extension configuration.
3. Preserve canonical source links and supported source-footnote references. A citation to `SRC-002` renders as `002`, including its leading zeroes, with the full identity in its accessible name. The destination remains that source's exact row.
4. Retain authored order and separate links within groups. Preserve displayed range endpoints without inventing intermediate sources. Repeated citations retain their stable labels and targets.
5. Retain explanatory footnote content. Only source-only notes may be folded into direct citations. Unused definitions, code examples and escaped literals must not create claim citations.
6. Remove legacy bracket pseudo-elements from the numeric presentation. Keep full source-register row labels, native keyboard focus, active-theme contrast and mobile containment.
7. Run source lint, renderer fixtures and the all-page built-output check. Run interactive browser checks for numeric labels, superscript geometry, accessible names, focus, exact fragments and destination rows. Deliberately missing markup and the old bracket presentation must fail the baseline checks.

An older pinned consumer may retain its earlier grammar. A consumer adopting the current Human profile must migrate or record an explicit scoped deviation; the former blanket legacy exception no longer applies. Citation-free and subject-empty Wikis declare the default but invent no citations.

## Verification receipts

Map each selected requirement to its named proof obligations. Emit explicit successful evidence for every applicable obligation; a passing build cannot supply browser proof. Keep security subcontrols and maintainer provenance distinct. Distribution verification must still leave maintainer-only service and Jujutsu evidence unchecked.

Old receipts remain historical records. They cannot prove a newly expanded requirement by supplying a generic PASS. Regenerate the receipt and report with the current emitter and schema. Confirm that removing each required proof produces an incomplete or failing report. Record conditional inapplicability with evidence instead of silently omitting an obligation.

Run the complete consumer verification after migration. Record the resulting revision and evidence before changing its adoption record. The Standard's own checks do not establish that a consumer has adopted or verified these changes.

## Related migration

The same candidate includes [status-free navigation](navigation-status-migration.md). Retain its template override and fallback-icon suppression while integrating reader defaults. `DKBWS-HUMAN-003` stays retired and reserved; historical releases retain their original requirements.
