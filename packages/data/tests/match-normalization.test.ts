import { describe, expect, it } from "vitest";
import { normalizeMatch, validateMatchInput } from "../src/index.js";
import type { MatchResultInput } from "../src/index.js";

const validInput: MatchResultInput = {
  match_id: "2026-WC-GA-001",
  match_date: "2026-06-11",
  competition: "FIFA World Cup 2026",
  home_team: "Mexico",
  away_team: "Canada",
  neutral_site: true,
  home_score: 2,
  away_score: 1,
  data_source: "fixture",
  created_at: "2026-06-08T14:30:00Z"
};

describe("match data validation and normalization", () => {
  it("accepts valid match input", () => {
    const result = validateMatchInput(validInput);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("reports missing required fields", () => {
    const result = validateMatchInput({
      ...validInput,
      match_id: ""
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "match_id",
      code: "missing_required_field",
      message: "match_id is required."
    });
  });

  it("reports invalid scores", () => {
    const result = validateMatchInput({
      ...validInput,
      home_score: -1
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("invalid_score");
  });

  it("reports invalid dates", () => {
    const result = validateMatchInput({
      ...validInput,
      match_date: "not-a-date"
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("invalid_date");
  });

  it("derives result from score when result is missing", () => {
    const result = normalizeMatch(validInput);

    expect(result.issues).toEqual([]);
    expect(result.match?.result).toBe("home_win");
  });

  it("normalizes team names", () => {
    const result = normalizeMatch({
      ...validInput,
      home_team: "  United   States  ",
      away_team: "  New   Zealand "
    });

    expect(result.match?.home_team).toBe("United States");
    expect(result.match?.away_team).toBe("New Zealand");
  });
});
