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
  HISTORICAL_WORLD_CUP_DATASET_CREATED_AT,
  HISTORICAL_WORLD_CUP_STAGES,
  HISTORICAL_WORLD_CUP_YEARS,
  loadHistoricalWorldCupMatches,
  normalizeHistoricalWorldCupMatch,
  normalizeHistoricalWorldCupMatches,
  validateHistoricalWorldCupFixtureFile
} from "./historical-world-cup.js";
