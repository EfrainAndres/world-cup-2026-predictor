import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMPLETE_HISTORICAL_REPLAY_EXPECTED_YEARS,
  generateHistoricalEloSnapshot,
  reconstructHistoricalBracket,
  runHistoricalMonteCarloReplayYear,
  runHistoricalTournamentReplayBacktest,
  validateCompleteHistoricalReplay
} from "../src/index.js";
import type {
  EloMatch,
  GeneratedHistoricalEloSnapshot,
  HistoricalBacktestDecisionMethod,
  HistoricalBacktestFixture,
  HistoricalMonteCarloReplayTournamentInput,
  HistoricalMonteCarloReplayYearResult,
  HistoricalTournamentBracketFixtureInput,
  HistoricalTournamentFixtureSubset,
  HistoricalTournamentReplayYearResult,
  ReconstructedHistoricalBracket
} from "../src/index.js";

const fixtureFiles = [
  [2010, "world-cup-2010-results.json"],
  [2014, "world-cup-2014-results.json"],
  [2018, "world-cup-2018-results.json"],
  [2022, "world-cup-2022-results.json"]
] as const;

interface WorldCupFixtureInput extends HistoricalTournamentBracketFixtureInput {
  stage_order: number;
  result: "home_win" | "draw" | "away_win";
  neutral_site: boolean;
}

interface WorldCupFixtureFile {
  matches: WorldCupFixtureInput[];
}

interface CompleteFixtureContext {
  fixtureSubsets: HistoricalTournamentFixtureSubset[];
  brackets: ReconstructedHistoricalBracket[];
  eloSnapshots: GeneratedHistoricalEloSnapshot[];
  monteCarloReplayResults: HistoricalMonteCarloReplayYearResult[];
  replayBacktestingReports: HistoricalTournamentReplayYearResult[];
}

function readFixture(fileName: string): WorldCupFixtureFile {
  const fixtureUrl = new URL(`../../data/fixtures/world-cup/${fileName}`, import.meta.url);

  return JSON.parse(readFileSync(fixtureUrl, "utf8")) as WorldCupFixtureFile;
}

