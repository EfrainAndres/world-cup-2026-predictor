import { describe, expect, it } from "vitest";
import { apiRuntime } from "../src/index.js";
import type { ApiRuntimeFailureResponse, HealthResponse, HistoricalReplayAuditResponse, ModelInfoResponse } from "../src/index.js";

interface EndpointSimulateMatchSuccessResponse {
  status: "success";
  request: {
    homeTeam: string;
    awayTeam: string;
    expectedHomeGoals: number;
    expectedAwayGoals: number;
    maxGoals: number;
    normalizeMatrix: boolean;
  };
  outcomeProbabilities: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
    totalProbability: number;
  };
  mostLikelyScorelines: readonly unknown[];
  warnings: readonly string[];
}

interface EndpointHistoricalSummarySuccessResponse {
  status: "success";
  summary: {
    year: number;
    tournamentName: string;
    matchCount: number;
    expectedMatchCount: number;
    groupStageMatchCount: number;
    knockoutAndPlacementMatchCount: number;
    champion: string;
    runnerUp: string;
    thirdPlace: string;
    datasetStatus: "complete_curated_fixture_foundation";
    warnings: readonly string[];
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function endpointRequest(pathname: string, init?: RequestInit): Request {
  return new Request(`http://endpoint-validation.test${pathname}`, init);
}

function expectJson(response: Response): void {
  expect(response.headers.get("content-type")).toContain("application/json");
}

function expectFoundationMetadata(metadata: {
  mode: string;
  serverEnabled: boolean;
  databaseEnabled: boolean;
  externalServicesEnabled: boolean;
}): void {
  expect(metadata.mode).toBe("pure_handlers");
  expect(metadata.serverEnabled).toBe(false);
  expect(metadata.databaseEnabled).toBe(false);
  expect(metadata.externalServicesEnabled).toBe(false);
}

describe("api endpoint validation", () => {
  it("validates GET /health endpoint shape and deterministic response", async () => {
    const first = await apiRuntime.fetch(endpointRequest("/health"));
    const second = await apiRuntime.fetch(endpointRequest("/health"));
    const firstBody = await readJson<HealthResponse>(first);
    const secondBody = await readJson<HealthResponse>(second);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expectJson(first);
    expect(firstBody).toEqual(secondBody);
    expect(firstBody).toMatchObject({
      status: "ok",
      service: "world-cup-2026-predictor-api",
      version: "0.1.0"
    });
    expectFoundationMetadata(firstBody.metadata);
  });

  it("validates GET /model-info endpoint shape", async () => {
    const response = await apiRuntime.fetch(endpointRequest("/model-info"));
    const body = await readJson<ModelInfoResponse>(response);

    expect(response.status).toBe(200);
    expectJson(response);
    expect(body.status).toBe("ok");
    expect(body.modelPackage).toBe("@world-cup-2026-predictor/model");
    expect(body.supportedHandlers).toEqual([
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
      "getWorldCup2026EloIngestionFoundation"
    ]);
    expect(body.limitations).toContain("No HTTP server is created in Phase 5.0.");
    expectFoundationMetadata(body.metadata);
  });

  it("validates POST /simulate-match success and validation-error responses", async () => {
    const success = await apiRuntime.fetch(
      endpointRequest("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team B",
          expectedHomeGoals: 1.5,
          expectedAwayGoals: 0.9,
          maxGoals: 5,
          mostLikelyScorelineLimit: 3
        })
      })
    );
    const invalid = await apiRuntime.fetch(
      endpointRequest("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team A",
          expectedHomeGoals: -1,
          expectedAwayGoals: Number.NaN,
          maxGoals: 21
        })
      })
    );
    const successBody = await readJson<EndpointSimulateMatchSuccessResponse>(success);
    const invalidBody = await readJson<ApiRuntimeFailureResponse>(invalid);

    expect(success.status).toBe(200);
    expectJson(success);
    expect(successBody.status).toBe("success");
    expect(successBody.request).toMatchObject({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.5,
      expectedAwayGoals: 0.9,
      maxGoals: 5
    });
    expect(successBody.outcomeProbabilities.totalProbability).toBeCloseTo(1, 10);
    expect(successBody.mostLikelyScorelines).toHaveLength(3);
    expect(successBody.warnings).toContain("Expected-goals inputs are caller supplied; this handler does not calibrate team strength.");

    expect(invalid.status).toBe(400);
    expectJson(invalid);
    expect(invalidBody.status).toBe("validation_error");

    if (invalidBody.status !== "validation_error") return;

    expect(invalidBody.issues.map((issue) => issue.field)).toEqual(["awayTeam", "expectedHomeGoals", "expectedAwayGoals", "maxGoals"]);
    expectFoundationMetadata(invalidBody.metadata);
  });

  it.each([
    { year: 2010, champion: "Spain", runnerUp: "Netherlands", thirdPlace: "Germany" },
    { year: 2014, champion: "Germany", runnerUp: "Argentina", thirdPlace: "Netherlands" },
    { year: 2018, champion: "France", runnerUp: "Croatia", thirdPlace: "Belgium" },
    { year: 2022, champion: "Argentina", runnerUp: "France", thirdPlace: "Croatia" }
  ])("validates GET /historical/$year endpoint shape", async ({ year, champion, runnerUp, thirdPlace }) => {
    const response = await apiRuntime.fetch(endpointRequest(`/historical/${year}`));
    const body = await readJson<EndpointHistoricalSummarySuccessResponse>(response);

    expect(response.status).toBe(200);
    expectJson(response);
    expect(body.status).toBe("success");
    expect(body.summary).toMatchObject({
      year,
      tournamentName: `FIFA World Cup ${year}`,
      matchCount: 64,
      expectedMatchCount: 64,
      groupStageMatchCount: 48,
      knockoutAndPlacementMatchCount: 16,
      champion,
      runnerUp,
      thirdPlace,
      datasetStatus: "complete_curated_fixture_foundation"
    });
    expect(body.summary.warnings).toContain("Historical tournament summary is local curated fixture metadata, not a live data service.");
  });

  it("validates GET /historical/9999 endpoint validation error", async () => {
    const response = await apiRuntime.fetch(endpointRequest("/historical/9999"));
    const body = await readJson<ApiRuntimeFailureResponse & { supportedYears?: readonly number[] }>(response);

    expect(response.status).toBe(400);
    expectJson(response);
    expect(body.status).toBe("validation_error");
    expect(body.supportedYears).toEqual([2010, 2014, 2018, 2022]);

    if (body.status !== "validation_error") return;

    expect(body.issues).toEqual([{ field: "year", message: "year must be one of: 2010, 2014, 2018, 2022." }]);
    expectFoundationMetadata(body.metadata);
  });

  it("validates GET /historical-replay-audit endpoint shape", async () => {
    const response = await apiRuntime.fetch(endpointRequest("/historical-replay-audit"));
    const body = await readJson<HistoricalReplayAuditResponse>(response);

    expect(response.status).toBe(200);
    expectJson(response);
    expect(body.status).toBe("success");
    expect(body.apiReadiness).toBe("ready_with_warnings");
    expect(body.supportedYears).toEqual([2010, 2014, 2018, 2022]);
    expect(body.metricAvailability).toEqual({
      brierScore: true,
      logLoss: true,
      top1Hit: true,
      top3Hit: true,
      top5Hit: true
    });
    expect(body.componentAvailability.replayValidation).toBe(true);
    expect(body.warnings.join(" ")).toContain("must not be treated as a real predictive accuracy claim");
    expectFoundationMetadata(body.metadata);
  });

  it("validates unsupported route and unsupported method error shapes", async () => {
    const unsupportedRoute = await apiRuntime.fetch(endpointRequest("/unsupported"));
    const unsupportedMethod = await apiRuntime.fetch(endpointRequest("/model-info", { method: "POST" }));
    const unsupportedRouteBody = await readJson<ApiRuntimeFailureResponse>(unsupportedRoute);
    const unsupportedMethodBody = await readJson<ApiRuntimeFailureResponse>(unsupportedMethod);

    expect(unsupportedRoute.status).toBe(404);
    expect(unsupportedMethod.status).toBe(405);
    expectJson(unsupportedRoute);
    expectJson(unsupportedMethod);
    expect(unsupportedRouteBody.status).toBe("error");
    expect(unsupportedMethodBody.status).toBe("error");

    if (unsupportedRouteBody.status !== "error" || unsupportedMethodBody.status !== "error") return;

    expect(unsupportedRouteBody.error).toEqual({
      code: "not_found",
      message: "No API runtime route matches /unsupported."
    });
    expect(unsupportedMethodBody.error).toEqual({
      code: "method_not_allowed",
      message: "POST is not supported for this route. Use GET."
    });
    expectFoundationMetadata(unsupportedRouteBody.metadata);
    expectFoundationMetadata(unsupportedMethodBody.metadata);
  });

  it("keeps endpoint validation local and deterministic", async () => {
    const first = await apiRuntime.fetch(
      endpointRequest("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team B",
          expectedHomeGoals: 1.1,
          expectedAwayGoals: 1,
          monteCarlo: {
            simulationCount: 10,
            seed: 123,
            mostCommonScorelineLimit: 2
          }
        })
      })
    );
    const second = await apiRuntime.fetch(
      endpointRequest("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team B",
          expectedHomeGoals: 1.1,
          expectedAwayGoals: 1,
          monteCarlo: {
            simulationCount: 10,
            seed: 123,
            mostCommonScorelineLimit: 2
          }
        })
      })
    );

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
  });
});
