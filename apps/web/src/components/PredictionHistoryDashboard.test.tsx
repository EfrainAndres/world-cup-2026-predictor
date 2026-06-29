import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type {
  PredictionHistoryListResponse,
  PredictionHistoryListSuccessResponse
} from "@world-cup-2026-predictor/api";
import { PredictionHistoryDashboard } from "./PredictionHistoryDashboard";

function makeSuccessResponse(
  overrides: Partial<PredictionHistoryListSuccessResponse> = {}
): PredictionHistoryListSuccessResponse {
  return {
    status: "success",
    items: [],
    summary: {
      totalSnapshots: 0,
      evaluatedSnapshots: 0,
      pendingSnapshots: 0,
      outcomeAccuracy: null,
      exactScoreAccuracy: null,
      averageBrierScore: null
    },
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false
    },
    filters: {
      group: null,
      team: null,
      fixtureId: null,
      status: null,
      evaluationState: "all",
      sort: "captured_desc"
    },
    metadata: {
      apiVersion: "1.0.0",
      mode: "pure_handlers",
      serverEnabled: false,
      databaseEnabled: false,
      externalServicesEnabled: false,
      notes: []
    },
    persistenceMetadata: {
      provider: "memory",
      persistent: false,
      configuredProvider: "memory"
    },
    ...overrides
  };
}

function render(response: PredictionHistoryListResponse): string {
  return renderToStaticMarkup(
    <PredictionHistoryDashboard
      response={response}
      formValues={{
        group: "",
        team: "",
        fixtureId: "",
        status: "",
        evaluationState: "all",
        sort: "captured_desc",
        pageSize: "20"
      }}
    />
  );
}

describe("PredictionHistoryDashboard", () => {
  test("renders empty state and summary cards", () => {
    const html = render(makeSuccessResponse());

    expect(html).toContain("Prediction History");
    expect(html).toContain("Filter-scoped summary");
    expect(html).toContain("No prediction history records match the current filters.");
    expect(html).toContain("Total snapshots");
    expect(html).toContain("Average Brier Score");
  });

  test("renders evaluated records with separated prediction, reality, and accuracy content", () => {
    const html = render(
      makeSuccessResponse({
        items: [
          {
            snapshotId: "snap-1",
            fixtureId: "fixture-1",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            kickoffAt: "2026-06-18T20:00:00Z",
            capturedAt: "2026-06-18T10:00:00Z",
            snapshotStatus: "pre_match_locked",
            projectedScore: { home: 1, away: 0 },
            expectedGoals: { home: 1.42, away: 0.88 },
            outcomeProbabilities: { homeWin: 0.56, draw: 0.26, awayWin: 0.18 },
            confidence: { level: "medium", coverage: "partial" },
            evaluation: {
              evaluationId: "eval-1",
              evaluatedAt: "2026-06-18T22:00:00Z",
              actualScore: { home: 2, away: 0 },
              actualOutcome: "home_win",
              brierScore: 0.342,
              logLoss: 0.578,
              homeGoalAbsoluteError: 1,
              awayGoalAbsoluteError: 0,
              scorelineCorrect: false,
              outcomeCorrect: true
            }
          }
        ],
        summary: {
          totalSnapshots: 1,
          evaluatedSnapshots: 1,
          pendingSnapshots: 0,
          outcomeAccuracy: 1,
          exactScoreAccuracy: 0,
          averageBrierScore: 0.342
        }
      })
    );

    expect(html).toContain("Projected score: 1 - 0");
    expect(html).toContain("Actual score: 2 - 0");
    expect(html).toContain("Outcome prediction: Correct");
    expect(html).toContain("Brier Score: 0.342");
    expect(html).toContain("Log Loss: 0.578");
  });

  test("renders pending records and accessible filter labels", () => {
    const html = render(
      makeSuccessResponse({
        items: [
          {
            snapshotId: "snap-2",
            fixtureId: "fixture-2",
            group: "B",
            matchday: 2,
            homeTeam: "Canada",
            awayTeam: "Bosnia-Herzegovina",
            kickoffAt: null,
            capturedAt: "2026-06-19T10:00:00Z",
            snapshotStatus: "foundation_unverified",
            projectedScore: { home: 1, away: 1 },
            expectedGoals: { home: 1.11, away: 1.05 },
            outcomeProbabilities: { homeWin: 0.35, draw: 0.34, awayWin: 0.31 },
            confidence: { level: "low", coverage: "fallback" },
            evaluation: null
          }
        ]
      })
    );

    expect(html).toContain("Awaiting official completed result");
    expect(html).toContain("Fixture ID");
    expect(html).toContain("Group");
    expect(html).toContain("Team");
    expect(html).toContain("Fixture ID");
    expect(html).toContain("Snapshot status");
    expect(html).toContain("Evaluation state");
  });

  test("renders validation and sanitized error states", () => {
    const validationHtml = render({
      status: "validation_error",
      issues: [{ field: "group", message: "group must be one of A through L." }],
      metadata: {
        apiVersion: "1.0.0",
        mode: "pure_handlers",
        serverEnabled: false,
        databaseEnabled: false,
        externalServicesEnabled: false,
        notes: []
      }
    });
    const errorHtml = render({
      status: "error",
      error: {
        code: "connection_unavailable",
        message: "Prediction history persistence is currently unavailable."
      },
      metadata: {
        apiVersion: "1.0.0",
        mode: "pure_handlers",
        serverEnabled: false,
        databaseEnabled: false,
        externalServicesEnabled: false,
        notes: []
      }
    });

    expect(validationHtml).toContain("Some filters are invalid.");
    expect(errorHtml).toContain("Prediction history is unavailable.");
    expect(errorHtml).not.toContain("postgresql://");
  });

  test("renders pagination state when multiple pages exist", () => {
    const html = render(
      makeSuccessResponse({
        items: [
          {
            snapshotId: "snap-3",
            fixtureId: "fixture-3",
            group: "A",
            matchday: 1,
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            kickoffAt: "2026-06-18T20:00:00Z",
            capturedAt: "2026-06-18T10:00:00Z",
            snapshotStatus: "pre_match_locked",
            projectedScore: { home: 1, away: 0 },
            expectedGoals: { home: 1.2, away: 0.8 },
            outcomeProbabilities: { homeWin: 0.5, draw: 0.3, awayWin: 0.2 },
            confidence: { level: "medium", coverage: "partial" },
            evaluation: null
          }
        ],
        pagination: {
          page: 2,
          pageSize: 10,
          totalItems: 25,
          totalPages: 3,
          hasPreviousPage: true,
          hasNextPage: true
        },
        filters: {
          group: "A",
          team: null,
          fixtureId: null,
          status: null,
          evaluationState: "all",
          sort: "captured_desc"
        }
      })
    );

    expect(html).toContain("Page 2 of 3");
    expect(html).toContain("Previous page");
    expect(html).toContain("Next page");
  });
});
