import { describe, expect, test } from "vitest";
import type { WorldCup2026Fixture } from "@world-cup-2026-predictor/api";
import type {
  PredictMatchFromLiveEloSuccessResponse,
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesSuccessResponse,
  WorldCup2026LiveGroupStandingsResponse
} from "./api-client";
import {
  buildGeneratedFeaturedPrediction,
  buildHomeModelTrackRecordMetrics,
  getHomeGroupStatusDisplay,
  isHomePodiumSlotResolved,
  HOME_SECTION_IDS,
  HOME_SECTION_TITLES,
  selectHomeGroups,
  selectHomeMatches,
  selectStoredFeaturedPrediction,
  type HomeModelTrackRecordInput
} from "./home-dashboard";
import type { EvidenceCountTaxonomy } from "./model-evidence-center";

function match(overrides: Partial<WorldCup2026DailyMatchEntry>): WorldCup2026DailyMatchEntry {
  return {
    fixtureId: overrides.fixtureId ?? "fixture",
    group: overrides.group ?? "Group A",
    matchday: overrides.matchday ?? 1,
    kickoffAt: overrides.kickoffAt ?? "2026-06-20T16:00:00Z",
    localizedKickoff: overrides.localizedKickoff ?? "2026-06-20 11:00 GMT-5",
    homeTeam: overrides.homeTeam ?? "Mexico",
    awayTeam: overrides.awayTeam ?? "South Africa",
    normalizedStatus: overrides.normalizedStatus ?? "SCHEDULED",
    state: overrides.state ?? "upcoming",
    homeScore: overrides.homeScore,
    awayScore: overrides.awayScore,
    predictionSnapshot: overrides.predictionSnapshot ?? { available: false },
    predictionHistory: overrides.predictionHistory ?? {
      snapshot: { available: false },
      evaluation: { available: false },
      warnings: []
    },
    ...(overrides.matchContext === undefined ? {} : { matchContext: overrides.matchContext })
  } as WorldCup2026DailyMatchEntry;
}

function dailyMatches(matches: WorldCup2026DailyMatchEntry[]): WorldCup2026DailyMatchesSuccessResponse {
  return {
    status: "success",
    requestedDate: "2026-06-20",
    timezone: "America/Bogota",
    generatedAt: "2026-06-20T12:00:00Z",
    matches,
    unscheduledMatches: [],
    counts: {
      total: matches.length,
      upcoming: matches.filter((entry) => entry.state === "upcoming").length,
      live: matches.filter((entry) => entry.state === "live").length,
      halftime: matches.filter((entry) => entry.state === "halftime").length,
      final: matches.filter((entry) => entry.state === "final").length,
      postponed: 0,
      cancelled: 0,
      unknown: 0,
      unavailableKickoff: 0
    },
    providerMetadata: {
      configuredProvider: "local_static",
      activeProvider: "local_static_results_provider",
      externalRequestAttempted: false,
      cacheUsed: false,
      localFallbackUsed: true,
      stale: false
    },
    issues: [],
    warnings: [],
    metadata: {
      apiVersion: "1.0.0",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: []
    }
  };
}

function standings(): WorldCup2026LiveGroupStandingsResponse {
  const groups = ["A", "B", "C", "D", "E"].map((group, index) => ({
    group,
    groupName: `Group ${group}`,
    completedFixtureCount: index,
    pendingFixtureCount: 6 - index,
    standings: [
      { team: "Mexico", played: 1, wins: 1, draws: 0, losses: 0, goalsFor: 2, goalsAgainst: 0, goalDifference: 2, points: 3 },
      { team: "South Africa", played: 1, wins: 0, draws: 0, losses: 1, goalsFor: 0, goalsAgainst: 2, goalDifference: -2, points: 0 },
      { team: "South Korea", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }
    ]
  }));

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_live_group_standings",
    groupCount: groups.length,
    teamCount: groups.length * 4,
    officialGroups: groups,
    provisionalGroups: null,
    projectedGroups: null,
    activeLiveMatchCount: 0,
    completedMatchCount: 0,
    syncMetadata: {
      mode: "official",
      activeProvider: "local_static_results_provider",
      cacheUsed: false,
      localFallbackUsed: true,
      externalProviderEnabled: false,
      generatedAt: "2026-06-20T12:00:00Z",
      activeLiveMatchCount: 0,
      completedMatchCount: 0,
      warnings: []
    },
    standingsIssues: [],
    resultProvider: {
      providerName: "local static provider",
      resultSource: "local_static",
      externalProviderEnabled: false,
      localOverridesEnabled: true,
      resultsCount: 0,
      warnings: []
    },
    warnings: [],
    metadata: {
      apiVersion: "1.0.0",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: []
    }
  };
}

