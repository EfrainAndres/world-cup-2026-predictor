import { describe, test, expect, beforeEach } from "vitest";
import { predictMatchFromLiveElo } from "../src/routes.js";
import { createAttackDefenseProductionDependencies } from "../src/attack-defense-server-composition.js";
import {
  assessAttackDefenseRuntimeEligibility,
  findFirstEligibleAttackDefenseRuntimeMatchup,
} from "../src/attack-defense-runtime-profile-source.js";
import { resetAttackDefenseRuntimeProfileCache } from "../src/attack-defense-runtime-profile-source.server.js";
import type { AttackDefenseRuntimeProfilesResult } from "../src/attack-defense-runtime-profile-source.js";
import { buildCompetitionGoalEnvironment } from "../src/attack-defense-profile-builder.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TeamAttackDefenseProfile } from "../../model/src/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = join(__dir, "../../../docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json");

function loadRealArtifact(): unknown {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

function makeRuntimeProfile(
  teamId: string,
  coverage: TeamAttackDefenseProfile["coverage"],
  matchCount: number
): TeamAttackDefenseProfile {
  return {
    teamId,
    competitionId: "world_cup",
    attackStrength: 1.0,
    defenseStrength: 1.0,
    attackSampleSize: matchCount,
    defenseSampleSize: matchCount,
    goalsForPerMatch: matchCount === 0 ? null : 1.2,
    goalsAgainstPerMatch: matchCount === 0 ? null : 1.1,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: 0,
    recencyWeight: matchCount === 0 ? 0 : 0.8,
    coverage,
    cutoffAt: "2026-06-11",
  };
}

function makeRuntimeProfiles(
  profiles: Map<string, TeamAttackDefenseProfile>
): AttackDefenseRuntimeProfilesResult {
  return {
    profiles,
    competitionEnv: buildCompetitionGoalEnvironment({
      competitionId: "world_cup",
      cutoffAt: "2026-06-11",
      historicalMatches: [],
    }),
    coverageStats: {
      full: 0,
      partial: 0,
      sparse: 0,
      fallback: 0,
      total: profiles.size,
      fallbackRate: 0,
    },
    cutoffAt: "2026-06-11",
    builtAt: "2026-06-30T00:00:00.000Z",
    artifact: {
      sourceKind: "embedded_production_runtime_profiles",
      schemaVersion: "1.0.0",
      candidateId: "attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0",
      fingerprint: "sha256:test",
      fingerprintShort: "test",
      profileCount: profiles.size,
      sourceFixtureCount: 0,
    },
  };
}

function findEligibleFixture(): { homeTeam: string; awayTeam: string } {
  const deps = createAttackDefenseProductionDependencies({
    env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
    selectedCandidateArtifact: loadRealArtifact(),
  });

  if (deps.attackDefenseProfiles === undefined) {
    throw new Error("Expected runtime profiles to be available.");
  }

  const fixture = findFirstEligibleAttackDefenseRuntimeMatchup(deps.attackDefenseProfiles.profiles);
  if (fixture === null) {
    throw new Error("Expected at least one eligible runtime fixture.");
  }

  expect(
    assessAttackDefenseRuntimeEligibility(fixture.homeTeam, fixture.awayTeam, deps.attackDefenseProfiles.profiles)
  ).toEqual({ eligible: true });

  return fixture;
}

beforeEach(() => {
  resetAttackDefenseRuntimeProfileCache();
});

describe("predictMatchFromLiveElo — AD mode off (default)", () => {
  test("no attackDefenseGoalModel in response when no deps provided", () => {
    const eligible = findEligibleFixture();
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.attackDefenseGoalModel).toBeUndefined();
    }
  });

  test("no attackDefenseGoalModel when AD mode explicitly off", () => {
    const eligible = findEligibleFixture();
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "off" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam }, deps);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.attackDefenseGoalModel?.mode).toBe("off");
      expect(result.attackDefenseGoalModel?.applied).toBe(false);
    }
  });
});

describe("predictMatchFromLiveElo — AD mode shadow", () => {
  test("shadow mode: baseline applied, shadow xG computed and recorded", () => {
    const eligible = findEligibleFixture();
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam }, deps);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta).toBeDefined();
    expect(adMeta?.mode).toBe("shadow");
    expect(adMeta?.applied).toBe(false);
    expect(adMeta?.shadowExpectedGoals).toBeDefined();
    expect(adMeta?.baselineExpectedGoals.home).toBeGreaterThan(0);
    expect(adMeta?.effectiveExpectedGoals.home).toBe(adMeta?.baselineExpectedGoals.home);
  });

  test("shadow mode: effective xG equals baseline xG (baseline is authoritative)", () => {
    const eligible = findEligibleFixture();
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam }, deps);
    if (result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta?.effectiveExpectedGoals.home).toBe(result.expectedGoals.home);
    expect(adMeta?.effectiveExpectedGoals.away).toBe(result.expectedGoals.away);
  });

  test("shadow mode with away sparse keeps baseline authoritative and may expose diagnostics", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    if (deps.attackDefenseReadiness.ready !== true) throw new Error("Expected AD readiness.");

    const result = predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Japan", preset: "balanced" },
      {
        ...deps,
        attackDefenseProfiles: makeRuntimeProfiles(
          new Map([
            ["Brazil", makeRuntimeProfile("Brazil", "partial", 5)],
            ["Japan", makeRuntimeProfile("Japan", "sparse", 1)],
          ])
        ),
      }
    );

    if (result.status !== "success") return;
    expect(result.attackDefenseGoalModel?.applied).toBe(false);
    expect(result.attackDefenseGoalModel?.reason).toBe("away_profile_sparse");
    expect(result.attackDefenseGoalModel?.effectiveExpectedGoals).toEqual(result.attackDefenseGoalModel?.baselineExpectedGoals);
    expect(result.attackDefenseGoalModel?.shadowExpectedGoals).toBeDefined();
  });

  test("shadow mode with away fallback keeps baseline authoritative and may expose diagnostics", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    if (deps.attackDefenseReadiness.ready !== true) throw new Error("Expected AD readiness.");

    const result = predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Haiti", preset: "balanced" },
      {
        ...deps,
        attackDefenseProfiles: makeRuntimeProfiles(
          new Map([
            ["Brazil", makeRuntimeProfile("Brazil", "partial", 5)],
            ["Haiti", makeRuntimeProfile("Haiti", "fallback", 0)],
          ])
        ),
      }
    );

    if (result.status !== "success") return;
    expect(result.attackDefenseGoalModel?.applied).toBe(false);
    expect(result.attackDefenseGoalModel?.reason).toBe("away_profile_fallback");
    expect(result.attackDefenseGoalModel?.effectiveExpectedGoals).toEqual(result.attackDefenseGoalModel?.baselineExpectedGoals);
    expect(result.attackDefenseGoalModel?.shadowExpectedGoals).toBeDefined();
  });
});

