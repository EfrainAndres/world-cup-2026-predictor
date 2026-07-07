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

  test("moves raw Fixture ID and Snapshot status into an Advanced filters details block", () => {
    const html = render(makeSuccessResponse());

    expect(html).toContain("Advanced filters");
    const advancedIndex = html.indexOf("<details");
    const fixtureIdIndex = html.indexOf("Fixture ID");
    const snapshotStatusIndex = html.indexOf("Snapshot status");
    expect(advancedIndex).toBeGreaterThan(-1);
    expect(fixtureIdIndex).toBeGreaterThan(advancedIndex);
    expect(snapshotStatusIndex).toBeGreaterThan(advancedIndex);
  });

  test("renames the Team filter to a team-or-match-search field without changing its name attribute", () => {
    const html = render(makeSuccessResponse());

    expect(html).toContain("Team or match search");
    expect(html).toContain('name="team"');
  });

  test("shows a snapshot status explainer with exact-semantics copy", () => {
    const html = render(makeSuccessResponse());

    expect(html).toContain("What do snapshot statuses mean?");
    expect(html).toContain("Verified as a genuine pre-match prediction and safe for accuracy evaluation.");
    expect(html).toContain("Retained for audit, but not treated as a verified pre-match lock.");
  });

  test("shows a concise Brier Score explainer", () => {
    const html = render(makeSuccessResponse());

    expect(html).toContain("Brier Score:");
    expect(html).toContain("Lower is better");
    expect(html).toContain("predicted 1X2 probabilities");
  });

  test("team labels have explicit spacing around vs", () => {
    const html = render(
      makeSuccessResponse({
        items: [
          {
            snapshotId: "snap-vs-1",
            fixtureId: "fixture-vs-1",
            group: "C",
            matchday: 1,
            homeTeam: "DR Congo",
            awayTeam: "Uzbekistan",
            kickoffAt: "2026-06-18T20:00:00Z",
            capturedAt: "2026-06-18T10:00:00Z",
            snapshotStatus: "pre_match_locked",
            projectedScore: { home: 1, away: 1 },
            expectedGoals: { home: 1.1, away: 1.05 },
            outcomeProbabilities: { homeWin: 0.35, draw: 0.34, awayWin: 0.31 },
            confidence: { level: "medium", coverage: "partial" },
            evaluation: null
          }
        ]
      })
    );

    expect(html).toContain("DR Congo");
    expect(html).toContain("Uzbekistan");
    expect(html).not.toContain("Congovs");
    expect(html).not.toContain("vsUzbekistan");
  });

  function duplicateFixtureItems(): PredictionHistoryListSuccessResponse["items"] {
    return [
      {
        snapshotId: "snap-dup-old",
        fixtureId: "fixture-dup-1",
        group: "A",
        matchday: 1,
        homeTeam: "Brazil",
        awayTeam: "Morocco",
        kickoffAt: "2026-06-15T18:00:00Z",
        capturedAt: "2026-06-14T09:00:00Z",
        snapshotStatus: "foundation_unverified",
        projectedScore: { home: 1, away: 1 },
        expectedGoals: { home: 1.1, away: 1.0 },
        outcomeProbabilities: { homeWin: 0.4, draw: 0.3, awayWin: 0.3 },
        confidence: { level: "low", coverage: "fallback" },
        evaluation: null
      },
      {
        snapshotId: "snap-dup-preferred",
        fixtureId: "fixture-dup-1",
        group: "A",
        matchday: 1,
        homeTeam: "Brazil",
        awayTeam: "Morocco",
        kickoffAt: "2026-06-15T18:00:00Z",
        capturedAt: "2026-06-15T10:00:00Z",
        snapshotStatus: "pre_match_locked",
        projectedScore: { home: 2, away: 0 },
        expectedGoals: { home: 1.8, away: 0.6 },
        outcomeProbabilities: { homeWin: 0.6, draw: 0.25, awayWin: 0.15 },
        confidence: { level: "high", coverage: "partial" },
        evaluation: {
          evaluationId: "eval-dup-1",
          evaluatedAt: "2026-06-15T20:00:00Z",
          actualScore: { home: 2, away: 0 },
          actualOutcome: "home_win",
          brierScore: 0.12,
          logLoss: 0.3,
          homeGoalAbsoluteError: 0,
          awayGoalAbsoluteError: 0,
          scorelineCorrect: true,
          outcomeCorrect: true
        }
      }
    ];
  }

  test("groups duplicate snapshots by fixture and shows a fixture header with counts", () => {
    const html = render(makeSuccessResponse({ items: duplicateFixtureItems() }));

    expect(html).toContain("Brazil");
    expect(html).toContain("Morocco");
    expect(html).toContain("Group A · Matchday 1 · 2 snapshots · 1 evaluated");
  });

  test("shows the pre_match_locked snapshot as preferred over foundation_unverified duplicates", () => {
    const html = render(makeSuccessResponse({ items: duplicateFixtureItems() }));

    expect(html).toContain("Preferred snapshot");
    expect(html).toContain("Projected score: 2 - 0");
    expect(html).toContain("View all 2 snapshots for this fixture");
  });

  test("keeps every snapshot's raw fixture ID accessible for QA/audit inside the fixture group", () => {
    const html = render(makeSuccessResponse({ items: duplicateFixtureItems() }));

    expect(html).toContain("fixture-dup-1");
  });

  test("does not repeat the historical match context note per snapshot within a fixture group", () => {
    const html = render(makeSuccessResponse({ items: duplicateFixtureItems() }));

    const occurrences = html.split("Historical match context was not captured").length - 1;
    expect(occurrences).toBe(1);
  });

  test("single-snapshot fixtures render without a 'view all snapshots' toggle", () => {
    const html = render(
      makeSuccessResponse({
        items: [
          {
            snapshotId: "snap-single",
            fixtureId: "fixture-single",
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
        ]
      })
    );

    expect(html).toContain("Group A · Matchday 1 · 1 snapshot · 0 evaluated");
    expect(html).not.toContain("View all");
    expect(html).toContain("fixture-single");
  });
});
