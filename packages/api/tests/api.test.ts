import { describe, expect, it } from "vitest";
import {
  ELO_TO_XG_BASE_GOALS,
  ELO_TO_XG_MAX_GOALS,
  ELO_TO_XG_MIN_GOALS,
  ELO_TO_XG_UNCALIBRATED_WARNING,
  eloToExpectedGoals
} from "../../model/src/elo-to-xg.js";
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
    expect(result.recencyWeighting.enabled).toBe(false);
    expect(result.recencyWeighting.matchesWeighted).toBe(0);
    expect(result.competitionWeighting.enabled).toBe(false);
    expect(result.competitionWeighting.matchesWeighted).toBe(0);
    expect(result.homeAdvantage.enabled).toBe(false);
    expect(result.homeAdvantage.matchesEvaluated).toBe(0);
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
    expect(result.metadata.notes).toContain("Recency weighting enabled: false.");
    expect(result.metadata.notes).toContain("Competition weighting enabled: false.");
    expect(result.metadata.notes).toContain("Home advantage enabled: false.");
  });

  it("supports an opt-in recency-weighted Live Elo response", () => {
    const defaultResult = getLiveEloRatingsFoundation();
    const weightedResult = getLiveEloRatingsFoundation({
      recencyWeighting: { enabled: true, referenceDate: "2024-07-14" }
    });

    expect(weightedResult.status).toBe("success");
    expect(weightedResult.matchesProcessed).toBe(defaultResult.matchesProcessed);
    expect(weightedResult.recencyWeighting).toMatchObject({
      enabled: true,
      referenceDate: "2024-07-14",
      matchesWeighted: 312
    });
    expect(weightedResult.teams).not.toEqual(defaultResult.teams);
    expect(weightedResult.metadata.notes).toContain("Recency weighting enabled: true.");
    expect(weightedResult.warnings.some((warning) => warning.includes("Recency weighting is enabled"))).toBe(true);
  });

  it("supports an opt-in competition-weighted Live Elo response", () => {
    const defaultResult = getLiveEloRatingsFoundation();
    const weightedResult = getLiveEloRatingsFoundation({
      competitionWeighting: { enabled: true }
    });

    expect(weightedResult.status).toBe("success");
    expect(weightedResult.matchesProcessed).toBe(defaultResult.matchesProcessed);
    expect(weightedResult.competitionWeighting).toMatchObject({
      enabled: true,
      matchesWeighted: 312,
      weights: {
        fifa_world_cup: 4,
        continental_championship: 3,
        world_cup_qualifier: 2,
        nations_league: 1.5,
        international_friendly: 1,
        unknown: 1
      }
    });
    expect(weightedResult.teams).not.toEqual(defaultResult.teams);
    expect(weightedResult.metadata.notes).toContain("Competition weighting enabled: true.");
    expect(weightedResult.warnings.some((warning) => warning.includes("Competition weighting is enabled"))).toBe(true);
  });

  it("supports an opt-in home-advantage Live Elo response", () => {
    const defaultResult = getLiveEloRatingsFoundation();
    const homeAdvantageResult = getLiveEloRatingsFoundation({
      homeAdvantage: { enabled: true }
    });

    expect(homeAdvantageResult.status).toBe("success");
    expect(homeAdvantageResult.matchesProcessed).toBe(defaultResult.matchesProcessed);
    expect(homeAdvantageResult.homeAdvantage).toMatchObject({
      enabled: true,
      eloPoints: 60,
      matchesEvaluated: 312
    });
    expect(homeAdvantageResult.teams).not.toEqual(defaultResult.teams);
    expect(homeAdvantageResult.metadata.notes).toContain("Home advantage enabled: true.");
    expect(homeAdvantageResult.warnings.some((warning) => warning.includes("Home advantage is enabled"))).toBe(true);
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

  it("result includes attackDefense metadata field", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.attackDefense).toBeDefined();
    expect(typeof result.attackDefense.enabled).toBe("boolean");
  });

  it("attackDefense.enabled is false by default", () => {
    const result = getLiveEloRatingsFoundation();

    expect(result.attackDefense.enabled).toBe(false);
  });

  it("team entries have no attackScore/defenseScore when attackDefense is disabled", () => {
    const result = getLiveEloRatingsFoundation();

    for (const team of result.teams) {
      expect(team.attackScore).toBeUndefined();
      expect(team.defenseScore).toBeUndefined();
    }
  });

  it("team entries carry attackScore and defenseScore when attackDefense is enabled", () => {
    const result = getLiveEloRatingsFoundation({ attackDefense: { enabled: true } });

    expect(result.attackDefense.enabled).toBe(true);
    for (const team of result.teams) {
      expect(typeof team.attackScore).toBe("number");
      expect(typeof team.defenseScore).toBe("number");
    }
  });

  it("Elo rankings are the same whether attackDefense is enabled or not", () => {
    const base = getLiveEloRatingsFoundation();
    const withAD = getLiveEloRatingsFoundation({ attackDefense: { enabled: true } });

    const baseRanks = base.teams.map((t) => ({ team: t.team, eloRating: t.eloRating, rank: t.rank }));
    const withADRanks = withAD.teams.map((t) => ({ team: t.team, eloRating: t.eloRating, rank: t.rank }));

    expect(withADRanks).toEqual(baseRanks);
  });
});

