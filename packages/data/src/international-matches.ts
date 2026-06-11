import { deriveResultFromScores, normalizeMatch, normalizeTeamName, parseDateToIsoDate } from "./normalization.js";
import type { MatchResult, MatchResultInput, NormalizedMatch } from "./types.js";
import { VALID_RESULTS } from "./validation.js";

export const INTERNATIONAL_MATCH_DATASET_CREATED_AT = "2026-06-11T00:00:00.000Z";
export const INTERNATIONAL_MATCH_SAMPLE_DATASET_ID = "international-matches-sample-v1";
export const INTERNATIONAL_MATCH_EXPANDED_DATASET_ID = "international-matches-expanded-v1";
export const INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING =
  "This dataset is a small curated sample only. It does not represent complete international match history.";
export const INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING =
  "This fixture file is marked as a sample only and should not be used for production model calibration.";
export const INTERNATIONAL_MATCH_PARTIAL_HISTORY_WARNING =
  "partial_international_history: the fixture file covers selected competitions and dates only.";
export const INTERNATIONAL_MATCH_CURATED_SAMPLE_WARNING =
  "curated_sample_only: matches were manually selected for lightweight validation coverage.";
export const INTERNATIONAL_MATCH_NOT_COMPLETE_GLOBAL_HISTORY_WARNING =
  "not_complete_global_match_history: this is not a complete global senior international match database.";

export type InternationalMatchDatasetWarningCode =
  | "partial_international_history"
  | "curated_sample_only"
  | "not_complete_global_match_history";

export interface InternationalMatchInput {
  match_id?: unknown;
  match_date?: unknown;
  competition?: unknown;
  stage?: unknown;
  home_team?: unknown;
  away_team?: unknown;
  home_score?: unknown;
  away_score?: unknown;
  result?: unknown;
  neutral_site?: unknown;
  source_note?: unknown;
}

export interface InternationalMatchFixtureFile {
  dataset_id?: unknown;
  version?: unknown;
  description?: unknown;
  is_sample_only?: unknown;
  created_at?: unknown;
  matches?: unknown;
}

export interface InternationalMatch {
  match_id: string;
  match_date: string;
  competition: string;
  stage: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: MatchResult;
  neutral_site: boolean;
  source_note: string;
}

export type InternationalMatchValidationErrorCode =
  | "invalid_fixture_file"
  | "missing_required_field"
  | "invalid_date"
  | "invalid_team"
  | "invalid_score"
  | "invalid_result"
  | "invalid_neutral_site"
  | "duplicate_match_id";

export interface InternationalMatchValidationIssue {
  match_id?: string;
  field: keyof InternationalMatchInput | "matches" | "dataset_id";
  code: InternationalMatchValidationErrorCode;
  message: string;
}

export interface InternationalMatchValidationResult {
  valid: boolean;
  issues: InternationalMatchValidationIssue[];
}

export interface InternationalMatchDatasetMetadata {
  datasetId: string;
  description: string;
  matchCount: number;
  competitions: readonly string[];
  earliestMatchDate: string | undefined;
  latestMatchDate: string | undefined;
  isSampleOnly: boolean;
  warningCodes: readonly InternationalMatchDatasetWarningCode[];
  foundationWarnings: readonly string[];
  createdAt: string;
}

export interface InternationalMatchDatasetResult {
  matches: readonly InternationalMatch[];
  metadata: InternationalMatchDatasetMetadata;
}

