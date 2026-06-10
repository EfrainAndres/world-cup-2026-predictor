import { deriveResultFromScores, normalizeMatch, normalizeTeamName, parseDateToIsoDate } from "./normalization.js";
import type { MatchResult, MatchResultInput, NormalizedMatch } from "./types.js";
import { VALID_RESULTS } from "./validation.js";

export const HISTORICAL_WORLD_CUP_YEARS = [2010, 2014, 2018, 2022] as const;
export type HistoricalWorldCupYear = (typeof HISTORICAL_WORLD_CUP_YEARS)[number];

export const HISTORICAL_WORLD_CUP_STAGES = ["group_stage", "round_of_16", "quarter_final", "semi_final", "third_place", "final"] as const;
export type HistoricalWorldCupStage = (typeof HISTORICAL_WORLD_CUP_STAGES)[number];

export const HISTORICAL_WORLD_CUP_DECIDED_BY = ["regular_time", "extra_time", "penalties", "draw"] as const;
export type HistoricalWorldCupDecidedBy = (typeof HISTORICAL_WORLD_CUP_DECIDED_BY)[number];

export const HISTORICAL_WORLD_CUP_DATASET_CREATED_AT = "2026-06-10T00:00:00.000Z";
export const EXPECTED_HISTORICAL_WORLD_CUP_MATCHES_PER_TOURNAMENT = 64;
export const EXPECTED_HISTORICAL_WORLD_CUP_TOTAL_MATCHES = 256;

const HISTORICAL_WORLD_CUP_STAGE_ORDER: Record<HistoricalWorldCupStage, number> = {
  group_stage: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  third_place: 5,
  final: 6
};

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
  winner: string | null;
  decided_by: HistoricalWorldCupDecidedBy;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
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
  | "duplicate_match_id"
  | "invalid_match_count";

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
  "penalty_home_score",
  "penalty_away_score",
  "stage_order",
  "neutral_site",
  "source_note"
];

const NULLABLE_REQUIRED_FIELDS = new Set<keyof HistoricalWorldCupMatchInput>(["winner", "penalty_home_score", "penalty_away_score"]);

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

    if (value === undefined || (!NULLABLE_REQUIRED_FIELDS.has(field) && value === null) || (typeof value === "string" && value.trim().length === 0)) {
      return [issue(input, field, "missing_required_field", `${field} is required.`)];
    }

    return [];
  });
}

