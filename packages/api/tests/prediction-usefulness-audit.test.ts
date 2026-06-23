import { describe, expect, it } from "vitest";
import {
  buildAuditCompletedFixtures,
  classifyFavoriteStrength,
  runWorldCup2026PredictionUsefulnessAudit,
  selectAuditSnapshotForFixture,
  type AuditCompletedFixture,
  type PredictionUsefulnessAuditInput,
  type WorldCup2026PredictionSnapshot
} from "../src/index.js";
import type { WorldCup2026PredictionSnapshotScoreline } from "../src/schemas.js";

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

interface ScenarioSpec {
  id: string;
  group?: string;
  homeTeam?: string;
  awayTeam?: string;
  capturedAt?: string;
  kickoffAt?: string | null;
  status?: WorldCup2026PredictionSnapshot["status"];
  modelVersion?: string;
  preset?: string;
  eloH: number;
  eloA: number;
  xgH: number;
  xgA: number;
  pH: number;
  pD: number;
  pA: number;
  scorelines: Array<[number, number, number]>; // [home, away, probability]
  actualHome: number;
  actualAway: number;
}

function makeSnapshot(spec: ScenarioSpec): WorldCup2026PredictionSnapshot {
  const scorelines: WorldCup2026PredictionSnapshotScoreline[] = spec.scorelines.map(
    ([homeGoals, awayGoals, probability]) => ({ homeGoals, awayGoals, probability })
  );
  const kickoffAt = spec.kickoffAt === undefined ? "2026-06-11T18:00:00.000Z" : spec.kickoffAt;
  return {
    snapshotId: `snap-${spec.id}`,
    fixtureId: spec.id,
    status: spec.status ?? "pre_match_locked",
    capturedAt: spec.capturedAt ?? "2026-06-11T10:00:00.000Z",
    cutoffAt: spec.capturedAt ?? "2026-06-11T10:00:00.000Z",
    ...(kickoffAt !== null ? { kickoffAt } : {}),
    group: spec.group ?? "A",
    matchday: 1,
    homeTeam: spec.homeTeam ?? `H-${spec.id}`,
    awayTeam: spec.awayTeam ?? `A-${spec.id}`,
    modelVersion: spec.modelVersion ?? "wc2026-prediction-live-elo-v1",
    modelConfiguration: {
      predictionMode: "live_elo",
      eloPreset: spec.preset ?? "balanced",
      maxGoals: 7,
      tournamentResultsAdjustmentEnabled: false
    },
    inputs: {
      homeElo: spec.eloH,
      awayElo: spec.eloA,
      homeUsesFallback: false,
      awayUsesFallback: false,
      tournamentMatchesIncluded: 0
    },
    prediction: {
      homeExpectedGoals: spec.xgH,
      awayExpectedGoals: spec.xgA,
      homeWinProbability: spec.pH,
      drawProbability: spec.pD,
      awayWinProbability: spec.pA,
      mostLikelyScorelines: scorelines
    },
    confidence: {
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
    },
    provenance: { dataCoverage: "partial" },
    contentHash: `hash-${spec.id}`
  };
}

function makeCompletedFixture(spec: ScenarioSpec): AuditCompletedFixture {
  return {
    fixtureId: spec.id,
    group: spec.group ?? "A",
    homeTeam: spec.homeTeam ?? `H-${spec.id}`,
    awayTeam: spec.awayTeam ?? `A-${spec.id}`,
    homeGoals: spec.actualHome,
    awayGoals: spec.actualAway
  };
}

function buildInput(specs: ScenarioSpec[], extra?: Partial<PredictionUsefulnessAuditInput>): PredictionUsefulnessAuditInput {
  return {
    generatedAt: "2026-06-22T00:00:00.000Z",
    completedFixtures: specs.map(makeCompletedFixture),
    snapshots: specs.map(makeSnapshot),
    ...extra
  };
}

function collectNumbers(value: unknown, acc: number[]): void {
  if (typeof value === "number") {
    acc.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, acc);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) collectNumbers(v, acc);
  }
}

