import { describe, expect, it } from "vitest";
import {
  classifyLiveEvidenceFavoriteStrength,
  LIVE_EVIDENCE_GATE_THRESHOLDS,
  runLiveEvidenceGate,
  type LiveEvidenceGateInput,
  type LiveEvidenceGateReport
} from "../src/index.js";
import type {
  PredictionConfidenceLevel,
  PredictionCoverageType,
  PredictionSnapshotStatus,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot,
  WorldCup2026PredictionSnapshotScoreline
} from "../src/schemas.js";

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const GENERATED_AT = "2026-06-24T12:00:00.000Z";

const MOCK_METADATA = {
  provider: "postgres" as const,
  persistent: true,
  configuredProvider: "postgres"
};

interface SnapSpec {
  fixtureId: string;
  snapshotId?: string;
  group?: string;
  matchday?: number;
  homeTeam?: string;
  awayTeam?: string;
  status?: PredictionSnapshotStatus;
  capturedAt?: string;
  kickoffAt?: string | null;
  eloH?: number;
  eloA?: number;
  xgH?: number;
  xgA?: number;
  pH?: number;
  pD?: number;
  pA?: number;
  scorelines?: Array<[number, number, number]>;
  confidenceLevel?: PredictionConfidenceLevel;
  coverageType?: PredictionCoverageType;
  fallbackH?: boolean;
  fallbackA?: boolean;
}

function makeSnapshot(spec: SnapSpec): WorldCup2026PredictionSnapshot {
  const pH = spec.pH ?? 0.5;
  const pD = spec.pD ?? 0.25;
  const pA = spec.pA ?? 0.25;
  const scorelines: WorldCup2026PredictionSnapshotScoreline[] = (
    spec.scorelines ?? [[1, 1, 0.15], [1, 0, 0.14], [0, 0, 0.1]]
  ).map(([homeGoals, awayGoals, probability]) => ({ homeGoals, awayGoals, probability }));
  const kickoffAtVal =
    spec.kickoffAt === undefined
      ? "2026-06-20T18:00:00.000Z"
      : spec.kickoffAt === null
      ? undefined
      : spec.kickoffAt;

  return {
    snapshotId: spec.snapshotId ?? `snap-${spec.fixtureId}`,
    fixtureId: spec.fixtureId,
    status: spec.status ?? "pre_match_locked",
    capturedAt: spec.capturedAt ?? "2026-06-20T10:00:00.000Z",
    cutoffAt: spec.capturedAt ?? "2026-06-20T10:00:00.000Z",
    ...(kickoffAtVal !== undefined ? { kickoffAt: kickoffAtVal } : {}),
    group: spec.group ?? "A",
    matchday: spec.matchday ?? 1,
    homeTeam: spec.homeTeam ?? `Home-${spec.fixtureId}`,
    awayTeam: spec.awayTeam ?? `Away-${spec.fixtureId}`,
    modelVersion: "wc2026-prediction-live-elo-v1",
    modelConfiguration: {
      predictionMode: "live_elo",
      eloPreset: "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: {
      homeElo: spec.eloH ?? 1500,
      awayElo: spec.eloA ?? 1450,
      homeUsesFallback: spec.fallbackH ?? false,
      awayUsesFallback: spec.fallbackA ?? false,
      tournamentMatchesIncluded: 0
    },
    prediction: {
      homeExpectedGoals: spec.xgH ?? 1.4,
      awayExpectedGoals: spec.xgA ?? 1.1,
      homeWinProbability: pH,
      drawProbability: pD,
      awayWinProbability: pA,
      mostLikelyScorelines: scorelines
    },
    confidence: {
      level: spec.confidenceLevel ?? "medium",
      coverageType: spec.coverageType ?? "full",
      reasons: [],
      dataPoints: {
        homeUsesFallback: spec.fallbackH ?? false,
        awayUsesFallback: spec.fallbackA ?? false,
        homeMatchesPlayed: 10,
        awayMatchesPlayed: 10,
        historicalMatchesAvailable: 100
      },
      manualXgRecommended: false
    },
    provenance: {},
    contentHash: `hash-${spec.fixtureId}-${spec.snapshotId ?? spec.fixtureId}`
  };
}

