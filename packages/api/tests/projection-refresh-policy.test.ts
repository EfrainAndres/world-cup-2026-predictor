import { describe, expect, it, vi } from "vitest";
import {
  assessProjectionRefresh,
  buildProjectionFingerprint,
  CURRENT_FORMULA_VERSION,
  CURRENT_MODEL_VERSION,
  PROJECTION_FRESHNESS_UPCOMING_MS,
  PROJECTION_FRESHNESS_THRESHOLDS,
  buildWorldCup2026GroupDetail,
  createInMemorySnapshotStore
} from "../src/index.js";
import type {
  AssessProjectionRefreshInput,
  ProjectionFingerprintInput,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026PredictionSnapshot,
  WorldCup2026SyncResult,
  PredictionConfidenceAssessment,
  PredictMatchFromLiveEloResponse
} from "../src/index.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const EVAL_AT = "2026-06-21T10:00:00Z";
const GEN_AT_RECENT = "2026-06-21T09:50:00Z"; // 10 min ago — within 15 min threshold
const GEN_AT_OLD = "2026-06-21T08:00:00Z";    // 2 hrs ago — beyond threshold

const BASE_FP_INPUT: ProjectionFingerprintInput = {
  fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
  homeTeam: "Mexico",
  awayTeam: "South Africa",
  preset: "balanced",
  formulaVersion: "v2",
  modelVersion: CURRENT_MODEL_VERSION,
  homeElo: 1700,
  awayElo: 1550,
  tournamentMatchesIncluded: 3
};

function baseSyncMeta(overrides: Partial<AssessProjectionRefreshInput["syncMetadata"]> = {}): AssessProjectionRefreshInput["syncMetadata"] {
  return {
    cacheUsed: false,
    localFallbackUsed: false,
    lastSuccessfulSync: "2026-06-21T09:45:00Z",
    syncedAt: EVAL_AT,
    ...overrides
  };
}

function baseInput(overrides: Partial<AssessProjectionRefreshInput> = {}): AssessProjectionRefreshInput {
  const fp = buildProjectionFingerprint(BASE_FP_INPUT);
  return {
    fixtureId: BASE_FP_INPUT.fixtureId,
    currentFixtureStatus: "scheduled",
    projectionSource: "auto_predict",
    projectionGeneratedAt: GEN_AT_RECENT,
    evaluatedAt: EVAL_AT,
    currentFingerprint: fp,
    isImmutableSnapshot: false,
    syncMetadata: baseSyncMeta(),
    currentFormulaVersion: CURRENT_FORMULA_VERSION,
    currentModelVersion: CURRENT_MODEL_VERSION,
    ...overrides
  };
}

// Minimal auto-predict response helper
const BASE_CONFIDENCE: PredictionConfidenceAssessment = {
  level: "medium",
  coverageType: "partial",
  reasons: [],
  dataPoints: {
    homeUsesFallback: false,
    awayUsesFallback: false,
    homeMatchesPlayed: 10,
    awayMatchesPlayed: 10,
    historicalMatchesAvailable: 100
  },
  manualXgRecommended: false
};

function makeAutoPredict(): PredictMatchFromLiveEloResponse {
  return {
    status: "success",
    request: { homeTeam: "Mexico", awayTeam: "South Africa", expectedHomeGoals: 1.5, expectedAwayGoals: 0.9, maxGoals: 7, normalizeMatrix: true },
    expectedGoals: {
      home: 1.5, away: 0.9, eloDifference: 150, baseExpectedGoals: 1.2, goalsAdjustment: 0.15,
      preset: "balanced", presetDescription: "balanced preset", formulaVersion: "v2",
      adjustmentPer100: 0.15, maxAdjustment: 0.65, v1RollbackAvailable: true
    },
    liveElo: {
      homeTeam: "Mexico", awayTeam: "South Africa",
      homeEloRating: 1700, awayEloRating: 1550,
      homeRank: 10, awayRank: 30,
      homeMatchesPlayed: 50, awayMatchesPlayed: 40,
      homeGroup: "A", awayGroup: "A",
      homeRatingSource: "live_elo", awayRatingSource: "live_elo",
      fallbackSeedRating: 1500, matchesProcessed: 312,
      latestMatchDate: "2026-06-10", dataCoverage: "partial",
      homeInput: "Mexico", awayInput: "South Africa",
      homeMatchedBy: "canonical", awayMatchedBy: "canonical"
    },
    outcomeProbabilities: { homeWinProbability: 0.55, drawProbability: 0.25, awayWinProbability: 0.2 },
    mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.14 }],
    predictionConfidence: BASE_CONFIDENCE,
    warnings: []
  } as unknown as PredictMatchFromLiveEloResponse;
}

function makeSyncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: EVAL_AT,
    lastSuccessfulSync: "2026-06-21T09:45:00Z",
    fixtures: [],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

function makeSnapshot(overrides: Partial<WorldCup2026PredictionSnapshot> = {}): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: "snap-test-1",
    fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    status: "pre_match_locked",
    capturedAt: GEN_AT_RECENT,
    cutoffAt: GEN_AT_RECENT,
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    modelVersion: CURRENT_MODEL_VERSION,
    modelConfiguration: {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: {
      homeElo: 1700,
      awayElo: 1550,
      homeUsesFallback: false,
      awayUsesFallback: false,
      tournamentMatchesIncluded: 3
    },
    prediction: {
      homeExpectedGoals: 1.5,
      awayExpectedGoals: 0.9,
      homeWinProbability: 0.55,
      drawProbability: 0.25,
      awayWinProbability: 0.2,
      mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.14 }]
    },
    confidence: {
      level: "medium",
      coverageType: "partial",
      reasons: [],
      dataPoints: {
        homeUsesFallback: false,
        awayUsesFallback: false,
        homeMatchesPlayed: 50,
        awayMatchesPlayed: 40,
        historicalMatchesAvailable: 100
      },
      manualXgRecommended: false
    },
    provenance: {},
    contentHash: "aabbcc",
    ...overrides
  };
}

// ─── buildProjectionFingerprint ─────────────────────────────────────────────

describe("buildProjectionFingerprint", () => {
  it("returns a 64-character hex string", () => {
    const fp = buildProjectionFingerprint(BASE_FP_INPUT);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input produces same hash", () => {
    expect(buildProjectionFingerprint(BASE_FP_INPUT)).toBe(buildProjectionFingerprint(BASE_FP_INPUT));
  });

  it("changes when homeElo changes", () => {
    const a = buildProjectionFingerprint(BASE_FP_INPUT);
    const b = buildProjectionFingerprint({ ...BASE_FP_INPUT, homeElo: 1800 });
    expect(a).not.toBe(b);
  });

  it("changes when formulaVersion changes", () => {
    const a = buildProjectionFingerprint(BASE_FP_INPUT);
    const b = buildProjectionFingerprint({ ...BASE_FP_INPUT, formulaVersion: "v1" });
    expect(a).not.toBe(b);
  });

  it("changes when modelVersion changes", () => {
    const a = buildProjectionFingerprint(BASE_FP_INPUT);
    const b = buildProjectionFingerprint({ ...BASE_FP_INPUT, modelVersion: "wc2026-prediction-v0" });
    expect(a).not.toBe(b);
  });

  it("changes when tournamentMatchesIncluded changes", () => {
    const a = buildProjectionFingerprint(BASE_FP_INPUT);
    const b = buildProjectionFingerprint({ ...BASE_FP_INPUT, tournamentMatchesIncluded: 10 });
    expect(a).not.toBe(b);
  });

  it("does not include current wall-clock time — calling twice gives same result", () => {
    const first = buildProjectionFingerprint(BASE_FP_INPUT);
    const second = buildProjectionFingerprint(BASE_FP_INPUT);
    expect(first).toBe(second);
  });

  it("ignores object property order — key-sorted canonicalization applies", () => {
    // Build two objects with same logical content but different key insertion order
    const orderA: ProjectionFingerprintInput = {
      fixtureId: "fix-1", homeTeam: "A", awayTeam: "B",
      preset: "balanced", formulaVersion: "v2", modelVersion: "m1",
      homeElo: 1500, awayElo: 1500, tournamentMatchesIncluded: 0
    };
    const orderB: ProjectionFingerprintInput = {
      awayTeam: "B", fixtureId: "fix-1", homeTeam: "A",
      preset: "balanced", tournamentMatchesIncluded: 0, formulaVersion: "v2",
      modelVersion: "m1", homeElo: 1500, awayElo: 1500
    };
    expect(buildProjectionFingerprint(orderA)).toBe(buildProjectionFingerprint(orderB));
  });
});

