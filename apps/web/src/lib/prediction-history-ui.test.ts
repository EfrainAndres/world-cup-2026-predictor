import { describe, expect, test } from "vitest";
import type { PredictionHistoryListItem } from "@world-cup-2026-predictor/api";
import {
  buildPredictionHistoryQueryString,
  formatPredictionHistoryMetric,
  formatPredictionHistoryProbability,
  getPersistenceSourceLabel,
  getSnapshotStatusExplanation,
  getSnapshotStatusLabel,
  groupPredictionHistoryItemsByFixture,
  PREDICTION_HISTORY_BRIER_SCORE_EXPLANATION,
  PREDICTION_HISTORY_MATCH_CONTEXT_NOTE,
  selectPreferredHistorySnapshot,
  toPredictionHistoryQuery
} from "./prediction-history-ui";

function item(overrides: Partial<PredictionHistoryListItem> = {}): PredictionHistoryListItem {
  return {
    snapshotId: overrides.snapshotId ?? "snap-1",
    fixtureId: overrides.fixtureId ?? "fixture-1",
    group: overrides.group ?? "A",
    matchday: overrides.matchday ?? 1,
    homeTeam: overrides.homeTeam ?? "Mexico",
    awayTeam: overrides.awayTeam ?? "South Africa",
    kickoffAt: overrides.kickoffAt ?? "2026-06-18T20:00:00Z",
    capturedAt: overrides.capturedAt ?? "2026-06-18T10:00:00Z",
    snapshotStatus: overrides.snapshotStatus ?? "pre_match_locked",
    projectedScore: overrides.projectedScore ?? { home: 1, away: 0 },
    expectedGoals: overrides.expectedGoals ?? { home: 1.2, away: 0.8 },
    outcomeProbabilities: overrides.outcomeProbabilities ?? { homeWin: 0.5, draw: 0.3, awayWin: 0.2 },
    confidence: overrides.confidence ?? { level: "medium", coverage: "partial" },
    evaluation: overrides.evaluation ?? null
  };
}

describe("prediction history ui helpers", () => {
  test("formats probabilities and metrics consistently", () => {
    expect(formatPredictionHistoryProbability(0.4123)).toBe("41.2%");
    expect(formatPredictionHistoryMetric(0.3421)).toBe("0.342");
    expect(formatPredictionHistoryMetric(1.5, 2)).toBe("1.50");
    expect(formatPredictionHistoryMetric(null)).toBe("Unavailable");
  });

  test("maps snapshot status and persistence labels", () => {
    expect(getSnapshotStatusLabel("pre_match_locked")).toBe("Pre-match locked");
    expect(getSnapshotStatusLabel("foundation_unverified")).toBe("Foundation-unverified");
    expect(
      getPersistenceSourceLabel({
        provider: "memory",
        persistent: false,
        configuredProvider: "memory"
      })
    ).toBe("In-memory history");
    expect(
      getPersistenceSourceLabel({
        provider: "postgres",
        persistent: true,
        configuredProvider: "postgres"
      })
    ).toBe("Persistent PostgreSQL history");
  });

  test("builds query strings deterministically", () => {
    expect(
      buildPredictionHistoryQueryString(
        {
          group: "A",
          team: null,
          fixtureId: null,
          status: null,
          evaluationState: "all",
          sort: "captured_desc"
        },
        { page: 2, pageSize: 10 }
      )
    ).toBe("/prediction-history?group=A&evaluationState=all&sort=captured_desc&pageSize=10&page=2");
  });

  test("converts search params into api query input", () => {
    expect(
      toPredictionHistoryQuery({
        group: "A",
        team: "Mexico",
        fixtureId: "fixture-1",
        status: "pre_match_locked",
        evaluationState: "evaluated",
        sort: "kickoff_asc",
        page: "2",
        pageSize: "50"
      })
    ).toEqual({
      group: "A",
      team: "Mexico",
      fixtureId: "fixture-1",
      status: "pre_match_locked",
      evaluationState: "evaluated",
      sort: "kickoff_asc",
      page: 2,
      pageSize: 50
    });
  });

  test("explains snapshot statuses using canonical capture-timing semantics", () => {
    expect(getSnapshotStatusExplanation("pre_match_locked")).toContain("before kickoff");
    expect(getSnapshotStatusExplanation("pre_match_locked")).toContain("safe for accuracy evaluation");
    expect(getSnapshotStatusExplanation("foundation_unverified")).toContain("No kickoff time was available");
    expect(getSnapshotStatusExplanation("foundation_unverified")).toContain("Retained for audit");
  });

  test("exposes a concise Brier score explanation and match context note", () => {
    expect(PREDICTION_HISTORY_BRIER_SCORE_EXPLANATION).toContain("Lower is better");
    expect(PREDICTION_HISTORY_BRIER_SCORE_EXPLANATION).toContain("predicted 1X2 probabilities");
    expect(PREDICTION_HISTORY_MATCH_CONTEXT_NOTE.length).toBeGreaterThan(0);
  });
});

