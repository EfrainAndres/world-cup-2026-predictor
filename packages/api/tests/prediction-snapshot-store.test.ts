import { describe, expect, it, beforeEach } from "vitest";
import type { WorldCup2026PredictionSnapshot } from "../src/schemas.js";
import { WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "../src/snapshot-service.js";
import type { AsyncPredictionSnapshotStore } from "../src/async-snapshot-store.js";
import { createAsyncInMemorySnapshotStore, SnapshotStorageError, SNAPSHOT_SCHEMA_VERSION } from "../src/async-snapshot-store.js";
import {
  snapshotToInsertParams,
  rowToSnapshot
} from "../src/postgres-snapshot-store.js";
import type { SnapshotInsertParams } from "../src/postgres-snapshot-store.js";
import { CURRENT_FORMULA_VERSION } from "../src/projection-refresh-policy.js";

// ---------------------------------------------------------------------------
// Deterministic test fixtures
// ---------------------------------------------------------------------------

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const FIXTURE_B1 = "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina";
const IDEM_KEY_A1 = "test-idempotency-key-a1-abcdef1234567890";
const IDEM_KEY_A1_ALT = "test-idempotency-key-a1-alternate-001";
const IDEM_KEY_B1 = "test-idempotency-key-b1-abcdef1234567890";

function makeSnapshot(overrides: Partial<WorldCup2026PredictionSnapshot> = {}): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: "snap-abcdef1234567890",
    fixtureId: FIXTURE_A1,
    status: "pre_match_locked",
    capturedAt: "2026-06-11T10:00:00.000Z",
    cutoffAt: "2026-06-11T10:00:00.000Z",
    kickoffAt: "2026-06-11T18:00:00Z",
    group: "A",
    matchday: 1,
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
    modelConfiguration: {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: {
      homeElo: 1650,
      awayElo: 1520,
      homeUsesFallback: false,
      awayUsesFallback: true,
      tournamentMatchesIncluded: 0
    },
    prediction: {
      homeExpectedGoals: 1.5,
      awayExpectedGoals: 1.1,
      homeWinProbability: 0.48,
      drawProbability: 0.26,
      awayWinProbability: 0.26,
      mostLikelyScorelines: [
        { homeGoals: 1, awayGoals: 0, probability: 0.15 },
        { homeGoals: 1, awayGoals: 1, probability: 0.12 }
      ]
    },
    confidence: {
      level: "medium",
      coverageType: "partial",
      reasons: ["away team uses fallback seed rating"],
      dataPoints: {
        homeUsesFallback: false,
        awayUsesFallback: true,
        homeMatchesPlayed: 5,
        awayMatchesPlayed: 4,
        historicalMatchesAvailable: 3
      },
      manualXgRecommended: false
    },
    provenance: { dataCoverage: "partial" },
    contentHash: "abc123contenthash",
    ...overrides
  };
}

function makeSnapshotB(): WorldCup2026PredictionSnapshot {
  return {
    ...makeSnapshot(),
    snapshotId: "snap-bbbbbbbbbbbbbbbb",
    fixtureId: FIXTURE_B1,
    homeTeam: "Canada",
    awayTeam: "Bosnia-Herzegovina",
    contentHash: "def456contenthash",
    capturedAt: "2026-06-12T10:00:00.000Z",
    kickoffAt: "2026-06-12T18:00:00.000Z",
    group: "B"
  };
}

// ---------------------------------------------------------------------------
// Shared adapter contract tests
// ---------------------------------------------------------------------------

