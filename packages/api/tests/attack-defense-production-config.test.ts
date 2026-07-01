import { describe, test, expect } from "vitest";
import {
  parseAttackDefenseGoalModelMode,
  validateAttackDefenseRuntimeArtifact,
  evaluateAttackDefenseProductionActivationGate,
  ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID,
} from "../src/attack-defense-production-config.js";

const VALID_ARTIFACT = {
  schemaVersion: "1.0.0",
  selectedConfig: {
    candidate: "attack_defense_log_linear_damped",
    attackWeight: 0.65,
    defenseWeight: 0.2,
    eloWeight: 0,
    venueWeight: 0.5,
    attackDefenseBlendWeight: 1,
    residualCap: 0.2,
    coverageDampingEnabled: false,
    id: ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID
  },
  decision: {
    decision: "promote_recalibrated_candidate",
    selectedCandidateId: ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID,
    reasons: ["Candidate passes validation gates."],
    blockers: []
  }
};

describe("parseAttackDefenseGoalModelMode", () => {
  test("returns off for undefined", () => {
    expect(parseAttackDefenseGoalModelMode(undefined)).toBe("off");
  });

  test("returns off for empty string", () => {
    expect(parseAttackDefenseGoalModelMode("")).toBe("off");
  });

  test("returns shadow for shadow", () => {
    expect(parseAttackDefenseGoalModelMode("shadow")).toBe("shadow");
  });

  test("returns on for on", () => {
    expect(parseAttackDefenseGoalModelMode("on")).toBe("on");
  });

  test("returns off for off", () => {
    expect(parseAttackDefenseGoalModelMode("off")).toBe("off");
  });

  test("ignores case", () => {
    expect(parseAttackDefenseGoalModelMode("SHADOW")).toBe("shadow");
    expect(parseAttackDefenseGoalModelMode("ON")).toBe("on");
  });

  test("returns off for unknown value", () => {
    expect(parseAttackDefenseGoalModelMode("invalid")).toBe("off");
  });
});

describe("validateAttackDefenseRuntimeArtifact", () => {
  test("returns ready for valid artifact", () => {
    const result = validateAttackDefenseRuntimeArtifact(VALID_ARTIFACT);
    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.candidateId).toBe(ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID);
      expect(result.candidateConfig.attackWeight).toBe(0.65);
      expect(result.candidateConfig.defenseWeight).toBe(0.2);
    }
  });

  test("returns artifact_unreadable for null", () => {
    const result = validateAttackDefenseRuntimeArtifact(null);
    expect(result.ready).toBe(false);
    if (!result.ready) expect(result.reason).toBe("artifact_unreadable");
  });

  test("returns artifact_unreadable for wrong schema version", () => {
    const artifact = { ...VALID_ARTIFACT, schemaVersion: "2.0.0" };
    const result = validateAttackDefenseRuntimeArtifact(artifact);
    expect(result.ready).toBe(false);
    if (!result.ready) expect(result.reason).toBe("artifact_unreadable");
  });

  test("returns decision_not_promote for wrong decision", () => {
    const artifact = {
      ...VALID_ARTIFACT,
      decision: { ...VALID_ARTIFACT.decision, decision: "retain_elo_v2", selectedCandidateId: ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID }
    };
    const result = validateAttackDefenseRuntimeArtifact(artifact);
    expect(result.ready).toBe(false);
    if (!result.ready) expect(result.reason).toBe("decision_not_promote");
  });

  test("returns candidate_mismatch for wrong candidate ID", () => {
    const artifact = {
      ...VALID_ARTIFACT,
      decision: { ...VALID_ARTIFACT.decision, selectedCandidateId: "wrong_candidate_id" }
    };
    const result = validateAttackDefenseRuntimeArtifact(artifact);
    expect(result.ready).toBe(false);
    if (!result.ready) expect(result.reason).toBe("candidate_mismatch");
  });

  test("returns artifact_unreadable for missing selectedConfig", () => {
    const artifact = { schemaVersion: "1.0.0", decision: VALID_ARTIFACT.decision };
    const result = validateAttackDefenseRuntimeArtifact(artifact);
    expect(result.ready).toBe(false);
  });
});

describe("evaluateAttackDefenseProductionActivationGate", () => {
  const readyReadiness = {
    ready: true as const,
    candidateId: ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID,
    candidateConfig: {
      candidate: "attack_defense_log_linear_damped" as const,
      attackWeight: 0.65,
      defenseWeight: 0.2,
      eloWeight: 0,
      venueWeight: 0.5,
      attackDefenseBlendWeight: 1,
      residualCap: 0.2,
      coverageDampingEnabled: false
    }
  };
  const notReadyReadiness = { ready: false as const, reason: "artifact_missing" as const };

  test("returns disabled for off mode", () => {
    const result = evaluateAttackDefenseProductionActivationGate({ mode: "off", readiness: readyReadiness });
    expect(result).toBe("disabled");
  });

  test("returns shadow_ready for shadow mode with ready artifact", () => {
    const result = evaluateAttackDefenseProductionActivationGate({ mode: "shadow", readiness: readyReadiness });
    expect(result).toBe("shadow_ready");
  });

  test("returns production_ready for on mode with ready artifact", () => {
    const result = evaluateAttackDefenseProductionActivationGate({ mode: "on", readiness: readyReadiness });
    expect(result).toBe("production_ready");
  });

  test("returns blocked_artifact for shadow mode with unready artifact", () => {
    const result = evaluateAttackDefenseProductionActivationGate({ mode: "shadow", readiness: notReadyReadiness });
    expect(result).toBe("blocked_artifact");
  });

  test("returns blocked_artifact for on mode with unready artifact", () => {
    const result = evaluateAttackDefenseProductionActivationGate({ mode: "on", readiness: notReadyReadiness });
    expect(result).toBe("blocked_artifact");
  });
});
