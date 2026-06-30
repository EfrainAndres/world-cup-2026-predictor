import { classifyProfileCoverage } from "../../model/src/index.js";
import type { AttackDefenseProfileCoverage } from "../../model/src/index.js";
import { canonicalizeTeamName } from "./team-aliases.js";
import {
  HISTORICAL_INTERNATIONAL_FIXTURE_SCHEMA_VERSION,
  type HistoricalInternationalFixtureMode,
  type HistoricalInternationalScoredFixture,
  type ExistingCompetitionWeightKey,
} from "./historical-international-fixtures.js";

export type HistoricalInternationalDataIssue =
  | "duplicate_fixture"
  | "conflicting_duplicate"
  | "invalid_score"
  | "invalid_kickoff"
  | "unresolved_home_team"
  | "unresolved_away_team"
  | "unknown_competition_weight"
  | "future_fixture"
  | "wc2026_fixture_excluded";

export type HistoricalInternationalDataDecision =
  | "historical_data_ready"
  | "historical_data_partial"
  | "historical_data_blocked";

export type HistoricalInternationalDataBlockingReason =
  | "wc2018_zero_history"
  | "wc2018_fallback_rate_high"
  | "wc2022_fallback_rate_high"
  | "median_history_too_low"
  | "unresolved_evaluation_teams"
  | "data_license_unresolved"
  | "no_look_ahead_failure"
  | "structural_data_invalid";

export interface HistoricalInternationalDataIssueRecord {
  issue: HistoricalInternationalDataIssue;
  fixtureId: string;
  message: string;
}

export interface HistoricalLeakageDiagnostic {
  evaluationFixtureId: string;
  profileTeamId: string;
  profileCutoffAt: string;
  latestIncludedFixtureAt: string | null;
  violation: boolean;
}

export interface HistoricalTeamCoverageSummary {
  cutoffAt: string;
  teamCount: number;
  priorMatchCounts: Record<string, number>;
  teamsWithNoPriorMatches: string[];
  zeroPriorTeamRate: number;
  fallbackTeamRate: number;
  medianPriorMatchCount: number | null;
  p25PriorMatchCount: number | null;
  p75PriorMatchCount: number | null;
  coverageCounts: Record<AttackDefenseProfileCoverage, number>;
  partialOrBetterTeamCount: number;
  partialOrBetterRate: number;
}

export interface HistoricalInternationalDataDecisionReport {
  decision: HistoricalInternationalDataDecision;
  reasons: string[];
  blockingReasons: HistoricalInternationalDataBlockingReason[];
}

export interface HistoricalInternationalDataValidationReport {
  schemaVersion: string;
  generatedAt: string;
  mode: HistoricalInternationalFixtureMode;
  totalFixtures: number;
  acceptedFixtures: number;
  excludedFixtures: number;
  issuesByReason: Record<string, number>;
  issues: HistoricalInternationalDataIssueRecord[];
  fixturesByYear: Record<string, number>;
  fixturesByCompetition: Record<string, number>;
  fixturesBySource: Record<string, number>;
  uniqueTeams: number;
  neutralFixtureCount: number;
  earliestKickoffAt: string | null;
  latestKickoffAt: string | null;
  unresolvedTeamCount: number;
  duplicateFixtureCount: number;
  conflictingDuplicateCount: number;
  invalidScoreCount: number;
  missingKickoffCount: number;
  competitionWeightFallbackCount: number;
  accepted: HistoricalInternationalScoredFixture[];
  evaluationCoverage: {
    wc2018: HistoricalTeamCoverageSummary | null;
    wc2022: HistoricalTeamCoverageSummary | null;
    combinedFallbackTeamRate: number | null;
    combinedMedianPriorMatchCount: number | null;
  };
  leakageDiagnostics: HistoricalLeakageDiagnostic[];
  noLookAheadViolationCount: number;
  decision: HistoricalInternationalDataDecisionReport;
}

export interface HistoricalInternationalDataValidationInput {
  fixtures: readonly HistoricalInternationalScoredFixture[];
  mode: HistoricalInternationalFixtureMode;
  generatedAt?: string;
  evaluationTeamsByYear?: Readonly<Record<string, readonly string[]>>;
  evaluationFixtureIdsByYear?: Readonly<Record<string, readonly string[]>>;
}

