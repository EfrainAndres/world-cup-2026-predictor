import type { MatchResult, MatchResultInput, NormalizationResult, NormalizedMatch } from "./types.js";
import { validateMatchInput } from "./validation.js";

const RESULT_ALIASES: Record<string, MatchResult> = {
  home: "home_win",
  home_win: "home_win",
  h: "home_win",
  draw: "draw",
  d: "draw",
  away: "away_win",
  away_win: "away_win",
  a: "away_win"
};

export function normalizeTeamName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeResultValue(value: unknown): MatchResult | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return RESULT_ALIASES[value.trim().toLocaleLowerCase()];
}

export function parseDateToIsoDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed.toISOString().slice(0, 10);
}

export function parseDateToIsoTimestamp(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return parsed.toISOString();
}

export function deriveResultFromScores(homeScore?: number, awayScore?: number): MatchResult | undefined {
  if (homeScore === undefined || awayScore === undefined) {
    return undefined;
  }

  if (homeScore > awayScore) {
    return "home_win";
  }

  if (homeScore < awayScore) {
    return "away_win";
  }

  return "draw";
}

function optionalScore(value: unknown): number | undefined {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return undefined;
  }

  return typeof value === "string" ? Number(value.trim()) : (value as number);
}

export function normalizeMatch(input: MatchResultInput): NormalizationResult {
  const validation = validateMatchInput(input);

  if (!validation.valid) {
    return {
      issues: validation.issues
    };
  }

  const homeScore = optionalScore(input.home_score);
  const awayScore = optionalScore(input.away_score);
  const explicitResult = normalizeResultValue(input.result);
  const derivedResult = deriveResultFromScores(homeScore, awayScore);

  const match: NormalizedMatch = {
    match_id: String(input.match_id).trim(),
    match_date: parseDateToIsoDate(String(input.match_date)),
    competition: String(input.competition).trim(),
    home_team: normalizeTeamName(String(input.home_team)),
    away_team: normalizeTeamName(String(input.away_team)),
    neutral_site: input.neutral_site as boolean,
    data_source: String(input.data_source).trim(),
    created_at: parseDateToIsoTimestamp(String(input.created_at))
  };

  if (homeScore !== undefined) {
    match.home_score = homeScore;
  }

  if (awayScore !== undefined) {
    match.away_score = awayScore;
  }

  if (explicitResult ?? derivedResult) {
    match.result = explicitResult ?? derivedResult;
  }

  return {
    match,
    issues: []
  };
}
