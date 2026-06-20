import { describe, expect, it } from "vitest";
import {
  getLiveEloRatingsFoundation,
  getHistoricalReplayAudit,
  getTeamRatingsFoundation,
  predictMatchFromLiveElo,
  simulateTournamentFoundation
} from "../src/index.js";

// ── Live Elo ratings top 15 ──────────────────────────────────────────────────

describe("regression snapshot: live Elo ratings top 15", () => {
  const result = getLiveEloRatingsFoundation();

  it("pipeline processed 312 matches and rated 60 teams", () => {
    expect(result.matchesProcessed).toBe(312);
    expect(result.teamsRatedTotal).toBe(60);
  });

  it("latest match date is 2024-07-14", () => {
    expect(result.latestMatchDate).toBe("2024-07-14");
  });

  it("returns exactly 15 top-rated team entries", () => {
    expect(result.teams).toHaveLength(15);
  });

  it("top 5 team names are in the expected order", () => {
    const top5 = result.teams.slice(0, 5).map(t => t.team);
    expect(top5).toEqual(["Argentina", "Netherlands", "Spain", "Colombia", "France"]);
  });

  it("all 15 team names and ranks match the snapshot", () => {
    const SNAPSHOT: { rank: number; team: string }[] = [
      { rank: 1,  team: "Argentina"   },
      { rank: 2,  team: "Netherlands" },
      { rank: 3,  team: "Spain"       },
      { rank: 4,  team: "Colombia"    },
      { rank: 5,  team: "France"      },
      { rank: 6,  team: "Brazil"      },
      { rank: 7,  team: "Germany"     },
      { rank: 8,  team: "Belgium"     },
      { rank: 9,  team: "Uruguay"     },
      { rank: 10, team: "England"     },
      { rank: 11, team: "Portugal"    },
      { rank: 12, team: "Venezuela"   },
      { rank: 13, team: "Croatia"     },
      { rank: 14, team: "Sweden"      },
      { rank: 15, team: "Switzerland" },
    ];
    for (let i = 0; i < SNAPSHOT.length; i++) {
      expect(result.teams[i]!.rank).toBe(SNAPSHOT[i]!.rank);
      expect(result.teams[i]!.team).toBe(SNAPSHOT[i]!.team);
    }
  });

  it("Argentina leads with an Elo rating close to 1620.86", () => {
    expect(result.teams[0]!.team).toBe("Argentina");
    expect(result.teams[0]!.eloRating).toBeCloseTo(1620.86, 1);
  });

  it("all 15 Elo ratings match expected values to 1 decimal place", () => {
    // Expected values are 2dp-rounded from the deterministic probe run.
    // Tolerance is ±0.05 (numDigits=1), giving a 10× safety margin over the actual diffs.
    const EXPECTED_ELOS = [
      1620.86, 1605.38, 1577.72, 1576.95, 1575.33,
      1573.59, 1570.29, 1562.62, 1530.40, 1530.11,
      1519.96, 1513.53, 1511.48, 1510.75, 1508.76,
    ];
    for (let i = 0; i < EXPECTED_ELOS.length; i++) {
      expect(result.teams[i]!.eloRating).toBeCloseTo(EXPECTED_ELOS[i]!, 1);
    }
  });

  it("Elo ratings are in descending order from rank 1 to rank 15", () => {
    const elos = result.teams.map(t => t.eloRating);
    for (let i = 1; i < elos.length; i++) {
      expect(elos[i]).toBeLessThanOrEqual(elos[i - 1]!);
    }
  });
});

// ── Canada vs Bosnia-Herzegovina live Elo prediction ────────────────────────

describe("regression snapshot: Canada vs Bosnia-Herzegovina prediction", () => {
  const result = predictMatchFromLiveElo({
    homeTeam: "Canada",
    awayTeam: "Bosnia-Herzegovina",
    maxGoals: 6,
    mostLikelyScorelineLimit: 5
  });

  it("succeeds and echoes canonical team names in the request", () => {
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.request.homeTeam).toBe("Canada");
    expect(result.request.awayTeam).toBe("Bosnia-Herzegovina");
  });

  it("Canada is ranked 56th and Bosnia-Herzegovina 33rd", () => {
    if (result.status !== "success") return;
    expect(result.liveElo.homeRank).toBe(56);
    expect(result.liveElo.awayRank).toBe(33);
  });

  it("Elo difference is -30.37 and Bosnia-Herzegovina has the xG edge", () => {
    if (result.status !== "success") return;
    expect(result.expectedGoals.eloDifference).toBe(-30.37);
    expect(result.expectedGoals.home).toBe(1.20);
    expect(result.expectedGoals.away).toBe(1.30);
  });

  it("xG values are finite and within the [0.2, 4.0] model bounds", () => {
    if (result.status !== "success") return;
    for (const v of [result.expectedGoals.home, result.expectedGoals.away]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0.2);
      expect(v).toBeLessThanOrEqual(4.0);
    }
  });

  it("probabilities sum to 1 and Bosnia-Herzegovina is favored", () => {
    if (result.status !== "success") return;
    const { homeWinProbability, drawProbability, awayWinProbability } = result.outcomeProbabilities;
    expect(homeWinProbability + drawProbability + awayWinProbability).toBeCloseTo(1, 10);
    expect(awayWinProbability).toBeGreaterThan(homeWinProbability);
  });

  it("home win probability matches expected value", () => {
    if (result.status !== "success") return;
    expect(result.outcomeProbabilities.homeWinProbability).toBeCloseTo(0.3413, 4);
  });

  it("most likely scoreline is 1-1", () => {
    if (result.status !== "success") return;
    const top = result.mostLikelyScorelines[0]!;
    expect(top.homeGoals).toBe(1);
    expect(top.awayGoals).toBe(1);
  });
});

