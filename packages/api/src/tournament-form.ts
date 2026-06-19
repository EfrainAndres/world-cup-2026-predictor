import { DEFAULT_ELO_CONFIG } from "../../model/src/index.js";
import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "./world-cup-2026-teams.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import type { WorldCup2026Fixture } from "./schemas.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026TournamentFormIssue,
  WorldCup2026TournamentFormResult,
  WorldCup2026TournamentFormTeamSummary
} from "./schemas.js";

export const WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION =
  "wc2026-tournament-form-v1";
export const WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES = 2;
export const WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT = 12;
export const WORLD_CUP_2026_TOURNAMENT_FORM_RESULT_WEIGHT = 0.65;
export const WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_WEIGHT = 0.2;
export const WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_CAP = 2;
export const WORLD_CUP_2026_TOURNAMENT_FORM_OPPONENT_STRENGTH_WEIGHT = 0.15;
const WORLD_CUP_2026_TOURNAMENT_FORM_REFERENCE_DATE = "2026-07-01T00:00:00Z";

interface TeamAccumulator {
  team: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  mostRecentEligibleMatch?: string;
  opponentsFaced: Set<string>;
  resultSignalSum: number;
  goalSignalSum: number;
  opponentSignalSum: number;
}

export interface CalculateWorldCup2026TournamentFormInput {
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
  baselineRatings?: ReadonlyMap<string, number>;
  cutoffAt?: string;
  referenceAt?: string;
}

function normalizeForIndex(name: string): string {
  return normalizeTeamSearchText(canonicalizeTeamName(name));
}

function buildFixtureIndex(): {
  byId: Map<string, WorldCup2026Fixture>;
  byTeams: Map<string, WorldCup2026Fixture>;
} {
  const byId = new Map<string, WorldCup2026Fixture>();
  const byTeams = new Map<string, WorldCup2026Fixture>();

  for (const fixture of WORLD_CUP_2026_GROUP_STAGE_FIXTURES) {
    byId.set(fixture.id, fixture);
    const normHome = normalizeForIndex(fixture.homeTeam);
    const normAway = normalizeForIndex(fixture.awayTeam);
    byTeams.set(`${normHome}|${normAway}`, fixture);
    byTeams.set(`${normAway}|${normHome}`, fixture);
  }

  return { byId, byTeams };
}

function resolveFixture(
  record: WorldCup2026ExternalFixtureRecord,
  fixtureIndex: { byId: Map<string, WorldCup2026Fixture>; byTeams: Map<string, WorldCup2026Fixture> }
): WorldCup2026Fixture | undefined {
  const byId = fixtureIndex.byId.get(record.providerFixtureId);
  if (byId !== undefined) {
    const home = normalizeForIndex(record.homeTeam);
    const away = normalizeForIndex(record.awayTeam);
    const byIdHome = normalizeForIndex(byId.homeTeam);
    const byIdAway = normalizeForIndex(byId.awayTeam);
    if (
      (byIdHome === home && byIdAway === away) ||
      (byIdHome === away && byIdAway === home)
    ) {
      return byId;
    }
  }

  return fixtureIndex.byTeams.get(
    `${normalizeForIndex(record.homeTeam)}|${normalizeForIndex(record.awayTeam)}`
  );
}

