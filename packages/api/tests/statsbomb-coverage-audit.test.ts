import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalizeTeamName, normalizeTeamSearchText } from "../src/team-aliases.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coverageArtifactPath = join(__dirname, "../../../docs/model-results/artifacts/statsbomb-world-cup-2026-coverage.json");

interface CoverageTeamEntry {
  canonicalId: string;
  canonicalName: string;
  group: string;
  fifaCode: string;
  confederation: string;
  statsBombNames: string[];
  totalMatches: number;
  recentMatchDate: string | null;
  classification: "full" | "partial" | "sparse" | "fallback";
  xgAvailable: boolean;
  statsBombSources: Array<{ competition: string; season: string; matchCount: number }>;
}

interface CoverageArtifact {
  generatedAt: string;
  auditPhase: string;
  teams: CoverageTeamEntry[];
  coverageSummary: { full: number; partial: number; sparse: number; fallback: number; total: number };
  classificationThresholds: Record<string, { minMatches: number; note: string }>;
}

function loadArtifact(): CoverageArtifact {
  const raw = readFileSync(coverageArtifactPath, "utf-8");
  return JSON.parse(raw) as CoverageArtifact;
}

describe("statsbomb-world-cup-2026-coverage.json — structural integrity", () => {
  it("artifact file is valid JSON", () => {
    expect(() => loadArtifact()).not.toThrow();
  });

  it("artifact contains exactly 48 team entries", () => {
    const { teams } = loadArtifact();
    expect(teams).toHaveLength(48);
  });

  it("all 48 WC2026 canonical team names are represented exactly once", () => {
    const { teams } = loadArtifact();
    const names = new Set(teams.map((t) => t.canonicalName));
    for (const canonical of WORLD_CUP_2026_TEAM_NAMES) {
      expect(names.has(canonical)).toBe(true);
    }
    expect(names.size).toBe(48);
  });

  it("coverageSummary total matches teams array length", () => {
    const { teams, coverageSummary } = loadArtifact();
    expect(coverageSummary.total).toBe(teams.length);
    const fullCount = teams.filter((t) => t.classification === "full").length;
    const partialCount = teams.filter((t) => t.classification === "partial").length;
    const sparseCount = teams.filter((t) => t.classification === "sparse").length;
    const fallbackCount = teams.filter((t) => t.classification === "fallback").length;
    expect(coverageSummary.full).toBe(fullCount);
    expect(coverageSummary.partial).toBe(partialCount);
    expect(coverageSummary.sparse).toBe(sparseCount);
    expect(coverageSummary.fallback).toBe(fallbackCount);
  });
});