describe("predictMatchFromLiveElo — AD mode on", () => {
  test("on mode: AD xG is applied (effective xG may differ from baseline)", () => {
    const eligible = findEligibleFixture();
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam }, deps);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta).toBeDefined();
    expect(adMeta?.mode).toBe("on");
    expect(adMeta?.applied).toBe(true);
    expect(adMeta?.candidateId).toBeDefined();
    expect(adMeta?.shadowExpectedGoals).toBeUndefined();
  });

  test("on mode: profile metadata is present", () => {
    const eligible = findEligibleFixture();
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam }, deps);
    if (result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta?.homeProfile).not.toBeNull();
    expect(adMeta?.awayProfile).not.toBeNull();
    expect(adMeta?.homeProfile?.cutoffAt).toBeDefined();
  });
  test("on mode with away sparse keeps Elo baseline authoritative", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    if (deps.attackDefenseReadiness.ready !== true) throw new Error("Expected AD readiness.");

    const result = predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Japan", preset: "balanced" },
      {
        ...deps,
        attackDefenseProfiles: makeRuntimeProfiles(
          new Map([
            ["Brazil", makeRuntimeProfile("Brazil", "partial", 5)],
            ["Japan", makeRuntimeProfile("Japan", "sparse", 1)],
          ])
        ),
      }
    );

    if (result.status !== "success") return;
    expect(result.attackDefenseGoalModel?.applied).toBe(false);
    expect(result.attackDefenseGoalModel?.reason).toBe("away_profile_sparse");
    expect(result.attackDefenseGoalModel?.effectiveExpectedGoals).toEqual(result.attackDefenseGoalModel?.baselineExpectedGoals);
    expect(result.expectedGoals.home).toBe(result.attackDefenseGoalModel?.baselineExpectedGoals.home);
    expect(result.attackDefenseGoalModel?.awayProfile?.coverage).toBe("sparse");
    expect(result.attackDefenseGoalModel?.awayProfile?.matchCount).toBe(1);
  });

  test("on mode with away fallback keeps Elo baseline authoritative", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    if (deps.attackDefenseReadiness.ready !== true) throw new Error("Expected AD readiness.");

    const result = predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Haiti", preset: "balanced" },
      {
        ...deps,
        attackDefenseProfiles: makeRuntimeProfiles(
          new Map([
            ["Brazil", makeRuntimeProfile("Brazil", "partial", 5)],
            ["Haiti", makeRuntimeProfile("Haiti", "fallback", 0)],
          ])
        ),
      }
    );

    if (result.status !== "success") return;
    expect(result.attackDefenseGoalModel?.applied).toBe(false);
    expect(result.attackDefenseGoalModel?.reason).toBe("away_profile_fallback");
    expect(result.attackDefenseGoalModel?.effectiveExpectedGoals).toEqual(result.attackDefenseGoalModel?.baselineExpectedGoals);
    expect(result.expectedGoals.away).toBe(result.attackDefenseGoalModel?.baselineExpectedGoals.away);
    expect(result.attackDefenseGoalModel?.awayProfile?.coverage).toBe("fallback");
    expect(result.attackDefenseGoalModel?.awayProfile?.matchCount).toBe(0);
  });
});

describe("predictMatchFromLiveElo — StatsBomb × AD interaction matrix", () => {
  test("AD shadow + SB off: baseline used, AD shadow recorded", () => {
    const eligible = findEligibleFixture();
    const adDeps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam }, adDeps);
    if (result.status !== "success") return;

    expect(result.attackDefenseGoalModel?.applied).toBe(false);
    expect(result.statsBombSignal).toBeUndefined();
  });

  test("AD on + SB off: AD xG applied, no statsBombSignal", () => {
    const eligible = findEligibleFixture();
    const adDeps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam }, adDeps);
    if (result.status !== "success") return;

    expect(result.attackDefenseGoalModel?.applied).toBe(true);
    expect(result.statsBombSignal).toBeUndefined();
  });
});

describe("predictMatchFromLiveElo — snapshot protection", () => {
  test("no AD deps in plain predictMatchFromLiveElo call (baseline-only equivalent)", () => {
    const eligible = findEligibleFixture();
    const result = predictMatchFromLiveElo({ homeTeam: eligible.homeTeam, awayTeam: eligible.awayTeam });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.attackDefenseGoalModel).toBeUndefined();
    }
  });
});