function compareForSort(
  a: WorldCup2026ExternalFixtureRecord,
  b: WorldCup2026ExternalFixtureRecord
): number {
  const aHasDate = a.kickoffAt !== undefined;
  const bHasDate = b.kickoffAt !== undefined;

  if (aHasDate && bHasDate) {
    const dateCmp = a.kickoffAt!.localeCompare(b.kickoffAt!);
    if (dateCmp !== 0) return dateCmp;
  } else if (aHasDate && !bHasDate) {
    return -1;
  } else if (!aHasDate && bHasDate) {
    return 1;
  }

  return a.providerFixtureId.localeCompare(b.providerFixtureId);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isFutureRecord(
  kickoffAt: string | undefined,
  referenceAt: string
): boolean {
  return kickoffAt !== undefined && kickoffAt > referenceAt;
}

function isBeforeCutoff(
  kickoffAt: string | undefined,
  cutoffAt: string | undefined
): boolean {
  if (cutoffAt === undefined || kickoffAt === undefined) {
    return true;
  }
  return kickoffAt < cutoffAt;
}

function createAccumulator(team: string): TeamAccumulator {
  return {
    team,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    opponentsFaced: new Set<string>(),
    resultSignalSum: 0,
    goalSignalSum: 0,
    opponentSignalSum: 0
  };
}

function getOrCreateAccumulator(
  accumulators: Map<string, TeamAccumulator>,
  team: string
): TeamAccumulator {
  const existing = accumulators.get(team);
  if (existing !== undefined) {
    return existing;
  }

  const created = createAccumulator(team);
  accumulators.set(team, created);
  return created;
}

function appendIssue(
  issues: WorldCup2026TournamentFormIssue[],
  issue: WorldCup2026TournamentFormIssue
): void {
  issues.push(issue);
}

function updateAccumulator(
  accumulator: TeamAccumulator,
  goalsFor: number,
  goalsAgainst: number,
  opponent: string,
  opponentSignal: number,
  kickoffAt: string | undefined
): void {
  accumulator.matchesPlayed += 1;
  accumulator.goalsFor += goalsFor;
  accumulator.goalsAgainst += goalsAgainst;
  accumulator.opponentsFaced.add(opponent);

  if (
    kickoffAt !== undefined &&
    (accumulator.mostRecentEligibleMatch === undefined ||
      kickoffAt > accumulator.mostRecentEligibleMatch)
  ) {
    accumulator.mostRecentEligibleMatch = kickoffAt;
  }

  if (goalsFor > goalsAgainst) {
    accumulator.wins += 1;
    accumulator.points += 3;
    accumulator.resultSignalSum += 1;
  } else if (goalsFor < goalsAgainst) {
    accumulator.losses += 1;
    accumulator.resultSignalSum -= 1;
  } else {
    accumulator.draws += 1;
    accumulator.points += 1;
  }

  const goalDifference = goalsFor - goalsAgainst;
  const boundedGoalSignal = clamp(
    goalDifference / WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_CAP,
    -1,
    1
  );
  accumulator.goalSignalSum += boundedGoalSignal;
  accumulator.opponentSignalSum += opponentSignal;
}

function summarizeAccumulator(
  accumulator: TeamAccumulator
): WorldCup2026TournamentFormTeamSummary {
  const averageResultSignal =
    accumulator.matchesPlayed === 0
      ? 0
      : accumulator.resultSignalSum / accumulator.matchesPlayed;
  const averageGoalSignal =
    accumulator.matchesPlayed === 0
      ? 0
      : accumulator.goalSignalSum / accumulator.matchesPlayed;
  const averageOpponentSignal =
    accumulator.matchesPlayed === 0
      ? 0
      : accumulator.opponentSignalSum / accumulator.matchesPlayed;
  const rawFormScore =
    averageResultSignal * WORLD_CUP_2026_TOURNAMENT_FORM_RESULT_WEIGHT +
    averageGoalSignal * WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_WEIGHT +
    averageOpponentSignal * WORLD_CUP_2026_TOURNAMENT_FORM_OPPONENT_STRENGTH_WEIGHT;
  const formScore = round3(clamp(rawFormScore, -1, 1));
  const matchScale = Math.min(accumulator.matchesPlayed / 3, 1);
  const recommendedAdjustment =
    accumulator.matchesPlayed < WORLD_CUP_2026_TOURNAMENT_FORM_MINIMUM_MATCHES
      ? 0
      : round1(
          clamp(
            formScore *
              WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT *
              matchScale,
            -WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT,
            WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT
          )
        );

  const summary: WorldCup2026TournamentFormTeamSummary = {
    team: accumulator.team,
    matchesPlayed: accumulator.matchesPlayed,
    wins: accumulator.wins,
    draws: accumulator.draws,
    losses: accumulator.losses,
    goalsFor: accumulator.goalsFor,
    goalsAgainst: accumulator.goalsAgainst,
    goalDifference: accumulator.goalsFor - accumulator.goalsAgainst,
    points: accumulator.points,
    opponentsFaced: [...accumulator.opponentsFaced].sort((a, b) =>
      a.localeCompare(b)
    ),
    formScore,
    eloAdjustmentRecommendation: recommendedAdjustment
  };

  if (accumulator.mostRecentEligibleMatch !== undefined) {
    summary.mostRecentEligibleMatch = accumulator.mostRecentEligibleMatch;
  }

  return summary;
}

export function calculateWorldCup2026TournamentForm(
  input: CalculateWorldCup2026TournamentFormInput
): WorldCup2026TournamentFormResult {
  const referenceAt =
    input.referenceAt ?? WORLD_CUP_2026_TOURNAMENT_FORM_REFERENCE_DATE;
  const issues: WorldCup2026TournamentFormIssue[] = [];
  const accumulators = new Map<string, TeamAccumulator>();
  const fixtureIndex = buildFixtureIndex();
  const seenFixtures = new Set<string>();
  let recordsAccepted = 0;
  let futureRecordsExcluded = 0;
  let duplicateFixturesSkipped = 0;

  for (const record of [...input.completedResults].sort(compareForSort)) {
    if (record.status !== "finished") {
      appendIssue(issues, {
        code: "record_rejected_non_finished",
        providerFixtureId: record.providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record rejected: status is "${record.status}", only "finished" records are accepted.`
      });
      continue;
    }

    if (
      !Number.isInteger(record.homeScore) ||
      record.homeScore === undefined ||
      record.homeScore < 0 ||
      !Number.isInteger(record.awayScore) ||
      record.awayScore === undefined ||
      record.awayScore < 0
    ) {
      appendIssue(issues, {
        code: "invalid_score",
        providerFixtureId: record.providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record rejected: invalid final score for ${record.homeTeam} vs ${record.awayTeam}.`
      });
      continue;
    }

    if (isFutureRecord(record.kickoffAt, referenceAt)) {
      futureRecordsExcluded += 1;
      appendIssue(issues, {
        code: "future_record_excluded",
        providerFixtureId: record.providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record excluded: kickoffAt "${record.kickoffAt}" is after reference time "${referenceAt}".`
      });
      continue;
    }

    if (!isBeforeCutoff(record.kickoffAt, input.cutoffAt)) {
      appendIssue(issues, {
        code: "cutoff_excluded",
        providerFixtureId: record.providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record excluded: kickoffAt "${record.kickoffAt}" is at or after cutoff "${input.cutoffAt}".`
      });
      continue;
    }

    const fixture = resolveFixture(record, fixtureIndex);

    if (fixture === undefined) {
      appendIssue(issues, {
        code: "fixture_not_found",
        providerFixtureId: record.providerFixtureId,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        message: `Record rejected: could not resolve a WC2026 fixture for ${record.homeTeam} vs ${record.awayTeam}.`
      });
      continue;
    }

    if (seenFixtures.has(fixture.id)) {
      duplicateFixturesSkipped += 1;
      appendIssue(issues, {
        code: "duplicate_fixture_skipped",
        providerFixtureId: record.providerFixtureId,
        fixtureId: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        message: `Record skipped: fixture "${fixture.id}" was already included in tournament form.`
      });
      continue;
    }

    seenFixtures.add(fixture.id);
    recordsAccepted += 1;

    const homeTeam = fixture.homeTeam;
    const awayTeam = fixture.awayTeam;
    const homeAccumulator = getOrCreateAccumulator(accumulators, homeTeam);
    const awayAccumulator = getOrCreateAccumulator(accumulators, awayTeam);
    const homeOpponentElo =
      input.baselineRatings?.get(awayTeam) ?? DEFAULT_ELO_CONFIG.initialRating;
    const awayOpponentElo =
      input.baselineRatings?.get(homeTeam) ?? DEFAULT_ELO_CONFIG.initialRating;
    const homeOpponentSignal =
      record.homeScore === record.awayScore
        ? 0
        : clamp((homeOpponentElo - DEFAULT_ELO_CONFIG.initialRating) / 400, -1, 1);
    const awayOpponentSignal =
      record.homeScore === record.awayScore
        ? 0
        : clamp((awayOpponentElo - DEFAULT_ELO_CONFIG.initialRating) / 400, -1, 1);

    updateAccumulator(
      homeAccumulator,
      record.homeScore,
      record.awayScore,
      awayTeam,
      homeOpponentSignal,
      record.kickoffAt
    );
    updateAccumulator(
      awayAccumulator,
      record.awayScore,
      record.homeScore,
      homeTeam,
      awayOpponentSignal,
      record.kickoffAt
    );
  }

  const summaries = [...accumulators.values()]
    .map(summarizeAccumulator)
    .sort(
      (a, b) =>
        b.formScore - a.formScore ||
        b.points - a.points ||
        a.team.localeCompare(b.team)
    );

  const warnings = [
    "Tournament form is a bounded secondary signal and does not replace the historical Live Elo baseline.",
    `A single match cannot produce an absolute recommendation above ${WORLD_CUP_2026_TOURNAMENT_FORM_MAX_ABSOLUTE_ADJUSTMENT} Elo points.`,
    `Goal-difference contribution is capped at ${WORLD_CUP_2026_TOURNAMENT_FORM_GOAL_DIFFERENCE_CAP} goals per match.`,
    "No Elo ratings were mutated by this calculation."
  ] as const;

  return {
    status: "success",
    summaries,
    issues,
    metadata: {
      ...(input.cutoffAt === undefined ? {} : { cutoffAt: input.cutoffAt }),
      referenceAt,
      totalRecordsReceived: input.completedResults.length,
      recordsAccepted,
      recordsRejected: issues.length,
      futureRecordsExcluded,
      duplicateFixturesSkipped,
      teamsSummarized: summaries.length,
      warnings,
      formulaVersion: WORLD_CUP_2026_TOURNAMENT_FORM_FORMULA_VERSION
    }
  };
}
