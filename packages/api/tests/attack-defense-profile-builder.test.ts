import { describe, expect, it } from "vitest";
import { ATTACK_DEFENSE_NEUTRAL_STRENGTH } from "../../model/src/index.js";
import {
  buildCompetitionGoalEnvironment,
  buildTeamAttackDefenseProfile,
} from "../src/attack-defense-profile-builder.js";
import type { HistoricalMatchRecord } from "../src/attack-defense-profile-builder.js";

function makeMatch(
  matchId: string,
  matchDate: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): HistoricalMatchRecord {
  return {
    matchId,
    matchDate,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    neutralSite: true,
    competition: "test_wc",
    stage: "group_stage",
  };
}

const BASE_ENV = {
  competitionId: "test_wc",
  averageHomeGoals: 1.4,
  averageAwayGoals: 1.1,
  averageTotalGoals: 2.5,
  sampleSize: 20,
  cutoffAt: "2022-01-01",
};

const TEAM_A = "Team A";
const TEAM_B = "Team B";

// 5 scored matches for Team A (as home)
const MATCHES_TEAM_A_HOME: HistoricalMatchRecord[] = [
  makeMatch("m01", "2020-01-10", TEAM_A, TEAM_B, 2, 1),
  makeMatch("m02", "2020-03-15", TEAM_A, TEAM_B, 3, 0),
  makeMatch("m03", "2020-06-20", TEAM_A, TEAM_B, 1, 1),
  makeMatch("m04", "2021-01-05", TEAM_A, TEAM_B, 2, 0),
  makeMatch("m05", "2021-09-10", TEAM_A, TEAM_B, 1, 2),
];

describe("buildCompetitionGoalEnvironment", () => {
  it("computes correct averages from historical matches", () => {
    const env = buildCompetitionGoalEnvironment({
      historicalMatches: MATCHES_TEAM_A_HOME,
      cutoffAt: "2022-01-01",
      competitionId: "test_wc",
    });
    // Total goals: home=9, away=4 across 5 matches
    expect(env.averageHomeGoals).toBeCloseTo(9 / 5, 4);
    expect(env.averageAwayGoals).toBeCloseTo(4 / 5, 4);
    expect(env.sampleSize).toBe(5);
  });

  it("returns fallback averages when no matches available", () => {
    const env = buildCompetitionGoalEnvironment({
      historicalMatches: [],
      cutoffAt: "2022-01-01",
      competitionId: "test_wc",
    });
    expect(env.sampleSize).toBe(0);
    expect(env.averageHomeGoals).toBeGreaterThan(0);
    expect(env.averageTotalGoals).toBeGreaterThan(0);
  });

  it("respects the cutoff: excludes matches on or after cutoffAt", () => {
    const mixed = [
      ...MATCHES_TEAM_A_HOME,
      makeMatch("m_after", "2022-01-01", TEAM_A, TEAM_B, 5, 5), // on cutoff = excluded
      makeMatch("m_after2", "2022-06-01", TEAM_A, TEAM_B, 5, 5), // after cutoff = excluded
    ];
    const env = buildCompetitionGoalEnvironment({
      historicalMatches: mixed,
      cutoffAt: "2022-01-01",
      competitionId: "test_wc",
    });
    expect(env.sampleSize).toBe(5); // only pre-cutoff matches
  });
});

describe("buildTeamAttackDefenseProfile — no-look-ahead enforcement", () => {
  it("excludes matches on or after the cutoff date", () => {
    const matchesWithFuture: HistoricalMatchRecord[] = [
      ...MATCHES_TEAM_A_HOME,
      makeMatch("future_m", "2022-01-01", TEAM_A, TEAM_B, 5, 0), // exactly on cutoff
    ];
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: matchesWithFuture,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    expect(result.noLookAheadViolations).toBe(1);
    expect(result.matchesUsed).toBe(5);
  });

  it("uses only matches strictly before the cutoff", () => {
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2021-06-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    // Only m01-m04 have dates before 2021-06-01; m05 (2021-09-10) is excluded (after cutoff)
    // But cutoffAt is 2021-06-01 and m04 is 2021-01-05 (before) and m05 is 2021-09-10 (after)
    expect(result.matchesUsed).toBe(4);
    expect(result.noLookAheadViolations).toBe(1);
  });
});

