import type { AttackDefenseRecalibrationConfig, RecalibratedGoalModelCandidate } from "../../model/src/index.js";

export type AttackDefenseGoalModelMode = "off" | "shadow" | "on";

export type AttackDefenseActivationDecision =
  | "disabled"
  | "shadow_ready"
  | "production_ready"
  | "blocked_artifact";

export type AttackDefenseRuntimeReadinessFailureReason =
  | "feature_disabled"
  | "artifact_missing"
  | "artifact_unreadable"
  | "decision_not_promote"
  | "candidate_mismatch";

export type AttackDefenseRuntimeReadiness =
  | { ready: true; candidateId: string; candidateConfig: AttackDefenseRecalibrationConfig }
  | { ready: false; reason: AttackDefenseRuntimeReadinessFailureReason };

export interface AttackDefenseRuntimeDiagnostics {
  featureEnabled: boolean;
  rolloutMode: AttackDefenseGoalModelMode;
  activationDecision: AttackDefenseActivationDecision;
  artifactReady: boolean;
  readinessReason: string;
  candidateId: string | null;
  lastLoadStatus: "not_attempted" | "loaded" | "failed";
}

export const ATTACK_DEFENSE_SELECTED_CANDIDATE_SCHEMA_VERSION = "1.0.0";
export const ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID =
  "attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0";
const ATTACK_DEFENSE_EXPECTED_DECISION = "promote_recalibrated_candidate";

export function parseAttackDefenseGoalModelMode(value?: string): AttackDefenseGoalModelMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "off" || normalized === "shadow" || normalized === "on") return normalized;
  return "off";
}

export function validateAttackDefenseRuntimeArtifact(artifact: unknown): AttackDefenseRuntimeReadiness {
  if (typeof artifact !== "object" || artifact === null) {
    return { ready: false, reason: "artifact_unreadable" };
  }

  const value = artifact as Record<string, unknown>;

  if (value["schemaVersion"] !== ATTACK_DEFENSE_SELECTED_CANDIDATE_SCHEMA_VERSION) {
    return { ready: false, reason: "artifact_unreadable" };
  }

  const decision = value["decision"];
  if (typeof decision !== "object" || decision === null) {
    return { ready: false, reason: "artifact_unreadable" };
  }

  const decisionValue = decision as Record<string, unknown>;
  if (decisionValue["decision"] !== ATTACK_DEFENSE_EXPECTED_DECISION) {
    return { ready: false, reason: "decision_not_promote" };
  }

  const candidateId = decisionValue["selectedCandidateId"];
  if (candidateId !== ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID) {
    return { ready: false, reason: "candidate_mismatch" };
  }

  const selectedConfig = value["selectedConfig"];
  if (typeof selectedConfig !== "object" || selectedConfig === null) {
    return { ready: false, reason: "artifact_unreadable" };
  }

  const c = selectedConfig as Record<string, unknown>;
  if (typeof c["candidate"] !== "string") return { ready: false, reason: "artifact_unreadable" };
  if (typeof c["attackWeight"] !== "number") return { ready: false, reason: "artifact_unreadable" };
  if (typeof c["defenseWeight"] !== "number") return { ready: false, reason: "artifact_unreadable" };
  if (typeof c["eloWeight"] !== "number") return { ready: false, reason: "artifact_unreadable" };
  if (typeof c["venueWeight"] !== "number") return { ready: false, reason: "artifact_unreadable" };
  if (typeof c["attackDefenseBlendWeight"] !== "number") return { ready: false, reason: "artifact_unreadable" };
  if (typeof c["residualCap"] !== "number") return { ready: false, reason: "artifact_unreadable" };
  if (typeof c["coverageDampingEnabled"] !== "boolean") return { ready: false, reason: "artifact_unreadable" };

  return {
    ready: true,
    candidateId: candidateId as string,
    candidateConfig: {
      candidate: c["candidate"] as RecalibratedGoalModelCandidate,
      attackWeight: c["attackWeight"] as number,
      defenseWeight: c["defenseWeight"] as number,
      eloWeight: c["eloWeight"] as number,
      venueWeight: c["venueWeight"] as number,
      attackDefenseBlendWeight: c["attackDefenseBlendWeight"] as number,
      residualCap: c["residualCap"] as number,
      coverageDampingEnabled: c["coverageDampingEnabled"] as boolean,
    }
  };
}

export function evaluateAttackDefenseProductionActivationGate(input: {
  mode: AttackDefenseGoalModelMode;
  readiness: AttackDefenseRuntimeReadiness;
}): AttackDefenseActivationDecision {
  if (input.mode === "off") return "disabled";
  if (!input.readiness.ready) return "blocked_artifact";
  if (input.mode === "shadow") return "shadow_ready";
  return "production_ready";
}
