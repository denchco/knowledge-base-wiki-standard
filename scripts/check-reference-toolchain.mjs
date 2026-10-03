import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const run = (command, args) => execFileSync(command, args, {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
try {
  const expected = { node: readFileSync(".node-version", "utf8").trim(), npm: "11.19.0", uv: "0.12.10", python: readFileSync(".python-version", "utf8").trim() };
  const actual = {};
  const probes = {
    node: () => process.versions.node,
    npm: () => run("npm", ["--version"]),
    uv: () => {
      const output = run("uv", ["--version"]);
      const version = /^uv (\d+\.\d+\.\d+)(?:\s|$)/u.exec(output)?.[1];
      if (!version) throw new Error(`uv: cannot parse version output ${JSON.stringify(output)}`);
      return version;
    },
    python: () => run("uv", ["run", "--no-sync", "python", "-c", "import platform; print(platform.python_version())"]),
  };
  // Reject an unqualified resolver before it can execute the project interpreter.
  for (const key of Object.keys(expected)) {
    actual[key] = probes[key]();
    if (actual[key] !== expected[key]) throw new Error(`${key}: expected ${expected[key]}, found ${actual[key]}`);
  }
  console.log(`Reference toolchain passed: ${JSON.stringify(actual)}`);
} catch (error) {
  console.error(`Reference toolchain failed: ${error.message}`);
  process.exitCode = 1;
}