describe("selectPreferredHistorySnapshot", () => {
  test("prefers pre_match_locked over foundation_unverified regardless of order", () => {
    const locked = item({ snapshotId: "locked", snapshotStatus: "pre_match_locked", capturedAt: "2026-06-14T10:00:00Z" });
    const unverified = item({ snapshotId: "unverified", snapshotStatus: "foundation_unverified", capturedAt: "2026-06-15T10:00:00Z" });

    expect(selectPreferredHistorySnapshot([unverified, locked]).snapshotId).toBe("locked");
    expect(selectPreferredHistorySnapshot([locked, unverified]).snapshotId).toBe("locked");
  });

  test("prefers the latest capturedAt among same-status snapshots", () => {
    const earlier = item({ snapshotId: "earlier", capturedAt: "2026-06-14T10:00:00Z" });
    const later = item({ snapshotId: "later", capturedAt: "2026-06-15T10:00:00Z" });

    expect(selectPreferredHistorySnapshot([earlier, later]).snapshotId).toBe("later");
  });

  test("breaks ties on identical capturedAt by snapshotId descending", () => {
    const a = item({ snapshotId: "snap-a", capturedAt: "2026-06-14T10:00:00Z" });
    const b = item({ snapshotId: "snap-b", capturedAt: "2026-06-14T10:00:00Z" });

    expect(selectPreferredHistorySnapshot([a, b]).snapshotId).toBe("snap-b");
  });

  test("returns the only item for a single-snapshot list", () => {
    const only = item({ snapshotId: "only" });
    expect(selectPreferredHistorySnapshot([only]).snapshotId).toBe("only");
  });
});

describe("groupPredictionHistoryItemsByFixture", () => {
  test("groups items by fixtureId while preserving first-seen order", () => {
    const groups = groupPredictionHistoryItemsByFixture([
      item({ snapshotId: "s1", fixtureId: "fixture-b" }),
      item({ snapshotId: "s2", fixtureId: "fixture-a" }),
      item({ snapshotId: "s3", fixtureId: "fixture-b" })
    ]);

    expect(groups.map((g) => g.fixtureId)).toEqual(["fixture-b", "fixture-a"]);
    expect(groups[0]?.totalCount).toBe(2);
    expect(groups[1]?.totalCount).toBe(1);
  });

  test("counts evaluated snapshots within a group independently of total count", () => {
    const evaluation: PredictionHistoryListItem["evaluation"] = {
      evaluationId: "eval-1",
      evaluatedAt: "2026-06-19T22:00:00Z",
      actualScore: { home: 1, away: 0 },
      actualOutcome: "home_win",
      brierScore: 0.2,
      logLoss: 0.4,
      homeGoalAbsoluteError: 0,
      awayGoalAbsoluteError: 0,
      scorelineCorrect: true,
      outcomeCorrect: true
    };

    const groups = groupPredictionHistoryItemsByFixture([
      item({ snapshotId: "s1", fixtureId: "fixture-a", evaluation }),
      item({ snapshotId: "s2", fixtureId: "fixture-a", evaluation: null })
    ]);

    expect(groups[0]?.totalCount).toBe(2);
    expect(groups[0]?.evaluatedCount).toBe(1);
  });

  test("selects the preferred snapshot per group using the same policy as selectPreferredHistorySnapshot", () => {
    const locked = item({ snapshotId: "locked", fixtureId: "fixture-a", snapshotStatus: "pre_match_locked", capturedAt: "2026-06-14T10:00:00Z" });
    const unverified = item({ snapshotId: "unverified", fixtureId: "fixture-a", snapshotStatus: "foundation_unverified", capturedAt: "2026-06-15T10:00:00Z" });

    const groups = groupPredictionHistoryItemsByFixture([unverified, locked]);
    expect(groups[0]?.preferred.snapshotId).toBe("locked");
  });

  test("carries fixture-level fields (teams, group, matchday) from the first snapshot", () => {
    const groups = groupPredictionHistoryItemsByFixture([
      item({ fixtureId: "fixture-a", homeTeam: "Brazil", awayTeam: "Morocco", group: "C", matchday: 2 })
    ]);

    expect(groups[0]).toMatchObject({ homeTeam: "Brazil", awayTeam: "Morocco", group: "C", matchday: 2 });
  });

  test("returns an empty array for an empty item list", () => {
    expect(groupPredictionHistoryItemsByFixture([])).toEqual([]);
  });
});
