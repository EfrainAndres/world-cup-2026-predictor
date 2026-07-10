import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREMATCH_SNAPSHOT_CAPTURE_POLICY,
  PreMatchSnapshotCaptureConfigError,
  PREMATCH_SNAPSHOT_CAPTURE_MAX_GOALS,
  __resetPreMatchSnapshotCaptureRuntimeForTests,
  captureWorldCup2026PreMatchSnapshots,
  createProcessLocalCaptureLock,
  evaluatePreMatchCaptureEligibility,
  getPreMatchSnapshotCaptureStatus,
  resolvePreMatchSnapshotCapturePolicy,
  runScheduledPreMatchSnapshotCapture,
  type PreMatchSnapshotPredictor
} from "../src/prematch-snapshot-capture.js";
import {
  createAsyncInMemorySnapshotStore,
  SnapshotStorageError,
  type AsyncPredictionSnapshotStore
} from "../src/async-snapshot-store.js";
import { buildSnapshotIdempotencyKey, WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "../src/snapshot-service.js";
import { predictMatchFromLiveElo } from "../src/routes.js";
import {
  buildAuditCompletedFixtures,
  runWorldCup2026PredictionUsefulnessAudit
} from "../src/prediction-usefulness-audit.js";
import {
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_LOCAL_STATIC_RESULTS
} from "../src/world-cup-2026-teams.js";
import { resolveWorldCup2026EvidenceFixture } from "../src/world-cup-2026-evidence-fixtures.js";
import type { PredictionHistoryPersistenceResolution } from "../src/persistence-runtime.js";
import type {
  PredictMatchFromLiveEloResponse,
  WorldCup2026ExternalFixtureRecord
} from "../src/schemas.js";

const FIXTURE_A1 = "wc2026-group-a-md1-01-mexico-vs-south-africa";
const FIXTURE_A2 = "wc2026-group-a-md1-02-south-korea-vs-czechia";
const FIXTURE_B1 = "wc2026-group-b-md1-01-canada-vs-bosnia-herzegovina";

const KICKOFF = "2026-06-18T20:00:00.000Z";
const WINDOW_START = "2026-06-17T20:00:00.000Z"; // kickoff − 1440 min
const WINDOW_END = "2026-06-18T19:45:00.000Z"; // kickoff − 15 min
const INSIDE_WINDOW = "2026-06-18T12:00:00.000Z";

function fixtureById(id: string) {
  const fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.id === id);
  if (fixture === undefined) throw new Error(`Missing fixture ${id}`);
  return fixture;
}

interface RecordOverrides {
  status?: WorldCup2026ExternalFixtureRecord["status"];
  /** `null` omits kickoff entirely; omitted uses the default KICKOFF. */
  kickoffAt?: string | null;
  homeScore?: number;
  awayScore?: number;
}

function record(id: string, overrides: RecordOverrides = {}): WorldCup2026ExternalFixtureRecord {
  const fixture = fixtureById(id);
  const kickoffAt = overrides.kickoffAt === undefined ? KICKOFF : overrides.kickoffAt;
  return {
    providerFixtureId: id,
    competition: "FIFA World Cup",
    season: "2026",
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    status: overrides.status ?? "scheduled",
    ...(kickoffAt !== null ? { kickoffAt } : {}),
    ...(overrides.homeScore !== undefined ? { homeScore: overrides.homeScore } : {}),
    ...(overrides.awayScore !== undefined ? { awayScore: overrides.awayScore } : {})
  };
}

function knockoutRecord(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> = {}
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: "fd-qf-france-morocco",
    competition: "FIFA World Cup",
    season: "2026",
    stage: "QUARTER_FINALS",
    matchday: 97,
    kickoffAt: KICKOFF,
    homeTeam: "France",
    awayTeam: "Morocco",
    status: "scheduled",
    ...overrides
  };
}

