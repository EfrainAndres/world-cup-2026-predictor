import { describe, expect, it } from "vitest";
import {
  buildWorldCup2026DailyMatches,
  createInMemorySnapshotStore,
  getWorldCup2026DailyMatches,
  getWorldCup2026LiveGroupStandings,
  predictMatchFromLiveElo
} from "../src/index.js";
import type {
  PredictionConfidenceAssessment,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026PredictionSnapshot,
  WorldCup2026SyncResult
} from "../src/index.js";

function record(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> & {
    providerFixtureId: string;
    homeTeam: string;
    awayTeam: string;
    status: WorldCup2026ExternalFixtureRecord["status"];
  }
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: overrides.providerFixtureId,
    competition: "FIFA World Cup",
    season: "2026",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    status: overrides.status,
    ...(overrides.kickoffAt === undefined ? {} : { kickoffAt: overrides.kickoffAt }),
    ...(overrides.group === undefined ? {} : { group: overrides.group }),
    ...(overrides.matchday === undefined ? {} : { matchday: overrides.matchday }),
    ...(overrides.homeScore === undefined ? {} : { homeScore: overrides.homeScore }),
    ...(overrides.awayScore === undefined ? {} : { awayScore: overrides.awayScore }),
    ...(overrides.venue === undefined ? {} : { venue: overrides.venue }),
    ...(overrides.updatedAt === undefined ? {} : { updatedAt: overrides.updatedAt })
  };
}

function syncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: "2026-06-14T12:00:00Z",
    lastSuccessfulSync: "2026-06-14T12:00:00Z",
    fixtures: [],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

const BASE_CONFIDENCE: PredictionConfidenceAssessment = {
  level: "medium",
  coverageType: "partial",
  reasons: [],
  dataPoints: {
    homeUsesFallback: false,
    awayUsesFallback: false,
    homeMatchesPlayed: 10,
    awayMatchesPlayed: 10,
    historicalMatchesAvailable: 100,
    latestMatchDate: "2026-06-10",
    currentTournamentMatchesIncluded: 0,
    attackDefenseAvailable: false
  },
  manualXgRecommended: false
};

function snapshot(overrides: Partial<WorldCup2026PredictionSnapshot>): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: overrides.snapshotId ?? "snap-1",
    fixtureId: overrides.fixtureId ?? "wc2026-group-a-md1-01-mexico-vs-south-africa",
    status: overrides.status ?? "pre_match_locked",
    capturedAt: overrides.capturedAt ?? "2026-06-11T16:00:00Z",
    cutoffAt: overrides.cutoffAt ?? "2026-06-11T16:00:00Z",
    kickoffAt: overrides.kickoffAt ?? "2026-06-11T18:00:00Z",
    group: overrides.group ?? "A",
    matchday: overrides.matchday ?? 1,
    homeTeam: overrides.homeTeam ?? "Mexico",
    awayTeam: overrides.awayTeam ?? "South Africa",
    modelVersion: overrides.modelVersion ?? "wc2026-model-v1",
    modelConfiguration: overrides.modelConfiguration ?? {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: overrides.inputs ?? {
      homeElo: 1600,
      awayElo: 1450,
      homeUsesFallback: false,
      awayUsesFallback: false,
      tournamentMatchesIncluded: 0
    },
    prediction: overrides.prediction ?? {
      homeExpectedGoals: 1.5,
      awayExpectedGoals: 0.9,
      homeWinProbability: 0.55,
      drawProbability: 0.25,
      awayWinProbability: 0.2,
      mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.12 }]
    },
    confidence: overrides.confidence ?? BASE_CONFIDENCE,
    provenance: overrides.provenance ?? {},
    contentHash: overrides.contentHash ?? "hash"
  };
}

