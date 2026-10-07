---
type: Authoring Specification
title: Writing style — ASD-STE100 at 80%
description: A prospective DenchCo writing default informed by Simplified Technical English, with precise scope and review limits.
status: draft
---

# Writing style — ASD-STE100 at 80%

Use clear, direct English for new Wiki content. Apply the main habits of ASD-STE100 while preserving technical meaning and the reader's needs.

The DenchCo default is **ASD-STE100-inspired writing at 80%**. Here, 80% means a pragmatic style preference. It is not a computed score, vocabulary quota, or official ASD compliance level. Apply the habits below by default. Allow a reasoned exception when a stricter rewrite would harm precision or comprehension. Do not create a quota of exceptions.

This authoring default extends `DKBWS-PROMPT-001`. It governs the prompt, agent instructions and starter policy. It does not add an automated claim about linguistic compliance.

## Basis and scope

The current official reference is **ASD-STE100 Issue 9, dated 15 January 2025**. It combines writing rules with a controlled dictionary. The official guidance also permits technical nouns and technical verbs for specific subjects. The October research found no official 80% compliance measure. The percentage is a DenchCo choice. [SRC-057](../sources.md#src-057)

The default applies to all future new Wiki setups using a Standard revision that contains this policy. It also applies to newly composed English prose in a Wiki that has adopted that revision. Scope includes Human Wiki pages, summaries, explanations, procedures, captions, table prose, accessible descriptions and LLM operating guidance.

Existing passages do not require a bulk rewrite. When a requested change replaces a passage, apply the style to the new wording. Preserve untouched history and registered evidence. A subject-empty Wiki receives the policy without invented subject content. Other languages need their own appropriate authoring rules.

Explicit user instructions and stronger applicable local rules take precedence. Record a material local variation in the target's authoring policy. Examples include required legal wording, a controlled clinical vocabulary, or a stricter STE contract. Retain the project's chosen spelling convention; adopting this house style does not silently change it.

## Writing habits

These are selected habits for the DenchCo adaptation. They do not reproduce the complete ASD standard or its dictionary.

| Context | Default treatment |
|---|---|
| Word choice | Use familiar words with a clear meaning. Name the same thing consistently. Define unfamiliar abbreviations and necessary domain terms. |
| Sentences | Prefer simple constructions. Separate independent ideas when this helps the reader. Keep subjects, verbs and useful connecting words. |
| Procedures | Use direct commands and normally one action per step. Put a necessary condition before the action. |
| Descriptions | Prefer active voice when the actor is known. Use passive voice when needed; never invent an actor to avoid it. |
| Paragraphs | Develop one topic at a time. State the main point early and keep the explanation connected. |
| Structure | Use numbered steps for sequences. Use lists or tables when they make parallel information easier to understand. |
| Terminology | Preserve necessary technical nouns and verbs. Use an existing glossary or add a definition when readers need one. |

The official rules distinguish procedural and descriptive writing. Their sentence limits are 20 and 25 words respectively; descriptive paragraphs have a six-sentence limit. DenchCo uses these as editing targets within this pragmatic policy. ASD has special word-counting rules, so a simple whitespace counter is only a heuristic. [SRC-058](../sources.md#src-058)

Revise a long sentence when a split improves clarity. Keep a longer sentence when the split would obscure a necessary relationship. Preserve enough connective prose to explain causes, alternatives and uncertainty. Short fragments alone do not establish clear writing.

## Meaning and protected content

Simplification MUST preserve facts, scope, obligations, attribution, evidence state, caveats and uncertainty. Do not turn a possibility into a fact or a recommendation into a requirement. Do not remove an exception merely to shorten a sentence.

The style pass MUST preserve these exact forms when they are required:

- Verbatim quotations, registered publication titles and source identities.
- Official names, product labels, exact UI text and necessary technical terms.
- URLs, paths, commands, code, schema keys and other identifiers.
- A declared canonical governing question and its governed exact repetitions.
- Required legal, safety or contractual wording.

Explanatory prose around these forms uses the style. An independently requested source correction or governed question change follows its own change process. This policy supplies no authority for such a change.

Technical language is not automatically a style failure. The official guidance provides categories for technical nouns and verbs, including terms absent from the general dictionary. Keep their meaning and spelling stable. Do not apply a blanket ban to technical vocabulary or words ending in `-ing`. [SRC-057](../sources.md#src-057)

## Authoring review and evidence

Before completing new prose, review the changed passages for the reader's task, clear actions, consistent terminology and preserved meaning. Check sentence and paragraph length where useful. Re-read the source when a simpler phrase could change its meaning. Document a material exception in the local policy or change record, with its scope and reason.

Record the review honestly: identify the changed scope, any material exceptions and any unreviewed limits. Do not report a numeric compliance result unless a separate assessment defines its method. This default does not require a per-sentence score or a new record for every ordinary edit.

Automated checks verify policy propagation, managed instruction parity, pinned-template selection and preservation of existing target files. They MUST NOT report that these checks prove an 80% writing score or full ASD-STE100 compliance. STEMG guidance explains that checking software cannot replace informed review. Its AI guidance also distinguishes plausible text from verified compliance. [SRC-059](../sources.md#src-059)

For a contract that requires full ASD-STE100, obtain and review the official issue and its dictionary under the applicable terms. Use qualified review appropriate to that contract. This house policy is insufficient evidence for that claim. The freely available standard remains copyrighted; do not copy its dictionary, examples or complete rules into a Wiki or checker without permission. [SRC-058](../sources.md#src-058)

## Bootstrap and migration

The instantiation prompt MUST carry this default without adding a routine setup question. The allowlisted starter MUST supply `AUTHORING.md`, map it as `roles.authoring_policy`, and direct shared agent instructions to it. The file is operating policy, not copied subject matter.

The root and starter `AGENTS.md` writing blocks MUST agree. Claude continues to use the shared `@AGENTS.md` entry point. Skills MUST follow the selected target policy and its pinned Standard revision. A newer plugin must not silently impose this policy on an older consumer.

Existing Wikis adopt this policy through a reviewable update to their authoring instructions. Preserve local variations and existing `AUTHORING.md` files. Resolve collisions through review, not overwrite. An initialization plan for an older immutable revision MUST retain that revision's templates and defaults.

This change requires no OKF content conversion, dependency installation, renderer replacement or retrospective audit of the existing corpus. It changes no consumer pin or released snapshot. See the [prompt contract](prompts.md), [requirement catalogue](requirements.md) and [maintenance workflow](../llm-wiki/maintenance.md).
