import type { MatchResult, MatchResultInput, ValidationIssue, ValidationResult } from "./types.js";

export const VALID_RESULTS: readonly MatchResult[] = ["home_win", "draw", "away_win"];
const ACCEPTED_RESULT_INPUTS = new Set(["home", "home_win", "h", "draw", "d", "away", "away_win", "a"]);

const REQUIRED_FIELDS: readonly (keyof MatchResultInput)[] = [
  "match_id",
  "match_date",
  "competition",
  "home_team",
  "away_team",
  "neutral_site",
  "data_source",
  "created_at"
];

export function validateRequiredFields(input: MatchResultInput): ValidationIssue[] {
  return REQUIRED_FIELDS.flatMap((field) => {
    const value = input[field];

    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      return [
        {
          field,
          code: "missing_required_field",
          message: `${field} is required.`
        }
      ];
    }

    return [];
  });
}

export function validateDateField(input: MatchResultInput, field: "match_date" | "created_at"): ValidationIssue[] {
  const value = input[field];

  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return [
      {
        field,
        code: "invalid_date",
        message: `${field} must be a valid ISO-compatible date string.`
      }
    ];
  }

  return [];
}

export function validateTeams(input: MatchResultInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const homeTeam = typeof input.home_team === "string" ? input.home_team.trim() : "";
  const awayTeam = typeof input.away_team === "string" ? input.away_team.trim() : "";

  if (input.home_team !== undefined && homeTeam.length === 0) {
    issues.push({
      field: "home_team",
      code: "invalid_team",
      message: "home_team must be a non-empty team name."
    });
  }

  if (input.away_team !== undefined && awayTeam.length === 0) {
    issues.push({
      field: "away_team",
      code: "invalid_team",
      message: "away_team must be a non-empty team name."
    });
  }

  if (homeTeam.length > 0 && awayTeam.length > 0 && homeTeam.toLocaleLowerCase() === awayTeam.toLocaleLowerCase()) {
    issues.push({
      field: "away_team",
      code: "invalid_team",
      message: "away_team must be different from home_team."
    });
  }

  return issues;
}

export function validateScores(input: MatchResultInput): ValidationIssue[] {
  return (["home_score", "away_score"] as const).flatMap((field) => {
    const value = input[field];

    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      return [];
    }

    const parsedValue = typeof value === "string" ? Number(value.trim()) : value;

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      return [
        {
          field,
          code: "invalid_score",
          message: `${field} must be a non-negative integer when present.`
        }
      ];
    }

    return [];
  });
}

export function validateResult(input: MatchResultInput): ValidationIssue[] {
  const value = input.result;

  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (typeof value !== "string" || !ACCEPTED_RESULT_INPUTS.has(value.trim().toLocaleLowerCase())) {
    return [
      {
        field: "result",
        code: "invalid_result",
        message: `result must be one of: ${VALID_RESULTS.join(", ")}.`
      }
    ];
  }

  return [];
}

export function validateNeutralSite(input: MatchResultInput): ValidationIssue[] {
  if (input.neutral_site === undefined || input.neutral_site === null) {
    return [];
  }

  if (typeof input.neutral_site !== "boolean") {
    return [
      {
        field: "neutral_site",
        code: "invalid_neutral_site",
        message: "neutral_site must be a boolean."
      }
    ];
  }

  return [];
}

export function validateMatchInput(input: MatchResultInput): ValidationResult {
  const issues = [
    ...validateRequiredFields(input),
    ...validateDateField(input, "match_date"),
    ...validateDateField(input, "created_at"),
    ...validateTeams(input),
    ...validateScores(input),
    ...validateResult(input),
    ...validateNeutralSite(input)
  ];

  return {
    valid: issues.length === 0,
    issues
  };
}
