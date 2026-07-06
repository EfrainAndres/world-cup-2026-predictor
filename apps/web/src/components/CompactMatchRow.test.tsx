import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { WorldCup2026DailyMatchEntry } from "../lib/api-client";
import { CompactMatchRow } from "./CompactMatchRow";

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

describe("CompactMatchRow", () => {
  test("shows penalty winner note while keeping the official score primary", () => {
    const html = renderToStaticMarkup(
      <CompactMatchRow
        match={match({
          homeScore: 1,
          awayScore: 1,
          penaltyHomeScore: 3,
          penaltyAwayScore: 5,
          winner: "Egypt",
          decisionMethod: "penalties"
        })}
      />
    );

    expect(html).toContain("1 – 1");
    expect(html).toContain("Egypt wins 5–3 on penalties");
    expect(html).toMatch(/1 – 1[\s\S]*Egypt wins 5–3 on penalties[\s\S]*Final/);
  });
});
