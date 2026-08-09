#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const assets = [
  {
    label: "Mermaid 11.16.1",
    source: "node_modules/mermaid/dist/mermaid.min.js",
    destination: "docs/assets/vendor/mermaid.min.js",
  },
  {
    label: "vis-network 10.1.0",
    source: "node_modules/vis-network/standalone/umd/vis-network.min.js",
    destination: "docs/assets/vendor/vis-network.min.js",
  },
  {
    label: "3d-force-graph 1.80.0",
    source: "node_modules/3d-force-graph/dist/3d-force-graph.min.js",
    destination: "docs/assets/vendor/3d-force-graph.min.js",
  },
];

for (const asset of assets) synchronize(asset);

function synchronize({ label, source, destination }) {
  const sourcePath = path.resolve(source);
  const destinationPath = path.resolve(destination);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Missing pinned ${label} runtime at ${source}. Run npm ci before building or serving the wiki.`);
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, "utf8").replace(
    /\n?\/\/[#@] sourceMappingURL=.*$/,
    "",
  );
  const output = `${content.replace(/\n$/, "")}\n`;
  const current = fs.existsSync(destinationPath) ? fs.readFileSync(destinationPath, "utf8") : "";

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  if (current !== output) {
    fs.writeFileSync(destinationPath, output, "utf8");
    console.log(`Synchronized pinned local ${label} runtime.`);
  } else {
    console.log(`Pinned local ${label} runtime is current.`);
  }
}
