/**
 * Phase 12.21B — Stage-pipeline composition matrix tests.
 * Asserts that StatsBomb always receives the current authoritative xG produced by the AD stage,
 * not the original Elo V2 baseline. Covers all 9 AD×SB mode combinations.
 */
import { describe, test, expect, beforeEach } from "vitest";
import { predictMatchFromLiveElo } from "../src/routes.js";
import { createAttackDefenseProductionDependencies } from "../src/attack-defense-server-composition.js";
import { resetAttackDefenseRuntimeProfileCache } from "../src/attack-defense-runtime-profile-source.server.js";
import { findFirstEligibleAttackDefenseRuntimeMatchup } from "../src/attack-defense-runtime-profile-source.js";
import { createInMemoryTeamPerformanceProfileSource } from "../src/statsbomb-artifact-profile-source.js";
import type { StatsBombProductionReadiness } from "../src/statsbomb-production-config.js";
import type { TeamPerformanceProfile } from "../src/providers/statsbomb/index.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = join(
  __dir,
  "../../../docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json"
);

function loadRealArtifact(): unknown {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

const SB_READY: StatsBombProductionReadiness = {
  ready: true,
  profileCount: 48,
  cutoffAt: "2026-06-01T00:00:00.000Z",
  generatedAt: "2026-06-29T00:00:00.000Z"
};

function makeProfile(
  overrides: Partial<TeamPerformanceProfile> & { teamId: string; canonicalName: string }
): TeamPerformanceProfile {
  return {
    provider: "statsbomb_open_data",
    cutoffAt: "2026-06-01T00:00:00.000Z",
    latestMatchAt: "2024-07-01",
    matchCount: 15,
    minutesPlayed: 1350,
    shotCountFor: 120,
    shotCountAgainst: 80,
    xgSampleCountFor: 100,
    xgSampleCountAgainst: 70,
    totalXgFor: 18,
    totalXgAgainst: 12,
    xgForPer90: 1.4,
    xgAgainstPer90: 0.7,
    goalsFor: 20,
    goalsAgainst: 10,
    goalsForPer90: 1.33,
    goalsAgainstPer90: 0.67,
    shotQualityFor: 0.15,
    shotQualityAgainst: 0.15,
    uniqueOpponentCount: 10,
    coverage: "full",
    freshness: "fresh",
    sources: [],
    warnings: [],
    ...overrides
  };
}

/**
 * Finds an eligible AD matchup from the real artifact and builds a StatsBomb profile source
 * for that same pair of teams so we can test AD×SB interactions cleanly.
 */
function findEligibleFixtureWithSbProfiles(): {
  homeTeam: string;
  awayTeam: string;
  sbProfileSource: ReturnType<typeof createInMemoryTeamPerformanceProfileSource>;
  adDepsOn: ReturnType<typeof createAttackDefenseProductionDependencies>;
  adDepsShadow: ReturnType<typeof createAttackDefenseProductionDependencies>;
  adDepsOff: ReturnType<typeof createAttackDefenseProductionDependencies>;
} {
  const adDepsOn = createAttackDefenseProductionDependencies({
    env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
    selectedCandidateArtifact: loadRealArtifact()
  });
  if (adDepsOn.attackDefenseProfiles === undefined) {
    throw new Error("Expected runtime profiles to be available.");
  }
  const fixture = findFirstEligibleAttackDefenseRuntimeMatchup(adDepsOn.attackDefenseProfiles.profiles);
  if (fixture === null) {
    throw new Error("Expected at least one eligible runtime fixture.");
  }

  const adDepsShadow = createAttackDefenseProductionDependencies({
    env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
    selectedCandidateArtifact: loadRealArtifact()
  });
  const adDepsOff = createAttackDefenseProductionDependencies({
    env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "off" },
    selectedCandidateArtifact: loadRealArtifact()
  });

  // Build StatsBomb profiles for the same two teams with distinctive xG values
  const sbProfileSource = createInMemoryTeamPerformanceProfileSource([
    makeProfile({ teamId: fixture.homeTeam.toLowerCase(), canonicalName: fixture.homeTeam, xgForPer90: 1.8, xgAgainstPer90: 0.5 }),
    makeProfile({ teamId: fixture.awayTeam.toLowerCase(), canonicalName: fixture.awayTeam, xgForPer90: 0.9, xgAgainstPer90: 1.2 })
  ]);

  return { homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam, sbProfileSource, adDepsOn, adDepsShadow, adDepsOff };
}

