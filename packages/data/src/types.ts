export type MatchResult = "home_win" | "draw" | "away_win";

export interface MatchResultInput {
  match_id?: unknown;
  match_date?: unknown;
  competition?: unknown;
  home_team?: unknown;
  away_team?: unknown;
  neutral_site?: unknown;
  home_score?: unknown;
  away_score?: unknown;
  result?: unknown;
  data_source?: unknown;
  created_at?: unknown;
}

export interface NormalizedMatch {
  match_id: string;
  match_date: string;
  competition: string;
  home_team: string;
  away_team: string;
  neutral_site: boolean;
  home_score?: number;
  away_score?: number;
  result?: MatchResult;
  data_source: string;
  created_at: string;
}

export type ValidationErrorCode =
  | "missing_required_field"
  | "invalid_date"
  | "invalid_team"
  | "invalid_score"
  | "invalid_result"
  | "invalid_neutral_site";

export interface ValidationIssue {
  field: keyof MatchResultInput;
  code: ValidationErrorCode;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface NormalizationResult {
  match?: NormalizedMatch;
  issues: ValidationIssue[];
}