function toBacktestFixture(match: WorldCupFixtureInput): HistoricalBacktestFixture {
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
    decidedBy: match.decided_by as HistoricalBacktestDecisionMethod
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

function toFixtureSubset(year: number, matches: readonly WorldCupFixtureInput[]): HistoricalTournamentFixtureSubset {
  return {
    tournamentId: `world-cup-${year}`,
    tournamentName: `FIFA World Cup ${year}`,
    tournamentYear: year,
    matches: matches.map((match) => toBacktestFixture(match)),
    isPartial: false,
    coverageNote: "Complete curated 64-match historical fixture dataset.",
    sourceNote: "Local curated World Cup fixture JSON."
  };
}

function dateBefore(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
}

function buildFoundationEloMatches(year: number, teams: readonly string[]): EloMatch[] {
  return teams.slice(0, 12).map((team, index) => {
    const opponent = teams[teams.length - index - 1]!;
    const homeScore = index % 3 === 0 ? 2 : 1;
    const awayScore = index % 3 === 0 ? 0 : 1;
    const result = homeScore > awayScore ? "home_win" : homeScore < awayScore ? "away_win" : "draw";

    return {
      match_id: `${year}-foundation-elo-${String(index + 1).padStart(2, "0")}`,
      match_date: `${year - 1}-11-${String(index + 1).padStart(2, "0")}`,
      home_team: team,
      away_team: opponent,
      neutral_site: true,
      home_score: homeScore,
      away_score: awayScore,
      result
    };
  });
}

function toTournamentInput(bracket: ReconstructedHistoricalBracket): HistoricalMonteCarloReplayTournamentInput {
  return {
    name: `FIFA World Cup ${bracket.tournamentYear} historical replay fixture`,
    groups: bracket.groups.map((group) => ({
      name: group.groupName,
      teams: group.teams,
      fixtures: group.fixtures.map((fixture) => ({
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team
      })),
      qualifiersCount: 2
    })),
    groupQualifiersCount: 2,
    metadata: {
      tournamentFormat: bracket.tournamentFormat,
      reconstructionVersion: bracket.metadata.reconstructionVersion
    }
  };
}

function buildCompleteFixtureContext(): CompleteFixtureContext {
  const fixtureSubsets: HistoricalTournamentFixtureSubset[] = [];
  const brackets: ReconstructedHistoricalBracket[] = [];
  const eloSnapshots: GeneratedHistoricalEloSnapshot[] = [];
  const monteCarloReplayResults: HistoricalMonteCarloReplayYearResult[] = [];

  for (const [year, fileName] of fixtureFiles) {
    const matches = readFixture(fileName).matches;
    const bracket = reconstructHistoricalBracket({
      tournamentYear: year,
      fixtures: matches
    });
    const fixtureSubset = toFixtureSubset(year, matches);
    const teams = bracket.groups.flatMap((group) => group.teams);
    const tournamentStartDate = [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date))[0]!.match_date;
    const cutoffDate = dateBefore(tournamentStartDate);
    const snapshot = generateHistoricalEloSnapshot({
      tournamentId: fixtureSubset.tournamentId,
      tournamentName: fixtureSubset.tournamentName,
      tournamentYear: year,
      tournamentStartDate,
      generatedAt: cutoffDate,
      inputDataCutoff: cutoffDate,
      targetTeams: teams,
      historicalMatches: buildFoundationEloMatches(year, teams),
      dataCoverage: "curated_world_cup_fixtures_only",
      actualTournamentResultsIncluded: false
    });
    const monteCarloReplay = runHistoricalMonteCarloReplayYear({
      fixtureSubset,
      snapshot,
      tournamentInput: toTournamentInput(bracket),
      simulationConfig: {
        simulationCount: 6,
        seed: year,
        maxSimulationCount: 100
      }
    });

    fixtureSubsets.push(fixtureSubset);
    brackets.push(bracket);
    eloSnapshots.push(snapshot);
    monteCarloReplayResults.push(monteCarloReplay);
  }

  const replayBacktestingReports = runHistoricalTournamentReplayBacktest({
    fixtureSubsets,
    snapshots: eloSnapshots
  }).results;

  return {
    fixtureSubsets,
    brackets,
    eloSnapshots,
    monteCarloReplayResults,
    replayBacktestingReports: [...replayBacktestingReports]
  };
}

