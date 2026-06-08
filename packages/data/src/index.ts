export type {
  MatchResult,
  MatchResultInput,
  NormalizationResult,
  NormalizedMatch,
  ValidationErrorCode,
  ValidationIssue,
  ValidationResult
} from "./types.js";

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
