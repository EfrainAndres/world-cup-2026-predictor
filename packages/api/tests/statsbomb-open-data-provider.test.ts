import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseMatchRecords, parseEventRecords } from "../src/providers/statsbomb/statsbomb-normalization.js";
import { resolveStatsBombTeamName, teamNameToId, STATSBOMB_SUPPORTED_COMPETITIONS } from "../src/providers/statsbomb/statsbomb-team-mapping.js";
import { aggregateMatchForTeam } from "../src/providers/statsbomb/statsbomb-event-aggregation.js";
import { classifyFreshness, classifyCoverage, buildProfileFromAggregations, buildFallbackProfile, COVERAGE_THRESHOLDS } from "../src/providers/statsbomb/statsbomb-performance-profile.js";
import { createStatsBombOpenDataProvider } from "../src/providers/statsbomb/statsbomb-open-data-provider.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../src/world-cup-2026-teams.js";
import type { StatsBombMatchRecord, StatsBombEventRecord, TeamPerformanceSource } from "../src/providers/statsbomb/statsbomb-types.js";
import type { MatchEventAggregation } from "../src/providers/statsbomb/statsbomb-event-aggregation.js";

// ─── Synthetic fixtures ────────────────────────────────────────────────────

const FRANCE_VS_GERMANY_MATCH: StatsBombMatchRecord = {
  match_id: 9001,
  match_date: "2024-07-01",
  home_team: { home_team_id: 805, home_team_name: "France" },
  away_team: { away_team_id: 756, away_team_name: "Germany" },
  home_score: 2,
  away_score: 1,
  competition: { competition_id: 55, competition_name: "UEFA Euro" },
  season: { season_id: 282, season_name: "2024" },
};

const FRANCE_VS_GERMANY_EVENTS: StatsBombEventRecord[] = [
  {
    id: "evt-001",
    type: { id: 16, name: "Shot" },
    period: 1,
    timestamp: "00:30:00.000",
    team: { id: 805, name: "France" },
    shot: { statsbomb_xg: 0.5, outcome: { id: 97, name: "Goal" } },
  },
  {
    id: "evt-002",
    type: { id: 16, name: "Shot" },
    period: 2,
    timestamp: "01:10:00.000",
    team: { id: 805, name: "France" },
    shot: { statsbomb_xg: 0.3, outcome: { id: 100, name: "Saved" } },
  },
  {
    id: "evt-003",
    type: { id: 16, name: "Shot" },
    period: 1,
    timestamp: "00:45:00.000",
    team: { id: 756, name: "Germany" },
    shot: { statsbomb_xg: 0.4, outcome: { id: 97, name: "Goal" } },
  },
  {
    id: "evt-004",
    type: { id: 16, name: "Shot" },
    period: 2,
    timestamp: "01:20:00.000",
    team: { id: 756, name: "Germany" },
    shot: { statsbomb_xg: 0.2, outcome: { id: 100, name: "Saved" } },
  },
];

const DATA_DIR = "/test-fixtures";

function makeReadFileFn(files: Record<string, string>): (path: string) => string {
  return (path: string) => {
    const content = files[path];
    if (content === undefined) throw new Error(`Mock file not found: ${path}`);
    return content;
  };
}

function matchesFilePath(compId: number, seasonId: number): string {
  return join(DATA_DIR, "data", "matches", String(compId), `${seasonId}.json`);
}

function eventsFilePath(matchId: number): string {
  return join(DATA_DIR, "data", "events", `${matchId}.json`);
}

// ─── 1. parseMatchRecords ──────────────────────────────────────────────────

