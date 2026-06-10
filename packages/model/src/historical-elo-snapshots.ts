import { DEFAULT_ELO_CONFIG, getCurrentTeamRatings, processMatches } from "./elo.js";
import { evaluateLookAheadGuardrails, PROBABILITY_SUM_TOLERANCE } from "./pre-tournament-snapshots.js";
import type {
  EloMatch,
  EloRatingEntry,
  GeneratedHistoricalEloSnapshot,
  HistoricalEloReplayConfig,
  HistoricalEloReplayDataCoverage,
  HistoricalEloReplayInput,
  HistoricalEloReplayMetadata,
  HistoricalEloReplayRatingResult,
  HistoricalEloReplayWarning,
  HistoricalEloTeamSnapshot,
  PreTournamentSnapshotInput
} from "./types.js";

export const HISTORICAL_ELO_REPLAY_SNAPSHOT_MODEL_VERSION = "historical-elo-replay-foundation-v1";
export const HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING =
  "Probability snapshot is a historical_elo_replay_snapshot_foundation generated from available curated historical fixtures, not a complete international-history forecast.";

export const DEFAULT_HISTORICAL_ELO_REPLAY_CONFIG: HistoricalEloReplayConfig = {
  initialRating: DEFAULT_ELO_CONFIG.initialRating,
  kFactor: DEFAULT_ELO_CONFIG.kFactor,
  probabilityRatingScale: 400
};

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

function normalizeTeamName(team: string): string {
  return team.trim();
}

function validateTargetTeams(targetTeams: readonly string[]): void {
  if (targetTeams.length === 0) {
    throw new Error("targetTeams must include at least one team.");
  }

  const seenTeams = new Set<string>();

  for (const teamInput of targetTeams) {
    const team = normalizeTeamName(teamInput);

    if (team.length === 0) {
      throw new Error("target team is required.");
    }

    if (seenTeams.has(team)) {
      throw new Error(`duplicate target team: ${team}`);
    }

    seenTeams.add(team);
  }
}

function resolveConfig(config: Partial<HistoricalEloReplayConfig> | undefined): HistoricalEloReplayConfig {
  const resolvedConfig: HistoricalEloReplayConfig = {
    initialRating: config?.initialRating ?? DEFAULT_HISTORICAL_ELO_REPLAY_CONFIG.initialRating,
    kFactor: config?.kFactor ?? DEFAULT_HISTORICAL_ELO_REPLAY_CONFIG.kFactor,
    probabilityRatingScale: config?.probabilityRatingScale ?? DEFAULT_HISTORICAL_ELO_REPLAY_CONFIG.probabilityRatingScale
  };

  if (!Number.isFinite(resolvedConfig.initialRating) || resolvedConfig.initialRating <= 0) {
    throw new Error("initialRating must be a finite positive number.");
  }

  if (!Number.isFinite(resolvedConfig.kFactor) || resolvedConfig.kFactor <= 0) {
    throw new Error("kFactor must be a finite positive number.");
  }

  if (!Number.isFinite(resolvedConfig.probabilityRatingScale) || resolvedConfig.probabilityRatingScale <= 0) {
    throw new Error("probabilityRatingScale must be a finite positive number.");
  }

  return resolvedConfig;
}

function validateInput(input: HistoricalEloReplayInput): void {
  assertNonEmptyText(input.tournamentId, "tournamentId");
  assertNonEmptyText(input.tournamentName, "tournamentName");

  if (!Number.isInteger(input.tournamentYear)) {
    throw new Error("tournamentYear must be an integer.");
  }

  const tournamentStartDate = parseDate(input.tournamentStartDate, "tournamentStartDate");
  parseDate(input.generatedAt, "generatedAt");
  const inputDataCutoff = parseDate(input.inputDataCutoff, "inputDataCutoff");

  if (inputDataCutoff.getTime() >= tournamentStartDate.getTime()) {
    throw new Error("inputDataCutoff must be before tournamentStartDate.");
  }

  if (input.actualTournamentResultsIncluded === true) {
    throw new Error("actual tournament results must not be included in historical Elo snapshot input.");
  }

  validateTargetTeams(input.targetTeams);
  resolveConfig(input.config);
}

function sortMatchesForReplay(matches: readonly EloMatch[]): EloMatch[] {
  return [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date) || a.match_id.localeCompare(b.match_id));
}

function getLatestMatchDate(matches: readonly EloMatch[]): string | undefined {
  return sortMatchesForReplay(matches).at(-1)?.match_date;
}

