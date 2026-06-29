import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import type { PredictMatchFromLiveEloSuccessResponse } from "@world-cup-2026-predictor/api";

vi.mock("./StatusPill", () => ({
  StatusPill: () => null
}));

import { MatchSimulationResults } from "./MatchSimulationResults";
import type { WorldCup2026MatchContext } from "../lib/api-client";
import { predictDashboardMatchFromLiveElo, simulateDashboardMatch } from "../lib/api-client";

function makeResult() {
  const response = simulateDashboardMatch({
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    expectedHomeGoals: 1.2,
    expectedAwayGoals: 0.9,
    maxGoals: 6,
    mostLikelyScorelineLimit: 3
  });

  if (response.status !== "success") throw new Error("Expected success");
  return response;
}

function makeContext(overrides: Partial<WorldCup2026MatchContext> = {}): WorldCup2026MatchContext {
  return {
    fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    group: "A",
    matchday: 1,
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    standingsContext: {
      mode: "official",
      home: {
        team: "Mexico",
        groupPosition: null,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      },
      away: {
        team: "South Africa",
        groupPosition: null,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      },
      groupComplete: false
    },
    qualificationState: {
      status: "foundation_only"
    },
    fixtureImportance: {
      level: "low",
      reasons: ["Opening fixture: qualification stakes are minimal at this stage."]
    },
    providerFreshness: {
      activeProvider: "football_data_org_results_provider",
      cacheUsed: false,
      localFallbackUsed: false,
      stale: false
    },
    fallbackState: {
      externalProviderEnabled: true,
      localFallbackUsed: false,
      unresolvedFixture: false,
      warnings: []
    },
    ...overrides
  };
}

function makeLiveResultWithStatsBomb(
  statsBombSignal: PredictMatchFromLiveEloSuccessResponse["statsBombSignal"]
): PredictMatchFromLiveEloSuccessResponse {
  const response = predictDashboardMatchFromLiveElo({
    homeTeam: "France",
    awayTeam: "Brazil",
    preset: "balanced",
    maxGoals: 6,
    mostLikelyScorelineLimit: 3
  });

  if (response.status !== "success") throw new Error("Expected success");

  return {
    ...response,
    statsBombSignal
  };
}

describe("MatchSimulationResults — match context section", () => {
  test("section header is always present when matchContext is undefined", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} />
    );
    expect(html).toContain("Match context — not used as a model input");
  });

  test("shows 'not available' message when matchContext is undefined", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} />
    );
    expect(html).toContain("Match context is not available for this prediction.");
  });

  test("does not show 'not available' message when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).not.toContain("Match context is not available for this prediction.");
  });

  test("renders home and away team names from context when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).toContain("Mexico");
    expect(html).toContain("South Africa");
  });

  test("renders 'Not used as a model input' label when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).toContain("Not used as a model input");
  });

  test("section header is always present when matchContext is provided", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults result={makeResult()} matchContext={makeContext()} />
    );
    expect(html).toContain("Match context — not used as a model input");
  });

  test("renders applied StatsBomb signal metadata without exposing raw artifacts", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithStatsBomb({
          enabled: true,
          applied: true,
          reason: "applied",
          rolloutMode: "on",
          activationDecision: "production_ready",
          authoritative: "statsbomb",
          provider: "statsbomb_open_data",
          cutoffAt: "2026-06-01T00:00:00.000Z",
          artifactCutoffAt: "2026-06-01T00:00:00.000Z",
          artifactGeneratedAt: "2026-06-29T19:48:39.341Z",
          signalVersion: "statsbomb-signal-v1",
          baselineExpectedGoals: { home: 1.1, away: 0.9 },
          adjustedExpectedGoals: { home: 1.2, away: 0.8 },
          homeProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 10,
            latestMatchAt: "2024-07-01",
            weight: 0.14
          },
          awayProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 8,
            latestMatchAt: "2024-06-30",
            weight: 0.12
          },
          warnings: []
        })}
      />
    );

    expect(html).toContain("StatsBomb enriched");
    expect(html).toContain("Model: Elo V2 + StatsBomb");
    expect(html).toContain("Partial / Partial");
    expect(html).toContain("Signal weight");
    expect(html).toContain("June 1, 2026");
    expect(html).not.toContain("statsbomb-team-performance-profiles");
  });

  test("renders shadow mode as baseline-authoritative", () => {
    const html = renderToStaticMarkup(
      <MatchSimulationResults
        result={makeLiveResultWithStatsBomb({
          enabled: true,
          applied: false,
          reason: "applied",
          rolloutMode: "shadow",
          activationDecision: "shadow_ready",
          authoritative: "baseline",
          provider: "statsbomb_open_data",
          cutoffAt: "2026-06-01T00:00:00.000Z",
          signalVersion: "statsbomb-signal-v1",
          baselineExpectedGoals: { home: 1.1, away: 0.9 },
          adjustedExpectedGoals: { home: 1.1, away: 0.9 },
          shadowAdjustedExpectedGoals: { home: 1.2, away: 0.8 },
          homeProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 10,
            latestMatchAt: "2024-07-01",
            weight: 0.14
          },
          awayProfile: {
            coverage: "partial",
            freshness: "stale",
            matchCount: 8,
            latestMatchAt: "2024-06-30",
            weight: 0.12
          },
          warnings: []
        })}
      />
    );

    expect(html).toContain("Baseline model");
    expect(html).toContain("Shadow mode computed a comparison only");
    expect(html).toContain("Shadow adjusted xG");
    expect(html).not.toContain("StatsBomb enriched");
  });
});
