import { describe, test, expect, beforeEach } from "vitest";
import {
  createAttackDefenseProductionDependencies,
} from "../src/attack-defense-server-composition.js";
import {
  ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID,
} from "../src/attack-defense-production-config.js";
import { resetAttackDefenseRuntimeProfileCache } from "../src/attack-defense-runtime-profile-source.server.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = join(__dir, "../../../docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json");

function loadRealArtifact(): unknown {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

beforeEach(() => {
  resetAttackDefenseRuntimeProfileCache();
});

describe("createAttackDefenseProductionDependencies — mode off", () => {
  test("returns disabled when mode is off", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "off" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    expect(deps.attackDefenseMode).toBe("off");
    expect(deps.attackDefenseActivationDecision).toBe("disabled");
    expect(deps.attackDefenseDiagnostics.featureEnabled).toBe(false);
    expect(deps.attackDefenseProfiles).toBeUndefined();
  });

  test("defaults to off when env var is missing", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: {},
      selectedCandidateArtifact: loadRealArtifact()
    });
    expect(deps.attackDefenseMode).toBe("off");
    expect(deps.attackDefenseActivationDecision).toBe("disabled");
  });
});

describe("createAttackDefenseProductionDependencies — mode shadow", () => {
  test("returns shadow_ready with valid artifact", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    expect(deps.attackDefenseMode).toBe("shadow");
    expect(deps.attackDefenseActivationDecision).toBe("shadow_ready");
    expect(deps.attackDefenseDiagnostics.featureEnabled).toBe(true);
    expect(deps.attackDefenseDiagnostics.candidateId).toBe(ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID);
    expect(deps.attackDefenseProfiles).toBeDefined();
  });

  test("returns blocked_artifact with missing artifact", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "shadow" },
      selectedCandidateArtifact: null
    });
    expect(deps.attackDefenseActivationDecision).toBe("blocked_artifact");
    expect(deps.attackDefenseProfiles).toBeUndefined();
  });
});

describe("createAttackDefenseProductionDependencies — mode on", () => {
  test("returns production_ready with valid artifact", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact()
    });
    expect(deps.attackDefenseMode).toBe("on");
    expect(deps.attackDefenseActivationDecision).toBe("production_ready");
    expect(deps.attackDefenseProfiles).toBeDefined();
    expect(deps.attackDefenseDiagnostics.runtimeProfileArtifactReady).toBe(true);
    expect(deps.attackDefenseDiagnostics.runtimeProfileArtifactFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(deps.attackDefenseDiagnostics.runtimeProfileCount).toBe(48);
    expect(deps.attackDefenseDiagnostics.runtimeProfileSourceFixtureCount).toBe(312);
  });

  test("missing runtime profile artifact fails closed", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact(),
      runtimeProfilesArtifact: null,
    });

    expect(deps.attackDefenseActivationDecision).toBe("production_ready");
    expect(deps.attackDefenseProfiles).toBeUndefined();
    expect(deps.attackDefenseDiagnostics.runtimeProfileArtifactReady).toBe(false);
    expect(deps.attackDefenseDiagnostics.runtimeProfileArtifactReason).toBe("artifact_unavailable");
  });

  test("malformed runtime profile artifact fails closed", () => {
    const deps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact(),
      runtimeProfilesArtifact: { schemaVersion: "1.0.0" },
    });

    expect(deps.attackDefenseActivationDecision).toBe("production_ready");
    expect(deps.attackDefenseProfiles).toBeUndefined();
    expect(deps.attackDefenseDiagnostics.runtimeProfileArtifactReady).toBe(false);
    expect(deps.attackDefenseDiagnostics.runtimeProfileArtifactReason).toBe("artifact_mismatch");
  });
});