const WC2018_CUTOFF_AT = "2018-01-01";
const WC2022_CUTOFF_AT = "2022-01-01";

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function issue(
  records: HistoricalInternationalDataIssueRecord[],
  issuesByReason: Record<string, number>,
  issueName: HistoricalInternationalDataIssue,
  fixtureId: string,
  message: string
): void {
  increment(issuesByReason, issueName);
  records.push({ issue: issueName, fixtureId, message });
}

function isValidIsoDate(value: string): boolean {
  if (value.trim() === "") return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function fixtureYear(kickoffAt: string): string {
  return kickoffAt.slice(0, 4);
}

function duplicateKey(fixture: HistoricalInternationalScoredFixture): string {
  return [
    fixture.kickoffAt,
    fixture.competitionId,
    fixture.homeTeam,
    fixture.awayTeam,
    fixture.homeGoals,
    fixture.awayGoals,
  ].join("|");
}

function conflictKey(fixture: HistoricalInternationalScoredFixture): string {
  return [
    fixture.kickoffAt,
    fixture.competitionId,
    fixture.homeTeam,
    fixture.awayTeam,
  ].join("|");
}

function sourcePriority(sourceId: string): number {
  if (sourceId === "curated_world_cup_results") return 0;
  if (sourceId === "live_elo_expanded_international_supplement") return 1;
  return 2;
}

function sortFixtures(
  fixtures: readonly HistoricalInternationalScoredFixture[]
): HistoricalInternationalScoredFixture[] {
  return [...fixtures].sort(
    (a, b) =>
      sourcePriority(a.sourceId) - sourcePriority(b.sourceId) ||
      a.kickoffAt.localeCompare(b.kickoffAt) ||
      a.fixtureId.localeCompare(b.fixtureId)
  );
}

function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? null;
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? 0;
  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

function summarizeTeamCoverage(input: {
  accepted: readonly HistoricalInternationalScoredFixture[];
  teams: readonly string[];
  cutoffAt: string;
}): HistoricalTeamCoverageSummary {
  const canonicalTeams = [...new Set(input.teams.map(canonicalizeTeamName))].sort();
  const priorMatchCounts: Record<string, number> = {};
  const coverageCounts: Record<AttackDefenseProfileCoverage, number> = {
    full: 0,
    partial: 0,
    sparse: 0,
    fallback: 0,
  };

  for (const team of canonicalTeams) {
    const count = input.accepted.filter(
      (fixture) =>
        fixture.kickoffAt.slice(0, 10) < input.cutoffAt &&
        (fixture.homeTeam === team || fixture.awayTeam === team)
    ).length;
    priorMatchCounts[team] = count;
    const coverage = classifyProfileCoverage(count);
    coverageCounts[coverage] += 1;
  }

  const counts = Object.values(priorMatchCounts).sort((a, b) => a - b);
  const teamsWithNoPriorMatches = Object.entries(priorMatchCounts)
    .filter(([, count]) => count === 0)
    .map(([team]) => team)
    .sort();
  const partialOrBetterTeamCount = coverageCounts.partial + coverageCounts.full;
  const teamCount = canonicalTeams.length;

  return {
    cutoffAt: input.cutoffAt,
    teamCount,
    priorMatchCounts,
    teamsWithNoPriorMatches,
    zeroPriorTeamRate: teamCount === 0 ? 0 : teamsWithNoPriorMatches.length / teamCount,
    fallbackTeamRate: teamCount === 0 ? 0 : coverageCounts.fallback / teamCount,
    medianPriorMatchCount: percentile(counts, 0.5),
    p25PriorMatchCount: percentile(counts, 0.25),
    p75PriorMatchCount: percentile(counts, 0.75),
    coverageCounts,
    partialOrBetterTeamCount,
    partialOrBetterRate: teamCount === 0 ? 0 : partialOrBetterTeamCount / teamCount,
  };
}

function buildLeakageDiagnostics(input: {
  accepted: readonly HistoricalInternationalScoredFixture[];
  evaluationTeamsByYear?: Readonly<Record<string, readonly string[]>>;
  evaluationFixtureIdsByYear?: Readonly<Record<string, readonly string[]>>;
}): HistoricalLeakageDiagnostic[] {
  const diagnostics: HistoricalLeakageDiagnostic[] = [];
  const yearCutoffs: Record<string, string> = {
    "2018": WC2018_CUTOFF_AT,
    "2022": WC2022_CUTOFF_AT,
  };

  for (const [year, cutoffAt] of Object.entries(yearCutoffs)) {
    const teams = input.evaluationTeamsByYear?.[year] ?? [];
    const fixtureIds = input.evaluationFixtureIdsByYear?.[year] ?? [`wc${year}`];
    for (const fixtureId of fixtureIds) {
      for (const rawTeam of teams) {
        const team = canonicalizeTeamName(rawTeam);
        const included = input.accepted
          .filter(
            (fixture) =>
              fixture.kickoffAt.slice(0, 10) < cutoffAt &&
              (fixture.homeTeam === team || fixture.awayTeam === team)
          )
          .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt));
        const latestIncludedFixtureAt = included[0]?.kickoffAt ?? null;
        diagnostics.push({
          evaluationFixtureId: fixtureId,
          profileTeamId: team,
          profileCutoffAt: cutoffAt,
          latestIncludedFixtureAt,
          violation:
            latestIncludedFixtureAt !== null &&
            latestIncludedFixtureAt.slice(0, 10) >= cutoffAt,
        });
      }
    }
  }

  return diagnostics;
}

