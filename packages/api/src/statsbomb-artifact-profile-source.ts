import { readFileSync } from "node:fs";
import type { TeamPerformanceProfile } from "./providers/statsbomb/index.js";
import type { TeamPerformanceProfileSource } from "./statsbomb-prediction-signal.js";

export type { TeamPerformanceProfileSource };

interface ArtifactJson {
  profiles: TeamPerformanceProfile[];
}

function isArtifactJson(value: unknown): value is ArtifactJson {
  return (
    typeof value === "object" &&
    value !== null &&
    "profiles" in value &&
    Array.isArray((value as { profiles: unknown }).profiles)
  );
}

function isTeamPerformanceProfile(value: unknown): value is TeamPerformanceProfile {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["teamId"] === "string" &&
    typeof v["canonicalName"] === "string" &&
    typeof v["coverage"] === "string" &&
    typeof v["freshness"] === "string" &&
    typeof v["matchCount"] === "number"
  );
}

export function createArtifactTeamPerformanceProfileSource(
  artifactPath: string
): TeamPerformanceProfileSource {
  let profileMap: Map<string, TeamPerformanceProfile> | null = null;

  function loadProfiles(): Map<string, TeamPerformanceProfile> {
    if (profileMap !== null) return profileMap;

    let raw: string;
    try {
      raw = readFileSync(artifactPath, "utf8");
    } catch {
      profileMap = new Map();
      return profileMap;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      profileMap = new Map();
      return profileMap;
    }

    if (!isArtifactJson(parsed)) {
      profileMap = new Map();
      return profileMap;
    }

    const map = new Map<string, TeamPerformanceProfile>();
    for (const entry of parsed.profiles) {
      if (isTeamPerformanceProfile(entry)) {
        map.set(entry.teamId, entry);
      }
    }
    profileMap = map;
    return profileMap;
  }

  return {
    getProfile(teamId: string): TeamPerformanceProfile | null {
      const map = loadProfiles();
      return map.get(teamId) ?? null;
    },
    getAvailableTeamIds(): string[] {
      const map = loadProfiles();
      return Array.from(map.keys());
    },
  };
}

export function createInMemoryTeamPerformanceProfileSource(
  profiles: TeamPerformanceProfile[]
): TeamPerformanceProfileSource {
  const map = new Map<string, TeamPerformanceProfile>();
  for (const profile of profiles) {
    map.set(profile.teamId, profile);
  }

  return {
    getProfile(teamId: string): TeamPerformanceProfile | null {
      return map.get(teamId) ?? null;
    },
    getAvailableTeamIds(): string[] {
      return Array.from(map.keys());
    },
  };
}

export function createNullTeamPerformanceProfileSource(): TeamPerformanceProfileSource {
  return {
    getProfile(_teamId: string): TeamPerformanceProfile | null {
      return null;
    },
    getAvailableTeamIds(): string[] {
      return [];
    },
  };
}
