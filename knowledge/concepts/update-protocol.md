---
type: Maintenance Protocol
title: Living update protocol
description: Version-pinned, evidence-backed, reviewable standard and consumer evolution.
resource: ../../GOVERNANCE.md
tags: [governance, migration, releases]
sources:
  - id: github-releases
    resource: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
    title: GitHub Releases
generated: { by: "human:denchco-maintainer", at: "2026-08-03T11:45:00Z" }
verified: { by: "human:denchco-maintainer", at: "2026-08-03T11:45:00Z" }
status: draft
x-denchco:
  evidence_state: adopted
---

# Living update protocol

Consumers pin immutable releases or commits of the normative Standard repository. Identity includes the canonical source, descriptive version label, and immutable revision; equal labels never erase a revision or inherited-requirement difference. Lifecycle tooling loads candidate and consumer profile/catalogue inputs from their exact commits, blocks missing, unresolved, newer, or diverged pins, and exposes introduced requirements before repinning. Changes arrive through inspectable diffs, migration notes, patches, or pull requests that preserve local deviations. No Standard tool silently replaces local work with the latest template. The public documentation site is explanatory; its private source consumes a hash-checked Standard snapshot, while consumer validation uses pinned local schemas and never depends on that site's availability.

Standard Production proposal intake uses tracked, versioned, machine-validated records rather than ignored drafts as authority. Approval is the SHA-256-bound review of the exact repository, title, labels, body, and governed issue-form digest; an edit invalidates it. Issue linkage and state, explicit Standard decision, immutable-release inclusion, and later consumer adoption remain separate transitions, so closing an issue never accepts a proposal and accepting one never changes a consumer pin. Validation, verification, preparation, display, and synchronization checks make no remote writes; public issue submission, release publication, and consumer adoption each require their own authority and Jujutsu-recorded change.
