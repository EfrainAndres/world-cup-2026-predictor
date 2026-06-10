import { deriveResultFromScores, normalizeMatch, normalizeTeamName, parseDateToIsoDate } from "./normalization.js";
import type { MatchResult, MatchResultInput, NormalizedMatch } from "./types.js";
import { VALID_RESULTS } from "./validation.js";

export const HISTORICAL_WORLD_CUP_YEARS = [2018, 2022] as const;
export type HistoricalWorldCupYear = (typeof HISTORICAL_WORLD_CUP_YEARS)[number];

export const HISTORICAL_WORLD_CUP_STAGES = ["group", "round_of_16", "quarter_final", "semi_final", "third_place", "final"] as const;
export type HistoricalWorldCupStage = (typeof HISTORICAL_WORLD_CUP_STAGES)[number];

export const HISTORICAL_WORLD_CUP_DECIDED_BY = ["regular_time", "extra_time", "penalties"] as const;
export type HistoricalWorldCupDecidedBy = (typeof HISTORICAL_WORLD_CUP_DECIDED_BY)[number];

export const HISTORICAL_WORLD_CUP_DATASET_CREATED_AT = "2026-06-09T00:00:00.000Z";

export interface HistoricalWorldCupMatchInput {
  match_id?: unknown;
  tournament_year?: unknown;
  stage?: unknown;
  match_date?: unknown;
  home_team?: unknown;
  away_team?: unknown;
  home_score?: unknown;
  away_score?: unknown;
  result?: unknown;
  winner?: unknown;
  decided_by?: unknown;
  penalty_home_score?: unknown;
  penalty_away_score?: unknown;
  stage_order?: unknown;
  neutral_site?: unknown;
  source_note?: unknown;
}

export interface HistoricalWorldCupFixtureFile {
  dataset_id?: unknown;
  version?: unknown;
  description?: unknown;
  matches?: unknown;
}

export interface HistoricalWorldCupMatch {
  match_id: string;
  tournament_year: HistoricalWorldCupYear;
  stage: HistoricalWorldCupStage;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: MatchResult;
  winner: string;
  decided_by: HistoricalWorldCupDecidedBy;
  penalty_home_score?: number;
  penalty_away_score?: number;
  stage_order: number;
  neutral_site: boolean;
  source_note: string;
}

export type HistoricalWorldCupValidationErrorCode =
  | "invalid_fixture_file"
  | "missing_required_field"
  | "invalid_year"
  | "invalid_stage"
  | "invalid_date"
  | "invalid_team"
  | "invalid_score"
  | "invalid_result"
  | "invalid_winner"
  | "invalid_decided_by"
  | "invalid_stage_order"
  | "invalid_neutral_site"
  | "duplicate_match_id";

export interface HistoricalWorldCupValidationIssue {
  match_id?: string;
  field: keyof HistoricalWorldCupMatchInput | "matches";
  code: HistoricalWorldCupValidationErrorCode;
  message: string;
}

export interface HistoricalWorldCupValidationResult {
  valid: boolean;
  issues: HistoricalWorldCupValidationIssue[];
}

