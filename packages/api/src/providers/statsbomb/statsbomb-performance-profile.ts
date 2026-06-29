import type { TeamPerformanceCoverage, TeamPerformanceFreshness, TeamPerformanceProfile, TeamPerformanceSource } from "./statsbomb-types.js";
import type { MatchEventAggregation } from "./statsbomb-event-aggregation.js";

export const COVERAGE_THRESHOLDS = {
  FULL_MIN_MATCHES: 10,
  FULL_MIN_XG_SAMPLES: 100,
  PARTIAL_MIN_MATCHES: 5,
  PARTIAL_MIN_XG_SAMPLES: 40,
  SPARSE_MIN_MATCHES: 1,
} as const;

export const FRESHNESS_THRESHOLDS_DAYS = {
  FRESH_MAX: 180,
  AGING_MAX: 365,
} as const;

export function classifyFreshness(latestMatchDate: string | null, cutoffAt: string): TeamPerformanceFreshness {
  if (latestMatchDate === null) return "unknown";

  const latestMs = new Date(latestMatchDate).getTime();
  const cutoffMs = new Date(cutoffAt).getTime();
  const diffDays = (cutoffMs - latestMs) / (1000 * 60 * 60 * 24);

  if (diffDays <= FRESHNESS_THRESHOLDS_DAYS.FRESH_MAX) return "fresh";
  if (diffDays <= FRESHNESS_THRESHOLDS_DAYS.AGING_MAX) return "aging";
  return "stale";
}

export function classifyCoverage(
  matchCount: number,
  xgSampleCount: number,
  freshness: TeamPerformanceFreshness
): TeamPerformanceCoverage {
  if (matchCount === 0) return "fallback";
  if (matchCount < COVERAGE_THRESHOLDS.SPARSE_MIN_MATCHES) return "fallback";

  if (
    matchCount >= COVERAGE_THRESHOLDS.FULL_MIN_MATCHES &&
    xgSampleCount >= COVERAGE_THRESHOLDS.FULL_MIN_XG_SAMPLES &&
    (freshness === "fresh" || freshness === "aging")
  ) {
    return "full";
  }

  if (
    matchCount >= COVERAGE_THRESHOLDS.PARTIAL_MIN_MATCHES &&
    xgSampleCount >= COVERAGE_THRESHOLDS.PARTIAL_MIN_XG_SAMPLES
  ) {
    return "partial";
  }

  return "sparse";
}

export function buildFallbackProfile(
  canonicalName: string,
  teamId: string,
  cutoffAt: string
): TeamPerformanceProfile {
  return {
    teamId,
    canonicalName,
    provider: "statsbomb_open_data",
    cutoffAt,
    latestMatchAt: null,
    matchCount: 0,
    minutesPlayed: 0,
    shotCountFor: 0,
    shotCountAgainst: 0,
    xgSampleCountFor: 0,
    xgSampleCountAgainst: 0,
    totalXgFor: null,
    totalXgAgainst: null,
    xgForPer90: null,
    xgAgainstPer90: null,
    goalsFor: null,
    goalsAgainst: null,
    goalsForPer90: null,
    goalsAgainstPer90: null,
    shotQualityFor: null,
    shotQualityAgainst: null,
    uniqueOpponentCount: 0,
    coverage: "fallback",
    freshness: "unknown",
    sources: [],
    warnings: [],
  };
}

function safeDiv(numerator: number | null, denominator: number): number | null {
  if (numerator === null) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  if (!isFinite(result)) return null;
  return result;
}

function safePer90(total: number | null, minutesPlayed: number): number | null {
  if (total === null) return null;
  if (minutesPlayed === 0) return null;
  const result = (total / minutesPlayed) * 90;
  if (!isFinite(result)) return null;
  return result;
}

export function buildProfileFromAggregations(
  canonicalName: string,
  teamId: string,
  aggregations: MatchEventAggregation[],
  sources: TeamPerformanceSource[],
  cutoffAt: string,
  warnings: string[]
): TeamPerformanceProfile {
  if (aggregations.length === 0) {
    return {
      ...buildFallbackProfile(canonicalName, teamId, cutoffAt),
      warnings: [...warnings],
    };
  }

  let totalMinutes = 0;
  let totalShotCountFor = 0;
  let totalShotCountAgainst = 0;
  let totalXgSampleCountFor = 0;
  let totalXgSampleCountAgainst = 0;
  let sumXgFor = 0;
  let sumXgAgainst = 0;
  let sumGoalsFor = 0;
  let sumGoalsAgainst = 0;
  let latestMatchDate: string | null = null;
  const opponentSet = new Set<string>();

  for (const agg of aggregations) {
    totalMinutes += agg.minutesPlayed;
    totalShotCountFor += agg.shotCountFor;
    totalShotCountAgainst += agg.shotCountAgainst;
    totalXgSampleCountFor += agg.xgSampleCountFor;
    totalXgSampleCountAgainst += agg.xgSampleCountAgainst;
    sumXgFor += agg.totalXgFor;
    sumXgAgainst += agg.totalXgAgainst;
    sumGoalsFor += agg.goalsFor;
    sumGoalsAgainst += agg.goalsAgainst;

    if (latestMatchDate === null || agg.matchDate > latestMatchDate) {
      latestMatchDate = agg.matchDate;
    }

    if (agg.opponentCanonicalName !== null) {
      opponentSet.add(agg.opponentCanonicalName);
    }
  }

  const totalXgFor = totalXgSampleCountFor > 0 ? sumXgFor : null;
  const totalXgAgainst = totalXgSampleCountAgainst > 0 ? sumXgAgainst : null;
  const goalsFor = sumGoalsFor;
  const goalsAgainst = sumGoalsAgainst;

  const xgForPer90 = safePer90(totalXgFor, totalMinutes);
  const xgAgainstPer90 = safePer90(totalXgAgainst, totalMinutes);
  const goalsForPer90 = totalMinutes > 0 ? safePer90(goalsFor, totalMinutes) : null;
  const goalsAgainstPer90 = totalMinutes > 0 ? safePer90(goalsAgainst, totalMinutes) : null;
  const shotQualityFor = safeDiv(totalXgFor, totalShotCountFor);
  const shotQualityAgainst = safeDiv(totalXgAgainst, totalShotCountAgainst);

  const freshness = classifyFreshness(latestMatchDate, cutoffAt);
  const totalXgSamples = totalXgSampleCountFor + totalXgSampleCountAgainst;
  const coverage = classifyCoverage(aggregations.length, totalXgSamples, freshness);

  return {
    teamId,
    canonicalName,
    provider: "statsbomb_open_data",
    cutoffAt,
    latestMatchAt: latestMatchDate,
    matchCount: aggregations.length,
    minutesPlayed: totalMinutes,
    shotCountFor: totalShotCountFor,
    shotCountAgainst: totalShotCountAgainst,
    xgSampleCountFor: totalXgSampleCountFor,
    xgSampleCountAgainst: totalXgSampleCountAgainst,
    totalXgFor,
    totalXgAgainst,
    xgForPer90,
    xgAgainstPer90,
    goalsFor,
    goalsAgainst,
    goalsForPer90,
    goalsAgainstPer90,
    shotQualityFor,
    shotQualityAgainst,
    uniqueOpponentCount: opponentSet.size,
    coverage,
    freshness,
    sources,
    warnings: [...warnings],
  };
}
