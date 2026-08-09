---
type: Product Architecture
title: Coordinated Human and LLM Wikis
description: Two experiences generated and maintained over shared canonical knowledge.
resource: ../../docs/architecture.md
tags: [human-wiki, llm-wiki, architecture]
sources:
  - id: karpathy-llm-wiki
    resource: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
    title: Karpathy LLM Wiki
generated: { by: "human:denchco-maintainer", at: "2026-08-03T11:45:00Z" }
verified: { by: "human:denchco-maintainer", at: "2026-08-03T11:45:00Z" }
status: draft
x-denchco:
  evidence_state: adopted
---

# Coordinated Human and LLM Wikis

The Human Wiki optimizes reading, navigation, search, diagrams, decisions, and evidence inspection. The LLM Wiki optimizes context selection, maintenance, ingest, query, and lint. They do not become independent duplicate corpora.

When the Human Wiki presents a governing-question callout, `DKBWS-HUMAN-002` makes it machine-identifiable and binds both its rail and question text to the active accent colour. This semantic distinction is reserved for the governing question; ordinary quotations remain neutral evidence content.

When a seeded Human Wiki repeats its declared canonical governing question on more than one reader surface, `DKBWS-HUMAN-004` requires every exact repetition in the manifest-bounded reader-source set to retain that same governed callout. Paraphrases, ordinary quotations, and historical/source records outside the reader set are not reclassified by similarity; a subject-empty Wiki maps no canonical question and records the conditional rule as not applicable.

When the Human Wiki displays draft state in primary navigation, `DKBWS-HUMAN-003` pairs a dedicated edit marker with readable status text, aligns it to the trailing expand/collapse-control column, centres both marker and stock control within their own rows, and rejects page overflow. The Zensical reference adapter uses the registered CC0 Pen Circle asset; other renderers may use an equivalent open-licensed marker when they prove the same semantic and geometric outcome.

When the Human Wiki displays a registered source identity, `DKBWS-LINK-002` makes that identity an independent internal link to its exact source-register row. Lists retain one link per displayed identity, compact ranges link their displayed endpoints, and direct links to named official publications use registered source URLs. Subject-empty and citation-free surfaces do not invent evidence to activate the rule.