const REQUIRED_HISTORICAL_FIELDS: readonly (keyof HistoricalWorldCupMatchInput)[] = [
  "match_id",
  "tournament_year",
  "stage",
  "match_date",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
  "result",
  "winner",
  "decided_by",
  "stage_order",
  "neutral_site",
  "source_note"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHistoricalWorldCupYear(value: unknown): value is HistoricalWorldCupYear {
  return typeof value === "number" && HISTORICAL_WORLD_CUP_YEARS.includes(value as HistoricalWorldCupYear);
}

function isHistoricalWorldCupStage(value: unknown): value is HistoricalWorldCupStage {
  return typeof value === "string" && HISTORICAL_WORLD_CUP_STAGES.includes(value as HistoricalWorldCupStage);
}

function isMatchResult(value: unknown): value is MatchResult {
  return typeof value === "string" && VALID_RESULTS.includes(value as MatchResult);
}

function isHistoricalWorldCupDecidedBy(value: unknown): value is HistoricalWorldCupDecidedBy {
  return typeof value === "string" && HISTORICAL_WORLD_CUP_DECIDED_BY.includes(value as HistoricalWorldCupDecidedBy);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function issue(
  input: HistoricalWorldCupMatchInput,
  field: HistoricalWorldCupValidationIssue["field"],
  code: HistoricalWorldCupValidationErrorCode,
  message: string
): HistoricalWorldCupValidationIssue {
  const validationIssue: HistoricalWorldCupValidationIssue = {
    field,
    code,
    message
  };

  if (typeof input.match_id === "string" && input.match_id.trim().length > 0) {
    validationIssue.match_id = input.match_id.trim();
  }

  return validationIssue;
}

function toHistoricalWorldCupMatchInput(value: unknown): HistoricalWorldCupMatchInput {
  return isRecord(value) ? value : {};
}

function getRequiredFieldIssues(input: HistoricalWorldCupMatchInput): HistoricalWorldCupValidationIssue[] {
  return REQUIRED_HISTORICAL_FIELDS.flatMap((field) => {
    const value = input[field];

    if (value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)) {
      return [issue(input, field, "missing_required_field", `${field} is required.`)];
    }

    return [];
  });
}

function validateHistoricalWorldCupMatch(input: HistoricalWorldCupMatchInput): HistoricalWorldCupValidationIssue[] {
  const issues = getRequiredFieldIssues(input);

  if (input.tournament_year !== undefined && !isHistoricalWorldCupYear(input.tournament_year)) {
    issues.push(issue(input, "tournament_year", "invalid_year", "tournament_year must be one of: 2018, 2022."));
  }

  if (input.stage !== undefined && !isHistoricalWorldCupStage(input.stage)) {
    issues.push(issue(input, "stage", "invalid_stage", `stage must be one of: ${HISTORICAL_WORLD_CUP_STAGES.join(", ")}.`));
  }

  if (input.match_date !== undefined) {
    if (typeof input.match_date !== "string" || Number.isNaN(Date.parse(input.match_date))) {
      issues.push(issue(input, "match_date", "invalid_date", "match_date must be a valid ISO-compatible date string."));
    }
  }

  const homeTeam = typeof input.home_team === "string" ? normalizeTeamName(input.home_team) : "";
  const awayTeam = typeof input.away_team === "string" ? normalizeTeamName(input.away_team) : "";

  if (input.home_team !== undefined && homeTeam.length === 0) {
    issues.push(issue(input, "home_team", "invalid_team", "home_team must be a non-empty team name."));
  }

  if (input.away_team !== undefined && awayTeam.length === 0) {
    issues.push(issue(input, "away_team", "invalid_team", "away_team must be a non-empty team name."));
  }

  if (homeTeam.length > 0 && awayTeam.length > 0 && homeTeam.toLocaleLowerCase() === awayTeam.toLocaleLowerCase()) {
    issues.push(issue(input, "away_team", "invalid_team", "away_team must be different from home_team."));
  }

  for (const field of ["home_score", "away_score", "penalty_home_score", "penalty_away_score"] as const) {
    const value = input[field];

    if (value !== undefined && !isNonNegativeInteger(value)) {
      issues.push(issue(input, field, "invalid_score", `${field} must be a non-negative integer.`));
    }
  }

  if (input.result !== undefined && !isMatchResult(input.result)) {
    issues.push(issue(input, "result", "invalid_result", `result must be one of: ${VALID_RESULTS.join(", ")}.`));
  }

  if (typeof input.home_score === "number" && typeof input.away_score === "number" && isMatchResult(input.result)) {
    const derivedResult = deriveResultFromScores(input.home_score, input.away_score);

    if (input.result !== derivedResult) {
      issues.push(issue(input, "result", "invalid_result", "result must match home_score and away_score."));
    }
  }

  const winner = typeof input.winner === "string" ? normalizeTeamName(input.winner) : "";

  if (input.winner !== undefined) {
    if (winner.length === 0) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must be a non-empty team name."));
    } else if (winner !== homeTeam && winner !== awayTeam) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must match home_team or away_team."));
    }
  }

  if (input.decided_by !== undefined && !isHistoricalWorldCupDecidedBy(input.decided_by)) {
    issues.push(issue(input, "decided_by", "invalid_decided_by", `decided_by must be one of: ${HISTORICAL_WORLD_CUP_DECIDED_BY.join(", ")}.`));
  }

  if (input.stage_order !== undefined && !isNonNegativeInteger(input.stage_order)) {
    issues.push(issue(input, "stage_order", "invalid_stage_order", "stage_order must be a non-negative integer."));
  }

  if (isMatchResult(input.result) && winner.length > 0) {
    if (input.result === "home_win" && winner !== homeTeam) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must match home_team when result is home_win."));
    }

    if (input.result === "away_win" && winner !== awayTeam) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must match away_team when result is away_win."));
    }
  }

  if (input.decided_by === "penalties") {
    if (!isNonNegativeInteger(input.penalty_home_score) || !isNonNegativeInteger(input.penalty_away_score)) {
      issues.push(issue(input, "decided_by", "invalid_decided_by", "penalty scores are required when decided_by is penalties."));
    } else if (input.penalty_home_score === input.penalty_away_score) {
      issues.push(issue(input, "decided_by", "invalid_decided_by", "penalty scores must produce a winner."));
    } else {
      const penaltyWinner = input.penalty_home_score > input.penalty_away_score ? homeTeam : awayTeam;

      if (winner.length > 0 && winner !== penaltyWinner) {
        issues.push(issue(input, "winner", "invalid_winner", "winner must match the penalty shootout winner."));
      }
    }
  }

  if (input.result === "draw" && input.decided_by !== "penalties" && input.stage !== "group") {
    issues.push(issue(input, "decided_by", "invalid_decided_by", "knockout scoreline draws must be decided by penalties."));
  }

  if (input.neutral_site !== undefined && typeof input.neutral_site !== "boolean") {
    issues.push(issue(input, "neutral_site", "invalid_neutral_site", "neutral_site must be a boolean."));
  }

  if (input.source_note !== undefined && (typeof input.source_note !== "string" || input.source_note.trim().length === 0)) {
    issues.push(issue(input, "source_note", "missing_required_field", "source_note is required."));
  }

  return issues;
}

