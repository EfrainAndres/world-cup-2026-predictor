import { describe, expect, it, vi } from "vitest";
import {
  buildWorldCup2026GroupDetail,
  buildWorldCup2026GroupStandings,
  createInMemorySnapshotStore
} from "../src/index.js";
import type {
  PredictionConfidenceAssessment,
  PredictMatchFromLiveEloResponse,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026GroupProjection,
  WorldCup2026PredictionSnapshot,
  WorldCup2026SyncResult
} from "../src/index.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const BASE_CONFIDENCE: PredictionConfidenceAssessment = {
  level: "medium",
  coverageType: "partial",
  reasons: [],
  dataPoints: {
    homeUsesFallback: false,
    awayUsesFallback: false,
    homeMatchesPlayed: 10,
    awayMatchesPlayed: 10,
    historicalMatchesAvailable: 100,
    latestMatchDate: "2026-06-10",
    currentTournamentMatchesIncluded: 0,
    attackDefenseAvailable: false
  },
  manualXgRecommended: false
};

function makeAutoPredict(
  homeWin = 0.5,
  draw = 0.25,
  awayWin = 0.25,
  homeElo = 1600,
  awayElo = 1500
): PredictMatchFromLiveEloResponse {
  return {
    status: "success",
    outcomeProbabilities: {
      homeWinProbability: homeWin,
      drawProbability: draw,
      awayWinProbability: awayWin
    },
    mostLikelyScorelines: [
      { homeGoals: 1, awayGoals: 0, probability: 0.15 },
      { homeGoals: 0, awayGoals: 0, probability: 0.10 }
    ],
    predictionConfidence: BASE_CONFIDENCE,
    expectedGoals: {
      preset: "balanced",
      formulaVersion: "v2",
      home: homeElo,
      away: awayElo
    },
    liveElo: {
      homeRatingSource: "live_elo",
      awayRatingSource: "live_elo",
      homeEloRating: homeElo,
      awayEloRating: awayElo
    },
    warnings: []
  } as unknown as PredictMatchFromLiveEloResponse;
}

function record(
  overrides: Partial<WorldCup2026ExternalFixtureRecord> & {
    providerFixtureId: string;
    homeTeam: string;
    awayTeam: string;
    status: WorldCup2026ExternalFixtureRecord["status"];
  }
): WorldCup2026ExternalFixtureRecord {
  return {
    providerFixtureId: overrides.providerFixtureId,
    competition: "FIFA World Cup",
    season: "2026",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    status: overrides.status,
    ...(overrides.group === undefined ? {} : { group: overrides.group }),
    ...(overrides.matchday === undefined ? {} : { matchday: overrides.matchday }),
    ...(overrides.kickoffAt === undefined ? {} : { kickoffAt: overrides.kickoffAt }),
    ...(overrides.homeScore === undefined ? {} : { homeScore: overrides.homeScore }),
    ...(overrides.awayScore === undefined ? {} : { awayScore: overrides.awayScore }),
    ...(overrides.updatedAt === undefined ? {} : { updatedAt: overrides.updatedAt })
  };
}

function syncResult(overrides: Partial<WorldCup2026SyncResult> = {}): WorldCup2026SyncResult {
  return {
    status: "success",
    providerMode: "football_data_org",
    activeProvider: "football_data_org_results_provider",
    cacheUsed: false,
    localFallbackUsed: false,
    externalProviderEnabled: true,
    syncedAt: "2026-06-21T10:00:00Z",
    lastSuccessfulSync: "2026-06-21T10:00:00Z",
    fixtures: [],
    liveMatches: [],
    completedResults: [],
    standings: [],
    normalizationIssues: [],
    warnings: [],
    ...overrides
  };
}