describe("predictMatchFromLiveElo — xG calibration behavior", () => {
  it("prediction includes uncalibrated xG warning", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Argentina" });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.warnings.some((w) => w.includes("Elo difference mapping"))).toBe(true);
  });

  it("expected goals are finite and within valid bounds", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Germany" });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(isFinite(result.expectedGoals.home)).toBe(true);
    expect(isFinite(result.expectedGoals.away)).toBe(true);
    expect(result.expectedGoals.home).toBeGreaterThanOrEqual(ELO_TO_XG_MIN_GOALS);
    expect(result.expectedGoals.home).toBeLessThanOrEqual(ELO_TO_XG_MAX_GOALS);
    expect(result.expectedGoals.away).toBeGreaterThanOrEqual(ELO_TO_XG_MIN_GOALS);
    expect(result.expectedGoals.away).toBeLessThanOrEqual(ELO_TO_XG_MAX_GOALS);
  });

  it("baseExpectedGoals matches the configured base value", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Spain", awayTeam: "England" });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.expectedGoals.baseExpectedGoals).toBe(ELO_TO_XG_BASE_GOALS);
  });

  it("elo difference is consistent with the team ratings", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Argentina", awayTeam: "France" });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.expectedGoals.eloDifference).toBeCloseTo(
      result.liveElo.homeEloRating - result.liveElo.awayEloRating,
      2
    );
  });

  it("eloToExpectedGoals model helper produces same values as predictMatchFromLiveElo", () => {
    const apiResult = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Brazil" });

    expect(apiResult.status).toBe("success");

    if (apiResult.status !== "success") return;

    const modelResult = eloToExpectedGoals({
      homeEloRating: apiResult.liveElo.homeEloRating,
      awayEloRating: apiResult.liveElo.awayEloRating
    });

    expect(apiResult.expectedGoals.home).toBe(modelResult.homeExpectedGoals);
    expect(apiResult.expectedGoals.away).toBe(modelResult.awayExpectedGoals);
    expect(apiResult.expectedGoals.eloDifference).toBe(modelResult.eloDifference);
    expect(apiResult.expectedGoals.baseExpectedGoals).toBe(modelResult.baseGoals);
    expect(apiResult.expectedGoals.goalsAdjustment).toBe(modelResult.eloAdjustment);
  });

  it("prediction output is deterministic across repeated calls", () => {
    const first = predictMatchFromLiveElo({ homeTeam: "Netherlands", awayTeam: "Portugal" });
    const second = predictMatchFromLiveElo({ homeTeam: "Netherlands", awayTeam: "Portugal" });

    expect(first).toEqual(second);
  });

  it("the uncalibrated warning constant matches the API warning string", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Germany", awayTeam: "Spain" });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.warnings).toContain(ELO_TO_XG_UNCALIBRATED_WARNING);
  });
});

describe("predictMatchFromLiveElo — prediction presets", () => {
  it("default response includes preset and presetDescription fields", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "Brazil" });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.expectedGoals.preset).toBe("balanced");
    expect(result.expectedGoals.presetDescription.length).toBeGreaterThan(0);
  });

  it("explicit balanced preset produces same xG as omitting preset", () => {
    const defaultResult = predictMatchFromLiveElo({ homeTeam: "Argentina", awayTeam: "Germany" });
    const balancedResult = predictMatchFromLiveElo({ homeTeam: "Argentina", awayTeam: "Germany", preset: "balanced" });

    expect(defaultResult.status).toBe("success");
    expect(balancedResult.status).toBe("success");

    if (defaultResult.status !== "success" || balancedResult.status !== "success") return;

    expect(defaultResult.expectedGoals.home).toBe(balancedResult.expectedGoals.home);
    expect(defaultResult.expectedGoals.away).toBe(balancedResult.expectedGoals.away);
  });

  it("conservative preset produces a smaller xG gap than balanced", () => {
    const balanced = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "United States", preset: "balanced" });
    const conservative = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "United States", preset: "conservative" });

    expect(balanced.status).toBe("success");
    expect(conservative.status).toBe("success");

    if (balanced.status !== "success" || conservative.status !== "success") return;

    const balancedGap = balanced.expectedGoals.home - balanced.expectedGoals.away;
    const conservativeGap = conservative.expectedGoals.home - conservative.expectedGoals.away;

    expect(conservativeGap).toBeLessThan(balancedGap);
    expect(conservative.expectedGoals.preset).toBe("conservative");
  });

  it("aggressive preset produces a larger xG gap than balanced", () => {
    const balanced = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "United States", preset: "balanced" });
    const aggressive = predictMatchFromLiveElo({ homeTeam: "France", awayTeam: "United States", preset: "aggressive" });

    expect(balanced.status).toBe("success");
    expect(aggressive.status).toBe("success");

    if (balanced.status !== "success" || aggressive.status !== "success") return;

    const balancedGap = balanced.expectedGoals.home - balanced.expectedGoals.away;
    const aggressiveGap = aggressive.expectedGoals.home - aggressive.expectedGoals.away;

    expect(aggressiveGap).toBeGreaterThan(balancedGap);
    expect(aggressive.expectedGoals.preset).toBe("aggressive");
  });

  it("invalid preset is rejected with a validation error", () => {
    const result = predictMatchFromLiveElo({
      homeTeam: "France",
      awayTeam: "Brazil",
      preset: "invalid_preset" as "balanced"
    });

    expect(result.status).toBe("validation_error");

    if (result.status !== "validation_error") return;

    expect(result.issues.map((issue) => issue.field)).toContain("preset");
  });

  it("metadata notes include the active preset", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Spain", awayTeam: "England", preset: "aggressive" });

    expect(result.status).toBe("success");

    if (result.status !== "success") return;

    expect(result.metadata.notes.some((note) => note.includes("Prediction preset:"))).toBe(true);
    expect(result.metadata.notes.some((note) => note.includes("aggressive"))).toBe(true);
  });
});
