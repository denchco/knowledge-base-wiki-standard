import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";

import { parseDocument } from "yaml";

const PROFILE_ID = /^[a-z0-9][a-z0-9-]*$/;
const REQUIREMENT_ID = /^DKBWS-[A-Z]+-[0-9]{3}$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class ProfileLoadError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "ProfileLoadError";
    this.code = code;
    this.profileId = options.profileId;
    this.filePath = options.filePath;
    this.field = options.field;
  }
}

function fail(code, message, options) {
  throw new ProfileLoadError(code, message, options);
}

function readProfileYaml(profileId, profilePath, relativePath, readSource) {
  let source;
  try {
    if (readSource) {
      source = readSource(relativePath);
      if (typeof source !== "string") throw new Error("profile source reader did not return text");
    } else {
      const stat = lstatSync(profilePath);
      if (!stat.isFile()) {
        fail("DKBWS-PROFILE-FILE-001", `Profile \`${profileId}\` is not a regular file.`, {
          profileId,
          filePath: profilePath,
        });
      }
      source = readFileSync(profilePath, "utf8");
    }
  } catch (error) {
    if (error instanceof ProfileLoadError) throw error;
    fail("DKBWS-PROFILE-MISSING-001", `Profile \`${profileId}\` is not present in the standard catalogue.`, {
      profileId,
      filePath: profilePath,
    });
  }

  const document = parseDocument(source, {
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length) {
    fail("DKBWS-PROFILE-YAML-001", `Profile \`${profileId}\` is not valid YAML.`, {
      profileId,
      filePath: profilePath,
    });
  }

  let data;
  try {
    data = document.toJS({ maxAliasCount: 100 });
  } catch {
    fail("DKBWS-PROFILE-YAML-002", `Profile \`${profileId}\` cannot be safely materialised.`, {
      profileId,
      filePath: profilePath,
    });
  }
  if (!isPlainObject(data)) {
    fail("DKBWS-PROFILE-ROOT-001", `Profile \`${profileId}\` must contain a YAML mapping.`, {
      profileId,
      filePath: profilePath,
    });
  }
  return { source, data };
}

function validateStringList(value, field, profileId, profilePath, pattern, code) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !pattern.test(entry))) {
    fail(code, `Profile \`${profileId}\` field \`${field}\` contains an invalid identifier.`, {
      profileId,
      filePath: profilePath,
      field,
    });
  }
  if (new Set(value).size !== value.length) {
    fail(code, `Profile \`${profileId}\` field \`${field}\` contains duplicate identifiers.`, {
      profileId,
      filePath: profilePath,
      field,
    });
  }
  return value;
}

function validateProfileShape(profileId, profilePath, data) {
  if (data.id !== profileId) {
    fail("DKBWS-PROFILE-ID-002", `Profile file \`${profileId}.yaml\` must declare \`id: ${profileId}\`.`, {
      profileId,
      filePath: profilePath,
      field: "id",
    });
  }
  if (typeof data.version !== "string" || data.version.trim() === "") {
    fail("DKBWS-PROFILE-VERSION-001", `Profile \`${profileId}\` must declare a non-empty string version.`, {
      profileId,
      filePath: profilePath,
      field: "version",
    });
  }
  const parents = validateStringList(
    data.extends,
    "extends",
    profileId,
    profilePath,
    PROFILE_ID,
    "DKBWS-PROFILE-EXTENDS-001",
  );
  const requirements = validateStringList(
    data.requires,
    "requires",
    profileId,
    profilePath,
    REQUIREMENT_ID,
    "DKBWS-PROFILE-REQUIRES-001",
  );
  if (!isPlainObject(data.capabilities)) {
    fail("DKBWS-PROFILE-CAPABILITIES-001", `Profile \`${profileId}\` field \`capabilities\` must be a mapping.`, {
      profileId,
      filePath: profilePath,
      field: "capabilities",
    });
  }
  return { parents, requirements, capabilities: data.capabilities };
}