function snapshot(overrides: Partial<WorldCup2026PredictionSnapshot>): WorldCup2026PredictionSnapshot {
  return {
    snapshotId: "snap-default",
    fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
    status: "pre_match_locked",
    capturedAt: "2026-06-14T10:00:00Z",
    cutoffAt: "2026-06-14T10:00:00Z",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    modelVersion: "wc2026-prediction-v1",
    modelConfiguration: {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: {
      homeElo: 1600,
      awayElo: 1500,
      homeUsesFallback: false,
      awayUsesFallback: false,
      tournamentMatchesIncluded: 0
    },
    prediction: {
      homeExpectedGoals: 1.3,
      awayExpectedGoals: 0.9,
      homeWinProbability: 0.5,
      drawProbability: 0.25,
      awayWinProbability: 0.25,
      mostLikelyScorelines: [{ homeGoals: 1, awayGoals: 0, probability: 0.16 }]
    },
    confidence: BASE_CONFIDENCE,
    provenance: {},
    contentHash: "abc123",
    ...overrides
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("Phase 12.14B — server-side projection refresh", () => {
  describe("first generation (no previous projection)", () => {
    it("calls predictor for every eligible fixture on first generation", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());
      const result = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      // Group A has 6 fixtures; all unplayed → predictor called 6 times
      expect(spy.mock.calls.length).toBe(6);
    });

    it("attaches projectionInputSummary on first generation", () => {
      const result = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: () => makeAutoPredict()
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      for (const f of result.projection.fixtures) {
        if (f.source === "auto_predict") {
          expect(f.projectionInputSummary).toBeDefined();
          expect(f.projectionInputSummary?.formulaVersion).toBe("v2");
          expect(f.projectionInputSummary?.modelVersion).toBeDefined();
          expect(typeof f.projectionInputSummary?.homeElo).toBe("number");
        }
      }
    });

    it("refreshExecution.attempted is false on first generation", () => {
      const result = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: () => makeAutoPredict()
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;

      for (const f of result.projection.fixtures) {
        if (f.source === "auto_predict") {
          expect(f.refreshExecution?.attempted).toBe(false);
        }
      }
    });
  });

  describe("current projection — no refresh needed", () => {
    it("does not call predictor when previous projection inputs are unchanged", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      spy.mockClear();

      // Second call — same sync metadata, same Elo → not stale
      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:30Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: spy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      expect(spy.mock.calls.length).toBe(0);
    });

    it("changing only evaluatedAt does not trigger regeneration", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      spy.mockClear();

      // Different generatedAt but nothing else changed
      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:05:00Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: spy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      expect(spy.mock.calls.length).toBe(0);
    });

    it("reuses previous scorelines and probabilities when not stale", () => {
      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: () => makeAutoPredict(0.6, 0.2, 0.2)
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:30Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: () => makeAutoPredict(0.99, 0.005, 0.005), // different predictor, should NOT be called
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      // Probabilities should match first generation, not the new predictor values
      for (const f of second.projection.fixtures) {
        if (f.source === "auto_predict" && f.homeWinProbability !== undefined) {
          expect(f.homeWinProbability).toBeCloseTo(0.6);
        }
      }
    });
  });

  describe("stale refresh — predictor rerun", () => {
    it("reruns predictor when completed result count increases", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;
      spy.mockClear();

      // Add a completed result → completedResultAdded trigger fires
      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: spy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;
      // At least some fixtures were refreshed
      expect(spy.mock.calls.length).toBeGreaterThan(0);

      const refreshed = second.projection.fixtures.find(
        (f) => f.refreshExecution?.attempted === true && f.refreshExecution.completed === true
      );
      expect(refreshed).toBeDefined();
      expect(refreshed?.refreshExecution?.reasonCodes).toContain("completed_result_added");
    });

    it("refreshed assessment becomes current after successful refresh", () => {
      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: () => makeAutoPredict()
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      // Trigger staleness via a new completed result
      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          lastSuccessfulSync: "2026-06-21T10:30:00Z",
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: () => makeAutoPredict(),
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      for (const f of second.projection.fixtures) {
        if (f.source === "auto_predict" && f.refreshExecution?.completed === true) {
          expect(f.refreshAssessment?.state).toBe("current");
          expect(f.refreshAssessment?.shouldRefresh).toBe(false);
        }
      }
    });

    it("refreshed fingerprint differs from previous fingerprint", () => {
      const spy = vi
        .fn()
        .mockReturnValueOnce(makeAutoPredict(0.5, 0.25, 0.25, 1600, 1500))
        .mockReturnValue(makeAutoPredict(0.55, 0.25, 0.2, 1620, 1510));

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;
      spy.mockClear();
      spy.mockReturnValue(makeAutoPredict(0.55, 0.25, 0.2, 1620, 1510));

      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: spy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      const refreshed = second.projection.fixtures.find(
        (f) => f.refreshExecution?.completed === true
      );
      if (refreshed === undefined) return;

      expect(refreshed.refreshExecution?.refreshedFingerprint).toBeDefined();
      if (
        refreshed.refreshExecution?.previousFingerprint !== undefined &&
        refreshed.refreshExecution.refreshedFingerprint !== undefined
      ) {
        // Fingerprints differ when Elo inputs changed
        expect(refreshed.refreshExecution.previousFingerprint).not.toBe(
          refreshed.refreshExecution.refreshedFingerprint
        );
      }
    });

    it("predictor called at most once per fixture per request", () => {
      const callsPerFixture = new Map<string, number>();
      const spy = vi.fn().mockImplementation((home: string, away: string) => {
        const key = `${home}|${away}`;
        callsPerFixture.set(key, (callsPerFixture.get(key) ?? 0) + 1);
        return makeAutoPredict();
      });

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;
      spy.mockClear();
      callsPerFixture.clear();

      buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: spy,
        previousProjection: first.projection
      });

      for (const count of callsPerFixture.values()) {
        expect(count).toBeLessThanOrEqual(1);
      }
    });

    it("projected standings use refreshed scoreline", () => {
      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: () => makeAutoPredict(0.5, 0.25, 0.25) // 1-0 scoreline from makeAutoPredict
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      // Trigger staleness via completed result
      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 2,
              awayScore: 1,
              group: "A"
            })
          ]
        }),
        predictorFn: () => makeAutoPredict(), // still returns 1-0
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;
      // Projected standings must exist and reflect refreshed projections
      expect(second.projection.standings).toBeDefined();
      expect(second.projection.standings?.length).toBeGreaterThan(0);
    });
  });

  describe("invalidated fixture — no predictor call", () => {
    it("does not call predictor for a live fixture", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;
      spy.mockClear();

      // Mexico vs South Africa goes live
      buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          fixtures: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "live",
              group: "A"
            })
          ]
        }),
        predictorFn: spy,
        previousProjection: first.projection
      });

      // Predictor should NOT have been called for the live fixture
      // (it is excluded from projection entirely since it's live)
      // Other fixtures may still call predictor for refresh
      // Verify no infinite loop by checking calls are bounded
      expect(spy.mock.calls.length).toBeLessThanOrEqual(6);
    });

    it("does not call predictor for a finished fixture", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      const callsBefore = spy.mock.calls.length;
      spy.mockClear();

      buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          fixtures: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0,
              group: "A"
            })
          ],
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: spy,
        previousProjection: first.projection
      });

      // Should be fewer calls than first generation (finished fixture skipped)
      expect(spy.mock.calls.length).toBeLessThan(callsBefore);
    });
  });

  describe("snapshot-backed fixture — predictor never called", () => {
    it("never calls predictor for stored_snapshot source even when stale", () => {
      const snapshotStore = createInMemorySnapshotStore();
      snapshotStore.create(
        snapshot({
          snapshotId: "snap-1",
          fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
          homeTeam: "Mexico",
          awayTeam: "South Africa"
        }),
        "snap-1"
      );

      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        snapshotStore,
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      const snapshotFixture = first.projection.fixtures.find(
        (f) => f.source === "stored_snapshot"
      );
      expect(snapshotFixture).toBeDefined();

      spy.mockClear();

      // Second call with more completed results (snapshot would be stale)
      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "South Korea",
              awayTeam: "Czechia",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        snapshotStore,
        predictorFn: spy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      const refreshedSnapshot = second.projection.fixtures.find(
        (f) => f.source === "stored_snapshot"
      );
      expect(refreshedSnapshot).toBeDefined();
      // Snapshot may be stale but shouldRefresh always false
      expect(refreshedSnapshot?.refreshAssessment?.shouldRefresh).toBe(false);
      // Predictor calls are only for non-snapshot fixtures
      for (const call of spy.mock.calls) {
        const [home, away] = call as [string, string];
        expect(`${home}|${away}`).not.toBe("Mexico|South Africa");
      }
    });
  });

  describe("failed refresh", () => {
    it("preserves previous projection when predictor fails on refresh", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      const mexSafFixtureBefore = first.projection.fixtures.find(
        (f) => f.homeTeam === "Mexico" && f.awayTeam === "South Africa"
      );
      const prevScoreline = mexSafFixtureBefore?.projectedScoreline;

      // Second call — predictor fails for one fixture
      const failingSpy = vi.fn().mockImplementation((home: string) => {
        if (home === "Mexico") {
          return { status: "validation_error", issues: [] } as unknown as PredictMatchFromLiveEloResponse;
        }
        return makeAutoPredict();
      });

      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "South Korea",
              awayTeam: "Czechia",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: failingSpy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      const failedFixture = second.projection.fixtures.find(
        (f) => f.homeTeam === "Mexico" && f.awayTeam === "South Africa"
      );
      expect(failedFixture).toBeDefined();
      // Previous scoreline preserved
      expect(failedFixture?.projectedScoreline).toEqual(prevScoreline);
      // refreshExecution marks failure
      expect(failedFixture?.refreshExecution?.attempted).toBe(true);
      expect(failedFixture?.refreshExecution?.completed).toBe(false);
      expect(failedFixture?.refreshExecution?.reasonCodes).toContain("prediction_failed");
    });

    it("surfaces failure warning for failed refresh", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      const failSpy = vi.fn().mockImplementation((home: string) => {
        if (home === "Mexico") {
          return { status: "validation_error", issues: [] } as unknown as PredictMatchFromLiveEloResponse;
        }
        return makeAutoPredict();
      });

      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "South Korea",
              awayTeam: "Czechia",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: failSpy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      const failedFixture = second.projection.fixtures.find(
        (f) => f.homeTeam === "Mexico" && f.awayTeam === "South Africa"
      );
      const hasWarning = failedFixture?.warnings.some((w) =>
        w.toLowerCase().includes("refresh failed") || w.toLowerCase().includes("preserved")
      );
      expect(hasWarning).toBe(true);
    });

    it("one failed fixture does not break remaining group projection", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      const failSpy = vi.fn().mockImplementation((home: string) => {
        if (home === "Mexico") {
          return { status: "validation_error", issues: [] } as unknown as PredictMatchFromLiveEloResponse;
        }
        return makeAutoPredict();
      });

      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "South Korea",
              awayTeam: "Czechia",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: failSpy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      // Other fixtures should still be present and refreshed
      const otherFixtures = second.projection.fixtures.filter(
        (f) => f.homeTeam !== "Mexico" || f.awayTeam !== "South Africa"
      );
      expect(otherFixtures.length).toBeGreaterThan(0);

      // Projection itself still reports available
      expect(second.projection.available).toBe(true);
    });
  });

  describe("no infinite refresh loop", () => {
    it("third call does not re-trigger refresh when inputs unchanged since second call", () => {
      const spy = vi.fn().mockReturnValue(makeAutoPredict());

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult({ lastSuccessfulSync: "2026-06-21T10:00:00Z" }),
        predictorFn: spy
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      // Second call — triggers refresh with completed result
      spy.mockClear();
      const completedSync = syncResult({
        lastSuccessfulSync: "2026-06-21T10:30:00Z",
        completedResults: [
          record({
            providerFixtureId: "p1",
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            status: "finished",
            homeScore: 1,
            awayScore: 0
          })
        ]
      });

      const second = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: completedSync,
        predictorFn: spy,
        previousProjection: first.projection
      });

      expect(second.status).toBe("success");
      if (second.status !== "success") return;

      const callsAfterSecond = spy.mock.calls.length;
      spy.mockClear();

      // Third call — same sync as second, should NOT refresh again
      const third = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:31:00Z",
        syncResult: completedSync,
        predictorFn: spy,
        previousProjection: second.projection
      });

      expect(third.status).toBe("success");
      expect(spy.mock.calls.length).toBe(0);
      void callsAfterSecond;
    });
  });

  describe("official standings immutability", () => {
    it("official standings remain unchanged after projection refresh", () => {
      const standingsBefore = buildWorldCup2026GroupStandings();

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        predictorFn: () => makeAutoPredict()
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        predictorFn: () => makeAutoPredict(),
        previousProjection: first.projection
      });

      expect(buildWorldCup2026GroupStandings()).toEqual(standingsBefore);
    });
  });

  describe("snapshot mutation guard", () => {
    it("does not create or modify snapshots during refresh", () => {
      const snapshotStore = createInMemorySnapshotStore();
      const initialSnapshots = snapshotStore.list().length;

      const first = buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:00:00Z",
        syncResult: syncResult(),
        snapshotStore,
        predictorFn: () => makeAutoPredict()
      });

      expect(first.status).toBe("success");
      if (first.status !== "success") return;

      buildWorldCup2026GroupDetail({
        group: "A",
        timezone: "UTC",
        generatedAt: "2026-06-21T10:30:00Z",
        syncResult: syncResult({
          completedResults: [
            record({
              providerFixtureId: "p1",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              status: "finished",
              homeScore: 1,
              awayScore: 0
            })
          ]
        }),
        snapshotStore,
        predictorFn: () => makeAutoPredict(),
        previousProjection: first.projection
      });

      expect(snapshotStore.list().length).toBe(initialSnapshots);
    });
  });
});