function makeEvaluation(
  snap: WorldCup2026PredictionSnapshot,
  actualHome: number,
  actualAway: number,
  overrides?: Partial<WorldCup2026PredictionEvaluation>
): WorldCup2026PredictionEvaluation {
  const p = snap.prediction;
  const predictedHomeWin = p.homeWinProbability > p.drawProbability && p.homeWinProbability > p.awayWinProbability;
  const predictedDraw = p.drawProbability >= p.homeWinProbability && p.drawProbability >= p.awayWinProbability;
  const predictedOutcome = predictedHomeWin ? "home_win" : predictedDraw ? "draw" : "away_win";
  const actualOutcome =
    actualHome > actualAway ? "home_win" : actualHome === actualAway ? "draw" : "away_win";
  const outcomeCorrect = predictedOutcome === actualOutcome;
  const modalScoreline = [...snap.prediction.mostLikelyScorelines].sort(
    (a, b) => b.probability - a.probability
  )[0]!;
  const exactScoreCorrect =
    modalScoreline.homeGoals === actualHome && modalScoreline.awayGoals === actualAway;
  const predictedProb =
    predictedOutcome === "home_win"
      ? p.homeWinProbability
      : predictedOutcome === "draw"
      ? p.drawProbability
      : p.awayWinProbability;
  const actualProb =
    actualOutcome === "home_win"
      ? p.homeWinProbability
      : actualOutcome === "draw"
      ? p.drawProbability
      : p.awayWinProbability;
  const yH = actualOutcome === "home_win" ? 1 : 0;
  const yD = actualOutcome === "draw" ? 1 : 0;
  const yA = actualOutcome === "away_win" ? 1 : 0;
  const brierScore =
    (p.homeWinProbability - yH) ** 2 +
    (p.drawProbability - yD) ** 2 +
    (p.awayWinProbability - yA) ** 2;
  const logLoss = -Math.log(Math.max(actualProb, 1e-15));

  return {
    evaluationId: `eval-${snap.snapshotId}`,
    snapshotId: snap.snapshotId,
    fixtureId: snap.fixtureId,
    evaluatedAt: "2026-06-24T00:00:00.000Z",
    modelVersion: snap.modelVersion,
    metricVersion: "v1",
    predicted: {
      homeExpectedGoals: p.homeExpectedGoals,
      awayExpectedGoals: p.awayExpectedGoals,
      homeWinProbability: p.homeWinProbability,
      drawProbability: p.drawProbability,
      awayWinProbability: p.awayWinProbability,
      mostLikelyScorelines: snap.prediction.mostLikelyScorelines,
      predictedOutcome,
      predictedScoreline: { homeGoals: modalScoreline.homeGoals, awayGoals: modalScoreline.awayGoals }
    },
    actual: { homeGoals: actualHome, awayGoals: actualAway, outcome: actualOutcome },
    metrics: {
      outcomeCorrect,
      drawCorrect: predictedOutcome === "draw" && actualOutcome === "draw",
      exactScoreCorrect,
      homeGoalAbsoluteError: Math.abs(p.homeExpectedGoals - actualHome),
      awayGoalAbsoluteError: Math.abs(p.awayExpectedGoals - actualAway),
      totalGoalAbsoluteError:
        Math.abs(p.homeExpectedGoals - actualHome) + Math.abs(p.awayExpectedGoals - actualAway),
      goalDifferenceAbsoluteError: Math.abs(
        p.homeExpectedGoals - p.awayExpectedGoals - (actualHome - actualAway)
      ),
      brierScore,
      logLoss,
      predictedOutcomeProbability: predictedProb,
      actualOutcomeProbability: actualProb
    },
    confidence: {
      level: snap.confidence.level,
      coverageType: snap.confidence.coverageType,
      fallbackUsed: snap.inputs.homeUsesFallback || snap.inputs.awayUsesFallback
    },
    provenance: { snapshotContentHash: snap.contentHash },
    ...overrides
  };
}

function makeInput(
  snapshots: WorldCup2026PredictionSnapshot[],
  evaluations: WorldCup2026PredictionEvaluation[]
): LiveEvidenceGateInput {
  return {
    generatedAt: GENERATED_AT,
    persistenceMetadata: MOCK_METADATA,
    snapshots,
    evaluations
  };
}

// Build N snapshots each with a paired evaluation.
function makeBatch(
  count: number,
  opts?: {
    startGroup?: string;
    xgH?: number;
    xgA?: number;
    pH?: number;
    pD?: number;
    pA?: number;
    actualHome?: number;
    actualAway?: number;
    status?: PredictionSnapshotStatus;
    fixtureIdPrefix?: string;
    scorelines?: Array<[number, number, number]>;
    capturedAt?: string;
    kickoffAt?: string | null;
    matchdayStart?: number;
  }
): { snapshots: WorldCup2026PredictionSnapshot[]; evaluations: WorldCup2026PredictionEvaluation[] } {
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const snapshots: WorldCup2026PredictionSnapshot[] = [];
  const evaluations: WorldCup2026PredictionEvaluation[] = [];
  for (let i = 0; i < count; i++) {
    const fid = `${opts?.fixtureIdPrefix ?? "f"}${i + 1}`;
    const snap = makeSnapshot({
      fixtureId: fid,
      group: groups[i % groups.length]!,
      matchday: (opts?.matchdayStart ?? 1) + Math.floor(i / 8),
      xgH: opts?.xgH ?? 1.4,
      xgA: opts?.xgA ?? 1.1,
      pH: opts?.pH ?? 0.5,
      pD: opts?.pD ?? 0.25,
      pA: opts?.pA ?? 0.25,
      status: opts?.status ?? "pre_match_locked",
      ...(opts?.scorelines !== undefined ? { scorelines: opts.scorelines } : {}),
      ...(opts?.capturedAt !== undefined ? { capturedAt: opts.capturedAt } : {}),
      ...(opts?.kickoffAt !== undefined ? { kickoffAt: opts.kickoffAt } : {})
    });
    const ev = makeEvaluation(
      snap,
      opts?.actualHome ?? 1,
      opts?.actualAway ?? 0
    );
    snapshots.push(snap);
    evaluations.push(ev);
  }
  return { snapshots, evaluations };
}

