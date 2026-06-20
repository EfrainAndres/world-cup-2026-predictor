import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DailyMatchCard } from "./DailyMatchCard";
import type { WorldCup2026DailyMatchEntry } from "../lib/api-client";

function makeMatch(overrides: Partial<WorldCup2026DailyMatchEntry>): WorldCup2026DailyMatchEntry {
  return {
    fixtureId: "fixture-1",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    normalizedStatus: "scheduled",
    state: "upcoming",
    predictionSnapshot: {
      available: false
    },
    predictionHistory: {
      snapshot: {
        available: false
      },
      evaluation: {
        available: false
      },
      warnings: []
    },
    ...overrides
  };
}

describe("DailyMatchCard", () => {
  test("renders upcoming match without prediction history", () => {
    const html = renderToStaticMarkup(<DailyMatchCard match={makeMatch({})} />);

    expect(html).toContain("No pre-match prediction saved");
    expect(html).toContain("Evaluation is available after a completed final result only.");
  });

  test("renders upcoming match with saved pre-match prediction details", () => {
    const html = renderToStaticMarkup(
      <DailyMatchCard
        match={makeMatch({
          predictionSnapshot: {
            available: true,
            status: "pre_match_locked",
            snapshotId: "snap-1",
            capturedAt: "2026-06-20T14:00:00Z",
            modelVersion: "wc2026-model-v1"
          },
          predictionHistory: {
            snapshot: {
              available: true,
              status: "pre_match_locked",
              snapshotId: "snap-1",
              capturedAt: "2026-06-20T14:00:00Z",
              modelVersion: "wc2026-model-v1",
              prediction: {
                homeExpectedGoals: 1.42,
                awayExpectedGoals: 0.88,
                homeWinProbability: 0.56,
                drawProbability: 0.26,
                awayWinProbability: 0.18,
                projectedScoreline: { homeGoals: 1, awayGoals: 0 },
                confidenceLevel: "medium",
                coverageType: "partial"
              }
            },
            evaluation: {
              available: false
            },
            warnings: []
          }
        })}
      />
    );

    expect(html).toContain("Projected score: 1 - 0");
    expect(html).toContain("1X2: 56.0% / 26.0% / 18.0%");
    expect(html).toContain("xG: 1.42 - 0.88");
    expect(html).toContain("Confidence: medium");
    expect(html).toContain("Coverage: partial");
  });

  test("renders live cards with pre-match prediction label", () => {
    const html = renderToStaticMarkup(
      <DailyMatchCard
        match={makeMatch({
          state: "live",
          normalizedStatus: "live",
          homeScore: 1,
          awayScore: 1,
          predictionHistory: {
            snapshot: {
              available: true,
              status: "pre_match_locked",
              prediction: {
                homeExpectedGoals: 1.1,
                awayExpectedGoals: 1.1,
                homeWinProbability: 0.4,
                drawProbability: 0.3,
                awayWinProbability: 0.3
              }
            },
            evaluation: {
              available: false
            },
            warnings: []
          }
        })}
      />
    );

    expect(html).toContain("Pre-match prediction");
    expect(html).toContain("Current score");
    expect(html).toContain("1 - 1");
  });

  test("renders final cards with evaluation pending when no evaluation exists", () => {
    const html = renderToStaticMarkup(
      <DailyMatchCard
        match={makeMatch({
          state: "final",
          normalizedStatus: "finished",
          homeScore: 2,
          awayScore: 1,
          predictionHistory: {
            snapshot: {
              available: true,
              status: "pre_match_locked",
              prediction: {
                homeExpectedGoals: 1.3,
                awayExpectedGoals: 0.9,
                homeWinProbability: 0.5,
                drawProbability: 0.28,
                awayWinProbability: 0.22
              }
            },
            evaluation: {
              available: false
            },
            warnings: []
          }
        })}
      />
    );

    expect(html).toContain("Final result");
    expect(html).toContain("Prediction saved");
    expect(html).toContain("Evaluation pending");
  });

  test("renders final evaluation metrics separately from the final result", () => {
    const html = renderToStaticMarkup(
      <DailyMatchCard
        match={makeMatch({
          state: "final",
          normalizedStatus: "finished",
          homeScore: 2,
          awayScore: 0,
          predictionHistory: {
            snapshot: {
              available: true,
              status: "pre_match_locked",
              prediction: {
                homeExpectedGoals: 1.42,
                awayExpectedGoals: 0.88,
                homeWinProbability: 0.56,
                drawProbability: 0.26,
                awayWinProbability: 0.18,
                projectedScoreline: { homeGoals: 1, awayGoals: 0 }
              }
            },
            evaluation: {
              available: true,
              evaluatedAt: "2026-06-20T18:15:00Z",
              metrics: {
                outcomeCorrect: true,
                exactScoreCorrect: false,
                brierScore: 0.342,
                logLoss: 0.578,
                totalGoalAbsoluteError: 1
              }
            },
            warnings: []
          }
        })}
      />
    );

    expect(html).toContain("Final result");
    expect(html).toContain("2 - 0");
    expect(html).toContain("Outcome prediction: Correct");
    expect(html).toContain("Exact score: Miss");
    expect(html).toContain("Brier Score: 0.342");
    expect(html).toContain("Log Loss: 0.578");
    expect(html).toContain("Total-goal absolute error: 1.00");
  });
});
