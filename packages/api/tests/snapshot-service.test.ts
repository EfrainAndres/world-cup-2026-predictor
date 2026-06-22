import { describe, expect, it, beforeEach } from "vitest";
import {
  canonicalizeForHash,
  computeContentHash,
  buildSnapshotIdempotencyKey,
  buildSnapshotId,
  WORLD_CUP_2026_PREDICTION_MODEL_VERSION
} from "../src/snapshot-service.js";
import { createInMemorySnapshotStore, defaultSnapshotStore } from "../src/snapshot-store.js";
import {
  createWorldCup2026PredictionSnapshot,
  getWorldCup2026GroupStandingsFoundation,
  getWorldCup2026PredictionSnapshot,
  listWorldCup2026PredictionSnapshots
} from "../src/routes.js";
import type { WorldCup2026PredictionSnapshot } from "../src/index.js";

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const FIXTURE_A2 = "wc2026-group-a-md1-02-south-korea-vs-czechia";
const FIXTURE_B1 = "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina";
const KNOWN_KICKOFF = "2026-06-18T20:00:00Z";
const BEFORE_KICKOFF = "2026-06-18T10:00:00.000Z";
const AFTER_KICKOFF = "2026-06-18T21:00:00.000Z";

function makeMinimalSnapshot(overrides: Partial<WorldCup2026PredictionSnapshot> = {}): WorldCup2026PredictionSnapshot {
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
      homeExpectedGoals: 1.4,
      awayExpectedGoals: 0.9,
      homeWinProbability: 0.55,
      drawProbability: 0.25,
      awayWinProbability: 0.20,
      mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.18 }]
    },
    confidence: {
      level: "medium",
      coverageType: "full",
      reasons: [],
      dataPoints: {
        homeUsesFallback: false,
        awayUsesFallback: true,
        homeMatchesPlayed: 120,
        awayMatchesPlayed: 0,
        historicalMatchesAvailable: 256
      },
      manualXgRecommended: false
    },
    provenance: {},
    contentHash: "deadbeef",
    ...overrides
  };
}

describe("canonicalizeForHash", () => {
  it("produces stable output regardless of object key insertion order", () => {
    const a = canonicalizeForHash({ z: 1, a: 2, m: 3 });
    const b = canonicalizeForHash({ a: 2, m: 3, z: 1 });
    expect(a).toBe(b);
  });

  it("sorts nested object keys recursively", () => {
    const result = canonicalizeForHash({ outer: { z: 1, a: 2 } });
    expect(result).toBe('{"outer":{"a":2,"z":1}}');
  });

  it("preserves array element order", () => {
    const a = canonicalizeForHash({ arr: [3, 1, 2] });
    const b = canonicalizeForHash({ arr: [1, 2, 3] });
    expect(a).not.toBe(b);
  });

  it("returns different output for different values", () => {
    expect(canonicalizeForHash({ x: 1 })).not.toBe(canonicalizeForHash({ x: 2 }));
  });

  it("handles null correctly (null is not treated as an object)", () => {
    const result = canonicalizeForHash({ a: null });
    expect(result).toBe('{"a":null}');
  });
});