// ---------------------------------------------------------------------------
// Integration scenario with hand-computed expectations (5 fixtures)
// ---------------------------------------------------------------------------

const INTEGRATION: ScenarioSpec[] = [
  // F1: strong home favorite, modal 2-0, correct exact + outcome.
  {
    id: "f1",
    eloH: 1700,
    eloA: 1450,
    xgH: 1.7,
    xgA: 0.8,
    pH: 0.62,
    pD: 0.23,
    pA: 0.15,
    scorelines: [
      [2, 0, 0.22],
      [1, 0, 0.18],
      [2, 1, 0.12]
    ],
    actualHome: 2,
    actualAway: 0
  },
  // F2: balanced, modal 1-1, draw is highest aggregate, correct exact + outcome.
  {
    id: "f2",
    eloH: 1500,
    eloA: 1500,
    xgH: 1.2,
    xgA: 1.2,
    pH: 0.3,
    pD: 0.4,
    pA: 0.3,
    scorelines: [
      [1, 1, 0.2],
      [1, 0, 0.15],
      [0, 1, 0.15]
    ],
    actualHome: 1,
    actualAway: 1
  },
  // F3: modal 1-1 (draw) but aggregate home_win; actual 2-1 home_win.
  {
    id: "f3",
    eloH: 1600,
    eloA: 1500,
    xgH: 1.4,
    xgA: 1.1,
    pH: 0.45,
    pD: 0.35,
    pA: 0.2,
    scorelines: [
      [1, 1, 0.16],
      [2, 1, 0.14],
      [1, 0, 0.13]
    ],
    actualHome: 2,
    actualAway: 1
  },
  // F4: heavy home favorite upset + blowout; actual 0-3 away_win.
  {
    id: "f4",
    eloH: 1750,
    eloA: 1450,
    xgH: 1.9,
    xgA: 0.7,
    pH: 0.7,
    pD: 0.2,
    pA: 0.1,
    scorelines: [
      [2, 0, 0.2],
      [1, 0, 0.16],
      [3, 0, 0.1]
    ],
    actualHome: 0,
    actualAway: 3
  },
  // F5: compressed xG, modal 1-1, underestimated blowout; actual 4-0 home_win.
  {
    id: "f5",
    eloH: 1510,
    eloA: 1500,
    xgH: 1.25,
    xgA: 1.2,
    pH: 0.34,
    pD: 0.33,
    pA: 0.33,
    scorelines: [
      [1, 1, 0.12],
      [1, 0, 0.11],
      [0, 1, 0.11]
    ],
    actualHome: 4,
    actualAway: 0
  }
];

describe("runWorldCup2026PredictionUsefulnessAudit — integration (known results)", () => {
  const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(INTEGRATION));

  it("covers all five fixtures with one record each", () => {
    expect(report.dataset.completedFixtures).toBe(5);
    expect(report.dataset.eligiblePredictions).toBe(5);
    expect(report.dataset.coverageRate).toBe(1);
    expect(report.records).toHaveLength(5);
  });

  it("computes outcome and exact-score accuracy", () => {
    expect(report.usefulness.outcomeAccuracy).toBe(0.8); // F1,F2,F3,F5 correct; F4 wrong
    expect(report.usefulness.exactScorelineAccuracy).toBe(0.4); // F1,F2 exact
  });

  it("computes 1-1 modal over-prediction", () => {
    expect(report.oneOneScoreline.modalRate).toBe(0.6); // F2,F3,F5 modal 1-1
    expect(report.oneOneScoreline.actualRate).toBe(0.2); // only F2 actual 1-1
    expect(report.oneOneScoreline.overpredictionDelta).toBe(0.4);
  });

  it("computes draw-bias counts", () => {
    expect(report.drawBias.drawHighestProbabilityCount).toBe(1); // F2
    expect(report.drawBias.modalDrawButWinHighestCount).toBe(2); // F3,F5
    expect(report.drawBias.actualDrawRate).toBe(0.2);
  });

  it("detects the modal-draw-versus-aggregate-win cases", () => {
    expect(report.modalVsAggregate).toHaveLength(2); // F3,F5
    const ids = report.modalVsAggregate.map((c) => c.fixtureId).sort();
    expect(ids).toEqual(["f3", "f5"]);
  });

  it("computes top-N coverage above modal-only", () => {
    expect(report.topN.exactInTop1).toBe(2); // F1,F2
    expect(report.topN.exactInTop3).toBe(3); // +F3 (2-1 in top3)
    expect(report.topN.exactInTop5).toBe(3);
  });

  it("detects upsets and blowouts", () => {
    expect(report.upsetAndBlowout.upsetCount).toBe(1); // F4
    expect(report.upsetAndBlowout.blowoutCount).toBe(2); // F4,F5
    expect(report.upsetAndBlowout.strongFavoriteMissCount).toBe(1); // F4
    expect(report.upsetAndBlowout.underestimatedBlowoutCount).toBe(1); // F5
  });

  it("recommends insufficient_evidence below the sample threshold", () => {
    expect(report.dataset.eligiblePredictions).toBeLessThan(8);
    expect(report.recommendation).toBe("insufficient_evidence");
  });
});

