import { describe, expect, it } from "vitest";
import { apiRoutes, type ApiMetadata } from "../src/index.js";

interface ValidationErrorResponse {
  status: "validation_error";
  issues: readonly {
    field: string;
    message: string;
  }[];
  metadata: ApiMetadata;
}

function expectPureHandlerMetadata(metadata: ApiMetadata): void {
  expect(metadata.mode).toBe("pure_handlers");
  expect(metadata.serverEnabled).toBe(false);
  expect(metadata.databaseEnabled).toBe(false);
  expect(metadata.externalServicesEnabled).toBe(false);
  expect(metadata.notes.length).toBeGreaterThan(0);
}

function expectValidationErrorShape(response: ValidationErrorResponse, expectedFields: string[]): void {
  expect(response.status).toBe("validation_error");
  expect(response.issues.length).toBeGreaterThan(0);
  expectPureHandlerMetadata(response.metadata);

  const issueFields = response.issues.map((issue) => issue.field);

  for (const field of expectedFields) {
    expect(issueFields).toContain(field);
  }

  for (const issue of response.issues) {
    expect(issue.message.length).toBeGreaterThan(0);
  }
}

describe("api integration validation", () => {
  it("validates health and model info handlers without server state", () => {
    const health = apiRoutes.getHealth();
    const modelInfo = apiRoutes.getModelInfo();

    expect(health).toEqual({
      status: "ok",
      service: "world-cup-2026-predictor-api",
      version: "0.1.0",
      metadata: health.metadata
    });
    expectPureHandlerMetadata(health.metadata);

    expect(modelInfo.status).toBe("ok");
    expect(modelInfo.supportedHandlers).toEqual([
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
      "resolveWorldCup2026KnockoutWinnersFoundation"
    ]);
    expect(modelInfo.limitations).toContain("No database or external services are used.");
    expectPureHandlerMetadata(modelInfo.metadata);
  });

  it("returns a stable success shape for a valid match simulation request", () => {
    const result = apiRoutes.simulateMatch({
      homeTeam: " Team A ",
      awayTeam: "Team B",
      expectedHomeGoals: 1.6,
      expectedAwayGoals: 0.9,
      maxGoals: 6,
      normalizeMatrix: true,
      mostLikelyScorelineLimit: 4
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(Object.keys(result).sort()).toEqual([
      "metadata",
      "mostLikelyScorelines",
      "outcomeProbabilities",
      "request",
      "status",
      "warnings"
    ]);
    expect(result.request).toEqual({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.6,
      expectedAwayGoals: 0.9,
      maxGoals: 6,
      normalizeMatrix: true
    });
    expect(result.outcomeProbabilities.totalProbability).toBeCloseTo(1, 10);
    expect(result.outcomeProbabilities.homeWinProbability).toBeGreaterThan(result.outcomeProbabilities.awayWinProbability);
    expect(result.mostLikelyScorelines).toHaveLength(4);
    expect(result.warnings).toContain("Expected-goals inputs are caller supplied; this handler does not calibrate team strength.");
    expectPureHandlerMetadata(result.metadata);
  });

  it("returns typed validation errors for invalid expected goals", () => {
    const result = apiRoutes.simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: Number.NaN,
      expectedAwayGoals: -0.2
    });

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;

    expectValidationErrorShape(result, ["expectedHomeGoals", "expectedAwayGoals"]);
    expect("outcomeProbabilities" in result).toBe(false);
  });

  it("returns typed validation errors for invalid max goals", () => {
    const zeroMaxGoals = apiRoutes.simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1,
      expectedAwayGoals: 1,
      maxGoals: 0
    });
    const tooManyMaxGoals = apiRoutes.simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1,
      expectedAwayGoals: 1,
      maxGoals: 21
    });

    expect(zeroMaxGoals.status).toBe("validation_error");
    expect(tooManyMaxGoals.status).toBe("validation_error");

    if (zeroMaxGoals.status !== "validation_error" || tooManyMaxGoals.status !== "validation_error") return;

    expectValidationErrorShape(zeroMaxGoals, ["maxGoals"]);
    expectValidationErrorShape(tooManyMaxGoals, ["maxGoals"]);
  });

  it("supports optional deterministic Monte Carlo simulation when requested", () => {
    const result = apiRoutes.simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.2,
      expectedAwayGoals: 1.1,
      monteCarlo: {
        simulationCount: 25,
        seed: 7,
        mostCommonScorelineLimit: 3
      }
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.monteCarloSimulation?.simulationCount).toBe(25);
    expect(result.monteCarloSimulation?.mostCommonScorelines).toHaveLength(3);
    expectPureHandlerMetadata(result.metadata);
  });

  it("returns stable historical tournament summary responses", () => {
    const result = apiRoutes.getHistoricalTournamentSummary(2018);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(Object.keys(result.summary).sort()).toEqual([
      "champion",
      "datasetStatus",
      "expectedMatchCount",
      "groupStageMatchCount",
      "knockoutAndPlacementMatchCount",
      "matchCount",
      "runnerUp",
      "thirdPlace",
      "tournamentName",
      "warnings",
      "year"
    ]);
    expect(result.summary).toMatchObject({
      year: 2018,
      tournamentName: "FIFA World Cup 2018",
      matchCount: 64,
      expectedMatchCount: 64,
      groupStageMatchCount: 48,
      knockoutAndPlacementMatchCount: 16,
      champion: "France",
      runnerUp: "Croatia",
      thirdPlace: "Belgium",
      datasetStatus: "complete_curated_fixture_foundation"
    });
    expectPureHandlerMetadata(result.metadata);
  });

  it("returns consistent historical tournament validation errors", () => {
    const result = apiRoutes.getHistoricalTournamentSummary(2026);

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;

    expect(result.supportedYears).toEqual([2010, 2014, 2018, 2022]);
    expectValidationErrorShape(result, ["year"]);
  });

  it("returns replay audit readiness and status metadata", () => {
    const audit = apiRoutes.getHistoricalReplayAudit();

    expect(audit.status).toBe("success");
    expect(audit.apiReadiness).toBe("ready_with_warnings");
    expect(audit.supportedYears).toEqual([2010, 2014, 2018, 2022]);
    expect(audit.metricAvailability).toEqual({
      brierScore: true,
      logLoss: true,
      top1Hit: true,
      top3Hit: true,
      top5Hit: true
    });
    expect(audit.componentAvailability).toEqual({
      datasetCompleteness: true,
      bracketReconstruction: true,
      eloSnapshotReplay: true,
      monteCarloReplay: true,
      replayValidation: true
    });
    expect(audit.warnings.join(" ")).toContain("must not be treated as a real predictive accuracy claim");
    expect(audit.knownGaps.length).toBeGreaterThan(0);
    expectPureHandlerMetadata(audit.metadata);
  });

  it("keeps integration responses free of network, server, and database requirements", () => {
    const responses = [
      apiRoutes.getHealth().metadata,
      apiRoutes.getModelInfo().metadata,
      apiRoutes.getHistoricalReplayAudit().metadata
    ];

    for (const metadata of responses) {
      expectPureHandlerMetadata(metadata);
    }
  });
});
