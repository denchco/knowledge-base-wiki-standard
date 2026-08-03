import { spawnSync } from "node:child_process";

const messageIndex = process.argv.indexOf("-m");
const message = messageIndex >= 0 ? process.argv[messageIndex + 1] : "";
if (!message) {
  console.error('Usage: npm run jj:phase -- -m "Validated phase summary"');
  process.exit(2);
}

const verify = spawnSync("npm", ["run", "verify"], { stdio: "inherit" });
if (verify.status !== 0) process.exit(verify.status ?? 1);
const status = spawnSync("jj", ["status"], { encoding: "utf8" });
if (status.status !== 0) process.exit(status.status ?? 1);
if (status.stdout.includes("The working copy has no changes")) {
  console.log("No JJ phase recorded: working copy is clean.");
  process.exit(0);
}
const commit = spawnSync("jj", ["commit", "-m", message], { stdio: "inherit" });
process.exit(commit.status ?? 1);
