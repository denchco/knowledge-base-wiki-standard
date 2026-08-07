# Subject-empty starter

This directory is the reusable starting surface for an independent knowledge-base repository. It is not a copy of the DenchCo standard repository and it contains no example topic, standard help corpus, dogfood evidence, or deployment choice.

Use `starter.yaml` as the machine-readable boundary. A Codex instance should:

1. accept the standard repository URL as the complete bootstrap invocation;
2. ask first for a research topic seed or a subject-empty local initialization, then inspect before asking follow-ups;
3. resolve the standard repository's current default-branch HEAD automatically and inspect that exact commit;
4. infer routine local defaults, state and confirm the accent hex, and render only the listed templates into a separate target repository;
5. author the target's `docs/` and `knowledge/` content from its own topic and sources, or preserve an explicit awaiting-seed state without invented claims;
6. adapt only the explicitly classified implementation files needed by the selected profile; and
7. reserve the target's conflict-free loopback Wiki URL through a serialized, atomically published shared-register transaction with live-listener preflight, install its project-unique static service marker and platform user-service adapter, default deployment to none, and validate the completed target against the pinned standard revision.

The rendered starter installs one shared agent contract in `AGENTS.md`, a root `CLAUDE.md` import for Claude Code, security/source/licensing boundaries, exact reader-to-source-row navigation when citations exist, canonical governing-question consistency when a question is declared, correct 2D and 3D graph mount hooks, and a project-status record that keeps active priorities separate from parked work. Seeded targets map the authoritative question and bounded reader sources; subject-empty targets omit that mapping and record the conditional requirement as not applicable. Standard Production instructions close every file-changing development turn with a disclosed JJ commit after verification and state inspection; there is no subjective “substantive work” threshold and no empty commit for a no-change turn. Next Steps are completion-first and capped at three; the contract forbids inventing adjacent work merely to fill the list.

The starter also declares `development_response_links: live-wiki`. Development responses navigate Human or LLM Wiki content only through verified absolute HTTP(S) routes at the target's configured canonical Human Wiki origin. File/editor URLs and clickable local or repository-relative paths do not substitute for Wiki navigation; a plain path may identify only a non-Wiki implementation artifact. Adapted Standard Production tooling includes `npm run response:links:check -- --base-url <canonical-url>` for captured drafts. An unavailable route is disclosed, and absolute interception of an uncaptured response remains dependent on a host-provided pre-send hook.

The consumer agent contract also preserves reusable improvements as tracked `standard-proposals/` records. Local validation is offline; generated payloads under `output/standard-proposals/` are disposable. The thin proposal CLI checks the governed form, labels, immutable payload digest, and marker before it may open the user's browser, but it never submits an issue or uploads a file. Intake, explicit Standard acceptance, immutable release inclusion, and optional consumer adoption remain separate authorised JJ phases; none silently changes the target's Standard pin or conformance claim.

The public human documentation is at <https://denchco.github.io/knowledge-base-wiki-documentation/>. The standard repository at <https://github.com/denchco/knowledge-base-wiki-standard> remains the sole normative authority.

Do not recursively copy the repository root. Do not publish the standard's reference pages as the target Wiki.

There is no apply command in this candidate. The templates define a deterministic content boundary, not a secretly incomplete runnable scaffold. Portable Core targets validate with the CLI and schemas from the pinned release. Standard Production additionally requires an implementation agent to supply and verify the complete consumer renderer, scripts, schemas, profiles, runtime assets, locks, CI, and provenance closure selected from that release. Standard-maintainer documentation-sync commands and `verify:workspace` stay out unless the consumer independently declares that capability. Reserved verification paths hold a verification-receipt-v1 artifact and the paired conformance report; project-only summaries use a different path.