// ---------------------------------------------------------------------------
// Selection policy
// ---------------------------------------------------------------------------

describe("selectAuditSnapshotForFixture", () => {
  const fixture: AuditCompletedFixture = {
    fixtureId: "f1",
    group: "A",
    homeTeam: "H-f1",
    awayTeam: "A-f1",
    homeGoals: 1,
    awayGoals: 0
  };

  it("returns no_snapshot when there are no candidates", () => {
    expect(selectAuditSnapshotForFixture([], { fixture }).exclusionReason).toBe("no_snapshot");
  });

  it("selects the latest valid pre-match snapshot", () => {
    const early = makeSnapshot({ ...INTEGRATION[0]!, id: "f1", capturedAt: "2026-06-11T08:00:00.000Z" });
    const late = makeSnapshot({ ...INTEGRATION[0]!, id: "f1", capturedAt: "2026-06-11T12:00:00.000Z" });
    early.snapshotId = "snap-early";
    late.snapshotId = "snap-late";
    const result = selectAuditSnapshotForFixture([early, late], { fixture });
    expect(result.selected?.snapshotId).toBe("snap-late");
  });

  it("breaks capturedAt ties by snapshotId descending", () => {
    const a = makeSnapshot({ ...INTEGRATION[0]!, id: "f1" });
    const b = makeSnapshot({ ...INTEGRATION[0]!, id: "f1" });
    a.snapshotId = "snap-aaa";
    b.snapshotId = "snap-zzz";
    const result = selectAuditSnapshotForFixture([a, b], { fixture });
    expect(result.selected?.snapshotId).toBe("snap-zzz");
  });

  it("excludes mismatched teams", () => {
    const s = makeSnapshot({ ...INTEGRATION[0]!, id: "f1", homeTeam: "Wrong", awayTeam: "Teams" });
    expect(selectAuditSnapshotForFixture([s], { fixture }).exclusionReason).toBe("mismatched_teams");
  });

  it("excludes post-kickoff snapshots", () => {
    const s = makeSnapshot({
      ...INTEGRATION[0]!,
      id: "f1",
      capturedAt: "2026-06-11T20:00:00.000Z",
      kickoffAt: "2026-06-11T18:00:00.000Z"
    });
    expect(selectAuditSnapshotForFixture([s], { fixture }).exclusionReason).toBe("post_kickoff_snapshot");
  });

  it("excludes malformed probabilities", () => {
    const s = makeSnapshot({ ...INTEGRATION[0]!, id: "f1" });
    s.prediction = { ...s.prediction, homeWinProbability: 0.9, drawProbability: 0.9, awayWinProbability: 0.9 };
    expect(selectAuditSnapshotForFixture([s], { fixture }).exclusionReason).toBe("malformed_data");
  });

  it("excludes unsupported model versions when an allow-list is provided", () => {
    const s = makeSnapshot({ ...INTEGRATION[0]!, id: "f1", modelVersion: "legacy-v0" });
    const result = selectAuditSnapshotForFixture([s], {
      fixture,
      supportedModelVersions: ["wc2026-prediction-live-elo-v1"]
    });
    expect(result.exclusionReason).toBe("unsupported_schema_version");
  });
});

