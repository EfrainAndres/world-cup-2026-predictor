import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ELO_CONFIG,
  HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING,
  buildHistoricalEloRatings,
  generateHistoricalEloSnapshot,
  normalizeHistoricalEloProbabilities,
  rankHistoricalEloProbabilities,
  runHistoricalTournamentReplayBacktest,
  splitHistoricalEloMatchesByCutoff
} from "../src/index.js";
import type {
  EloMatch,
  EloResult,
  HistoricalBacktestDecisionMethod,
  HistoricalBacktestFixture,
  HistoricalEloReplayInput,
  HistoricalTournamentFixtureSubset
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

const historicalMatches: EloMatch[] = [
  {
    match_id: "pre-1",
    match_date: "2020-01-01",
    home_team: "Alpha",
    away_team: "Beta",
    neutral_site: true,
    result: "home_win"
  },
  {
    match_id: "post-1",
    match_date: "2020-01-10",
    home_team: "Beta",
    away_team: "Gamma",
    neutral_site: true,
    result: "away_win"
  }
];

function replayInput(overrides: Partial<HistoricalEloReplayInput> = {}): HistoricalEloReplayInput {
  return {
    tournamentId: "test-cup-2020",
    tournamentName: "Test Cup 2020",
    tournamentYear: 2020,
    tournamentStartDate: "2020-02-01",
    generatedAt: "2020-01-20",
    inputDataCutoff: "2020-01-05",
    targetTeams: ["Alpha", "Beta", "Gamma"],
    historicalMatches,
    dataCoverage: "custom_partial_history",
    ...overrides
  };
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

function subset(year: 2022): HistoricalTournamentFixtureSubset {
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

function teamsForYear(year: 2022): string[] {
  const fixture = readFixture(year);

  return [...new Set(fixture.matches.flatMap((match) => [match.home_team, match.away_team]))].sort((a, b) => a.localeCompare(b));
}

describe("historical Elo snapshot replay foundation", () => {
  it("uses only matches before or on the cutoff", () => {
    const ratings = buildHistoricalEloRatings(replayInput());

    expect(ratings.matchHistory.map((entry) => entry.match_id)).toEqual(["pre-1"]);
    expect(ratings.matchesUsed.map((match) => match.match_id)).toEqual(["pre-1"]);
  });

  it("ignores and flags matches after cutoff", () => {
    const split = splitHistoricalEloMatchesByCutoff(historicalMatches, "2020-01-05");
    const snapshot = generateHistoricalEloSnapshot(replayInput());

    expect(split.matchesIgnoredAfterCutoff.map((match) => match.match_id)).toEqual(["post-1"]);
    expect(snapshot.snapshotMetadata.matchesIgnoredAfterCutoff).toBe(1);
    expect(snapshot.snapshotMetadata.warnings).toContainEqual({
      code: "matches_after_cutoff_ignored",
      severity: "warning",
      message: "1 historical matches after 2020-01-05 were ignored."
    });
  });

  it("rejects cutoff dates on or after tournament start", () => {
    expect(() => generateHistoricalEloSnapshot(replayInput({ inputDataCutoff: "2020-02-01" }))).toThrow(
      "inputDataCutoff must be before tournamentStartDate"
    );
  });

  it("changes Elo ratings after replaying matches", () => {
    const ratings = buildHistoricalEloRatings(replayInput()).ratings;

    expect(ratings.find((entry) => entry.team === "Alpha")?.rating).toBeGreaterThan(DEFAULT_ELO_CONFIG.initialRating);
    expect(ratings.find((entry) => entry.team === "Beta")?.rating).toBeLessThan(DEFAULT_ELO_CONFIG.initialRating);
  });

  it("gives higher Elo ratings higher probabilities", () => {
    const probabilities = normalizeHistoricalEloProbabilities(
      [
        { team: "Higher", rating: 1600 },
        { team: "Lower", rating: 1400 }
      ],
      ["Higher", "Lower"]
    );

    expect(probabilities.find((entry) => entry.team === "Higher")?.probability).toBeGreaterThan(
      probabilities.find((entry) => entry.team === "Lower")?.probability ?? 0
    );
  });

  it("normalizes probabilities so they sum close to 1", () => {
    const snapshot = generateHistoricalEloSnapshot(replayInput());
    const probabilitySum = snapshot.championProbabilities.reduce((sum, entry) => sum + entry.probability, 0);

    expect(probabilitySum).toBeCloseTo(1);
  });

  it("sorts rankings by probability descending", () => {
    const probabilities = normalizeHistoricalEloProbabilities(
      [
        { team: "First", rating: 1600 },
        { team: "Second", rating: 1500 },
        { team: "Third", rating: 1400 }
      ],
      ["Third", "First", "Second"]
    );

    expect(probabilities.map((entry) => entry.team)).toEqual(["First", "Second", "Third"]);
    expect(probabilities.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it("uses team-name fallback sorting when probabilities tie", () => {
    const probabilities = rankHistoricalEloProbabilities([
      { team: "Zeta", eloRating: 1500, probability: 0.5 },
      { team: "Alpha", eloRating: 1500, probability: 0.5 }
    ]);

    expect(probabilities.map((entry) => entry.team)).toEqual(["Alpha", "Zeta"]);
  });

  it("includes replay metadata in generated snapshots", () => {
    const snapshot = generateHistoricalEloSnapshot(replayInput());

    expect(snapshot.snapshotType).toBe("historical_elo_replay_snapshot_foundation");
    expect(snapshot.teams).toEqual(["Alpha", "Gamma", "Beta"]);
    expect(snapshot.snapshotMetadata).toMatchObject({
      tournamentYear: 2020,
      inputDataCutoff: "2020-01-05",
      generatedAt: "2020-01-20",
      inputMatchCount: 2,
      matchesUsed: 1,
      matchesIgnoredAfterCutoff: 1,
      targetTeamCount: 3,
      inputDataLatestDate: "2020-01-10",
      usedMatchLatestDate: "2020-01-01"
    });
    expect(snapshot.snapshotMetadata.lookAheadGuardrails.every((guardrail) => guardrail.passed)).toBe(true);
  });

  it("includes warnings when historical data is incomplete", () => {
    const snapshot = generateHistoricalEloSnapshot(replayInput());

    expect(snapshot.snapshotMetadata.warnings).toContainEqual({
      code: "incomplete_historical_data",
      severity: "warning",
      message: HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING
    });
  });

  it("generated snapshots are accepted by existing replay backtesting helpers", () => {
    const fixtureSubset = subset(2022);
    const snapshot = generateHistoricalEloSnapshot({
      tournamentId: "world-cup-2022",
      tournamentName: "FIFA World Cup 2022",
      tournamentYear: 2022,
      tournamentStartDate: "2022-11-20",
      generatedAt: "2022-11-10",
      inputDataCutoff: "2022-11-09",
      targetTeams: teamsForYear(2022),
      historicalMatches: [
        {
          match_id: "pre-2022-1",
          match_date: "2022-09-01",
          home_team: "Argentina",
          away_team: "France",
          neutral_site: true,
          result: "home_win"
        }
      ],
      dataCoverage: "custom_partial_history"
    });
    const report = runHistoricalTournamentReplayBacktest({
      fixtureSubsets: [fixtureSubset],
      snapshots: [snapshot]
    });

    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.snapshotType).toBe("historical_elo_replay_snapshot_foundation");
    expect(report.summary.snapshotTypeSummary).toEqual([{ snapshotType: "historical_elo_replay_snapshot_foundation", count: 1 }]);
    expect(report.summary.warnings).toContainEqual({
      code: "historical_elo_foundation_snapshot",
      severity: "warning",
      message: HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING
    });
  });

  it("rejects duplicate target teams", () => {
    expect(() => generateHistoricalEloSnapshot(replayInput({ targetTeams: ["Alpha", "Alpha"] }))).toThrow("duplicate target team");
  });

  it("rejects invalid cutoff dates", () => {
    expect(() => generateHistoricalEloSnapshot(replayInput({ inputDataCutoff: "not-a-date" }))).toThrow(
      "inputDataCutoff must be a valid date"
    );
  });

  it("does not mutate input matches", () => {
    const matches = historicalMatches.map((match) => ({ ...match }));
    const before = JSON.stringify(matches);

    generateHistoricalEloSnapshot(replayInput({ historicalMatches: matches }));

    expect(JSON.stringify(matches)).toBe(before);
  });
});