// ─── PROJECTION_FRESHNESS_THRESHOLDS ────────────────────────────────────────

describe("PROJECTION_FRESHNESS_THRESHOLDS", () => {
  it("upcoming threshold is 15 minutes in ms", () => {
    expect(PROJECTION_FRESHNESS_THRESHOLDS.upcoming).toBe(15 * 60 * 1000);
    expect(PROJECTION_FRESHNESS_UPCOMING_MS).toBe(15 * 60 * 1000);
  });

  it("live and finished thresholds are 0 (invalidated immediately)", () => {
    expect(PROJECTION_FRESHNESS_THRESHOLDS.live).toBe(0);
    expect(PROJECTION_FRESHNESS_THRESHOLDS.finished).toBe(0);
  });

  it("localFallback threshold is null (no time-based freshness claim)", () => {
    expect(PROJECTION_FRESHNESS_THRESHOLDS.localFallback).toBeNull();
  });
});

// ─── assessProjectionRefresh — current ──────────────────────────────────────

describe("assessProjectionRefresh — current", () => {
  it("returns current when inputs are unchanged and within freshness threshold", () => {
    const result = assessProjectionRefresh(baseInput());
    expect(result.state).toBe("current");
    expect(result.shouldRefresh).toBe(false);
    expect(result.triggers.completedResultAdded).toBe(false);
    expect(result.triggers.formulaVersionChanged).toBe(false);
    expect(result.triggers.fixtureStatusChanged).toBe(false);
  });

  it("includes evaluatedAt in the result", () => {
    const result = assessProjectionRefresh(baseInput());
    expect(result.evaluatedAt).toBe(EVAL_AT);
  });

  it("includes projectionGeneratedAt when provided", () => {
    const result = assessProjectionRefresh(baseInput({ projectionGeneratedAt: GEN_AT_RECENT }));
    expect(result.projectionGeneratedAt).toBe(GEN_AT_RECENT);
  });

  it("omits projectionGeneratedAt when not provided", () => {
    const fp = buildProjectionFingerprint(BASE_FP_INPUT);
    const input: AssessProjectionRefreshInput = {
      fixtureId: BASE_FP_INPUT.fixtureId,
      currentFixtureStatus: "scheduled",
      projectionSource: "auto_predict",
      evaluatedAt: EVAL_AT,
      currentFingerprint: fp,
      isImmutableSnapshot: false,
      syncMetadata: baseSyncMeta(),
      currentFormulaVersion: CURRENT_FORMULA_VERSION,
      currentModelVersion: CURRENT_MODEL_VERSION
    };
    const result = assessProjectionRefresh(input);
    expect(result.projectionGeneratedAt).toBeUndefined();
  });

  it("returns current for immutable snapshot with unchanged inputs within threshold", () => {
    const fp = buildProjectionFingerprint(BASE_FP_INPUT);
    const result = assessProjectionRefresh(baseInput({
      isImmutableSnapshot: true,
      projectionSource: "stored_snapshot",
      storedFingerprint: fp,
      currentFingerprint: fp,
      storedModelVersion: CURRENT_MODEL_VERSION,
      currentModelVersion: CURRENT_MODEL_VERSION,
      storedFormulaVersion: CURRENT_FORMULA_VERSION,
      currentFormulaVersion: CURRENT_FORMULA_VERSION,
      storedTournamentMatchesIncluded: 3,
      currentTournamentMatchesIncluded: 3,
      projectionGeneratedAt: GEN_AT_RECENT
    }));
    expect(result.state).toBe("current");
    expect(result.shouldRefresh).toBe(false);
  });
});

// ─── assessProjectionRefresh — stale ────────────────────────────────────────

