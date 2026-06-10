import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BASELINE_PRE_TOURNAMENT_SNAPSHOT_MODEL_VERSION,
  BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING,
  runHistoricalTournamentReplayBacktest
} from "../src/index.js";
import type {
  EloResult,
  HistoricalBacktestDecisionMethod,
  HistoricalBacktestFixture,
  HistoricalTournamentFixtureSubset,
  HistoricalTournamentReplaySnapshotInput,
  HistoricalTournamentReplayYearResult,
  LookAheadGuardrailResult,
  PreTournamentSnapshotMetadata,
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

const replayYears = [2010, 2014, 2018, 2022] as const;

const tournamentStartDates = new Map([
  [2010, "2010-06-11"],
  [2014, "2014-06-12"],
  [2018, "2018-06-14"],
  [2022, "2022-11-20"]
]);

const snapshotDates = new Map([
  [2010, { generatedAt: "2010-06-01", inputDataCutoff: "2010-05-31" }],
  [2014, { generatedAt: "2014-06-01", inputDataCutoff: "2014-05-31" }],
  [2018, { generatedAt: "2018-06-01", inputDataCutoff: "2018-05-31" }],
  [2022, { generatedAt: "2022-11-10", inputDataCutoff: "2022-11-09" }]
]);

const championRankingFixtures = new Map<number, readonly string[]>([
  [2010, ["Spain", "Netherlands", "Germany", "Uruguay", "Brazil"]],
  [2014, ["Brazil", "Argentina", "Germany", "Netherlands", "France"]],
  [2018, ["Brazil", "Belgium", "Croatia", "England", "France"]],
  [2022, ["Brazil", "France", "Croatia", "Morocco", "England", "Argentina"]]
]);

const runnerUpRankingFixtures = new Map<number, readonly string[]>([
  [2010, ["Netherlands", "Spain", "Germany", "Uruguay", "Brazil"]],
  [2014, ["Germany", "Argentina", "Brazil", "Netherlands", "France"]],
  [2018, ["Croatia", "France", "Belgium", "England", "Brazil"]],
  [2022, ["Argentina", "France", "Brazil", "Croatia", "Morocco"]]
]);

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

function subset(year: (typeof replayYears)[number]): HistoricalTournamentFixtureSubset {
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

function teamsForYear(year: (typeof replayYears)[number]): string[] {
  const fixture = readFixture(year);

  return [...new Set(fixture.matches.flatMap((match) => [match.home_team, match.away_team]))].sort((a, b) => a.localeCompare(b));
}

function rankedProbabilities(allTeams: readonly string[], rankedTeams: readonly string[]): TeamProbabilitySnapshot[] {
  const rankedTeamSet = new Set(rankedTeams);
  const orderedTeams = [...rankedTeams, ...allTeams.filter((team) => !rankedTeamSet.has(team))];
  const totalWeight = orderedTeams.reduce((sum, _team, index) => sum + orderedTeams.length - index, 0);

  return orderedTeams.map((team, index) => ({
    team,
    probability: (orderedTeams.length - index) / totalWeight
  }));
}

function lookAheadGuardrails(year: (typeof replayYears)[number]): LookAheadGuardrailResult[] {
  const dates = snapshotDates.get(year);
  const tournamentStartDate = tournamentStartDates.get(year);

  if (dates === undefined || tournamentStartDate === undefined) {
    throw new Error(`Missing replay dates for ${year}.`);
  }

  return [
    {
      guardrail: "input_data_before_tournament",
      passed: true,
      severity: "error",
      message: "Input data cutoff is before the tournament start date."
    },
    {
      guardrail: "generated_before_tournament",
      passed: true,
      severity: "warning",
      message: "Snapshot generated date is before the tournament start date."
    },
    {
      guardrail: "no_actual_results_in_input",
      passed: true,
      severity: "error",
      message: "Snapshot input does not include actual tournament results."
    }
  ];
}

function snapshotMetadata(year: (typeof replayYears)[number]): PreTournamentSnapshotMetadata {
  const dates = snapshotDates.get(year);
  const tournamentStartDate = tournamentStartDates.get(year);

  if (dates === undefined || tournamentStartDate === undefined) {
    throw new Error(`Missing replay dates for ${year}.`);
  }

  return {
    tournamentYear: year,
    tournamentStartDate,
    inputDataCutoff: dates.inputDataCutoff,
    generatedAt: dates.generatedAt,
    modelVersion: BASELINE_PRE_TOURNAMENT_SNAPSHOT_MODEL_VERSION,
    snapshotType: "baseline_pre_tournament_snapshot",
    warnings: [],
    lookAheadGuardrails: lookAheadGuardrails(year)
  };
}

function replaySnapshot(year: (typeof replayYears)[number]): HistoricalTournamentReplaySnapshotInput {
  const dates = snapshotDates.get(year);
  const championRanking = championRankingFixtures.get(year);
  const runnerUpRanking = runnerUpRankingFixtures.get(year);

  if (dates === undefined || championRanking === undefined || runnerUpRanking === undefined) {
    throw new Error(`Missing replay fixture data for ${year}.`);
  }

  return {
    tournamentId: `world-cup-${year}`,
    tournamentName: `FIFA World Cup ${year}`,
    tournamentYear: year,
    snapshotType: "baseline_pre_tournament_snapshot",
    modelVersion: BASELINE_PRE_TOURNAMENT_SNAPSHOT_MODEL_VERSION,
    dataCutoff: dates.inputDataCutoff,
    championProbabilities: rankedProbabilities(teamsForYear(year), championRanking),
    runnerUpProbabilities: rankedProbabilities(teamsForYear(year), runnerUpRanking),
    snapshotMetadata: snapshotMetadata(year),
    metadata: {
      source: "deterministic baseline replay test fixture"
    }
  };
}

function fullReplayReport() {
  return runHistoricalTournamentReplayBacktest({
    fixtureSubsets: replayYears.map((year) => subset(year)),
    snapshots: replayYears.map((year) => replaySnapshot(year))
  });
}

function getYearResult(year: (typeof replayYears)[number]): HistoricalTournamentReplayYearResult {
  const result = fullReplayReport().results.find((entry) => entry.tournamentYear === year);

  if (result === undefined) {
    throw new Error(`Missing replay result for ${year}.`);
  }

  return result;
}

describe("historical tournament replay backtesting", () => {
  it.each([
    [2010, "Spain", "Netherlands"],
    [2014, "Germany", "Argentina"],
    [2018, "France", "Croatia"],
    [2022, "Argentina", "France"]
  ] as const)("generates a baseline replay report for %s", (year, champion, runnerUp) => {
    const result = getYearResult(year);

    expect(result.actualChampion).toBe(champion);
    expect(result.actualRunnerUp).toBe(runnerUp);
    expect(result.snapshotType).toBe("baseline_pre_tournament_snapshot");
    expect(result.datasetCompleteness).toMatchObject({
      isComplete: true,
      matchCount: 64,
      expectedMatchCount: 64
    });
  });

  it("includes all four historical replay years in the aggregate report", () => {
    const report = fullReplayReport();

    expect(report.results).toHaveLength(4);
    expect(report.summary.yearsEvaluated).toEqual([2010, 2014, 2018, 2022]);
    expect(report.summary.tournamentCount).toBe(4);
  });

  it("calculates champion rank correctly", () => {
    expect(getYearResult(2014).championRank).toBe(3);
    expect(getYearResult(2022).championRank).toBe(6);
  });

  it("calculates runner-up rank correctly", () => {
    expect(getYearResult(2014).runnerUpRank).toBe(2);
    expect(getYearResult(2018).runnerUpRank).toBe(1);
  });

  it("sets Top-1, Top-3, and Top-5 champion hit flags", () => {
    expect(getYearResult(2010)).toMatchObject({
      championTop1Hit: true,
      championTop3Hit: true,
      championTop5Hit: true
    });
    expect(getYearResult(2018)).toMatchObject({
      championTop1Hit: false,
      championTop3Hit: false,
      championTop5Hit: true
    });
    expect(getYearResult(2022)).toMatchObject({
      championTop1Hit: false,
      championTop3Hit: false,
      championTop5Hit: false
    });
  });

  it("includes Brier Score and Log Loss metrics", () => {
    const result = getYearResult(2022);

    expect(result.championProbability).toBeGreaterThan(0);
    expect(result.runnerUpProbability).toBeGreaterThan(0);
    expect(result.brierScore).toBeGreaterThan(0);
    expect(result.logLoss).toBeGreaterThan(0);
  });

  it("includes look-ahead guardrail status", () => {
    const result = getYearResult(2010);

    expect(result.lookAheadGuardrailStatus.passed).toBe(true);
    expect(result.lookAheadGuardrailStatus.guardrails).toHaveLength(3);
    expect(result.lookAheadGuardrailStatus.errorCount).toBe(0);
    expect(result.lookAheadGuardrailStatus.warningCount).toBe(0);
  });

  it("includes baseline snapshot warnings", () => {
    const report = fullReplayReport();

    expect(report.results.every((result) => result.warnings.some((warning) => warning.message === BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING))).toBe(
      true
    );
    expect(report.summary.warnings).toContainEqual({
      code: "baseline_snapshot",
      severity: "warning",
      message: BASELINE_PRE_TOURNAMENT_SNAPSHOT_WARNING
    });
    expect(report.summary.snapshotTypeSummary).toEqual([{ snapshotType: "baseline_pre_tournament_snapshot", count: 4 }]);
  });

  it("rejects missing snapshots clearly", () => {
    expect(() =>
      runHistoricalTournamentReplayBacktest({
        fixtureSubsets: [subset(2010), subset(2014)],
        snapshots: [replaySnapshot(2010)]
      })
    ).toThrow("Missing replay snapshot for world-cup-2014");
  });

  it("rejects snapshots that include actual tournament results", () => {
    expect(() =>
      runHistoricalTournamentReplayBacktest({
        fixtureSubsets: [subset(2022)],
        snapshots: [
          {
            ...replaySnapshot(2022),
            actualTournamentResultsIncluded: true
          }
        ]
      })
    ).toThrow("must not include actual tournament results");
  });

  it("calculates aggregate averages and hit rates from year results", () => {
    const report = fullReplayReport();
    const averageBrierScore = report.results.reduce((sum, result) => sum + result.brierScore, 0) / report.results.length;
    const averageLogLoss = report.results.reduce((sum, result) => sum + result.logLoss, 0) / report.results.length;

    expect(report.summary.averageBrierScore).toBeCloseTo(averageBrierScore);
    expect(report.summary.averageLogLoss).toBeCloseTo(averageLogLoss);
    expect(report.summary.top1HitRate).toBe(0.25);
    expect(report.summary.top3HitRate).toBe(0.5);
    expect(report.summary.top5HitRate).toBe(0.75);
  });
});