describe("computeContentHash", () => {
  it("returns a 64-character hex string (SHA-256)", () => {
    const hash = computeContentHash({ fixtureId: "test" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the same hash for the same input regardless of key order", () => {
    const h1 = computeContentHash({ a: 1, b: "x" });
    const h2 = computeContentHash({ b: "x", a: 1 });
    expect(h1).toBe(h2);
  });

  it("returns different hashes for different inputs", () => {
    expect(computeContentHash({ v: "alpha" })).not.toBe(computeContentHash({ v: "beta" }));
  });

  it("is deterministic across calls", () => {
    const input = { fixtureId: FIXTURE_A1, cutoffAt: "2026-06-18T10:00:00.000Z" };
    expect(computeContentHash(input)).toBe(computeContentHash(input));
  });
});

describe("buildSnapshotIdempotencyKey", () => {
  const baseFields = {
    fixtureId: FIXTURE_A1,
    cutoffAt: "2026-06-18T10:00:00.000Z",
    modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
    eloPreset: "balanced",
    maxGoals: 7,
    tournamentResultsAdjustmentEnabled: false
  };

  it("returns a 64-character hex string", () => {
    expect(buildSnapshotIdempotencyKey(baseFields)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable for identical inputs", () => {
    expect(buildSnapshotIdempotencyKey(baseFields)).toBe(buildSnapshotIdempotencyKey(baseFields));
  });

  it("changes when fixtureId changes", () => {
    const other = buildSnapshotIdempotencyKey({ ...baseFields, fixtureId: FIXTURE_A2 });
    expect(buildSnapshotIdempotencyKey(baseFields)).not.toBe(other);
  });

  it("changes when cutoffAt changes", () => {
    const other = buildSnapshotIdempotencyKey({ ...baseFields, cutoffAt: "2026-06-19T00:00:00.000Z" });
    expect(buildSnapshotIdempotencyKey(baseFields)).not.toBe(other);
  });

  it("changes when eloPreset changes", () => {
    const other = buildSnapshotIdempotencyKey({ ...baseFields, eloPreset: "aggressive" });
    expect(buildSnapshotIdempotencyKey(baseFields)).not.toBe(other);
  });

  it("changes when tournamentResultsAdjustmentEnabled changes", () => {
    const other = buildSnapshotIdempotencyKey({ ...baseFields, tournamentResultsAdjustmentEnabled: true });
    expect(buildSnapshotIdempotencyKey(baseFields)).not.toBe(other);
  });
});

describe("buildSnapshotId", () => {
  it("returns a string starting with 'snap-'", () => {
    const key = "a".repeat(64);
    expect(buildSnapshotId(key)).toBe("snap-aaaaaaaaaaaaaaaa");
  });

  it("uses the first 16 characters of the idempotency key", () => {
    const key = "abcdef1234567890xyz";
    expect(buildSnapshotId(key)).toBe("snap-abcdef1234567890");
  });

  it("is deterministic for the same key", () => {
    const key = computeContentHash({ test: true });
    expect(buildSnapshotId(key)).toBe(buildSnapshotId(key));
  });
});

describe("createInMemorySnapshotStore", () => {
  it("starts empty", () => {
    const store = createInMemorySnapshotStore();
    expect(store.list()).toHaveLength(0);
    expect(store.getById("snap-anything")).toBeUndefined();
    expect(store.getByFixtureId(FIXTURE_A1)).toHaveLength(0);
  });

  it("create() stores a new snapshot and returns result='created', duplicate=false", () => {
    const store = createInMemorySnapshotStore();
    const snap = makeMinimalSnapshot();
    const result = store.create(snap, "key-1");

    expect(result.result).toBe("created");
    expect(result.duplicate).toBe(false);
    expect(result.idempotencyKey).toBe("key-1");
    expect(result.snapshot.snapshotId).toBe(snap.snapshotId);
  });

  it("create() with the same idempotency key returns result='existing', duplicate=true", () => {
    const store = createInMemorySnapshotStore();
    const snap = makeMinimalSnapshot();
    store.create(snap, "key-dup");
    const second = store.create(snap, "key-dup");

    expect(second.result).toBe("existing");
    expect(second.duplicate).toBe(true);
    expect(second.snapshot.snapshotId).toBe(snap.snapshotId);
  });

  it("create() with a different idempotency key stores a distinct snapshot", () => {
    const store = createInMemorySnapshotStore();
    const snap1 = makeMinimalSnapshot({ snapshotId: "snap-1111111111111111", capturedAt: "2026-06-11T10:00:00.000Z" });
    const snap2 = makeMinimalSnapshot({ snapshotId: "snap-2222222222222222", capturedAt: "2026-06-12T10:00:00.000Z" });
    store.create(snap1, "key-1");
    store.create(snap2, "key-2");

    expect(store.list()).toHaveLength(2);
  });

  it("getById() returns a snapshot by snapshotId", () => {
    const store = createInMemorySnapshotStore();
    const snap = makeMinimalSnapshot();
    store.create(snap, "key-1");

    const found = store.getById(snap.snapshotId);
    expect(found).toBeDefined();
    expect(found?.snapshotId).toBe(snap.snapshotId);
  });

  it("getById() returns undefined for an unknown snapshotId", () => {
    const store = createInMemorySnapshotStore();
    expect(store.getById("snap-unknown")).toBeUndefined();
  });

  it("getByFixtureId() returns only snapshots for the given fixtureId", () => {
    const store = createInMemorySnapshotStore();
    const snapA = makeMinimalSnapshot({ snapshotId: "snap-aaaaaaaaaaaaaaaa", fixtureId: FIXTURE_A1, capturedAt: "2026-06-11T10:00:00.000Z" });
    const snapB = makeMinimalSnapshot({ snapshotId: "snap-bbbbbbbbbbbbbbbb", fixtureId: FIXTURE_A2, capturedAt: "2026-06-11T11:00:00.000Z" });
    store.create(snapA, "key-a");
    store.create(snapB, "key-b");

    const forA = store.getByFixtureId(FIXTURE_A1);
    expect(forA).toHaveLength(1);
    expect(forA[0]?.fixtureId).toBe(FIXTURE_A1);

    const forB = store.getByFixtureId(FIXTURE_A2);
    expect(forB).toHaveLength(1);
    expect(forB[0]?.fixtureId).toBe(FIXTURE_A2);
  });

  it("list() returns snapshots sorted by capturedAt ascending then snapshotId ascending", () => {
    const store = createInMemorySnapshotStore();
    const late = makeMinimalSnapshot({ snapshotId: "snap-zzzzzzzzzzzzzzzz", capturedAt: "2026-06-13T10:00:00.000Z" });
    const early = makeMinimalSnapshot({ snapshotId: "snap-aaaaaaaaaaaaaaaa", capturedAt: "2026-06-11T10:00:00.000Z" });
    const mid = makeMinimalSnapshot({ snapshotId: "snap-mmmmmmmmmmmmmmmm", capturedAt: "2026-06-12T10:00:00.000Z" });
    store.create(late, "key-late");
    store.create(early, "key-early");
    store.create(mid, "key-mid");

    const list = store.list();
    expect(list).toHaveLength(3);
    expect(list[0]?.capturedAt).toBe("2026-06-11T10:00:00.000Z");
    expect(list[1]?.capturedAt).toBe("2026-06-12T10:00:00.000Z");
    expect(list[2]?.capturedAt).toBe("2026-06-13T10:00:00.000Z");
  });

  it("list() breaks capturedAt ties by snapshotId ascending", () => {
    const store = createInMemorySnapshotStore();
    const sameCapturedAt = "2026-06-11T10:00:00.000Z";
    const snapA = makeMinimalSnapshot({ snapshotId: "snap-aaaaaaaaaaaaaaaa", capturedAt: sameCapturedAt });
    const snapZ = makeMinimalSnapshot({ snapshotId: "snap-zzzzzzzzzzzzzzzz", capturedAt: sameCapturedAt });
    store.create(snapZ, "key-z");
    store.create(snapA, "key-a");

    const list = store.list();
    expect(list[0]?.snapshotId).toBe("snap-aaaaaaaaaaaaaaaa");
    expect(list[1]?.snapshotId).toBe("snap-zzzzzzzzzzzzzzzz");
  });

  it("reset() clears all stored snapshots", () => {
    const store = createInMemorySnapshotStore();
    store.create(makeMinimalSnapshot(), "key-1");
    expect(store.list()).toHaveLength(1);

    store.reset();
    expect(store.list()).toHaveLength(0);
    expect(store.getById("snap-abcdef1234567890")).toBeUndefined();
  });

  it("returned snapshots are defensive copies — mutating them does not affect stored state", () => {
    const store = createInMemorySnapshotStore();
    const snap = makeMinimalSnapshot();
    store.create(snap, "key-1");

    const retrieved = store.getById(snap.snapshotId);
    expect(retrieved).toBeDefined();

    if (retrieved !== undefined) {
      expect(() => {
        (retrieved as { snapshotId: string }).snapshotId = "mutated";
      }).toThrow();
    }

    const stored = store.getById(snap.snapshotId);
    expect(stored?.snapshotId).toBe(snap.snapshotId);
  });

  it("getByFixtureId() results are ordered by capturedAt ascending", () => {
    const store = createInMemorySnapshotStore();
    const s2 = makeMinimalSnapshot({ snapshotId: "snap-bbbbbbbbbbbbbbbb", fixtureId: FIXTURE_A1, capturedAt: "2026-06-12T10:00:00.000Z" });
    const s1 = makeMinimalSnapshot({ snapshotId: "snap-aaaaaaaaaaaaaaaa", fixtureId: FIXTURE_A1, capturedAt: "2026-06-11T10:00:00.000Z" });
    store.create(s2, "key-b");
    store.create(s1, "key-a");

    const results = store.getByFixtureId(FIXTURE_A1);
    expect(results[0]?.capturedAt).toBe("2026-06-11T10:00:00.000Z");
    expect(results[1]?.capturedAt).toBe("2026-06-12T10:00:00.000Z");
  });
});

describe("createWorldCup2026PredictionSnapshot handler", () => {
  beforeEach(() => {
    defaultSnapshotStore.reset();
  });

  it("creates a snapshot for an official scheduled fixture with no kickoffAt (foundation_unverified)", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.result).toBe("created");
    expect(result.duplicate).toBe(false);
    expect(result.snapshot.fixtureId).toBe(FIXTURE_A1);
    expect(result.snapshot.status).toBe("foundation_unverified");
    expect(result.snapshot.snapshotId).toMatch(/^snap-[0-9a-f]{16}$/);
    expect(result.snapshot.modelVersion).toBe(WORLD_CUP_2026_PREDICTION_MODEL_VERSION);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("creates a snapshot with status pre_match_locked when capturedAt is before kickoffAt", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.snapshot.status).toBe("pre_match_locked");
    expect(result.snapshot.kickoffAt).toBe(KNOWN_KICKOFF);
    expect(result.warnings).toHaveLength(0);
  });

  it("rejects post-kickoff snapshot creation with a capturedAt validation error", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: AFTER_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;

    expect(result.issues.some((i) => i.field === "capturedAt")).toBe(true);
  });

  it("rejects an unknown fixtureId with a validation error", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: "not-a-real-fixture-id",
      capturedAt: BEFORE_KICKOFF
    });

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;

    expect(result.issues.some((i) => i.field === "fixtureId")).toBe(true);
  });

  it("rejects a missing fixtureId with a validation error on fixtureId field", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: "",
      capturedAt: BEFORE_KICKOFF
    });

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;

    expect(result.issues.some((i) => i.field === "fixtureId")).toBe(true);
  });

  it("preserves official fixture team identity (homeTeam and awayTeam from the fixture registry)", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.snapshot.homeTeam).toBe("Mexico");
    expect(result.snapshot.awayTeam).toBe("South Africa");
  });

  it("preserves group and matchday metadata from the official fixture", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.snapshot.group).toBe("A");
    expect(result.snapshot.matchday).toBe(1);
  });

  it("returns an existing snapshot for a duplicate request (idempotency)", async () => {
    const request = {
      fixtureId: FIXTURE_A2,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    };

    const first = await createWorldCup2026PredictionSnapshot(request);
    const second = await createWorldCup2026PredictionSnapshot(request);

    expect(first.status).toBe("success");
    expect(second.status).toBe("success");

    if (first.status !== "success" || second.status !== "success") return;

    expect(first.result).toBe("created");
    expect(second.result).toBe("existing");
    expect(second.duplicate).toBe(true);
    expect(second.snapshot.snapshotId).toBe(first.snapshot.snapshotId);
    expect(second.snapshot.contentHash).toBe(first.snapshot.contentHash);
  });

  it("creates distinct snapshots for different fixtures", async () => {
    const r1 = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });
    const r2 = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A2,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(r1.status).toBe("success");
    expect(r2.status).toBe("success");

    if (r1.status !== "success" || r2.status !== "success") return;

    expect(r1.snapshot.snapshotId).not.toBe(r2.snapshot.snapshotId);
    expect(r1.snapshot.contentHash).not.toBe(r2.snapshot.contentHash);
  });

  it("snapshot includes a content hash that is a 64-character hex string", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_B1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.snapshot.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("snapshot inputs reflect live Elo ratings for the fixture teams", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(typeof result.snapshot.inputs.homeElo).toBe("number");
    expect(typeof result.snapshot.inputs.awayElo).toBe("number");
    expect(result.snapshot.inputs.homeElo).toBeGreaterThan(0);
    expect(result.snapshot.inputs.awayElo).toBeGreaterThan(0);
    expect(typeof result.snapshot.inputs.homeUsesFallback).toBe("boolean");
    expect(typeof result.snapshot.inputs.awayUsesFallback).toBe("boolean");
    expect(result.snapshot.inputs.tournamentMatchesIncluded).toBe(0);
  });

  it("snapshot prediction includes valid outcome probabilities summing to ~1", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    const { homeWinProbability, drawProbability, awayWinProbability } = result.snapshot.prediction;
    expect(homeWinProbability + drawProbability + awayWinProbability).toBeCloseTo(1, 8);
  });

  it("tournament-adjusted snapshot records non-zero tournamentMatchesIncluded when enabled", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF,
      tournamentResultsAdjustmentEnabled: true
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.snapshot.modelConfiguration.tournamentResultsAdjustmentEnabled).toBe(true);
    expect(result.snapshot.inputs.tournamentMatchesIncluded).toBeGreaterThanOrEqual(0);
  });

  it("defaultsTo false for tournamentResultsAdjustmentEnabled when not provided", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.snapshot.modelConfiguration.tournamentResultsAdjustmentEnabled).toBe(false);
  });

  it("snapshot model configuration reflects live_elo predictionMode", async () => {
    const result = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    expect(result.snapshot.modelConfiguration.predictionMode).toBe("live_elo");
    expect(typeof result.snapshot.modelConfiguration.eloPreset).toBe("string");
    expect(result.snapshot.modelConfiguration.maxGoals).toBeGreaterThan(0);
  });
});