describe("home dashboard architecture", () => {
  test("defines exactly eight primary sections in the approved order", () => {
    expect(HOME_SECTION_IDS).toEqual([
      "home-intro",
      "home-todays-matches",
      "home-featured-prediction",
      "home-group-snapshot",
      "home-tournament-outlook",
      "home-model-track-record",
      "home-quick-actions",
      "home-technical-status"
    ]);
    expect(HOME_SECTION_TITLES).toHaveLength(8);
  });
});

describe("selectHomeMatches", () => {
  test("prioritizes live, upcoming, then final matches and caps at four", () => {
    const selected = selectHomeMatches(
      dailyMatches([
        match({ fixtureId: "final-old", state: "final", kickoffAt: "2026-06-20T10:00:00Z" }),
        match({ fixtureId: "upcoming-late", state: "upcoming", kickoffAt: "2026-06-20T20:00:00Z" }),
        match({ fixtureId: "live", state: "live", kickoffAt: "2026-06-20T18:00:00Z" }),
        match({ fixtureId: "upcoming-early", state: "upcoming", kickoffAt: "2026-06-20T16:00:00Z" }),
        match({ fixtureId: "final-new", state: "final", kickoffAt: "2026-06-20T14:00:00Z" })
      ])
    );

    expect(selected.map((entry) => entry.fixtureId)).toEqual([
      "live",
      "upcoming-early",
      "upcoming-late",
      "final-new"
    ]);
  });

  test("returns an empty state source when no matches are available", () => {
    expect(selectHomeMatches(dailyMatches([]))).toEqual([]);
  });
});

describe("selectStoredFeaturedPrediction", () => {
  test("uses the next upcoming stored pre-match prediction when available", () => {
    const selected = selectStoredFeaturedPrediction(
      dailyMatches([
        match({ fixtureId: "live-no-snapshot", state: "live" }),
        match({
          fixtureId: "stored",
          state: "upcoming",
          predictionSnapshot: { available: true },
          predictionHistory: {
            snapshot: {
              available: true,
              status: "pre_match_locked",
              prediction: {
                homeExpectedGoals: 1.4,
                awayExpectedGoals: 0.8,
                homeWinProbability: 0.55,
                drawProbability: 0.27,
                awayWinProbability: 0.18,
                projectedScoreline: { homeGoals: 1, awayGoals: 0 },
                confidenceLevel: "medium",
                coverageType: "partial"
              }
            },
            evaluation: { available: false },
            warnings: []
          }
        })
      ])
    );

    expect(selected?.fixtureId).toBe("stored");
    expect(selected?.projectedScore).toEqual({ home: 1, away: 0 });
    expect(selected?.confidenceLevel).toBe("medium");
  });

  test("returns null when no stored upcoming prediction exists", () => {
    expect(selectStoredFeaturedPrediction(dailyMatches([match({ state: "upcoming" })]))).toBeNull();
  });
});

describe("selectHomeGroups", () => {
  test("caps group snapshots at four and prioritizes live/today groups", () => {
    const selected = selectHomeGroups(
      standings(),
      dailyMatches([
        match({ group: "Group C", state: "upcoming" }),
        match({ group: "Group B", state: "live" })
      ])
    );

    expect(selected).toHaveLength(4);
    expect(selected[0]?.group).toBe("B");
    expect(selected[1]?.group).toBe("C");
  });
});

function taxonomy(overrides: Partial<EvidenceCountTaxonomy> = {}): EvidenceCountTaxonomy {
  return {
    storedSnapshotCount: 12,
    evaluationRecordCount: 9,
    uniqueEvaluatedFixtureCount: 9,
    pendingEvaluationCount: 3,
    evidenceDisplayThreshold: 8,
    recalibrationReviewThreshold: 20,
    ...overrides
  };
}