function validateHistoricalWorldCupMatch(input: HistoricalWorldCupMatchInput): HistoricalWorldCupValidationIssue[] {
  const issues = getRequiredFieldIssues(input);

  if (input.tournament_year !== undefined && !isHistoricalWorldCupYear(input.tournament_year)) {
    issues.push(issue(input, "tournament_year", "invalid_year", `tournament_year must be one of: ${HISTORICAL_WORLD_CUP_YEARS.join(", ")}.`));
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

    if (value !== undefined && value !== null && !isNonNegativeInteger(value)) {
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

  const winner = typeof input.winner === "string" ? normalizeTeamName(input.winner) : null;

  if (input.winner !== undefined) {
    if (input.winner !== null && typeof input.winner !== "string") {
      issues.push(issue(input, "winner", "invalid_winner", "winner must be a team name or null."));
    } else if (typeof winner === "string" && winner.length === 0) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must be a non-empty team name."));
    } else if (typeof winner === "string" && winner !== homeTeam && winner !== awayTeam) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must match home_team or away_team."));
    }
  }

  if (input.decided_by !== undefined && !isHistoricalWorldCupDecidedBy(input.decided_by)) {
    issues.push(issue(input, "decided_by", "invalid_decided_by", `decided_by must be one of: ${HISTORICAL_WORLD_CUP_DECIDED_BY.join(", ")}.`));
  }

  if (input.stage_order !== undefined && !isNonNegativeInteger(input.stage_order)) {
    issues.push(issue(input, "stage_order", "invalid_stage_order", "stage_order must be a non-negative integer."));
  }

  if (isHistoricalWorldCupStage(input.stage) && typeof input.stage_order === "number") {
    const expectedStageOrder = HISTORICAL_WORLD_CUP_STAGE_ORDER[input.stage];

    if (input.stage_order !== expectedStageOrder) {
      issues.push(issue(input, "stage_order", "invalid_stage_order", `stage_order for ${input.stage} must be ${expectedStageOrder}.`));
    }
  }

  if (isMatchResult(input.result) && typeof winner === "string") {
    if (input.result === "home_win" && winner !== homeTeam) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must match home_team when result is home_win."));
    }

    if (input.result === "away_win" && winner !== awayTeam) {
      issues.push(issue(input, "winner", "invalid_winner", "winner must match away_team when result is away_win."));
    }
  }

  if (input.result !== "draw" && winner === null) {
    issues.push(issue(input, "winner", "invalid_winner", "winner is required when result is not draw."));
  }

  if (input.stage === "group_stage" && input.result === "draw" && winner !== null) {
    issues.push(issue(input, "winner", "invalid_winner", "group-stage draws must not have a winner."));
  }

  if (input.stage !== "group_stage" && input.result === "draw" && winner === null) {
    issues.push(issue(input, "winner", "invalid_winner", "knockout draws must have a winner."));
  }

  if (input.decided_by === "penalties") {
    if (!isNonNegativeInteger(input.penalty_home_score) || !isNonNegativeInteger(input.penalty_away_score)) {
      issues.push(issue(input, "decided_by", "invalid_decided_by", "penalty scores are required when decided_by is penalties."));
    } else if (input.penalty_home_score === input.penalty_away_score) {
      issues.push(issue(input, "decided_by", "invalid_decided_by", "penalty scores must produce a winner."));
    } else {
      const penaltyWinner = input.penalty_home_score > input.penalty_away_score ? homeTeam : awayTeam;

      if (typeof winner === "string" && winner !== penaltyWinner) {
        issues.push(issue(input, "winner", "invalid_winner", "winner must match the penalty shootout winner."));
      }
    }
  }

  if (input.decided_by !== "penalties") {
    if (input.penalty_home_score !== null && input.penalty_home_score !== undefined) {
      issues.push(issue(input, "penalty_home_score", "invalid_score", "penalty_home_score must be null unless decided_by is penalties."));
    }

    if (input.penalty_away_score !== null && input.penalty_away_score !== undefined) {
      issues.push(issue(input, "penalty_away_score", "invalid_score", "penalty_away_score must be null unless decided_by is penalties."));
    }
  }

  if (input.result === "draw" && input.decided_by !== "penalties" && input.stage !== "group_stage") {
    issues.push(issue(input, "decided_by", "invalid_decided_by", "knockout scoreline draws must be decided by penalties."));
  }

  if (input.stage === "group_stage" && input.result === "draw" && input.decided_by !== "draw") {
    issues.push(issue(input, "decided_by", "invalid_decided_by", "group-stage draws must use decided_by draw."));
  }

  if (input.result !== "draw" && input.decided_by === "draw") {
    issues.push(issue(input, "decided_by", "invalid_decided_by", "decided_by draw is only valid for drawn group-stage scorelines."));
  }

  if (input.result !== "draw" && input.decided_by === "penalties") {
    issues.push(issue(input, "decided_by", "invalid_decided_by", "penalties are only valid when the listed scoreline is a draw."));
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
    winner: input.winner === null ? null : normalizeTeamName(String(input.winner)),
    decided_by: input.decided_by as HistoricalWorldCupDecidedBy,
    penalty_home_score: input.penalty_home_score === null ? null : (input.penalty_home_score as number),
    penalty_away_score: input.penalty_away_score === null ? null : (input.penalty_away_score as number),
    stage_order: input.stage_order as number,
    neutral_site: input.neutral_site as boolean,
    source_note: String(input.source_note).trim()
  };

  return match;
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

