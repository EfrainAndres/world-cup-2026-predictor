import { describe, expect, it, beforeEach } from "vitest";
import type { WorldCup2026PredictionEvaluation } from "../src/schemas.js";
import { WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "../src/snapshot-service.js";
import { WORLD_CUP_2026_EVALUATION_METRIC_VERSION } from "../src/prediction-evaluation-service.js";
import type { AsyncPredictionEvaluationStore } from "../src/async-evaluation-store.js";
import { createAsyncInMemoryEvaluationStore, EVALUATION_SCHEMA_VERSION } from "../src/async-evaluation-store.js";
import { SnapshotStorageError } from "../src/async-snapshot-store.js";
import {
  evaluationToInsertParams,
  rowToEvaluation
} from "../src/postgres-evaluation-store.js";
import type { EvaluationInsertParams } from "../src/postgres-evaluation-store.js";

// ---------------------------------------------------------------------------
// Deterministic test fixtures
// ---------------------------------------------------------------------------

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const FIXTURE_B1 = "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina";
const SNAP_ID_A1 = "snap-abcdef1234567890";
const SNAP_ID_B1 = "snap-bbbbbbbbbbbbbbbb";
const IDEM_A1 = "eval-identity-key-a1-abcdef1234567890";
const IDEM_A1_ALT = "eval-identity-key-a1-alternate000001";
const IDEM_B1 = "eval-identity-key-b1-abcdef1234567890";

function makeEvaluation(overrides: Partial<WorldCup2026PredictionEvaluation> = {}): WorldCup2026PredictionEvaluation {
  return {
    evaluationId: "eval-abcdef1234567890",
    snapshotId: SNAP_ID_A1,
    fixtureId: FIXTURE_A1,
    evaluatedAt: "2026-06-22T10:00:00.000Z",
    modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
    metricVersion: WORLD_CUP_2026_EVALUATION_METRIC_VERSION,
    predicted: {
      homeExpectedGoals: 1.5,
      awayExpectedGoals: 1.1,
      homeWinProbability: 0.48,
      drawProbability: 0.26,
      awayWinProbability: 0.26,
      mostLikelyScorelines: [
        { homeGoals: 1, awayGoals: 0, probability: 0.15 },
        { homeGoals: 1, awayGoals: 1, probability: 0.12 }
      ],
      predictedOutcome: "home_win",
      predictedScoreline: { homeGoals: 1, awayGoals: 0 }
    },
    actual: {
      homeGoals: 2,
      awayGoals: 1,
      outcome: "home_win"
    },
    metrics: {
      outcomeCorrect: true,
      drawCorrect: false,
      exactScoreCorrect: false,
      homeGoalAbsoluteError: 1,
      awayGoalAbsoluteError: 1,
      totalGoalAbsoluteError: 0,
      goalDifferenceAbsoluteError: 0,
      brierScore: 0.18,
      logLoss: 0.73,
      predictedOutcomeProbability: 0.48,
      actualOutcomeProbability: 0.48
    },
    confidence: {
      level: "medium",
      coverageType: "partial",
      fallbackUsed: false
    },
    provenance: {
      snapshotContentHash: "abc123contenthash"
    },
    ...overrides
  };
}

function makeEvaluationB(): WorldCup2026PredictionEvaluation {
  return {
    ...makeEvaluation(),
    evaluationId: "eval-bbbbbbbbbbbbbbbb",
    snapshotId: SNAP_ID_B1,
    fixtureId: FIXTURE_B1,
    evaluatedAt: "2026-06-23T10:00:00.000Z",
    actual: { homeGoals: 1, awayGoals: 1, outcome: "draw" }
  };
}

// ---------------------------------------------------------------------------
// Shared adapter contract tests
// ---------------------------------------------------------------------------

export function runEvaluationStoreContractTests(
  storeName: string,
  makeStore: () => Promise<AsyncPredictionEvaluationStore & {
    reset?(): void;
    registerSnapshotId?: (id: string) => void;
  }>
): void {
  describe(`${storeName} — AsyncPredictionEvaluationStore contract`, () => {
    let store: AsyncPredictionEvaluationStore & {
      reset?(): void;
      registerSnapshotId?: (id: string) => void;
    };

    beforeEach(async () => {
      store = await makeStore();
      store.reset?.();
    });

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    it("create returns result=created on first insert", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const ev = makeEvaluation();
      const result = await store.create(ev, IDEM_A1);
      expect(result.result).toBe("created");
      expect(result.duplicate).toBe(false);
      expect(result.identityKey).toBe(IDEM_A1);
      expect(result.evaluation.evaluationId).toBe(ev.evaluationId);
    });

    it("create returns result=existing on duplicate identity with same evaluation id", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const ev = makeEvaluation();
      await store.create(ev, IDEM_A1);
      const result = await store.create(ev, IDEM_A1);
      expect(result.result).toBe("existing");
      expect(result.duplicate).toBe(true);
    });

    it("create throws SnapshotStorageError(duplicate_conflict) on identity collision with different evaluation id", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const ev = makeEvaluation();
      const conflicting = makeEvaluation({ evaluationId: "eval-conflicting-id-0000" });
      await store.create(ev, IDEM_A1);
      await expect(store.create(conflicting, IDEM_A1)).rejects.toBeInstanceOf(SnapshotStorageError);
      await expect(store.create(conflicting, IDEM_A1)).rejects.toMatchObject({ code: "duplicate_conflict" });
    });

    it("create returns defensive copies", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const ev = makeEvaluation();
      const result = await store.create(ev, IDEM_A1);
      (result.evaluation as unknown as Record<string, unknown>)["fixtureId"] = "mutated";
      const fetched = await store.getById(ev.evaluationId);
      expect(fetched?.fixtureId).toBe(FIXTURE_A1);
    });

    // -----------------------------------------------------------------------
    // getById
    // -----------------------------------------------------------------------

    it("getById returns evaluation after create", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const ev = makeEvaluation();
      await store.create(ev, IDEM_A1);
      const fetched = await store.getById(ev.evaluationId);
      expect(fetched?.evaluationId).toBe(ev.evaluationId);
      expect(fetched?.fixtureId).toBe(FIXTURE_A1);
    });

    it("getById returns null for unknown id", async () => {
      expect(await store.getById("eval-does-not-exist")).toBeNull();
    });

    it("getById returns defensive copy", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const ev = makeEvaluation();
      await store.create(ev, IDEM_A1);
      const first = await store.getById(ev.evaluationId);
      if (first) (first as unknown as Record<string, unknown>)["fixtureId"] = "mutated";
      const second = await store.getById(ev.evaluationId);
      expect(second?.fixtureId).toBe(FIXTURE_A1);
    });

    // -----------------------------------------------------------------------
    // getByIdentity
    // -----------------------------------------------------------------------

    it("getByIdentity returns evaluation after create", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const ev = makeEvaluation();
      await store.create(ev, IDEM_A1);
      const fetched = await store.getByIdentity({
        snapshotId: SNAP_ID_A1,
        resultIdentity: IDEM_A1,
        metricVersion: WORLD_CUP_2026_EVALUATION_METRIC_VERSION
      });
      expect(fetched?.evaluationId).toBe(ev.evaluationId);
    });

    it("getByIdentity returns null for unknown identity", async () => {
      const result = await store.getByIdentity({
        snapshotId: "snap-unknown",
        resultIdentity: "key-unknown",
        metricVersion: "v0"
      });
      expect(result).toBeNull();
    });

    // -----------------------------------------------------------------------
    // list
    // -----------------------------------------------------------------------

    it("list returns empty array when store is empty", async () => {
      expect(await store.list()).toHaveLength(0);
    });

    it("list returns all evaluations ordered by evaluatedAt ascending", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      store.registerSnapshotId?.(SNAP_ID_B1);
      const evA = makeEvaluation({ evaluatedAt: "2026-06-22T10:00:00.000Z" });
      const evB = makeEvaluationB();  // evaluatedAt: "2026-06-23T10:00:00.000Z"
      await store.create(evB, IDEM_B1);
      await store.create(evA, IDEM_A1);
      const result = await store.list();
      expect(result).toHaveLength(2);
      expect(result[0]?.evaluationId).toBe(evA.evaluationId);
      expect(result[1]?.evaluationId).toBe(evB.evaluationId);
    });

    it("list breaks evaluatedAt ties by evaluationId ascending", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      const evZ = makeEvaluation({ evaluationId: "eval-zzz", evaluatedAt: "2026-06-22T10:00:00.000Z" });
      const evA = makeEvaluation({ evaluationId: "eval-aaa", evaluatedAt: "2026-06-22T10:00:00.000Z" });
      await store.create(evZ, IDEM_A1);
      await store.create(evA, IDEM_A1_ALT);
      const result = await store.list();
      expect(result[0]?.evaluationId).toBe("eval-aaa");
      expect(result[1]?.evaluationId).toBe("eval-zzz");
    });

    // -----------------------------------------------------------------------
    // list — snapshotId filter
    // -----------------------------------------------------------------------

    it("list with snapshotId filters to matching evaluations", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      store.registerSnapshotId?.(SNAP_ID_B1);
      await store.create(makeEvaluation(), IDEM_A1);
      await store.create(makeEvaluationB(), IDEM_B1);
      const result = await store.list({ snapshotId: SNAP_ID_A1 });
      expect(result).toHaveLength(1);
      expect(result[0]?.snapshotId).toBe(SNAP_ID_A1);
    });

    // -----------------------------------------------------------------------
    // list — fixtureId filter
    // -----------------------------------------------------------------------

    it("list with fixtureId filters to matching evaluations", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      store.registerSnapshotId?.(SNAP_ID_B1);
      await store.create(makeEvaluation(), IDEM_A1);
      await store.create(makeEvaluationB(), IDEM_B1);
      const result = await store.list({ fixtureId: FIXTURE_A1 });
      expect(result).toHaveLength(1);
      expect(result[0]?.fixtureId).toBe(FIXTURE_A1);
    });

    it("list with fixtureId returns empty array when no match", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      await store.create(makeEvaluation(), IDEM_A1);
      const result = await store.list({ fixtureId: FIXTURE_B1 });
      expect(result).toHaveLength(0);
    });

    // -----------------------------------------------------------------------
    // list — limit
    // -----------------------------------------------------------------------

    it("list respects limit parameter", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      store.registerSnapshotId?.(SNAP_ID_B1);
      await store.create(makeEvaluation(), IDEM_A1);
      await store.create(makeEvaluationB(), IDEM_B1);
      const result = await store.list({ limit: 1 });
      expect(result).toHaveLength(1);
    });

    // -----------------------------------------------------------------------
    // no update / delete interface
    // -----------------------------------------------------------------------

    it("store has no update method", () => {
      expect(typeof (store as unknown as Record<string, unknown>)["update"]).toBe("undefined");
    });

    it("store has no delete method", () => {
      expect(typeof (store as unknown as Record<string, unknown>)["delete"]).toBe("undefined");
    });

    // -----------------------------------------------------------------------
    // stable ordering
    // -----------------------------------------------------------------------

    it("list returns consistent order across repeated calls", async () => {
      store.registerSnapshotId?.(SNAP_ID_A1);
      store.registerSnapshotId?.(SNAP_ID_B1);
      await store.create(makeEvaluation(), IDEM_A1);
      await store.create(makeEvaluationB(), IDEM_B1);
      const first = await store.list();
      const second = await store.list();
      expect(first.map((e) => e.evaluationId)).toEqual(second.map((e) => e.evaluationId));
    });
  });
}

