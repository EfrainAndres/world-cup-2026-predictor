import { describe, expect, it } from "vitest";
import {
  apiRoutes,
  getAvailableLiveEloTeams,
  getHealth,
  getHistoricalReplayAudit,
  getHistoricalTournamentSummary,
  getLiveEloRatingsFoundation,
  getModelInfo,
  getTeamRatingsFoundation,
  predictMatchFromLiveElo,
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

  it("predicts a match automatically from live Elo team names", () => {
    const result = predictMatchFromLiveElo({
      homeTeam: "Argentina",
      awayTeam: "France",
      maxGoals: 6,
      mostLikelyScorelineLimit: 4,
      monteCarlo: {
        simulationCount: 25,
        seed: 2026,
        mostCommonScorelineLimit: 2
      }
    });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.request.homeTeam).toBe("Argentina");
    expect(result.request.awayTeam).toBe("France");
    expect(result.request.expectedHomeGoals).toBe(result.expectedGoals.home);
    expect(result.request.expectedAwayGoals).toBe(result.expectedGoals.away);
    expect(result.expectedGoals.eloDifference).toBeCloseTo(result.liveElo.homeEloRating - result.liveElo.awayEloRating, 2);
    expect(result.outcomeProbabilities.totalProbability).toBeCloseTo(1, 10);
    expect(result.mostLikelyScorelines).toHaveLength(4);
    expect(result.monteCarloSimulation?.simulationCount).toBe(25);
    expect(result.warnings.some((warning) => warning.includes("Elo difference mapping"))).toBe(true);
  });

  it("predicts a match using team aliases", () => {
    const result = predictMatchFromLiveElo({
      homeTeam: "  holland ",
      awayTeam: "USMNT"
    });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.request.homeTeam).toBe("Netherlands");
    expect(result.request.awayTeam).toBe("United States");
    expect(result.liveElo.homeMatchedBy).toBe("alias");
    expect(result.liveElo.awayMatchedBy).toBe("alias");
  });

  it("rejects live Elo predictions when a team is not rated", () => {
    const result = predictMatchFromLiveElo({
      homeTeam: "Unknown Team",
      awayTeam: "France"
    });

    expect(result.status).toBe("validation_error");

    if (result.status !== "validation_error") return;

    expect(result.issues.map((issue) => issue.field)).toContain("homeTeam");
    expect(result.issues[0]?.suggestions?.length).toBeGreaterThan(0);
    expect(result.availableTeams).toContain("France");
  });

  it("exposes available live Elo team coverage", () => {
    const teams = getAvailableLiveEloTeams();

    expect(teams).toContain("France");
    expect(teams).toContain("Netherlands");
    expect(teams).toContain("United States");
    expect(teams).not.toContain("USA");
    expect(teams).toEqual([...teams].sort((a, b) => a.localeCompare(b)));
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
    expect(apiRoutes.predictMatchFromLiveElo({ homeTeam: "Argentina", awayTeam: "France" })).toEqual(
      predictMatchFromLiveElo({ homeTeam: "Argentina", awayTeam: "France" })
    );
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

describe("getTeamRatingsFoundation", () => {
  it("returns a success response with expected shape", () => {
    const result = getTeamRatingsFoundation();

    expect(result.status).toBe("success");
    expect(result.teams).toHaveLength(10);
    expect(result.ratingSource.length).toBeGreaterThan(0);
    expect(result.foundationWarning.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.metadata.mode).toBe("pure_handlers");
    expect(result.metadata.serverEnabled).toBe(false);
  });

  it("teams are sorted by rank ascending", () => {
    const result = getTeamRatingsFoundation();

    result.teams.forEach((entry, index) => {
      expect(entry.rank).toBe(index + 1);
    });
  });

  it("teams are sorted by eloRating descending", () => {
    const result = getTeamRatingsFoundation();

    for (let i = 1; i < result.teams.length; i += 1) {
      const prev = result.teams[i - 1];
      const curr = result.teams[i];

      if (prev !== undefined && curr !== undefined) {
        expect(prev.eloRating).toBeGreaterThanOrEqual(curr.eloRating);
      }
    }
  });

  it("each entry has required fields with valid values", () => {
    const result = getTeamRatingsFoundation();

    result.teams.forEach((entry) => {
      expect(entry.team.length).toBeGreaterThan(0);
      expect(entry.eloRating).toBeGreaterThan(0);
      expect(["Elite", "Strong", "Competitive"]).toContain(entry.tier);
      expect(entry.offenseStrength).toBeGreaterThanOrEqual(0);
      expect(entry.offenseStrength).toBeLessThanOrEqual(100);
      expect(entry.defenseStrength).toBeGreaterThanOrEqual(0);
      expect(entry.defenseStrength).toBeLessThanOrEqual(100);
      expect(entry.summary.length).toBeGreaterThan(0);
    });
  });

  it("strongest offense and defense indicators are consistent with team data", () => {
    const result = getTeamRatingsFoundation();
    const maxOffense = Math.max(...result.teams.map((t) => t.offenseStrength));
    const maxDefense = Math.max(...result.teams.map((t) => t.defenseStrength));

    expect(result.strongestOffenseScore).toBe(maxOffense);
    expect(result.strongestDefenseScore).toBe(maxDefense);

    const offenseTeam = result.teams.find((t) => t.team === result.strongestOffenseTeam);
    const defenseTeam = result.teams.find((t) => t.team === result.strongestDefenseTeam);

    expect(offenseTeam?.offenseStrength).toBe(maxOffense);
    expect(defenseTeam?.defenseStrength).toBe(maxDefense);
  });

  it("topEloRating matches the first team's eloRating", () => {
    const result = getTeamRatingsFoundation();

    expect(result.topEloRating).toBe(result.teams[0]?.eloRating);
  });

  it("returns identical output on repeated calls (deterministic)", () => {
    const first = getTeamRatingsFoundation();
    const second = getTeamRatingsFoundation();

    expect(first.teams).toEqual(second.teams);
    expect(first.strongestOffenseTeam).toBe(second.strongestOffenseTeam);
    expect(first.strongestDefenseTeam).toBe(second.strongestDefenseTeam);
  });
});

describe("getLiveEloRatingsFoundation", () => {
  it("returns a success response with expected shape", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.status).toBe("success");
    expect(result.teams.length).toBeGreaterThan(0);
    expect(result.matchesProcessed).toBe(312);
    expect(result.teamsRatedTotal).toBeGreaterThan(0);
    expect(result.dataCoverage.length).toBeGreaterThan(0);
    expect(result.pipelineVersion.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.metadata.mode).toBe("pure_handlers");
    expect(result.metadata.serverEnabled).toBe(false);
  });

  it("returns exactly 15 top-ranked teams", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.teams).toHaveLength(15);
  });

  it("teams are sorted by rank ascending (rank === index + 1)", () => {
    const result = getLiveEloRatingsFoundation();

    result.teams.forEach((entry, index) => {
      expect(entry.rank).toBe(index + 1);
    });
  });

  it("teams are sorted by eloRating descending", () => {
    const result = getLiveEloRatingsFoundation();

    for (let i = 1; i < result.teams.length; i += 1) {
      const prev = result.teams[i - 1];
      const curr = result.teams[i];

      if (prev !== undefined && curr !== undefined) {
        expect(prev.eloRating).toBeGreaterThanOrEqual(curr.eloRating);
      }
    }
  });

  it("each entry has required fields with valid values", () => {
    const result = getLiveEloRatingsFoundation();

    result.teams.forEach((entry) => {
      expect(entry.team.length).toBeGreaterThan(0);
      expect(entry.eloRating).toBeGreaterThan(0);
      expect(entry.matchesPlayed).toBeGreaterThan(0);
      expect(entry.rank).toBeGreaterThan(0);
    });
  });

  it("topEloRating matches the first team's eloRating", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.topEloRating).toBe(result.teams[0]?.eloRating);
  });

  it("latestMatchDate reflects the international supplement's latest match date", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.latestMatchDate).toBe("2024-07-14");
  });

  it("dataCoverage mentions international supplement competitions", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.dataCoverage).toContain("Copa America 2024");
    expect(result.dataCoverage).toContain("UEFA Euro 2024");
  });

  it("warnings include the international supplement warning", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.warnings.some((w) => w.includes("International match supplement"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("partial_international_history"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("not_complete_global_match_history"))).toBe(true);
  });

  it("metadata notes include the expanded international dataset", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.metadata.notes.some((note) => note.includes("international-matches-expanded-v1"))).toBe(true);
    expect(result.metadata.notes.some((note) => note.includes("56 expanded international supplement matches"))).toBe(true);
  });

  it("known strong teams appear in the top results", () => {
    const result = getLiveEloRatingsFoundation();

    const teamNames = result.teams.map((t) => t.team);

    expect(teamNames).toContain("France");
    expect(teamNames).toContain("Argentina");
  });

  it("teamsRatedTotal is greater than teams returned (more teams rated than displayed)", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.teamsRatedTotal).toBeGreaterThan(result.teams.length);
  });

  it("returns identical output on repeated calls (deterministic)", () => {
    const first = getLiveEloRatingsFoundation();
    const second = getLiveEloRatingsFoundation();

    expect(first.teams).toEqual(second.teams);
    expect(first.matchesProcessed).toBe(second.matchesProcessed);
    expect(first.topEloRating).toBe(second.topEloRating);
  });
});