describe("buildHomeModelTrackRecordMetrics", () => {
  test("formats evidence values and preliminary status using the /model taxonomy", () => {
    const input: HomeModelTrackRecordInput = {
      taxonomy: taxonomy(),
      outcomeAccuracy: 4 / 9
    };

    expect(buildHomeModelTrackRecordMetrics(input)).toEqual([
      { label: "Evaluation records", value: "9", detail: "12 stored snapshots" },
      { label: "Unique evaluated fixtures", value: "9", detail: "Recalibration review at 20" },
      { label: "Outcome accuracy", value: "44%", detail: "Winner/draw result" },
      { label: "Sample status", value: "Evidence still preliminary", detail: "3 pending evaluations" }
    ]);
  });

  test("reports evidence sample growing once unique fixtures reach the recalibration threshold", () => {
    const input: HomeModelTrackRecordInput = {
      taxonomy: taxonomy({ uniqueEvaluatedFixtureCount: 20, pendingEvaluationCount: 0 }),
      outcomeAccuracy: 0.5
    };

    const metrics = buildHomeModelTrackRecordMetrics(input);
    expect(metrics.find((m) => m.label === "Sample status")).toEqual({
      label: "Sample status",
      value: "Evidence sample growing",
      detail: "0 pending evaluations"
    });
  });

  test("reports evidence collection in progress when no fixtures are evaluated yet", () => {
    const input: HomeModelTrackRecordInput = {
      taxonomy: taxonomy({ uniqueEvaluatedFixtureCount: 0, evaluationRecordCount: 0 }),
      outcomeAccuracy: null
    };

    const metrics = buildHomeModelTrackRecordMetrics(input);
    expect(metrics.find((m) => m.label === "Sample status")?.value).toBe("Evidence collection in progress");
    expect(metrics.find((m) => m.label === "Outcome accuracy")?.value).toBe("In progress");
  });

  test("degrades gracefully when evidence is unavailable", () => {
    expect(buildHomeModelTrackRecordMetrics(null)).toEqual([
      {
        label: "Evidence status",
        value: "In progress",
        detail: "History evidence is unavailable during this render."
      }
    ]);
  });
});

describe("buildGeneratedFeaturedPrediction", () => {
  const fixture: WorldCup2026Fixture = {
    id: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    group: "A",
    matchday: 1,
    order: 1,
    groupFixtureOrder: 1,
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    status: "scheduled",
    dateStatus: "deferred",
    venueStatus: "deferred"
  };

  // Only the fields the builder reads are stubbed; the full success-response
  // shape is irrelevant to this presentation-copy test.
  const prediction = {
    mostLikelyScorelines: [{ homeGoals: 2, awayGoals: 1, probability: 0.11 }],
    outcomeProbabilities: {
      homeWinProbability: 0.5,
      drawProbability: 0.3,
      awayWinProbability: 0.2
    },
    predictionConfidence: { level: "medium", coverageType: "partial" }
  } as unknown as PredictMatchFromLiveEloSuccessResponse;

  test("uses portfolio-friendly live-preview copy instead of internal snapshot wording", () => {
    const featured = buildGeneratedFeaturedPrediction(fixture, prediction);

    expect(featured.context).toBe(
      "Live preview from the current Elo/xG model. Saved prediction history remains unchanged."
    );
    expect(featured.context).not.toContain("without creating a saved snapshot");
  });
});

describe("getHomeGroupStatusDisplay", () => {
  test("reports Complete when every group fixture has finished", () => {
    expect(getHomeGroupStatusDisplay({ completedFixtureCount: 6, pendingFixtureCount: 0 })).toEqual({
      label: "Complete",
      variant: "success"
    });
  });

  test("reports In progress when some fixtures have finished and some remain", () => {
    expect(getHomeGroupStatusDisplay({ completedFixtureCount: 2, pendingFixtureCount: 4 })).toEqual({
      label: "In progress",
      variant: "info"
    });
  });

  test("reports Not started when no fixtures have finished", () => {
    expect(getHomeGroupStatusDisplay({ completedFixtureCount: 0, pendingFixtureCount: 6 })).toEqual({
      label: "Not started",
      variant: "neutral"
    });
  });
});

describe("isHomePodiumSlotResolved", () => {
  test("treats a known World Cup 2026 team as resolved", () => {
    expect(isHomePodiumSlotResolved("Brazil")).toBe(true);
  });

  test("treats the projection's literal Unavailable sentinel as unresolved", () => {
    expect(isHomePodiumSlotResolved("Unavailable")).toBe(false);
  });

  test("treats any string that does not map to a known team identity as unresolved", () => {
    expect(isHomePodiumSlotResolved("Winner of match 104")).toBe(false);
  });
});