// ---------------------------------------------------------------------------
// Row mapping unit tests
// ---------------------------------------------------------------------------

describe("evaluationToInsertParams", () => {
  it("maps required fields correctly", () => {
    const ev = makeEvaluation();
    const params = evaluationToInsertParams(ev, IDEM_A1);
    expect(params.evaluation_id).toBe(ev.evaluationId);
    expect(params.snapshot_id).toBe(ev.snapshotId);
    expect(params.fixture_id).toBe(ev.fixtureId);
    expect(params.metric_version).toBe(ev.metricVersion);
    expect(params.model_version).toBe(ev.modelVersion);
    expect(params.result_identity).toBe(IDEM_A1);
    expect(params.actual_home_goals).toBe(2);
    expect(params.actual_away_goals).toBe(1);
    expect(params.actual_outcome).toBe("home_win");
    expect(params.evaluation_schema_version).toBe(EVALUATION_SCHEMA_VERSION);
  });

  it("sets provider_fixture_id to null when absent", () => {
    const { providerFixtureId: _, ...base } = makeEvaluation();
    const params = evaluationToInsertParams(base as WorldCup2026PredictionEvaluation, IDEM_A1);
    expect(params.provider_fixture_id).toBeNull();
  });

  it("sets provider_fixture_id when present", () => {
    const ev = makeEvaluation({ providerFixtureId: "provider-123" });
    const params = evaluationToInsertParams(ev, IDEM_A1);
    expect(params.provider_fixture_id).toBe("provider-123");
  });

  it("metrics_payload is valid JSON with schemaVersion", () => {
    const params = evaluationToInsertParams(makeEvaluation(), IDEM_A1);
    const parsed = JSON.parse(params.metrics_payload) as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe(EVALUATION_SCHEMA_VERSION);
  });

  it("confidence_payload is valid JSON with schemaVersion", () => {
    const params = evaluationToInsertParams(makeEvaluation(), IDEM_A1);
    const parsed = JSON.parse(params.confidence_payload) as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe(EVALUATION_SCHEMA_VERSION);
  });

  it("provenance_payload is valid JSON with schemaVersion", () => {
    const params = evaluationToInsertParams(makeEvaluation(), IDEM_A1);
    const parsed = JSON.parse(params.provenance_payload) as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe(EVALUATION_SCHEMA_VERSION);
  });

  it("does not expose secrets or credentials", () => {
    const params = evaluationToInsertParams(makeEvaluation(), IDEM_A1);
    const all = JSON.stringify(params as unknown);
    expect(all).not.toContain("DATABASE_URL");
    expect(all).not.toContain("password");
    expect(all).not.toContain("NEXT_PUBLIC");
  });
});

