import { DEFAULT_ELO_CONFIG, getCurrentTeamRatings, processMatches, updateRatingsAfterMatch } from "./elo.js";
import type {
  EloConfig,
  EloMatch,
  EloMatchRatingHistory,
  EloProcessResult,
  LiveEloCompetitionWeightCategory,
  LiveEloCompetitionWeightMap,
  LiveEloCompetitionWeightingMetadata,
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
export const LIVE_ELO_PIPELINE_COMPETITION_WEIGHTING_WARNING =
  "Competition weighting is enabled with fixed uncalibrated buckets. It changes Elo update impact but does not prove predictive accuracy.";
export const LIVE_ELO_PIPELINE_MISSING_COMPETITION_METADATA_WARNING =
  "Some matches are missing explicit competition metadata. Competition weighting used source inference or the unknown fallback for those matches.";
export const LIVE_ELO_PIPELINE_UNKNOWN_COMPETITION_WARNING =
  "Some matches have unknown competition metadata. Competition weighting used the unknown fallback weight for those matches.";

export const LIVE_ELO_RECENCY_WEIGHT_BUCKETS: LiveEloRecencyWeightingBucketConfig = {
  within12Months: 1,
  months12To24: 0.75,
  months24To48: 0.5,
  olderThan48Months: 0.25
};

export const LIVE_ELO_COMPETITION_WEIGHT_BUCKETS: LiveEloCompetitionWeightMap = {
  fifa_world_cup: 4,
  continental_championship: 3,
  world_cup_qualifier: 2,
  nations_league: 1.5,
  international_friendly: 1,
  unknown: 1
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LIVE_ELO_COMPETITION_WEIGHT_CATEGORIES: readonly LiveEloCompetitionWeightCategory[] = [
  "fifa_world_cup",
  "continental_championship",
  "world_cup_qualifier",
  "nations_league",
  "international_friendly",
  "unknown"
];

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

function normalizeCompetitionText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function inferCompetitionFromMatchId(matchId: string): string | undefined {
  if (/\bWCQ\d*/i.test(matchId) || /-WCQ\d*-/i.test(matchId)) {
    return "world cup qualifier";
  }

  if (/\bWC\d*\b/i.test(matchId) || /-WC-\d+/i.test(matchId) || /-WC\d+-/i.test(matchId)) {
    return "fifa world cup";
  }

  if (/COPA/i.test(matchId) || /EURO/i.test(matchId)) {
    return "continental championship";
  }

  if (/NL/i.test(matchId)) {
    return "nations league";
  }

  if (/FRI/i.test(matchId)) {
    return "international friendly";
  }

  return undefined;
}

function getCompetitionDescriptor(match: EloMatch): string | undefined {
  if (match.competition !== undefined && match.competition.trim().length > 0) {
    return match.competition;
  }

  if (match.source !== undefined && match.source.trim().length > 0) {
    return match.source;
  }

  return inferCompetitionFromMatchId(match.match_id);
}

function resolveCompetitionWeightMap(partial: Partial<LiveEloCompetitionWeightMap> | undefined): LiveEloCompetitionWeightMap {
  const weights = { ...LIVE_ELO_COMPETITION_WEIGHT_BUCKETS };

  for (const category of LIVE_ELO_COMPETITION_WEIGHT_CATEGORIES) {
    weights[category] = partial?.[category] ?? LIVE_ELO_COMPETITION_WEIGHT_BUCKETS[category];
    const weight = weights[category];

    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`competitionWeighting.weights.${category} must be a finite number greater than 0.`);
    }
  }

  return weights;
}

