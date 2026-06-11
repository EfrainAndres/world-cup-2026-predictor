import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditHistoricalReplayAccuracy,
  generateHistoricalEloSnapshot,
  reconstructHistoricalBracket,
  runHistoricalMonteCarloReplayYear,
  runHistoricalTournamentReplayBacktest,
  validateCompleteHistoricalReplay
} from "../src/index.js";
import type {
  CompleteHistoricalReplayValidationResult,
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

interface AuditFixtureContext {
  fixtureSubsets: HistoricalTournamentFixtureSubset[];
  brackets: ReconstructedHistoricalBracket[];
  eloSnapshots: GeneratedHistoricalEloSnapshot[];
  monteCarloReplayResults: HistoricalMonteCarloReplayYearResult[];
  replayBacktestingReports: HistoricalTournamentReplayYearResult[];
  completeValidation: CompleteHistoricalReplayValidationResult;
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
      match_id: `${year}-accuracy-audit-elo-${String(index + 1).padStart(2, "0")}`,
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

function buildAuditFixtureContext(): AuditFixtureContext {
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

  const replayBacktestingReports = [...runHistoricalTournamentReplayBacktest({ fixtureSubsets, snapshots: eloSnapshots }).results];
  const completeValidation = validateCompleteHistoricalReplay({
    fixtureSubsets,
    brackets,
    eloSnapshots,
    monteCarloReplayResults,
    replayBacktestingReports
  });

  return {
    fixtureSubsets,
    brackets,
    eloSnapshots,
    monteCarloReplayResults,
    replayBacktestingReports,
    completeValidation
  };
}

describe("historical replay accuracy audit", () => {
  it("audits replay accuracy readiness for 2010, 2014, 2018, and 2022", () => {
    const context = buildAuditFixtureContext();
    const audit = auditHistoricalReplayAccuracy(context);

    expect(audit.years.map((year) => year.tournamentYear)).toEqual([2010, 2014, 2018, 2022]);
    expect(audit.aggregate.yearsAudited).toEqual([2010, 2014, 2018, 2022]);
    expect(audit.aggregate.allExpectedYearsAudited).toBe(true);
  });

  it("returns aggregate audit status and API readiness with warnings", () => {
    const audit = auditHistoricalReplayAccuracy(buildAuditFixtureContext());

    expect(audit.aggregate.status).toBe("warning");
    expect(audit.aggregate.apiReadiness).toBe("ready_with_warnings");
    expect(audit.aggregate.warningCount).toBeGreaterThan(0);
    expect(audit.aggregate.errorCount).toBe(0);
  });

  it("checks metric availability for Brier Score, Log Loss, and Top-N hits", () => {
    const audit = auditHistoricalReplayAccuracy(buildAuditFixtureContext());

    expect(audit.aggregate.allRequiredMetricsAvailable).toBe(true);

    for (const yearAudit of audit.years) {
      expect(yearAudit.metricAvailability.brierScore.available).toBe(true);
      expect(yearAudit.metricAvailability.logLoss.available).toBe(true);
      expect(yearAudit.metricAvailability.top1Hit.available).toBe(true);
      expect(yearAudit.metricAvailability.top3Hit.available).toBe(true);
      expect(yearAudit.metricAvailability.top5Hit.available).toBe(true);
      expect(yearAudit.metricAvailability.allRequiredMetricsAvailable).toBe(true);
    }
  });

  it("checks dataset, bracket, Elo, Monte Carlo, and replay validation readiness", () => {
    const audit = auditHistoricalReplayAccuracy(buildAuditFixtureContext());

    expect(audit.aggregate.datasetCompletenessAvailable).toBe(true);
    expect(audit.aggregate.bracketReconstructionAvailable).toBe(true);
    expect(audit.aggregate.eloSnapshotReplayAvailable).toBe(true);
    expect(audit.aggregate.monteCarloReplayAvailable).toBe(true);
    expect(audit.aggregate.replayValidationAvailable).toBe(true);
  });

  it("detects foundation-only warnings and known gaps", () => {
    const audit = auditHistoricalReplayAccuracy(buildAuditFixtureContext());

    expect(audit.aggregate.foundationOnlyWarningDetected).toBe(true);
    expect(audit.aggregate.knownGaps).toContain("Elo-to-expected-goals mapping is not calibrated.");
    expect(audit.aggregate.warnings.some((warning) => warning.code === "foundation_warning_detected")).toBe(true);
  });

  it("does not claim real predictive accuracy", () => {
    const audit = auditHistoricalReplayAccuracy(buildAuditFixtureContext());

    expect(audit.metadata.notes.some((note) => note.includes("must not be treated as a real predictive accuracy claim"))).toBe(true);
    expect(audit.aggregate.knownGaps).toContain("Replay outputs are validation evidence, not public predictive accuracy.");
  });

  it("returns not_ready when a required metric is missing", () => {
    const context = buildAuditFixtureContext();
    const report = context.replayBacktestingReports.find((entry) => entry.tournamentYear === 2022)!;
    const { championTop5Hit: _removed, ...reportWithoutTop5 } = report;
    const audit = auditHistoricalReplayAccuracy({
      completeValidation: context.completeValidation,
      replayBacktestingReports: [
        ...context.replayBacktestingReports.filter((entry) => entry.tournamentYear !== 2022),
        reportWithoutTop5 as HistoricalTournamentReplayYearResult
      ],
      monteCarloReplayResults: context.monteCarloReplayResults.filter((entry) => entry.tournamentYear !== 2022)
    });
    const year2022 = audit.years.find((entry) => entry.tournamentYear === 2022);

    expect(audit.aggregate.status).toBe("fail");
    expect(audit.aggregate.apiReadiness).toBe("not_ready");
    expect(year2022?.metricAvailability.top5Hit.available).toBe(false);
    expect(year2022?.warnings.some((warning) => warning.code === "metric_missing")).toBe(true);
  });

  it("returns not_ready when complete replay validation reports a missing Monte Carlo replay", () => {
    const context = buildAuditFixtureContext();
    const completeValidation = validateCompleteHistoricalReplay({
      fixtureSubsets: context.fixtureSubsets,
      brackets: context.brackets,
      eloSnapshots: context.eloSnapshots,
      monteCarloReplayResults: context.monteCarloReplayResults.filter((entry) => entry.tournamentYear !== 2018),
      replayBacktestingReports: context.replayBacktestingReports
    });
    const audit = auditHistoricalReplayAccuracy({
      completeValidation,
      replayBacktestingReports: context.replayBacktestingReports,
      monteCarloReplayResults: context.monteCarloReplayResults.filter((entry) => entry.tournamentYear !== 2018)
    });
    const year2018 = audit.years.find((entry) => entry.tournamentYear === 2018);

    expect(audit.aggregate.status).toBe("fail");
    expect(audit.aggregate.apiReadiness).toBe("not_ready");
    expect(audit.aggregate.monteCarloReplayAvailable).toBe(false);
    expect(year2018?.monteCarloReplay.status).toBe("fail");
  });

  it("rejects duplicate expected years", () => {
    const context = buildAuditFixtureContext();

    expect(() =>
      auditHistoricalReplayAccuracy({
        ...context,
        expectedYears: [2010, 2010]
      })
    ).toThrow("duplicate expected year");
  });
});