describe("statsbomb-normalization — parseMatchRecords", () => {
  it("parses a valid match record", () => {
    const raw = [
      {
        match_id: 1,
        match_date: "2022-11-20",
        home_team: { home_team_id: 100, home_team_name: "France" },
        away_team: { away_team_id: 200, away_team_name: "Germany" },
        home_score: 2,
        away_score: 1,
        competition: { competition_id: 43, competition_name: "FIFA World Cup" },
        season: { season_id: 106, season_name: "2022" },
      },
    ];
    const { records, errors } = parseMatchRecords(raw);
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(0);
    expect(records[0]?.match_id).toBe(1);
    expect(records[0]?.home_team.home_team_name).toBe("France");
  });

  it("skips malformed record (missing match_id) and records an error", () => {
    const raw = [
      {
        match_date: "2022-11-20",
        home_team: { home_team_name: "France" },
        away_team: { away_team_name: "Germany" },
        home_score: 2,
        away_score: 1,
      },
    ];
    const { records, errors } = parseMatchRecords(raw);
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("returns empty array and error for non-array input", () => {
    const { records, errors } = parseMatchRecords({ not: "an array" });
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/array/i);
  });

  it("passes valid records through and collects errors for invalid ones", () => {
    const raw = [
      {
        match_id: 1,
        match_date: "2022-11-20",
        home_team: { home_team_id: 100, home_team_name: "France" },
        away_team: { away_team_id: 200, away_team_name: "Germany" },
        home_score: 2,
        away_score: 1,
        competition: { competition_id: 43, competition_name: "FIFA World Cup" },
        season: { season_id: 106, season_name: "2022" },
      },
      { match_id: "not-a-number", match_date: "2022-11-21" },
    ];
    const { records, errors } = parseMatchRecords(raw);
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });
});

// ─── 2. parseEventRecords ─────────────────────────────────────────────────

describe("statsbomb-normalization — parseEventRecords", () => {
  it("parses a valid shot event", () => {
    const raw = [
      {
        id: "abc",
        type: { id: 16, name: "Shot" },
        period: 1,
        timestamp: "00:30:00.000",
        team: { id: 805, name: "France" },
        shot: { statsbomb_xg: 0.5, outcome: { id: 97, name: "Goal" } },
      },
    ];
    const { records, errors } = parseEventRecords(raw);
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(0);
    expect(records[0]?.shot?.statsbomb_xg).toBe(0.5);
  });

  it("skips event missing type and records an error", () => {
    const raw = [{ id: "abc", period: 1, timestamp: "00:00:00.000", team: { id: 100, name: "France" } }];
    const { records, errors } = parseEventRecords(raw);
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("parses non-shot events (type.name !== 'Shot') without shot data", () => {
    const raw = [
      {
        id: "pass-001",
        type: { id: 30, name: "Pass" },
        period: 1,
        timestamp: "00:01:00.000",
        team: { id: 805, name: "France" },
      },
    ];
    const { records, errors } = parseEventRecords(raw);
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(0);
    expect(records[0]?.type.name).toBe("Pass");
    expect(records[0]?.shot).toBeUndefined();
  });

  it("skips event missing id and records an error", () => {
    const raw = [
      {
        type: { id: 16, name: "Shot" },
        period: 1,
        timestamp: "00:30:00.000",
        team: { id: 100, name: "France" },
      },
    ];
    const { records, errors } = parseEventRecords(raw);
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});

// ─── 3. statsbomb-team-mapping ────────────────────────────────────────────

describe("statsbomb-team-mapping", () => {
  it("resolves StatsBomb 'Czech Republic' to 'Czechia'", () => {
    expect(resolveStatsBombTeamName("Czech Republic")).toBe("Czechia");
  });

  it("resolves StatsBomb 'Côte d'Ivoire' to 'Ivory Coast'", () => {
    expect(resolveStatsBombTeamName("Côte d'Ivoire")).toBe("Ivory Coast");
  });

  it("resolves StatsBomb 'Cape Verde Islands' to 'Cape Verde'", () => {
    expect(resolveStatsBombTeamName("Cape Verde Islands")).toBe("Cape Verde");
  });

  it("resolves StatsBomb 'Congo DR' to 'DR Congo'", () => {
    expect(resolveStatsBombTeamName("Congo DR")).toBe("DR Congo");
  });

  it("resolves StatsBomb 'Korea Republic' to 'South Korea'", () => {
    expect(resolveStatsBombTeamName("Korea Republic")).toBe("South Korea");
  });

  it("resolves 'France' to 'France' (identity)", () => {
    expect(resolveStatsBombTeamName("France")).toBe("France");
  });

  it("returns null for an unknown team name", () => {
    expect(resolveStatsBombTeamName("UnknownTeam")).toBeNull();
  });

  it("teamNameToId converts 'South Africa' to 'south-africa'", () => {
    expect(teamNameToId("South Africa")).toBe("south-africa");
  });

  it("teamNameToId converts 'Bosnia-Herzegovina' to 'bosnia-herzegovina'", () => {
    expect(teamNameToId("Bosnia-Herzegovina")).toBe("bosnia-herzegovina");
  });

  it("STATSBOMB_SUPPORTED_COMPETITIONS has 6 entries", () => {
    expect(STATSBOMB_SUPPORTED_COMPETITIONS).toHaveLength(6);
  });
});

// ─── 4. aggregateMatchForTeam ─────────────────────────────────────────────

describe("statsbomb-event-aggregation — aggregateMatchForTeam", () => {
  it("counts shots for and against correctly", () => {
    const agg = aggregateMatchForTeam("France", FRANCE_VS_GERMANY_EVENTS, FRANCE_VS_GERMANY_MATCH);
    expect(agg.shotCountFor).toBe(2);
    expect(agg.shotCountAgainst).toBe(2);
    expect(agg.xgSampleCountFor).toBe(2);
    expect(agg.xgSampleCountAgainst).toBe(2);
    expect(agg.totalXgFor).toBeCloseTo(0.8);
    expect(agg.totalXgAgainst).toBeCloseTo(0.6);
  });

  it("goals come from match score, not events", () => {
    const agg = aggregateMatchForTeam("France", FRANCE_VS_GERMANY_EVENTS, FRANCE_VS_GERMANY_MATCH);
    expect(agg.goalsFor).toBe(2);
    expect(agg.goalsAgainst).toBe(1);

    const aggGermany = aggregateMatchForTeam("Germany", FRANCE_VS_GERMANY_EVENTS, FRANCE_VS_GERMANY_MATCH);
    expect(aggGermany.goalsFor).toBe(1);
    expect(aggGermany.goalsAgainst).toBe(2);
  });

  it("excludes period 5 (penalty shootout) shots from xG", () => {
    const eventsWithShootout: StatsBombEventRecord[] = [
      ...FRANCE_VS_GERMANY_EVENTS,
      {
        id: "pk-001",
        type: { id: 16, name: "Shot" },
        period: 5,
        timestamp: "02:00:00.000",
        team: { id: 805, name: "France" },
        shot: { statsbomb_xg: 0.8, outcome: { id: 97, name: "Goal" } },
      },
    ];
    const agg = aggregateMatchForTeam("France", eventsWithShootout, FRANCE_VS_GERMANY_MATCH);
    // period 5 shot excluded — same as baseline
    expect(agg.shotCountFor).toBe(2);
    expect(agg.xgSampleCountFor).toBe(2);
  });

  it("excludes own goals from xG but goals counted from match score", () => {
    const eventsWithOwnGoal: StatsBombEventRecord[] = [
      ...FRANCE_VS_GERMANY_EVENTS,
      {
        id: "og-001",
        type: { id: 16, name: "Shot" },
        period: 1,
        timestamp: "00:20:00.000",
        team: { id: 756, name: "Germany" },
        shot: { statsbomb_xg: 0.9, outcome: { id: 25, name: "Own Goal For" } },
      },
    ];
    const agg = aggregateMatchForTeam("France", eventsWithOwnGoal, FRANCE_VS_GERMANY_MATCH);
    // own goal excluded from xG
    expect(agg.shotCountAgainst).toBe(2);
    expect(agg.xgSampleCountAgainst).toBe(2);
    // goals still from match score
    expect(agg.goalsFor).toBe(2);
  });

  it("hasExtraTime = true when any event has period >= 3", () => {
    const eventsWithET: StatsBombEventRecord[] = [
      ...FRANCE_VS_GERMANY_EVENTS,
      {
        id: "et-001",
        type: { id: 30, name: "Pass" },
        period: 3,
        timestamp: "01:31:00.000",
        team: { id: 805, name: "France" },
      },
    ];
    const agg = aggregateMatchForTeam("France", eventsWithET, FRANCE_VS_GERMANY_MATCH);
    expect(agg.hasExtraTime).toBe(true);
    expect(agg.minutesPlayed).toBe(120);
  });

  it("minutesPlayed = 90 for regulation-only match", () => {
    const agg = aggregateMatchForTeam("France", FRANCE_VS_GERMANY_EVENTS, FRANCE_VS_GERMANY_MATCH);
    expect(agg.hasExtraTime).toBe(false);
    expect(agg.minutesPlayed).toBe(90);
  });

  it("adds a warning when team not found in match", () => {
    const agg = aggregateMatchForTeam("Brazil", FRANCE_VS_GERMANY_EVENTS, FRANCE_VS_GERMANY_MATCH);
    expect(agg.warnings.length).toBeGreaterThan(0);
    expect(agg.goalsFor).toBe(0);
    expect(agg.goalsAgainst).toBe(0);
  });
});

// ─── 5. classifyFreshness ────────────────────────────────────────────────

describe("statsbomb-performance-profile — classifyFreshness", () => {
  const CUTOFF = "2024-07-01";

  it("returns 'unknown' when latestMatchDate is null", () => {
    expect(classifyFreshness(null, CUTOFF)).toBe("unknown");
  });

  it("returns 'fresh' for a date 100 days before cutoff", () => {
    expect(classifyFreshness("2024-03-23", CUTOFF)).toBe("fresh");
  });

  it("returns 'aging' for a date 200 days before cutoff", () => {
    expect(classifyFreshness("2023-12-13", CUTOFF)).toBe("aging");
  });

  it("returns 'stale' for a date 400 days before cutoff", () => {
    expect(classifyFreshness("2023-03-27", CUTOFF)).toBe("stale");
  });

  it("returns 'fresh' for a date exactly at FRESH_MAX (180 days)", () => {
    // 2024-07-01 minus 180 days = 2024-01-03
    expect(classifyFreshness("2024-01-03", CUTOFF)).toBe("fresh");
  });
});

// ─── 6. classifyCoverage ─────────────────────────────────────────────────

describe("statsbomb-performance-profile — classifyCoverage", () => {
  it("returns 'full' when matchCount >= 10, xgSamples >= 100, freshness fresh", () => {
    expect(classifyCoverage(10, 100, "fresh")).toBe("full");
    expect(classifyCoverage(15, 200, "aging")).toBe("full");
  });

  it("does NOT return full when freshness is stale (even with enough matches/samples)", () => {
    expect(classifyCoverage(10, 100, "stale")).not.toBe("full");
  });

  it("does NOT return full when freshness is unknown", () => {
    expect(classifyCoverage(10, 100, "unknown")).not.toBe("full");
  });

  it("returns 'partial' when matchCount >= 5 and xgSamples >= 40", () => {
    expect(classifyCoverage(5, 40, "fresh")).toBe("partial");
    expect(classifyCoverage(7, 60, "stale")).toBe("partial");
  });

  it("returns 'sparse' when matchCount >= 1 but below partial thresholds", () => {
    expect(classifyCoverage(3, 10, "fresh")).toBe("sparse");
    expect(classifyCoverage(1, 0, "fresh")).toBe("sparse");
    expect(classifyCoverage(4, 0, "fresh")).toBe("sparse");
  });

  it("returns 'fallback' when matchCount === 0", () => {
    expect(classifyCoverage(0, 0, "unknown")).toBe("fallback");
    expect(classifyCoverage(0, 0, "fresh")).toBe("fallback");
  });

  it("COVERAGE_THRESHOLDS constants have expected values", () => {
    expect(COVERAGE_THRESHOLDS.FULL_MIN_MATCHES).toBe(10);
    expect(COVERAGE_THRESHOLDS.FULL_MIN_XG_SAMPLES).toBe(100);
    expect(COVERAGE_THRESHOLDS.PARTIAL_MIN_MATCHES).toBe(5);
    expect(COVERAGE_THRESHOLDS.PARTIAL_MIN_XG_SAMPLES).toBe(40);
  });
});

// ─── 7. buildProfileFromAggregations ─────────────────────────────────────

describe("statsbomb-performance-profile — buildProfileFromAggregations", () => {
  const sources: TeamPerformanceSource[] = [
    { provider: "statsbomb_open_data", competitionId: 55, seasonId: 282, matchId: 9001, matchDate: "2024-07-01" },
  ];

  it("returns fallback profile for empty aggregations", () => {
    const profile = buildProfileFromAggregations("France", "france", [], [], "2024-07-02", []);
    expect(profile.matchCount).toBe(0);
    expect(profile.coverage).toBe("fallback");
    expect(profile.goalsFor).toBeNull();
    expect(profile.goalsAgainst).toBeNull();
    expect(profile.xgForPer90).toBeNull();
  });

  it("per-90 rates are null when minutesPlayed = 0", () => {
    const agg: MatchEventAggregation = {
      matchId: 1,
      matchDate: "2024-01-01",
      opponentCanonicalName: "Germany",
      minutesPlayed: 0,
      shotCountFor: 5,
      shotCountAgainst: 3,
      xgSampleCountFor: 5,
      xgSampleCountAgainst: 3,
      totalXgFor: 1.5,
      totalXgAgainst: 0.9,
      goalsFor: 2,
      goalsAgainst: 1,
      hasExtraTime: false,
      warnings: [],
    };
    const profile = buildProfileFromAggregations("France", "france", [agg], sources, "2024-07-02", []);
    expect(profile.xgForPer90).toBeNull();
    expect(profile.xgAgainstPer90).toBeNull();
    expect(profile.goalsForPer90).toBeNull();
    expect(profile.goalsAgainstPer90).toBeNull();
  });

  it("shot quality is null when shotCountFor = 0", () => {
    const agg: MatchEventAggregation = {
      matchId: 1,
      matchDate: "2024-01-01",
      opponentCanonicalName: "Germany",
      minutesPlayed: 90,
      shotCountFor: 0,
      shotCountAgainst: 5,
      xgSampleCountFor: 0,
      xgSampleCountAgainst: 5,
      totalXgFor: 0,
      totalXgAgainst: 1.5,
      goalsFor: 0,
      goalsAgainst: 2,
      hasExtraTime: false,
      warnings: [],
    };
    const profile = buildProfileFromAggregations("France", "france", [agg], sources, "2024-07-02", []);
    expect(profile.shotQualityFor).toBeNull();
    expect(profile.totalXgFor).toBeNull();
  });

  it("no NaN or Infinity in any field", () => {
    const agg: MatchEventAggregation = {
      matchId: 1,
      matchDate: "2024-06-01",
      opponentCanonicalName: "Germany",
      minutesPlayed: 90,
      shotCountFor: 5,
      shotCountAgainst: 3,
      xgSampleCountFor: 5,
      xgSampleCountAgainst: 3,
      totalXgFor: 1.2,
      totalXgAgainst: 0.9,
      goalsFor: 2,
      goalsAgainst: 1,
      hasExtraTime: false,
      warnings: [],
    };
    const profile = buildProfileFromAggregations("France", "france", [agg], sources, "2024-07-02", []);
    const numericFields = [
      profile.minutesPlayed,
      profile.shotCountFor,
      profile.shotCountAgainst,
      profile.xgSampleCountFor,
      profile.xgSampleCountAgainst,
      profile.goalsFor,
      profile.goalsAgainst,
      profile.uniqueOpponentCount,
    ];
    for (const v of numericFields) {
      expect(Number.isNaN(v)).toBe(false);
      if (v !== null) expect(isFinite(v)).toBe(true);
    }
    const nullableFields = [
      profile.totalXgFor,
      profile.totalXgAgainst,
      profile.xgForPer90,
      profile.xgAgainstPer90,
      profile.goalsForPer90,
      profile.goalsAgainstPer90,
      profile.shotQualityFor,
      profile.shotQualityAgainst,
    ];
    for (const v of nullableFields) {
      if (v !== null) {
        expect(Number.isNaN(v)).toBe(false);
        expect(isFinite(v)).toBe(true);
      }
    }
  });
});

// ─── 8. createStatsBombOpenDataProvider ──────────────────────────────────

function buildSyntheticFiles(
  match: StatsBombMatchRecord,
  events: StatsBombEventRecord[]
): Record<string, string> {
  const files: Record<string, string> = {};

  // Provide this match under competition 55 / season 282 (UEFA Euro 2024)
  files[matchesFilePath(55, 282)] = JSON.stringify([match]);
  files[eventsFilePath(match.match_id)] = JSON.stringify(events);

  return files;
}

describe("createStatsBombOpenDataProvider", () => {
  const CUTOFF_BEFORE = "2024-07-02";
  const CUTOFF_AT = "2024-07-01";
  const CUTOFF_AFTER = "2024-06-30";

  it("getTeamPerformanceProfile returns profile with correct match count", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result = await provider.getTeamPerformanceProfile("France", CUTOFF_BEFORE);
    expect(result.profile.matchCount).toBe(1);
    expect(result.canonicalName).toBe("France");
    expect(result.teamId).toBe("france");
  });

  it("resolves hyphenated teamId (france → France)", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result = await provider.getTeamPerformanceProfile("france", CUTOFF_BEFORE);
    expect(result.profile.matchCount).toBe(1);
    expect(result.canonicalName).toBe("France");
  });

  it("resolves canonical name with different case (Germany → germany)", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result = await provider.getTeamPerformanceProfile("germany", CUTOFF_BEFORE);
    expect(result.profile.matchCount).toBe(1);
    expect(result.canonicalName).toBe("Germany");
  });

  it("excludes match exactly at cutoffAt (strict: match_date < cutoffAt)", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    // match_date = "2024-07-01", cutoffAt = "2024-07-01" → excluded
    const result = await provider.getTeamPerformanceProfile("France", CUTOFF_AT);
    expect(result.profile.matchCount).toBe(0);
    expect(result.profile.coverage).toBe("fallback");
  });

  it("excludes match after cutoffAt", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    // match_date = "2024-07-01", cutoffAt = "2024-06-30" → excluded
    const result = await provider.getTeamPerformanceProfile("France", CUTOFF_AFTER);
    expect(result.profile.matchCount).toBe(0);
  });

  it("includes match before cutoffAt", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result = await provider.getTeamPerformanceProfile("France", CUTOFF_BEFORE);
    expect(result.profile.matchCount).toBe(1);
  });

  it("Bosnia-Herzegovina (fallback team) returns fallback profile", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result = await provider.getTeamPerformanceProfile("Bosnia-Herzegovina", CUTOFF_BEFORE);
    expect(result.profile.matchCount).toBe(0);
    expect(result.profile.coverage).toBe("fallback");
    expect(result.profile.totalXgFor).toBeNull();
  });

  it("listTeamPerformanceProfiles returns exactly 48 profiles", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const results = await provider.listTeamPerformanceProfiles(CUTOFF_BEFORE);
    expect(results).toHaveLength(48);
  });

  it("all 48 canonical teams are represented in listTeamPerformanceProfiles", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const results = await provider.listTeamPerformanceProfiles(CUTOFF_BEFORE);
    const names = new Set(results.map((r) => r.canonicalName));
    for (const name of WORLD_CUP_2026_TEAM_NAMES) {
      expect(names.has(name)).toBe(true);
    }
  });

  it("output is deterministic (same cutoff → same result)", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result1 = await provider.getTeamPerformanceProfile("France", CUTOFF_BEFORE);
    const result2 = await provider.getTeamPerformanceProfile("France", CUTOFF_BEFORE);
    expect(JSON.stringify(result1.profile)).toBe(JSON.stringify(result2.profile));
  });
});

