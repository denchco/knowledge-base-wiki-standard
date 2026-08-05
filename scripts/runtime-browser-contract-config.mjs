import fs from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { loadProfile } from "./profile-catalogue.mjs";

const LOCAL_ORIGIN = "https://runtime-contract.invalid";

const routeEnvironment = {
  question: "DKBWS_BROWSER_QUESTION_ROUTE",
  mermaid: "DKBWS_BROWSER_MERMAID_ROUTE",
  architecture: "DKBWS_BROWSER_ARCHITECTURE_ROUTE",
  table: "DKBWS_BROWSER_TABLE_ROUTE",
  list: "DKBWS_BROWSER_LIST_ROUTE",
  sourceLinks: "DKBWS_BROWSER_SOURCE_LINKS_ROUTE",
  graph2d: "DKBWS_BROWSER_GRAPH_2D_ROUTE",
  graph3d: "DKBWS_BROWSER_GRAPH_3D_ROUTE",
};

export function normalizeBrowserRoute(value, label = "browser route") {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty local URL path.`);
  }
  if (value !== value.trim() || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    throw new Error(`${label} must be an absolute local URL path without surrounding whitespace.`);
  }

  const parsed = new URL(value, LOCAL_ORIGIN);
  if (parsed.origin !== LOCAL_ORIGIN || parsed.search || parsed.hash) {
    throw new Error(`${label} must not include an origin, query, or fragment.`);
  }
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new Error(`${label} contains invalid percent encoding.`);
  }
  if (decoded.split("/").some(segment => segment === "." || segment === "..")) {
    throw new Error(`${label} must not contain traversal segments.`);
  }
  return parsed.pathname === "/" || parsed.pathname.endsWith("/")
    ? parsed.pathname
    : `${parsed.pathname}/`;
}

export function siteFileForRoute(root, route) {
  const normalized = normalizeBrowserRoute(route);
  const segments = normalized.split("/").filter(Boolean);
  return path.join(root, "site", ...segments, "index.html");
}

function routeFromMarkdownPath(markdownPath) {
  if (typeof markdownPath !== "string" || !markdownPath.startsWith("docs/") || !markdownPath.endsWith(".md")) {
    return "/";
  }
  const withoutPrefix = markdownPath.slice("docs/".length, -".md".length);
  const routePath = withoutPrefix === "index"
    ? ""
    : withoutPrefix.endsWith("/index")
      ? withoutPrefix.slice(0, -"/index".length)
      : withoutPrefix;
  return normalizeBrowserRoute(`/${routePath}`);
}

function localSourcePath(root, candidate, label) {
  if (typeof candidate !== "string" || candidate.trim() === "" || path.isAbsolute(candidate) || candidate.includes("\\")) {
    throw new Error(`${label} must be a repository-relative Markdown path.`);
  }
  const resolved = path.resolve(root, candidate);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.statSync(resolved, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`${label} is missing or escapes the repository: ${candidate}`);
  }
  return candidate.split(path.sep).join("/");
}

function inferMarkdownSource(root, route, preferred, label) {
  const candidates = [];
  if (preferred) candidates.push(preferred);
  const segments = normalizeBrowserRoute(route).split("/").filter(Boolean);
  if (segments.length === 0) {
    candidates.push("docs/index.md");
  } else {
    candidates.push(`docs/${segments.join("/")}.md`, `docs/${segments.join("/")}/index.md`);
  }
  const source = [...new Set(candidates)].find(candidate => (
    typeof candidate === "string" && fs.statSync(path.resolve(root, candidate), { throwIfNoEntry: false })?.isFile()
  ));
  if (!source) {
    throw new Error(`${label} could not be inferred for route ${route}; set its DKBWS_BROWSER_*_SOURCE override.`);
  }
  return localSourcePath(root, source, label);
}

function selectedCapability(value) {
  return value !== undefined && value !== null && value !== false && value !== "false" && value !== "not-selected";
}

export function resolveRuntimeBrowserConfiguration(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const env = options.env ?? process.env;
  const manifestPath = path.join(root, ".wiki-standard.yaml");
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest || typeof manifest !== "object" || typeof manifest.profile !== "string") {
    throw new Error(".wiki-standard.yaml must select a profile before browser verification.");
  }
  const profile = loadProfile(manifest.profile, { standardRoot: root });
  const humanWikiRoute = routeFromMarkdownPath(manifest.roles?.human_wiki);

  const configuredRoute = (name, fallback) => normalizeBrowserRoute(
    env[routeEnvironment[name]] ?? fallback,
    routeEnvironment[name],
  );
  const question = configuredRoute("question", humanWikiRoute);
  const mermaid = configuredRoute("mermaid", question);
  const architectureDefault = fs.existsSync(siteFileForRoute(root, "/architecture/")) ? "/architecture/" : mermaid;
  const tableDefault = fs.existsSync(siteFileForRoute(root, "/spec/requirements/")) ? "/spec/requirements/" : question;
  const sourceLinksDefault = fs.existsSync(siteFileForRoute(root, "/evidence-matrix/")) ? "/evidence-matrix/" : question;
  const sourceRegister = routeFromMarkdownPath(manifest.roles?.source_register);
  const routes = {
    question,
    mermaid,
    architecture: configuredRoute("architecture", architectureDefault),
    table: configuredRoute("table", tableDefault),
    list: configuredRoute("list", question),
    sourceLinks: configuredRoute("sourceLinks", sourceLinksDefault),
    sourceRegister,
    graph2d: configuredRoute("graph2d", "/graph/two-dimensional/"),
    graph3d: configuredRoute("graph3d", "/graph/three-dimensional/"),
  };

  const sourceLinksRequired = profile.requirements.includes("DKBWS-LINK-002")
    && !(manifest.deviations ?? []).some(deviation => (
      deviation?.requirement === "DKBWS-LINK-002" && deviation?.status === "not-applicable"
    ));
  if (sourceLinksRequired && (
    typeof manifest.roles?.source_register !== "string"
    || !manifest.roles.source_register.endsWith(".md")
  )) {
    throw new Error("DKBWS-LINK-002 requires a mapped roles.source_register Markdown path.");
  }
  const requiredRoutes = ["question", "mermaid", "architecture", "table", "list"];
  if (sourceLinksRequired) requiredRoutes.push("sourceLinks", "sourceRegister");
  for (const name of requiredRoutes) {
    if (!fs.existsSync(siteFileForRoute(root, routes[name]))) {
      throw new Error(`Runtime browser contract ${name} route is missing from the built site: ${routes[name]}`);
    }
  }

  const profileRequiresGraph = profile.requirements.includes("DKBWS-GRAPH-001")
    || profile.capabilities.graphify === "required";
  const manifestSelectsGraph = selectedCapability(manifest.capabilities?.graphify);
  const graphRequired = profileRequiresGraph || manifestSelectsGraph;
  if (graphRequired) {
    for (const name of ["graph2d", "graph3d"]) {
      if (!fs.existsSync(siteFileForRoute(root, routes[name]))) {
        throw new Error(
          `DKBWS-GRAPH-001 is selected by profile/manifest, but the required ${name === "graph2d" ? "2D" : "3D"} Graphify route is missing: ${routes[name]}`,
        );
      }
    }
  }

  const roleSource = manifest.roles?.human_wiki;
  const roleRoute = routeFromMarkdownPath(roleSource);
  const sources = {
    mermaid: inferMarkdownSource(
      root,
      routes.mermaid,
      env.DKBWS_BROWSER_MERMAID_SOURCE ?? (routes.mermaid === roleRoute ? roleSource : undefined),
      "DKBWS_BROWSER_MERMAID_SOURCE",
    ),
    architecture: inferMarkdownSource(
      root,
      routes.architecture,
      env.DKBWS_BROWSER_ARCHITECTURE_SOURCE,
      "DKBWS_BROWSER_ARCHITECTURE_SOURCE",
    ),
  };

  return {
    root,
    profileId: profile.id,
    routes,
    sources,
    graph: {
      required: graphRequired,
      selectedByProfile: profileRequiresGraph,
      selectedByManifest: manifestSelectsGraph,
    },
    sourceLinks: {
      required: sourceLinksRequired,
    },
  };
}