export function runSnapshotStoreContractTests(
  storeName: string,
  makeStore: () => Promise<AsyncPredictionSnapshotStore & { reset?(): void | Promise<void> }>
): void {
  describe(`${storeName} — AsyncPredictionSnapshotStore contract`, () => {
    let store: AsyncPredictionSnapshotStore & { reset?(): void | Promise<void> };

    beforeEach(async () => {
      store = await makeStore();
      await store.reset?.();
    });

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    it("create returns result=created on first insert", async () => {
      const snapshot = makeSnapshot();
      const result = await store.create(snapshot, IDEM_KEY_A1);
      expect(result.result).toBe("created");
      expect(result.duplicate).toBe(false);
      expect(result.idempotencyKey).toBe(IDEM_KEY_A1);
      expect(result.snapshot.snapshotId).toBe(snapshot.snapshotId);
    });

    it("create returns result=existing on duplicate idempotency key with same content hash", async () => {
      const snapshot = makeSnapshot();
      await store.create(snapshot, IDEM_KEY_A1);
      const result = await store.create(snapshot, IDEM_KEY_A1);
      expect(result.result).toBe("existing");
      expect(result.duplicate).toBe(true);
      expect(result.snapshot.snapshotId).toBe(snapshot.snapshotId);
    });

    it("create throws SnapshotStorageError(duplicate_conflict) on key collision with different content hash", async () => {
      const snapshot = makeSnapshot();
      const conflicting = makeSnapshot({ contentHash: "different-content-hash" });
      await store.create(snapshot, IDEM_KEY_A1);
      await expect(store.create(conflicting, IDEM_KEY_A1)).rejects.toBeInstanceOf(SnapshotStorageError);
      await expect(store.create(conflicting, IDEM_KEY_A1)).rejects.toMatchObject({ code: "duplicate_conflict" });
    });

    it("create returns defensive copies (mutating result does not affect store)", async () => {
      const snapshot = makeSnapshot();
      const result = await store.create(snapshot, IDEM_KEY_A1);
      (result.snapshot as unknown as Record<string, unknown>)["homeTeam"] = "Mutated";
      const fetched = await store.getById(snapshot.snapshotId);
      expect(fetched?.homeTeam).toBe("Mexico");
    });

    // -----------------------------------------------------------------------
    // getById
    // -----------------------------------------------------------------------

    it("getById returns snapshot after create", async () => {
      const snapshot = makeSnapshot();
      await store.create(snapshot, IDEM_KEY_A1);
      const fetched = await store.getById(snapshot.snapshotId);
      expect(fetched?.snapshotId).toBe(snapshot.snapshotId);
      expect(fetched?.homeTeam).toBe("Mexico");
    });

    it("getById returns null for unknown id", async () => {
      const result = await store.getById("snap-does-not-exist");
      expect(result).toBeNull();
    });

    it("getById returns defensive copy", async () => {
      const snapshot = makeSnapshot();
      await store.create(snapshot, IDEM_KEY_A1);
      const first = await store.getById(snapshot.snapshotId);
      if (first) (first as unknown as Record<string, unknown>)["homeTeam"] = "Mutated";
      const second = await store.getById(snapshot.snapshotId);
      expect(second?.homeTeam).toBe("Mexico");
    });

    // -----------------------------------------------------------------------
    // getByIdempotencyKey
    // -----------------------------------------------------------------------

    it("getByIdempotencyKey returns snapshot after create", async () => {
      const snapshot = makeSnapshot();
      await store.create(snapshot, IDEM_KEY_A1);
      const fetched = await store.getByIdempotencyKey(IDEM_KEY_A1);
      expect(fetched?.snapshotId).toBe(snapshot.snapshotId);
    });

    it("getByIdempotencyKey returns null for unknown key", async () => {
      const result = await store.getByIdempotencyKey("unknown-key-xyz");
      expect(result).toBeNull();
    });

    // -----------------------------------------------------------------------
    // list
    // -----------------------------------------------------------------------

    it("list returns empty array when store is empty", async () => {
      const result = await store.list();
      expect(result).toHaveLength(0);
    });

    it("list returns all snapshots in captured_at ascending order", async () => {
      const snapshotA = makeSnapshot({ capturedAt: "2026-06-11T10:00:00.000Z" });
      const snapshotB = makeSnapshotB(); // capturedAt: "2026-06-12T10:00:00.000Z"
      await store.create(snapshotB, IDEM_KEY_B1);
      await store.create(snapshotA, IDEM_KEY_A1);
      const result = await store.list();
      expect(result).toHaveLength(2);
      expect(result[0]?.snapshotId).toBe(snapshotA.snapshotId);
      expect(result[1]?.snapshotId).toBe(snapshotB.snapshotId);
    });

    it("list breaks capturedAt ties by snapshotId ascending", async () => {
      const s1 = makeSnapshot({ capturedAt: "2026-06-11T10:00:00.000Z", snapshotId: "snap-zzz", contentHash: "hash-zzz" });
      const s2 = makeSnapshot({ capturedAt: "2026-06-11T10:00:00.000Z", snapshotId: "snap-aaa", contentHash: "hash-aaa" });
      await store.create(s1, IDEM_KEY_A1);
      await store.create(s2, IDEM_KEY_A1_ALT);
      const result = await store.list();
      expect(result[0]?.snapshotId).toBe("snap-aaa");
      expect(result[1]?.snapshotId).toBe("snap-zzz");
    });

    // -----------------------------------------------------------------------
    // list — fixture filter
    // -----------------------------------------------------------------------

    it("list with fixtureId filters to matching snapshots", async () => {
      await store.create(makeSnapshot(), IDEM_KEY_A1);
      await store.create(makeSnapshotB(), IDEM_KEY_B1);
      const result = await store.list({ fixtureId: FIXTURE_A1 });
      expect(result).toHaveLength(1);
      expect(result[0]?.fixtureId).toBe(FIXTURE_A1);
    });

    it("list with fixtureId returns empty array when no match", async () => {
      await store.create(makeSnapshot(), IDEM_KEY_A1);
      const result = await store.list({ fixtureId: FIXTURE_B1 });
      expect(result).toHaveLength(0);
    });

    // -----------------------------------------------------------------------
    // list — limit
    // -----------------------------------------------------------------------

    it("list respects the limit parameter", async () => {
      await store.create(makeSnapshot({ capturedAt: "2026-06-11T10:00:00.000Z", snapshotId: "snap-yyy", contentHash: "hash-yyy" }), IDEM_KEY_A1);
      await store.create(makeSnapshotB(), IDEM_KEY_B1);
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
    // deterministic list ordering is stable across multiple calls
    // -----------------------------------------------------------------------

    it("list returns consistent order across repeated calls", async () => {
      await store.create(makeSnapshot(), IDEM_KEY_A1);
      await store.create(makeSnapshotB(), IDEM_KEY_B1);
      const first = await store.list();
      const second = await store.list();
      expect(first.map((s) => s.snapshotId)).toEqual(second.map((s) => s.snapshotId));
    });
  });
}

// ---------------------------------------------------------------------------
// Row mapping unit tests (pure functions — no store instance needed)
// ---------------------------------------------------------------------------

describe("snapshotToInsertParams", () => {
  it("maps required fields correctly", () => {
    const snapshot = makeSnapshot();
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    expect(params.snapshot_id).toBe(snapshot.snapshotId);
    expect(params.fixture_id).toBe(snapshot.fixtureId);
    expect(params.snapshot_status).toBe(snapshot.status);
    expect(params.home_team).toBe(snapshot.homeTeam);
    expect(params.away_team).toBe(snapshot.awayTeam);
    expect(params.model_version).toBe(snapshot.modelVersion);
    expect(params.content_hash).toBe(snapshot.contentHash);
    expect(params.idempotency_key).toBe(IDEM_KEY_A1);
    expect(params.snapshot_schema_version).toBe(SNAPSHOT_SCHEMA_VERSION);
    expect(params.formula_version).toBe(CURRENT_FORMULA_VERSION);
  });

  it("serializes kickoff_at when present", () => {
    const snapshot = makeSnapshot({ kickoffAt: "2026-06-11T18:00:00Z" });
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    expect(params.kickoff_at).toBe("2026-06-11T18:00:00Z");
  });

  it("sets kickoff_at to null when absent", () => {
    const { kickoffAt: _, ...withoutKickoff } = makeSnapshot();
    const snapshot: WorldCup2026PredictionSnapshot = withoutKickoff as WorldCup2026PredictionSnapshot;
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    expect(params.kickoff_at).toBeNull();
  });

  it("serializes group_code and matchday when present", () => {
    const snapshot = makeSnapshot({ group: "A", matchday: 1 });
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    expect(params.group_code).toBe("A");
    expect(params.matchday).toBe(1);
  });

  it("sets group_code and matchday to null when absent", () => {
    const { group: _, matchday: __, ...withoutGroupMatchday } = makeSnapshot();
    const snapshot: WorldCup2026PredictionSnapshot = withoutGroupMatchday as WorldCup2026PredictionSnapshot;
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    expect(params.group_code).toBeNull();
    expect(params.matchday).toBeNull();
  });

  it("prediction_payload is an object containing schemaVersion", () => {
    const snapshot = makeSnapshot();
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    const parsed = params.prediction_payload as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
  });

  it("confidence_payload is an object containing schemaVersion", () => {
    const snapshot = makeSnapshot();
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    const parsed = params.confidence_payload as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
  });

  it("provenance_payload is an object containing schemaVersion", () => {
    const snapshot = makeSnapshot();
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    const parsed = params.provenance_payload as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
  });

  it("does not include database credentials or environment secrets", () => {
    const snapshot = makeSnapshot();
    const params = snapshotToInsertParams(snapshot, IDEM_KEY_A1);
    const allValues = JSON.stringify(params as unknown);
    expect(allValues).not.toContain("DATABASE_URL");
    expect(allValues).not.toContain("password");
    expect(allValues).not.toContain("NEXT_PUBLIC");
  });
});

describe("rowToSnapshot — row deserialization", () => {
  function makeValidParams(): SnapshotInsertParams {
    return snapshotToInsertParams(makeSnapshot(), IDEM_KEY_A1);
  }

  function paramsToRow(params: SnapshotInsertParams): Parameters<typeof rowToSnapshot>[0] {
    return {
      snapshot_id: params.snapshot_id,
      fixture_id: params.fixture_id,
      provider_fixture_id: params.provider_fixture_id,
      snapshot_status: params.snapshot_status,
      captured_at: new Date(params.captured_at),
      cutoff_at: new Date(params.cutoff_at),
      kickoff_at: params.kickoff_at !== null ? new Date(params.kickoff_at) : null,
      group_code: params.group_code,
      matchday: params.matchday,
      home_team: params.home_team,
      away_team: params.away_team,
      model_version: params.model_version,
      formula_version: params.formula_version,
      snapshot_schema_version: params.snapshot_schema_version,
      idempotency_key: params.idempotency_key,
      content_hash: params.content_hash,
      prediction_payload: params.prediction_payload,
      confidence_payload: params.confidence_payload,
      provenance_payload: params.provenance_payload,
      created_at: new Date("2026-06-11T10:01:00.000Z")
    };
  }

  it("round-trips a full snapshot through insert params and row mapping", () => {
    const original = makeSnapshot();
    const params = snapshotToInsertParams(original, IDEM_KEY_A1);
    const row = paramsToRow(params);
    const restored = rowToSnapshot(row);
    expect(restored.snapshotId).toBe(original.snapshotId);
    expect(restored.fixtureId).toBe(original.fixtureId);
    expect(restored.status).toBe(original.status);
    expect(restored.homeTeam).toBe(original.homeTeam);
    expect(restored.awayTeam).toBe(original.awayTeam);
    expect(restored.modelVersion).toBe(original.modelVersion);
    expect(restored.contentHash).toBe(original.contentHash);
    expect(restored.kickoffAt).toBeDefined();
    expect(restored.group).toBe("A");
    expect(restored.matchday).toBe(1);
    expect(restored.prediction.homeWinProbability).toBeCloseTo(0.48);
    expect(restored.confidence.level).toBe("medium");
  });

  it("round-trips a snapshot without optional fields", () => {
    const { kickoffAt: _, group: __, matchday: ___, ...base } = makeSnapshot();
    const original = base as WorldCup2026PredictionSnapshot;
    const params = snapshotToInsertParams(original, IDEM_KEY_A1);
    const row = paramsToRow(params);
    const restored = rowToSnapshot(row);
    expect(restored.kickoffAt).toBeUndefined();
    expect(restored.group).toBeUndefined();
    expect(restored.matchday).toBeUndefined();
  });

  it("parses Date objects from timestamptz columns", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.captured_at = new Date("2026-06-11T10:00:00.000Z");
    const restored = rowToSnapshot(row);
    expect(restored.capturedAt).toBe("2026-06-11T10:00:00.000Z");
  });

  it("throws unsupported_schema_version for unknown snapshot_schema_version", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.snapshot_schema_version = "999";
    expect(() => rowToSnapshot(row)).toThrowError(
      expect.objectContaining({ code: "unsupported_schema_version" })
    );
  });

  it("throws unsupported_schema_version for unknown payload schemaVersion", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    const payload = { ...(params.prediction_payload as Record<string, unknown>) };
    payload["schemaVersion"] = "999";
    row.prediction_payload = payload;
    expect(() => rowToSnapshot(row)).toThrowError(
      expect.objectContaining({ code: "unsupported_schema_version" })
    );
  });

  it("throws invalid_stored_record for non-object prediction_payload", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.prediction_payload = "not-an-object";
    expect(() => rowToSnapshot(row)).toThrowError(
      expect.objectContaining({ code: "invalid_stored_record" })
    );
  });

  it("throws invalid_stored_record for null prediction_payload", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.prediction_payload = null;
    expect(() => rowToSnapshot(row)).toThrowError(
      expect.objectContaining({ code: "invalid_stored_record" })
    );
  });

  it("throws invalid_stored_record for unknown snapshot_status value", () => {
    const params = makeValidParams();
    const row = paramsToRow(params);
    row.snapshot_status = "invalid_status";
    expect(() => rowToSnapshot(row)).toThrowError(
      expect.objectContaining({ code: "invalid_stored_record" })
    );
  });
});