describe("buildWorldCup2026DailyMatches", () => {
  it("filters by requested date in UTC and orders by kickoff then fixture id", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC",
      generatedAt: "2026-06-11T00:00:00Z",
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "z-fixture",
            homeTeam: "South Korea",
            awayTeam: "Czechia",
            status: "scheduled",
            kickoffAt: "2026-06-11T20:00:00Z"
          }),
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "scheduled",
            kickoffAt: "2026-06-11T18:00:00Z"
          }),
          record({
            providerFixtureId: "a-fixture",
            homeTeam: "Canada",
            awayTeam: "Bosnia-Herzegovina",
            status: "scheduled",
            kickoffAt: "2026-06-11T20:00:00Z"
          }),
          record({
            providerFixtureId: "next-day",
            homeTeam: "Brazil",
            awayTeam: "Morocco",
            status: "scheduled",
            kickoffAt: "2026-06-12T00:30:00Z"
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches.map((match) => match.providerFixtureId)).toEqual([
      "wc2026-group-a-md1-01-mexico-vs-south-africa",
      "z-fixture",
      "a-fixture"
    ]);
    expect(result.counts.total).toBe(3);
    expect(result.counts.upcoming).toBe(3);
  });

  it("filters by localized calendar date across timezone boundaries", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "America/New_York",
      generatedAt: "2026-06-11T00:00:00Z",
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "late-night",
            homeTeam: "Brazil",
            awayTeam: "Morocco",
            status: "scheduled",
            kickoffAt: "2026-06-12T00:30:00Z"
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.localizedKickoff).toContain("2026-06-11");
  });

  it("maps normalized statuses and preserves valid final scores", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC",
      generatedAt: "2026-06-11T00:00:00Z",
      syncResult: syncResult({
        fixtures: [
          record({ providerFixtureId: "f1", homeTeam: "Mexico", awayTeam: "South Africa", status: "scheduled", kickoffAt: "2026-06-11T10:00:00Z" }),
          record({ providerFixtureId: "f2", homeTeam: "South Korea", awayTeam: "Czechia", status: "live", kickoffAt: "2026-06-11T11:00:00Z", homeScore: 1, awayScore: 0 }),
          record({ providerFixtureId: "f3", homeTeam: "Canada", awayTeam: "Bosnia-Herzegovina", status: "halftime", kickoffAt: "2026-06-11T12:00:00Z", homeScore: 0, awayScore: 0 }),
          record({ providerFixtureId: "f4", homeTeam: "Brazil", awayTeam: "Morocco", status: "finished", kickoffAt: "2026-06-11T13:00:00Z", homeScore: 2, awayScore: 1 }),
          record({ providerFixtureId: "f5", homeTeam: "United States", awayTeam: "Paraguay", status: "postponed", kickoffAt: "2026-06-11T14:00:00Z" }),
          record({ providerFixtureId: "f6", homeTeam: "Australia", awayTeam: "Turkey", status: "cancelled", kickoffAt: "2026-06-11T15:00:00Z" }),
          record({ providerFixtureId: "f7", homeTeam: "Germany", awayTeam: "Curacao", status: "unknown", kickoffAt: "2026-06-11T16:00:00Z" })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches.map((match) => match.state)).toEqual([
      "upcoming",
      "live",
      "halftime",
      "final",
      "postponed",
      "cancelled",
      "unknown"
    ]);
    const final = result.matches.find((match) => match.providerFixtureId === "f4");
    expect(final).toMatchObject({ homeScore: 2, awayScore: 1, state: "final" });
  });

  it("separates fixtures without kickoff metadata into unscheduled matches", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC",
      generatedAt: "2026-06-11T00:00:00Z",
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "scheduled"
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches).toHaveLength(0);
    expect(result.unscheduledMatches).toHaveLength(1);
    expect(result.counts.unavailableKickoff).toBe(1);
    expect(result.issues[0]?.code).toBe("missing_kickoff");
  });

  it("rejects invalid date and invalid timezone with the validation error shape", () => {
    const invalidDate = buildWorldCup2026DailyMatches({
      date: "2026-13-44",
      timezone: "UTC",
      syncResult: syncResult()
    });
    const invalidTimezone = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "Mars/Base",
      syncResult: syncResult()
    });

    expect(invalidDate.status).toBe("validation_error");
    expect(invalidTimezone.status).toBe("validation_error");
    if (invalidDate.status === "validation_error") {
      expect(invalidDate.issues).toEqual([{ field: "date", message: "date must use YYYY-MM-DD." }]);
    }
    if (invalidTimezone.status === "validation_error") {
      expect(invalidTimezone.issues).toEqual([{ field: "timezone", message: "timezone must be a valid IANA timezone." }]);
    }
  });

  it("rejects duplicate fixtures and invalid finished scores without breaking valid matches", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC",
      syncResult: syncResult({
        fixtures: [
          record({ providerFixtureId: "dup", homeTeam: "Mexico", awayTeam: "South Africa", status: "scheduled", kickoffAt: "2026-06-11T10:00:00Z" }),
          record({ providerFixtureId: "dup", homeTeam: "Mexico", awayTeam: "South Africa", status: "scheduled", kickoffAt: "2026-06-11T10:00:00Z" }),
          record({ providerFixtureId: "bad-final", homeTeam: "South Korea", awayTeam: "Czechia", status: "finished", kickoffAt: "2026-06-11T11:00:00Z" })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches).toHaveLength(1);
    expect(result.issues.map((issue) => issue.code).sort()).toEqual([
      "duplicate_fixture",
      "invalid_finished_score"
    ]);
  });

  it("propagates provider and fallback metadata without exposing secrets", () => {
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC",
      syncResult: syncResult({
        providerMode: "football_data_org",
        activeProvider: "cached_provider",
        cacheUsed: true,
        localFallbackUsed: false,
        externalProviderEnabled: true,
        warnings: ["upstream unavailable"],
        fixtures: []
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.providerMetadata).toEqual({
      configuredProvider: "football_data_org",
      activeProvider: "cached_provider",
      externalRequestAttempted: true,
      cacheUsed: true,
      localFallbackUsed: false,
      lastSuccessfulSync: "2026-06-14T12:00:00Z",
      stale: true
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("associates the latest valid pre-kickoff snapshot deterministically", () => {
    const store = createInMemorySnapshotStore();
    store.create(snapshot({ snapshotId: "snap-older", capturedAt: "2026-06-11T15:00:00Z" }), "older");
    store.create(snapshot({ snapshotId: "snap-newer", capturedAt: "2026-06-11T16:00:00Z" }), "newer");
    store.create(
      snapshot({
        snapshotId: "snap-post-kickoff",
        capturedAt: "2026-06-11T19:00:00Z",
        status: "foundation_unverified"
      }),
      "post"
    );

    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC",
      snapshotStore: store,
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "scheduled",
            kickoffAt: "2026-06-11T18:00:00Z"
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches[0]?.predictionSnapshot).toEqual({
      available: true,
      snapshotId: "snap-newer",
      capturedAt: "2026-06-11T16:00:00Z",
      modelVersion: "wc2026-model-v1"
    });
  });

  it("does not create snapshots automatically and defaults to unavailable when none exist", () => {
    const store = createInMemorySnapshotStore();
    const result = buildWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC",
      snapshotStore: store,
      syncResult: syncResult({
        fixtures: [
          record({
            providerFixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "scheduled",
            kickoffAt: "2026-06-11T18:00:00Z"
          })
        ]
      })
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.matches[0]?.predictionSnapshot).toEqual({ available: false });
    expect(store.list()).toHaveLength(0);
  });
});

describe("getWorldCup2026DailyMatches", () => {
  it("returns deterministic local-mode data without network configuration", async () => {
    const result = await getWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC"
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.providerMetadata.configuredProvider).toBe("local_static");
    expect(result.providerMetadata.localFallbackUsed).toBe(true);
  });

  it("does not change existing standings or prediction behavior", async () => {
    const standingsBefore = getWorldCup2026LiveGroupStandings();
    const predictionBefore = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia"
    });

    await getWorldCup2026DailyMatches({
      date: "2026-06-11",
      timezone: "UTC"
    });

    const standingsAfter = getWorldCup2026LiveGroupStandings();
    const predictionAfter = predictMatchFromLiveElo({
      homeTeam: "England",
      awayTeam: "Croatia"
    });

    expect(standingsAfter.officialGroups).toEqual(standingsBefore.officialGroups);
    expect(standingsAfter.resultProvider).toEqual(standingsBefore.resultProvider);
    expect(predictionAfter).toEqual(predictionBefore);
  });
});