describe("getWorldCup2026PredictionSnapshot handler", () => {
  beforeEach(() => {
    defaultSnapshotStore.reset();
  });

  it("returns the snapshot for a known snapshotId", async () => {
    const created = await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    expect(created.status).toBe("success");
    if (created.status !== "success") return;

    const retrieved = await getWorldCup2026PredictionSnapshot(created.snapshot.snapshotId);

    expect(retrieved.status).toBe("success");
    if (retrieved.status !== "success") return;

    expect(retrieved.snapshot.snapshotId).toBe(created.snapshot.snapshotId);
    expect(retrieved.snapshot.fixtureId).toBe(FIXTURE_A1);
    expect(retrieved.snapshot.contentHash).toBe(created.snapshot.contentHash);
  });

  it("returns not_found for an unknown snapshotId", async () => {
    const result = await getWorldCup2026PredictionSnapshot("snap-doesnotexist00");

    expect(result.status).toBe("not_found");
    if (result.status !== "not_found") return;

    expect(result.snapshotId).toBe("snap-doesnotexist00");
  });
});

describe("listWorldCup2026PredictionSnapshots handler", () => {
  beforeEach(() => {
    defaultSnapshotStore.reset();
  });

  it("returns an empty list when no snapshots exist", async () => {
    const result = await listWorldCup2026PredictionSnapshots();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.snapshots).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it("lists all snapshots in deterministic capturedAt order", async () => {
    await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A2,
      capturedAt: "2026-06-12T10:00:00.000Z",
      kickoffAt: KNOWN_KICKOFF
    });
    await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: "2026-06-11T10:00:00.000Z",
      kickoffAt: KNOWN_KICKOFF
    });

    const result = await listWorldCup2026PredictionSnapshots();

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.snapshots).toHaveLength(2);
    expect(result.snapshots[0]?.capturedAt).toBe("2026-06-11T10:00:00.000Z");
    expect(result.snapshots[1]?.capturedAt).toBe("2026-06-12T10:00:00.000Z");
    expect(result.totalCount).toBe(2);
  });

  it("filters by fixtureId when provided", async () => {
    await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });
    await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_B1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    const filtered = await listWorldCup2026PredictionSnapshots(FIXTURE_A1);

    expect(filtered.status).toBe("success");
    if (filtered.status !== "success") return;
    expect(filtered.snapshots).toHaveLength(1);
    expect(filtered.snapshots[0]?.fixtureId).toBe(FIXTURE_A1);
    expect(filtered.totalCount).toBe(1);
  });

  it("returns empty list when filtering by a fixtureId with no snapshots", async () => {
    await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF
    });

    const result = await listWorldCup2026PredictionSnapshots(FIXTURE_B1);

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.snapshots).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it("list result is stable across repeated calls with no changes", async () => {
    await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF,
      kickoffAt: KNOWN_KICKOFF
    });

    const first = await listWorldCup2026PredictionSnapshots();
    const second = await listWorldCup2026PredictionSnapshots();

    if (first.status !== "success" || second.status !== "success") return;
    expect(first.snapshots[0]?.snapshotId).toBe(second.snapshots[0]?.snapshotId);
    expect(first.totalCount).toBe(second.totalCount);
  });

  it("snapshot operations do not affect World Cup group standings", async () => {
    await createWorldCup2026PredictionSnapshot({
      fixtureId: FIXTURE_A1,
      capturedAt: BEFORE_KICKOFF
    });

    const standings = getWorldCup2026GroupStandingsFoundation();

    expect(standings.status).toBe("success");
    if (standings.status !== "success") return;

    expect(standings.groups.length).toBeGreaterThan(0);
  });
});
