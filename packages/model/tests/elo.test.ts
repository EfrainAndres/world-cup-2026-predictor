import { describe, expect, it } from "vitest";
import {
  DEFAULT_ELO_CONFIG,
  calculateExpectedScore,
  getCurrentTeamRatings,
  getRatingHistoryByTeam,
  initializeTeamRatings,
  processMatches,
  updateRatingsAfterMatch
} from "../src/index.js";
import type { EloMatch } from "../src/index.js";

const baseMatch: EloMatch = {
  match_id: "m-1",
  match_date: "2026-06-11",
  home_team: "Mexico",
  away_team: "Canada",
  neutral_site: true,
  result: "home_win"
};

describe("Elo baseline", () => {
  it("returns 0.5 expected score when ratings are equal", () => {
    expect(calculateExpectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
  });

  it("returns higher expected score when team A has higher rating", () => {
    expect(calculateExpectedScore(1600, 1500)).toBeGreaterThan(0.5);
  });

  it("increases rating after a win", () => {
    const { ratings } = updateRatingsAfterMatch(new Map(), baseMatch);

    expect(ratings.get("Mexico")).toBeGreaterThan(DEFAULT_ELO_CONFIG.initialRating);
  });

  it("decreases rating after a loss", () => {
    const { ratings } = updateRatingsAfterMatch(new Map(), baseMatch);

    expect(ratings.get("Canada")).toBeLessThan(DEFAULT_ELO_CONFIG.initialRating);
  });

  it("changes ratings after a draw when ratings are different", () => {
    const ratings = initializeTeamRatings(["Mexico", "Canada"]);
    ratings.set("Mexico", 1600);
    ratings.set("Canada", 1500);

    const { ratings: updated } = updateRatingsAfterMatch(ratings, {
      ...baseMatch,
      result: "draw"
    });

    expect(updated.get("Mexico")).toBeLessThan(1600);
    expect(updated.get("Canada")).toBeGreaterThan(1500);
  });

  it("processes multiple matches", () => {
    const result = processMatches([
      baseMatch,
      {
        match_id: "m-2",
        match_date: "2026-06-15",
        home_team: "Canada",
        away_team: "Japan",
        neutral_site: true,
        result: "draw"
      }
    ]);

    expect(result.matchHistory).toHaveLength(2);
    expect(getCurrentTeamRatings(result.ratings).map((entry) => entry.team)).toEqual(["Mexico", "Japan", "Canada"]);
  });

  it("starts unknown teams at the default rating", () => {
    const { history } = updateRatingsAfterMatch(new Map(), {
      ...baseMatch,
      home_team: "New Team A",
      away_team: "New Team B"
    });

    expect(history.home_rating_before).toBe(DEFAULT_ELO_CONFIG.initialRating);
    expect(history.away_rating_before).toBe(DEFAULT_ELO_CONFIG.initialRating);
  });

  it("does not mutate input rating maps or matches", () => {
    const ratings = initializeTeamRatings(["Mexico", "Canada"]);
    const match: EloMatch = { ...baseMatch };

    updateRatingsAfterMatch(ratings, match);

    expect(ratings.get("Mexico")).toBe(DEFAULT_ELO_CONFIG.initialRating);
    expect(match).toEqual(baseMatch);
  });

  it("generates match and team rating history", () => {
    const result = processMatches([baseMatch]);
    const mexicoHistory = getRatingHistoryByTeam(result.matchHistory, "Mexico");

    expect(result.matchHistory[0]?.match_id).toBe("m-1");
    expect(mexicoHistory).toHaveLength(1);
    expect(mexicoHistory[0]?.home_rating_after).toBeGreaterThan(mexicoHistory[0]?.home_rating_before ?? 0);
  });

  it("throws for invalid scores when no result is present", () => {
    const { result: _result, ...matchWithoutResult } = baseMatch;

    expect(() =>
      updateRatingsAfterMatch(new Map(), {
        ...matchWithoutResult,
        home_score: -1,
        away_score: 1
      })
    ).toThrow("invalid scores");
  });
});
