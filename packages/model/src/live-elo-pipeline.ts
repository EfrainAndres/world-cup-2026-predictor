import { DEFAULT_ELO_CONFIG, getCurrentTeamRatings, processMatches, updateRatingsAfterMatch } from "./elo.js";
import type {
  EloConfig,
  EloMatch,
  EloMatchRatingHistory,
  EloProcessResult,
  LiveEloDataCoverage,
  LiveEloPipelineInput,
  LiveEloPipelineResult,
  LiveEloRankedEntry,
  LiveEloRecencyWeightingBucketConfig,
  LiveEloRecencyWeightingMetadata
} from "./types.js";

export const LIVE_ELO_PIPELINE_VERSION = "live-elo-pipeline-foundation-v1";
export const LIVE_ELO_PIPELINE_FOUNDATION_WARNING =
  "Live Elo ratings are computed from available World Cup fixture data only. They are not calibrated from full international match history.";
export const LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING =
  "Some teams have fewer than 3 matches in the available dataset. Their Elo ratings may be unreliable.";
export const LIVE_ELO_PIPELINE_NO_MATCHES_WARNING =
  "No matches were provided. All teams default to the initial Elo rating.";
export const LIVE_ELO_PIPELINE_RECENCY_WEIGHTING_WARNING =
  "Recency weighting is enabled with fixed uncalibrated buckets. It changes Elo update impact but does not solve partial-history coverage.";

export const LIVE_ELO_RECENCY_WEIGHT_BUCKETS: LiveEloRecencyWeightingBucketConfig = {
  within12Months: 1,
  months12To24: 0.75,
  months24To48: 0.5,
  olderThan48Months: 0.25
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function sortMatchesChronologically(matches: readonly EloMatch[]): EloMatch[] {
  return [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date) || a.match_id.localeCompare(b.match_id));
}

function countMatchesPerTeam(matches: readonly EloMatch[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const match of matches) {
    counts.set(match.home_team, (counts.get(match.home_team) ?? 0) + 1);
    counts.set(match.away_team, (counts.get(match.away_team) ?? 0) + 1);
  }

  return counts;
}

function getLatestMatchDate(matches: readonly EloMatch[]): string | undefined {
  if (matches.length === 0) {
    return undefined;
  }

  let latest: string | undefined;

  for (const match of matches) {
    if (latest === undefined || match.match_date > latest) {
      latest = match.match_date;
    }
  }

  return latest;
}

