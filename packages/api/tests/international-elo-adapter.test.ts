import { describe, expect, it } from "vitest";
import {
  LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING,
  mergeEloMatchSources,
  toEloMatch
} from "../src/international-elo-adapter.js";
import type { EloCompatibleMatch } from "../src/international-elo-adapter.js";
import type { EloMatch } from "../../model/src/index.js";

const baseMatch: EloCompatibleMatch = {
  match_id: "TEST-001",
  match_date: "2024-01-15",
  home_team: "Germany",
  away_team: "France",
  neutral_site: false,
  home_score: 2,
  away_score: 1,
  result: "home_win"
};

const baseEloMatch: EloMatch = {
  match_id: "ELO-001",
  match_date: "2022-12-18",
  home_team: "Argentina",
  away_team: "France",
  neutral_site: true,
  result: "draw"
};

describe("toEloMatch", () => {
  it("maps all required fields correctly", () => {
    const result = toEloMatch(baseMatch);

    expect(result.match_id).toBe("TEST-001");
    expect(result.match_date).toBe("2024-01-15");
    expect(result.home_team).toBe("Germany");
    expect(result.away_team).toBe("France");
    expect(result.neutral_site).toBe(false);
  });

  it("maps optional score and result fields when present", () => {
    const result = toEloMatch(baseMatch);

    expect(result.home_score).toBe(2);
    expect(result.away_score).toBe(1);
    expect(result.result).toBe("home_win");
  });

  it("omits home_score when not present", () => {
    const { home_score: _hs, ...rest } = baseMatch;
    const match: EloCompatibleMatch = rest;
    const result = toEloMatch(match);

    expect("home_score" in result).toBe(false);
  });

  it("omits away_score when not present", () => {
    const { away_score: _as, ...rest } = baseMatch;
    const match: EloCompatibleMatch = rest;
    const result = toEloMatch(match);

    expect("away_score" in result).toBe(false);
  });

  it("omits result when not present", () => {
    const { result: _r, ...rest } = baseMatch;
    const match: EloCompatibleMatch = rest;
    const result = toEloMatch(match);

    expect("result" in result).toBe(false);
  });

  it("handles neutral_site: true correctly", () => {
    const match: EloCompatibleMatch = { ...baseMatch, neutral_site: true };
    const result = toEloMatch(match);

    expect(result.neutral_site).toBe(true);
  });

  it("converts a draw result correctly", () => {
    const match: EloCompatibleMatch = { ...baseMatch, home_score: 1, away_score: 1, result: "draw" };
    const result = toEloMatch(match);

    expect(result.result).toBe("draw");
  });

  it("converts an away_win result correctly", () => {
    const match: EloCompatibleMatch = { ...baseMatch, home_score: 0, away_score: 2, result: "away_win" };
    const result = toEloMatch(match);

    expect(result.result).toBe("away_win");
  });
});

describe("mergeEloMatchSources", () => {
  it("returns the foundation unchanged when supplement is empty", () => {
    const result = mergeEloMatchSources([baseEloMatch], []);

    expect(result).toHaveLength(1);
    expect(result[0]?.match_id).toBe("ELO-001");
  });

  it("appends supplement matches not already in the foundation", () => {
    const result = mergeEloMatchSources([baseEloMatch], [baseMatch]);

    expect(result).toHaveLength(2);
    expect(result[1]?.match_id).toBe("TEST-001");
  });

  it("deduplicates matches that share a match_id with the foundation", () => {
    const duplicate: EloCompatibleMatch = { ...baseMatch, match_id: "ELO-001" };
    const result = mergeEloMatchSources([baseEloMatch], [duplicate]);

    expect(result).toHaveLength(1);
    expect(result[0]?.match_id).toBe("ELO-001");
  });

  it("preserves foundation match data when a duplicate is excluded", () => {
    const duplicate: EloCompatibleMatch = {
      ...baseMatch,
      match_id: "ELO-001",
      home_team: "OverrideTeam"
    };
    const result = mergeEloMatchSources([baseEloMatch], [duplicate]);

    expect(result[0]?.home_team).toBe("Argentina");
  });

  it("adds multiple supplement matches when none overlap", () => {
    const supplement: EloCompatibleMatch[] = [
      { ...baseMatch, match_id: "S-001" },
      { ...baseMatch, match_id: "S-002" }
    ];
    const result = mergeEloMatchSources([baseEloMatch], supplement);

    expect(result).toHaveLength(3);
  });

  it("handles an empty foundation with supplement matches", () => {
    const result = mergeEloMatchSources([], [baseMatch]);

    expect(result).toHaveLength(1);
    expect(result[0]?.match_id).toBe("TEST-001");
  });

  it("preserves the original order of foundation matches before supplement", () => {
    const foundation: EloMatch[] = [
      { ...baseEloMatch, match_id: "F-001" },
      { ...baseEloMatch, match_id: "F-002" }
    ];
    const supplement: EloCompatibleMatch[] = [{ ...baseMatch, match_id: "S-001" }];
    const result = mergeEloMatchSources(foundation, supplement);

    expect(result[0]?.match_id).toBe("F-001");
    expect(result[1]?.match_id).toBe("F-002");
    expect(result[2]?.match_id).toBe("S-001");
  });
});

describe("LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING", () => {
  it("is a non-empty string", () => {
    expect(typeof LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING).toBe("string");
    expect(LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING.length).toBeGreaterThan(0);
  });

  it("mentions 'sample'", () => {
    expect(LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING.toLowerCase()).toContain("sample");
  });
});
