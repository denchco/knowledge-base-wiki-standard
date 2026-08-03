# Subject-empty starter

This directory is the reusable starting surface for an independent knowledge-base repository. It is not a copy of the DenchCo standard repository and it contains no example topic, standard help corpus, dogfood evidence, or deployment choice.

Use `starter.yaml` as the machine-readable boundary. A Codex instance should:

1. inspect the standard at an immutable release tag or commit;
2. render only the listed templates into a separate target repository;
3. author the target's `docs/` and `knowledge/` content from its own topic and sources;
4. adapt only the explicitly classified implementation files needed by the selected profile;
5. choose the target's own canonical Wiki URL and deployment adapter; and
6. validate the completed target against the pinned standard revision.

The public human documentation is at <https://denchco.github.io/knowledge-base-wiki-documentation/>. The standard repository at <https://github.com/denchco/knowledge-base-wiki-standard> remains the sole normative authority.

Do not recursively copy the repository root. Do not publish the standard's reference pages as the target Wiki.

There is no apply command in this candidate. The templates define a deterministic content boundary, not a secretly incomplete runnable scaffold. Portable Core targets validate with the CLI and schemas from the pinned release. Standard Production additionally requires an implementation agent to supply and verify the complete renderer, scripts, schemas, profiles, runtime assets, locks, CI, and provenance closure selected from that release.