describe("SnapshotStorageError", () => {
  it("has correct name and code", () => {
    const err = new SnapshotStorageError("query_failed", "test error");
    expect(err.name).toBe("SnapshotStorageError");
    expect(err.code).toBe("query_failed");
    expect(err.message).toBe("test error");
  });

  it("instanceof Error", () => {
    const err = new SnapshotStorageError("connection_unavailable", "test");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SnapshotStorageError);
  });

  it("does not leak sensitive details in message", () => {
    const err = new SnapshotStorageError("query_failed", "query failed");
    expect(err.message).not.toContain("DATABASE_URL");
    expect(err.message).not.toContain("password");
  });

  it("supports all error codes", () => {
    const codes: import("../src/async-snapshot-store.js").SnapshotStorageErrorCode[] = [
      "connection_unavailable",
      "migration_missing",
      "duplicate_conflict",
      "invalid_stored_record",
      "unsupported_schema_version",
      "query_failed"
    ];
    for (const code of codes) {
      expect(new SnapshotStorageError(code, "test").code).toBe(code);
    }
  });
});

describe("SNAPSHOT_SCHEMA_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof SNAPSHOT_SCHEMA_VERSION).toBe("string");
    expect(SNAPSHOT_SCHEMA_VERSION.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Run shared contract tests against the in-memory async adapter
// ---------------------------------------------------------------------------

runSnapshotStoreContractTests("in-memory async adapter", async () => {
  return createAsyncInMemorySnapshotStore();
});
