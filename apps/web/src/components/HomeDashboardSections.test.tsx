import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type {
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchesSuccessResponse
} from "../lib/api-client";
import { HomeTodayMatches } from "./HomeDashboardSections";

function match(overrides: Partial<WorldCup2026DailyMatchEntry> = {}): WorldCup2026DailyMatchEntry {
  return {
    fixtureId: "fixture-1",
    homeTeam: "Australia",
    awayTeam: "Egypt",
    normalizedStatus: "scheduled",
    state: "upcoming",
    predictionSnapshot: { available: false },
    predictionHistory: {
      snapshot: { available: false },
      evaluation: { available: false },
      warnings: []
    },
    ...overrides
  };
}

function dailyMatches(matches: readonly WorldCup2026DailyMatchEntry[]): WorldCup2026DailyMatchesSuccessResponse {
  return {
    status: "success",
    requestedDate: "2026-06-11",
    timezone: "America/Bogota",
    generatedAt: "2026-06-11T12:00:00Z",
    counts: {
      total: matches.length,
      upcoming: matches.filter((m) => m.state === "upcoming").length,
      live: matches.filter((m) => m.state === "live").length,
      halftime: matches.filter((m) => m.state === "halftime").length,
      final: matches.filter((m) => m.state === "final").length,
      postponed: matches.filter((m) => m.state === "postponed").length,
      cancelled: matches.filter((m) => m.state === "cancelled").length,
      unknown: matches.filter((m) => m.state === "unknown").length,
      unavailableKickoff: 0
    },
    matches,
    unscheduledMatches: [],
    issues: [],
    warnings: [],
    providerMetadata: {
      configuredProvider: "local_static",
      activeProvider: "local_static_results_provider",
      externalRequestAttempted: false,
      cacheUsed: false,
      localFallbackUsed: true,
      stale: false
    },
    metadata: {
      apiVersion: "0.1.0",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: []
    }
  };
}

describe("HomeTodayMatches", () => {
  test("uses preview wording for upcoming matches and penalty notes for finals", () => {
    const matches = [
      match({ fixtureId: "upcoming", homeTeam: "Mexico", awayTeam: "South Africa" }),
      match({
        fixtureId: "penalties",
        normalizedStatus: "finished",
        state: "final",
        homeScore: 1,
        awayScore: 1,
        penaltyHomeScore: 3,
        penaltyAwayScore: 5,
        winner: "Egypt",
        decisionMethod: "penalties"
      })
    ];
    const html = renderToStaticMarkup(<HomeTodayMatches matches={matches} dailyMatches={dailyMatches(matches)} />);

    expect(html).toContain("Preview");
    expect(html).toContain("vs");
    expect(html).toContain("1 – 1");
    expect(html).toContain("Egypt wins 5–3 on penalties");
  });
});