describe("exclusion reasons in the full audit", () => {
  it("reports no_completed_result for snapshots without a completed fixture", () => {
    const input: PredictionUsefulnessAuditInput = {
      generatedAt: "2026-06-22T00:00:00.000Z",
      completedFixtures: [],
      snapshots: [makeSnapshot(INTEGRATION[0]!)]
    };
    const report = runWorldCup2026PredictionUsefulnessAudit(input);
    expect(report.dataset.exclusionReasons.no_completed_result).toBe(1);
    expect(report.dataset.eligiblePredictions).toBe(0);
  });

  it("reports no_snapshot for completed fixtures without a snapshot", () => {
    const input: PredictionUsefulnessAuditInput = {
      generatedAt: "2026-06-22T00:00:00.000Z",
      completedFixtures: [makeCompletedFixture(INTEGRATION[0]!)],
      snapshots: []
    };
    const report = runWorldCup2026PredictionUsefulnessAudit(input);
    expect(report.dataset.exclusionReasons.no_snapshot).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Favorite strength + xG compression
// ---------------------------------------------------------------------------

describe("classifyFavoriteStrength", () => {
  it("maps Elo gaps to named thresholds", () => {
    expect(classifyFavoriteStrength(0)).toBe("balanced");
    expect(classifyFavoriteStrength(49)).toBe("balanced");
    expect(classifyFavoriteStrength(50)).toBe("slight_favorite");
    expect(classifyFavoriteStrength(100)).toBe("moderate_favorite");
    expect(classifyFavoriteStrength(150)).toBe("strong_favorite");
    expect(classifyFavoriteStrength(300)).toBe("heavy_favorite");
  });
});

describe("xG compression thresholds", () => {
  it("counts the share of fixtures below each xG-difference threshold", () => {
    const specs: ScenarioSpec[] = [
      { ...INTEGRATION[4]!, id: "x1", xgH: 1.2, xgA: 1.18 }, // diff 0.02
      { ...INTEGRATION[4]!, id: "x2", xgH: 1.3, xgA: 1.1 }, // diff 0.20
      { ...INTEGRATION[4]!, id: "x3", xgH: 1.7, xgA: 0.9 }, // diff 0.80
      { ...INTEGRATION[4]!, id: "x4", xgH: 2.0, xgA: 0.6 } // diff 1.40
    ];
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(specs));
    expect(report.xgCompression.shareBelow010).toBe(0.25); // only x1
    expect(report.xgCompression.shareBelow025).toBe(0.5); // x1,x2
    expect(report.xgCompression.shareBelow050).toBe(0.5); // x1,x2
    expect(report.xgCompression.shareBelow075).toBe(0.5); // x1,x2
  });

  it("flags strong favorites with under-separated xG", () => {
    const specs: ScenarioSpec[] = [
      { ...INTEGRATION[0]!, id: "sf1", eloH: 1800, eloA: 1500, xgH: 1.3, xgA: 1.1 } // diff 0.2 < 0.4, Elo 300
    ];
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(specs));
    expect(report.xgCompression.strongFavoriteLowXgCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Recommendation branches
// ---------------------------------------------------------------------------

function repeat(base: ScenarioSpec, count: number, mutate: (i: number) => Partial<ScenarioSpec>): ScenarioSpec[] {
  return Array.from({ length: count }, (_unused, i) => ({ ...base, id: `${base.id}-${i}`, ...mutate(i) }));
}

describe("recommendation thresholds", () => {
  it("returns data_quality_blocked when coverage is too low", () => {
    const withSnapshots = repeat(INTEGRATION[0]!, 8, (i) => ({ id: `cov-${i}` }));
    const noSnapshotFixtures: AuditCompletedFixture[] = Array.from({ length: 12 }, (_u, i) => ({
      fixtureId: `empty-${i}`,
      group: "A",
      homeTeam: `H-empty-${i}`,
      awayTeam: `A-empty-${i}`,
      homeGoals: 1,
      awayGoals: 0
    }));
    const input: PredictionUsefulnessAuditInput = {
      generatedAt: "2026-06-22T00:00:00.000Z",
      completedFixtures: [...withSnapshots.map(makeCompletedFixture), ...noSnapshotFixtures],
      snapshots: withSnapshots.map(makeSnapshot)
    };
    const report = runWorldCup2026PredictionUsefulnessAudit(input);
    expect(report.dataset.eligiblePredictions).toBe(8);
    expect(report.dataset.coverageRate).toBeLessThan(0.5);
    expect(report.recommendation).toBe("data_quality_blocked");
  });

  it("returns presentation_change_only for good outcomes but poor exact scores", () => {
    // Strong favorite, correct outcome, but modal score never matches actual,
    // and the actual score is absent from top scorelines (so top-N is not better).
    const specs = repeat(INTEGRATION[0]!, 10, () => ({
      xgH: 1.7,
      xgA: 0.9,
      pH: 0.62,
      pD: 0.23,
      pA: 0.15,
      scorelines: [
        [2, 0, 0.22],
        [1, 0, 0.18],
        [3, 1, 0.12]
      ] as Array<[number, number, number]>,
      actualHome: 4,
      actualAway: 2 // home_win (outcome correct), never in scorelines (exact + topN miss)
    }));
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(specs));
    expect(report.usefulness.outcomeAccuracy).toBe(1);
    expect(report.usefulness.exactScorelineAccuracy).toBe(0);
    expect(report.recommendation).toBe("presentation_change_only");
  });

  it("returns recalibrate_scoreline_selection when top-3 beats top-1 materially", () => {
    // Modal (top1) never matches actual, but actual is the 2nd scoreline (top-3 hit).
    const specs = repeat(INTEGRATION[0]!, 10, () => ({
      xgH: 1.7,
      xgA: 0.9,
      pH: 0.62,
      pD: 0.23,
      pA: 0.15,
      scorelines: [
        [2, 0, 0.22],
        [3, 1, 0.18],
        [1, 0, 0.12]
      ] as Array<[number, number, number]>,
      actualHome: 3,
      actualAway: 1 // matches 2nd scoreline → top3 hit, top1 miss; outcome home_win correct
    }));
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(specs));
    expect(report.usefulness.exactScorelineAccuracy).toBe(0);
    expect(report.topN.exactInTop3Rate).toBe(1);
    expect(report.recommendation).toBe("recalibrate_scoreline_selection");
  });

  it("returns recalibrate_elo_to_xg when xG is compressed and favorites under-separate", () => {
    // Strong favorites (Elo 300) but tiny xG separation across the board.
    const specs = repeat(INTEGRATION[0]!, 10, () => ({
      eloH: 1800,
      eloA: 1500,
      xgH: 1.28,
      xgA: 1.2, // diff 0.08 < 0.25 and < 0.4
      pH: 0.62,
      pD: 0.23,
      pA: 0.15,
      scorelines: [
        [2, 0, 0.22],
        [1, 0, 0.18],
        [2, 1, 0.12]
      ] as Array<[number, number, number]>,
      actualHome: 2,
      actualAway: 0
    }));
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(specs));
    expect(report.xgCompression.shareBelow025).toBe(1);
    expect(report.xgCompression.strongFavoriteLowXgCount).toBe(10);
    expect(report.recommendation).toBe("recalibrate_elo_to_xg");
  });

  it("returns keep_current_model when everything is healthy", () => {
    const specs = repeat(INTEGRATION[0]!, 10, () => ({
      eloH: 1700,
      eloA: 1450,
      xgH: 1.9,
      xgA: 0.7, // diff 1.2, not compressed
      pH: 0.62,
      pD: 0.23,
      pA: 0.15,
      scorelines: [
        [2, 0, 0.3],
        [1, 0, 0.2],
        [2, 1, 0.1]
      ] as Array<[number, number, number]>,
      actualHome: 2,
      actualAway: 0 // exact + outcome correct everywhere
    }));
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(specs));
    expect(report.usefulness.exactScorelineAccuracy).toBe(1);
    expect(report.recommendation).toBe("keep_current_model");
  });
});

// ---------------------------------------------------------------------------
// Determinism / null-safety / immutability / reuse-not-recompute
// ---------------------------------------------------------------------------

describe("safety and determinism", () => {
  it("returns null (never NaN) metrics for an empty dataset", () => {
    const report = runWorldCup2026PredictionUsefulnessAudit({
      generatedAt: "2026-06-22T00:00:00.000Z",
      completedFixtures: [],
      snapshots: []
    });
    expect(report.dataset.eligiblePredictions).toBe(0);
    expect(report.usefulness.outcomeAccuracy).toBeNull();
    expect(report.usefulness.averageBrierScore).toBeNull();
    expect(report.dataset.coverageRate).toBeNull();
    expect(report.recommendation).toBe("insufficient_evidence");
  });

  it("emits no NaN or Infinity anywhere in the report", () => {
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput(INTEGRATION));
    const numbers: number[] = [];
    collectNumbers(report, numbers);
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) {
      expect(Number.isFinite(n)).toBe(true);
    }
  });

  it("produces identical output across repeated runs", () => {
    const first = runWorldCup2026PredictionUsefulnessAudit(buildInput(INTEGRATION));
    const second = runWorldCup2026PredictionUsefulnessAudit(buildInput(INTEGRATION));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("does not mutate the stored snapshots", () => {
    const snapshots = INTEGRATION.map(makeSnapshot);
    const before = JSON.stringify(snapshots);
    runWorldCup2026PredictionUsefulnessAudit({
      generatedAt: "2026-06-22T00:00:00.000Z",
      completedFixtures: INTEGRATION.map(makeCompletedFixture),
      snapshots
    });
    expect(JSON.stringify(snapshots)).toBe(before);
  });

  it("reuses stored snapshot values rather than recomputing predictions", () => {
    // xG values the production model would never emit (it clamps to 1.9 max here)
    // must be echoed verbatim, proving no model recomputation occurs.
    const spec: ScenarioSpec = {
      ...INTEGRATION[0]!,
      id: "echo",
      xgH: 4.2,
      xgA: 0.05,
      scorelines: [
        [4, 0, 0.5],
        [3, 0, 0.2]
      ],
      actualHome: 4,
      actualAway: 0
    };
    const report = runWorldCup2026PredictionUsefulnessAudit(buildInput([spec]));
    expect(report.records[0]?.expectedGoals).toEqual({ home: 4.2, away: 0.05 });
    expect(report.records[0]?.modalScoreline).toEqual({ home: 4, away: 0, probability: 0.5 });
  });
});

// ---------------------------------------------------------------------------
// buildAuditCompletedFixtures joins fixtures + completed results
// ---------------------------------------------------------------------------

describe("buildAuditCompletedFixtures", () => {
  it("joins only completed results that map to a known fixture", () => {
    const fixtures = [
      {
        id: "wc2026-group-a-md1-01-mexico-vs-south-africa",
        group: "A",
        matchday: 1,
        order: 1,
        groupFixtureOrder: 1,
        homeTeam: "Mexico",
        awayTeam: "South Africa",
        status: "completed" as const,
        dateStatus: "deferred" as const,
        venueStatus: "deferred" as const
      }
    ];
    const results = [
      {
        fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
        status: "completed" as const,
        homeScore: 2,
        awayScore: 1,
        resultSource: "local_static" as const,
        updatedAt: "2026-06-14"
      },
      {
        fixtureId: "unknown-fixture",
        status: "completed" as const,
        homeScore: 1,
        awayScore: 0,
        resultSource: "local_static" as const
      },
      {
        fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
        status: "scheduled" as const,
        resultSource: "local_static" as const
      }
    ];
    const completed = buildAuditCompletedFixtures(fixtures, results);
    expect(completed).toHaveLength(1);
    expect(completed[0]).toEqual({
      fixtureId: "wc2026-group-a-md1-01-mexico-vs-south-africa",
      group: "A",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      homeGoals: 2,
      awayGoals: 1
    });
  });
});