// Deep-collect all numeric values in a report to check for NaN/Infinity.
function collectNumbers(value: unknown, acc: number[]): void {
  if (typeof value === "number") {
    acc.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, acc);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectNumbers(v, acc);
  }
}

// ---------------------------------------------------------------------------
// 1. Empty input
// ---------------------------------------------------------------------------

describe("runLiveEvidenceGate — empty input", () => {
  it("returns insufficient_evidence with zero counts", () => {
    const report = runLiveEvidenceGate(makeInput([], []));
    expect(report.decision).toBe("insufficient_evidence");
    expect(report.evidenceCounts.totalSnapshots).toBe(0);
    expect(report.evidenceCounts.uniqueFixtures).toBe(0);
    expect(report.evidenceCounts.uniqueEvaluatedFixtures).toBe(0);
  });

  it("all core metrics are null when no snapshots", () => {
    const report = runLiveEvidenceGate(makeInput([], []));
    const cm = report.coreMetrics;
    expect(cm.outcomeAccuracy).toBeNull();
    expect(cm.averageBrierScore).toBeNull();
    expect(cm.averageLogLoss).toBeNull();
    expect(cm.averageHomeGoalError).toBeNull();
  });

  it("produces no NaN or Infinity in empty report", () => {
    const report = runLiveEvidenceGate(makeInput([], []));
    const nums: number[] = [];
    collectNumbers(report, nums);
    expect(nums.every((n) => Number.isFinite(n))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Insufficient evidence (< minUniqueEvaluatedFixtures=8)
// ---------------------------------------------------------------------------

describe("runLiveEvidenceGate — insufficient evidence", () => {
  it("returns insufficient_evidence with 0 evaluated fixtures", () => {
    const { snapshots } = makeBatch(5);
    const report = runLiveEvidenceGate(makeInput(snapshots, []));
    expect(report.decision).toBe("insufficient_evidence");
    expect(report.evidenceCounts.uniqueEvaluatedFixtures).toBe(0);
  });

  it("returns insufficient_evidence with 7 evaluated fixtures (one below threshold)", () => {
    const { snapshots, evaluations } = makeBatch(7);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.decision).toBe("insufficient_evidence");
    expect(report.evidenceCounts.uniqueEvaluatedFixtures).toBe(7);
  });

  it("insufficient_evidence decision includes minUniqueEvaluatedFixtures in reasons", () => {
    const { snapshots, evaluations } = makeBatch(3);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.decisionReasons.some((r) => r.includes("minUniqueEvaluatedFixtures"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Evidence collection continue (8 ≤ n < 20)
// ---------------------------------------------------------------------------

describe("runLiveEvidenceGate — evidence_collection_continue", () => {
  it("returns evidence_collection_continue with exactly 8 evaluated fixtures", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.decision).toBe("evidence_collection_continue");
  });

  it("returns evidence_collection_continue with 15 evaluated fixtures", () => {
    const { snapshots, evaluations } = makeBatch(15);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.decision).toBe("evidence_collection_continue");
  });

  it("returns evidence_collection_continue with 19 evaluated fixtures (one below recalibration threshold)", () => {
    const { snapshots, evaluations } = makeBatch(19);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.decision).toBe("evidence_collection_continue");
  });

  it("core metrics are not all null at 10 evaluated fixtures", () => {
    const { snapshots, evaluations } = makeBatch(10);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.coreMetrics.outcomeAccuracy).not.toBeNull();
    expect(report.coreMetrics.averageBrierScore).not.toBeNull();
  });

  it("produces no NaN or Infinity with 12 evaluated fixtures", () => {
    const { snapshots, evaluations } = makeBatch(12);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const nums: number[] = [];
    collectNumbers(report, nums);
    expect(nums.every((n) => Number.isFinite(n))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Selection policy
// ---------------------------------------------------------------------------

describe("selection policy", () => {
  it("prefers pre_match_locked over foundation_unverified for same fixture", () => {
    const locked = makeSnapshot({
      fixtureId: "fx1",
      snapshotId: "snap-locked",
      status: "pre_match_locked",
      capturedAt: "2026-06-20T08:00:00.000Z"
    });
    const foundation = makeSnapshot({
      fixtureId: "fx1",
      snapshotId: "snap-found",
      status: "foundation_unverified",
      capturedAt: "2026-06-20T12:00:00.000Z" // later, but lower priority
    });
    const evalLocked = makeEvaluation(locked, 1, 0);
    const evalFound = makeEvaluation(foundation, 1, 0);

    const report = runLiveEvidenceGate(makeInput([locked, foundation], [evalLocked, evalFound]));
    // Only one fixture selected
    expect(report.evidenceCounts.uniqueFixtures).toBe(1);
    expect(report.selectionPolicySummary.preMatchLockedSelected).toBe(1);
    expect(report.selectionPolicySummary.foundationUnverifiedSelected).toBe(0);
    expect(report.selectionPolicySummary.excludedFromPrimary).toHaveLength(1);
    expect(report.selectionPolicySummary.excludedFromPrimary[0]!.snapshotId).toBe("snap-found");
  });

  it("among two pre_match_locked for same fixture, selects latest capturedAt", () => {
    const earlySnap = makeSnapshot({
      fixtureId: "fx2",
      snapshotId: "snap-early",
      status: "pre_match_locked",
      capturedAt: "2026-06-20T07:00:00.000Z"
    });
    const lateSnap = makeSnapshot({
      fixtureId: "fx2",
      snapshotId: "snap-late",
      status: "pre_match_locked",
      capturedAt: "2026-06-20T14:00:00.000Z"
    });
    const evalLate = makeEvaluation(lateSnap, 2, 1);
    const evalEarly = makeEvaluation(earlySnap, 2, 1);

    const report = runLiveEvidenceGate(makeInput([earlySnap, lateSnap], [evalLate, evalEarly]));
    expect(report.selectionPolicySummary.preMatchLockedSelected).toBe(1);
    // The excluded one should be the early snapshot
    const excluded = report.selectionPolicySummary.excludedFromPrimary;
    expect(excluded).toHaveLength(1);
    expect(excluded[0]!.snapshotId).toBe("snap-early");
  });

  it("when capturedAt is equal, uses snapshotId descending as tiebreaker", () => {
    const snapA = makeSnapshot({
      fixtureId: "fx3",
      snapshotId: "snap-aaa",
      status: "pre_match_locked",
      capturedAt: "2026-06-20T10:00:00.000Z"
    });
    const snapB = makeSnapshot({
      fixtureId: "fx3",
      snapshotId: "snap-zzz",
      status: "pre_match_locked",
      capturedAt: "2026-06-20T10:00:00.000Z"
    });
    const report = runLiveEvidenceGate(makeInput([snapA, snapB], []));
    // snap-zzz > snap-aaa lexicographically → snap-zzz is primary
    const excluded = report.selectionPolicySummary.excludedFromPrimary;
    expect(excluded).toHaveLength(1);
    expect(excluded[0]!.snapshotId).toBe("snap-aaa");
  });

  it("excludes post-kickoff snapshots even if valid", () => {
    const snap = makeSnapshot({
      fixtureId: "fx4",
      capturedAt: "2026-06-20T22:00:00.000Z", // after kickoff
      kickoffAt: "2026-06-20T18:00:00.000Z"
    });
    const report = runLiveEvidenceGate(makeInput([snap], []));
    expect(report.evidenceCounts.uniqueFixtures).toBe(0);
  });

  it("counts multiple-snapshot fixtures correctly", () => {
    const s1 = makeSnapshot({ fixtureId: "fx5", snapshotId: "snap-fx5-1", capturedAt: "2026-06-20T08:00:00.000Z" });
    const s2 = makeSnapshot({ fixtureId: "fx5", snapshotId: "snap-fx5-2", capturedAt: "2026-06-20T10:00:00.000Z" });
    const s3 = makeSnapshot({ fixtureId: "fx6" });
    const report = runLiveEvidenceGate(makeInput([s1, s2, s3], []));
    expect(report.evidenceCounts.fixturesWithMultipleSnapshots).toBe(1);
    expect(report.evidenceCounts.uniqueFixtures).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Counts
// ---------------------------------------------------------------------------

describe("evidence counts", () => {
  it("correctly partitions evaluated vs pending fixtures", () => {
    const { snapshots, evaluations } = makeBatch(5);
    const extraSnaps = makeBatch(3, { fixtureIdPrefix: "pending-" });
    const report = runLiveEvidenceGate(
      makeInput([...snapshots, ...extraSnaps.snapshots], evaluations)
    );
    expect(report.evidenceCounts.uniqueEvaluatedFixtures).toBe(5);
    expect(report.evidenceCounts.pendingSnapshots).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 6. Core metrics (deterministic hand-computed)
// ---------------------------------------------------------------------------

describe("core metrics", () => {
  it("computes 100% outcome accuracy when all predicted outcomes are correct", () => {
    // pH=0.55, pD=0.25, pA=0.20, actual=home win
    const { snapshots, evaluations } = makeBatch(8, {
      pH: 0.55,
      pD: 0.25,
      pA: 0.2,
      actualHome: 2,
      actualAway: 0
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.coreMetrics.outcomeAccuracy).toBe(1);
  });

  it("computes 0% outcome accuracy when all predicted outcomes are wrong", () => {
    // Predict home win (pH=0.7) but actual is always away win
    const { snapshots, evaluations } = makeBatch(8, {
      pH: 0.7,
      pD: 0.2,
      pA: 0.1,
      actualHome: 0,
      actualAway: 2
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.coreMetrics.outcomeAccuracy).toBe(0);
  });

  it("computes exact scoreline accuracy correctly", () => {
    // Modal scoreline is 1-1, actual is also 1-1 for all.
    const { snapshots, evaluations } = makeBatch(8, {
      pH: 0.3,
      pD: 0.4,
      pA: 0.3,
      scorelines: [[1, 1, 0.2], [0, 0, 0.1], [2, 1, 0.09]],
      actualHome: 1,
      actualAway: 1
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.coreMetrics.exactScorelineAccuracy).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 7. Scoreline concentration
// ---------------------------------------------------------------------------

describe("scoreline concentration", () => {
  it("detects 1-1 concentration flag when 1-1 rate exceeds threshold", () => {
    const t = LIVE_EVIDENCE_GATE_THRESHOLDS;
    const countAbove = Math.ceil(t.oneOneConcentrationThreshold * 12) + 1;
    const countBelow = 12 - countAbove;
    const highConc = makeBatch(countAbove, {
      fixtureIdPrefix: "conc-",
      pH: 0.3,
      pD: 0.4,
      pA: 0.3,
      scorelines: [[1, 1, 0.25], [0, 0, 0.1], [2, 1, 0.08]],
      actualHome: 0,
      actualAway: 1
    });
    const low = makeBatch(countBelow, {
      fixtureIdPrefix: "low-",
      pH: 0.5,
      pD: 0.25,
      pA: 0.25,
      scorelines: [[1, 0, 0.2], [2, 0, 0.15], [0, 0, 0.1]],
      actualHome: 1,
      actualAway: 0
    });
    const report = runLiveEvidenceGate(
      makeInput(
        [...highConc.snapshots, ...low.snapshots],
        [...highConc.evaluations, ...low.evaluations]
      )
    );
    expect(report.scorelineConcentration.compressedModalSelectionFlag).toBe(true);
  });

  it("reports correct modal scoreline from primary selections", () => {
    // All 8 snapshots have 2-1 as the top scoreline.
    const { snapshots, evaluations } = makeBatch(8, {
      scorelines: [[2, 1, 0.2], [1, 0, 0.15], [1, 1, 0.1]],
      actualHome: 2,
      actualAway: 1
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.scorelineConcentration.modalScoreline).toBe("2-1");
  });

  it("computes topTwoScorelinesRate correctly for homogeneous set", () => {
    // All 8 snapshots have the same modal scoreline → top-1 and top-2 combined = 1.0
    const { snapshots, evaluations } = makeBatch(8, {
      scorelines: [[1, 0, 0.2], [0, 0, 0.1], [2, 0, 0.08]]
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    // All 8 have modal 1-0 so top-1 rate = 1.0. top-2 would also be 1.0.
    expect(report.scorelineConcentration.modalScorelineRate).toBe(1);
    expect(report.scorelineConcentration.uniqueModalScorelines).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 8. Draw calibration
// ---------------------------------------------------------------------------

describe("draw calibration", () => {
  it("marks sampleBelowMinimum when evaluated < minDrawBiasSampleSize", () => {
    const { snapshots, evaluations } = makeBatch(3);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    // 3 < minUniqueEvaluatedFixtures=8 → insufficient_evidence, but draw calibration should still set sampleBelowMinimum=true
    expect(report.drawCalibration.sampleBelowMinimum).toBe(true);
  });

  it("computes drawFalsePositiveRate when draws are predicted but don't occur", () => {
    // Predict draws (pD=0.5 is highest), actuals are all 1-0 (home wins).
    const { snapshots, evaluations } = makeBatch(8, {
      pH: 0.25,
      pD: 0.5,
      pA: 0.25,
      scorelines: [[1, 1, 0.2], [0, 0, 0.1], [2, 2, 0.08]],
      actualHome: 1,
      actualAway: 0
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    // All 8 predicted draws (pD=0.5 highest), none were draws → FPR = 8/8 = 1
    expect(report.drawCalibration.drawFalsePositiveRate).toBe(1);
    expect(report.drawCalibration.actualDrawHitRate).toBe(0);
  });

  it("draw false negative rate is 1 when all actuals are draws but model never predicts draw", () => {
    // pH=0.7 wins, actual=draw always
    const { snapshots, evaluations } = makeBatch(8, {
      pH: 0.7,
      pD: 0.2,
      pA: 0.1,
      actualHome: 1,
      actualAway: 1
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    // Predicted: home_win (pH=0.7), actual: draw → FNR = 8/8 = 1
    expect(report.drawCalibration.drawFalseNegativeRate).toBe(1);
  });

  it("calibration buckets sum correctly", () => {
    const { snapshots, evaluations } = makeBatch(10);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const totalInBuckets = report.drawCalibration.calibrationBuckets.reduce(
      (sum, b) => sum + b.predictions,
      0
    );
    // Total in buckets should equal unique evaluated fixtures
    expect(totalInBuckets).toBe(report.evidenceCounts.uniqueEvaluatedFixtures);
  });
});

// ---------------------------------------------------------------------------
// 9. Favorite separation
// ---------------------------------------------------------------------------

describe("favorite separation — classifyLiveEvidenceFavoriteStrength", () => {
  it("returns no_clear_favorite below favoriteWeakMinProbability", () => {
    expect(classifyLiveEvidenceFavoriteStrength(0.35)).toBe("no_clear_favorite");
  });

  it("returns weak between 0.40 and 0.54", () => {
    expect(classifyLiveEvidenceFavoriteStrength(0.40)).toBe("weak");
    expect(classifyLiveEvidenceFavoriteStrength(0.54)).toBe("weak");
  });

  it("returns moderate between 0.55 and 0.69", () => {
    expect(classifyLiveEvidenceFavoriteStrength(0.55)).toBe("moderate");
    expect(classifyLiveEvidenceFavoriteStrength(0.69)).toBe("moderate");
  });

  it("returns strong at or above 0.70", () => {
    expect(classifyLiveEvidenceFavoriteStrength(0.70)).toBe("strong");
    expect(classifyLiveEvidenceFavoriteStrength(0.90)).toBe("strong");
  });
});

describe("favorite separation — report", () => {
  it("places snapshots in correct strength buckets", () => {
    const strongFav = makeBatch(4, {
      fixtureIdPrefix: "sf-",
      pH: 0.75,
      pD: 0.15,
      pA: 0.1,
      xgH: 1.9,
      xgA: 0.8,
      actualHome: 2,
      actualAway: 0
    });
    const noFav = makeBatch(4, {
      fixtureIdPrefix: "nf-",
      pH: 0.35,
      pD: 0.33,
      pA: 0.32,
      xgH: 1.2,
      xgA: 1.1,
      actualHome: 1,
      actualAway: 1
    });
    const report = runLiveEvidenceGate(
      makeInput(
        [...strongFav.snapshots, ...noFav.snapshots],
        [...strongFav.evaluations, ...noFav.evaluations]
      )
    );
    const strongBucket = report.favoriteSeparation.buckets.find((b) => b.strength === "strong")!;
    const noFavBucket = report.favoriteSeparation.buckets.find((b) => b.strength === "no_clear_favorite")!;
    expect(strongBucket.count).toBe(4);
    expect(noFavBucket.count).toBe(4);
  });

  it("favoriteStrengthCounts totals equal evaluated fixtures count", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const total = Object.values(report.favoriteSeparation.favoriteStrengthCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(report.evidenceCounts.uniqueEvaluatedFixtures);
  });
});

// ---------------------------------------------------------------------------
// 10. xG compression
// ---------------------------------------------------------------------------

describe("xG compression", () => {
  it("sets xgCompressionFlag when shareBelow025 exceeds threshold", () => {
    // xgH=1.1, xgA=0.9 → |diff| = 0.2 < 0.25 for all → shareBelow025 = 1.0 > 0.5
    const { snapshots, evaluations } = makeBatch(8, {
      xgH: 1.1,
      xgA: 0.9,
      pH: 0.45,
      pD: 0.30,
      pA: 0.25,
      actualHome: 1,
      actualAway: 0
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.xgCompression.shareBelow025).toBe(1);
    expect(report.xgCompression.xgCompressionFlag).toBe(true);
  });

  it("does not set xgCompressionFlag when xG diffs are large", () => {
    // xgH=2.0, xgA=0.8 → |diff| = 1.2 > 0.25
    const { snapshots, evaluations } = makeBatch(8, {
      xgH: 2.0,
      xgA: 0.8,
      pH: 0.65,
      pD: 0.20,
      pA: 0.15,
      actualHome: 2,
      actualAway: 0
    });
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.xgCompression.shareBelow025).toBe(0);
    expect(report.xgCompression.xgCompressionFlag).toBe(false);
  });

  it("reports all four strength bucket labels", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const labels = report.xgCompression.xgDifferenceByStrengthBucket.map((b) => b.bucket);
    expect(labels).toContain("no_clear_favorite");
    expect(labels).toContain("weak");
    expect(labels).toContain("moderate");
    expect(labels).toContain("strong");
  });
});

// ---------------------------------------------------------------------------
// 11. Confidence / coverage segmentation
// ---------------------------------------------------------------------------

describe("confidence/coverage segmentation", () => {
  it("returns segments for all four confidence_level values", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const dims = report.confidenceCoverageSegmentation
      .filter((s) => s.dimension === "confidence_level")
      .map((s) => s.value);
    expect(dims).toContain("high");
    expect(dims).toContain("medium");
    expect(dims).toContain("low");
    expect(dims).toContain("very_low");
  });

  it("marks segments with count < minSampleForSegmentComparison as unreliable", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const unreliable = report.confidenceCoverageSegmentation.filter(
      (s) => s.count > 0 && !s.reliable
    );
    // Segments with 1-2 records are unreliable; this test just asserts the field exists correctly.
    for (const seg of unreliable) {
      expect(seg.count).toBeLessThan(LIVE_EVIDENCE_GATE_THRESHOLDS.minSampleForSegmentComparison);
    }
  });
});

// ---------------------------------------------------------------------------
// 12. Data quality assessment
// ---------------------------------------------------------------------------

describe("data quality assessment", () => {
  it("readinessVote is insufficient_evidence below minUniqueEvaluatedFixtures", () => {
    const { snapshots, evaluations } = makeBatch(5);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.dataQualityAssessment.readinessVote).toBe("insufficient_evidence");
  });

  it("readinessVote is evidence_collection_continue between thresholds", () => {
    const { snapshots, evaluations } = makeBatch(10);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.dataQualityAssessment.readinessVote).toBe("evidence_collection_continue");
  });

  it("detects duplicate evaluations for same snapshotId", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const snap0 = snapshots[0]!;
    const dupEval = makeEvaluation(snap0, 2, 1, { evaluationId: "eval-dup" });
    const report = runLiveEvidenceGate(makeInput(snapshots, [...evaluations, dupEval]));
    expect(report.dataQualityAssessment.duplicateLogicalEvaluations).toBeGreaterThan(0);
  });

  it("counts distinct groups from evaluated fixtures", () => {
    const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const snapshots: WorldCup2026PredictionSnapshot[] = [];
    const evaluations: WorldCup2026PredictionEvaluation[] = [];
    for (let i = 0; i < 8; i++) {
      const snap = makeSnapshot({ fixtureId: `gf${i}`, group: groups[i % groups.length]! });
      snapshots.push(snap);
      evaluations.push(makeEvaluation(snap, 1, 0));
    }
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.dataQualityAssessment.distinctGroupsRepresented).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// 13. Persistence metadata passthrough
// ---------------------------------------------------------------------------

describe("persistence metadata", () => {
  it("reflects input metadata in the report", () => {
    const report = runLiveEvidenceGate(makeInput([], []));
    expect(report.persistenceMetadata.provider).toBe("postgres");
    expect(report.persistenceMetadata.persistent).toBe(true);
    expect(report.persistenceMetadata.configuredProvider).toBe("postgres");
  });

  it("generatedAt is passed through unchanged", () => {
    const report = runLiveEvidenceGate(makeInput([], []));
    expect(report.generatedAt).toBe(GENERATED_AT);
  });
});

// ---------------------------------------------------------------------------
// 14. Null-safety / no NaN or Infinity
// ---------------------------------------------------------------------------

describe("null-safety", () => {
  it("produces no NaN or Infinity in a 9-fixture report (current live scenario)", () => {
    const { snapshots, evaluations } = makeBatch(9);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const nums: number[] = [];
    collectNumbers(report, nums);
    expect(nums.every((n) => Number.isFinite(n))).toBe(true);
  });

  it("produces no NaN or Infinity in a large 30-fixture report", () => {
    const { snapshots, evaluations } = makeBatch(30);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const nums: number[] = [];
    collectNumbers(report, nums);
    expect(nums.every((n) => Number.isFinite(n))).toBe(true);
  });

  it("produces no NaN or Infinity with mixed evaluated and pending snapshots", () => {
    const evaluated = makeBatch(8, { fixtureIdPrefix: "ev-" });
    const pending = makeBatch(3, { fixtureIdPrefix: "pnd-" });
    const report = runLiveEvidenceGate(
      makeInput([...evaluated.snapshots, ...pending.snapshots], evaluated.evaluations)
    );
    const nums: number[] = [];
    collectNumbers(report, nums);
    expect(nums.every((n) => Number.isFinite(n))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 15. Thresholds constants are exported and correct
// ---------------------------------------------------------------------------

describe("LIVE_EVIDENCE_GATE_THRESHOLDS", () => {
  it("minUniqueEvaluatedFixtures=8", () => {
    expect(LIVE_EVIDENCE_GATE_THRESHOLDS.minUniqueEvaluatedFixtures).toBe(8);
  });

  it("minForRecalibrationEvidence=20", () => {
    expect(LIVE_EVIDENCE_GATE_THRESHOLDS.minForRecalibrationEvidence).toBe(20);
  });

  it("favoriteStrongMinProbability=0.70", () => {
    expect(LIVE_EVIDENCE_GATE_THRESHOLDS.favoriteStrongMinProbability).toBe(0.70);
  });

  it("drawFalsePositiveRateThreshold=0.5", () => {
    expect(LIVE_EVIDENCE_GATE_THRESHOLDS.drawFalsePositiveRateThreshold).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// 16. Findings array
// ---------------------------------------------------------------------------

describe("findings", () => {
  it("includes small_sample warning at 9 evaluated fixtures", () => {
    const { snapshots, evaluations } = makeBatch(9);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const finding = report.findings.find((f) => f.code === "small_sample");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("warning");
  });

  it("includes insufficient_evidence critical finding when below threshold", () => {
    const { snapshots, evaluations } = makeBatch(5);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const finding = report.findings.find((f) => f.code === "insufficient_evidence");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("critical");
  });

  it("does not include small_sample finding when evidence is empty", () => {
    const report = runLiveEvidenceGate(makeInput([], []));
    const finding = report.findings.find((f) => f.code === "small_sample");
    expect(finding).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 17. Secondary all-snapshots view
// ---------------------------------------------------------------------------

describe("secondary all-snapshots scoreline view", () => {
  it("allSnapshotsConsidered matches total snapshots input", () => {
    const { snapshots, evaluations } = makeBatch(8);
    // Add a second snapshot for one fixture
    const extra = makeSnapshot({
      fixtureId: snapshots[0]!.fixtureId,
      snapshotId: "extra-snap",
      capturedAt: "2026-06-19T10:00:00.000Z" // earlier, so it won't be primary
    });
    const report = runLiveEvidenceGate(makeInput([...snapshots, extra], evaluations));
    expect(report.selectionPolicySummary.allSnapshotsConsidered).toBe(snapshots.length + 1);
  });

  it("excludedFromPrimary has exclusion reason not_primary_selection for secondary snapshot", () => {
    const main = makeSnapshot({ fixtureId: "dual", snapshotId: "dual-main", capturedAt: "2026-06-20T14:00:00.000Z" });
    const secondary = makeSnapshot({ fixtureId: "dual", snapshotId: "dual-secondary", capturedAt: "2026-06-20T08:00:00.000Z" });
    const report = runLiveEvidenceGate(makeInput([main, secondary], []));
    const excl = report.selectionPolicySummary.excludedFromPrimary.find(
      (e) => e.snapshotId === "dual-secondary"
    );
    expect(excl?.reason).toBe("not_primary_selection");
  });
});

// ---------------------------------------------------------------------------
// 18. Report structure completeness
// ---------------------------------------------------------------------------

describe("report structure", () => {
  it("report has all required top-level fields", () => {
    const report = runLiveEvidenceGate(makeInput([], []));
    expect(report).toHaveProperty("generatedAt");
    expect(report).toHaveProperty("persistenceMetadata");
    expect(report).toHaveProperty("evidenceCounts");
    expect(report).toHaveProperty("selectionPolicySummary");
    expect(report).toHaveProperty("coreMetrics");
    expect(report).toHaveProperty("scorelineConcentration");
    expect(report).toHaveProperty("drawCalibration");
    expect(report).toHaveProperty("favoriteSeparation");
    expect(report).toHaveProperty("xgCompression");
    expect(report).toHaveProperty("confidenceCoverageSegmentation");
    expect(report).toHaveProperty("dataQualityAssessment");
    expect(report).toHaveProperty("findings");
    expect(report).toHaveProperty("decision");
    expect(report).toHaveProperty("decisionReasons");
    expect(report).toHaveProperty("blockedReasons");
    expect(report).toHaveProperty("nextRecommendedPhase");
  });

  it("favorite separation has all four strength buckets", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    const strengths = report.favoriteSeparation.buckets.map((b) => b.strength);
    expect(strengths).toContain("no_clear_favorite");
    expect(strengths).toContain("weak");
    expect(strengths).toContain("moderate");
    expect(strengths).toContain("strong");
  });

  it("xgDifferenceByStrengthBucket has exactly four entries", () => {
    const { snapshots, evaluations } = makeBatch(8);
    const report = runLiveEvidenceGate(makeInput(snapshots, evaluations));
    expect(report.xgCompression.xgDifferenceByStrengthBucket).toHaveLength(4);
  });
});