function makeResolution(
  snapshotStore: AsyncPredictionSnapshotStore,
  provider: "memory" | "postgres" = "memory"
): PredictionHistoryPersistenceResolution {
  return {
    provider,
    snapshotStore,
    metadata: { provider, persistent: provider === "postgres", configuredProvider: provider }
  } as unknown as PredictionHistoryPersistenceResolution;
}

beforeEach(() => {
  __resetPreMatchSnapshotCaptureRuntimeForTests();
});

describe("policy defaults", () => {
  it("uses documented defaults", () => {
    expect(DEFAULT_PREMATCH_SNAPSHOT_CAPTURE_POLICY).toMatchObject({
      enabled: true,
      captureWindowStartsBeforeKickoffMinutes: 1440,
      captureWindowEndsBeforeKickoffMinutes: 15,
      preset: "balanced",
      tournamentResultsAdjustmentEnabled: false,
      tournamentFormAdjustmentEnabled: false
    });
    expect(DEFAULT_PREMATCH_SNAPSHOT_CAPTURE_POLICY.maxFixturesPerRun).toBeGreaterThan(0);
  });

  it("resolves version metadata and maxGoals", () => {
    const policy = resolvePreMatchSnapshotCapturePolicy();
    expect(policy.modelVersion).toBe(WORLD_CUP_2026_PREDICTION_MODEL_VERSION);
    expect(policy.maxGoals).toBe(PREMATCH_SNAPSHOT_CAPTURE_MAX_GOALS);
    expect(policy.policyVersion).toMatch(/^wc2026-prematch-capture-policy/);
  });

  it("rejects an inverted capture window", () => {
    expect(() =>
      resolvePreMatchSnapshotCapturePolicy({
        captureWindowStartsBeforeKickoffMinutes: 10,
        captureWindowEndsBeforeKickoffMinutes: 20
      })
    ).toThrow(PreMatchSnapshotCaptureConfigError);
  });

  it("rejects a non-positive maxFixturesPerRun", () => {
    expect(() => resolvePreMatchSnapshotCapturePolicy({ maxFixturesPerRun: 0 })).toThrow(
      PreMatchSnapshotCaptureConfigError
    );
  });
});

describe("eligibility window boundaries", () => {
  const policy = resolvePreMatchSnapshotCapturePolicy();

  function evalAt(now: string, overrides: Partial<Parameters<typeof evaluatePreMatchCaptureEligibility>[0]> = {}) {
    return evaluatePreMatchCaptureEligibility({
      now,
      kickoffAt: KICKOFF,
      status: "scheduled",
      providerInvalid: false,
      policy,
      ...overrides
    });
  }

  it("is eligible exactly at window start", () => {
    expect(evalAt(WINDOW_START).eligibility).toBe("eligible");
  });

  it("is too_early one millisecond before window start", () => {
    expect(evalAt("2026-06-17T19:59:59.999Z").eligibility).toBe("too_early");
  });

  it("is eligible exactly at window end", () => {
    expect(evalAt(WINDOW_END).eligibility).toBe("eligible");
  });

  it("is window_closed one millisecond after window end", () => {
    expect(evalAt("2026-06-18T19:45:00.001Z").eligibility).toBe("window_closed");
  });

  it("is already_started exactly at kickoff", () => {
    expect(evalAt(KICKOFF).eligibility).toBe("already_started");
  });
});

describe("eligibility status and provider rules", () => {
  const policy = resolvePreMatchSnapshotCapturePolicy();
  const baseInput = {
    now: INSIDE_WINDOW,
    kickoffAt: KICKOFF,
    status: "scheduled" as const,
    providerInvalid: false,
    policy
  };

  it("rejects missing kickoff", () => {
    expect(
      evaluatePreMatchCaptureEligibility({ ...baseInput, kickoffAt: undefined }).eligibility
    ).toBe("missing_kickoff");
  });

  it("rejects finished, live, and halftime as already_started", () => {
    for (const status of ["finished", "live", "halftime"] as const) {
      expect(evaluatePreMatchCaptureEligibility({ ...baseInput, status }).eligibility).toBe(
        "already_started"
      );
    }
  });

  it("rejects postponed and cancelled as unsupported_fixture", () => {
    for (const status of ["postponed", "cancelled", "unknown"] as const) {
      expect(evaluatePreMatchCaptureEligibility({ ...baseInput, status }).eligibility).toBe(
        "unsupported_fixture"
      );
    }
  });

  it("rejects everything when provider data is invalid", () => {
    expect(
      evaluatePreMatchCaptureEligibility({ ...baseInput, status: "scheduled", providerInvalid: true })
        .eligibility
    ).toBe("provider_invalid");
  });
});