// ── South Korea vs Czechia live Elo prediction ───────────────────────────────

describe("regression snapshot: South Korea vs Czechia prediction", () => {
  const result = predictMatchFromLiveElo({
    homeTeam: "South Korea",
    awayTeam: "Czechia",
    maxGoals: 6,
    mostLikelyScorelineLimit: 5
  });

  it("succeeds and echoes canonical team names in the request", () => {
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.request.homeTeam).toBe("South Korea");
    expect(result.request.awayTeam).toBe("Czechia");
  });

  it("South Korea is ranked 55th and Czechia 34th", () => {
    if (result.status !== "success") return;
    expect(result.liveElo.homeRank).toBe(55);
    expect(result.liveElo.awayRank).toBe(34);
  });

  it("xG snapshot: home 1.21, away 1.29 with Czechia holding the edge", () => {
    if (result.status !== "success") return;
    const { home, away } = result.expectedGoals;
    expect(Number.isFinite(home)).toBe(true);
    expect(Number.isFinite(away)).toBe(true);
    expect(home).toBeGreaterThanOrEqual(0.2);
    expect(away).toBeGreaterThanOrEqual(0.2);
    expect(home).toBeLessThanOrEqual(4.0);
    expect(away).toBeLessThanOrEqual(4.0);
    expect(home).toBe(1.21);
    expect(away).toBe(1.29);
  });

  it("probabilities sum to 1 and Czechia is favored", () => {
    if (result.status !== "success") return;
    const { homeWinProbability, drawProbability, awayWinProbability } = result.outcomeProbabilities;
    expect(homeWinProbability + drawProbability + awayWinProbability).toBeCloseTo(1, 10);
    expect(awayWinProbability).toBeGreaterThan(homeWinProbability);
  });

  it("home win probability matches expected value", () => {
    if (result.status !== "success") return;
    expect(result.outcomeProbabilities.homeWinProbability).toBeCloseTo(0.3460, 4);
  });
});

// ── Germany vs New Zealand live Elo prediction ───────────────────────────────

describe("regression snapshot: Germany vs New Zealand prediction", () => {
  const result = predictMatchFromLiveElo({
    homeTeam: "Germany",
    awayTeam: "New Zealand",
    maxGoals: 6,
    mostLikelyScorelineLimit: 5
  });

  it("succeeds with Germany ranked 7th and New Zealand 21st", () => {
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.liveElo.homeRank).toBe(7);
    expect(result.liveElo.awayRank).toBe(21);
  });

  it("Elo difference is 70 and home xG exceeds away xG", () => {
    if (result.status !== "success") return;
    expect(result.expectedGoals.eloDifference).toBe(70);
    expect(result.expectedGoals.home).toBe(1.36);
    expect(result.expectedGoals.away).toBe(1.14);
  });

  it("xG values are finite and within model bounds", () => {
    if (result.status !== "success") return;
    for (const v of [result.expectedGoals.home, result.expectedGoals.away]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0.2);
      expect(v).toBeLessThanOrEqual(4.0);
    }
  });

  it("Germany is favored and probabilities sum to 1", () => {
    if (result.status !== "success") return;
    const { homeWinProbability, drawProbability, awayWinProbability } = result.outcomeProbabilities;
    expect(homeWinProbability + drawProbability + awayWinProbability).toBeCloseTo(1, 10);
    expect(homeWinProbability).toBeGreaterThan(awayWinProbability);
  });

  it("Germany home win probability matches expected value", () => {
    if (result.status !== "success") return;
    expect(result.outcomeProbabilities.homeWinProbability).toBeCloseTo(0.4181, 4);
  });
});

// ── Tournament simulation foundation ────────────────────────────────────────