export function validateHistoricalWorldCupFixtureFile(rawFixtureFile: unknown): HistoricalWorldCupValidationResult {
  const issues: HistoricalWorldCupValidationIssue[] = [];
  const matches = extractFixtureMatches(rawFixtureFile);

  if (matches === null) {
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

  const seenMatchIds = new Set<string>();
  const yearsInFile = new Set<HistoricalWorldCupYear>();

  if (matches.length !== EXPECTED_HISTORICAL_WORLD_CUP_MATCHES_PER_TOURNAMENT) {
    issues.push({
      field: "matches",
      code: "invalid_match_count",
      message: `fixture file must contain ${EXPECTED_HISTORICAL_WORLD_CUP_MATCHES_PER_TOURNAMENT} matches.`
    });
  }

  for (const rawMatch of matches) {
    const input = toHistoricalWorldCupMatchInput(rawMatch);
    issues.push(...validateHistoricalWorldCupMatch(input));

    if (typeof input.match_id === "string" && input.match_id.trim().length > 0) {
      const matchId = input.match_id.trim();

      if (seenMatchIds.has(matchId)) {
        issues.push(issue(input, "match_id", "duplicate_match_id", `duplicate match_id found: ${matchId}`));
      }

      seenMatchIds.add(matchId);
    }

    if (isHistoricalWorldCupYear(input.tournament_year)) {
      yearsInFile.add(input.tournament_year);
    }
  }

  if (yearsInFile.size > 1) {
    issues.push({
      field: "matches",
      code: "invalid_year",
      message: "fixture file must contain matches from exactly one tournament year."
    });
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

  const matches = extractFixtureMatches(rawFixtureFile);

  if (matches === null) {
    throw new Error("Historical World Cup fixture validation failed: fixture file must include a matches array.");
  }

  return matches.map((rawMatch) => parseHistoricalWorldCupMatch(toHistoricalWorldCupMatchInput(rawMatch)));
}

export function validateHistoricalWorldCupDataset(rawFixtureFiles: readonly unknown[]): HistoricalWorldCupValidationResult {
  const issues: HistoricalWorldCupValidationIssue[] = [];
  const allMatchIds = new Set<string>();
  let totalMatches = 0;

  for (const rawFixtureFile of rawFixtureFiles) {
    const validation = validateHistoricalWorldCupFixtureFile(rawFixtureFile);
    issues.push(...validation.issues);

    const matches = extractFixtureMatches(rawFixtureFile);
    if (matches === null) continue;

    totalMatches += matches.length;

    for (const rawMatch of matches) {
      const input = toHistoricalWorldCupMatchInput(rawMatch);

      if (typeof input.match_id !== "string" || input.match_id.trim().length === 0) continue;

      const matchId = input.match_id.trim();

      if (allMatchIds.has(matchId)) {
        issues.push(issue(input, "match_id", "duplicate_match_id", `duplicate match_id found across dataset: ${matchId}`));
      }

      allMatchIds.add(matchId);
    }
  }

  if (totalMatches !== EXPECTED_HISTORICAL_WORLD_CUP_TOTAL_MATCHES) {
    issues.push({
      field: "matches",
      code: "invalid_match_count",
      message: `historical World Cup dataset must contain ${EXPECTED_HISTORICAL_WORLD_CUP_TOTAL_MATCHES} matches.`
    });
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function loadHistoricalWorldCupDataset(rawFixtureFiles: readonly unknown[]): HistoricalWorldCupMatch[] {
  const validation = validateHistoricalWorldCupDataset(rawFixtureFiles);

  if (!validation.valid) {
    throw new Error(`Historical World Cup dataset validation failed: ${validation.issues.map((entry) => entry.message).join(" ")}`);
  }

  return rawFixtureFiles.flatMap((rawFixtureFile) => {
    const matches = extractFixtureMatches(rawFixtureFile);

    return matches === null ? [] : matches.map((rawMatch) => parseHistoricalWorldCupMatch(toHistoricalWorldCupMatchInput(rawMatch)));
  });
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