describe("capture orchestration (real predictor + memory store)", () => {
  it("captures an eligible upcoming fixture exactly once and is idempotent", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const persistence = makeResolution(store);
    const input = {
      now: INSIDE_WINDOW,
      persistence,
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    };

    const first = await captureWorldCup2026PreMatchSnapshots(input);
    expect(first.captured).toBe(1);
    expect(first.eligibleFixtures).toBe(1);
    expect(first.results[0]?.action).toBe("captured");
    expect(first.results[0]?.snapshotId).toBeDefined();

    const second = await captureWorldCup2026PreMatchSnapshots(input);
    expect(second.captured).toBe(0);
    expect(second.alreadyCaptured).toBe(1);
    expect(second.results[0]?.action).toBe("already_captured");
    expect(second.results[0]?.snapshotId).toBe(first.results[0]?.snapshotId);

    const stored = await store.list();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.status).toBe("pre_match_locked");
  });

  it("captures with a deterministic, stable idempotency identity", async () => {
    const store = createAsyncInMemorySnapshotStore();
    await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });

    const expectedKey = buildSnapshotIdempotencyKey({
      fixtureId: FIXTURE_A1,
      cutoffAt: KICKOFF,
      modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
      eloPreset: "balanced",
      maxGoals: PREMATCH_SNAPSHOT_CAPTURE_MAX_GOALS,
      tournamentResultsAdjustmentEnabled: false
    });

    const matched = await store.getByIdempotencyKey(expectedKey);
    expect(matched).not.toBeNull();
    expect((await store.list())).toHaveLength(1);
  });

  it("never backdates: capturedAt is strictly before kickoff and status is locked", async () => {
    const store = createAsyncInMemorySnapshotStore();
    await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    const [snapshot] = await store.list();
    expect(snapshot).toBeDefined();
    expect(Date.parse(snapshot!.capturedAt)).toBeLessThan(Date.parse(snapshot!.kickoffAt!));
    expect(snapshot!.capturedAt).toBe(INSIDE_WINDOW);
    expect(snapshot!.status).toBe("pre_match_locked");
  });

  it("produces valid (non-NaN, sum-to-one) probabilities in the snapshot", async () => {
    const store = createAsyncInMemorySnapshotStore();
    await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    const [snapshot] = await store.list();
    const p = snapshot!.prediction;
    for (const value of [p.homeWinProbability, p.drawProbability, p.awayWinProbability, p.homeExpectedGoals, p.awayExpectedGoals]) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(p.homeWinProbability + p.drawProbability + p.awayWinProbability).toBeCloseTo(1, 5);
  });

  it("orders results deterministically by kickoff then fixture id", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [
        record(FIXTURE_B1, { kickoffAt: "2026-06-18T20:00:00.000Z" }),
        record(FIXTURE_A1, { kickoffAt: "2026-06-18T17:00:00.000Z" }),
        record(FIXTURE_A2, { kickoffAt: "2026-06-18T20:00:00.000Z" })
      ]
    });
    expect(report.results.map((r) => r.fixtureId)).toEqual([FIXTURE_A1, FIXTURE_A2, FIXTURE_B1]);
  });

  it("honours maxFixturesPerRun, deferring the rest as skipped", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      policy: { maxFixturesPerRun: 1 },
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [
        record(FIXTURE_A1, { kickoffAt: "2026-06-18T17:00:00.000Z" }),
        record(FIXTURE_A2, { kickoffAt: "2026-06-18T18:00:00.000Z" })
      ]
    });
    expect(report.captured).toBe(1);
    expect(report.eligibleFixtures).toBe(2);
    const deferred = report.results.find((r) => r.action === "skipped");
    expect(deferred?.issueCode).toBe("max_fixtures_per_run_reached");
    expect((await store.list())).toHaveLength(1);
  });

  it("records snapshot model configuration metadata", async () => {
    const store = createAsyncInMemorySnapshotStore();
    await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    const [snapshot] = await store.list();
    expect(snapshot!.modelConfiguration).toMatchObject({
      eloPreset: "balanced",
      maxGoals: PREMATCH_SNAPSHOT_CAPTURE_MAX_GOALS,
      tournamentResultsAdjustmentEnabled: false
    });
    expect(snapshot!.modelVersion).toBe(WORLD_CUP_2026_PREDICTION_MODEL_VERSION);
  });
});