function evaluateDataDecision(input: {
  structuralInvalid: boolean;
  unresolvedTeamCount: number;
  noLookAheadViolationCount: number;
  wc2018: HistoricalTeamCoverageSummary | null;
  wc2022: HistoricalTeamCoverageSummary | null;
}): HistoricalInternationalDataDecisionReport {
  const reasons: string[] = [];
  const blockingReasons: HistoricalInternationalDataBlockingReason[] = [];

  if (input.structuralInvalid) {
    blockingReasons.push("structural_data_invalid");
  }
  if (input.unresolvedTeamCount > 0) {
    blockingReasons.push("unresolved_evaluation_teams");
  }
  if (input.noLookAheadViolationCount > 0) {
    blockingReasons.push("no_look_ahead_failure");
  }

  if (input.wc2018 !== null) {
    if (input.wc2018.zeroPriorTeamRate > 0.1) {
      blockingReasons.push("wc2018_zero_history");
    }
    if (input.wc2018.fallbackTeamRate >= 0.25) {
      blockingReasons.push("wc2018_fallback_rate_high");
    }
    if ((input.wc2018.medianPriorMatchCount ?? 0) < 8) {
      blockingReasons.push("median_history_too_low");
    }
    if (input.wc2018.partialOrBetterRate < 0.75) {
      reasons.push("WC2018 partial-or-better profile coverage is below the 75% target.");
    }
  }

  if (input.wc2022 !== null) {
    if (input.wc2022.fallbackTeamRate >= 0.15) {
      blockingReasons.push("wc2022_fallback_rate_high");
    }
    if ((input.wc2022.medianPriorMatchCount ?? 0) < 12) {
      blockingReasons.push("median_history_too_low");
    }
    if (input.wc2022.partialOrBetterRate < 0.85) {
      reasons.push("WC2022 partial-or-better profile coverage is below the 85% target.");
    }
  }

  const uniqueBlockingReasons = [...new Set(blockingReasons)];
  if (
    uniqueBlockingReasons.includes("structural_data_invalid") ||
    uniqueBlockingReasons.includes("unresolved_evaluation_teams") ||
    uniqueBlockingReasons.includes("no_look_ahead_failure")
  ) {
    return {
      decision: "historical_data_blocked",
      reasons,
      blockingReasons: uniqueBlockingReasons,
    };
  }

  if (uniqueBlockingReasons.length > 0) {
    return {
      decision: "historical_data_partial",
      reasons,
      blockingReasons: uniqueBlockingReasons,
    };
  }

  reasons.push("WC2018 and WC2022 historical profile coverage targets are met.");
  return {
    decision: "historical_data_ready",
    reasons,
    blockingReasons: [],
  };
}

