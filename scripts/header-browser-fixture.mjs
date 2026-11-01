import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { patchZensicalRuntime } from "./patch-zensical-runtime.mjs";

// Fresh generic content keeps browser evidence independent of any consumer's
// subject, private source files, hostname or deployment configuration.
export function buildHeaderFixture({ root, output, name, config = null }) {
  const directory = path.join(output, name);
  fs.rmSync(directory, { recursive: true, force: true });
  const docs = path.join(directory, "docs"), assets = path.join(docs, "assets");
  fs.mkdirSync(assets, { recursive: true });
  for (const file of ["theme.css", "content.css", "layout-width.css", "wiki.js", "layout-width.js"]) {
    fs.copyFileSync(path.join(root, "docs/assets", file), path.join(assets, file));
  }
  fs.writeFileSync(path.join(assets, "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><title>Wiki</title><path fill="#808080" d="M4 5h7l6 22 6-16h6l6 16 6-22h7l-10 30h-7l-5-15-5 15h-7z"/></svg>\n');
  fs.writeFileSync(path.join(docs, "index.md"), '# Wiki header reference\n\nThis generic page verifies the shared header controls. [Read the architecture page](second.md).\n\n## Reader choices\n\nSearch, page width and appearance remain available through their native controls.\n');
  fs.writeFileSync(path.join(docs, "second.md"), '# Architecture\n\nThis independent page tests navigation and saved reader choices. [Return to the reference](index.md).\n');
  fs.cpSync(path.join(root, "overrides"), path.join(directory, "overrides"), { recursive: true });
  const toml = `[project]\nsite_name = "Wiki header reference"\nsite_url = "http://127.0.0.1/"\ndocs_dir = "docs"\nsite_dir = "site"\nextra_css = ["assets/content.css", "assets/layout-width.css", "assets/theme.css"]\nextra_javascript = ["assets/wiki.js", "assets/layout-width.js"]\nnav = [{"Pages" = [{"Reference" = "index.md"}, {"Architecture" = "second.md"}]}]\n\n[project.theme]\ncustom_dir = "overrides"\nfont = false\nlogo = "assets/logo.svg"\nfavicon = "assets/logo.svg"\nfeatures = ["navigation.instant"]\n\n[[project.theme.palette]]\nscheme = "default"\nprimary = "custom"\naccent = "custom"\ntoggle.icon = "lucide/moon"\ntoggle.name = "Switch to dark mode"\n\n[[project.theme.palette]]\nscheme = "slate"\nprimary = "custom"\naccent = "custom"\ntoggle.icon = "lucide/sun"\ntoggle.name = "Switch to light mode"\n`;
  fs.writeFileSync(path.join(directory, "zensical.toml"), toml);
  if (config) {
    fs.mkdirSync(path.join(directory, "config"), { recursive: true });
    fs.writeFileSync(path.join(directory, "config/wiki-appearance.json"), `${JSON.stringify(config, null, 2)}\n`);
  }
  execFileSync(process.execPath, [path.join(root, "scripts/prepare-wiki-appearance.mjs")], { cwd: directory, stdio: "pipe" });
  try {
    execFileSync("uv", ["run", "--no-sync", "zensical", "build", "-f", path.join(directory, "zensical.appearance.toml"), "--strict"], { cwd: directory, stdio: "pipe", timeout: 60000 });
  } catch (error) {
    throw new Error(`Header fixture ${name} failed to build: ${error.stderr?.toString() || error.message}`);
  }
  const site = path.join(directory, "site");
  patchZensicalRuntime(site);
  return site;
}
