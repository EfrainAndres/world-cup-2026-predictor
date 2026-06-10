import type {
  GeneratedPreTournamentSnapshot,
  LookAheadGuardrailResult,
  PreTournamentSnapshotInput,
  PreTournamentTeamSeedRating,
  SnapshotTeamProbability
} from "./types.js";

export const BASELINE_PRE_TOURNAMENT_SNAPSHOT_MODEL_VERSION = "baseline-seed-rating-v1";
export const PROBABILITY_SUM_TOLERANCE = 1e-9;

function assertNonEmptyText(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
}

function parseDate(value: string, fieldName: string): Date {
  assertNonEmptyText(value, fieldName);
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return parsedDate;
}

function sumProbabilities(probabilities: readonly { probability: number }[]): number {
  return probabilities.reduce((sum, entry) => sum + entry.probability, 0);
}

function validateTeamSeedRatings(teamSeedRatings: readonly PreTournamentTeamSeedRating[]): void {
  if (teamSeedRatings.length === 0) {
    throw new Error("teamSeedRatings must include at least one team.");
  }

  const seenTeams = new Set<string>();

  for (const seedRating of teamSeedRatings) {
    const team = seedRating.team.trim();

    if (team.length === 0) {
      throw new Error("team seed rating team is required.");
    }

    if (seenTeams.has(team)) {
      throw new Error(`duplicate team in seed ratings: ${team}`);
    }

    if (!Number.isFinite(seedRating.rating) || seedRating.rating <= 0) {
      throw new Error(`rating for ${team} must be a finite positive number.`);
    }

    seenTeams.add(team);
  }
}

export function validatePreTournamentSnapshotInput(input: PreTournamentSnapshotInput): void {
  assertNonEmptyText(input.tournamentId, "tournamentId");
  assertNonEmptyText(input.tournamentName, "tournamentName");

  if (!Number.isInteger(input.tournamentYear)) {
    throw new Error("tournamentYear must be an integer.");
  }

  parseDate(input.tournamentStartDate, "tournamentStartDate");
  parseDate(input.generatedAt, "generatedAt");
  parseDate(input.inputDataCutoff, "inputDataCutoff");
  validateTeamSeedRatings(input.teamSeedRatings);

  if (input.actualTournamentResultsIncluded === true) {
    throw new Error("actual tournament results must not be included in pre-tournament snapshot input.");
  }
}

export function normalizeRatingProbabilities(teamSeedRatings: readonly PreTournamentTeamSeedRating[]): SnapshotTeamProbability[] {
  validateTeamSeedRatings(teamSeedRatings);
  const totalRating = teamSeedRatings.reduce((sum, seedRating) => sum + seedRating.rating, 0);
  const probabilities = teamSeedRatings.map((seedRating) => ({
    team: seedRating.team.trim(),
    rating: seedRating.rating,
    rank: 0,
    probability: seedRating.rating / totalRating
  }));

  return rankSnapshotProbabilities(probabilities);
}

export function rankSnapshotProbabilities(probabilities: readonly Omit<SnapshotTeamProbability, "rank">[]): SnapshotTeamProbability[] {
  if (probabilities.length === 0) {
    throw new Error("probabilities must include at least one team.");
  }

  for (const probability of probabilities) {
    assertNonEmptyText(probability.team, "probability team");

    if (!Number.isFinite(probability.probability) || probability.probability < 0 || probability.probability > 1) {
      throw new Error("generated probabilities must be between 0 and 1.");
    }

    if (!Number.isFinite(probability.rating) || probability.rating <= 0) {
      throw new Error(`rating for ${probability.team.trim()} must be a finite positive number.`);
    }
  }

  const probabilitySum = sumProbabilities(probabilities);

  if (Math.abs(probabilitySum - 1) > PROBABILITY_SUM_TOLERANCE) {
    throw new Error("generated probabilities must sum to 1.");
  }

  return [...probabilities]
    .sort((a, b) => b.probability - a.probability || a.team.trim().localeCompare(b.team.trim()))
    .map((entry, index) => ({
      team: entry.team.trim(),
      rating: entry.rating,
      probability: entry.probability,
      rank: index + 1
    }));
}

export function evaluateLookAheadGuardrails(input: PreTournamentSnapshotInput): LookAheadGuardrailResult[] {
  const tournamentStartDate = parseDate(input.tournamentStartDate, "tournamentStartDate");
  const generatedAt = parseDate(input.generatedAt, "generatedAt");
  const inputDataCutoff = parseDate(input.inputDataCutoff, "inputDataCutoff");
  const inputDataBeforeTournament = inputDataCutoff.getTime() < tournamentStartDate.getTime();
  const generatedBeforeTournament = generatedAt.getTime() < tournamentStartDate.getTime();
  const noActualResultsIncluded = input.actualTournamentResultsIncluded !== true;

  return [
    {
      guardrail: "input_data_before_tournament",
      passed: inputDataBeforeTournament,
      severity: "error",
      message: inputDataBeforeTournament
        ? "Input data cutoff is before the tournament start date."
        : "Input data cutoff is on or after the tournament start date."
    },
    {
      guardrail: "generated_before_tournament",
      passed: generatedBeforeTournament,
      severity: "warning",
      message: generatedBeforeTournament
        ? "Snapshot generated date is before the tournament start date."
        : "Snapshot generated date is on or after the tournament start date."
    },
    {
      guardrail: "no_actual_results_in_input",
      passed: noActualResultsIncluded,
      severity: "error",
      message: noActualResultsIncluded
        ? "Snapshot input does not include actual tournament results."
        : "Snapshot input includes actual tournament results."
    }
  ];
}

export function validateGeneratedSnapshotProbabilities(probabilities: readonly SnapshotTeamProbability[]): void {
  rankSnapshotProbabilities(probabilities.map(({ team, rating, probability }) => ({ team, rating, probability })));
}

export function generateBaselinePreTournamentSnapshot(input: PreTournamentSnapshotInput): GeneratedPreTournamentSnapshot {
  validatePreTournamentSnapshotInput(input);
  const championProbabilities = normalizeRatingProbabilities(input.teamSeedRatings);
  validateGeneratedSnapshotProbabilities(championProbabilities);
  const lookAheadGuardrails = evaluateLookAheadGuardrails(input);
  const failedGuardrailWarnings = lookAheadGuardrails.filter((guardrail) => !guardrail.passed).map((guardrail) => guardrail.message);

  const snapshot: GeneratedPreTournamentSnapshot = {
    tournamentId: input.tournamentId,
    tournamentName: input.tournamentName,
    tournamentYear: input.tournamentYear,
    snapshotType: "baseline_pre_tournament_snapshot",
    modelVersion: BASELINE_PRE_TOURNAMENT_SNAPSHOT_MODEL_VERSION,
    dataCutoff: input.inputDataCutoff,
    championProbabilities,
    snapshotMetadata: {
      tournamentYear: input.tournamentYear,
      tournamentStartDate: input.tournamentStartDate,
      inputDataCutoff: input.inputDataCutoff,
      generatedAt: input.generatedAt,
      modelVersion: BASELINE_PRE_TOURNAMENT_SNAPSHOT_MODEL_VERSION,
      snapshotType: "baseline_pre_tournament_snapshot",
      warnings: failedGuardrailWarnings,
      lookAheadGuardrails
    }
  };

  if (input.metadata !== undefined) {
    snapshot.metadata = input.metadata;
  }

  return snapshot;
}
