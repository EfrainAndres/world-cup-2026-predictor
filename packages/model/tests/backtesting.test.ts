import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculateBacktestBrierScore,
  calculateBacktestLogLoss,
  extractActualChampion,
  extractActualRunnerUp,
  generateBacktestCalibrationBuckets,
  runHistoricalBacktest
} from "../src/index.js";
import type {
  EloResult,
  HistoricalBacktestDecisionMethod,
  HistoricalBacktestFixture,
  HistoricalTournamentFixtureSubset,
  HistoricalTournamentPredictionInput,
  TeamProbabilitySnapshot
} from "../src/index.js";

interface RawFixtureFile {
  matches: RawFixtureMatch[];
}

interface RawFixtureMatch {
  match_id: string;
  tournament_year: number;
  stage: string;
  stage_order: number;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: EloResult;
  winner?: string;
  decided_by?: HistoricalBacktestDecisionMethod;
  penalty_home_score?: number;
  penalty_away_score?: number;
}

function readFixture(fileName: string): RawFixtureFile {
  const fixtureUrl = new URL(`../../data/fixtures/world-cup/${fileName}`, import.meta.url);

  return JSON.parse(readFileSync(fixtureUrl, "utf8")) as RawFixtureFile;
}

function toBacktestFixture(match: RawFixtureMatch): HistoricalBacktestFixture {
  const fixture: HistoricalBacktestFixture = {
    matchId: match.match_id,
    tournamentYear: match.tournament_year,
    stage: match.stage,
    stageOrder: match.stage_order,
    matchDate: match.match_date,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    homeScore: match.home_score,
    awayScore: match.away_score,
    result: match.result
  };

  if (match.winner !== undefined) {
    fixture.winner = match.winner;
  }

  if (match.decided_by !== undefined) {
    fixture.decidedBy = match.decided_by;
  }

  if (match.penalty_home_score !== undefined) {
    fixture.penaltyHomeScore = match.penalty_home_score;
  }

  if (match.penalty_away_score !== undefined) {
    fixture.penaltyAwayScore = match.penalty_away_score;
  }

  return fixture;
}

function subset(year: 2018 | 2022): HistoricalTournamentFixtureSubset {
  return {
    tournamentId: `world-cup-${year}`,
    tournamentName: `FIFA World Cup ${year}`,
    tournamentYear: year,
    matches: readFixture(`world-cup-${year}-results.json`).matches.map(toBacktestFixture),
    isPartial: true,
    coverageNote: "Curated partial fixture subset: semi-finals, third-place match, and final only."
  };
}

function probabilities(entries: readonly [string, number][]): TeamProbabilitySnapshot[] {
  return entries.map(([team, probability]) => ({ team, probability }));
}

function prediction(
  year: 2018 | 2022,
  championProbabilities: TeamProbabilitySnapshot[],
  runnerUpProbabilities: TeamProbabilitySnapshot[]
): HistoricalTournamentPredictionInput {
  const teams = year === 2018 ? ["France", "Croatia", "Belgium", "England"] : ["Argentina", "France", "Croatia", "Morocco"];

  return {
    tournamentId: `world-cup-${year}`,
    tournamentName: `FIFA World Cup ${year}`,
    championProbabilities,
    runnerUpProbabilities,
    knockoutQualificationProbabilities: teams.map((team) => ({ team, probability: 0.25 }))
  };
}

function predictions(): HistoricalTournamentPredictionInput[] {
  return [
    prediction(
      2018,
      probabilities([
        ["France", 0.6],
        ["Croatia", 0.25],
        ["Belgium", 0.1],
        ["England", 0.05]
      ]),
      probabilities([
        ["Croatia", 0.55],
        ["France", 0.25],
        ["Belgium", 0.15],
        ["England", 0.05]
      ])
    ),
    prediction(
      2022,
      probabilities([
        ["Argentina", 0.5],
        ["France", 0.35],
        ["Croatia", 0.1],
        ["Morocco", 0.05]
      ]),
      probabilities([
        ["France", 0.6],
        ["Argentina", 0.25],
        ["Croatia", 0.1],
        ["Morocco", 0.05]
      ])
    )
  ];
}

