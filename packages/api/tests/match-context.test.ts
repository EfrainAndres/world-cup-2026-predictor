import { describe, expect, it } from "vitest";
import { buildWorldCup2026MatchContext } from "../src/match-context.js";
import {
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION,
  calculateWorldCup2026TournamentForm
} from "../src/index.js";
import type { WorldCup2026ExternalFixtureRecord } from "../src/index.js";

const MEXICO_VS_SOUTH_AFRICA_ID = "wc2026-group-a-md1-01-mexico-vs-south-africa";

function finishedRecord(
  fixtureId: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  group = "A",
  matchday = 1,
  overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: fixtureId,
    competition: "FIFA World Cup",
    season: "2026",
    stage: "Group Stage",
    group,
    matchday,
    homeTeam,
    awayTeam,
    status: "finished",
    homeScore,
    awayScore,
    updatedAt: "2026-06-14",
    ...overrides
  };
}

function liveRecord(overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: "wc2026-group-a-md1-02-south-korea-vs-czechia",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "Group Stage",
    group: "A",
    matchday: 1,
    homeTeam: "South Korea",
    awayTeam: "Czechia",
    status: "live",
    homeScore: 1,
    awayScore: 0,
    updatedAt: "2026-06-14",
    ...overrides
  };
}

describe("buildWorldCup2026MatchContext", () => {
  describe("fixture resolution", () => {
    it("returns error for an unknown fixture ID", () => {
      const result = buildWorldCup2026MatchContext({ fixtureId: "does-not-exist" });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.code).toBe("fixture_not_found");
        expect(result.message).toContain("does-not-exist");
      }
    });

    it("resolves a known canonical fixture ID to success", () => {
      const result = buildWorldCup2026MatchContext({ fixtureId: MEXICO_VS_SOUTH_AFRICA_ID });
      expect(result.status).toBe("success");
    });

    it("reflects fixtureId, homeTeam, awayTeam, group, and matchday from the canonical fixture", () => {
      const result = buildWorldCup2026MatchContext({ fixtureId: MEXICO_VS_SOUTH_AFRICA_ID });
      if (result.status !== "success") throw new Error("Expected success");
      const { context } = result;
      expect(context.fixtureId).toBe(MEXICO_VS_SOUTH_AFRICA_ID);
      expect(context.homeTeam).toBe("Mexico");
      expect(context.awayTeam).toBe("South Africa");
      expect(context.group).toBe("A");
      expect(context.matchday).toBe(1);
    });
  });

  describe("standings context — no results", () => {
    it("returns zero-state standings when completedResults is empty", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      const { standingsContext } = result.context;
      expect(standingsContext.home.points).toBe(0);
      expect(standingsContext.home.played).toBe(0);
      expect(standingsContext.away.points).toBe(0);
      expect(standingsContext.away.played).toBe(0);
    });

    it("returns null groupPosition for both teams when no results exist", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.home.groupPosition).toBeNull();
      expect(result.context.standingsContext.away.groupPosition).toBeNull();
    });

    it("returns official standings mode when no live matches are present", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.mode).toBe("official");
    });

    it("reports groupComplete=false when no fixtures are completed", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.groupComplete).toBe(false);
    });
  });

  describe("standings context — with completed results", () => {
    it("reflects winner's points and position after a home win", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      const { home, away } = result.context.standingsContext;
      expect(home.team).toBe("Mexico");
      expect(home.points).toBe(3);
      expect(home.played).toBe(1);
      expect(home.wins).toBe(1);
      expect(home.goalsFor).toBe(2);
      expect(home.goalDifference).toBe(2);
      expect(home.groupPosition).toBe(1);
      expect(away.team).toBe("South Africa");
      expect(away.points).toBe(0);
      expect(away.played).toBe(1);
      expect(away.losses).toBe(1);
    });

    it("reflects one point each after a draw", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 1, 1)];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      const { home, away } = result.context.standingsContext;
      expect(home.points).toBe(1);
      expect(away.points).toBe(1);
      expect(home.draws).toBe(1);
      expect(away.draws).toBe(1);
    });

    it("home team in home field reflects correct team name", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.home.team).toBe("Mexico");
      expect(result.context.standingsContext.away.team).toBe("South Africa");
    });
  });

  describe("provisional standings mode", () => {
    it("returns live_provisional mode when live matches are present", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        liveMatches: [liveRecord()]
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.mode).toBe("live_provisional");
    });

    it("returns official mode when liveMatches is empty", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        liveMatches: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.mode).toBe("official");
    });
  });

  describe("no-look-ahead cutoff", () => {
    it("excludes records timestamped after the cutoff", () => {
      const records = [
        finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0, "A", 1, {
          updatedAt: "2026-06-20"
        })
      ];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records,
        cutoffAt: "2026-06-15"
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.home.points).toBe(0);
    });

    it("includes records timestamped before the cutoff", () => {
      const records = [
        finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0, "A", 1, {
          updatedAt: "2026-06-14"
        })
      ];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records,
        cutoffAt: "2026-06-15"
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.standingsContext.home.points).toBe(3);
    });

    it("produces different standings context before vs after cutoff", () => {
      const records = [
        finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0, "A", 1, {
          updatedAt: "2026-06-20"
        })
      ];
      const beforeCutoff = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records,
        cutoffAt: "2026-06-15"
      });
      const noCutoff = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (beforeCutoff.status !== "success" || noCutoff.status !== "success") {
        throw new Error("Expected success");
      }
      expect(beforeCutoff.context.standingsContext.home.points).toBe(0);
      expect(noCutoff.context.standingsContext.home.points).toBe(3);
    });
  });

  describe("qualification state", () => {
    it("returns foundation_only with no results", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.qualificationState.status).toBe("foundation_only");
      expect(result.context.qualificationState.firstPlace).toBeUndefined();
    });

    it("returns provisional when some matches are complete", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.qualificationState.status).toBe("provisional");
      expect(result.context.qualificationState.firstPlace).toBe("Mexico");
    });

    it("returns official when all 6 group fixtures are completed", () => {
      const groupAFixtures = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.filter((f) => f.group === "A");
      const records = groupAFixtures.map((f) =>
        finishedRecord(f.id, f.homeTeam, f.awayTeam, 1, 0, "A", f.matchday)
      );
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.qualificationState.status).toBe("official");
      expect(result.context.standingsContext.groupComplete).toBe(true);
    });

    it("exposes secondPlace and thirdPlace when standings have enough entries", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.qualificationState.secondPlace).toBeDefined();
      expect(result.context.qualificationState.thirdPlace).toBeDefined();
    });
  });

  describe("fixture importance", () => {
    it("returns low importance for a matchday 1 fixture with no results", () => {
      const md1Fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.matchday === 1);
      if (!md1Fixture) throw new Error("No MD1 fixture found");
      const result = buildWorldCup2026MatchContext({
        fixtureId: md1Fixture.id,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fixtureImportance.level).toBe("low");
    });

    it("returns medium importance for a matchday 2 fixture", () => {
      const md2Fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.matchday === 2);
      if (!md2Fixture) throw new Error("No MD2 fixture found");
      const result = buildWorldCup2026MatchContext({
        fixtureId: md2Fixture.id,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fixtureImportance.level).toBe("medium");
    });

    it("returns high importance for a matchday 3 fixture", () => {
      const md3Fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.matchday === 3);
      if (!md3Fixture) throw new Error("No MD3 fixture found");
      const result = buildWorldCup2026MatchContext({
        fixtureId: md3Fixture.id,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fixtureImportance.level).toBe("high");
    });

    it("returns low importance when the group is already complete, even for MD3", () => {
      const groupAFixtures = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.filter((f) => f.group === "A");
      const records = groupAFixtures.map((f) =>
        finishedRecord(f.id, f.homeTeam, f.awayTeam, 1, 0, "A", f.matchday)
      );
      const md3GroupA = groupAFixtures.find((f) => f.matchday === 3);
      if (!md3GroupA) throw new Error("No MD3 Group A fixture found");
      const result = buildWorldCup2026MatchContext({
        fixtureId: md3GroupA.id,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fixtureImportance.level).toBe("low");
    });

    it("includes at least one reason string in fixture importance", () => {
      const md3Fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.matchday === 3);
      if (!md3Fixture) throw new Error("No MD3 fixture found");
      const result = buildWorldCup2026MatchContext({
        fixtureId: md3Fixture.id,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fixtureImportance.reasons.length).toBeGreaterThan(0);
    });
  });

  describe("tournament form", () => {
    it("omits tournamentForm field when no form result is provided", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.tournamentForm).toBeUndefined();
    });

    it("attaches tournament form when a form result with data is provided", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const formResult = calculateWorldCup2026TournamentForm({ completedResults: records });
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records,
        tournamentFormResult: formResult
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.tournamentForm).toBeDefined();
      const form = result.context.tournamentForm!;
      expect(form.homeMatchesPlayed).toBe(1);
      expect(form.awayMatchesPlayed).toBe(1);
      expect(form.formulaVersion).toBe(WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION);
    });

    it("omits tournamentForm when form result has no summaries for either team", () => {
      const emptyFormResult = calculateWorldCup2026TournamentForm({ completedResults: [] });
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        tournamentFormResult: emptyFormResult
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.tournamentForm).toBeUndefined();
    });

    it("form scores are numbers (not NaN or Infinity)", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const formResult = calculateWorldCup2026TournamentForm({ completedResults: records });
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records,
        tournamentFormResult: formResult
      });
      if (result.status !== "success") throw new Error("Expected success");
      if (result.context.tournamentForm === undefined) return;
      expect(Number.isFinite(result.context.tournamentForm.homeFormScore)).toBe(true);
      expect(Number.isFinite(result.context.tournamentForm.awayFormScore)).toBe(true);
    });
  });

  describe("provider freshness", () => {
    it("returns stale=false when cacheUsed=false and localFallbackUsed=false", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        activeProvider: "football_data_org",
        cacheUsed: false,
        localFallbackUsed: false,
        externalProviderEnabled: true
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFreshness.stale).toBe(false);
      expect(result.context.providerFreshness.activeProvider).toBe("football_data_org");
    });

    it("returns stale=true when cacheUsed=true", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        cacheUsed: true,
        localFallbackUsed: false
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFreshness.stale).toBe(true);
      expect(result.context.providerFreshness.cacheUsed).toBe(true);
    });

    it("returns stale=true when localFallbackUsed=true", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        cacheUsed: false,
        localFallbackUsed: true
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFreshness.stale).toBe(true);
      expect(result.context.providerFreshness.localFallbackUsed).toBe(true);
    });

    it("includes lastSuccessfulSync when provided", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        lastSuccessfulSync: "2026-06-14T12:00:00Z"
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFreshness.lastSuccessfulSync).toBe("2026-06-14T12:00:00Z");
    });

    it("omits lastSuccessfulSync when not provided", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFreshness.lastSuccessfulSync).toBeUndefined();
    });
  });

  describe("fallback state", () => {
    it("has no warnings when fresh external data is provided", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        cacheUsed: false,
        localFallbackUsed: false
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fallbackState.warnings).toHaveLength(0);
      expect(result.context.fallbackState.unresolvedFixture).toBe(false);
    });

    it("includes a warning when local fallback is active", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        localFallbackUsed: true
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fallbackState.warnings.length).toBeGreaterThan(0);
      expect(result.context.fallbackState.localFallbackUsed).toBe(true);
    });

    it("includes a warning when cache is in use", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        cacheUsed: true
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fallbackState.warnings.length).toBeGreaterThan(0);
    });

    it("reflects externalProviderEnabled=true when set", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: [],
        externalProviderEnabled: true
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.fallbackState.externalProviderEnabled).toBe(true);
    });
  });

  describe("provider fixture data", () => {
    it("extracts kickoffAt and providerFixtureId from the fixtures array", () => {
      const scheduledRecord: WorldCup2026ExternalFixtureRecord = {
        providerFixtureId: "12345",
        competition: "FIFA World Cup",
        season: "2026",
        group: "A",
        homeTeam: "Mexico",
        awayTeam: "South Africa",
        status: "scheduled",
        kickoffAt: "2026-06-15T19:00:00Z"
      };
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        fixtures: [scheduledRecord],
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.kickoffAt).toBe("2026-06-15T19:00:00Z");
      expect(result.context.providerFixtureId).toBe("12345");
    });

    it("extracts providerFixtureId from completedResults when fixtures is omitted", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFixtureId).toBe(MEXICO_VS_SOUTH_AFRICA_ID);
    });

    it("omits kickoffAt when no provider records are available", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.kickoffAt).toBeUndefined();
    });

    it("omits providerFixtureId when no provider records match", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFixtureId).toBeUndefined();
    });
  });

  describe("local fallback mode", () => {
    it("returns success using local static data when no completedResults provided", () => {
      const result = buildWorldCup2026MatchContext({ fixtureId: MEXICO_VS_SOUTH_AFRICA_ID });
      expect(result.status).toBe("success");
    });

    it("reflects localFallbackUsed=true in provider freshness when no completedResults provided", () => {
      const result = buildWorldCup2026MatchContext({ fixtureId: MEXICO_VS_SOUTH_AFRICA_ID });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFreshness.localFallbackUsed).toBe(true);
    });

    it("reflects stale=true in local fallback mode", () => {
      const result = buildWorldCup2026MatchContext({ fixtureId: MEXICO_VS_SOUTH_AFRICA_ID });
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.context.providerFreshness.stale).toBe(true);
    });
  });

  describe("snapshot provenance compatibility", () => {
    it("does not mutate the input completedResults array", () => {
      const records: WorldCup2026ExternalFixtureRecord[] = [
        finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)
      ];
      const originalLength = records.length;
      buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      expect(records.length).toBe(originalLength);
    });

    it("produces deterministic output for the same input", () => {
      const records = [finishedRecord(MEXICO_VS_SOUTH_AFRICA_ID, "Mexico", "South Africa", 2, 0)];
      const result1 = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      const result2 = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: records
      });
      expect(result1).toEqual(result2);
    });

    it("returns a read-only data shape with no write methods", () => {
      const result = buildWorldCup2026MatchContext({
        fixtureId: MEXICO_VS_SOUTH_AFRICA_ID,
        completedResults: []
      });
      if (result.status !== "success") throw new Error("Expected success");
      expect(typeof result.context.fixtureId).toBe("string");
      expect(typeof result.context.standingsContext.home.points).toBe("number");
      expect(Array.isArray(result.context.fixtureImportance.reasons)).toBe(true);
      expect(Array.isArray(result.context.fallbackState.warnings)).toBe(true);
    });
  });

  describe("all canonical group-stage fixtures", () => {
    it("successfully builds context for all 72 group-stage fixtures with empty results", () => {
      let successCount = 0;
      for (const fixture of WORLD_CUP_2026_GROUP_STAGE_FIXTURES) {
        const result = buildWorldCup2026MatchContext({
          fixtureId: fixture.id,
          completedResults: []
        });
        expect(result.status).toBe("success");
        if (result.status === "success") successCount++;
      }
      expect(successCount).toBe(72);
    });

    it("produces contexts across all 12 groups", () => {
      const groups = new Set<string>();
      for (const fixture of WORLD_CUP_2026_GROUP_STAGE_FIXTURES) {
        const result = buildWorldCup2026MatchContext({
          fixtureId: fixture.id,
          completedResults: []
        });
        if (result.status === "success") groups.add(result.context.group);
      }
      expect(groups.size).toBe(12);
    });

    it("produces contexts across all 3 matchdays", () => {
      const matchdays = new Set<number>();
      for (const fixture of WORLD_CUP_2026_GROUP_STAGE_FIXTURES) {
        const result = buildWorldCup2026MatchContext({
          fixtureId: fixture.id,
          completedResults: []
        });
        if (result.status === "success") matchdays.add(result.context.matchday);
      }
      expect([...matchdays].sort()).toEqual([1, 2, 3]);
    });
  });
});
