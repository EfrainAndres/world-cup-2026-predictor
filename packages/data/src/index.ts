export type {
  MatchResult,
  MatchResultInput,
  NormalizationResult,
  NormalizedMatch,
  ValidationErrorCode,
  ValidationIssue,
  ValidationResult
} from "./types.js";

export type {
  HistoricalWorldCupFixtureFile,
  HistoricalWorldCupDecidedBy,
  HistoricalWorldCupMatch,
  HistoricalWorldCupMatchInput,
  HistoricalWorldCupStage,
  HistoricalWorldCupValidationErrorCode,
  HistoricalWorldCupValidationIssue,
  HistoricalWorldCupValidationResult,
  HistoricalWorldCupYear
} from "./historical-world-cup.js";

export {
  VALID_RESULTS,
  validateDateField,
  validateMatchInput,
  validateNeutralSite,
  validateRequiredFields,
  validateResult,
  validateScores,
  validateTeams
} from "./validation.js";

export {
  deriveResultFromScores,
  normalizeMatch,
  normalizeResultValue,
  normalizeTeamName,
  parseDateToIsoDate,
  parseDateToIsoTimestamp
} from "./normalization.js";

export {
  EXPECTED_HISTORICAL_WORLD_CUP_MATCHES_PER_TOURNAMENT,
  EXPECTED_HISTORICAL_WORLD_CUP_TOTAL_MATCHES,
  HISTORICAL_WORLD_CUP_DATASET_CREATED_AT,
  HISTORICAL_WORLD_CUP_DECIDED_BY,
  HISTORICAL_WORLD_CUP_STAGES,
  HISTORICAL_WORLD_CUP_YEARS,
  loadHistoricalWorldCupDataset,
  loadHistoricalWorldCupMatches,
  normalizeHistoricalWorldCupMatch,
  normalizeHistoricalWorldCupMatches,
  validateHistoricalWorldCupDataset,
  validateHistoricalWorldCupFixtureFile
} from "./historical-world-cup.js";
