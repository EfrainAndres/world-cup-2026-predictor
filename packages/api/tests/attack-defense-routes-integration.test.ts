import { describe, test, expect, beforeEach } from "vitest";
import { predictMatchFromLiveElo } from "../src/routes.js";
import { createAttackDefenseProductionDependencies } from "../src/attack-defense-server-composition.js";
import { resetAttackDefenseRuntimeProfileCache } from "../src/attack-defense-runtime-profile-source.server.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = join(__dir, "../../../docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json");

function loadRealArtifact(): unknown {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

const HOME_TEAM = "Brazil";
const AWAY_TEAM = "Argentina";

beforeEach(() => {
  resetAttackDefenseRuntimeProfileCache();
});

describe("predictMatchFromLiveElo — AD mode off (default)", () => {
  test("no attackDefenseGoalModel in response when no deps provided", () => {
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.attackDefenseGoalModel).toBeUndefined();
    }
  });

  test("no attackDefenseGoalModel when AD mode explicitly off", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "off" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM }, deps);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.attackDefenseGoalModel?.mode).toBe("off");
      expect(result.attackDefenseGoalModel?.applied).toBe(false);
    }
  });
});

describe("predictMatchFromLiveElo — AD mode shadow", () => {
  test("shadow mode: baseline applied, shadow xG computed and recorded", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM }, deps);
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
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM }, deps);
    if (result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta?.effectiveExpectedGoals.home).toBe(result.expectedGoals.home);
    expect(adMeta?.effectiveExpectedGoals.away).toBe(result.expectedGoals.away);
  });
});

describe("predictMatchFromLiveElo — AD mode on", () => {
  test("on mode: AD xG is applied (effective xG may differ from baseline)", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM }, deps);
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
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM }, deps);
    if (result.status !== "success") return;

    const adMeta = result.attackDefenseGoalModel;
    expect(adMeta?.homeProfile).not.toBeNull();
    expect(adMeta?.awayProfile).not.toBeNull();
    expect(adMeta?.homeProfile?.cutoffAt).toBeDefined();
  });
});

describe("predictMatchFromLiveElo — StatsBomb × AD interaction matrix", () => {
  test("AD shadow + SB off: baseline used, AD shadow recorded", () => {
    const adDeps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM }, adDeps);
    if (result.status !== "success") return;

    expect(result.attackDefenseGoalModel?.applied).toBe(false);
    expect(result.statsBombSignal).toBeUndefined();
  });

  test("AD on + SB off: AD xG applied, no statsBombSignal", () => {
    const adDeps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM }, adDeps);
    if (result.status !== "success") return;

    expect(result.attackDefenseGoalModel?.applied).toBe(true);
    expect(result.statsBombSignal).toBeUndefined();
  });
});

describe("predictMatchFromLiveElo — snapshot protection", () => {
  test("no AD deps in plain predictMatchFromLiveElo call (baseline-only equivalent)", () => {
    const result = predictMatchFromLiveElo({ homeTeam: HOME_TEAM, awayTeam: AWAY_TEAM });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.attackDefenseGoalModel).toBeUndefined();
    }
  });
});