const REQUIRED_INTERNATIONAL_FIELDS: readonly (keyof InternationalMatchInput)[] = [
  "match_id",
  "match_date",
  "competition",
  "stage",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
  "result",
  "neutral_site",
  "source_note"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMatchResult(value: unknown): value is MatchResult {
  return typeof value === "string" && VALID_RESULTS.includes(value as MatchResult);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function toInternationalMatchInput(value: unknown): InternationalMatchInput {
  return isRecord(value) ? value : {};
}

function matchIssue(
  input: InternationalMatchInput,
  field: InternationalMatchValidationIssue["field"],
  code: InternationalMatchValidationErrorCode,
  message: string
): InternationalMatchValidationIssue {
  const validationIssue: InternationalMatchValidationIssue = { field, code, message };

  if (typeof input.match_id === "string" && input.match_id.trim().length > 0) {
    validationIssue.match_id = input.match_id.trim();
  }

  return validationIssue;
}

function validateInternationalMatch(input: InternationalMatchInput): InternationalMatchValidationIssue[] {
  const issues: InternationalMatchValidationIssue[] = [];

  for (const field of REQUIRED_INTERNATIONAL_FIELDS) {
    const value = input[field];

    if (value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)) {
      issues.push(matchIssue(input, field, "missing_required_field", `${field} is required.`));
    }
  }

  if (input.match_date !== undefined && input.match_date !== null) {
    if (typeof input.match_date !== "string" || Number.isNaN(Date.parse(input.match_date))) {
      issues.push(matchIssue(input, "match_date", "invalid_date", "match_date must be a valid ISO-compatible date string."));
    }
  }

  const homeTeam = typeof input.home_team === "string" ? normalizeTeamName(input.home_team) : "";
  const awayTeam = typeof input.away_team === "string" ? normalizeTeamName(input.away_team) : "";

  if (input.home_team !== undefined && input.home_team !== null && homeTeam.length === 0) {
    issues.push(matchIssue(input, "home_team", "invalid_team", "home_team must be a non-empty team name."));
  }

  if (input.away_team !== undefined && input.away_team !== null && awayTeam.length === 0) {
    issues.push(matchIssue(input, "away_team", "invalid_team", "away_team must be a non-empty team name."));
  }

  if (homeTeam.length > 0 && awayTeam.length > 0 && homeTeam.toLocaleLowerCase() === awayTeam.toLocaleLowerCase()) {
    issues.push(matchIssue(input, "away_team", "invalid_team", "away_team must be different from home_team."));
  }

  for (const field of ["home_score", "away_score"] as const) {
    const value = input[field];

    if (value !== undefined && value !== null && !isNonNegativeInteger(value)) {
      issues.push(matchIssue(input, field, "invalid_score", `${field} must be a non-negative integer.`));
    }
  }

  if (input.result !== undefined && input.result !== null && !isMatchResult(input.result)) {
    issues.push(matchIssue(input, "result", "invalid_result", `result must be one of: ${VALID_RESULTS.join(", ")}.`));
  }

  if (typeof input.home_score === "number" && typeof input.away_score === "number" && isMatchResult(input.result)) {
    const derivedResult = deriveResultFromScores(input.home_score, input.away_score);

    if (input.result !== derivedResult) {
      issues.push(matchIssue(input, "result", "invalid_result", "result must match home_score and away_score."));
    }
  }

  if (input.neutral_site !== undefined && input.neutral_site !== null && typeof input.neutral_site !== "boolean") {
    issues.push(matchIssue(input, "neutral_site", "invalid_neutral_site", "neutral_site must be a boolean."));
  }

  return issues;
}

function parseInternationalMatch(input: InternationalMatchInput): InternationalMatch {
  return {
    match_id: String(input.match_id).trim(),
    match_date: parseDateToIsoDate(String(input.match_date)),
    competition: String(input.competition).trim(),
    stage: String(input.stage).trim(),
    home_team: normalizeTeamName(String(input.home_team)),
    away_team: normalizeTeamName(String(input.away_team)),
    home_score: input.home_score as number,
    away_score: input.away_score as number,
    result: input.result as MatchResult,
    neutral_site: input.neutral_site as boolean,
    source_note: String(input.source_note).trim()
  };
}

function extractFixtureMatches(rawFixtureFile: unknown): unknown[] | null {
  if (Array.isArray(rawFixtureFile)) {
    return rawFixtureFile;
  }

  if (isRecord(rawFixtureFile) && Array.isArray(rawFixtureFile.matches)) {
    return rawFixtureFile.matches;
  }

  return null;
}

function extractFileMetadata(rawFixtureFile: unknown): {
  datasetId: string;
  description: string;
  isSampleOnly: boolean;
  createdAt: string;
} {
  if (!isRecord(rawFixtureFile)) {
    return {
      datasetId: INTERNATIONAL_MATCH_SAMPLE_DATASET_ID,
      description: "",
      isSampleOnly: true,
      createdAt: INTERNATIONAL_MATCH_DATASET_CREATED_AT
    };
  }

  return {
    datasetId: typeof rawFixtureFile.dataset_id === "string" ? rawFixtureFile.dataset_id.trim() : INTERNATIONAL_MATCH_SAMPLE_DATASET_ID,
    description: typeof rawFixtureFile.description === "string" ? rawFixtureFile.description.trim() : "",
    isSampleOnly: rawFixtureFile.is_sample_only !== false,
    createdAt: typeof rawFixtureFile.created_at === "string" ? rawFixtureFile.created_at.trim() : INTERNATIONAL_MATCH_DATASET_CREATED_AT
  };
}

function computeMatchDateBounds(matches: readonly InternationalMatch[]): {
  earliest: string | undefined;
  latest: string | undefined;
} {
  let earliest: string | undefined;
  let latest: string | undefined;

  for (const match of matches) {
    if (earliest === undefined || match.match_date < earliest) {
      earliest = match.match_date;
    }

    if (latest === undefined || match.match_date > latest) {
      latest = match.match_date;
    }
  }

  return { earliest, latest };
}

function collectCompetitions(matches: readonly InternationalMatch[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const match of matches) {
    if (!seen.has(match.competition)) {
      seen.add(match.competition);
      result.push(match.competition);
    }
  }

  return result.sort();
}

export function validateInternationalMatchDataset(rawFixtureFile: unknown): InternationalMatchValidationResult {
  const issues: InternationalMatchValidationIssue[] = [];
  const matches = extractFixtureMatches(rawFixtureFile);

  if (matches === null) {
    return {
      valid: false,
      issues: [
        {
          field: "matches",
          code: "invalid_fixture_file",
          message: "fixture file must be an object with a matches array or an array of matches."
        }
      ]
    };
  }

  const seenMatchIds = new Set<string>();

  for (const rawMatch of matches) {
    const input = toInternationalMatchInput(rawMatch);
    issues.push(...validateInternationalMatch(input));

    if (typeof input.match_id === "string" && input.match_id.trim().length > 0) {
      const matchId = input.match_id.trim();

      if (seenMatchIds.has(matchId)) {
        issues.push(matchIssue(input, "match_id", "duplicate_match_id", `duplicate match_id found: ${matchId}`));
      }

      seenMatchIds.add(matchId);
    }
  }

  return { valid: issues.length === 0, issues };
}

export function loadInternationalMatchDataset(rawFixtureFile: unknown): InternationalMatchDatasetResult {
  const validation = validateInternationalMatchDataset(rawFixtureFile);

  if (!validation.valid) {
    throw new Error(`International match dataset validation failed: ${validation.issues.map((entry) => entry.message).join(" ")}`);
  }

  const rawMatches = extractFixtureMatches(rawFixtureFile);

  if (rawMatches === null) {
    throw new Error("International match dataset validation failed: fixture file must include a matches array.");
  }

  const matches = rawMatches.map((rawMatch) => parseInternationalMatch(toInternationalMatchInput(rawMatch)));
  const { earliest, latest } = computeMatchDateBounds(matches);
  const competitions = collectCompetitions(matches);
  const fileMetadata = extractFileMetadata(rawFixtureFile);

  const warningCodes: InternationalMatchDatasetWarningCode[] = [
    "partial_international_history",
    "not_complete_global_match_history"
  ];
  const foundationWarnings: string[] = [
    INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING,
    INTERNATIONAL_MATCH_PARTIAL_HISTORY_WARNING,
    INTERNATIONAL_MATCH_NOT_COMPLETE_GLOBAL_HISTORY_WARNING
  ];

  if (fileMetadata.isSampleOnly) {
    warningCodes.push("curated_sample_only");
    foundationWarnings.push(INTERNATIONAL_MATCH_CURATED_SAMPLE_WARNING);
    foundationWarnings.push(INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING);
  }

  const metadata: InternationalMatchDatasetMetadata = {
    datasetId: fileMetadata.datasetId,
    description: fileMetadata.description,
    matchCount: matches.length,
    competitions,
    earliestMatchDate: earliest,
    latestMatchDate: latest,
    isSampleOnly: fileMetadata.isSampleOnly,
    warningCodes,
    foundationWarnings,
    createdAt: fileMetadata.createdAt
  };

  return { matches, metadata };
}

export function normalizeInternationalMatch(match: InternationalMatch, createdAt: string): NormalizedMatch {
  const input: MatchResultInput = {
    match_id: match.match_id,
    match_date: match.match_date,
    competition: match.competition,
    home_team: match.home_team,
    away_team: match.away_team,
    neutral_site: match.neutral_site,
    home_score: match.home_score,
    away_score: match.away_score,
    result: match.result,
    data_source: match.source_note,
    created_at: createdAt
  };

  const result = normalizeMatch(input);

  if (result.match === undefined) {
    throw new Error(
      `International match normalization failed for match_id ${match.match_id}: ${result.issues.map((entry) => entry.message).join(" ")}`
    );
  }

  return result.match;
}

export function normalizeInternationalMatches(matches: readonly InternationalMatch[], createdAt: string): NormalizedMatch[] {
  return matches.map((match) => normalizeInternationalMatch(match, createdAt));
}
