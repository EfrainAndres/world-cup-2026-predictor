import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  generateBaselinePreTournamentSnapshot,
  generateHistoricalBacktestingReport,
  normalizeRatingProbabilities,
  rankSnapshotProbabilities,
  validatePreTournamentSnapshotInput,
  evaluateLookAheadGuardrails
} from "../src/index.js";
import type {
  EloResult,
  HistoricalBacktestDecisionMethod,
  HistoricalBacktestFixture,
  HistoricalTournamentFixtureSubset,
  PreTournamentSnapshotInput,
  PreTournamentTeamSeedRating
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

function teamsForYear(year: 2010 | 2014 | 2018 | 2022): string[] {
  const fixture = readFixture(year);

  return [...new Set(fixture.matches.flatMap((match) => [match.home_team, match.away_team]))].sort((a, b) => a.localeCompare(b));
}

function seedRatingsForYear(year: 2010 | 2014 | 2018 | 2022): PreTournamentTeamSeedRating[] {
  const teams = teamsForYear(year);

  return teams.map((team, index) => ({
    team,
    rating: 1200 + (teams.length - index) * 10 + (year - 2000)
  }));
}

function snapshotInput(year: 2010 | 2014 | 2018 | 2022): PreTournamentSnapshotInput {
  const dates = snapshotDates.get(year);
  const tournamentStartDate = tournamentStartDates.get(year);

  if (dates === undefined || tournamentStartDate === undefined) {
    throw new Error(`Missing dates for ${year}.`);
  }

  return {
    tournamentId: `world-cup-${year}`,
    tournamentName: `FIFA World Cup ${year}`,
    tournamentYear: year,
    tournamentStartDate,
    generatedAt: dates.generatedAt,
    inputDataCutoff: dates.inputDataCutoff,
    teamSeedRatings: seedRatingsForYear(year),
    actualTournamentResultsIncluded: false,
    metadata: {
      source: "test fixture team list with deterministic seed ratings"
    }
  };
}

describe("pre-tournament snapshot generation", () => {
  it("normalizes probabilities so they sum close to 1", () => {
    const probabilities = normalizeRatingProbabilities([
      { team: "A", rating: 100 },
      { team: "B", rating: 300 },
      { team: "C", rating: 600 }
    ]);
    const totalProbability = probabilities.reduce((sum, entry) => sum + entry.probability, 0);

    expect(totalProbability).toBeCloseTo(1);
  });

  it("gives higher seed ratings higher probabilities", () => {
    const probabilities = normalizeRatingProbabilities([
      { team: "Lower", rating: 1000 },
      { team: "Higher", rating: 1500 }
    ]);

    expect(probabilities.find((entry) => entry.team === "Higher")?.probability).toBeGreaterThan(
      probabilities.find((entry) => entry.team === "Lower")?.probability ?? 0
    );
  });

  it("sorts rankings by probability descending", () => {
    const probabilities = normalizeRatingProbabilities([
      { team: "Third", rating: 100 },
      { team: "First", rating: 300 },
      { team: "Second", rating: 200 }
    ]);

    expect(probabilities.map((entry) => entry.team)).toEqual(["First", "Second", "Third"]);
    expect(probabilities.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it("uses team name fallback when probabilities tie", () => {
    const probabilities = rankSnapshotProbabilities([
      { team: "Zeta", rating: 1000, probability: 0.5 },
      { team: "Alpha", rating: 1000, probability: 0.5 }
    ]);

    expect(probabilities.map((entry) => entry.team)).toEqual(["Alpha", "Zeta"]);
  });

  it("rejects duplicate teams", () => {
    expect(() =>
      validatePreTournamentSnapshotInput({
        ...snapshotInput(2010),
        teamSeedRatings: [
          { team: "Spain", rating: 1500 },
          { team: "Spain", rating: 1400 }
        ]
      })
    ).toThrow("duplicate team");
  });

  it("rejects invalid ratings", () => {
    expect(() =>
      validatePreTournamentSnapshotInput({
        ...snapshotInput(2014),
        teamSeedRatings: [{ team: "Germany", rating: 0 }]
      })
    ).toThrow("finite positive number");
  });

  it("flags input data after tournament start date", () => {
    const guardrails = evaluateLookAheadGuardrails({
      ...snapshotInput(2018),
      inputDataCutoff: "2018-06-15"
    });

    expect(guardrails).toContainEqual({
      guardrail: "input_data_before_tournament",
      passed: false,
      severity: "error",
      message: "Input data cutoff is on or after the tournament start date."
    });
  });

  it("flags generated date after tournament start date", () => {
    const guardrails = evaluateLookAheadGuardrails({
      ...snapshotInput(2022),
      generatedAt: "2022-11-21"
    });

    expect(guardrails).toContainEqual({
      guardrail: "generated_before_tournament",
      passed: false,
      severity: "warning",
      message: "Snapshot generated date is on or after the tournament start date."
    });
  });

  it("rejects actual tournament results in snapshot input", () => {
    expect(() =>
      generateBaselinePreTournamentSnapshot({
        ...snapshotInput(2022),
        actualTournamentResultsIncluded: true
      })
    ).toThrow("actual tournament results must not be included");
  });

  it.each([2010, 2014, 2018, 2022] as const)("generates a %s baseline snapshot", (year) => {
    const snapshot = generateBaselinePreTournamentSnapshot(snapshotInput(year));

    expect(snapshot.tournamentYear).toBe(year);
    expect(snapshot.snapshotType).toBe("baseline_pre_tournament_snapshot");
    expect(snapshot.modelVersion).toBe("baseline-seed-rating-v1");
    expect(snapshot.championProbabilities).toHaveLength(32);
    expect(snapshot.snapshotMetadata.lookAheadGuardrails.every((guardrail) => guardrail.passed)).toBe(true);
  });

  it("generated snapshots are accepted by historical backtesting report helpers", () => {
    const fixtureSubsets = [subset(2010), subset(2014), subset(2018), subset(2022)];
    const predictions = [2010, 2014, 2018, 2022].map((year) =>
      generateBaselinePreTournamentSnapshot(snapshotInput(year as 2010 | 2014 | 2018 | 2022))
    );
    const report = generateHistoricalBacktestingReport({
      fixtureSubsets,
      predictions
    });

    expect(report.reports).toHaveLength(4);
    expect(report.summary.yearsEvaluated).toEqual([2010, 2014, 2018, 2022]);
    expect(report.summary.warnings).toContain(
      "Probability snapshot is a baseline_pre_tournament_snapshot generated from seed ratings, not a calibrated model forecast."
    );
  });
});
