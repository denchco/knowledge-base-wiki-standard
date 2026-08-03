---
type: Conformance Specification
title: Conformance
description: How implementations make and prove claims.
status: draft
---

# Conformance

A conformance claim MUST state:

- standard version and immutable revision where released;
- selected profile;
- role-to-path mappings;
- capability states;
- deviations and waivers with reasons;
- last verification result and environment;
- manual checks that remain outstanding.

Each requirement records applicability, deterministic or manual verification, diagnostic text, remediation, and introduction/deprecation versions.

The conformance kit contains positive and negative fixtures. A source/configuration assertion cannot prove browser-visible behaviour; rendered claims require built-output browser checks.

`validate` and `verify` MUST NOT silently rewrite canonical files. Generation and upgrade are separate explicit operations.