export function classifyLiveEloCompetition(match: EloMatch): LiveEloCompetitionWeightCategory {
  const descriptor = getCompetitionDescriptor(match);

  if (descriptor === undefined) {
    return "unknown";
  }

  const normalized = normalizeCompetitionText(descriptor);

  if (normalized.includes("qualifier") || normalized.includes("qualification") || normalized.includes("world cup qualifying")) {
    return "world_cup_qualifier";
  }

  if (normalized.includes("fifa world cup") || normalized === "world cup") {
    return "fifa_world_cup";
  }

  if (
    normalized.includes("copa america") ||
    normalized.includes("uefa euro") ||
    normalized.includes("european championship") ||
    normalized.includes("afcon") ||
    normalized.includes("africa cup") ||
    normalized.includes("asian cup") ||
    normalized.includes("gold cup") ||
    normalized.includes("continental championship")
  ) {
    return "continental_championship";
  }

  if (normalized.includes("nations league")) {
    return "nations_league";
  }

  if (normalized.includes("friendly")) {
    return "international_friendly";
  }

  return "unknown";
}

export function calculateLiveEloCompetitionWeight(
  match: EloMatch,
  weights: Partial<LiveEloCompetitionWeightMap> = {}
): number {
  const resolvedWeights = resolveCompetitionWeightMap(weights);
  const category = classifyLiveEloCompetition(match);

  return resolvedWeights[category];
}

function resolveConfig(partial: Partial<EloConfig> | undefined): EloConfig {
  return {
    initialRating: partial?.initialRating ?? DEFAULT_ELO_CONFIG.initialRating,
    kFactor: partial?.kFactor ?? DEFAULT_ELO_CONFIG.kFactor
  };
}

function resolveCompetitionWeightingMetadata(input: LiveEloPipelineInput): LiveEloCompetitionWeightingMetadata {
  const enabled = input.competitionWeighting?.enabled ?? false;
  const weights = resolveCompetitionWeightMap(input.competitionWeighting?.weights);
  let missingCompetitionMetadataCount = 0;
  let unknownCompetitionCount = 0;

  if (enabled) {
    for (const match of input.matches) {
      const hasExplicitCompetition =
        (match.competition !== undefined && match.competition.trim().length > 0) ||
        (match.source !== undefined && match.source.trim().length > 0);

      if (!hasExplicitCompetition) {
        missingCompetitionMetadataCount += 1;
      }

      if (classifyLiveEloCompetition(match) === "unknown") {
        unknownCompetitionCount += 1;
      }
    }
  }

  return {
    enabled,
    matchesWeighted: enabled ? input.matches.length : 0,
    weights,
    missingCompetitionMetadataCount,
    unknownCompetitionCount
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

function processMatchesWithWeighting(
  matches: readonly EloMatch[],
  config: EloConfig,
  recencyWeighting: LiveEloRecencyWeightingMetadata,
  competitionWeighting: LiveEloCompetitionWeightingMetadata
): EloProcessResult {
  let ratings = new Map<string, number>();
  const matchHistory: EloMatchRatingHistory[] = [];

  for (const match of matches) {
    const recencyWeight =
      recencyWeighting.enabled && recencyWeighting.referenceDate !== undefined
        ? calculateLiveEloRecencyWeight(match.match_date, recencyWeighting.referenceDate)
        : 1;
    const competitionWeight = competitionWeighting.enabled ? calculateLiveEloCompetitionWeight(match, competitionWeighting.weights) : 1;
    const weight = recencyWeight * competitionWeight;
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
  const competitionWeighting = resolveCompetitionWeightingMetadata(input);

  const processResult =
    recencyWeighting.enabled || competitionWeighting.enabled
      ? processMatchesWithWeighting(sortedMatches, config, recencyWeighting, competitionWeighting)
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

  if (competitionWeighting.enabled) {
    warnings.push(LIVE_ELO_PIPELINE_COMPETITION_WEIGHTING_WARNING);
  }

  if (competitionWeighting.enabled && competitionWeighting.missingCompetitionMetadataCount > 0) {
    warnings.push(LIVE_ELO_PIPELINE_MISSING_COMPETITION_METADATA_WARNING);
  }

  if (competitionWeighting.enabled && competitionWeighting.unknownCompetitionCount > 0) {
    warnings.push(LIVE_ELO_PIPELINE_UNKNOWN_COMPETITION_WARNING);
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
    competitionWeighting,
    warnings
  };
}
