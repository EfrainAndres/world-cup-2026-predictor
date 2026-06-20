import { describe, expect, it } from "vitest";
import {
  apiRoutes,
  apiRuntime,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getLiveEloRatingsFoundation,
  getTeamRatingsFoundation,
  getWorldCup2026FixtureFoundation,
  getWorldCup2026ResultsProviderFoundation,
  getWorldCup2026GroupStandingsFoundation,
  getWorldCup2026RoundOf32Foundation,
  predictMatchFromLiveElo,
  simulateMatch,
  simulateTournamentFoundation,
  type ApiMetadata,
  type ApiRuntimeFailureResponse,
  type ApiValidationIssue
} from "../src/index.js";

interface OutcomeProbabilitiesContract {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  totalProbability: number;
}

interface ScorelineContract {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

interface ValidationErrorContract {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  metadata: ApiMetadata;
}

function expectMetadataContract(metadata: ApiMetadata): void {
  expect(metadata).toEqual({
    apiVersion: expect.any(String),
    mode: "pure_handlers",
    serverEnabled: false,
    databaseEnabled: false,
    externalServicesEnabled: false,
    notes: expect.any(Array)
  });
  expect(metadata.apiVersion.length).toBeGreaterThan(0);
  expect(metadata.notes.length).toBeGreaterThan(0);
  for (const note of metadata.notes) {
    expect(note.length).toBeGreaterThan(0);
  }
}

function expectWarningsContract(warnings: readonly string[]): void {
  expect(Array.isArray(warnings)).toBe(true);
  expect(warnings.length).toBeGreaterThan(0);
  for (const warning of warnings) {
    expect(warning.length).toBeGreaterThan(0);
  }
}

function expectProbabilitiesContract(probabilities: OutcomeProbabilitiesContract): void {
  expect(Object.keys(probabilities).sort()).toEqual([
    "awayWinProbability",
    "drawProbability",
    "homeWinProbability",
    "totalProbability"
  ]);

  for (const value of [probabilities.homeWinProbability, probabilities.drawProbability, probabilities.awayWinProbability]) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
  expect(Number.isFinite(probabilities.totalProbability)).toBe(true);
  expect(probabilities.totalProbability).toBeGreaterThanOrEqual(0);

  expect(
    probabilities.homeWinProbability + probabilities.drawProbability + probabilities.awayWinProbability
  ).toBeCloseTo(probabilities.totalProbability, 10);
  expect(probabilities.totalProbability).toBeCloseTo(1, 10);
}

function expectScorelinesContract(scorelines: readonly ScorelineContract[]): void {
  expect(scorelines.length).toBeGreaterThan(0);

  for (const scoreline of scorelines) {
    expect(Object.keys(scoreline).sort()).toEqual(["awayGoals", "homeGoals", "probability"]);
    expect(Number.isInteger(scoreline.homeGoals)).toBe(true);
    expect(Number.isInteger(scoreline.awayGoals)).toBe(true);
    expect(scoreline.homeGoals).toBeGreaterThanOrEqual(0);
    expect(scoreline.awayGoals).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(scoreline.probability)).toBe(true);
    expect(scoreline.probability).toBeGreaterThanOrEqual(0);
    expect(scoreline.probability).toBeLessThanOrEqual(1);
  }
}

function expectValidationErrorContract(response: ValidationErrorContract, expectedFields: readonly string[]): void {
  expect(response.status).toBe("validation_error");
  expect(response.issues.length).toBeGreaterThan(0);
  expectMetadataContract(response.metadata);

  const fields = response.issues.map((issue) => issue.field);
  for (const expectedField of expectedFields) {
    expect(fields).toContain(expectedField);
  }

  for (const issue of response.issues) {
    expect(issue.message.length).toBeGreaterThan(0);
    if (issue.suggestions !== undefined) {
      expect(Array.isArray(issue.suggestions)).toBe(true);
    }
  }
}

