#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  approveProposal,
  createFixtureRemote,
  createGitHubRemote,
  findRecord,
  inspectAll,
  inspectRecord,
  linkIssue,
  loadRecordEntries,
  markSubmissionAmbiguous,
  newProposal,
  openProposal,
  prepareProposal,
  ProposalSafetyError,
  ProposalUsageError,
  recordAdoption,
  recordDecision,
  recordRelease,
  recordSubmissionObservation,
  renderIssuePayload,
  stableJson,
  syncCheck,
} from "./standard-proposal-core.mjs";

const HELP = `DenchCo consumer → Standard proposal workflow

Usage:
  npm run standard:proposal -- new <slug> [--implementation-revision <rev>]
  npm run standard:proposal -- check <id|slug>
  npm run standard:proposal -- check --all
  npm run standard:proposal -- prepare <id|slug>
  npm run standard:proposal -- show <id|slug>
  npm run standard:proposal -- open <id|slug> [--no-browser]
  npm run standard:proposal -- record <id|slug> --approve <sha256> --by <authority>
  npm run standard:proposal -- record <id|slug> --submission <ambiguous|submitted-unlinked>
  npm run standard:proposal -- record <id|slug> --issue <url>
  npm run standard:proposal -- record <id|slug> --decision <accepted|rejected|withdrawn> --classification <class> --decision-revision <commit> --evidence <text> --rationale <text> [--requirements <ids>]
  npm run standard:proposal -- record <id|slug> --release <tag> --release-revision <commit> --registry-revision <commit>
  npm run standard:proposal -- record <id|slug> --adopt --by <authority> --from-standard <commit> --to-standard <commit> --consumer-revision <commit> --verification <evidence>
  npm run standard:proposal -- sync --check

Options:
  --root <path>            Select the consumer repository root.
  --json                   Emit machine-readable output.
  --at <ISO timestamp>     Deterministic record timestamp (primarily fixtures).
  --remote-fixture <path>  Use an offline read-only GitHub fixture.
  --no-browser             Print the governed form URL without opening it.
  -h, --help               Show help.

check, show, and sync --check are read-only. prepare writes only the tracked
payload digest and an ignored deterministic payload. record changes only the
tracked proposal. open performs GET-only checks and leaves final submission to
the user; no command submits or edits a remote issue.`;

function parseArguments(argv) {
  if (!argv.length || argv.includes("-h") || argv.includes("--help")) return { help: true };
  const command = argv[0];
  if (!["new", "check", "prepare", "show", "open", "record", "sync"].includes(command)) {
    throw new ProposalUsageError(`Unknown proposal command ${JSON.stringify(command)}.`);
  }
  const options = {
    command,
    root: ".",
    json: false,
    all: false,
    syncCheck: false,
    noBrowser: false,
    requirements: [],
    verification: [],
  };
  let selectorSeen = false;
  const valueOptions = new Set([
    "--root", "--at", "--remote-fixture", "--implementation-revision", "--approve", "--by", "--issue", "--submission",
    "--decision", "--classification", "--decision-revision", "--evidence", "--rationale", "--requirements",
    "--release", "--release-revision", "--registry-revision", "--from-standard", "--to-standard",
    "--consumer-revision", "--verification",
  ]);
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--all") options.all = true;
    else if (argument === "--check") options.syncCheck = true;
    else if (argument === "--no-browser") options.noBrowser = true;
    else if (argument === "--ambiguous") options.ambiguous = true;
    else if (argument === "--adopt") options.adopt = true;
    else if (valueOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new ProposalUsageError(`${argument} requires a value.`);
      index += 1;
      const key = {
        "--root": "root",
        "--at": "at",
        "--remote-fixture": "remoteFixture",
        "--implementation-revision": "implementationRevision",
        "--approve": "approve",
        "--by": "authority",
        "--issue": "issue",
        "--submission": "submission",
        "--decision": "decision",
        "--classification": "classification",
        "--decision-revision": "decisionRevision",
        "--evidence": "evidence",
        "--rationale": "rationale",
        "--release": "release",
        "--release-revision": "releaseRevision",
        "--registry-revision": "registryRevision",
        "--from-standard": "fromStandardRevision",
        "--to-standard": "toStandardRevision",
        "--consumer-revision": "consumerRevision",
      }[argument];
      if (argument === "--requirements") options.requirements.push(...value.split(",").map((item) => item.trim()).filter(Boolean));
      else if (argument === "--verification") options.verification.push(value);
      else options[key] = value;
    } else if (argument.startsWith("-")) {
      throw new ProposalUsageError(`Unsupported option ${argument}.`);
    } else if (!selectorSeen) {
      options.selector = argument;
      selectorSeen = true;
    } else {
      throw new ProposalUsageError(`Unexpected positional argument ${argument}.`);
    }
  }
  options.root = path.resolve(options.root);
  options.now = options.at ? new Date(options.at) : new Date();
  if (Number.isNaN(options.now.valueOf())) throw new ProposalUsageError("--at must be an ISO timestamp.");
  return options;
}