describe("historical backtesting and calibration foundation", () => {
  it("accepts a valid partial historical dataset", () => {
    const result = runHistoricalBacktest({
      fixtureSubsets: [subset(2018), subset(2022)],
      predictions: predictions()
    });

    expect(result.results).toHaveLength(2);
    expect(result.metadata.isPartialHistoricalValidation).toBe(true);
  });

  it("extracts the 2018 champion", () => {
    expect(extractActualChampion(subset(2018))).toBe("France");
  });

  it("extracts the 2022 champion from the penalty-decided final", () => {
    expect(extractActualChampion(subset(2022))).toBe("Argentina");
  });

  it("extracts runner-up for 2018 and 2022", () => {
    expect(extractActualRunnerUp(subset(2018))).toBe("Croatia");
    expect(extractActualRunnerUp(subset(2022))).toBe("France");
  });

  it("calculates Brier Score from champion probability snapshots", () => {
    expect(calculateBacktestBrierScore(probabilities([["France", 1], ["Croatia", 0]]), "France")).toBe(0);
  });

  it("uses safe epsilon for Log Loss", () => {
    expect(calculateBacktestLogLoss(probabilities([["France", 0], ["Croatia", 1]]), "France")).toBeGreaterThan(30);
  });

  it("reports Top-1 and Top-3 hit results", () => {
    const result = runHistoricalBacktest({
      fixtureSubsets: [subset(2018)],
      predictions: [predictions()[0]!]
    });

    expect(result.results[0]?.evaluation.championTop1Hit).toBe(true);
    expect(result.results[0]?.evaluation.championTop3Hit).toBe(true);
  });

  it("generates calibration buckets", () => {
    const actuals = [subset(2018), subset(2022)].map((fixtureSubset) => ({
      tournamentId: fixtureSubset.tournamentId,
      tournamentName: fixtureSubset.tournamentName,
      champion: extractActualChampion(fixtureSubset)
    }));
    const buckets = generateBacktestCalibrationBuckets(predictions(), actuals, 0.5);

    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.some((bucket) => bucket.predictionCount > 0)).toBe(true);
  });

  it("summarizes multiple historical years", () => {
    const result = runHistoricalBacktest({
      fixtureSubsets: [subset(2018), subset(2022)],
      predictions: predictions(),
      topN: 3
    });

    expect(result.summary.tournamentCount).toBe(2);
    expect(result.summary.years).toEqual([2018, 2022]);
    expect(result.summary.championTop1HitRate).toBe(1);
    expect(result.summary.championTop3HitRate).toBe(1);
    expect(result.summary.championTopNHitRate).toBe(1);
  });

  it("returns partial dataset warning metadata", () => {
    const result = runHistoricalBacktest({
      fixtureSubsets: [subset(2018)],
      predictions: [predictions()[0]!]
    });

    expect(result.summary.warnings.join(" ")).toContain("Partial historical validation only");
    expect(result.metadata.notes.join(" ")).toContain("not complete historical World Cup datasets");
  });

  it("rejects invalid probability snapshots", () => {
    expect(() =>
      runHistoricalBacktest({
        fixtureSubsets: [subset(2018)],
        predictions: [
          prediction(
            2018,
            probabilities([
              ["France", 1.2],
              ["Croatia", -0.2]
            ]),
            probabilities([["Croatia", 1]])
          )
        ]
      })
    ).toThrow("between 0 and 1");
  });

  it("rejects missing champion data", () => {
    const fixtureSubset = subset(2022);
    const matchesWithoutWinner = fixtureSubset.matches.map((match) => (match.stage === "final" ? { ...match, winner: "" } : match));

    expect(() =>
      runHistoricalBacktest({
        fixtureSubsets: [
          {
            ...fixtureSubset,
            matches: matchesWithoutWinner
          }
        ],
        predictions: [predictions()[1]!]
      })
    ).toThrow("Missing champion data");
  });
});