describe("complete historical replay validation", () => {
  it("validates all historical replay years", () => {
    const context = buildCompleteFixtureContext();
    const result = validateCompleteHistoricalReplay(context);

    expect(result.aggregate.expectedYears).toEqual([...COMPLETE_HISTORICAL_REPLAY_EXPECTED_YEARS]);
    expect(result.aggregate.yearsEvaluated).toEqual([2010, 2014, 2018, 2022]);
    expect(result.aggregate.allExpectedYearsEvaluated).toBe(true);
    expect(result.years).toHaveLength(4);
  });

  it("checks dataset completeness for every year", () => {
    const result = validateCompleteHistoricalReplay(buildCompleteFixtureContext());

    expect(result.aggregate.datasetCompletenessAvailable).toBe(true);
    expect(result.years.every((year) => year.dataset.available)).toBe(true);
    expect(result.years.every((year) => year.dataset.details.matchCount === 64)).toBe(true);
    expect(result.years.every((year) => year.dataset.details.isComplete === true)).toBe(true);
  });

  it("checks bracket reconstruction availability", () => {
    const result = validateCompleteHistoricalReplay(buildCompleteFixtureContext());

    expect(result.aggregate.bracketReconstructionAvailable).toBe(true);
    expect(result.years.every((year) => year.bracketReconstruction.available)).toBe(true);
    expect(result.years.every((year) => year.bracketReconstruction.details.groupCount === 8)).toBe(true);
    expect(result.years.every((year) => year.bracketReconstruction.details.teamsCount === 32)).toBe(true);
  });

  it("checks historical Elo snapshot replay availability", () => {
    const result = validateCompleteHistoricalReplay(buildCompleteFixtureContext());

    expect(result.aggregate.eloSnapshotReplayAvailable).toBe(true);
    expect(result.years.every((year) => year.eloSnapshotReplay.available)).toBe(true);
    expect(result.years.every((year) => year.eloSnapshotReplay.details.snapshotType === "historical_elo_replay_snapshot_foundation")).toBe(true);
    expect(result.years.every((year) => year.eloSnapshotReplay.details.failedGuardrailCount === 0)).toBe(true);
  });

  it("checks historical Monte Carlo replay availability", () => {
    const result = validateCompleteHistoricalReplay(buildCompleteFixtureContext());

    expect(result.aggregate.monteCarloReplayAvailable).toBe(true);
    expect(result.years.every((year) => year.monteCarloReplay.available)).toBe(true);
    expect(result.years.every((year) => year.monteCarloReplay.details.simulationCount === 6)).toBe(true);
  });

  it("checks replay backtesting report availability", () => {
    const result = validateCompleteHistoricalReplay(buildCompleteFixtureContext());

    expect(result.aggregate.replayBacktestingReportAvailable).toBe(true);
    expect(result.years.every((year) => year.replayBacktestingReport.available)).toBe(true);
    expect(result.years.every((year) => year.replayBacktestingReport.details.datasetComplete === true)).toBe(true);
  });

  it("returns per-year validation status with foundation warnings", () => {
    const result = validateCompleteHistoricalReplay(buildCompleteFixtureContext());

    expect(result.years.every((year) => year.status === "warning")).toBe(true);
    expect(result.years.every((year) => year.warnings.some((warning) => warning.code === "foundation_only_validation"))).toBe(true);
    expect(result.years.every((year) => year.warnings.some((warning) => warning.code === "elo_snapshot_foundation_only"))).toBe(true);
  });

  it("returns aggregate validation status with no accuracy claim", () => {
    const result = validateCompleteHistoricalReplay(buildCompleteFixtureContext());

    expect(result.aggregate.status).toBe("warning");
    expect(result.aggregate.warningCount).toBeGreaterThan(0);
    expect(result.aggregate.errorCount).toBe(0);
    expect(result.aggregate.warnings.some((warning) => warning.message.includes("must not be described as final predictive accuracy"))).toBe(true);
  });

  it("reports missing Monte Carlo replay clearly", () => {
    const context = buildCompleteFixtureContext();
    const result = validateCompleteHistoricalReplay({
      ...context,
      monteCarloReplayResults: context.monteCarloReplayResults.filter((entry) => entry.tournamentYear !== 2018)
    });
    const year2018 = result.years.find((year) => year.tournamentYear === 2018);

    expect(result.aggregate.status).toBe("fail");
    expect(result.aggregate.monteCarloReplayAvailable).toBe(false);
    expect(year2018?.monteCarloReplay.available).toBe(false);
    expect(year2018?.monteCarloReplay.warnings[0]?.code).toBe("monte_carlo_replay_missing");
  });

  it("reports incomplete fixture coverage clearly", () => {
    const context = buildCompleteFixtureContext();
    const incompleteSubset = {
      ...context.fixtureSubsets[0]!,
      matches: context.fixtureSubsets[0]!.matches.slice(1),
      isPartial: true
    };
    const result = validateCompleteHistoricalReplay({
      ...context,
      fixtureSubsets: [incompleteSubset, ...context.fixtureSubsets.slice(1)]
    });
    const year2010 = result.years.find((year) => year.tournamentYear === 2010);

    expect(result.aggregate.status).toBe("fail");
    expect(result.aggregate.datasetCompletenessAvailable).toBe(false);
    expect(year2010?.dataset.status).toBe("fail");
    expect(year2010?.dataset.warnings[0]?.code).toBe("dataset_incomplete");
  });

  it("rejects duplicate expected years", () => {
    const context = buildCompleteFixtureContext();

    expect(() =>
      validateCompleteHistoricalReplay({
        ...context,
        expectedYears: [2010, 2010]
      })
    ).toThrow("duplicate expected year");
  });
});
