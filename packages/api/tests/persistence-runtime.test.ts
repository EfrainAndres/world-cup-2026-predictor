import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Sql } from "postgres";
import {
  createWorldCup2026PredictionEvaluation,
  createWorldCup2026PredictionSnapshot,
  defaultPredictionEvaluationStore,
  defaultSnapshotStore,
  getPredictionHistoryPersistenceConfig,
  resolvePredictionHistoryPersistence,
  shutdownPredictionHistoryPersistenceForTests
} from "../src/index.js";

const ORIGINAL_ENV = { ...process.env };

describe("prediction history persistence runtime", () => {
  beforeEach(async () => {
    defaultSnapshotStore.reset();
    defaultPredictionEvaluationStore.reset();
    delete process.env.PERSISTENCE_PROVIDER;
    delete process.env.DATABASE_URL;
    await shutdownPredictionHistoryPersistenceForTests();
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    await shutdownPredictionHistoryPersistenceForTests();
  });

  it("defaults to memory provider when unset", () => {
    expect(getPredictionHistoryPersistenceConfig()).toEqual({
      provider: "memory",
      configuredProvider: "memory",
      persistent: false
    });
  });

  it("accepts an explicit memory provider", () => {
    process.env.PERSISTENCE_PROVIDER = "memory";

    expect(getPredictionHistoryPersistenceConfig()).toEqual({
      provider: "memory",
      configuredProvider: "memory",
      persistent: false
    });
  });

  it("rejects invalid provider values deterministically", () => {
    process.env.PERSISTENCE_PROVIDER = "sqlite";

    expect(() => getPredictionHistoryPersistenceConfig()).toThrow(
      'PERSISTENCE_PROVIDER must be "memory" or "postgres".'
    );
  });

  it("rejects postgres mode without DATABASE_URL", () => {
    process.env.PERSISTENCE_PROVIDER = "postgres";

    expect(() => getPredictionHistoryPersistenceConfig()).toThrow(
      "DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres."
    );
  });

  it("reuses the same memory resolver instance inside one runtime instance", async () => {
    const first = await resolvePredictionHistoryPersistence();
    const second = await resolvePredictionHistoryPersistence();

    expect(first.provider).toBe("memory");
    expect(second.provider).toBe("memory");
    expect(first.snapshotStore).toBe(second.snapshotStore);
    expect(first.evaluationStore).toBe(second.evaluationStore);
    expect(first.metadata).toEqual({
      provider: "memory",
      persistent: false,
      configuredProvider: "memory"
    });
  });

  it("calls the SQL client factory only once and shares the client across postgres-backed stores", async () => {
    process.env.PERSISTENCE_PROVIDER = "postgres";
    process.env.DATABASE_URL = "postgresql://example.test:5432/wc2026";

    let factoryCalls = 0;
    const fakeSql = { end: async () => undefined } as unknown as Sql;
    const sqlFactory = () => {
      factoryCalls += 1;
      return fakeSql;
    };

    const first = await resolvePredictionHistoryPersistence({ sqlFactory });
    const second = await resolvePredictionHistoryPersistence({ sqlFactory });

    expect(first.provider).toBe("postgres");
    expect(second.provider).toBe("postgres");
    expect(first.snapshotStore).toBe(second.snapshotStore);
    expect(first.evaluationStore).toBe(second.evaluationStore);
    expect(factoryCalls).toBe(1);
  });

  it("snapshot handlers use the selected memory store and preserve deterministic ids", async () => {
    const created = await createWorldCup2026PredictionSnapshot({
      fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
      capturedAt: "2026-06-11T10:00:00.000Z",
      kickoffAt: "2026-06-11T18:00:00.000Z"
    });

    expect(created.status).toBe("success");
    if (created.status !== "success") {
      return;
    }

    expect(defaultSnapshotStore.getById(created.snapshot.snapshotId)?.contentHash).toBe(
      created.snapshot.contentHash
    );
    expect(created.persistenceMetadata).toEqual({
      provider: "memory",
      persistent: false,
      configuredProvider: "memory"
    });
  });

  it("evaluation handlers use the selected memory store and keep summary-compatible outputs", async () => {
    const snapshotCreated = await createWorldCup2026PredictionSnapshot({
      fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
      capturedAt: "2026-06-11T10:00:00.000Z",
      kickoffAt: "2026-06-11T18:00:00.000Z"
    });

    expect(snapshotCreated.status).toBe("success");
    if (snapshotCreated.status !== "success") {
      return;
    }

    const evaluationCreated = await createWorldCup2026PredictionEvaluation({
      snapshotId: snapshotCreated.snapshot.snapshotId,
      evaluatedAt: "2026-06-11T22:10:00.000Z"
    });

    expect(evaluationCreated.status).toBe("evaluated");
    if (evaluationCreated.status === "not_eligible" || evaluationCreated.status === "error") {
      return;
    }

    expect(
      defaultPredictionEvaluationStore.getById(evaluationCreated.evaluation.evaluationId)?.metrics
        .brierScore
    ).toBe(evaluationCreated.evaluation.metrics.brierScore);
    expect(JSON.stringify(evaluationCreated)).not.toContain("postgresql://");
  });

  it("memory resolution includes projectionCache", async () => {
    const resolution = await resolvePredictionHistoryPersistence();
    expect(resolution.historyStore).toBeDefined();
    expect(typeof resolution.historyStore.list).toBe("function");
    expect(resolution.projectionCache).toBeDefined();
    expect(typeof resolution.projectionCache.get).toBe("function");
    expect(typeof resolution.projectionCache.set).toBe("function");
    expect(typeof resolution.projectionCache.delete).toBe("function");
  });

  it("projectionCache is referentially stable across repeated memory resolutions", async () => {
    const first = await resolvePredictionHistoryPersistence();
    const second = await resolvePredictionHistoryPersistence();
    expect(first.projectionCache).toBe(second.projectionCache);
  });

  it("postgres resolution includes projectionCache sharing the same SQL client", async () => {
    process.env.PERSISTENCE_PROVIDER = "postgres";
    process.env.DATABASE_URL = "postgresql://example.test:5432/wc2026";

    let factoryCalls = 0;
    const fakeSql = { end: async () => undefined } as unknown as Sql;
    const sqlFactory = () => {
      factoryCalls += 1;
      return fakeSql;
    };

    const resolution = await resolvePredictionHistoryPersistence({ sqlFactory });

    expect(resolution.historyStore).toBeDefined();
    expect(typeof resolution.historyStore.list).toBe("function");
    expect(resolution.projectionCache).toBeDefined();
    expect(typeof resolution.projectionCache.get).toBe("function");
    // SQL factory was called only once (shared client).
    expect(factoryCalls).toBe(1);
  });

  it("does not report success when persistence configuration fails", async () => {
    process.env.PERSISTENCE_PROVIDER = "postgres";

    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
      capturedAt: "2026-06-11T10:00:00.000Z",
      kickoffAt: "2026-06-11T18:00:00.000Z"
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      return;
    }

    expect(result.error.code).toBe("missing_database_url");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
  });
});
