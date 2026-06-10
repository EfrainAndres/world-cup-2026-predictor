import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_REPORT_FIXTURE_WARNING,
  generateHistoricalBacktestingReport,
  generateHistoricalBacktestingYearReport,
  getProbabilityRank
} from "../src/index.js";
import type {
  EloResult,
  HistoricalBacktestDecisionMethod,
  HistoricalBacktestFixture,
  HistoricalBacktestingReportPredictionInput,
  HistoricalTournamentFixtureSubset,
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
  winner: string | null;
  decided_by: HistoricalBacktestDecisionMethod;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
  source_note: string;
}

function readFixture(year: number): RawFixtureFile {
  const fixtureUrl = new URL(`../../data/fixtures/world-cup/world-cup-${year}-results.json`, import.meta.url);

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
    result: match.result,
    decidedBy: match.decided_by
  };

  if (match.winner !== null) {
    fixture.winner = match.winner;
  }

  if (match.penalty_home_score !== null) {
    fixture.penaltyHomeScore = match.penalty_home_score;
  }

  if (match.penalty_away_score !== null) {
    fixture.penaltyAwayScore = match.penalty_away_score;
  }

  return fixture;
}

function subset(year: 2010 | 2014 | 2018 | 2022): HistoricalTournamentFixtureSubset {
  const fixture = readFixture(year);
  const sourceNote = fixture.matches[0]?.source_note;
  const fixtureSubset: HistoricalTournamentFixtureSubset = {
    tournamentId: `world-cup-${year}`,
    tournamentName: `FIFA World Cup ${year}`,
    tournamentYear: year,
    matches: fixture.matches.map(toBacktestFixture),
    isPartial: false,
    coverageNote: "Curated complete fixture-level results from group stage through final."
  };

  if (sourceNote !== undefined) {
    fixtureSubset.sourceNote = sourceNote;
  }

  return fixtureSubset;
}

function probabilities(entries: readonly [string, number][]): TeamProbabilitySnapshot[] {
  return entries.map(([team, probability]) => ({ team, probability }));
}

function prediction(
  year: 2010 | 2014 | 2018 | 2022,
  championProbabilities: TeamProbabilitySnapshot[],
  runnerUpProbabilities: TeamProbabilitySnapshot[]
): HistoricalBacktestingReportPredictionInput {
  return {
    tournamentId: `world-cup-${year}`,
    tournamentName: `FIFA World Cup ${year}`,
    tournamentYear: year,
    snapshotType: "synthetic_report_fixture",
    modelVersion: "synthetic-report-fixture-v1",
    dataCutoff: `${year}-01-01`,
    championProbabilities,
    runnerUpProbabilities
  };
}

function predictions(): HistoricalBacktestingReportPredictionInput[] {
  return [
    prediction(
      2010,
      probabilities([
        ["Spain", 0.34],
        ["Netherlands", 0.22],
        ["Germany", 0.18],
        ["Uruguay", 0.12],
        ["Brazil", 0.08],
        ["Argentina", 0.06]
      ]),
      probabilities([
        ["Netherlands", 0.35],
        ["Spain", 0.2],
        ["Germany", 0.18],
        ["Uruguay", 0.12],
        ["Brazil", 0.1],
        ["Argentina", 0.05]
      ])
    ),
    prediction(
      2014,
      probabilities([
        ["Brazil", 0.3],
        ["Argentina", 0.24],
        ["Germany", 0.2],
        ["Netherlands", 0.12],
        ["France", 0.08],
        ["Colombia", 0.06]
      ]),
      probabilities([
        ["Germany", 0.28],
        ["Argentina", 0.25],
        ["Brazil", 0.18],
        ["Netherlands", 0.14],
        ["France", 0.1],
        ["Colombia", 0.05]
      ])
    ),
    prediction(
      2018,
      probabilities([
        ["Brazil", 0.25],
        ["Belgium", 0.2],
        ["Croatia", 0.18],
        ["England", 0.15],
        ["France", 0.12],
        ["Uruguay", 0.1]
      ]),
      probabilities([
        ["France", 0.26],
        ["Croatia", 0.24],
        ["Belgium", 0.18],
        ["England", 0.14],
        ["Brazil", 0.1],
        ["Uruguay", 0.08]
      ])
    ),
    prediction(
      2022,
      probabilities([
        ["Brazil", 0.25],
        ["France", 0.22],
        ["Argentina", 0.2],
        ["Croatia", 0.14],
        ["Morocco", 0.1],
        ["England", 0.09]
      ]),
      probabilities([
        ["Argentina", 0.28],
        ["France", 0.24],
        ["Brazil", 0.18],
        ["Croatia", 0.14],
        ["Morocco", 0.1],
        ["England", 0.06]
      ])
    )
  ];
}