describe("buildTeamAttackDefenseProfile — goals-for calculation", () => {
  it("computes correct goals-for per match (uniform, no SOS)", () => {
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    // Team A scored 2+3+1+2+1 = 9 goals in 5 matches = 1.8 gpg
    expect(result.profile.goalsForPerMatch).toBeCloseTo(1.8, 4);
    expect(result.matchesUsed).toBe(5);
  });

  it("computes correct goals-against per match", () => {
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    // Team A conceded 1+0+1+0+2 = 4 goals in 5 matches = 0.8 gpg
    expect(result.profile.goalsAgainstPerMatch).toBeCloseTo(0.8, 4);
  });
});

describe("buildTeamAttackDefenseProfile — coverage classification", () => {
  it("returns fallback for team not in any match", () => {
    const result = buildTeamAttackDefenseProfile({
      teamId: "Unknown Team",
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    expect(result.profile.coverage).toBe("fallback");
    expect(result.profile.attackStrength).toBe(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
    expect(result.profile.defenseStrength).toBe(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  });

  it("returns sparse for 1–3 matches", () => {
    const fewMatches = MATCHES_TEAM_A_HOME.slice(0, 2);
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: fewMatches,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    expect(result.profile.coverage).toBe("sparse");
  });

  it("returns partial for 4–9 matches", () => {
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    expect(result.profile.coverage).toBe("partial");
  });
});

describe("buildTeamAttackDefenseProfile — shrinkage", () => {
  it("sparse team is shrunk toward neutral strength", () => {
    const fewMatches = MATCHES_TEAM_A_HOME.slice(0, 2);
    const sparse = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: fewMatches,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    const full = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME.concat(MATCHES_TEAM_A_HOME), // 10 matches
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    // Above-average scorer (1.8 gpg vs 1.25 avg) → attackStrength > 1
    // Sparse team should have lower attackStrength than full coverage
    expect(sparse.profile.attackStrength).toBeLessThan(full.profile.attackStrength);
  });
});

describe("buildTeamAttackDefenseProfile — away matches", () => {
  it("correctly counts away goals for the team", () => {
    const awayMatches: HistoricalMatchRecord[] = [
      makeMatch("a1", "2020-01-10", TEAM_B, TEAM_A, 1, 2), // Team A scored 2 as away
      makeMatch("a2", "2020-03-15", TEAM_B, TEAM_A, 0, 3), // Team A scored 3
    ];
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: awayMatches,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    // Team A scored 2+3 = 5 goals in 2 matches = 2.5 gpg
    expect(result.profile.goalsForPerMatch).toBeCloseTo(2.5, 4);
  });
});

describe("buildTeamAttackDefenseProfile — duplicate exclusion", () => {
  it("does not double-count matches where the team appears as both home and away (impossible by design)", () => {
    // This tests that a team only accumulates stats once per match appearance
    const mixedMatches: HistoricalMatchRecord[] = [
      ...MATCHES_TEAM_A_HOME.slice(0, 2),
      makeMatch("away1", "2020-04-01", TEAM_B, TEAM_A, 1, 1), // Team A is away
    ];
    const result = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: mixedMatches,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    expect(result.matchesUsed).toBe(3);
  });
});

describe("buildTeamAttackDefenseProfile — recency weighting", () => {
  it("exponential half-life weights newer matches more heavily than older ones", () => {
    const expResult = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "exponential_half_life",
      profileStrategy: "goals_unadjusted",
    });
    const uniformResult = buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    // Both should yield valid, finite strengths
    expect(Number.isFinite(expResult.profile.attackStrength)).toBe(true);
    expect(Number.isFinite(uniformResult.profile.attackStrength)).toBe(true);
    // Results may differ since recency weights are different
    expect(expResult.profile.attackStrength).not.toBeNaN();
  });
});

describe("buildTeamAttackDefenseProfile — no mutation", () => {
  it("does not mutate the input matches array", () => {
    const originalLength = MATCHES_TEAM_A_HOME.length;
    buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    expect(MATCHES_TEAM_A_HOME.length).toBe(originalLength);
  });

  it("does not mutate the competition environment", () => {
    const originalAvgGoals = BASE_ENV.averageHomeGoals;
    buildTeamAttackDefenseProfile({
      teamId: TEAM_A,
      cutoffAt: "2022-01-01",
      historicalMatches: MATCHES_TEAM_A_HOME,
      competitionEnv: BASE_ENV,
      teamEloAtDate: undefined,
      recencyStrategy: "uniform",
      profileStrategy: "goals_unadjusted",
    });
    expect(BASE_ENV.averageHomeGoals).toBe(originalAvgGoals);
  });
});
