// DenchCo lint-only adapter. Upstream source and its Apache-2.0 notices are retained below.
export { lint } from './upstream/packages/cli/src/linter/lint.js';
export { DEFAULT_RULE_DESCRIPTORS } from './upstream/packages/cli/src/linter/linter/rules/index.js';
export { loadSpecConfig } from './upstream/packages/cli/src/linter/spec-config.js';
export { readInput, formatOutput, FileReadError } from './upstream/packages/cli/src/utils.js';