export function validateHistoricalInternationalData(
  input: HistoricalInternationalDataValidationInput
): HistoricalInternationalDataValidationReport {
  const issuesByReason: Record<string, number> = {};
  const issues: HistoricalInternationalDataIssueRecord[] = [];
  const accepted: HistoricalInternationalScoredFixture[] = [];
  const duplicateKeys = new Set<string>();
  const conflictKeys = new Map<string, HistoricalInternationalScoredFixture>();

  for (const fixture of sortFixtures(input.fixtures)) {
    const canonicalFixture: HistoricalInternationalScoredFixture = {
      ...fixture,
      homeTeam: canonicalizeTeamName(fixture.homeTeam),
      awayTeam: canonicalizeTeamName(fixture.awayTeam),
    };

    let excluded = false;
    if (!isValidIsoDate(canonicalFixture.kickoffAt)) {
      issue(issues, issuesByReason, "invalid_kickoff", canonicalFixture.fixtureId, "Invalid or missing kickoff timestamp.");
      excluded = true;
    }
    if (
      !isNonNegativeInteger(canonicalFixture.homeGoals) ||
      !isNonNegativeInteger(canonicalFixture.awayGoals)
    ) {
      issue(issues, issuesByReason, "invalid_score", canonicalFixture.fixtureId, "Invalid score.");
      excluded = true;
    }
    if (canonicalFixture.homeTeam.trim() === "") {
      issue(issues, issuesByReason, "unresolved_home_team", canonicalFixture.fixtureId, "Home team could not be resolved.");
      excluded = true;
    }
    if (canonicalFixture.awayTeam.trim() === "") {
      issue(issues, issuesByReason, "unresolved_away_team", canonicalFixture.fixtureId, "Away team could not be resolved.");
      excluded = true;
    }
    if (canonicalFixture.competitionWeightKey === ("unknown" satisfies ExistingCompetitionWeightKey)) {
      issue(issues, issuesByReason, "unknown_competition_weight", canonicalFixture.fixtureId, "Competition mapped to unknown weight.");
    }
    if (canonicalFixture.kickoffAt >= "2026-01-01") {
      issue(issues, issuesByReason, "wc2026_fixture_excluded", canonicalFixture.fixtureId, "WC2026 or later fixture excluded.");
      excluded = true;
    } else if (canonicalFixture.kickoffAt > (input.generatedAt ?? new Date().toISOString())) {
      issue(issues, issuesByReason, "future_fixture", canonicalFixture.fixtureId, "Future fixture excluded.");
      excluded = true;
    }

    if (excluded) continue;

    const exactDuplicateKey = duplicateKey(canonicalFixture);
    if (duplicateKeys.has(exactDuplicateKey)) {
      issue(issues, issuesByReason, "duplicate_fixture", canonicalFixture.fixtureId, "Duplicate fixture excluded.");
      continue;
    }

    const existingConflict = conflictKeys.get(conflictKey(canonicalFixture));
    if (
      existingConflict !== undefined &&
      (existingConflict.homeGoals !== canonicalFixture.homeGoals ||
        existingConflict.awayGoals !== canonicalFixture.awayGoals)
    ) {
      issue(
        issues,
        issuesByReason,
        "conflicting_duplicate",
        canonicalFixture.fixtureId,
        "Same teams, competition, and kickoff have conflicting scores."
      );
      continue;
    }

    duplicateKeys.add(exactDuplicateKey);
    conflictKeys.set(conflictKey(canonicalFixture), canonicalFixture);
    accepted.push(canonicalFixture);
  }

  const fixturesByYear: Record<string, number> = {};
  const fixturesByCompetition: Record<string, number> = {};
  const fixturesBySource: Record<string, number> = {};
  const uniqueTeamsSet = new Set<string>();
  let neutralFixtureCount = 0;
  let earliestKickoffAt: string | null = null;
  let latestKickoffAt: string | null = null;

  for (const fixture of accepted) {
    increment(fixturesByYear, fixtureYear(fixture.kickoffAt));
    increment(fixturesByCompetition, fixture.competitionId);
    increment(fixturesBySource, fixture.sourceId);
    uniqueTeamsSet.add(fixture.homeTeam);
    uniqueTeamsSet.add(fixture.awayTeam);
    if (fixture.neutralVenue) neutralFixtureCount += 1;
    if (earliestKickoffAt === null || fixture.kickoffAt < earliestKickoffAt) {
      earliestKickoffAt = fixture.kickoffAt;
    }
    if (latestKickoffAt === null || fixture.kickoffAt > latestKickoffAt) {
      latestKickoffAt = fixture.kickoffAt;
    }
  }

  const wc2018Teams = input.evaluationTeamsByYear?.["2018"] ?? [];
  const wc2022Teams = input.evaluationTeamsByYear?.["2022"] ?? [];
  const wc2018 =
    wc2018Teams.length > 0
      ? summarizeTeamCoverage({ accepted, teams: wc2018Teams, cutoffAt: WC2018_CUTOFF_AT })
      : null;
  const wc2022 =
    wc2022Teams.length > 0
      ? summarizeTeamCoverage({ accepted, teams: wc2022Teams, cutoffAt: WC2022_CUTOFF_AT })
      : null;

  const combinedCounts = [
    ...Object.values(wc2018?.priorMatchCounts ?? {}),
    ...Object.values(wc2022?.priorMatchCounts ?? {}),
  ].sort((a, b) => a - b);
  const combinedFallbackCount = [
    wc2018?.coverageCounts.fallback ?? 0,
    wc2022?.coverageCounts.fallback ?? 0,
  ].reduce((sum, count) => sum + count, 0);
  const combinedTeamCount = (wc2018?.teamCount ?? 0) + (wc2022?.teamCount ?? 0);

  const leakageInput: Parameters<typeof buildLeakageDiagnostics>[0] = { accepted };
  if (input.evaluationTeamsByYear !== undefined) {
    leakageInput.evaluationTeamsByYear = input.evaluationTeamsByYear;
  }
  if (input.evaluationFixtureIdsByYear !== undefined) {
    leakageInput.evaluationFixtureIdsByYear = input.evaluationFixtureIdsByYear;
  }
  const leakageDiagnostics = buildLeakageDiagnostics(leakageInput);
  const noLookAheadViolationCount = leakageDiagnostics.filter((diagnostic) => diagnostic.violation).length;
  const unresolvedTeamCount =
    (issuesByReason.unresolved_home_team ?? 0) + (issuesByReason.unresolved_away_team ?? 0);
  const structuralInvalid =
    (issuesByReason.invalid_kickoff ?? 0) > 0 ||
    (issuesByReason.invalid_score ?? 0) > 0 ||
    (issuesByReason.conflicting_duplicate ?? 0) > 0;

  const decision = evaluateDataDecision({
    structuralInvalid,
    unresolvedTeamCount,
    noLookAheadViolationCount,
    wc2018,
    wc2022,
  });

  return {
    schemaVersion: HISTORICAL_INTERNATIONAL_FIXTURE_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: input.mode,
    totalFixtures: input.fixtures.length,
    acceptedFixtures: accepted.length,
    excludedFixtures: input.fixtures.length - accepted.length,
    issuesByReason,
    issues,
    fixturesByYear,
    fixturesByCompetition,
    fixturesBySource,
    uniqueTeams: uniqueTeamsSet.size,
    neutralFixtureCount,
    earliestKickoffAt,
    latestKickoffAt,
    unresolvedTeamCount,
    duplicateFixtureCount: issuesByReason.duplicate_fixture ?? 0,
    conflictingDuplicateCount: issuesByReason.conflicting_duplicate ?? 0,
    invalidScoreCount: issuesByReason.invalid_score ?? 0,
    missingKickoffCount: issuesByReason.invalid_kickoff ?? 0,
    competitionWeightFallbackCount: issuesByReason.unknown_competition_weight ?? 0,
    accepted,
    evaluationCoverage: {
      wc2018,
      wc2022,
      combinedFallbackTeamRate:
        combinedTeamCount === 0 ? null : combinedFallbackCount / combinedTeamCount,
      combinedMedianPriorMatchCount: percentile(combinedCounts, 0.5),
    },
    leakageDiagnostics,
    noLookAheadViolationCount,
    decision,
  };
}
