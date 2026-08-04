#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CliUsageError,
  inspectProject,
  losslessExport,
  publicReport,
  reportText,
} from "./okf-core.mjs";
import {
  initPlan,
  lifecycleDiff,
  lifecycleText,
  upgradePlan,
} from "./conformance-lifecycle.mjs";

const HELP = `DenchCo Knowledge Base Wiki Standard conformance CLI

Usage:
  node scripts/conformance-cli.mjs inspect [target] [options]
  node scripts/conformance-cli.mjs validate [target] [options]
  node scripts/conformance-cli.mjs export-okf [target] [options]
  node scripts/conformance-cli.mjs diff [target] [options]
  node scripts/conformance-cli.mjs upgrade [target] --dry-run [options]
  node scripts/conformance-cli.mjs init [target] --dry-run [options]

Commands:
  inspect      Read a repository or bare OKF bundle and report its structure.
  validate     Run read-only OKF v0.2 and DenchCo manifest validation.
  export-okf   Emit a deterministic, lossless JSON rendition to stdout.
  diff         Compare a consumer declaration with this candidate and profile.
  upgrade      Emit a conservative review/patch plan; requires --dry-run.
  init         Emit a scaffold plan from the canonical prompt; requires --dry-run.

Options:
  --bundle <path>    Select an OKF bundle relative to the target (repeatable).
  --manifest <path>  Select a manifest relative to the target.
  --date <date>      Evaluate staleness on YYYY-MM-DD (repeatable reports).
  --json             Emit the machine-readable report or plan as JSON.
  --strict           Treat OKF guidance warnings as validation failures.
  --compact          Emit compact rather than indented JSON.
  --dry-run          Required safety gate for upgrade and init planning.
  --profile <id>     Select a candidate profile for diff/init planning.
  --title <text>     Supply the proposed project title to init planning.
  --topic <text>     Supply topic, audience, question, and outcome context.
  --standard-revision <revision>
                     Override the automatically resolved standard commit for init.
  --wiki-url <url>   Supply the consumer-owned canonical Wiki URL for init.
  --deployment <id> Supply the consumer's deployment adapter; none is valid.
  -h, --help         Show this help.

Exit codes:
  0  Inspection/planning completed, or validation/export passed.
  1  Validation failed, or a lifecycle result has blocking actions.
  2  Invalid command-line usage or an unexpected tool failure.

The CLI never modifies the target. export-okf writes only to stdout; redirect it
to a new artifact if desired. upgrade and init have no apply mode in this
candidate. Their dry-run plans preserve deviations and existing-file collisions.`;

function parseArguments(argv) {
  if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
    return { help: true };
  }
  const command = argv[0];
  if (!["inspect", "validate", "export-okf", "diff", "upgrade", "init"].includes(command)) {
    throw new CliUsageError(`Unknown command \`${command}\`.`);
  }
  const options = {
    command,
    target: ".",
    bundles: [],
    json: false,
    strict: false,
    compact: false,
    dryRun: false,
  };
  let targetSeen = false;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--strict") options.strict = true;
    else if (argument === "--compact") options.compact = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (["--bundle", "--manifest", "--date", "--profile", "--title", "--topic", "--standard-revision", "--wiki-url", "--deployment"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new CliUsageError(`${argument} requires a value.`);
      index += 1;
      if (argument === "--bundle") options.bundles.push(value);
      else if (argument === "--manifest") options.manifest = value;
      else if (argument === "--date") options.evaluationDate = value;
      else if (argument === "--profile") options.profile = value;
      else if (argument === "--title") options.title = value;
      else if (argument === "--topic") options.topic = value;
      else if (argument === "--standard-revision") options.standardRevision = value;
      else if (argument === "--wiki-url") options.wikiUrl = value;
      else options.deployment = value;
    } else if (argument.startsWith("-")) {
      throw new CliUsageError(`Unknown option \`${argument}\`.`);
    } else if (!targetSeen) {
      options.target = argument;
      targetSeen = true;
    } else {
      throw new CliUsageError(`Unexpected positional argument \`${argument}\`.`);
    }
  }
  return options;
}

function json(value, compact) {
  return JSON.stringify(value, null, compact ? 0 : 2);
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  if (options.command === "export-okf") {
    const { report, exportData } = losslessExport(options);
    if (!exportData) {
      process.stderr.write(`${json(publicReport(report), options.compact)}\n`);
      return 1;
    }
    process.stdout.write(`${json(exportData, options.compact)}\n`);
    return 0;
  }

  if (["diff", "upgrade", "init"].includes(options.command)) {
    const result = options.command === "diff"
      ? lifecycleDiff(options)
      : options.command === "upgrade"
        ? upgradePlan(options)
        : initPlan(options);
    if (options.json) process.stdout.write(`${json(result, options.compact)}\n`);
    else process.stdout.write(`${lifecycleText(result)}\n`);
    if (result.kind === "init-plan") return 0;
    return result.summary.blocking > 0 ? 1 : 0;
  }

  const report = inspectProject(options);
  if (options.json) process.stdout.write(`${json(publicReport(report), options.compact)}\n`);
  else process.stdout.write(`${reportText(report)}\n`);
  if (options.command === "inspect") return 0;
  return report.summary.strictFailure ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exitCode = run();
  } catch (error) {
    if (error instanceof CliUsageError) {
      process.stderr.write(`Usage error: ${error.message}\n\n${HELP}\n`);
    } else {
      process.stderr.write(`Conformance tool failed: ${error.stack ?? error.message}\n`);
    }
    process.exitCode = 2;
  }
}
