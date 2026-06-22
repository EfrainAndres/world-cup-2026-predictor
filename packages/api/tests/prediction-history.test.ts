import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createWorldCup2026PredictionEvaluation,
  createWorldCup2026PredictionSnapshot,
  defaultPredictionEvaluationStore,
  defaultSnapshotStore,
  listWorldCup2026PredictionHistory,
  shutdownPredictionHistoryPersistenceForTests
} from "../src/index.js";

const ORIGINAL_ENV = { ...process.env };

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const FIXTURE_A2 = "wc2026-group-a-md1-02-south-korea-vs-czechia";
const FIXTURE_B1 = "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina";
const KICKOFF = "2026-06-18T20:00:00.000Z";

async function createSnapshot(input: {
  fixtureId: string;
  capturedAt: string;
  kickoffAt?: string;
}): Promise<string> {
  const result = await createWorldCup2026PredictionSnapshot({
    fixtureId: input.fixtureId,
    capturedAt: input.capturedAt,
    cutoffAt: input.capturedAt,
    ...(input.kickoffAt === undefined ? {} : { kickoffAt: input.kickoffAt })
  });

  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error("Snapshot creation failed in test setup.");
  }

  return result.snapshot.snapshotId;
}

describe("prediction history list handler", () => {
  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, PERSISTENCE_PROVIDER: "memory" };
    defaultSnapshotStore.reset();
    defaultPredictionEvaluationStore.reset();
    await shutdownPredictionHistoryPersistenceForTests();
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    defaultSnapshotStore.reset();
    defaultPredictionEvaluationStore.reset();
    await shutdownPredictionHistoryPersistenceForTests();
  });

  it("returns defaults, summary counts, and evaluation joins", async () => {
    const evaluatedSnapshotId = await createSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: "2026-06-11T10:00:00.000Z",
      kickoffAt: KICKOFF
    });
    await createSnapshot({
      fixtureId: FIXTURE_A2,
      capturedAt: "2026-06-12T10:00:00.000Z",
      kickoffAt: KICKOFF
    });

    const evaluation = await createWorldCup2026PredictionEvaluation({
      snapshotId: evaluatedSnapshotId,
      evaluatedAt: "2026-06-18T22:15:00.000Z"
    });

    expect(evaluation.status).toBe("evaluated");

    const result = await listWorldCup2026PredictionHistory();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false
    });
    expect(result.filters).toEqual({
      group: null,
      team: null,
      fixtureId: null,
      status: null,
      evaluationState: "all",
      sort: "captured_desc"
    });
    expect(result.summary.totalSnapshots).toBe(2);
    expect(result.summary.evaluatedSnapshots).toBe(1);
    expect(result.summary.pendingSnapshots).toBe(1);
    expect(result.summary.averageBrierScore).toBeGreaterThan(0);
    expect(result.items[0]?.fixtureId).toBe(FIXTURE_A2);
    expect(result.items[1]?.fixtureId).toBe(FIXTURE_A1);
    expect(result.items[1]?.evaluation?.evaluationId).toBeDefined();
    expect(result.items[1]?.evaluation?.actualScore).toEqual({ home: 2, away: 0 });
    const outcomeAccuracy = result.items[1]?.evaluation?.outcomeCorrect ? 1 : 0;
    const exactScoreAccuracy = result.items[1]?.evaluation?.scorelineCorrect ? 1 : 0;
    expect(result.summary.outcomeAccuracy).toBe(outcomeAccuracy);
    expect(result.summary.exactScoreAccuracy).toBe(exactScoreAccuracy);
  });

  it("filters by group, team, fixtureId, status, and evaluation state", async () => {
    const fixtureAId = await createSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: "2026-06-11T10:00:00.000Z",
      kickoffAt: KICKOFF
    });
    await createSnapshot({
      fixtureId: FIXTURE_A2,
      capturedAt: "2026-06-12T10:00:00.000Z"
    });
    await createSnapshot({
      fixtureId: FIXTURE_B1,
      capturedAt: "2026-06-13T10:00:00.000Z",
      kickoffAt: KICKOFF
    });

    await createWorldCup2026PredictionEvaluation({
      snapshotId: fixtureAId,
      evaluatedAt: "2026-06-18T22:15:00.000Z"
    });

    const groupOnly = await listWorldCup2026PredictionHistory({ group: "A" });
    expect(groupOnly.status).toBe("success");
    if (groupOnly.status === "success") {
      expect(groupOnly.items).toHaveLength(2);
      expect(groupOnly.summary.totalSnapshots).toBe(2);
    }

    const teamOnly = await listWorldCup2026PredictionHistory({ team: "mexico" });
    expect(teamOnly.status).toBe("success");
    if (teamOnly.status === "success") {
      expect(teamOnly.items).toHaveLength(1);
      expect(teamOnly.items[0]?.homeTeam).toBe("Mexico");
    }

    const fixtureOnly = await listWorldCup2026PredictionHistory({ fixtureId: FIXTURE_B1 });
    expect(fixtureOnly.status).toBe("success");
    if (fixtureOnly.status === "success") {
      expect(fixtureOnly.items).toHaveLength(1);
      expect(fixtureOnly.items[0]?.fixtureId).toBe(FIXTURE_B1);
    }

    const statusOnly = await listWorldCup2026PredictionHistory({
      status: "foundation_unverified"
    });
    expect(statusOnly.status).toBe("success");
    if (statusOnly.status === "success") {
      expect(statusOnly.items).toHaveLength(1);
      expect(statusOnly.items[0]?.snapshotStatus).toBe("foundation_unverified");
    }

    const evaluatedOnly = await listWorldCup2026PredictionHistory({
      evaluationState: "evaluated"
    });
    expect(evaluatedOnly.status).toBe("success");
    if (evaluatedOnly.status === "success") {
      expect(evaluatedOnly.items).toHaveLength(1);
      expect(evaluatedOnly.items[0]?.evaluation).not.toBeNull();
    }

    const pendingOnly = await listWorldCup2026PredictionHistory({
      evaluationState: "pending"
    });
    expect(pendingOnly.status).toBe("success");
    if (pendingOnly.status === "success") {
      expect(pendingOnly.items).toHaveLength(2);
      expect(pendingOnly.items.every((item) => item.evaluation === null)).toBe(true);
    }
  });

  it("applies page, pageSize, and deterministic ascending captured sorting", async () => {
    for (let index = 0; index < 12; index += 1) {
      await createSnapshot({
        fixtureId: index % 2 === 0 ? FIXTURE_A1 : FIXTURE_A2,
        capturedAt: `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
        kickoffAt: KICKOFF
      });
    }

    const result = await listWorldCup2026PredictionHistory({
      page: 2,
      pageSize: 10,
      sort: "captured_asc"
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.items).toHaveLength(2);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.pageSize).toBe(10);
    expect(result.pagination.totalItems).toBe(12);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.pagination.hasPreviousPage).toBe(true);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.items[0]?.capturedAt).toBe("2026-06-11T10:00:00.000Z");
    expect(result.items[1]?.capturedAt).toBe("2026-06-12T10:00:00.000Z");
  });

  it("returns validation errors for invalid query values", async () => {
    const result = await listWorldCup2026PredictionHistory({
      group: "Z",
      status: "scheduled" as never,
      evaluationState: "maybe" as never,
      page: 0,
      pageSize: 30,
      sort: "random" as never
    });

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;

    expect(result.issues.map((issue) => issue.field)).toEqual([
      "group",
      "status",
      "evaluationState",
      "page",
      "pageSize",
      "sort"
    ]);
  });

  it("returns an empty filtered result without failing", async () => {
    const result = await listWorldCup2026PredictionHistory({ group: "L" });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.items).toEqual([]);
    expect(result.summary).toEqual({
      totalSnapshots: 0,
      evaluatedSnapshots: 0,
      pendingSnapshots: 0,
      outcomeAccuracy: null,
      exactScoreAccuracy: null,
      averageBrierScore: null
    });
  });

  it("returns sanitized persistence configuration failures", async () => {
    process.env.PERSISTENCE_PROVIDER = "postgres";
    delete process.env.DATABASE_URL;
    await shutdownPredictionHistoryPersistenceForTests();

    const result = await listWorldCup2026PredictionHistory();

    expect(result.status).toBe("error");
    if (result.status !== "error") return;

    expect(result.error.code).toBe("missing_database_url");
    expect(result.error.message).toContain("server-side database connection string");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("postgresql://");
  });
});