describe("rowToEvaluation — row deserialization", () => {
  function makeValidParams(): EvaluationInsertParams {
    return evaluationToInsertParams(makeEvaluation(), IDEM_A1);
  }

  type RowInput = Parameters<typeof rowToEvaluation>[0];

  function paramsToRow(params: EvaluationInsertParams): RowInput {
    return {
      evaluation_id: params.evaluation_id,
      snapshot_id: params.snapshot_id,
      fixture_id: params.fixture_id,
      provider_fixture_id: params.provider_fixture_id,
      model_version: params.model_version,
      metric_version: params.metric_version,
      evaluation_schema_version: params.evaluation_schema_version,
      result_identity: params.result_identity,
      evaluated_at: new Date(params.evaluated_at),
      actual_home_goals: params.actual_home_goals,
      actual_away_goals: params.actual_away_goals,
      actual_outcome: params.actual_outcome,
      metrics_payload: JSON.parse(params.metrics_payload) as unknown,
      confidence_payload: JSON.parse(params.confidence_payload) as unknown,
      provenance_payload: JSON.parse(params.provenance_payload) as unknown,
      created_at: new Date("2026-06-22T10:01:00.000Z")
    };
  }

  it("round-trips a full evaluation through insert params and row mapping", () => {
    const original = makeEvaluation();
    const params = evaluationToInsertParams(original, IDEM_A1);
    const row = paramsToRow(params);
    const restored = rowToEvaluation(row);
    expect(restored.evaluationId).toBe(original.evaluationId);
    expect(restored.snapshotId).toBe(original.snapshotId);
    expect(restored.fixtureId).toBe(original.fixtureId);
    expect(restored.metricVersion).toBe(original.metricVersion);
    expect(restored.actual.homeGoals).toBe(2);
    expect(restored.actual.outcome).toBe("home_win");
    expect(restored.metrics.outcomeCorrect).toBe(true);
    expect(restored.metrics.brierScore).toBeCloseTo(0.18);
    expect(restored.confidence.level).toBe("medium");
    expect(restored.provenance.snapshotContentHash).toBe("abc123contenthash");
  });

  it("round-trips evaluation without optional fields", () => {
    const { providerFixtureId: _, ...base } = makeEvaluation();
    const params = evaluationToInsertParams(base as WorldCup2026PredictionEvaluation, IDEM_A1);
    const row = paramsToRow(params);
    const restored = rowToEvaluation(row);
    expect(restored.providerFixtureId).toBeUndefined();
  });

  it("parses Date timestamps from timestamptz columns", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.evaluated_at = new Date("2026-06-22T10:00:00.000Z");
    const restored = rowToEvaluation(row);
    expect(restored.evaluatedAt).toBe("2026-06-22T10:00:00.000Z");
  });

  it("throws unsupported_schema_version for unknown evaluation_schema_version", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.evaluation_schema_version = "999";
    expect(() => rowToEvaluation(row)).toThrowError(
      expect.objectContaining({ code: "unsupported_schema_version" })
    );
  });

  it("throws unsupported_schema_version for unknown payload schemaVersion", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    const payload = JSON.parse(params.metrics_payload) as Record<string, unknown>;
    payload["schemaVersion"] = "999";
    row.metrics_payload = payload;
    expect(() => rowToEvaluation(row)).toThrowError(
      expect.objectContaining({ code: "unsupported_schema_version" })
    );
  });

  it("throws invalid_stored_record for non-object metrics_payload", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.metrics_payload = "not-an-object";
    expect(() => rowToEvaluation(row)).toThrowError(
      expect.objectContaining({ code: "invalid_stored_record" })
    );
  });

  it("throws invalid_stored_record for null metrics_payload", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.metrics_payload = null;
    expect(() => rowToEvaluation(row)).toThrowError(
      expect.objectContaining({ code: "invalid_stored_record" })
    );
  });

  it("throws invalid_stored_record for unknown actual_outcome", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.actual_outcome = "invalid_outcome";
    expect(() => rowToEvaluation(row)).toThrowError(
      expect.objectContaining({ code: "invalid_stored_record" })
    );
  });

  it("throws invalid_stored_record for non-finite brierScore", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    const payload = JSON.parse(params.metrics_payload) as Record<string, unknown>;
    const metrics = payload["metrics"] as Record<string, unknown>;
    metrics["brierScore"] = Number.POSITIVE_INFINITY;
    row.metrics_payload = payload;
    expect(() => rowToEvaluation(row)).toThrowError(
      expect.objectContaining({ code: "invalid_stored_record" })
    );
  });
});