export function splitHistoricalEloMatchesByCutoff(
  matches: readonly EloMatch[],
  inputDataCutoff: string
): { matchesUsed: EloMatch[]; matchesIgnoredAfterCutoff: EloMatch[]; inputDataLatestDate?: string; usedMatchLatestDate?: string } {
  const cutoffDate = parseDate(inputDataCutoff, "inputDataCutoff");
  const matchesUsed: EloMatch[] = [];
  const matchesIgnoredAfterCutoff: EloMatch[] = [];

  for (const match of matches) {
    parseDate(match.match_date, `match ${match.match_id} match_date`);

    if (new Date(match.match_date).getTime() <= cutoffDate.getTime()) {
      matchesUsed.push(match);
    } else {
      matchesIgnoredAfterCutoff.push(match);
    }
  }

  const result: { matchesUsed: EloMatch[]; matchesIgnoredAfterCutoff: EloMatch[]; inputDataLatestDate?: string; usedMatchLatestDate?: string } = {
    matchesUsed: sortMatchesForReplay(matchesUsed),
    matchesIgnoredAfterCutoff: sortMatchesForReplay(matchesIgnoredAfterCutoff)
  };
  const inputDataLatestDate = getLatestMatchDate(matches);
  const usedMatchLatestDate = getLatestMatchDate(matchesUsed);

  if (inputDataLatestDate !== undefined) {
    result.inputDataLatestDate = inputDataLatestDate;
  }

  if (usedMatchLatestDate !== undefined) {
    result.usedMatchLatestDate = usedMatchLatestDate;
  }

  return result;
}

function buildWarnings(
  input: HistoricalEloReplayInput,
  dataCoverage: HistoricalEloReplayDataCoverage,
  matchesUsed: readonly EloMatch[],
  matchesIgnoredAfterCutoff: readonly EloMatch[]
): HistoricalEloReplayWarning[] {
  const warnings: HistoricalEloReplayWarning[] = [];

  if (dataCoverage !== "complete_international_history") {
    warnings.push({
      code: "incomplete_historical_data",
      severity: "warning",
      message: HISTORICAL_ELO_REPLAY_SNAPSHOT_FOUNDATION_WARNING
    });
  }

  if (matchesIgnoredAfterCutoff.length > 0) {
    warnings.push({
      code: "matches_after_cutoff_ignored",
      severity: "warning",
      message: `${matchesIgnoredAfterCutoff.length} historical matches after ${input.inputDataCutoff} were ignored.`
    });
  }

  if (matchesUsed.length === 0) {
    warnings.push({
      code: "no_matches_before_cutoff",
      severity: "warning",
      message: "No historical matches were available on or before the cutoff date."
    });
  }

  return warnings;
}

export function buildHistoricalEloRatings(input: HistoricalEloReplayInput): HistoricalEloReplayRatingResult {
  validateInput(input);
  const config = resolveConfig(input.config);
  const cutoffResult = splitHistoricalEloMatchesByCutoff(input.historicalMatches, input.inputDataCutoff);
  const replay = processMatches(cutoffResult.matchesUsed, config);
  const result: HistoricalEloReplayRatingResult = {
    ratings: getCurrentTeamRatings(replay.ratings),
    matchHistory: replay.matchHistory,
    matchesUsed: cutoffResult.matchesUsed,
    matchesIgnoredAfterCutoff: cutoffResult.matchesIgnoredAfterCutoff
  };

  if (cutoffResult.inputDataLatestDate !== undefined) {
    result.inputDataLatestDate = cutoffResult.inputDataLatestDate;
  }

  if (cutoffResult.usedMatchLatestDate !== undefined) {
    result.usedMatchLatestDate = cutoffResult.usedMatchLatestDate;
  }

  return result;
}

function ratingForTeam(ratings: readonly EloRatingEntry[], team: string, config: HistoricalEloReplayConfig): number {
  return ratings.find((entry) => entry.team === team)?.rating ?? config.initialRating;
}

function sumProbabilities(probabilities: readonly { probability: number }[]): number {
  return probabilities.reduce((sum, entry) => sum + entry.probability, 0);
}

export function normalizeHistoricalEloProbabilities(
  ratings: readonly EloRatingEntry[],
  targetTeams: readonly string[],
  config: HistoricalEloReplayConfig = DEFAULT_HISTORICAL_ELO_REPLAY_CONFIG
): HistoricalEloTeamSnapshot[] {
  validateTargetTeams(targetTeams);
  const resolvedConfig = resolveConfig(config);
  const targetRatings = targetTeams.map((teamInput) => {
    const team = normalizeTeamName(teamInput);
    const eloRating = ratingForTeam(ratings, team, resolvedConfig);
    const weight = 10 ** ((eloRating - resolvedConfig.initialRating) / resolvedConfig.probabilityRatingScale);

    return {
      team,
      eloRating,
      weight
    };
  });
  const totalWeight = targetRatings.reduce((sum, entry) => sum + entry.weight, 0);

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new Error("Elo-derived probability weights must sum to a positive number.");
  }

  return rankHistoricalEloProbabilities(
    targetRatings.map((entry) => ({
      team: entry.team,
      eloRating: entry.eloRating,
      probability: entry.weight / totalWeight
    }))
  );
}