// ─── 9. cutoffAt protection ────────────────────────────────────────────────

describe("cutoffAt protection", () => {
  const matchA: StatsBombMatchRecord = {
    ...FRANCE_VS_GERMANY_MATCH,
    match_id: 9001,
    match_date: "2024-01-10",
    home_score: 1,
    away_score: 0,
  };
  const matchB: StatsBombMatchRecord = {
    ...FRANCE_VS_GERMANY_MATCH,
    match_id: 9002,
    match_date: "2024-04-15",
    home_score: 2,
    away_score: 1,
  };
  const matchC: StatsBombMatchRecord = {
    ...FRANCE_VS_GERMANY_MATCH,
    match_id: 9003,
    match_date: "2024-07-01",
    home_score: 0,
    away_score: 0,
  };

  it("only includes matches strictly before cutoffAt when cutoff splits the list", async () => {
    const files: Record<string, string> = {
      [matchesFilePath(55, 282)]: JSON.stringify([matchA, matchB, matchC]),
      [eventsFilePath(9001)]: JSON.stringify(FRANCE_VS_GERMANY_EVENTS),
      [eventsFilePath(9002)]: JSON.stringify(FRANCE_VS_GERMANY_EVENTS),
      [eventsFilePath(9003)]: JSON.stringify(FRANCE_VS_GERMANY_EVENTS),
    };

    // cutoff = 2024-04-20: matchA (Jan) included, matchB (Apr 15) included, matchC (Jul) excluded
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result = await provider.getTeamPerformanceProfile("France", "2024-04-20");
    expect(result.profile.matchCount).toBe(2);
  });

  it("changing cutoffAt changes the profile deterministically", async () => {
    const files: Record<string, string> = {
      [matchesFilePath(55, 282)]: JSON.stringify([matchA, matchB, matchC]),
      [eventsFilePath(9001)]: JSON.stringify(FRANCE_VS_GERMANY_EVENTS),
      [eventsFilePath(9002)]: JSON.stringify(FRANCE_VS_GERMANY_EVENTS),
      [eventsFilePath(9003)]: JSON.stringify(FRANCE_VS_GERMANY_EVENTS),
    };

    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const result1 = await provider.getTeamPerformanceProfile("France", "2024-02-01");
    const result2 = await provider.getTeamPerformanceProfile("France", "2024-07-02");

    // Earlier cutoff sees fewer matches
    expect(result1.profile.matchCount).toBeLessThan(result2.profile.matchCount);
  });
});

