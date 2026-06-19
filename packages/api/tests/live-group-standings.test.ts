import { describe, expect, it } from "vitest";
import {
  buildWorldCup2026GroupStandings,
  getWorldCup2026LiveGroupStandings
} from "../src/index.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026LiveGroupStandingsResponse
} from "../src/index.js";

function finishedRecord(overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "Group Stage",
    group: "A",
    matchday: 1,
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    status: "finished",
    homeScore: 2,
    awayScore: 0,
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

describe("getWorldCup2026LiveGroupStandings", () => {
  describe("default local static mode", () => {
    it("returns a success response with official groups", () => {
      const result = getWorldCup2026LiveGroupStandings();
      expect(result.status).toBe("success");
      expect(result.dataScope).toBe("world_cup_2026_live_group_standings");
      expect(result.officialGroups).toHaveLength(12);
    });

    it("returns null for provisional and projected groups when no live matches exist", () => {
      const result = getWorldCup2026LiveGroupStandings();
      expect(result.provisionalGroups).toBeNull();
      expect(result.projectedGroups).toBeNull();
    });

    it("has zero active live matches in local static mode", () => {
      const result = getWorldCup2026LiveGroupStandings();
      expect(result.activeLiveMatchCount).toBe(0);
    });

    it("official standings are numerically identical to the static foundation standings", () => {
      const liveResult = getWorldCup2026LiveGroupStandings();
      const staticStandings = buildWorldCup2026GroupStandings();

      for (const staticGroup of staticStandings) {
        const liveGroup = liveResult.officialGroups.find((g) => g.group === staticGroup.group);
        expect(liveGroup).toBeDefined();
        if (liveGroup === undefined) continue;

        for (const staticEntry of staticGroup.standings) {
          const liveEntry = liveGroup.standings.find((e) => e.team === staticEntry.team);
          expect(liveEntry).toBeDefined();
          if (liveEntry === undefined) continue;
          expect(liveEntry.points).toBe(staticEntry.points);
          expect(liveEntry.played).toBe(staticEntry.played);
          expect(liveEntry.wins).toBe(staticEntry.wins);
          expect(liveEntry.draws).toBe(staticEntry.draws);
          expect(liveEntry.losses).toBe(staticEntry.losses);
          expect(liveEntry.goalsFor).toBe(staticEntry.goalsFor);
          expect(liveEntry.goalsAgainst).toBe(staticEntry.goalsAgainst);
          expect(liveEntry.goalDifference).toBe(staticEntry.goalDifference);
        }
      }
    });

    it("exposes resultProvider metadata with externalProviderEnabled false", () => {
      const result = getWorldCup2026LiveGroupStandings();
      expect(result.resultProvider.externalProviderEnabled).toBe(false);
      expect(result.resultProvider.providerName).toBe("local static provider");
    });

    it("syncMetadata includes all expected fields", () => {
      const result = getWorldCup2026LiveGroupStandings();
      expect(result.syncMetadata).toMatchObject({
        mode: "official",
        localFallbackUsed: true,
        externalProviderEnabled: false,
        activeLiveMatchCount: 0
      });
      expect(result.syncMetadata.generatedAt).toBeDefined();
      expect(new Date(result.syncMetadata.generatedAt).toISOString()).toBe(result.syncMetadata.generatedAt);
    });

    it("includes all 12 groups A through L", () => {
      const result = getWorldCup2026LiveGroupStandings();
      const groupLetters = result.officialGroups.map((g) => g.group).sort();
      expect(groupLetters).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]);
    });

    it("is deterministic across multiple calls", () => {
      const result1 = getWorldCup2026LiveGroupStandings();
      const result2 = getWorldCup2026LiveGroupStandings();
      expect(result1.completedMatchCount).toBe(result2.completedMatchCount);
      expect(result1.officialGroups.map((g) => g.group)).toEqual(result2.officialGroups.map((g) => g.group));
    });
  });

  describe("official standings mode with provided records", () => {
    it("official standings use only completed (finished) records", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord({ homeScore: 3, awayScore: 1 })],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      expect(groupA).toBeDefined();
      if (!groupA) return;

      const mexicoEntry = groupA.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.wins).toBe(1);
      expect(mexicoEntry?.points).toBe(3);
      expect(mexicoEntry?.goalsFor).toBe(3);
    });

    it("scheduled matches do not affect official standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord({ status: "scheduled" })],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      expect(groupA).toBeDefined();
      if (!groupA) return;

      const mexicoEntry = groupA.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.played).toBe(0);
      expect(mexicoEntry?.points).toBe(0);
    });

    it("postponed matches do not affect official standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({ status: "postponed" })
        ],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      if (!groupA) return;
      const entry = groupA.standings.find((e) => e.team === "Mexico");
      expect(entry?.played).toBe(0);
    });

    it("cancelled matches do not affect official standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({ status: "cancelled" })
        ],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      if (!groupA) return;
      const entry = groupA.standings.find((e) => e.team === "Mexico");
      expect(entry?.played).toBe(0);
    });

    it("live records in completedResults are not counted in official standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [liveRecord({ homeScore: 1, awayScore: 0 })],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      if (!groupA) return;
      const koreaEntry = groupA.standings.find((e) => e.team === "South Korea");
      expect(koreaEntry?.played).toBe(0);
    });
  });

  describe("live provisional standings", () => {
    it("returns provisional groups when live matches exist", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord()],
        liveMatches: [liveRecord()]
      });

      expect(result.provisionalGroups).not.toBeNull();
      expect(result.activeLiveMatchCount).toBe(1);
    });

    it("live match score updates provisional standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [],
        liveMatches: [liveRecord({ homeScore: 2, awayScore: 1 })]
      });

      expect(result.provisionalGroups).not.toBeNull();
      if (!result.provisionalGroups) return;

      const groupA = result.provisionalGroups.find((g) => g.group === "A");
      expect(groupA).toBeDefined();
      if (!groupA) return;

      const koreaEntry = groupA.standings.find((e) => e.team === "South Korea");
      expect(koreaEntry?.played).toBe(1);
      expect(koreaEntry?.wins).toBe(1);
      expect(koreaEntry?.points).toBe(3);
      expect(koreaEntry?.goalsFor).toBe(2);
    });

    it("halftime match is treated as live and included in provisional standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [],
        liveMatches: [liveRecord({ status: "halftime", homeScore: 1, awayScore: 1 })]
      });

      expect(result.provisionalGroups).not.toBeNull();
      if (!result.provisionalGroups) return;

      const groupA = result.provisionalGroups.find((g) => g.group === "A");
      if (!groupA) return;
      const koreaEntry = groupA.standings.find((e) => e.team === "South Korea");
      expect(koreaEntry?.draws).toBe(1);
      expect(koreaEntry?.points).toBe(1);
    });

    it("returns null for provisional groups when there are no live matches", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord()],
        liveMatches: []
      });

      expect(result.provisionalGroups).toBeNull();
    });

    it("official and provisional groups are different when live matches exist", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord()],
        liveMatches: [liveRecord({ homeScore: 1, awayScore: 0 })]
      });

      expect(result.officialGroups).not.toBe(result.provisionalGroups);

      const officialGroupA = result.officialGroups.find((g) => g.group === "A");
      const provisionalGroupA = result.provisionalGroups?.find((g) => g.group === "A");

      const officialKorea = officialGroupA?.standings.find((e) => e.team === "South Korea");
      const provisionalKorea = provisionalGroupA?.standings.find((e) => e.team === "South Korea");

      expect(officialKorea?.points).toBe(0);
      expect(provisionalKorea?.points).toBe(3);
    });

    it("finished result is not double-counted with a live record for the same fixture", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord({ homeScore: 2, awayScore: 0 })],
        liveMatches: [finishedRecord({ status: "live", homeScore: 1, awayScore: 0 })]
      });

      // The live record is detected so provisionalGroups is offered, but the
      // fixture is deduplicated: the finished score (2-0) takes precedence and
      // the live entry (1-0) is skipped in provisional groups too.
      expect(result.activeLiveMatchCount).toBe(1);
      expect(result.provisionalGroups).not.toBeNull();

      const officialGroupA = result.officialGroups.find((g) => g.group === "A");
      const officialMexico = officialGroupA?.standings.find((e) => e.team === "Mexico");
      expect(officialMexico?.played).toBe(1);
      expect(officialMexico?.goalsFor).toBe(2);

      if (result.provisionalGroups) {
        const provGroupA = result.provisionalGroups.find((g) => g.group === "A");
        const provMexico = provGroupA?.standings.find((e) => e.team === "Mexico");
        expect(provMexico?.played).toBe(1);
        expect(provMexico?.goalsFor).toBe(2);
      }
    });

    it("duplicate providerFixtureId records count only once in provisional standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [],
        liveMatches: [
          liveRecord({ homeScore: 1, awayScore: 0 }),
          liveRecord({ homeScore: 2, awayScore: 1 })
        ]
      });

      if (!result.provisionalGroups) return;
      const groupA = result.provisionalGroups.find((g) => g.group === "A");
      const koreaEntry = groupA?.standings.find((e) => e.team === "South Korea");
      expect(koreaEntry?.played).toBe(1);
    });

    it("scheduled records in liveMatches are ignored in provisional standings", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [],
        liveMatches: [
          liveRecord({ status: "scheduled" })
        ]
      });

      expect(result.provisionalGroups).toBeNull();
      expect(result.activeLiveMatchCount).toBe(0);
    });
  });

  describe("projected standings", () => {
    it("projected standings are always null in Phase 12.6", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord()],
        liveMatches: [liveRecord()]
      });
      expect(result.projectedGroups).toBeNull();
    });

    it("projected standings remain null even with external input provided", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord()]
      });
      expect(result.projectedGroups).toBeNull();
    });
  });

  describe("provider metadata", () => {
    it("exposes activeProvider from input when provided", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord()],
        liveMatches: [],
        activeProvider: "football_data_org_results_provider",
        externalProviderEnabled: true,
        localFallbackUsed: false
      });

      expect(result.syncMetadata.activeProvider).toBe("football_data_org_results_provider");
      expect(result.syncMetadata.externalProviderEnabled).toBe(true);
      expect(result.syncMetadata.localFallbackUsed).toBe(false);
    });

    it("includes cacheUsed in syncMetadata", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord()],
        liveMatches: [],
        cacheUsed: true,
        localFallbackUsed: false,
        activeProvider: "cached_external_results_provider"
      });

      expect(result.syncMetadata.cacheUsed).toBe(true);
    });

    it("never exposes a provider token in warnings or metadata", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [],
        liveMatches: []
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("token");
      expect(serialized).not.toContain("secret");
      expect(serialized).not.toContain("api_key");
    });

    it("includes generatedAt as an ISO timestamp", () => {
      const result = getWorldCup2026LiveGroupStandings();
      expect(result.syncMetadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("stale cache warning appears when cacheUsed is true", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [],
        liveMatches: [],
        cacheUsed: true,
        activeProvider: "cached_external"
      });

      const hasStaleWarning = result.syncMetadata.warnings.some((w) => w.toLowerCase().includes("cache"));
      expect(hasStaleWarning).toBe(true);
    });

    it("local fallback warning appears when localFallbackUsed is true in external mode", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [],
        liveMatches: [],
        localFallbackUsed: true,
        externalProviderEnabled: true,
        activeProvider: "local_static_results_provider"
      });

      const hasLocalWarning = result.syncMetadata.warnings.some((w) => w.toLowerCase().includes("local static"));
      expect(hasLocalWarning).toBe(true);
    });
  });

  describe("external provider record matching", () => {
    it("matches external records by team name when providerFixtureId does not match an internal fixture id", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: "999999",
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            homeScore: 1,
            awayScore: 0
          })
        ],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      const mexicoEntry = groupA?.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.played).toBe(1);
      expect(mexicoEntry?.wins).toBe(1);
    });

    it("ignores records where neither providerFixtureId nor team names match any internal fixture", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: "unknown-99",
            homeTeam: "Unknown FC",
            awayTeam: "Mystery United",
            homeScore: 5,
            awayScore: 0
          })
        ],
        liveMatches: []
      });

      for (const group of result.officialGroups) {
        for (const entry of group.standings) {
          expect(entry.played).toBe(0);
        }
      }
    });
  });
});