function endpointRequest(pathname: string, init?: RequestInit): Request {
  return new Request(`http://api-contracts.test${pathname}`, init);
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("api contract coverage", () => {
  it("validates the health contract", () => {
    const response = apiRoutes.getHealth();

    expect(Object.keys(response).sort()).toEqual(["metadata", "service", "status", "version"]);
    expect(response).toMatchObject({
      status: "ok",
      service: "world-cup-2026-predictor-api",
      version: expect.any(String)
    });
    expectMetadataContract(response.metadata);
  });

  it("validates the model-info contract and supported handler consistency", () => {
    const response = apiRoutes.getModelInfo();

    expect(Object.keys(response).sort()).toEqual(["limitations", "metadata", "modelPackage", "modelScope", "status", "supportedHandlers"]);
    expect(response.status).toBe("ok");
    expect(response.modelPackage).toBe("@world-cup-2026-predictor/model");
    expect(response.supportedHandlers).toEqual([
      "getHealth",
      "getModelInfo",
      "simulateMatch",
      "getHistoricalTournamentSummary",
      "getHistoricalReplayAudit",
      "predictMatchFromLiveElo",
      "simulateTournamentFoundation",
      "getTeamRatingsFoundation",
      "getLiveEloRatingsFoundation",
      "getWorldCup2026FixtureFoundation",
      "getWorldCup2026ResultsProviderFoundation",
      "getWorldCup2026GroupStandingsFoundation",
      "getWorldCup2026RoundOf32Foundation",
      "getWorldCup2026KnockoutBracketFoundation",
      "simulateWorldCup2026KnockoutFixturesFoundation",
      "simulateWorldCup2026RoundOf16Foundation",
      "simulateWorldCup2026RoundOf16MatchesFoundation",
      "simulateWorldCup2026QuarterfinalFoundation",
      "simulateWorldCup2026QuarterfinalMatchesFoundation",
      "simulateWorldCup2026SemifinalFoundation",
      "simulateWorldCup2026SemifinalMatchesFoundation",
      "simulateWorldCup2026FinalFoundation",
      "simulateWorldCup2026FinalMatchFoundation",
      "resolveWorldCup2026KnockoutWinnersFoundation",
      "getWorldCup2026ThirdPlaceMatchFoundation",
      "simulateWorldCup2026ThirdPlaceMatchFoundation",
      "getWorldCup2026LiveGroupStandings",
      "getWorldCup2026EloIngestionFoundation",
      "getWorldCup2026TournamentFormFoundation",
      "createWorldCup2026PredictionSnapshot",
      "getWorldCup2026PredictionSnapshot",
      "listWorldCup2026PredictionSnapshots",
      "createWorldCup2026PredictionEvaluation",
      "getWorldCup2026PredictionEvaluation",
      "listWorldCup2026PredictionEvaluations",
      "getWorldCup2026ModelRealitySummary"
    ]);

    for (const routeHandler of Object.keys(apiRoutes)) {
      expect(response.supportedHandlers).toContain(routeHandler);
    }

    expect(response.limitations).toContain("No database or external services are used.");
    expectMetadataContract(response.metadata);
  });

  it("validates the final match simulation foundation contract", () => {
    const response = apiRoutes.simulateWorldCup2026FinalMatchFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "dataScope",
      "fixtures",
      "metadata",
      "round",
      "simulatedFixturesCount",
      "simulationType",
      "source",
      "status",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.dataScope).toBe("world_cup_2026_final_match_simulation_foundation");
    expect(response.round).toBe("final");
    expect(response.source).toBe("projected_final");
    expect(response.simulatedFixturesCount).toBe(1);
    expect(response.fixtures).toHaveLength(1);

    const fixture = response.fixtures[0];
    expect(fixture).toEqual({
      fixtureId: expect.any(String),
      round: "final",
      slot: 1,
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      homeExpectedGoals: expect.any(Number),
      awayExpectedGoals: expect.any(Number),
      homeWinProbability: expect.any(Number),
      drawProbability: expect.any(Number),
      awayWinProbability: expect.any(Number),
      mostLikelyScorelines: expect.any(Array),
      homeRatingSource: expect.any(String),
      awayRatingSource: expect.any(String),
      warnings: expect.any(Array)
    });
    expectProbabilitiesContract({
      homeWinProbability: fixture.homeWinProbability,
      drawProbability: fixture.drawProbability,
      awayWinProbability: fixture.awayWinProbability,
      totalProbability: fixture.homeWinProbability + fixture.drawProbability + fixture.awayWinProbability
    });
    expectScorelinesContract(fixture.mostLikelyScorelines);
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the third place match simulation foundation contract", () => {
    const response = apiRoutes.simulateWorldCup2026ThirdPlaceMatchFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "dataScope",
      "fixtures",
      "metadata",
      "round",
      "simulatedFixturesCount",
      "simulationType",
      "source",
      "status",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.dataScope).toBe("world_cup_2026_third_place_match_simulation_foundation");
    expect(response.round).toBe("third_place");
    expect(response.source).toBe("projected_third_place_match");
    expect(response.simulatedFixturesCount).toBe(1);
    expect(response.fixtures).toHaveLength(1);

    const fixture = response.fixtures[0];
    expect(fixture).toEqual({
      fixtureId: expect.any(String),
      round: "third_place",
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      homeExpectedGoals: expect.any(Number),
      awayExpectedGoals: expect.any(Number),
      homeWinProbability: expect.any(Number),
      drawProbability: expect.any(Number),
      awayWinProbability: expect.any(Number),
      mostLikelyScorelines: expect.any(Array),
      homeRatingSource: expect.any(String),
      awayRatingSource: expect.any(String),
      warnings: expect.any(Array)
    });
    expectProbabilitiesContract({
      homeWinProbability: fixture.homeWinProbability,
      drawProbability: fixture.drawProbability,
      awayWinProbability: fixture.awayWinProbability,
      totalProbability: fixture.homeWinProbability + fixture.drawProbability + fixture.awayWinProbability
    });
    expectScorelinesContract(fixture.mostLikelyScorelines);
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the simulate-match contract and seeded determinism", () => {
    const request = {
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.45,
      expectedAwayGoals: 1.05,
      maxGoals: 6,
      mostLikelyScorelineLimit: 4,
      monteCarlo: {
        simulationCount: 40,
        seed: 2026,
        mostCommonScorelineLimit: 3
      }
    };
    const first = simulateMatch(request);
    const second = simulateMatch(request);

    expect(first).toEqual(second);
    expect(first.status).toBe("success");
    if (first.status !== "success") return;

    expect(Object.keys(first).sort()).toEqual([
      "metadata",
      "monteCarloSimulation",
      "mostLikelyScorelines",
      "outcomeProbabilities",
      "request",
      "status",
      "warnings"
    ]);
    expect(first.request).toMatchObject({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.45,
      expectedAwayGoals: 1.05,
      maxGoals: 6,
      normalizeMatrix: true
    });
    expectProbabilitiesContract(first.outcomeProbabilities);
    expectScorelinesContract(first.mostLikelyScorelines);
    expect(first.monteCarloSimulation?.simulationCount).toBe(40);
    expectWarningsContract(first.warnings);
    expectMetadataContract(first.metadata);
  });

  it("validates the predict-match-from-live-elo contract and seeded determinism", () => {
    const request = {
      homeTeam: "France",
      awayTeam: "Netherlands",
      maxGoals: 6,
      mostLikelyScorelineLimit: 4,
      preset: "balanced" as const,
      monteCarlo: {
        simulationCount: 40,
        seed: 77,
        mostCommonScorelineLimit: 3
      }
    };
    const first = predictMatchFromLiveElo(request);
    const second = predictMatchFromLiveElo(request);

    expect(first).toEqual(second);
    expect(first.status).toBe("success");
    if (first.status !== "success") return;

    expect(Object.keys(first).sort()).toEqual([
      "expectedGoals",
      "liveElo",
      "metadata",
      "monteCarloSimulation",
      "mostLikelyScorelines",
      "outcomeProbabilities",
      "predictionConfidence",
      "request",
      "status",
      "warnings"
    ]);
    expect(first.request.homeTeam).toBe("France");
    expect(first.request.awayTeam).toBe("Netherlands");
    expect(first.expectedGoals).toEqual({
      home: expect.any(Number),
      away: expect.any(Number),
      eloDifference: expect.any(Number),
      baseExpectedGoals: expect.any(Number),
      goalsAdjustment: expect.any(Number),
      preset: "balanced",
      presetDescription: expect.any(String),
      formulaVersion: expect.any(String),
      adjustmentPer100: expect.any(Number),
      maxAdjustment: expect.any(Number),
      v1RollbackAvailable: expect.any(Boolean)
    });
    expect(first.liveElo).toMatchObject({
      homeTeam: "France",
      awayTeam: "Netherlands",
      homeEloRating: expect.any(Number),
      awayEloRating: expect.any(Number),
      homeRank: expect.any(Number),
      awayRank: expect.any(Number),
      homeGroup: expect.any(String),
      awayGroup: expect.any(String),
      homeRatingSource: expect.any(String),
      awayRatingSource: expect.any(String),
      fallbackSeedRating: expect.any(Number),
      matchesProcessed: expect.any(Number),
      latestMatchDate: expect.any(String),
      dataCoverage: expect.any(String),
      homeMatchedBy: expect.any(String),
      awayMatchedBy: expect.any(String)
    });
    expect(first.predictionConfidence).toEqual({
      level: expect.stringMatching(/^(high|medium|low|very_low)$/),
      coverageType: expect.stringMatching(/^(full|partial|fallback|fallback_only)$/),
      reasons: expect.any(Array),
      dataPoints: {
        homeUsesFallback: expect.any(Boolean),
        awayUsesFallback: expect.any(Boolean),
        homeMatchesPlayed: expect.any(Number),
        awayMatchesPlayed: expect.any(Number),
        historicalMatchesAvailable: expect.any(Number),
        latestMatchDate: expect.any(String),
        currentTournamentMatchesIncluded: expect.any(Number),
        attackDefenseAvailable: expect.any(Boolean)
      },
      manualXgRecommended: expect.any(Boolean)
    });
    expect(new Set(first.predictionConfidence.reasons).size).toBe(first.predictionConfidence.reasons.length);
    expectProbabilitiesContract(first.outcomeProbabilities);
    expectScorelinesContract(first.mostLikelyScorelines);
    expect(first.monteCarloSimulation?.simulationCount).toBe(40);
    expectWarningsContract(first.warnings);
    expectMetadataContract(first.metadata);
  });

  it("validates the live Elo ratings contract", () => {
    const response = getLiveEloRatingsFoundation({ attackDefense: { enabled: true } });

    expect(Object.keys(response).sort()).toEqual([
      "attackDefense",
      "averageEloRating",
      "competitionWeighting",
      "dataCoverage",
      "dataScope",
      "homeAdvantage",
      "latestMatchDate",
      "matchesProcessed",
      "metadata",
      "pipelineVersion",
      "recencyWeighting",
      "status",
      "teams",
      "teamsRatedTotal",
      "topEloRating",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.teams.length).toBeGreaterThan(0);
    expect(response.matchesProcessed).toBeGreaterThan(0);
    expect(response.teamsRatedTotal).toBeGreaterThanOrEqual(response.teams.length);
    expect(response.attackDefense.enabled).toBe(true);
    expect(response.attackDefense.datasetAvgGoalsPerSide).toBeGreaterThan(0);
    expect(response.attackDefense.matchesWithGoalData).toBeGreaterThan(0);
    expect(response.attackDefense.teamsWithGoalData).toBeGreaterThan(0);

    const topTeam = response.teams[0];
    expect(topTeam).toEqual({
      rank: expect.any(Number),
      team: expect.any(String),
      eloRating: expect.any(Number),
      matchesPlayed: expect.any(Number),
      attackScore: expect.any(Number),
      defenseScore: expect.any(Number)
    });
    expect(topTeam?.attackScore).toBeGreaterThanOrEqual(0);
    expect(topTeam?.attackScore).toBeLessThanOrEqual(100);
    expect(topTeam?.defenseScore).toBeGreaterThanOrEqual(0);
    expect(topTeam?.defenseScore).toBeLessThanOrEqual(100);
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the team ratings contract", () => {
    const response = getTeamRatingsFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "averageEloRating",
      "foundationWarning",
      "metadata",
      "ratingSource",
      "status",
      "strongestDefenseScore",
      "strongestDefenseTeam",
      "strongestOffenseScore",
      "strongestOffenseTeam",
      "teams",
      "topEloRating",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.teams).toHaveLength(10);
    expect(response.teams[0]).toEqual({
      rank: expect.any(Number),
      team: expect.any(String),
      eloRating: expect.any(Number),
      tier: expect.stringMatching(/Elite|Strong|Competitive/),
      offenseStrength: expect.any(Number),
      defenseStrength: expect.any(Number),
      summary: expect.any(String)
    });
    expect(response.foundationWarning).toContain("static foundation");
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the tournament simulation contract", () => {
    const response = simulateTournamentFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "dataScope",
      "metadata",
      "simulationCount",
      "status",
      "teamResults",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.simulationCount).toBe(1000);
    expect(response.teamResults).toHaveLength(8);
    expect(response.teamResults[0]).toEqual({
      rank: expect.any(Number),
      team: expect.any(String),
      championProbability: expect.any(Number),
      runnerUpProbability: expect.any(Number)
    });
    expect(response.teamResults.reduce((sum, team) => sum + team.championProbability, 0)).toBeCloseTo(1, 10);
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the World Cup 2026 fixture foundation contract", () => {
    const response = getWorldCup2026FixtureFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "dataScope",
      "fixtureCount",
      "fixtures",
      "fixturesPerGroup",
      "groupCount",
      "groups",
      "matchesPerTeam",
      "metadata",
      "status",
      "teamCount",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.tournamentName).toBe("FIFA World Cup 2026");
    expect(response.dataScope).toBe("world_cup_2026_group_stage_fixture_foundation");
    expect(response.groupCount).toBe(12);
    expect(response.teamCount).toBe(48);
    expect(response.fixtureCount).toBe(72);
    expect(response.fixturesPerGroup).toBe(6);
    expect(response.matchesPerTeam).toBe(3);
    expect(response.groups[0]).toEqual({
      group: expect.any(String),
      groupName: expect.any(String),
      teams: expect.any(Array),
      fixtureCount: expect.any(Number)
    });
    expect(response.fixtures[0]).toEqual({
      id: expect.any(String),
      group: expect.any(String),
      matchday: expect.any(Number),
      order: expect.any(Number),
      groupFixtureOrder: expect.any(Number),
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      status: "scheduled",
      dateStatus: "deferred",
      venueStatus: "deferred"
    });
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the World Cup 2026 group standings foundation contract", () => {
    const response = getWorldCup2026GroupStandingsFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "completedFixtureCount",
      "dataScope",
      "groupCount",
      "groups",
      "metadata",
      "pendingFixtureCount",
      "resultProvider",
      "status",
      "teamCount",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.tournamentName).toBe("FIFA World Cup 2026");
    expect(response.dataScope).toBe("world_cup_2026_group_standings_foundation");
    expect(response.groupCount).toBe(12);
    expect(response.teamCount).toBe(48);
    expect(response.groups).toHaveLength(12);
    expect(response.resultProvider).toEqual({
      providerName: expect.any(String),
      resultSource: "local_static",
      externalProviderEnabled: false,
      localOverridesEnabled: true,
      resultsCount: expect.any(Number),
      dataUpdatedAt: expect.any(String),
      warnings: expect.any(Array)
    });
    expectWarningsContract(response.resultProvider.warnings);
    expect(response.groups[0]).toEqual({
      group: expect.any(String),
      groupName: expect.any(String),
      completedFixtureCount: expect.any(Number),
      pendingFixtureCount: expect.any(Number),
      standings: expect.any(Array)
    });
    expect(response.groups[0]?.standings[0]).toEqual({
      team: expect.any(String),
      played: expect.any(Number),
      wins: expect.any(Number),
      draws: expect.any(Number),
      losses: expect.any(Number),
      goalsFor: expect.any(Number),
      goalsAgainst: expect.any(Number),
      goalDifference: expect.any(Number),
      points: expect.any(Number)
    });
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the World Cup 2026 results provider foundation contract", () => {
    const response = getWorldCup2026ResultsProviderFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "completedResults",
      "dataScope",
      "fixtures",
      "liveMatches",
      "metadata",
      "provider",
      "standings",
      "status",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.dataScope).toBe("world_cup_2026_results_provider_foundation");
    expect(response.provider).toEqual({
      currentDefaultProvider: expect.any(String),
      attemptedProvider: expect.any(String),
      activeProvider: expect.any(String),
      cacheUsed: expect.any(Boolean),
      localFallbackUsed: expect.any(Boolean),
      externalProviderEnabled: expect.any(Boolean),
      lastSuccessfulSync: expect.any(String),
      warnings: expect.any(Array),
      normalizationIssues: expect.any(Array),
      error: expect.any(Object)
    });
    expect(response.fixtures[0]).toMatchObject({
      providerFixtureId: expect.any(String),
      competition: expect.any(String),
      season: expect.any(String),
      stage: expect.any(String),
      group: expect.any(String),
      matchday: expect.any(Number),
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      status: expect.any(String),
      updatedAt: expect.any(String)
    });
    expect(Array.isArray(response.liveMatches)).toBe(true);
    expect(Array.isArray(response.completedResults)).toBe(true);
    expect(Array.isArray(response.standings)).toBe(true);
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the World Cup 2026 Round of 32 foundation contract", () => {
    const response = getWorldCup2026RoundOf32Foundation();

    expect(Object.keys(response).sort()).toEqual([
      "bestThirdPlaceTeams",
      "dataScope",
      "fixtures",
      "fixturesCount",
      "groupRunnersUp",
      "groupWinners",
      "metadata",
      "qualifiedTeams",
      "source",
      "status",
      "totalQualifiedTeams",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.tournamentName).toBe("FIFA World Cup 2026");
    expect(response.dataScope).toBe("world_cup_2026_round_of_32_foundation");
    expect(response.totalQualifiedTeams).toBe(32);
    expect(response.groupWinners).toBe(12);
    expect(response.groupRunnersUp).toBe(12);
    expect(response.bestThirdPlaceTeams).toBe(8);
    expect(response.fixturesCount).toBe(16);
    expect(response.source).toBe("current_local_standings_foundation");
    expect(response.qualifiedTeams[0]).toEqual({
      group: expect.any(String),
      groupName: expect.any(String),
      qualificationSource: expect.stringMatching(/group_winner|group_runner_up|best_third_place/),
      qualificationRank: expect.any(Number),
      team: expect.any(String),
      played: expect.any(Number),
      wins: expect.any(Number),
      draws: expect.any(Number),
      losses: expect.any(Number),
      goalsFor: expect.any(Number),
      goalsAgainst: expect.any(Number),
      goalDifference: expect.any(Number),
      points: expect.any(Number)
    });
    expect(response.fixtures[0]).toEqual({
      fixtureId: expect.any(String),
      round: "round_of_32",
      slot: expect.any(Number),
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      homeQualificationSource: expect.stringMatching(/group_winner|group_runner_up|best_third_place/),
      awayQualificationSource: expect.stringMatching(/group_winner|group_runner_up|best_third_place/),
      status: "projected"
    });
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the World Cup 2026 semifinal foundation contract", () => {
    const response = apiRoutes.simulateWorldCup2026SemifinalFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "dataScope",
      "fixturesCount",
      "metadata",
      "projectedSemifinalFixtures",
      "projectedSemifinalTeams",
      "projectedSemifinalTeamsCount",
      "round",
      "simulationType",
      "source",
      "status",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.tournamentName).toBe("FIFA World Cup 2026");
    expect(response.dataScope).toBe("world_cup_2026_semifinal_foundation");
    expect(response.round).toBe("semifinal");
    expect(response.projectedSemifinalTeamsCount).toBe(4);
    expect(response.fixturesCount).toBe(2);
    expect(response.simulationType).toBe("deterministic_winner_selection");
    expect(response.source).toBe("quarterfinal_match_simulation_foundation");
    expect(response.projectedSemifinalTeams[0]).toEqual({
      team: expect.any(String),
      qualificationSource: "quarterfinal",
      sourceFixtureId: expect.any(String),
      sourceSlot: expect.any(Number),
      advancementReason: expect.any(String),
      probabilitySnapshot: {
        homeWinProbability: expect.any(Number),
        drawProbability: expect.any(Number),
        awayWinProbability: expect.any(Number)
      },
      sourceHomeTeam: expect.any(String),
      sourceAwayTeam: expect.any(String),
      homeRatingSource: expect.any(String),
      awayRatingSource: expect.any(String)
    });
    expect(response.projectedSemifinalFixtures[0]).toEqual({
      fixtureId: expect.any(String),
      round: "semifinal",
      slot: expect.any(Number),
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      homeQualifier: expect.any(Object),
      awayQualifier: expect.any(Object),
      status: "projected"
    });
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the World Cup 2026 semifinal match simulation contract", () => {
    const response = apiRoutes.simulateWorldCup2026SemifinalMatchesFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "dataScope",
      "fixtures",
      "metadata",
      "round",
      "simulatedFixturesCount",
      "simulationType",
      "source",
      "status",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.tournamentName).toBe("FIFA World Cup 2026");
    expect(response.dataScope).toBe("world_cup_2026_semifinal_match_simulation_foundation");
    expect(response.simulatedFixturesCount).toBe(2);
    expect(response.round).toBe("semifinal");
    expect(response.simulationType).toBe("match_level_foundation");
    expect(response.source).toBe("projected_semifinals");
    expect(response.fixtures[0]).toEqual({
      fixtureId: expect.any(String),
      round: "semifinal",
      slot: expect.any(Number),
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      homeExpectedGoals: expect.any(Number),
      awayExpectedGoals: expect.any(Number),
      homeWinProbability: expect.any(Number),
      drawProbability: expect.any(Number),
      awayWinProbability: expect.any(Number),
      mostLikelyScorelines: expect.any(Array),
      homeRatingSource: expect.any(String),
      awayRatingSource: expect.any(String),
      warnings: expect.any(Array)
    });
    expectProbabilitiesContract({
      homeWinProbability: response.fixtures[0]!.homeWinProbability,
      drawProbability: response.fixtures[0]!.drawProbability,
      awayWinProbability: response.fixtures[0]!.awayWinProbability,
      totalProbability:
        response.fixtures[0]!.homeWinProbability +
        response.fixtures[0]!.drawProbability +
        response.fixtures[0]!.awayWinProbability
    });
    expectScorelinesContract(response.fixtures[0]!.mostLikelyScorelines);
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the World Cup 2026 final foundation contract", () => {
    const response = apiRoutes.simulateWorldCup2026FinalFoundation();

    expect(Object.keys(response).sort()).toEqual([
      "dataScope",
      "fixturesCount",
      "metadata",
      "projectedFinalFixtures",
      "projectedFinalists",
      "projectedFinalistsCount",
      "round",
      "simulationType",
      "source",
      "status",
      "tournamentName",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.tournamentName).toBe("FIFA World Cup 2026");
    expect(response.dataScope).toBe("world_cup_2026_final_foundation");
    expect(response.round).toBe("final");
    expect(response.projectedFinalistsCount).toBe(2);
    expect(response.fixturesCount).toBe(1);
    expect(response.simulationType).toBe("deterministic_winner_selection");
    expect(response.source).toBe("projected_semifinals");
    expect(response.projectedFinalists[0]).toEqual({
      team: expect.any(String),
      qualificationSource: "semifinal",
      semifinalSourceFixtureId: expect.any(String),
      sourceSlot: expect.any(Number),
      advancementReason: expect.any(String),
      probabilitySnapshot: {
        homeWinProbability: expect.any(Number),
        drawProbability: expect.any(Number),
        awayWinProbability: expect.any(Number)
      },
      sourceHomeTeam: expect.any(String),
      sourceAwayTeam: expect.any(String),
      homeRatingSource: expect.any(String),
      awayRatingSource: expect.any(String)
    });
    expect(response.projectedFinalFixtures[0]).toEqual({
      fixtureId: expect.any(String),
      round: "final",
      slot: 1,
      homeTeam: expect.any(String),
      awayTeam: expect.any(String),
      homeQualifier: expect.any(Object),
      awayQualifier: expect.any(Object),
      status: "projected"
    });
    expectWarningsContract(response.warnings);
    expectMetadataContract(response.metadata);
  });

  it("validates the historical tournament summary contract", () => {
    const supported = getHistoricalTournamentSummary(2022);
    const unsupported = getHistoricalTournamentSummary(9999);

    expect(supported.status).toBe("success");
    if (supported.status !== "success") return;

    expect(Object.keys(supported).sort()).toEqual(["metadata", "status", "summary"]);
    expect(supported.summary).toEqual({
      year: 2022,
      tournamentName: "FIFA World Cup 2022",
      matchCount: 64,
      expectedMatchCount: 64,
      groupStageMatchCount: 48,
      knockoutAndPlacementMatchCount: 16,
      champion: "Argentina",
      runnerUp: "France",
      thirdPlace: "Croatia",
      datasetStatus: "complete_curated_fixture_foundation",
      warnings: expect.any(Array)
    });
    expectWarningsContract(supported.summary.warnings);
    expectMetadataContract(supported.metadata);

    expect(unsupported.status).toBe("validation_error");
    if (unsupported.status !== "validation_error") return;

    expect(unsupported.supportedYears).toEqual([2010, 2014, 2018, 2022]);
    expectValidationErrorContract(unsupported, ["year"]);
  });

  it("validates the historical replay audit contract", () => {
    const response = getHistoricalReplayAudit();

    expect(Object.keys(response).sort()).toEqual([
      "apiReadiness",
      "auditVersion",
      "componentAvailability",
      "knownGaps",
      "metadata",
      "metricAvailability",
      "status",
      "supportedYears",
      "warnings"
    ]);
    expect(response.status).toBe("success");
    expect(response.apiReadiness).toBe("ready_with_warnings");
    expect(response.supportedYears).toEqual([2010, 2014, 2018, 2022]);
    expect(response.metricAvailability).toEqual({
      brierScore: true,
      logLoss: true,
      top1Hit: true,
      top3Hit: true,
      top5Hit: true
    });
    expect(response.componentAvailability).toEqual({
      datasetCompleteness: true,
      bracketReconstruction: true,
      eloSnapshotReplay: true,
      monteCarloReplay: true,
      replayValidation: true
    });
    expectWarningsContract(response.warnings);
    expect(response.knownGaps.length).toBeGreaterThan(0);
    expectMetadataContract(response.metadata);
  });

  it("validates typed validation error contracts", () => {
    const invalidSimulation = simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team A",
      expectedHomeGoals: -1,
      expectedAwayGoals: Number.NaN,
      maxGoals: 0
    });
    const unavailableLiveEloTeam = predictMatchFromLiveElo({
      homeTeam: "Atlantis",
      awayTeam: "France"
    });

    expect(invalidSimulation.status).toBe("validation_error");
    if (invalidSimulation.status !== "validation_error") return;
    expectValidationErrorContract(invalidSimulation, ["awayTeam", "expectedHomeGoals", "expectedAwayGoals", "maxGoals"]);

    expect(unavailableLiveEloTeam.status).toBe("validation_error");
    if (unavailableLiveEloTeam.status !== "validation_error") return;
    expectValidationErrorContract(unavailableLiveEloTeam, ["homeTeam"]);
    expect(unavailableLiveEloTeam.availableTeams).toContain("France");
    expect(unavailableLiveEloTeam.issues[0]?.suggestions).toEqual(expect.any(Array));
  });

  it("validates runtime unsupported route and method error contracts", async () => {
    const unsupportedRoute = await apiRuntime.fetch(endpointRequest("/unsupported"));
    const unsupportedMethod = await apiRuntime.fetch(endpointRequest("/health", { method: "POST" }));
    const unsupportedRouteBody = await readJson<ApiRuntimeFailureResponse>(unsupportedRoute);
    const unsupportedMethodBody = await readJson<ApiRuntimeFailureResponse>(unsupportedMethod);

    expect(unsupportedRoute.status).toBe(404);
    expect(unsupportedRoute.headers.get("content-type")).toContain("application/json");
    expect(unsupportedRouteBody).toMatchObject({
      status: "error",
      error: {
        code: "not_found",
        message: expect.any(String)
      }
    });
    expectMetadataContract(unsupportedRouteBody.metadata);

    expect(unsupportedMethod.status).toBe(405);
    expect(unsupportedMethod.headers.get("content-type")).toContain("application/json");
    expect(unsupportedMethodBody).toMatchObject({
      status: "error",
      error: {
        code: "method_not_allowed",
        message: expect.any(String)
      }
    });
    expectMetadataContract(unsupportedMethodBody.metadata);
  });
});
