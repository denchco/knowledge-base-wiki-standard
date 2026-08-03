---
type: Implementation Profile
title: Standard production profile
description: First-class Zensical and DenchCo style with local diagrams, Graphify, browser proof, stable runtime, and Git/Jujutsu maintenance provenance.
resource: ../../profiles/standard-production.yaml
tags: [zensical, design, graphify, verification, provenance, jujutsu]
sources:
  - id: zensical
    resource: https://zensical.org/docs/
    title: Zensical documentation
  - id: graphify
    resource: https://github.com/Graphify-Labs/graphify
    title: Graphify
  - id: jujutsu
    resource: https://github.com/jj-vcs/jj
    title: Jujutsu
generated: { by: "human:denchco-maintainer", at: "2026-08-03T11:45:00Z" }
verified: { by: "human:denchco-maintainer", at: "2026-08-03T11:45:00Z" }
status: draft
x-denchco:
  evidence_state: candidate-preferred
---

# Standard production profile

New reference implementations use pinned Zensical, the governed DenchCo visual profile, locally served Mermaid and graph runtimes, real 2D/3D Graphify views, built-output browser verification, and HTTP-200 runtime health. Their maintenance workspaces satisfy `DKBWS-PROV-001` with Git-interoperable history and a colocated Jujutsu workspace; Portable Core and explicit distribution/CI checkouts may remain Git-only.