function remoteFor(options) {
  return options.remoteFixture
    ? createFixtureRemote(path.resolve(options.remoteFixture))
    : createGitHubRemote();
}

function emit(value, options, text) {
  if (options.json) process.stdout.write(stableJson(value));
  else process.stdout.write(`${text}\n`);
}

function requireSelector(options) {
  if (!options.selector) throw new ProposalUsageError(`${options.command} requires a proposal ID or slug.`);
}

function compactCheck(value) {
  return {
    status: value.status,
    readOnly: value.readOnly,
    writesPerformed: value.writesPerformed,
    records: value.records.map((result) => result.record.id),
    registryChecked: value.registry !== null,
    diagnostics: value.diagnostics,
  };
}

export async function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  if (options.command === "new") {
    requireSelector(options);
    const result = newProposal({ root: options.root, slug: options.selector, implementationRevision: options.implementationRevision, now: options.now });
    emit({ id: result.record.id, path: path.relative(options.root, result.file) }, options, `Created tracked proposal ${result.record.id} at ${path.relative(options.root, result.file)}.`);
    return 0;
  }

  if (options.command === "check") {
    if (options.all) {
      const result = inspectAll({ root: options.root });
      emit(
        compactCheck(result),
        options,
        `Proposal records ${result.status}: ${result.records.length} checked, registry ${result.registry ? "checked" : "absent"}, ${result.diagnostics.length} diagnostic(s).`,
      );
      return result.status === "valid" ? 0 : 1;
    }
    requireSelector(options);
    const entry = findRecord(options.root, options.selector);
    const entries = loadRecordEntries(options.root);
    const result = inspectRecord(entry.record, { root: options.root, file: entry.file, allRecords: entries });
    const errors = result.diagnostics.filter((item) => item.severity === "error");
    emit({ id: entry.record.id, readOnly: true, writesPerformed: false, status: errors.length ? "invalid" : "valid", diagnostics: result.diagnostics }, options, `Proposal ${entry.record.id} ${errors.length ? "INVALID" : "VALID"}: ${result.diagnostics.length} diagnostic(s).`);
    return errors.length ? 1 : 0;
  }

  if (options.command === "prepare") {
    requireSelector(options);
    const result = prepareProposal({ root: options.root, selector: options.selector, now: options.now });
    emit({ id: result.record.id, digest: result.payload.digest, formSha256: result.payload.formSha256, record: path.relative(options.root, result.file), payload: path.relative(options.root, result.outputFile) }, options, `Prepared ${result.record.id}: ${result.payload.digest}\nForm SHA-256: ${result.payload.formSha256}\nPayload: ${path.relative(options.root, result.outputFile)}`);
    return 0;
  }

  if (options.command === "show") {
    requireSelector(options);
    const entry = findRecord(options.root, options.selector);
    const inspected = inspectRecord(entry.record, { root: options.root, file: entry.file, allRecords: loadRecordEntries(options.root) });
    const errors = inspected.diagnostics.filter((item) => item.severity === "error");
    if (errors.length) {
      const error = new ProposalSafetyError(errors[0].code, `Show refused:\n${errors.map((item) => `- ${item.code}: ${item.message}`).join("\n")}`);
      error.diagnostics = errors;
      throw error;
    }
    const record = entry.record;
    const rendered = inspected.payload ?? renderIssuePayload(record);
    const value = {
      readOnly: true,
      writesPerformed: false,
      id: record.id,
      repository: rendered.payload.repository,
      title: rendered.payload.title,
      labels: rendered.payload.labels,
      body: rendered.payload.body,
      formSha256: rendered.formSha256,
      sha256: rendered.digest,
      approval: record.workflow.approval.status,
      issue: record.workflow.issue.status,
      decision: record.workflow.upstream.decision,
      release: record.workflow.release.status,
      adoption: record.workflow.adoption.status,
    };
    emit(value, options, `Repository: ${value.repository}\nTitle: ${value.title}\nLabels: ${value.labels.join(", ")}\nForm SHA-256: ${value.formSha256}\nPayload SHA-256: ${value.sha256}\n\n${value.body}`);
    return 0;
  }

  if (options.command === "open") {
    requireSelector(options);
    const result = await openProposal({ root: options.root, selector: options.selector, remote: remoteFor(options) });
    const value = {
      status: result.status,
      readOnly: true,
      writesPerformed: false,
      repository: result.payload.payload.repository,
      title: result.payload.payload.title,
      labels: result.payload.payload.labels,
      body: result.payload.payload.body,
      formSha256: result.payload.formSha256,
      sha256: result.payload.digest,
      url: result.url,
      issue: result.issue?.html_url ?? null,
      possibleTitleDuplicates: result.titleMatches.map((item) => item.html_url),
    };
    emit(value, options, result.status === "reconcile-existing"
      ? `Existing marker match: ${value.issue}\nDo not submit another issue; record this URL instead.`
      : `Repository: ${value.repository}\nTitle: ${value.title}\nLabels: ${value.labels.join(", ")}\nForm SHA-256: ${value.formSha256}\nPayload SHA-256: ${value.sha256}\n\n${value.body}\nGoverned form: ${value.url}`);
    if (result.status === "ready-for-user-submission" && !options.noBrowser) openBrowser(result.url);
    return result.status === "reconcile-existing" ? 1 : 0;
  }

  if (options.command === "record") {
    requireSelector(options);
    const actions = [Boolean(options.approve), Boolean(options.ambiguous), Boolean(options.submission), Boolean(options.issue), Boolean(options.decision), Boolean(options.release), Boolean(options.adopt)].filter(Boolean).length;
    if (actions !== 1) throw new ProposalUsageError("record requires exactly one state-changing action.");
    let result;
    if (options.approve) result = approveProposal({ root: options.root, selector: options.selector, digest: options.approve, authority: options.authority, now: options.now });
    else if (options.ambiguous) result = markSubmissionAmbiguous({ root: options.root, selector: options.selector, now: options.now });
    else if (options.submission) result = recordSubmissionObservation({ root: options.root, selector: options.selector, status: options.submission === "ambiguous" ? "submission-ambiguous" : options.submission, now: options.now });
    else if (options.issue) result = await linkIssue({ root: options.root, selector: options.selector, issueUrl: options.issue, remote: remoteFor(options), now: options.now });
    else if (options.decision) result = recordDecision({ root: options.root, selector: options.selector, decision: options.decision, classification: options.classification, decisionRevision: options.decisionRevision, evidence: options.evidence, rationale: options.rationale, requirementIds: options.requirements, now: options.now });
    else if (options.release) result = await recordRelease({ root: options.root, selector: options.selector, tag: options.release, revision: options.releaseRevision, registryRevision: options.registryRevision, remote: remoteFor(options), now: options.now });
    else result = recordAdoption({ root: options.root, selector: options.selector, authority: options.authority, fromStandardRevision: options.fromStandardRevision, toStandardRevision: options.toStandardRevision, consumerRevision: options.consumerRevision, verification: options.verification, now: options.now });
    emit({ id: result.record.id, record: path.relative(options.root, result.file), workflow: result.record.workflow }, options, `Recorded proposal state for ${result.record.id} in ${path.relative(options.root, result.file)}.`);
    return 0;
  }

  if (!options.syncCheck) throw new ProposalUsageError("sync is read-only in workflow v1 and requires --check.");
  const result = await syncCheck({ root: options.root, remote: remoteFor(options) });
  emit(result, options, `Proposal synchronization ${result.status.toUpperCase()}: ${result.records} record(s), ${result.diagnostics.length} diagnostic(s), no writes.`);
  return result.status === "current" ? 0 : 1;
}

