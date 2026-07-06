import { describe, expect, test } from "vitest";
import type { WorldCup2026DailyMatchEntry } from "./api-client";
import { buildMatchResultDisplay } from "./match-result-display";

function match(overrides: Partial<WorldCup2026DailyMatchEntry> = {}): WorldCup2026DailyMatchEntry {
  return {
    fixtureId: "fixture-1",
    homeTeam: "Australia",
    awayTeam: "Egypt",
    normalizedStatus: "finished",
    state: "final",
    predictionSnapshot: { available: false },
    predictionHistory: {
      snapshot: { available: false },
      evaluation: { available: false },
      warnings: []
    },
    ...overrides
  };
}

describe("buildMatchResultDisplay", () => {
  test("uses the official final score for a normal completed match", () => {
    const display = buildMatchResultDisplay(match({ homeScore: 3, awayScore: 0 }));

    expect(display.showPrimaryScore).toBe(true);
    expect(display.primaryScoreLabel).toBe("Final");
    expect(display.primaryScoreText).toBe("3 – 0");
    expect(display.resultNote).toBeUndefined();
    expect(display.detailRows).toEqual([]);
  });

  test("labels extra-time results without treating them as penalties", () => {
    const display = buildMatchResultDisplay(
      match({
        homeScore: 2,
        awayScore: 1,
        regularTimeHomeScore: 1,
        regularTimeAwayScore: 1,
        extraTimeHomeScore: 2,
        extraTimeAwayScore: 1,
        decisionMethod: "extra_time"
      })
    );

    expect(display.primaryScoreLabel).toBe("After extra time");
    expect(display.primaryScoreText).toBe("2 – 1");
    expect(display.resultNote).toBeUndefined();
    expect(display.detailRows).toEqual([
      { label: "Regular time", value: "1 – 1" },
      { label: "After extra time", value: "2 – 1" }
    ]);
  });

  test("shows penalty shootout winners separately from the primary score", () => {
    const display = buildMatchResultDisplay(
      match({
        homeScore: 1,
        awayScore: 1,
        regularTimeHomeScore: 1,
        regularTimeAwayScore: 1,
        extraTimeHomeScore: 1,
        extraTimeAwayScore: 1,
        penaltyHomeScore: 3,
        penaltyAwayScore: 5,
        winner: "Egypt",
        decisionMethod: "penalties"
      })
    );

    expect(display.primaryScoreLabel).toBe("After extra time");
    expect(display.primaryScoreText).toBe("1 – 1");
    expect(display.resultNote).toBe("Egypt wins 5–3 on penalties");
    expect(display.detailRows).toEqual([
      { label: "Regular time", value: "1 – 1" },
      { label: "After extra time", value: "1 – 1" },
      { label: "Penalties", value: "Australia 3–5 Egypt" }
    ]);
  });

  test("uses preview language for upcoming matches instead of a score label", () => {
    const display = buildMatchResultDisplay(match({ state: "upcoming", normalizedStatus: "scheduled" }));

    expect(display.showPrimaryScore).toBe(false);
    expect(display.primaryScoreLabel).toBe("Preview");
    expect(display.primaryScoreText).toBe("vs");
  });
});