function parseIsoDate(value: string, field: string): Date {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`${field} must be a valid ISO date in YYYY-MM-DD format.`);
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${field} must be a valid ISO date in YYYY-MM-DD format.`);
  }

  return date;
}

function calculateElapsedCalendarMonths(matchDate: Date, referenceDate: Date): number {
  const yearDiff = referenceDate.getUTCFullYear() - matchDate.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - matchDate.getUTCMonth();
  const dayAdjustment = referenceDate.getUTCDate() < matchDate.getUTCDate() ? -1 : 0;

  return yearDiff * 12 + monthDiff + dayAdjustment;
}

export function calculateLiveEloRecencyWeight(matchDate: string, referenceDate: string): number {
  const parsedMatchDate = parseIsoDate(matchDate, "matchDate");
  const parsedReferenceDate = parseIsoDate(referenceDate, "referenceDate");
  const elapsedMonths = calculateElapsedCalendarMonths(parsedMatchDate, parsedReferenceDate);

  if (elapsedMonths <= 12) {
    return LIVE_ELO_RECENCY_WEIGHT_BUCKETS.within12Months;
  }

  if (elapsedMonths <= 24) {
    return LIVE_ELO_RECENCY_WEIGHT_BUCKETS.months12To24;
  }

  if (elapsedMonths <= 48) {
    return LIVE_ELO_RECENCY_WEIGHT_BUCKETS.months24To48;
  }

  return LIVE_ELO_RECENCY_WEIGHT_BUCKETS.olderThan48Months;
}

function resolveConfig(partial: Partial<EloConfig> | undefined): EloConfig {
  return {
    initialRating: partial?.initialRating ?? DEFAULT_ELO_CONFIG.initialRating,
    kFactor: partial?.kFactor ?? DEFAULT_ELO_CONFIG.kFactor
  };
}

function resolveRecencyWeightingMetadata(input: LiveEloPipelineInput, latestMatchDate: string | undefined): LiveEloRecencyWeightingMetadata {
  const enabled = input.recencyWeighting?.enabled ?? false;
  const referenceDate = input.recencyWeighting?.referenceDate ?? latestMatchDate;

  if (enabled && referenceDate === undefined) {
    throw new Error("referenceDate is required when recency weighting is enabled and no matches are available.");
  }

  if (enabled && referenceDate !== undefined) {
    parseIsoDate(referenceDate, "referenceDate");
  }

  return {
    enabled,
    referenceDate: enabled ? referenceDate : undefined,
    matchesWeighted: enabled ? input.matches.length : 0,
    bucketWeights: LIVE_ELO_RECENCY_WEIGHT_BUCKETS
  };
}

function processMatchesWithRecencyWeighting(
  matches: readonly EloMatch[],
  config: EloConfig,
  referenceDate: string
): EloProcessResult {
  let ratings = new Map<string, number>();
  const matchHistory: EloMatchRatingHistory[] = [];

  for (const match of matches) {
    const weight = calculateLiveEloRecencyWeight(match.match_date, referenceDate);
    const update = updateRatingsAfterMatch(ratings, match, {
      initialRating: config.initialRating,
      kFactor: config.kFactor * weight
    });

    ratings = update.ratings;
    matchHistory.push(update.history);
  }

  return {
    ratings,
    matchHistory
  };
}

export function runLiveEloPipeline(input: LiveEloPipelineInput): LiveEloPipelineResult {
  if (input.pipelineId.trim().length === 0) {
    throw new Error("pipelineId is required.");
  }

  const config = resolveConfig(input.config);
  const sortedMatches = sortMatchesChronologically(input.matches);
  const matchCounts = countMatchesPerTeam(input.matches);
  const dataCoverage: LiveEloDataCoverage = input.dataCoverage ?? "world_cup_fixtures_only";
  const latestMatchDate = getLatestMatchDate(input.matches);
  const recencyWeighting = resolveRecencyWeightingMetadata(input, latestMatchDate);

  const processResult =
    recencyWeighting.enabled && recencyWeighting.referenceDate !== undefined
      ? processMatchesWithRecencyWeighting(sortedMatches, config, recencyWeighting.referenceDate)
      : processMatches(sortedMatches, config);
  const rankedEntries = getCurrentTeamRatings(processResult.ratings);

  const warnings: string[] = [];

  if (dataCoverage !== "complete_international_history") {
    warnings.push(LIVE_ELO_PIPELINE_FOUNDATION_WARNING);
  }

  if (input.matches.length === 0) {
    warnings.push(LIVE_ELO_PIPELINE_NO_MATCHES_WARNING);
  }

  if (recencyWeighting.enabled) {
    warnings.push(LIVE_ELO_PIPELINE_RECENCY_WEIGHTING_WARNING);
  }

  const sparseTeamCount = rankedEntries.filter((e) => (matchCounts.get(e.team) ?? 0) < 3).length;

  if (sparseTeamCount > 0) {
    warnings.push(LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING);
  }

  const rankedRatings: LiveEloRankedEntry[] = rankedEntries.map((entry, index) => ({
    rank: index + 1,
    team: entry.team,
    eloRating: entry.rating,
    matchesPlayed: matchCounts.get(entry.team) ?? 0
  }));

  return {
    pipelineId: input.pipelineId,
    pipelineVersion: LIVE_ELO_PIPELINE_VERSION,
    rankedRatings,
    matchesProcessed: sortedMatches.length,
    teamsRated: rankedRatings.length,
    latestMatchDate,
    dataCoverage,
    recencyWeighting,
    warnings
  };
}
