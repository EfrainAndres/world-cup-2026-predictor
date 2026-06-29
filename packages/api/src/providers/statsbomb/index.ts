export type {
  TeamPerformanceCoverage,
  TeamPerformanceFreshness,
  TeamPerformanceSource,
  TeamPerformanceProfile,
  TeamPerformanceProfileIssue,
  TeamPerformanceProfileResult,
  TeamPerformanceDataProvider,
  StatsBombMatchRecord,
  StatsBombShotData,
  StatsBombEventRecord,
  StatsBombSupportedCompetition,
} from "./statsbomb-types.js";

export {
  STATSBOMB_SUPPORTED_COMPETITIONS,
  resolveStatsBombTeamName,
  teamNameToId,
} from "./statsbomb-team-mapping.js";

export { parseMatchRecords, parseEventRecords } from "./statsbomb-normalization.js";

export type { MatchEventAggregation } from "./statsbomb-event-aggregation.js";
export { aggregateMatchForTeam } from "./statsbomb-event-aggregation.js";

export {
  COVERAGE_THRESHOLDS,
  FRESHNESS_THRESHOLDS_DAYS,
  classifyFreshness,
  classifyCoverage,
  buildFallbackProfile,
  buildProfileFromAggregations,
} from "./statsbomb-performance-profile.js";