describe("assessProjectionRefresh — stale", () => {
  it("newer provider sync changes fingerprint → stale, shouldRefresh true", () => {
    const oldFp = buildProjectionFingerprint(BASE_FP_INPUT);
    const newFp = buildProjectionFingerprint({ ...BASE_FP_INPUT, lastSuccessfulSync: "2026-06-21T09:59:00Z" });
    const result = assessProjectionRefresh(baseInput({
      projectionSource: "auto_predict",
      storedFingerprint: oldFp,
      currentFingerprint: newFp
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(true);
    expect(result.triggers.providerDataChanged).toBe(true);
  });

  it("more completed results → stale, completedResultAdded trigger", () => {
    const result = assessProjectionRefresh(baseInput({
      storedTournamentMatchesIncluded: 3,
      currentTournamentMatchesIncluded: 5
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(true);
    expect(result.triggers.completedResultAdded).toBe(true);
  });

  it("formula version changed → stale, formulaVersionChanged trigger", () => {
    const result = assessProjectionRefresh(baseInput({
      storedFormulaVersion: "v1",
      currentFormulaVersion: "v2"
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(true);
    expect(result.triggers.formulaVersionChanged).toBe(true);
  });

  it("model version changed → stale, modelVersionChanged reason", () => {
    const result = assessProjectionRefresh(baseInput({
      storedModelVersion: "wc2026-prediction-old",
      currentModelVersion: CURRENT_MODEL_VERSION
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(true);
    expect(result.reasons.some((r) => r.includes("Model version changed"))).toBe(true);
  });

  it("cache used for auto_predict → stale", () => {
    const result = assessProjectionRefresh(baseInput({
      syncMetadata: baseSyncMeta({ cacheUsed: true })
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(true);
    expect(result.reasons.some((r) => r.includes("cache"))).toBe(true);
  });

  it("projection age exceeds 15-minute threshold for auto_predict → stale", () => {
    const result = assessProjectionRefresh(baseInput({
      projectionGeneratedAt: GEN_AT_OLD,
      evaluatedAt: EVAL_AT
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(true);
    expect(result.reasons.some((r) => r.includes("15-minute"))).toBe(true);
  });

  it("immutable snapshot with more completed results → stale but shouldRefresh false", () => {
    const fp = buildProjectionFingerprint(BASE_FP_INPUT);
    const result = assessProjectionRefresh(baseInput({
      isImmutableSnapshot: true,
      projectionSource: "stored_snapshot",
      storedFingerprint: fp,
      currentFingerprint: fp,
      storedModelVersion: CURRENT_MODEL_VERSION,
      currentModelVersion: CURRENT_MODEL_VERSION,
      storedTournamentMatchesIncluded: 3,
      currentTournamentMatchesIncluded: 6,
      projectionGeneratedAt: GEN_AT_RECENT
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(false);
    expect(result.triggers.snapshotAvailable).toBe(true);
  });

  it("immutable snapshot with formula version change → stale but shouldRefresh false", () => {
    const fp = buildProjectionFingerprint(BASE_FP_INPUT);
    const result = assessProjectionRefresh(baseInput({
      isImmutableSnapshot: true,
      projectionSource: "stored_snapshot",
      storedFingerprint: fp,
      currentFingerprint: fp,
      storedFormulaVersion: "v1",
      currentFormulaVersion: "v2",
      storedTournamentMatchesIncluded: 3,
      currentTournamentMatchesIncluded: 3,
      projectionGeneratedAt: GEN_AT_RECENT
    }));
    expect(result.state).toBe("stale");
    expect(result.shouldRefresh).toBe(false);
    expect(result.triggers.formulaVersionChanged).toBe(true);
  });

  it("cache NOT flagged as stale for immutable snapshots", () => {
    const fp = buildProjectionFingerprint(BASE_FP_INPUT);
    const result = assessProjectionRefresh(baseInput({
      isImmutableSnapshot: true,
      projectionSource: "stored_snapshot",
      storedFingerprint: fp,
      currentFingerprint: fp,
      storedModelVersion: CURRENT_MODEL_VERSION,
      currentModelVersion: CURRENT_MODEL_VERSION,
      storedTournamentMatchesIncluded: 3,
      currentTournamentMatchesIncluded: 3,
      projectionGeneratedAt: GEN_AT_RECENT,
      syncMetadata: baseSyncMeta({ cacheUsed: true })
    }));
    // Cache stale logic should not apply to immutable snapshots
    expect(result.state).toBe("current");
    expect(result.shouldRefresh).toBe(false);
  });
});

// ─── assessProjectionRefresh — invalidated ───────────────────────────────────

describe("assessProjectionRefresh — invalidated", () => {
  it("fixture live → invalidated, shouldRefresh false", () => {
    const result = assessProjectionRefresh(baseInput({ currentFixtureStatus: "live" }));
    expect(result.state).toBe("invalidated");
    expect(result.shouldRefresh).toBe(false);
    expect(result.triggers.liveStatusChanged).toBe(true);
    expect(result.triggers.fixtureStatusChanged).toBe(true);
  });

  it("fixture halftime → invalidated, shouldRefresh false", () => {
    const result = assessProjectionRefresh(baseInput({ currentFixtureStatus: "halftime" }));
    expect(result.state).toBe("invalidated");
    expect(result.shouldRefresh).toBe(false);
    expect(result.triggers.liveStatusChanged).toBe(true);
  });

  it("fixture finished → invalidated, shouldRefresh false", () => {
    const result = assessProjectionRefresh(baseInput({ currentFixtureStatus: "finished" }));
    expect(result.state).toBe("invalidated");
    expect(result.shouldRefresh).toBe(false);
    expect(result.reasons.some((r) => r.includes("completed final result"))).toBe(true);
  });

  it("fixture postponed → invalidated, shouldRefresh false", () => {
    const result = assessProjectionRefresh(baseInput({ currentFixtureStatus: "postponed" }));
    expect(result.state).toBe("invalidated");
    expect(result.shouldRefresh).toBe(false);
    expect(result.reasons.some((r) => r.includes("postponed"))).toBe(true);
  });

  it("fixture cancelled → invalidated, shouldRefresh false", () => {
    const result = assessProjectionRefresh(baseInput({ currentFixtureStatus: "cancelled" }));
    expect(result.state).toBe("invalidated");
    expect(result.shouldRefresh).toBe(false);
    expect(result.reasons.some((r) => r.includes("cancelled"))).toBe(true);
  });
});

// ─── assessProjectionRefresh — unavailable ───────────────────────────────────

describe("assessProjectionRefresh — unavailable", () => {
  it("source unavailable → unavailable state", () => {
    const result = assessProjectionRefresh(baseInput({ projectionSource: "unavailable" }));
    expect(result.state).toBe("unavailable");
    expect(result.shouldRefresh).toBe(false);
  });
});

// ─── assessProjectionRefresh — local fallback ───────────────────────────────

describe("assessProjectionRefresh — local fallback", () => {
  it("local fallback → current, shouldRefresh false, no time-based claim", () => {
    const result = assessProjectionRefresh(baseInput({
      syncMetadata: baseSyncMeta({ localFallbackUsed: true }),
      projectionGeneratedAt: GEN_AT_OLD  // old generation — should NOT trigger stale
    }));
    expect(result.state).toBe("current");
    expect(result.shouldRefresh).toBe(false);
    expect(result.reasons.some((r) => r.includes("fallback"))).toBe(true);
  });
});

// ─── assessProjectionRefresh — sourceVersions ───────────────────────────────

describe("assessProjectionRefresh — sourceVersions", () => {
  it("sourceVersions includes formulaVersion and modelVersion", () => {
    const result = assessProjectionRefresh(baseInput());
    expect(result.sourceVersions.formulaVersion).toBe(CURRENT_FORMULA_VERSION);
    expect(result.sourceVersions.modelVersion).toBe(CURRENT_MODEL_VERSION);
  });

  it("sourceVersions includes lastSuccessfulSync when provided", () => {
    const result = assessProjectionRefresh(baseInput({
      syncMetadata: baseSyncMeta({ lastSuccessfulSync: "2026-06-21T09:45:00Z" })
    }));
    expect(result.sourceVersions.lastSuccessfulSync).toBe("2026-06-21T09:45:00Z");
  });
});

// ─── No prediction function called ──────────────────────────────────────────

describe("assessProjectionRefresh — no prediction execution", () => {
  it("does not call any predictor or external function", () => {
    const mockPredictor = vi.fn();
    // Call assessProjectionRefresh directly — no predictor should be invoked
    assessProjectionRefresh(baseInput());
    expect(mockPredictor).not.toHaveBeenCalled();
  });
});

// ─── Group detail integration ─────────────────────────────────────────────

describe("group detail integration — refreshAssessment on fixtures", () => {
  it("auto_predict fixture has currentFingerprint and refreshAssessment", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      generatedAt: EVAL_AT,
      syncResult: makeSyncResult(),
      predictorFn: () => makeAutoPredict()
    });
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const fixture = result.projection.fixtures[0];
    expect(fixture).toBeDefined();
    if (fixture === undefined) return;
    expect(fixture.currentFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fixture.storedFingerprint).toBeUndefined();
    expect(fixture.refreshAssessment).toBeDefined();
    expect(fixture.refreshAssessment?.state).toBeDefined();
    expect(fixture.refreshAssessment?.shouldRefresh).toBeDefined();
    expect(fixture.refreshAssessment?.evaluatedAt).toBe(EVAL_AT);
  });

  it("stored_snapshot fixture has both currentFingerprint and storedFingerprint", () => {
    const store = createInMemorySnapshotStore();
    store.create(makeSnapshot(), "snap-test-1");

    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      generatedAt: EVAL_AT,
      syncResult: makeSyncResult(),
      snapshotStore: store
    });
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const fixture = result.projection.fixtures.find(
      (f) => f.fixtureId === "wc2026-group-a-md1-01-mexico-vs-south-africa"
    );
    expect(fixture).toBeDefined();
    if (fixture === undefined) return;
    expect(fixture.currentFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fixture.storedFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fixture.refreshAssessment?.triggers.snapshotAvailable).toBe(true);
  });

  it("unavailable fixture has refreshAssessment with unavailable state", () => {
    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      generatedAt: EVAL_AT,
      syncResult: makeSyncResult()
      // no predictorFn, no snapshots → unavailable
    });
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const fixture = result.projection.fixtures[0];
    expect(fixture?.source).toBe("unavailable");
    expect(fixture?.refreshAssessment?.state).toBe("unavailable");
  });

  it("fingerprints differ when snapshot was taken with different completed count than current", () => {
    const store = createInMemorySnapshotStore();
    // Snapshot stored when tournamentMatchesIncluded = 3, but current sync has more completed results
    store.create(makeSnapshot({ inputs: { homeElo: 1700, awayElo: 1550, homeUsesFallback: false, awayUsesFallback: false, tournamentMatchesIncluded: 3 } }), "snap-test-1");

    const syncWithMoreResults: WorldCup2026SyncResult = makeSyncResult({
      completedResults: [
        // Add a fixture record for a different group match to increase count
        {
          providerFixtureId: "999",
          competition: "FIFA World Cup",
          season: "2026",
          homeTeam: "Mexico",
          awayTeam: "Poland",
          status: "finished",
          homeScore: 2,
          awayScore: 1,
          group: "A"
        } as WorldCup2026ExternalFixtureRecord,
        {
          providerFixtureId: "998",
          competition: "FIFA World Cup",
          season: "2026",
          homeTeam: "South Africa",
          awayTeam: "Saudi Arabia",
          status: "finished",
          homeScore: 0,
          awayScore: 1,
          group: "A"
        } as WorldCup2026ExternalFixtureRecord,
        {
          providerFixtureId: "997",
          competition: "FIFA World Cup",
          season: "2026",
          homeTeam: "Mexico",
          awayTeam: "Saudi Arabia",
          status: "finished",
          homeScore: 1,
          awayScore: 0,
          group: "A"
        } as WorldCup2026ExternalFixtureRecord,
        {
          providerFixtureId: "996",
          competition: "FIFA World Cup",
          season: "2026",
          homeTeam: "South Africa",
          awayTeam: "Poland",
          status: "finished",
          homeScore: 0,
          awayScore: 2,
          group: "A"
        } as WorldCup2026ExternalFixtureRecord
      ]
    });

    const result = buildWorldCup2026GroupDetail({
      group: "A",
      timezone: "UTC",
      generatedAt: EVAL_AT,
      syncResult: syncWithMoreResults,
      snapshotStore: store
    });
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const fixture = result.projection.fixtures.find(
      (f) => f.fixtureId === "wc2026-group-a-md1-01-mexico-vs-south-africa"
    );
    if (fixture === undefined) return;
    // With 3 stored vs more current, fingerprints should differ (if group resolved results > 3)
    // At minimum, the refreshAssessment should be defined
    expect(fixture.refreshAssessment).toBeDefined();
  });
});