// ─── 10. safety invariants ────────────────────────────────────────────────

describe("safety invariants", () => {
  it("no NaN or Infinity in any profile across all 48 teams", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const results = await provider.listTeamPerformanceProfiles("2024-07-02");

    for (const result of results) {
      const p = result.profile;
      const numericFields = [p.matchCount, p.minutesPlayed, p.shotCountFor, p.shotCountAgainst, p.xgSampleCountFor, p.xgSampleCountAgainst, p.uniqueOpponentCount];
      for (const v of numericFields) {
        expect(Number.isNaN(v)).toBe(false);
        expect(isFinite(v)).toBe(true);
      }
      const nullableFields = [p.totalXgFor, p.totalXgAgainst, p.xgForPer90, p.xgAgainstPer90, p.goalsFor, p.goalsAgainst, p.goalsForPer90, p.goalsAgainstPer90, p.shotQualityFor, p.shotQualityAgainst];
      for (const v of nullableFields) {
        if (v !== null) {
          expect(Number.isNaN(v)).toBe(false);
          expect(isFinite(v)).toBe(true);
        }
      }
    }
  });

  it("all 48 canonical team names present exactly once", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const results = await provider.listTeamPerformanceProfiles("2024-07-02");

    const names = results.map((r) => r.canonicalName);
    expect(new Set(names).size).toBe(48);
    for (const name of WORLD_CUP_2026_TEAM_NAMES) {
      expect(names.includes(name)).toBe(true);
    }
  });

  it("all profiles have valid coverage classification", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const results = await provider.listTeamPerformanceProfiles("2024-07-02");
    const validCoverage = new Set(["full", "partial", "sparse", "fallback"]);
    for (const result of results) {
      expect(validCoverage.has(result.profile.coverage)).toBe(true);
    }
  });

  it("all profiles have valid freshness classification", async () => {
    const files = buildSyntheticFiles(FRANCE_VS_GERMANY_MATCH, FRANCE_VS_GERMANY_EVENTS);
    const provider = createStatsBombOpenDataProvider(DATA_DIR, makeReadFileFn(files));
    const results = await provider.listTeamPerformanceProfiles("2024-07-02");
    const validFreshness = new Set(["fresh", "aging", "stale", "unknown"]);
    for (const result of results) {
      expect(validFreshness.has(result.profile.freshness)).toBe(true);
    }
  });
});
