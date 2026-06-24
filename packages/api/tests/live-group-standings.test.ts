import { describe, expect, it } from "vitest";
import {
  buildWorldCup2026GroupStandings,
  getWorldCup2026LiveGroupStandings,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES
} from "../src/index.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalStandingRecord,
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

function providerStanding(overrides: Partial<WorldCup2026ExternalStandingRecord> = {}): WorldCup2026ExternalStandingRecord {
  return {
    team: "Mexico",
    position: 1,
    played: 9,
    wins: 9,
    draws: 0,
    losses: 0,
    goalsFor: 99,
    goalsAgainst: 0,
    goalDifference: 99,
    points: 99,
    updatedAt: "2026-06-14",
    ...overrides
  };
}

function omitGroup(record: WorldCup2026ExternalFixtureRecord): WorldCup2026ExternalFixtureRecord {
  const withoutGroup = { ...record };
  delete withoutGroup.group;
  return withoutGroup;
}

function omitScores(record: WorldCup2026ExternalFixtureRecord): WorldCup2026ExternalFixtureRecord {
  const withoutScores = { ...record };
  delete withoutScores.homeScore;
  delete withoutScores.awayScore;
  return withoutScores;
}

function getGroupEntry(result: WorldCup2026LiveGroupStandingsResponse, group: string, team: string) {
  return result.officialGroups.find((g) => g.group === group)?.standings.find((entry) => entry.team === team);
}