function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    execFileSync(command, args, { stdio: "ignore" });
  } catch (error) {
    throw new ProposalSafetyError("DKBWS-PROP-BROWSER-001", `Could not open the governed form: ${error.message}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exitCode = await run();
  } catch (error) {
    const code = error.code ?? "DKBWS-PROP-UNEXPECTED-001";
    const message = error.stack && !(error instanceof ProposalUsageError || error instanceof ProposalSafetyError)
      ? error.stack
      : error.message;
    if (process.argv.slice(2).includes("--json")) {
      process.stderr.write(stableJson({
        status: "error",
        code,
        message,
        ...(error.details ? { payload: error.details } : {}),
        ...(error.diagnostics ? { diagnostics: error.diagnostics } : {}),
      }));
    } else {
      process.stderr.write(`${code}: ${message}\n`);
      if (error.details) {
        process.stderr.write([
          `Repository: ${error.details.repository}`,
          `Title: ${error.details.title}`,
          `Labels: ${error.details.labels.join(", ")}`,
          `Form SHA-256: ${error.details.formSha256}`,
          `Payload SHA-256: ${error.details.sha256}`,
          "",
          error.details.body,
          "",
        ].join("\n"));
      }
    }
    process.exitCode = error instanceof ProposalUsageError ? 2 : 1;
  }
}