describe("SnapshotStorageError — foreign_key_violation code", () => {
  it("supports foreign_key_violation code", () => {
    const err = new SnapshotStorageError("foreign_key_violation", "snapshot not found");
    expect(err.code).toBe("foreign_key_violation");
    expect(err).toBeInstanceOf(SnapshotStorageError);
  });
});

describe("EVALUATION_SCHEMA_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof EVALUATION_SCHEMA_VERSION).toBe("string");
    expect(EVALUATION_SCHEMA_VERSION.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Run shared contract tests against the in-memory async adapter
// ---------------------------------------------------------------------------

runEvaluationStoreContractTests("in-memory async evaluation adapter", async () => {
  const knownSnapshots = new Set<string>();

  const store = createAsyncInMemoryEvaluationStore({
    snapshotExists: async (id) => knownSnapshots.has(id)
  }) as AsyncPredictionEvaluationStore & {
    reset(): void;
    registerSnapshotId?: (id: string) => void;
  };

  (store as unknown as Record<string, unknown>)["registerSnapshotId"] = (id: string) => {
    knownSnapshots.add(id);
  };

  const originalReset = store.reset.bind(store);
  (store as unknown as Record<string, unknown>)["reset"] = () => {
    originalReset();
    knownSnapshots.clear();
  };

  return store;
});