describe("regression snapshot: tournament simulation foundation", () => {
  const result = simulateTournamentFoundation();

  it("ran 1000 simulations with 8 teams", () => {
    expect(result.simulationCount).toBe(1000);
    expect(result.teamResults).toHaveLength(8);
  });

  it("champion probabilities sum to 1.0", () => {
    const total = result.teamResults.reduce((sum, t) => sum + t.championProbability, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("Netherlands is ranked first champion for seed 2026", () => {
    expect(result.teamResults[0]!.team).toBe("Netherlands");
    expect(result.teamResults[0]!.rank).toBe(1);
  });

  it("top 4 champion order is stable for seed 2026", () => {
    const top4 = result.teamResults.slice(0, 4).map(t => t.team);
    expect(top4).toEqual(["Netherlands", "Brazil", "Germany", "Argentina"]);
  });

  it("Netherlands champion probability is close to 13.8%", () => {
    expect(result.teamResults[0]!.championProbability).toBeCloseTo(0.138, 2);
  });

  it("all champion and runner-up probabilities are in the [0, 1] range", () => {
    for (const t of result.teamResults) {
      expect(t.championProbability).toBeGreaterThanOrEqual(0);
      expect(t.championProbability).toBeLessThanOrEqual(1);
      expect(t.runnerUpProbability).toBeGreaterThanOrEqual(0);
      expect(t.runnerUpProbability).toBeLessThanOrEqual(1);
    }
  });
});

// ── Historical replay audit summary ─────────────────────────────────────────

describe("regression snapshot: historical replay audit summary", () => {
  const result = getHistoricalReplayAudit();

  it("status is success and apiReadiness is ready_with_warnings", () => {
    expect(result.status).toBe("success");
    expect(result.apiReadiness).toBe("ready_with_warnings");
  });

  it("supported years are exactly [2010, 2014, 2018, 2022]", () => {
    expect(result.supportedYears).toEqual([2010, 2014, 2018, 2022]);
  });

  it("all metric availability fields are true", () => {
    expect(result.metricAvailability).toEqual({
      brierScore: true,
      logLoss: true,
      top1Hit: true,
      top3Hit: true,
      top5Hit: true
    });
  });

  it("all component availability fields are true", () => {
    expect(result.componentAvailability).toEqual({
      datasetCompleteness: true,
      bracketReconstruction: true,
      eloSnapshotReplay: true,
      monteCarloReplay: true,
      replayValidation: true
    });
  });

  it("known gaps list is non-empty", () => {
    expect(result.knownGaps.length).toBeGreaterThan(0);
  });
});

// ── Team ratings foundation ──────────────────────────────────────────────────

describe("regression snapshot: team ratings foundation", () => {
  const result = getTeamRatingsFoundation();

  it("has 10 teams with Brazil as strongest offense and France as strongest defense", () => {
    expect(result.status).toBe("success");
    expect(result.teams).toHaveLength(10);
    expect(result.strongestOffenseTeam).toBe("Brazil");
    expect(result.strongestOffenseScore).toBe(90);
    expect(result.strongestDefenseTeam).toBe("France");
    expect(result.strongestDefenseScore).toBe(90);
  });

  it("aggregate static stats: top Elo 1870 and average Elo 1807", () => {
    expect(result.topEloRating).toBe(1870);
    expect(result.averageEloRating).toBe(1807);
  });

  it("top 5 static team entries match the foundation snapshot", () => {
    const SNAPSHOT = [
      { rank: 1, team: "Argentina", tier: "Elite",  eloRating: 1870, offenseStrength: 88, defenseStrength: 82 },
      { rank: 2, team: "France",    tier: "Elite",  eloRating: 1855, offenseStrength: 85, defenseStrength: 90 },
      { rank: 3, team: "Spain",     tier: "Elite",  eloRating: 1840, offenseStrength: 88, defenseStrength: 84 },
      { rank: 4, team: "England",   tier: "Elite",  eloRating: 1825, offenseStrength: 84, defenseStrength: 80 },
      { rank: 5, team: "Brazil",    tier: "Elite",  eloRating: 1818, offenseStrength: 90, defenseStrength: 78 },
    ];
    for (let i = 0; i < SNAPSHOT.length; i++) {
      const entry = result.teams[i]!;
      const snap = SNAPSHOT[i]!;
      expect(entry.rank).toBe(snap.rank);
      expect(entry.team).toBe(snap.team);
      expect(entry.tier).toBe(snap.tier);
      expect(entry.eloRating).toBe(snap.eloRating);
      expect(entry.offenseStrength).toBe(snap.offenseStrength);
      expect(entry.defenseStrength).toBe(snap.defenseStrength);
    }
  });

  it("four Strong-tier teams follow Elite teams in the order Germany-Netherlands-Belgium-Italy", () => {
    const strong = result.teams.filter(t => t.tier === "Strong").map(t => t.team);
    expect(strong).toEqual(["Germany", "Netherlands", "Belgium", "Italy"]);
  });
});