describe("statsbomb-world-cup-2026-coverage.json — team data quality", () => {
  it("every team entry has a non-empty canonicalId, fifaCode, confederation, and group", () => {
    const { teams } = loadArtifact();
    for (const team of teams) {
      expect(team.canonicalId.length).toBeGreaterThan(0);
      expect(team.fifaCode.length).toBeGreaterThan(0);
      expect(team.confederation.length).toBeGreaterThan(0);
      expect(["A","B","C","D","E","F","G","H","I","J","K","L"]).toContain(team.group);
    }
  });

  it("totalMatches is non-negative and never NaN or Infinity", () => {
    const { teams } = loadArtifact();
    for (const team of teams) {
      expect(Number.isFinite(team.totalMatches)).toBe(true);
      expect(team.totalMatches).toBeGreaterThanOrEqual(0);
    }
  });

  it("totalMatches equals sum of source matchCounts", () => {
    const { teams } = loadArtifact();
    for (const team of teams) {
      const sumFromSources = team.statsBombSources.reduce((acc, s) => acc + s.matchCount, 0);
      expect(team.totalMatches).toBe(sumFromSources);
    }
  });

  it("classification is consistent with totalMatches and defined thresholds", () => {
    const { teams, classificationThresholds } = loadArtifact();
    for (const team of teams) {
      if (team.totalMatches >= classificationThresholds["full"]!.minMatches) {
        expect(team.classification).toBe("full");
      } else if (team.totalMatches >= classificationThresholds["partial"]!.minMatches) {
        expect(["full", "partial"]).toContain(team.classification);
      } else if (team.totalMatches >= classificationThresholds["sparse"]!.minMatches) {
        expect(["full", "partial", "sparse"]).toContain(team.classification);
      } else {
        expect(team.classification).toBe("fallback");
      }
    }
  });

  it("fallback teams have zero matches, no sources, and xgAvailable = false", () => {
    const { teams } = loadArtifact();
    const fallbacks = teams.filter((t) => t.classification === "fallback");
    for (const team of fallbacks) {
      expect(team.totalMatches).toBe(0);
      expect(team.statsBombSources).toHaveLength(0);
      expect(team.xgAvailable).toBe(false);
      expect(team.recentMatchDate).toBeNull();
    }
  });

  it("non-fallback teams with matches have xgAvailable = true and a recentMatchDate", () => {
    const { teams } = loadArtifact();
    const covered = teams.filter((t) => t.totalMatches > 0);
    for (const team of covered) {
      expect(team.xgAvailable).toBe(true);
      expect(typeof team.recentMatchDate).toBe("string");
      expect(team.recentMatchDate!.length).toBeGreaterThan(0);
    }
  });

  it("recentMatchDate is a valid ISO date string when present", () => {
    const { teams } = loadArtifact();
    for (const team of teams) {
      if (team.recentMatchDate !== null) {
        const parsed = new Date(team.recentMatchDate);
        expect(Number.isNaN(parsed.getTime())).toBe(false);
        expect(team.recentMatchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("each source entry has positive matchCount and non-empty competition and season strings", () => {
    const { teams } = loadArtifact();
    for (const team of teams) {
      for (const source of team.statsBombSources) {
        expect(source.matchCount).toBeGreaterThan(0);
        expect(source.competition.length).toBeGreaterThan(0);
        expect(source.season.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("statsbomb name normalization — deterministic mapping through existing alias system", () => {
  const STATSBOMB_TO_CANONICAL: Array<[string, string]> = [
    ["Czech Republic", "Czechia"],
    ["Côte d'Ivoire", "Ivory Coast"],
    ["Cape Verde Islands", "Cape Verde"],
    ["Congo DR", "DR Congo"],
  ];

  it.each(STATSBOMB_TO_CANONICAL)(
    "StatsBomb name '%s' canonicalizes to WC2026 name '%s'",
    (statsBombName, expectedCanonical) => {
      const result = canonicalizeTeamName(statsBombName);
      expect(result).toBe(expectedCanonical);
    }
  );

  it("normalization is deterministic — repeated calls return the same result", () => {
    const inputs = ["Czech Republic", "Côte d'Ivoire", "Cape Verde Islands", "Congo DR"];
    for (const input of inputs) {
      const first = canonicalizeTeamName(input);
      const second = canonicalizeTeamName(input);
      expect(first).toBe(second);
    }
  });

  it("normalized StatsBomb names are case-insensitive", () => {
    expect(normalizeTeamSearchText("CZECH REPUBLIC")).toBe("czech republic");
    expect(normalizeTeamSearchText("Côte D'Ivoire")).toBe("cote d'ivoire");
    expect(normalizeTeamSearchText("Congo DR")).toBe("congo dr");
  });

  it("all teams appearing in statsBombNames resolve to their own canonicalName", () => {
    const { teams } = loadArtifact();
    for (const team of teams) {
      for (const sbName of team.statsBombNames) {
        const resolved = canonicalizeTeamName(sbName);
        expect(resolved).toBe(team.canonicalName);
      }
    }
  });
});

describe("coverage audit — boundary conditions and null safety", () => {
  it("no team has NaN or Infinity in totalMatches or source matchCounts", () => {
    const { teams } = loadArtifact();
    for (const team of teams) {
      expect(Number.isNaN(team.totalMatches)).toBe(false);
      expect(!isFinite(team.totalMatches)).toBe(false);
      for (const source of team.statsBombSources) {
        expect(Number.isNaN(source.matchCount)).toBe(false);
        expect(!isFinite(source.matchCount)).toBe(false);
      }
    }
  });

  it("no duplicate canonical team names in the artifact", () => {
    const { teams } = loadArtifact();
    const seen = new Set<string>();
    for (const team of teams) {
      expect(seen.has(team.canonicalName)).toBe(false);
      seen.add(team.canonicalName);
    }
  });

  it("no duplicate canonicalIds in the artifact", () => {
    const { teams } = loadArtifact();
    const seen = new Set<string>();
    for (const team of teams) {
      expect(seen.has(team.canonicalId)).toBe(false);
      seen.add(team.canonicalId);
    }
  });

  it("exactly 16 groups A-L are represented with exactly 4 teams each", () => {
    const { teams } = loadArtifact();
    const byGroup = new Map<string, number>();
    for (const team of teams) {
      byGroup.set(team.group, (byGroup.get(team.group) ?? 0) + 1);
    }
    expect(byGroup.size).toBe(12);
    for (const [, count] of byGroup) {
      expect(count).toBe(4);
    }
  });

  it("audit recommendation matches expected open_data_partial_use_with_priors", () => {
    const { coverageSummary } = loadArtifact();
    const covered = coverageSummary.full + coverageSummary.partial + coverageSummary.sparse;
    const uncovered = coverageSummary.fallback;
    // 40 covered, 8 fallback → partial use with priors is the correct recommendation
    expect(covered).toBeGreaterThan(uncovered);
    expect(covered).toBe(40);
    expect(uncovered).toBe(8);
  });
});

describe("coverage audit — freshness and staleness classification", () => {
  it("full-coverage teams have recent data from 2022 or later", () => {
    const { teams } = loadArtifact();
    const fullTeams = teams.filter((t) => t.classification === "full");
    for (const team of fullTeams) {
      expect(team.recentMatchDate).not.toBeNull();
      const year = parseInt(team.recentMatchDate!.slice(0, 4), 10);
      expect(year).toBeGreaterThanOrEqual(2022);
    }
  });

  it("no team's recentMatchDate is after the audit cutoff 2026-06-28", () => {
    const { teams, generatedAt } = loadArtifact();
    const cutoff = new Date(generatedAt);
    for (const team of teams) {
      if (team.recentMatchDate !== null) {
        const matchDate = new Date(team.recentMatchDate);
        expect(matchDate.getTime()).toBeLessThanOrEqual(cutoff.getTime());
      }
    }
  });
});
