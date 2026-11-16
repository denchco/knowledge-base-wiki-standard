# Design validator source adaptation

This private package supplies the Standard's `design:lint` check. It retains the lint implementation from Google's `design.md` 0.4.0 release at commit `9bf8eae67128b6cc55ad9bf86665767deb4c11cd`. The copied source is under `upstream/`, with its Apache-2.0 licence and copyright notices. It includes the parser, model, all eleven default lint rules, spec configuration, Tailwind result and formatting helpers. The Standard does not expose the upstream export, diff or spec commands through this adapter.

The upstream npm artifact bundles Zod 3.25.76. A lockfile override cannot replace those embedded bytes. This adaptation builds the readable source with the exact Zod 4.6.6 dependency. It changes two source files for Zod 4 compatibility: record schemas declare string keys, and the spec configuration uses `prefault` to retain input-default parsing. The rule set and severities remain unchanged.

`upstream-provenance.json` records the exact source revision, original Git blobs, original SHA-256 hashes, local hashes and changes. The wrapper checks every retained source file and dependency pin before building. It rejects unrecorded source files. The generated module, spec configuration and build receipt go only to `.cache/design-validator/`. Each build receipt identifies its actual dependency versions and hashes every compiler input. The wrapper rejects Zod 3 inputs and any Zod version other than 4.6.6. No generated executable bundle is committed.

The original upstream package manifest is retained byte for byte as `upstream/packages/cli/package.json.upstream`. Its original path and hashes remain in the provenance record. This historical evidence is not an installable package manifest. The wrapper rejects any active `package.json` under `upstream/`. The local `tools/design-md/package.json` defines the adapter's exact dependencies.

`zod-4.6.6-inputs.json` pins the 95 Zod source files reached by this build. Each file was checked against the official npm archive after its SHA-512 matched the lockfile integrity value. The compiler receives these checked bytes. Stale implementation bytes fail even if a package metadata label still says 4.6.6.

Run the qualified repository commands:

```sh
npm run design:lint
node --test scripts/design-validator.test.mjs
node scripts/design-validator.mjs identity --json
```

The tests compare findings, summaries, resolved models and Tailwind results for all nine retained upstream fixtures against outputs captured from the published 0.4.0 bundle. Separate cases check invalid tokens, broken references, contrast warnings, section order, ignored token maps, spec defaults, source integrity and read-only CLI behaviour. Two-element array, map and set fixtures also check that Zod rejects an exceeded size limit before parsing child values. Matching controls confirm that it still validates children within the limit. Passing fixtures show bounded compatibility; they do not establish equivalence for every possible input.

The `identity` command rebuilds in memory and writes no files. Its portable JSON identifies the source, source hashes, lockfile hash, actual package versions and integrity values, compiler inputs and generated module hash. It reports implementation identity, not a fresh vulnerability audit.

To refresh this adaptation, obtain the upstream source at an exact commit. Review the licence and lint dependency closure. Apply and document the required compatibility changes. Update source hashes only after reviewing the changes. Capture differential fixture results, run the focused tests and complete the repository's full verification. A dependency version change requires qualification and must not bypass these checks.