describe("dry-run mode", () => {
  it("reports what would be captured and writes nothing", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      dryRun: true,
      persistence: makeResolution(store),
      fixtureRecords: [record(FIXTURE_A1)]
    });
    expect(report.dryRun).toBe(true);
    expect(report.captured).toBe(1);
    expect(report.results[0]?.action).toBe("would_capture");
    expect((await store.list())).toHaveLength(0);
  });

  it("does not require a predictor in dry-run mode", async () => {
    const store = createAsyncInMemorySnapshotStore();
    await expect(
      captureWorldCup2026PreMatchSnapshots({
        now: INSIDE_WINDOW,
        dryRun: true,
        persistence: makeResolution(store),
        fixtureRecords: [record(FIXTURE_A1)]
      })
    ).resolves.toBeDefined();
  });

  it("reports skip reason counts without exposing raw provider details", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      dryRun: true,
      persistence: makeResolution(store),
      fixtureRecords: [
        record(FIXTURE_A1, { status: "finished", homeScore: 1, awayScore: 0 }),
        record(FIXTURE_A2, { kickoffAt: null }),
        {
          providerFixtureId: "external-secret-ish",
          competition: "FIFA World Cup",
          season: "2026",
          stage: "QUARTER_FINALS",
          homeTeam: "Unknown FC",
          awayTeam: "Mystery United",
          status: "scheduled",
          kickoffAt: KICKOFF
        }
      ]
    });

    expect(report.skippedByReason).toMatchObject({
      already_completed: 1,
      invalid_kickoff: 1,
      unresolved_teams: 1
    });
    expect(JSON.stringify(report)).not.toContain("postgres://");
    expect(JSON.stringify(report)).not.toContain("token");
  });
});

describe("provider-backed knockout capture", () => {
  it("treats a scheduled resolved knockout fixture in the capture window as eligible", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      dryRun: true,
      persistence: makeResolution(store),
      fixtureRecords: [knockoutRecord()]
    });

    expect(report.eligibleFixtures).toBe(1);
    expect(report.captured).toBe(1);
    expect(report.skipped).toBe(0);
    expect(report.results[0]).toMatchObject({
      homeTeam: "France",
      awayTeam: "Morocco",
      action: "would_capture"
    });
    expect(report.results[0]?.fixtureId).toMatch(/^wc2026-knockout-quarterfinal-/);
  });

  it("captures a knockout snapshot with deterministic provider-backed identity and no group code", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const resolved = resolveWorldCup2026EvidenceFixture(knockoutRecord());
    expect("issueCode" in resolved).toBe(false);
    if ("issueCode" in resolved) return;

    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [knockoutRecord()]
    });

    expect(report.captured).toBe(1);
    const [snapshot] = await store.list();
    expect(snapshot?.fixtureId).toBe(resolved.fixture.id);
    expect(snapshot?.group).toBeUndefined();
    expect(snapshot?.matchday).toBe(97);
    expect(snapshot?.homeTeam).toBe("France");
    expect(snapshot?.awayTeam).toBe("Morocco");
    expect(Date.parse(snapshot!.capturedAt)).toBeLessThan(Date.parse(snapshot!.kickoffAt!));
  });

  it("does not create retroactive snapshots for completed knockout fixtures", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [
        knockoutRecord({
          status: "finished",
          homeScore: 1,
          awayScore: 0
        })
      ]
    });

    expect(report.captured).toBe(0);
    expect(report.skipped).toBe(1);
    expect(report.skippedByReason.already_completed).toBe(1);
    expect((await store.list())).toHaveLength(0);
  });
});

