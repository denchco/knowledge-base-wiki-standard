#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { resolveStandardStack, checkWikiStack, StackResolutionError } from "./standard-stack.mjs";

const HELP = `Read-only immutable Standard stack evidence

  npm run standard:stack -- resolve [--source https://github.com/owner/repository] [--json]
  npm run standard:stack -- check <wiki> [--json]

Selects the newest published immutable semantic release, including prereleases,
then requires its exact-commit push/main Verify evidence. Reports dated release
qualification, not current vulnerability clearance. Never installs, pins or migrates.
Checks compare the declared installed pin; local file integrity and conformance are not checked.
`;

export async function run(argv, { resolve = resolveStandardStack, check = checkWikiStack, stdout = text => process.stdout.write(text), stderr = text => process.stderr.write(text) } = {}) {
  const json = argv.includes("--json");
  try {
    if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) { stdout(HELP); return 0; }
    const [command, ...args] = argv;
    if (!["resolve", "check"].includes(command)) throw new StackResolutionError("STACK-USAGE", HELP);
    const options = {}, positional = [];
    let seenJson = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--json" && !seenJson) seenJson = true;
      else if (args[i] === "--source" && command === "resolve" && options.source === undefined && args[i + 1] && !args[i + 1].startsWith("--")) options.source = args[++i];
      else if (args[i].startsWith("-")) throw new StackResolutionError("STACK-USAGE", "Unknown or repeated stack option.");
      else positional.push(args[i]);
    }
    if (positional.length !== (command === "check" ? 1 : 0)) throw new StackResolutionError("STACK-USAGE", "check requires exactly one Wiki path; resolve takes no path.");
    const report = command === "resolve" ? await resolve(options) : await check(positional[0], options);
    stdout(json ? JSON.stringify(report, null, 2) + "\n" : `${report.stack.tag} · ${report.stack.revision}\n${report.source}\n${report.operation === "check" ? `Declared installed pin: ${report.relation}. Local file integrity and conformance not checked. ` : ""}Dated release verification only; current vulnerabilities not checked. No writes performed.\n`);
    return 0;
  } catch (error) {
    const failure = { error: { code: error instanceof StackResolutionError ? error.code : "STACK-ERROR", message: error instanceof StackResolutionError ? error.message : "Stack evidence could not be resolved." }, readOnly: true, writesPerformed: false };
    (json ? stdout : stderr)(json ? JSON.stringify(failure, null, 2) + "\n" : `${failure.error.code}: ${failure.error.message}\n`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await run(process.argv.slice(2));