function parseHistoricalWorldCupMatch(input: HistoricalWorldCupMatchInput): HistoricalWorldCupMatch {
  const match: HistoricalWorldCupMatch = {
    match_id: String(input.match_id).trim(),
    tournament_year: input.tournament_year as HistoricalWorldCupYear,
    stage: input.stage as HistoricalWorldCupStage,
    match_date: parseDateToIsoDate(String(input.match_date)),
    home_team: normalizeTeamName(String(input.home_team)),
    away_team: normalizeTeamName(String(input.away_team)),
    home_score: input.home_score as number,
    away_score: input.away_score as number,
    result: input.result as MatchResult,
    winner: normalizeTeamName(String(input.winner)),
    decided_by: input.decided_by as HistoricalWorldCupDecidedBy,
    stage_order: input.stage_order as number,
    neutral_site: input.neutral_site as boolean,
    source_note: String(input.source_note).trim()
  };

  if (input.penalty_home_score !== undefined) {
    match.penalty_home_score = input.penalty_home_score as number;
  }

  if (input.penalty_away_score !== undefined) {
    match.penalty_away_score = input.penalty_away_score as number;
  }

  return match;
}

export function validateHistoricalWorldCupFixtureFile(rawFixtureFile: unknown): HistoricalWorldCupValidationResult {
  const issues: HistoricalWorldCupValidationIssue[] = [];

  if (!isRecord(rawFixtureFile)) {
    return {
      valid: false,
      issues: [
        {
          field: "matches",
          code: "invalid_fixture_file",
          message: "fixture file must be an object with a matches array."
        }
      ]
    };
  }

  if (!Array.isArray(rawFixtureFile.matches)) {
    return {
      valid: false,
      issues: [
        {
          field: "matches",
          code: "invalid_fixture_file",
          message: "fixture file must include a matches array."
        }
      ]
    };
  }

  const seenMatchIds = new Set<string>();

  for (const rawMatch of rawFixtureFile.matches) {
    const input = toHistoricalWorldCupMatchInput(rawMatch);
    issues.push(...validateHistoricalWorldCupMatch(input));

    if (typeof input.match_id === "string" && input.match_id.trim().length > 0) {
      const matchId = input.match_id.trim();

      if (seenMatchIds.has(matchId)) {
        issues.push(issue(input, "match_id", "duplicate_match_id", `duplicate match_id found: ${matchId}`));
      }

      seenMatchIds.add(matchId);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function loadHistoricalWorldCupMatches(rawFixtureFile: unknown): HistoricalWorldCupMatch[] {
  const validation = validateHistoricalWorldCupFixtureFile(rawFixtureFile);

  if (!validation.valid) {
    throw new Error(`Historical World Cup fixture validation failed: ${validation.issues.map((entry) => entry.message).join(" ")}`);
  }

  const fixtureFile = rawFixtureFile as { matches: unknown[] };

  return fixtureFile.matches.map((rawMatch) => parseHistoricalWorldCupMatch(toHistoricalWorldCupMatchInput(rawMatch)));
}

export function normalizeHistoricalWorldCupMatch(match: HistoricalWorldCupMatch): NormalizedMatch {
  const input: MatchResultInput = {
    match_id: match.match_id,
    match_date: match.match_date,
    competition: `FIFA World Cup ${match.tournament_year}`,
    home_team: match.home_team,
    away_team: match.away_team,
    neutral_site: match.neutral_site,
    home_score: match.home_score,
    away_score: match.away_score,
    result: match.result,
    data_source: match.source_note,
    created_at: HISTORICAL_WORLD_CUP_DATASET_CREATED_AT
  };
  const result = normalizeMatch(input);

  if (result.match === undefined) {
    throw new Error(`Historical World Cup match normalization failed: ${result.issues.map((entry) => entry.message).join(" ")}`);
  }

  return result.match;
}

export function normalizeHistoricalWorldCupMatches(matches: readonly HistoricalWorldCupMatch[]): NormalizedMatch[] {
  return matches.map((match) => normalizeHistoricalWorldCupMatch(match));
}