beforeEach(() => {
  resetAttackDefenseRuntimeProfileCache();
});

// ---------------------------------------------------------------------------
// AD off × SB off
// ---------------------------------------------------------------------------

describe("pipeline: AD off + SB off", () => {
  test("final xG = Elo V2 baseline; no SB or AD metadata", () => {
    const { homeTeam, awayTeam } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      attackDefenseMode: "off",
      attackDefenseReadiness: { ready: false, reason: "feature_disabled" } as any,
      attackDefenseActivationDecision: "disabled",
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    expect(result.expectedGoals.home).toBe(baseline.expectedGoals.home);
    expect(result.expectedGoals.away).toBe(baseline.expectedGoals.away);
    expect(result.statsBombSignal).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AD off × SB shadow — SB stage input must equal Elo V2 (assertion 1)
// ---------------------------------------------------------------------------

describe("pipeline: AD off + SB shadow (assertion 1)", () => {
  test("SB stage input = Elo V2 baseline; SB shadow candidate computed from Elo baseline", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOff } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOff,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "shadow",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "shadow_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const sb = result.statsBombSignal;
    expect(sb).toBeDefined();
    expect(sb?.rolloutMode).toBe("shadow");
    expect(sb?.applied).toBe(false);
    expect(sb?.authoritative).toBe("baseline");
    // Stage input = Elo V2 (AD was off — no prior stage changed the authoritative xG)
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
    expect(sb?.baselineExpectedGoals.away).toBeCloseTo(baseline.expectedGoals.away, 6);
    // No originalEloExpectedGoals because stage input equals original Elo
    expect(sb?.originalEloExpectedGoals).toBeUndefined();
    // final authoritative xG unchanged
    expect(result.expectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
    expect(result.expectedGoals.away).toBeCloseTo(baseline.expectedGoals.away, 6);
  });
});

// ---------------------------------------------------------------------------
// AD off × SB on — final xG = SB adjusted candidate
// ---------------------------------------------------------------------------

describe("pipeline: AD off + SB on", () => {
  test("SB stage input = Elo V2; final xG = SB adjusted when eligible and applied", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOff } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOff,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "on",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "production_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const sb = result.statsBombSignal;
    expect(sb).toBeDefined();
    expect(sb?.rolloutMode).toBe("on");
    // Stage input = Elo V2 (AD was off)
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
    expect(sb?.originalEloExpectedGoals).toBeUndefined();
    if (sb?.applied === true) {
      expect(result.expectedGoals.home).toBe(sb.adjustedExpectedGoals.home);
      expect(result.expectedGoals.away).toBe(sb.adjustedExpectedGoals.away);
    }
  });
});

// ---------------------------------------------------------------------------
// AD shadow × SB off — final xG = Elo V2; AD shadow candidate recorded
// ---------------------------------------------------------------------------

describe("pipeline: AD shadow + SB off", () => {
  test("final xG = Elo V2; AD shadow candidate recorded, SB absent", () => {
    const { homeTeam, awayTeam, adDepsShadow } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, adDepsShadow);

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    // AD shadow: baseline is authoritative, shadow candidate recorded
    expect(result.attackDefenseGoalModel?.mode).toBe("shadow");
    expect(result.attackDefenseGoalModel?.applied).toBe(false);
    expect(result.attackDefenseGoalModel?.shadowExpectedGoals).toBeDefined();
    // final xG = Elo V2
    expect(result.expectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
    expect(result.statsBombSignal).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AD shadow × SB shadow — SB stage input = Elo V2 (assertion 2)
// ---------------------------------------------------------------------------

describe("pipeline: AD shadow + SB shadow (assertion 2)", () => {
  test("SB stage input = Elo V2; AD and SB both non-authoritative", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsShadow } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsShadow,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "shadow",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "shadow_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const sb = result.statsBombSignal;
    expect(sb).toBeDefined();
    expect(sb?.rolloutMode).toBe("shadow");
    expect(sb?.applied).toBe(false);
    // AD shadow does NOT change effective xG — stage input = Elo V2
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
    expect(sb?.baselineExpectedGoals.away).toBeCloseTo(baseline.expectedGoals.away, 6);
    // No originalEloExpectedGoals because stage input = Elo V2
    expect(sb?.originalEloExpectedGoals).toBeUndefined();
    // final xG still Elo V2
    expect(result.expectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
  });
});

// ---------------------------------------------------------------------------
// AD shadow × SB on — SB stage input = Elo V2 (assertion 3)
// ---------------------------------------------------------------------------

describe("pipeline: AD shadow + SB on (assertion 3)", () => {
  test("SB stage input = Elo V2 (AD shadow did not change authoritative xG)", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsShadow } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsShadow,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "on",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "production_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const sb = result.statsBombSignal;
    expect(sb).toBeDefined();
    // Stage input = Elo V2 (AD shadow is non-authoritative)
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
    expect(sb?.originalEloExpectedGoals).toBeUndefined();
    // AD shadow candidate was recorded
    expect(result.attackDefenseGoalModel?.shadowExpectedGoals).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AD on × SB off — final xG = AD candidate (assertion 4)
// ---------------------------------------------------------------------------

describe("pipeline: AD on + SB off (assertion 4)", () => {
  test("final xG = AD authoritative candidate; SB absent", () => {
    const { homeTeam, awayTeam, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, adDepsOn);

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta?.mode).toBe("on");
    expect(adMeta?.applied).toBe(true);
    // final xG = AD candidate (differs from Elo baseline)
    expect(result.expectedGoals.home).toBe(adMeta?.effectiveExpectedGoals.home);
    expect(result.expectedGoals.away).toBe(adMeta?.effectiveExpectedGoals.away);
    expect(result.expectedGoals.home).not.toBeCloseTo(baseline.expectedGoals.home, 1);
    expect(result.statsBombSignal).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AD on × SB shadow — SB stage input = AD candidate (assertion 5)
// ---------------------------------------------------------------------------

describe("pipeline: AD on + SB shadow (assertion 5 — key defect regression)", () => {
  test("SB stage input equals AD authoritative candidate, not original Elo", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOn,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "shadow",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "shadow_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    const sb = result.statsBombSignal;

    expect(adMeta?.mode).toBe("on");
    expect(adMeta?.applied).toBe(true);
    expect(sb).toBeDefined();
    expect(sb?.rolloutMode).toBe("shadow");

    // KEY: SB stage input must equal AD authoritative candidate
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(adMeta!.effectiveExpectedGoals.home, 6);
    expect(sb?.baselineExpectedGoals.away).toBeCloseTo(adMeta!.effectiveExpectedGoals.away, 6);

    // KEY: SB stage input must NOT equal original Elo baseline
    expect(sb?.baselineExpectedGoals.home).not.toBeCloseTo(baseline.expectedGoals.home, 1);

    // originalEloExpectedGoals present as diagnostic
    expect(sb?.originalEloExpectedGoals).toBeDefined();
    expect(sb?.originalEloExpectedGoals?.home).toBeCloseTo(baseline.expectedGoals.home, 6);

    // SB shadow is non-authoritative — final xG = AD candidate
    expect(sb?.applied).toBe(false);
    expect(sb?.authoritative).toBe("baseline");
    expect(result.expectedGoals.home).toBeCloseTo(adMeta!.effectiveExpectedGoals.home, 6);
    expect(result.expectedGoals.away).toBeCloseTo(adMeta!.effectiveExpectedGoals.away, 6);

    // SB shadow adjusted xG was computed starting from AD candidate (not Elo baseline)
    if (sb?.shadowAdjustedExpectedGoals !== undefined) {
      // The shadow adjustment must not equal the xgResult delta from Elo baseline
      // (i.e. it was computed from the AD xG, not recalculated from scratch on Elo)
      expect(sb.shadowAdjustedExpectedGoals.home).not.toBeCloseTo(baseline.expectedGoals.home, 2);
    }
  });

  test("final public probabilities use AD authoritative xG (not Elo baseline) in shadow mode", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const adOnlyResult = predictMatchFromLiveElo({ homeTeam, awayTeam }, adDepsOn);
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOn,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "shadow",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "shadow_ready"
    });

    expect(adOnlyResult.status).toBe("success");
    expect(result.status).toBe("success");
    if (adOnlyResult.status !== "success" || result.status !== "success") return;

    // SB shadow does not change final xG — same as AD-only result
    expect(result.expectedGoals.home).toBeCloseTo(adOnlyResult.expectedGoals.home, 6);
    expect(result.expectedGoals.away).toBeCloseTo(adOnlyResult.expectedGoals.away, 6);
    expect(result.outcomeProbabilities.homeWinProbability).toBeCloseTo(
      adOnlyResult.outcomeProbabilities.homeWinProbability, 4
    );
  });

  test("no double application: AD applied once and SB shadow does not compound on top of AD", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const adOnlyResult = predictMatchFromLiveElo({ homeTeam, awayTeam }, adDepsOn);
    const adAndSbResult = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOn,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "shadow",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "shadow_ready"
    });

    expect(adOnlyResult.status).toBe("success");
    expect(adAndSbResult.status).toBe("success");
    if (adOnlyResult.status !== "success" || adAndSbResult.status !== "success") return;

    // AD metadata identical — AD was applied once
    expect(adAndSbResult.attackDefenseGoalModel?.effectiveExpectedGoals).toEqual(
      adOnlyResult.attackDefenseGoalModel?.effectiveExpectedGoals
    );
    expect(adAndSbResult.attackDefenseGoalModel?.applied).toBe(true);
    // original Elo preserved separately — not mutated
    expect(adAndSbResult.statsBombSignal?.originalEloExpectedGoals).toBeDefined();
    expect(adAndSbResult.statsBombSignal?.originalEloExpectedGoals).not.toEqual(
      adAndSbResult.attackDefenseGoalModel?.effectiveExpectedGoals
    );
  });
});

// ---------------------------------------------------------------------------
// AD on × SB on — SB stage input = AD candidate; final xG = SB adjusted (assertion 6)
// ---------------------------------------------------------------------------

describe("pipeline: AD on + SB on (assertion 6)", () => {
  test("SB stage input = AD candidate; when SB applied, final xG = SB adjusted candidate", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOn,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "on",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "production_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    const sb = result.statsBombSignal;

    expect(adMeta?.applied).toBe(true);
    expect(sb?.rolloutMode).toBe("on");
    // Stage input = AD candidate
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(adMeta!.effectiveExpectedGoals.home, 6);
    expect(sb?.baselineExpectedGoals.away).toBeCloseTo(adMeta!.effectiveExpectedGoals.away, 6);
    // originalEloExpectedGoals present
    expect(sb?.originalEloExpectedGoals?.home).toBeCloseTo(baseline.expectedGoals.home, 6);

    if (sb?.applied === true) {
      // final xG = SB adjusted candidate (computed from AD xG baseline)
      expect(result.expectedGoals.home).toBe(sb.adjustedExpectedGoals.home);
      expect(result.expectedGoals.away).toBe(sb.adjustedExpectedGoals.away);
      // SB adjusted ≠ original Elo (pipeline composed correctly)
      expect(result.expectedGoals.home).not.toBeCloseTo(baseline.expectedGoals.home, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// AD rejected + SB shadow/on — SB stage input = Elo V2 (assertion 7)
// ---------------------------------------------------------------------------

describe("pipeline: AD rejected + SB shadow (assertion 7)", () => {
  test("SB stage input = Elo V2 when AD profiles unavailable (source_unavailable path)", () => {
    const { homeTeam, awayTeam, sbProfileSource } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });

    // AD mode=on but profiles not loaded — simulates source_unavailable (artifact_missing, etc.)
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      attackDefenseMode: "on",
      attackDefenseReadiness: { ready: false, reason: "artifact_missing" } as any,
      attackDefenseActivationDecision: "blocked_artifact",
      // attackDefenseProfiles deliberately omitted
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "shadow",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "shadow_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    const sb = result.statsBombSignal;

    // AD not applied — source was unavailable
    expect(adMeta?.mode).toBe("on");
    expect(adMeta?.applied).toBe(false);
    expect(sb).toBeDefined();
    expect(sb?.rolloutMode).toBe("shadow");
    // SB stage input = Elo V2 (AD did not change effective xG)
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
    // No originalEloExpectedGoals because stage input = Elo V2
    expect(sb?.originalEloExpectedGoals).toBeUndefined();
    // final xG = Elo V2
    expect(result.expectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
  });
});

// ---------------------------------------------------------------------------
// SB rejected — final xG = current authoritative input (assertion 8)
// ---------------------------------------------------------------------------

describe("pipeline: SB rejected (assertion 8)", () => {
  test("when SB source unavailable, final xG remains current authoritative (AD candidate if on)", () => {
    const { homeTeam, awayTeam, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOn,
      statsBombSignalMode: "on",
      statsBombReadiness: { ready: false, reason: "artifact_missing" },
      statsBombActivationDecision: "blocked_artifact"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta?.applied).toBe(true);
    const sb = result.statsBombSignal;
    expect(sb?.applied).toBe(false);
    expect(sb?.reason).toBe("source_unavailable");
    // final xG = AD candidate (SB rejected, prior authoritative preserved)
    expect(result.expectedGoals.home).toBe(adMeta?.effectiveExpectedGoals.home);
    expect(result.expectedGoals.away).toBe(adMeta?.effectiveExpectedGoals.away);
    // SB stage input shows AD candidate (not Elo) as the incoming authoritative
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(adMeta!.effectiveExpectedGoals.home, 6);
    expect(sb?.originalEloExpectedGoals?.home).toBeCloseTo(baseline.expectedGoals.home, 6);
  });
});

// ---------------------------------------------------------------------------
// Assertion 9 — no stage uses stale route-level xG after another stage has
// changed the authoritative value.
// ---------------------------------------------------------------------------

describe("pipeline: no stale xG propagation across stages (assertion 9)", () => {
  test("SB adjustedExpectedGoals computed from AD xG, not from original Elo", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOn,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "on",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "production_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    const sb = result.statsBombSignal;
    const adMeta = result.attackDefenseGoalModel;

    // The SB stage input in metadata reflects AD output
    expect(sb?.baselineExpectedGoals.home).toBeCloseTo(adMeta!.effectiveExpectedGoals.home, 6);

    // Original Elo diagnostic is preserved separately
    expect(sb?.originalEloExpectedGoals?.home).toBeCloseTo(baseline.expectedGoals.home, 6);

    // SB adjustedExpectedGoals is different from both original Elo and AD candidate
    // (unless SB didn't apply, which is acceptable — the key is stage input correctness)
    if (sb?.applied === true) {
      // SB adjusted was built starting from AD xG, not Elo
      expect(sb.adjustedExpectedGoals.home).not.toBeCloseTo(baseline.expectedGoals.home, 2);
    }
  });

  test("AD baselineExpectedGoals still reflects original Elo (not mutated)", () => {
    const { homeTeam, awayTeam, sbProfileSource, adDepsOn } = findEligibleFixtureWithSbProfiles();
    const baseline = predictMatchFromLiveElo({ homeTeam, awayTeam });
    const result = predictMatchFromLiveElo({ homeTeam, awayTeam }, {
      ...adDepsOn,
      statsBombProfileSource: sbProfileSource,
      statsBombSignalMode: "shadow",
      statsBombReadiness: SB_READY,
      statsBombActivationDecision: "shadow_ready"
    });

    expect(result.status).toBe("success");
    if (baseline.status !== "success" || result.status !== "success") return;

    // AD metadata: baselineExpectedGoals = original Elo (not contaminated by SB)
    expect(result.attackDefenseGoalModel?.baselineExpectedGoals.home).toBeCloseTo(baseline.expectedGoals.home, 6);
  });
});