function knownGroupKAndLCompletedRecords(): WorldCup2026ExternalFixtureRecord[] {
  return [
    finishedRecord({
      providerFixtureId: "fd-portugal-dr-congo",
      group: "GROUP_K",
      matchday: 1,
      homeTeam: "Portugal",
      awayTeam: "Congo DR",
      homeScore: 1,
      awayScore: 1,
      kickoffAt: "2026-06-17T00:00:00Z",
      updatedAt: "2026-06-17T02:00:00Z"
    }),
    finishedRecord({
      providerFixtureId: "fd-uzbekistan-colombia",
      group: "GROUP_K",
      matchday: 1,
      homeTeam: "Uzbekistan",
      awayTeam: "Colombia",
      homeScore: 1,
      awayScore: 3,
      kickoffAt: "2026-06-18T00:00:00Z",
      updatedAt: "2026-06-18T02:00:00Z"
    }),
    finishedRecord({
      providerFixtureId: "fd-portugal-uzbekistan",
      group: "GROUP_K",
      matchday: 2,
      homeTeam: "Portugal",
      awayTeam: "Uzbekistan",
      homeScore: 5,
      awayScore: 0,
      kickoffAt: "2026-06-23T18:00:00Z",
      updatedAt: "2026-06-23T20:00:00Z"
    }),
    finishedRecord({
      providerFixtureId: "fd-colombia-dr-congo",
      group: "GROUP_K",
      matchday: 2,
      homeTeam: "Colombia",
      awayTeam: "Congo DR",
      homeScore: 1,
      awayScore: 0,
      kickoffAt: "2026-06-24T03:00:00Z",
      updatedAt: "2026-06-24T05:00:00Z"
    }),
    finishedRecord({
      providerFixtureId: "fd-england-croatia",
      group: "GROUP_L",
      matchday: 1,
      homeTeam: "England",
      awayTeam: "Croatia",
      homeScore: 4,
      awayScore: 2,
      kickoffAt: "2026-06-17T18:00:00Z",
      updatedAt: "2026-06-17T20:00:00Z"
    }),
    finishedRecord({
      providerFixtureId: "fd-ghana-panama",
      group: "GROUP_L",
      matchday: 1,
      homeTeam: "Ghana",
      awayTeam: "Panama",
      homeScore: 1,
      awayScore: 0,
      kickoffAt: "2026-06-18T18:00:00Z",
      updatedAt: "2026-06-18T20:00:00Z"
    }),
    finishedRecord({
      providerFixtureId: "fd-england-ghana",
      group: "GROUP_L",
      matchday: 2,
      homeTeam: "England",
      awayTeam: "Ghana",
      homeScore: 0,
      awayScore: 0,
      kickoffAt: "2026-06-23T21:00:00Z",
      updatedAt: "2026-06-23T23:00:00Z"
    }),
    finishedRecord({
      providerFixtureId: "fd-panama-croatia",
      group: "GROUP_L",
      matchday: 2,
      homeTeam: "Panama",
      awayTeam: "Croatia",
      homeScore: 0,
      awayScore: 1,
      kickoffAt: "2026-06-24T03:00:00Z",
      updatedAt: "2026-06-24T05:00:00Z"
    })
  ];
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
    it("derives grouped standings from normalized real-style group-stage fixture records", () => {
      const completedResults = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.map((fixture, index) =>
        finishedRecord({
          providerFixtureId: `provider-${index + 1}`,
          group: `GROUP_${fixture.group}`,
          matchday: fixture.matchday,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          homeScore: 1,
          awayScore: 0,
          updatedAt: "2026-06-14T12:00:00Z"
        })
      );

      const result = getWorldCup2026LiveGroupStandings({
        completedResults,
        liveMatches: [],
        activeProvider: "football_data_org_results_provider",
        externalProviderEnabled: true,
        localFallbackUsed: false
      });

      expect(result.officialGroups).toHaveLength(12);
      expect(result.standingsIssues).toHaveLength(0);
      for (const group of result.officialGroups) {
        expect(group.completedFixtureCount).toBe(6);
        expect(group.pendingFixtureCount).toBe(0);
        expect(group.standings.reduce((sum, entry) => sum + entry.played, 0)).toBe(12);
      }
    });

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

    it("excludes completed records after the requested cutoff", () => {
      const result = getWorldCup2026LiveGroupStandings({
        cutoffAt: "2026-06-14T12:00:00Z",
        completedResults: [
          finishedRecord({
            homeScore: 3,
            awayScore: 0,
            updatedAt: "2026-06-14T12:00:01Z"
          })
        ],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      const mexicoEntry = groupA?.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.played).toBe(0);
      expect(result.standingsIssues.some((issue) => issue.code === "future_record_excluded")).toBe(true);
    });

    it("warns and skips invalid group labels without corrupting valid groups", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: "invalid-group",
            group: "GROUP_Z",
            homeScore: 5,
            awayScore: 0
          }),
          finishedRecord({
            providerFixtureId: "valid-group",
            group: "GROUP_A",
            homeScore: 2,
            awayScore: 0
          })
        ],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      const mexicoEntry = groupA?.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.played).toBe(1);
      expect(mexicoEntry?.goalsFor).toBe(2);
      expect(result.standingsIssues.some((issue) => issue.code === "invalid_group_label")).toBe(true);
    });

    it("warns on missing group labels but uses resolvable canonical fixtures", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          omitGroup(finishedRecord({
            homeScore: 2,
            awayScore: 0
          }))
        ],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      const mexicoEntry = groupA?.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.played).toBe(1);
      expect(result.standingsIssues.some((issue) => issue.code === "missing_group_label")).toBe(true);
    });

    it("warns and skips unresolved provider team names", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: "unknown-team",
            group: "GROUP_A",
            homeTeam: "Unknown FC",
            awayTeam: "South Africa",
            homeScore: 2,
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
      expect(result.standingsIssues.some((issue) => issue.code === "unresolved_canonical_team")).toBe(true);
    });

    it("warns and skips finished fixtures without valid scores", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          omitScores(finishedRecord())
        ],
        liveMatches: []
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      const mexicoEntry = groupA?.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.played).toBe(0);
      expect(result.standingsIssues.some((issue) => issue.code === "invalid_finished_score")).toBe(true);
    });

    it("does not use provider global standings as grouped truth", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [finishedRecord({ homeScore: 2, awayScore: 0 })],
        liveMatches: [],
        standings: [providerStanding({ team: "Mexico", played: 9, points: 99 })]
      });

      const groupA = result.officialGroups.find((g) => g.group === "A");
      const mexicoEntry = groupA?.standings.find((e) => e.team === "Mexico");
      expect(mexicoEntry?.played).toBe(1);
      expect(mexicoEntry?.points).toBe(3);
      expect(result.standingsIssues.some((issue) => issue.code === "provider_standings_not_grouped")).toBe(true);
      expect(result.standingsIssues.some((issue) => issue.code === "provider_global_standings_mismatch")).toBe(true);
    });

    it("counts all valid completed Group K and L real-style fixtures once, including reversed provider team order", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: knownGroupKAndLCompletedRecords(),
        liveMatches: [],
        activeProvider: "football_data_org_results_provider",
        externalProviderEnabled: true,
        localFallbackUsed: false
      });

      expect(result.completedMatchCount).toBe(8);
      expect(result.syncMetadata.completedMatchCount).toBe(8);
      expect(result.standingsIssues).toHaveLength(0);
      expect(result.projectedGroups).toBeNull();

      expect(getGroupEntry(result, "K", "Colombia")).toMatchObject({
        played: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        goalsFor: 4,
        goalsAgainst: 1,
        goalDifference: 3,
        points: 6
      });
      expect(getGroupEntry(result, "K", "Portugal")).toMatchObject({
        played: 2,
        wins: 1,
        draws: 1,
        losses: 0,
        goalsFor: 6,
        goalsAgainst: 1,
        goalDifference: 5,
        points: 4
      });
      expect(getGroupEntry(result, "K", "DR Congo")).toMatchObject({
        played: 2,
        wins: 0,
        draws: 1,
        losses: 1,
        goalsFor: 1,
        goalsAgainst: 2,
        goalDifference: -1,
        points: 1
      });
      expect(getGroupEntry(result, "K", "Uzbekistan")).toMatchObject({
        played: 2,
        wins: 0,
        draws: 0,
        losses: 2,
        goalsFor: 1,
        goalsAgainst: 8,
        goalDifference: -7,
        points: 0
      });

      expect(getGroupEntry(result, "L", "England")).toMatchObject({
        played: 2,
        wins: 1,
        draws: 1,
        losses: 0,
        goalsFor: 4,
        goalsAgainst: 2,
        goalDifference: 2,
        points: 4
      });
      expect(getGroupEntry(result, "L", "Ghana")).toMatchObject({
        played: 2,
        wins: 1,
        draws: 1,
        losses: 0,
        goalsFor: 1,
        goalsAgainst: 0,
        goalDifference: 1,
        points: 4
      });
      expect(getGroupEntry(result, "L", "Croatia")).toMatchObject({
        played: 2,
        wins: 1,
        draws: 0,
        losses: 1,
        goalsFor: 3,
        goalsAgainst: 4,
        goalDifference: -1,
        points: 3
      });
      expect(getGroupEntry(result, "L", "Panama")).toMatchObject({
        played: 2,
        wins: 0,
        draws: 0,
        losses: 2,
        goalsFor: 0,
        goalsAgainst: 2,
        goalDifference: -2,
        points: 0
      });
    });

    it("keeps completed metadata aligned to accepted official standings records", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: "fd-valid-mexico-south-africa",
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            homeScore: 2,
            awayScore: 0
          }),
          omitScores(finishedRecord({
            providerFixtureId: "fd-invalid-finished-score",
            homeTeam: "South Korea",
            awayTeam: "Czechia"
          }))
        ],
        liveMatches: []
      });

      expect(result.completedMatchCount).toBe(1);
      expect(result.syncMetadata.completedMatchCount).toBe(1);
      expect(result.syncMetadata.warnings.some((warning) => warning.includes("accepted 1 of 2"))).toBe(true);
      expect(result.standingsIssues.some((issue) => issue.code === "invalid_finished_score")).toBe(true);
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

    it("resolves reversed provider team-pair records and swaps scores into canonical fixture order", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: "fd-colombia-dr-congo",
            group: "GROUP_K",
            homeTeam: "Colombia",
            awayTeam: "Congo DR",
            homeScore: 1,
            awayScore: 0
          })
        ],
        liveMatches: []
      });

      const colombiaEntry = getGroupEntry(result, "K", "Colombia");
      const drCongoEntry = getGroupEntry(result, "K", "DR Congo");

      expect(colombiaEntry).toMatchObject({
        played: 1,
        wins: 1,
        goalsFor: 1,
        goalsAgainst: 0,
        points: 3
      });
      expect(drCongoEntry).toMatchObject({
        played: 1,
        losses: 1,
        goalsFor: 0,
        goalsAgainst: 1,
        points: 0
      });
      expect(result.standingsIssues.some((issue) => issue.code === "provider_fixture_unresolved")).toBe(false);
    });

    it("uses providerFixtureId-first resolution when it matches a canonical fixture id", () => {
      const canonicalFixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find(
        (fixture) => fixture.group === "K" && fixture.homeTeam === "DR Congo" && fixture.awayTeam === "Colombia"
      );
      expect(canonicalFixture).toBeDefined();
      if (canonicalFixture === undefined) return;

      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: canonicalFixture.id,
            group: "GROUP_K",
            homeTeam: "DR Congo",
            awayTeam: "Colombia",
            homeScore: 0,
            awayScore: 1
          })
        ],
        liveMatches: []
      });

      expect(getGroupEntry(result, "K", "Colombia")?.points).toBe(3);
      expect(result.standingsIssues).toHaveLength(0);
    });

    it("deduplicates direct and reversed records that resolve to the same canonical fixture", () => {
      const result = getWorldCup2026LiveGroupStandings({
        completedResults: [
          finishedRecord({
            providerFixtureId: "fd-dr-congo-colombia-direct",
            group: "GROUP_K",
            homeTeam: "DR Congo",
            awayTeam: "Colombia",
            homeScore: 0,
            awayScore: 1
          }),
          finishedRecord({
            providerFixtureId: "fd-colombia-dr-congo-reversed",
            group: "GROUP_K",
            homeTeam: "Colombia",
            awayTeam: "Congo DR",
            homeScore: 1,
            awayScore: 0
          })
        ],
        liveMatches: []
      });

      expect(result.completedMatchCount).toBe(1);
      expect(getGroupEntry(result, "K", "Colombia")?.played).toBe(1);
      expect(result.standingsIssues.some((issue) => issue.code === "duplicate_fixture")).toBe(true);
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