describe("failure handling without fabrication", () => {
  it("reports a sanitized prediction failure and creates no snapshot", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const failingPredictor: PreMatchSnapshotPredictor = () =>
      ({
        status: "validation_error",
        issues: [{ field: "homeTeam", message: "redacted internal detail" }],
        metadata: { apiVersion: "x", mode: "pure_handlers", serverEnabled: false, databaseEnabled: false, externalServicesEnabled: false, notes: [] }
      }) as unknown as PredictMatchFromLiveEloResponse;

    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: failingPredictor,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    expect(report.failed).toBe(1);
    expect(report.results[0]?.action).toBe("failed");
    expect(report.results[0]?.eligibility).toBe("unresolved_teams");
    expect(report.results[0]?.issueCode).toBe("unresolved_teams");
    expect(JSON.stringify(report)).not.toContain("redacted internal detail");
    expect((await store.list())).toHaveLength(0);
  });

  it("reports a sanitized persistence failure", async () => {
    const failingStore = {
      async getByIdempotencyKey() {
        return null;
      },
      async create() {
        throw new Error("connection string postgres://secret@host");
      },
      async getById() {
        return null;
      },
      async list() {
        return [];
      }
    } as unknown as AsyncPredictionSnapshotStore;

    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(failingStore),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    expect(report.failed).toBe(1);
    expect(report.results[0]?.issueCode).toBe("persistence_failed");
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  it("detects a conflicting snapshot identity as a typed failure", async () => {
    const conflictStore = {
      async getByIdempotencyKey() {
        return null;
      },
      async create() {
        throw new SnapshotStorageError("duplicate_conflict", "idempotency key conflict");
      },
      async getById() {
        return null;
      },
      async list() {
        return [];
      }
    } as unknown as AsyncPredictionSnapshotStore;

    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(conflictStore),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    expect(report.failed).toBe(1);
    expect(report.results[0]?.issueCode).toBe("snapshot_identity_conflict");
  });
});

describe("exclusion reporting", () => {
  it("reports ineligible fixtures without generating predictions", async () => {
    const store = createAsyncInMemorySnapshotStore();
    let predictorCalls = 0;
    const predictor: PreMatchSnapshotPredictor = (req) => {
      predictorCalls += 1;
      return predictMatchFromLiveElo(req);
    };
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor,
      fixtureRecords: [
        record(FIXTURE_A1, { status: "finished", homeScore: 1, awayScore: 0 }),
        record(FIXTURE_A2, { kickoffAt: null })
      ]
    });
    expect(predictorCalls).toBe(0);
    expect(report.captured).toBe(0);
    expect(report.skipped).toBe(2);
    const a1 = report.results.find((r) => r.fixtureId === FIXTURE_A1);
    const a2 = report.results.find((r) => r.fixtureId === FIXTURE_A2);
    expect(a1?.eligibility).toBe("already_started");
    expect(a2?.eligibility).toBe("missing_kickoff");
  });

  it("reports unsupported provider records that are not official fixtures", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const report = await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [
        {
          providerFixtureId: "external-unknown-1",
          competition: "FIFA World Cup",
          season: "2026",
          homeTeam: "Atlantis",
          awayTeam: "El Dorado",
          status: "scheduled",
          kickoffAt: KICKOFF
        }
      ]
    });
    expect(report.skipped).toBe(1);
    expect(report.results[0]?.eligibility).toBe("unsupported_fixture");
    expect(report.results[0]?.issueCode).toBe("unsupported_fixture_stage");
  });
});