export function rankHistoricalEloProbabilities(
  probabilities: readonly Omit<HistoricalEloTeamSnapshot, "rank">[]
): HistoricalEloTeamSnapshot[] {
  if (probabilities.length === 0) {
    throw new Error("historical Elo probabilities must include at least one team.");
  }

  const seenTeams = new Set<string>();

  for (const probability of probabilities) {
    const team = normalizeTeamName(probability.team);

    if (team.length === 0) {
      throw new Error("historical Elo probability team is required.");
    }

    if (seenTeams.has(team)) {
      throw new Error(`duplicate team in historical Elo probabilities: ${team}`);
    }

    if (!Number.isFinite(probability.eloRating) || probability.eloRating <= 0) {
      throw new Error(`Elo rating for ${team} must be a finite positive number.`);
    }

    if (!Number.isFinite(probability.probability) || probability.probability < 0 || probability.probability > 1) {
      throw new Error("historical Elo probabilities must be between 0 and 1.");
    }

    seenTeams.add(team);
  }

  const probabilitySum = sumProbabilities(probabilities);

  if (Math.abs(probabilitySum - 1) > PROBABILITY_SUM_TOLERANCE) {
    throw new Error("historical Elo probabilities must sum to 1.");
  }

  return [...probabilities]
    .sort((a, b) => b.probability - a.probability || normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team)))
    .map((entry, index) => ({
      team: normalizeTeamName(entry.team),
      eloRating: entry.eloRating,
      probability: entry.probability,
      rank: index + 1
    }));
}

export function generateHistoricalEloSnapshot(input: HistoricalEloReplayInput): GeneratedHistoricalEloSnapshot {
  validateInput(input);
  const config = resolveConfig(input.config);
  const dataCoverage = input.dataCoverage ?? "curated_world_cup_fixtures_only";
  const replay = buildHistoricalEloRatings(input);
  const championProbabilities = normalizeHistoricalEloProbabilities(replay.ratings, input.targetTeams, config);
  const guardrailInput: PreTournamentSnapshotInput = {
    tournamentId: input.tournamentId,
    tournamentName: input.tournamentName,
    tournamentYear: input.tournamentYear,
    tournamentStartDate: input.tournamentStartDate,
    generatedAt: input.generatedAt,
    inputDataCutoff: input.inputDataCutoff,
    teamSeedRatings: input.targetTeams.map((team) => ({ team, rating: config.initialRating }))
  };

  if (input.actualTournamentResultsIncluded !== undefined) {
    guardrailInput.actualTournamentResultsIncluded = input.actualTournamentResultsIncluded;
  }

  const lookAheadGuardrails = evaluateLookAheadGuardrails(guardrailInput);
  const warnings = buildWarnings(input, dataCoverage, replay.matchesUsed, replay.matchesIgnoredAfterCutoff);
  const snapshotMetadata: HistoricalEloReplayMetadata = {
    tournamentYear: input.tournamentYear,
    tournamentStartDate: input.tournamentStartDate,
    inputDataCutoff: input.inputDataCutoff,
    generatedAt: input.generatedAt,
    modelVersion: HISTORICAL_ELO_REPLAY_SNAPSHOT_MODEL_VERSION,
    snapshotType: "historical_elo_replay_snapshot_foundation" as const,
    dataCoverage,
    inputMatchCount: input.historicalMatches.length,
    matchesUsed: replay.matchesUsed.length,
    matchesIgnoredAfterCutoff: replay.matchesIgnoredAfterCutoff.length,
    targetTeamCount: input.targetTeams.length,
    config,
    warnings,
    lookAheadGuardrails
  };

  if (replay.inputDataLatestDate !== undefined) {
    snapshotMetadata.inputDataLatestDate = replay.inputDataLatestDate;
  }

  if (replay.usedMatchLatestDate !== undefined) {
    snapshotMetadata.usedMatchLatestDate = replay.usedMatchLatestDate;
  }

  const snapshot: GeneratedHistoricalEloSnapshot = {
    tournamentId: input.tournamentId,
    tournamentName: input.tournamentName,
    tournamentYear: input.tournamentYear,
    snapshotType: "historical_elo_replay_snapshot_foundation",
    modelVersion: HISTORICAL_ELO_REPLAY_SNAPSHOT_MODEL_VERSION,
    dataCutoff: input.inputDataCutoff,
    teams: championProbabilities.map((entry) => entry.team),
    championProbabilities,
    eloRatings: championProbabilities,
    snapshotMetadata
  };

  if (input.metadata !== undefined) {
    snapshot.metadata = input.metadata;
  }

  return snapshot;
}