function fullReport() {
  return generateHistoricalBacktestingReport({
    fixtureSubsets: [subset(2010), subset(2014), subset(2018), subset(2022)],
    predictions: predictions()
  });
}

describe("historical backtesting report foundation", () => {
  it.each([
    [2010, "Spain", "Netherlands"],
    [2014, "Germany", "Argentina"],
    [2018, "France", "Croatia"],
    [2022, "Argentina", "France"]
  ] as const)("generates a per-year report for %s", (year, champion, runnerUp) => {
    const report = fullReport().reports.find((entry) => entry.tournamentYear === year);

    expect(report).toBeDefined();
    expect(report?.actualChampion).toBe(champion);
    expect(report?.actualRunnerUp).toBe(runnerUp);
    expect(report?.datasetCompleteness).toMatchObject({
      isComplete: true,
      matchCount: 64,
      expectedMatchCount: 64
    });
  });

  it("extracts actual champions and runner-ups from complete datasets", () => {
    const report = fullReport();

    expect(report.reports.map((entry) => [entry.tournamentYear, entry.actualChampion, entry.actualRunnerUp])).toEqual([
      [2010, "Spain", "Netherlands"],
      [2014, "Germany", "Argentina"],
      [2018, "France", "Croatia"],
      [2022, "Argentina", "France"]
    ]);
  });

  it("calculates champion rank deterministically", () => {
    expect(getProbabilityRank(predictions()[1]!.championProbabilities, "Germany")).toBe(3);
    expect(fullReport().reports.find((entry) => entry.tournamentYear === 2014)?.championProbabilityRank).toBe(3);
  });

  it("sets Top-1, Top-3, and Top-5 champion flags", () => {
    const reports = fullReport().reports;
    const report2010 = reports.find((entry) => entry.tournamentYear === 2010);
    const report2018 = reports.find((entry) => entry.tournamentYear === 2018);

    expect(report2010?.championTop1Hit).toBe(true);
    expect(report2010?.championTop3Hit).toBe(true);
    expect(report2010?.championTop5Hit).toBe(true);
    expect(report2018?.championTop1Hit).toBe(false);
    expect(report2018?.championTop3Hit).toBe(false);
    expect(report2018?.championTop5Hit).toBe(true);
  });

  it("includes Brier Score and Log Loss metrics", () => {
    const report = fullReport().reports.find((entry) => entry.tournamentYear === 2022);

    expect(report?.brierScore).toBeGreaterThan(0);
    expect(report?.logLoss).toBeGreaterThan(0);
    expect(report?.championProbability).toBe(0.2);
    expect(report?.runnerUpProbability).toBe(0.24);
  });

  it("includes calibration bucket summaries", () => {
    const reports = fullReport().reports;

    expect(reports.every((report) => report.calibrationBucketSummary !== undefined)).toBe(true);
  });

  it("calculates aggregate summary averages and hit rates", () => {
    const report = fullReport();
    const averageBrierScore = report.reports.reduce((sum, entry) => sum + entry.brierScore, 0) / report.reports.length;
    const averageLogLoss = report.reports.reduce((sum, entry) => sum + entry.logLoss, 0) / report.reports.length;

    expect(report.summary.yearsEvaluated).toEqual([2010, 2014, 2018, 2022]);
    expect(report.summary.tournamentCount).toBe(4);
    expect(report.summary.averageBrierScore).toBeCloseTo(averageBrierScore);
    expect(report.summary.averageLogLoss).toBeCloseTo(averageLogLoss);
    expect(report.summary.top1HitRate).toBe(0.25);
    expect(report.summary.top3HitRate).toBe(0.75);
    expect(report.summary.top5HitRate).toBe(1);
  });

  it("includes warnings when snapshots are synthetic", () => {
    const report = fullReport();

    expect(report.reports.every((entry) => entry.warnings.includes(SYNTHETIC_REPORT_FIXTURE_WARNING))).toBe(true);
    expect(report.summary.warnings).toContain(SYNTHETIC_REPORT_FIXTURE_WARNING);
  });

  it("rejects missing probability snapshots clearly", () => {
    expect(() =>
      generateHistoricalBacktestingReport({
        fixtureSubsets: [subset(2010), subset(2014)],
        predictions: [predictions()[0]!]
      })
    ).toThrow("Missing probability snapshot for world-cup-2014");
  });

  it("can generate a single-year report directly", () => {
    const report = generateHistoricalBacktestingYearReport(subset(2010), predictions()[0]!);

    expect(report.tournamentYear).toBe(2010);
    expect(report.actualChampion).toBe("Spain");
    expect(report.championProbabilityRank).toBe(1);
    expect(report.datasetCompleteness.isComplete).toBe(true);
  });
});
