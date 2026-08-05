import { spawnSync } from "node:child_process";

const messageIndex = process.argv.indexOf("-m");
const message = messageIndex >= 0 ? process.argv[messageIndex + 1] : "";
if (!message) {
  console.error('Usage: npm run jj:phase -- -m "Development-turn summary"');
  process.exit(2);
}

const verify = spawnSync("npm", ["run", "verify"], { stdio: "inherit" });
if (verify.error) {
  console.error(`Could not run verification: ${verify.error.message}`);
  process.exit(2);
}
const verifyStatus = verify.status ?? 1;

const gitStatus = spawnSync("git", ["status", "--short"], { stdio: "inherit" });
if (gitStatus.error || gitStatus.status !== 0) {
  console.error(`Could not inspect Git state${gitStatus.error ? `: ${gitStatus.error.message}` : "."}`);
  process.exit(gitStatus.status ?? 2);
}

const status = spawnSync("jj", ["status"], { encoding: "utf8" });
if (status.error || status.status !== 0) {
  console.error(`Could not inspect Jujutsu state${status.error ? `: ${status.error.message}` : "."}`);
  process.exit(status.status ?? 2);
}
process.stdout.write(status.stdout);
if (status.stdout.includes("The working copy has no changes")) {
  console.log("No development-turn JJ commit recorded: working copy is clean.");
  process.exit(verifyStatus);
}

const commitMessage = verifyStatus === 0
  ? message
  : `Verification failed (exit ${verifyStatus}): ${message}`;
const commit = spawnSync("jj", ["commit", "-m", commitMessage], { stdio: "inherit" });
if (commit.error || commit.status !== 0) {
  console.error(`Could not record the development-turn JJ commit${commit.error ? `: ${commit.error.message}` : "."}`);
  process.exit(commit.status ?? 2);
}
if (verifyStatus !== 0) {
  console.error(`Development-turn changes were committed with failed verification status ${verifyStatus}.`);
}
process.exit(verifyStatus);