export function loadProfile(profileId, options = {}) {
  const standardRoot = path.resolve(options.standardRoot ?? ".");
  const readSource = typeof options.readSource === "function" ? options.readSource : null;
  if (typeof profileId !== "string" || !PROFILE_ID.test(profileId)) {
    fail("DKBWS-PROFILE-ID-001", `Invalid profile id \`${String(profileId)}\`.`, {
      profileId,
      field: "profile",
    });
  }

  const cache = new Map();
  const visiting = [];
  const visit = (currentId) => {
    if (cache.has(currentId)) return cache.get(currentId);
    const cycleStart = visiting.indexOf(currentId);
    if (cycleStart !== -1) {
      const cycle = [...visiting.slice(cycleStart), currentId].join(" -> ");
      fail("DKBWS-PROFILE-CYCLE-001", `Profile inheritance cycle detected: ${cycle}.`, {
        profileId: currentId,
        filePath: path.join(standardRoot, "profiles", `${currentId}.yaml`),
        field: "extends",
      });
    }

    const relativeProfilePath = `profiles/${currentId}.yaml`;
    const profilePath = path.join(standardRoot, ...relativeProfilePath.split("/"));
    const parsed = readProfileYaml(currentId, profilePath, relativeProfilePath, readSource);
    const shape = validateProfileShape(currentId, profilePath, parsed.data);
    visiting.push(currentId);
    let inherited;
    try {
      inherited = shape.parents.map((parentId) => visit(parentId));
    } finally {
      visiting.pop();
    }

    const requirements = [];
    const capabilities = {};
    const sourceIndex = new Map();
    for (const parent of inherited) {
      for (const requirement of parent.requirements) {
        if (!requirements.includes(requirement)) requirements.push(requirement);
      }
      Object.assign(capabilities, parent.capabilities);
      for (const source of parent.sources) sourceIndex.set(source.path, source);
    }
    for (const requirement of shape.requirements) {
      if (!requirements.includes(requirement)) requirements.push(requirement);
    }
    Object.assign(capabilities, shape.capabilities);
    const source = {
      path: relativeProfilePath,
      sha256: sha256(parsed.source),
    };
    sourceIndex.set(source.path, source);

    if (options.requirementIds) {
      const unknown = requirements.find((requirement) => !options.requirementIds.has(requirement));
      if (unknown) {
        fail("DKBWS-PROFILE-REQUIREMENT-UNKNOWN-001", `Profile \`${currentId}\` references requirement \`${unknown}\`, which is absent from the canonical catalogue.`, {
          profileId: currentId,
          filePath: profilePath,
          field: "requires",
        });
      }
    }

    const result = {
      id: currentId,
      version: parsed.data.version,
      requirements,
      capabilities,
      sources: [...sourceIndex.values()],
    };
    cache.set(currentId, result);
    return result;
  };

  return visit(profileId);
}

export function listProfileIds(options = {}) {
  const standardRoot = path.resolve(options.standardRoot ?? ".");
  const profilesRoot = path.join(standardRoot, "profiles");
  let entries;
  try {
    entries = readdirSync(profilesRoot, { withFileTypes: true });
  } catch {
    fail("DKBWS-PROFILE-DIRECTORY-001", "The standard profile directory is missing or unreadable.", {
      filePath: profilesRoot,
    });
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name.slice(0, -5))
    .sort();
}

export function loadRequirementCatalogue(options = {}) {
  const standardRoot = path.resolve(options.standardRoot ?? ".");
  const relativeRequirementPath = "docs/spec/requirements.md";
  const requirementPath = path.join(standardRoot, ...relativeRequirementPath.split("/"));
  const readSource = typeof options.readSource === "function" ? options.readSource : null;
  let source;
  try {
    source = readSource ? readSource(relativeRequirementPath) : readFileSync(requirementPath, "utf8");
    if (typeof source !== "string") throw new Error("requirement source reader did not return text");
  } catch {
    fail("DKBWS-CATALOGUE-MISSING-001", "The canonical requirement catalogue is missing or unreadable.", {
      filePath: requirementPath,
    });
  }
  const rows = [...source.matchAll(/^\|\s*(DKBWS-[A-Z]+-[0-9]{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)]
    .map((match) => ({
      id: match[1],
      requirement: match[2].trim(),
      applicability: match[3].trim(),
      verification: match[4].trim(),
    }));
  if (rows.length === 0) {
    fail("DKBWS-CATALOGUE-EMPTY-001", "The canonical requirement catalogue contains no requirement rows.", {
      filePath: requirementPath,
    });
  }
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) {
    fail("DKBWS-CATALOGUE-DUPLICATE-001", "The canonical requirement catalogue contains duplicate identifiers.", {
      filePath: requirementPath,
    });
  }
  return {
    path: relativeRequirementPath,
    sha256: sha256(source),
    rows,
    ids,
  };
}
