import { describe, expect, it } from "vitest";
import { apiRuntime, createApiRuntime } from "../src/index.js";
import type { ApiRuntimeFailureResponse, HealthResponse, HistoricalReplayAuditResponse, ModelInfoResponse } from "../src/index.js";

interface RuntimeSimulateMatchResponse {
  status: "success";
  outcomeProbabilities: unknown;
  mostLikelyScorelines: unknown;
  monteCarloSimulation?: {
    simulationCount: number;
  };
}

interface RuntimeHistoricalSummaryResponse {
  status: "success";
  summary: {
    champion: string;
    runnerUp: string;
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function expectJsonResponse(response: Response): void {
  expect(response.headers.get("content-type")).toContain("application/json");
}

function request(pathname: string, init?: RequestInit): Request {
  return new Request(`http://local-api.test${pathname}`, init);
}

describe("api runtime foundation", () => {
  it("serves GET /health as JSON without a server", async () => {
    const runtime = createApiRuntime();
    const response = await runtime.fetch(request("/health"));
    const body = await readJson<HealthResponse>(response);

    expect(response.status).toBe(200);
    expectJsonResponse(response);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("world-cup-2026-predictor-api");
    expect(body.metadata.serverEnabled).toBe(false);
    expect(body.metadata.databaseEnabled).toBe(false);
    expect(body.metadata.externalServicesEnabled).toBe(false);
  });

  it("serves GET /model-info as JSON", async () => {
    const response = await apiRuntime.fetch(request("/model-info"));
    const body = await readJson<ModelInfoResponse>(response);

    expect(response.status).toBe(200);
    expectJsonResponse(response);
    expect(body.status).toBe("ok");
    expect(body.supportedHandlers).toContain("simulateMatch");
    expect(body.limitations).toContain("No database or external services are used.");
  });

  it("serves POST /simulate-match for valid JSON requests", async () => {
    const response = await apiRuntime.fetch(
      request("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team B",
          expectedHomeGoals: 1.4,
          expectedAwayGoals: 0.8,
          maxGoals: 5,
          mostLikelyScorelineLimit: 3
        })
      })
    );
    const body = await readJson<RuntimeSimulateMatchResponse>(response);

    expect(response.status).toBe(200);
    expectJsonResponse(response);
    expect(body.status).toBe("success");
    expect(body.outcomeProbabilities).toBeDefined();
    expect(body.mostLikelyScorelines).toBeDefined();
  });

  it("serves POST /simulate-match with optional Monte Carlo output", async () => {
    const response = await apiRuntime.fetch(
      request("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team B",
          expectedHomeGoals: 1.2,
          expectedAwayGoals: 1,
          monteCarlo: {
            simulationCount: 12,
            seed: 11,
            mostCommonScorelineLimit: 2
          }
        })
      })
    );
    const body = await readJson<RuntimeSimulateMatchResponse>(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("success");
    expect(body.monteCarloSimulation?.simulationCount).toBe(12);
  });

  it("returns typed validation errors for invalid simulate-match expected goals", async () => {
    const response = await apiRuntime.fetch(
      request("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team B",
          expectedHomeGoals: -1,
          expectedAwayGoals: Number.NaN
        })
      })
    );
    const body = await readJson<ApiRuntimeFailureResponse>(response);

    expect(response.status).toBe(400);
    expectJsonResponse(response);
    expect(body.status).toBe("validation_error");

    if (body.status !== "validation_error") return;

    expect(body.issues.map((issue) => issue.field)).toContain("expectedHomeGoals");
    expect(body.issues.map((issue) => issue.field)).toContain("expectedAwayGoals");
  });

  it("returns typed validation errors for invalid simulate-match max goals", async () => {
    const response = await apiRuntime.fetch(
      request("/simulate-match", {
        method: "POST",
        body: JSON.stringify({
          homeTeam: "Team A",
          awayTeam: "Team B",
          expectedHomeGoals: 1,
          expectedAwayGoals: 1,
          maxGoals: 21
        })
      })
    );
    const body = await readJson<ApiRuntimeFailureResponse>(response);

    expect(response.status).toBe(400);
    expect(body.status).toBe("validation_error");

    if (body.status !== "validation_error") return;

    expect(body.issues).toEqual([{ field: "maxGoals", message: "maxGoals must be 20 or less." }]);
  });

  it("returns typed validation errors for malformed JSON bodies", async () => {
    const response = await apiRuntime.fetch(
      request("/simulate-match", {
        method: "POST",
        body: "{"
      })
    );
    const body = await readJson<ApiRuntimeFailureResponse>(response);

    expect(response.status).toBe(400);
    expect(body.status).toBe("validation_error");

    if (body.status !== "validation_error") return;

    expect(body.issues).toEqual([{ field: "body", message: "Request body must be a JSON object." }]);
  });

  it("serves GET /historical/:year for supported years", async () => {
    const response = await apiRuntime.fetch(request("/historical/2022"));
    const body = await readJson<RuntimeHistoricalSummaryResponse>(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("success");
    expect(body.summary?.champion).toBe("Argentina");
    expect(body.summary?.runnerUp).toBe("France");
  });

  it("returns validation errors for unsupported historical years", async () => {
    const response = await apiRuntime.fetch(request("/historical/2006"));
    const body = await readJson<ApiRuntimeFailureResponse & { supportedYears?: number[] }>(response);

    expect(response.status).toBe(400);
    expect(body.status).toBe("validation_error");
    expect(body.supportedYears).toEqual([2010, 2014, 2018, 2022]);
  });

  it("returns validation errors for non-numeric historical years", async () => {
    const response = await apiRuntime.fetch(request("/historical/latest"));
    const body = await readJson<ApiRuntimeFailureResponse>(response);

    expect(response.status).toBe(400);
    expect(body.status).toBe("validation_error");

    if (body.status !== "validation_error") return;

    expect(body.issues).toEqual([{ field: "year", message: "Historical tournament year must be an integer." }]);
  });

  it("serves GET /historical-replay-audit as JSON", async () => {
    const response = await apiRuntime.fetch(request("/historical-replay-audit"));
    const body = await readJson<HistoricalReplayAuditResponse>(response);

    expect(response.status).toBe(200);
    expectJsonResponse(response);
    expect(body.status).toBe("success");
    expect(body.apiReadiness).toBe("ready_with_warnings");
    expect(body.metricAvailability.brierScore).toBe(true);
  });

  it("returns typed errors for unsupported methods and paths", async () => {
    const wrongMethod = await apiRuntime.fetch(request("/health", { method: "POST" }));
    const missingRoute = await apiRuntime.fetch(request("/missing"));
    const wrongMethodBody = await readJson<ApiRuntimeFailureResponse>(wrongMethod);
    const missingRouteBody = await readJson<ApiRuntimeFailureResponse>(missingRoute);

    expect(wrongMethod.status).toBe(405);
    expect(missingRoute.status).toBe(404);
    expect(wrongMethodBody.status).toBe("error");
    expect(missingRouteBody.status).toBe("error");

    if (wrongMethodBody.status !== "error" || missingRouteBody.status !== "error") return;

    expect(wrongMethodBody.error.code).toBe("method_not_allowed");
    expect(missingRouteBody.error.code).toBe("not_found");
  });
});