describe("scheduler safety", () => {
  it("returns already_running when the lock is held", async () => {
    const held = createProcessLocalCaptureLock();
    await held.acquire();

    const report = await runScheduledPreMatchSnapshotCapture({
      now: INSIDE_WINDOW,
      dryRun: true,
      persistence: makeResolution(createAsyncInMemorySnapshotStore()),
      fixtureRecords: [record(FIXTURE_A1)]
    });
    expect(report.alreadyRunning).toBe(true);
    expect(report.captured).toBe(0);
    await held.release();
  });

  it("requires postgres for non-dry-run scheduled capture", async () => {
    await expect(
      runScheduledPreMatchSnapshotCapture({
        now: INSIDE_WINDOW,
        persistence: makeResolution(createAsyncInMemorySnapshotStore(), "memory"),
        predictor: predictMatchFromLiveElo,
        fixtureRecords: [record(FIXTURE_A1)]
      })
    ).rejects.toBeInstanceOf(PreMatchSnapshotCaptureConfigError);
  });

  it("releases the lock after a successful run", async () => {
    const persistence = makeResolution(createAsyncInMemorySnapshotStore());
    const first = await runScheduledPreMatchSnapshotCapture({
      now: INSIDE_WINDOW,
      dryRun: true,
      persistence,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    expect(first.alreadyRunning).toBe(false);
    const second = await runScheduledPreMatchSnapshotCapture({
      now: INSIDE_WINDOW,
      dryRun: true,
      persistence,
      fixtureRecords: [record(FIXTURE_A1)]
    });
    expect(second.alreadyRunning).toBe(false);
  });
});

describe("operational status", () => {
  it("reports last-run metadata and the next eligible fixture", async () => {
    const store = createAsyncInMemorySnapshotStore();
    await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });

    const status = getPreMatchSnapshotCaptureStatus({
      now: "2026-06-15T00:00:00.000Z",
      fixtureRecords: [record(FIXTURE_A1, { kickoffAt: KICKOFF })],
      schedulerConfigured: true
    });
    expect(status.lastSuccessfulRunAt).toBe(INSIDE_WINDOW);
    expect(status.captured).toBe(1);
    expect(status.persistenceProvider).toBe("memory");
    expect(status.schedulerConfigured).toBe(true);
    expect(status.nextEligibleFixture).toEqual({ fixtureId: FIXTURE_A1, kickoffAt: KICKOFF });
  });
});

describe("audit compatibility", () => {
  it("captures a snapshot that the usefulness audit treats as one eligible prediction", async () => {
    const store = createAsyncInMemorySnapshotStore();
    const fixture = fixtureById(FIXTURE_A1);

    await captureWorldCup2026PreMatchSnapshots({
      now: INSIDE_WINDOW,
      persistence: makeResolution(store),
      predictor: predictMatchFromLiveElo,
      fixtureRecords: [record(FIXTURE_A1)]
    });

    const snapshots = await store.list();
    expect(snapshots).toHaveLength(1);

    const completedFixtures = [
      {
        fixtureId: fixture.id,
        group: fixture.group,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        homeGoals: 2,
        awayGoals: 1
      }
    ];

    const report = runWorldCup2026PredictionUsefulnessAudit({
      generatedAt: "2026-06-30T00:00:00.000Z",
      completedFixtures,
      snapshots
    });

    expect(report.dataset.completedFixtures).toBe(1);
    expect(report.dataset.eligiblePredictions).toBe(1);
  });

  it("keeps buildAuditCompletedFixtures importable for the same dataset path", () => {
    const completed = buildAuditCompletedFixtures(
      WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
      WORLD_CUP_2026_LOCAL_STATIC_RESULTS
    );
    expect(Array.isArray(completed)).toBe(true);
  });
});
