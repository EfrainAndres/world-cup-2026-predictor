import { describe, expect, it } from "vitest";
import {
  apiRoutes,
  getHealth,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getModelInfo,
  simulateMatch,
  simulateTournamentFoundation
} from "../src/index.js";

describe("api foundation handlers", () => {
  it("returns deterministic health metadata", () => {
    const health = getHealth();

    expect(health.status).toBe("ok");
    expect(health.service).toBe("world-cup-2026-predictor-api");
    expect(health.metadata.serverEnabled).toBe(false);
    expect(health.metadata.databaseEnabled).toBe(false);
    expect(health.metadata.externalServicesEnabled).toBe(false);
  });

  it("returns model info without starting a server", () => {
    const info = getModelInfo();

    expect(info.status).toBe("ok");
    expect(info.supportedHandlers).toContain("simulateMatch");
    expect(info.limitations).toContain("No HTTP server is created in Phase 5.0.");
  });

  it("simulates a match from expected goals", () => {
    const result = simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.5,
      expectedAwayGoals: 1,
      maxGoals: 5,
      mostLikelyScorelineLimit: 3
    });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.request.homeTeam).toBe("Team A");
    expect(result.mostLikelyScorelines).toHaveLength(3);
    expect(result.outcomeProbabilities.totalProbability).toBeCloseTo(1, 10);
    expect(result.outcomeProbabilities.homeWinProbability).toBeGreaterThan(result.outcomeProbabilities.awayWinProbability);
  });

  it("supports deterministic optional Monte Carlo simulation", () => {
    const first = simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.25,
      expectedAwayGoals: 1.1,
      monteCarlo: {
        simulationCount: 20,
        seed: 42,
        mostCommonScorelineLimit: 2
      }
    });
    const second = simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team B",
      expectedHomeGoals: 1.25,
      expectedAwayGoals: 1.1,
      monteCarlo: {
        simulationCount: 20,
        seed: 42,
        mostCommonScorelineLimit: 2
      }
    });

    expect(first).toEqual(second);
    expect(first.status).toBe("success");

    if (first.status !== "success") return;

    expect(first.monteCarloSimulation?.simulationCount).toBe(20);
    expect(first.monteCarloSimulation?.mostCommonScorelines).toHaveLength(2);
  });

  it("rejects invalid match simulation requests", () => {
    const result = simulateMatch({
      homeTeam: "Team A",
      awayTeam: "Team A",
      expectedHomeGoals: -1,
      expectedAwayGoals: 1
    });

    expect(result.status).toBe("validation_error");

    if (result.status !== "validation_error") return;

    expect(result.issues.map((issue) => issue.field)).toContain("awayTeam");
    expect(result.issues.map((issue) => issue.field)).toContain("expectedHomeGoals");
  });

  it("returns historical tournament summary for supported years", () => {
    const result = getHistoricalTournamentSummary(2022);

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.summary.champion).toBe("Argentina");
    expect(result.summary.runnerUp).toBe("France");
    expect(result.summary.matchCount).toBe(64);
  });

  it("rejects unsupported historical tournament years", () => {
    const result = getHistoricalTournamentSummary(2006);

    expect(result.status).toBe("validation_error");

    if (result.status !== "validation_error") return;

    expect(result.supportedYears).toEqual([2010, 2014, 2018, 2022]);
  });

  it("returns historical replay audit readiness with warnings", () => {
    const audit = getHistoricalReplayAudit();

    expect(audit.status).toBe("success");
    expect(audit.apiReadiness).toBe("ready_with_warnings");
    expect(audit.metricAvailability.brierScore).toBe(true);
    expect(audit.componentAvailability.replayValidation).toBe(true);
    expect(audit.warnings[0]).toContain("must not be treated as a real predictive accuracy claim");
  });

  it("exposes the same handlers through apiRoutes", () => {
    expect(apiRoutes.getHealth()).toEqual(getHealth());
    expect(apiRoutes.getModelInfo()).toEqual(getModelInfo());
    expect(apiRoutes.getHistoricalReplayAudit()).toEqual(getHistoricalReplayAudit());
  });
});

describe("simulateTournamentFoundation", () => {
  it("returns a success response with the sample tournament shape", () => {
    const result = simulateTournamentFoundation();

    expect(result.status).toBe("success");
    expect(result.tournamentName).toBe("Sample Foundation Tournament");
    expect(result.dataScope).toBe("sample_foundation_8_team_tournament");
    expect(result.simulationCount).toBe(1000);
    expect(result.teamResults).toHaveLength(8);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.metadata.mode).toBe("pure_handlers");
    expect(result.metadata.serverEnabled).toBe(false);
  });

  it("team results are sorted by champion probability descending", () => {
    const result = simulateTournamentFoundation();

    for (let i = 1; i < result.teamResults.length; i += 1) {
      const prev = result.teamResults[i - 1];
      const curr = result.teamResults[i];

      if (prev !== undefined && curr !== undefined) {
        expect(prev.championProbability).toBeGreaterThanOrEqual(curr.championProbability);
      }
    }
  });

  it("team results have correct shape and ranks", () => {
    const result = simulateTournamentFoundation();

    result.teamResults.forEach((entry, index) => {
      expect(entry.rank).toBe(index + 1);
      expect(entry.team.length).toBeGreaterThan(0);
      expect(entry.championProbability).toBeGreaterThanOrEqual(0);
      expect(entry.runnerUpProbability).toBeGreaterThanOrEqual(0);
    });
  });

  it("champion probabilities sum to approximately 1", () => {
    const result = simulateTournamentFoundation();
    const total = result.teamResults.reduce((sum, entry) => sum + entry.championProbability, 0);

    expect(total).toBeCloseTo(1, 1);
  });

  it("returns deterministic output for the same seed", () => {
    const first = simulateTournamentFoundation();
    const second = simulateTournamentFoundation();

    expect(first.teamResults).toEqual(second.teamResults);
    expect(first.simulationCount).toBe(second.simulationCount);
  });
});
