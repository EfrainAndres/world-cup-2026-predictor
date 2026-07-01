import {
  evaluateAttackDefenseProductionActivationGate,
  parseAttackDefenseGoalModelMode,
  validateAttackDefenseRuntimeArtifact,
} from "./attack-defense-production-config.js";
import type {
  AttackDefenseActivationDecision,
  AttackDefenseGoalModelMode,
  AttackDefenseRuntimeDiagnostics,
  AttackDefenseRuntimeReadiness,
} from "./attack-defense-production-config.js";
import {
  AttackDefenseRuntimeProfileArtifactError,
  buildAttackDefenseRuntimeProfiles,
  buildAttackDefenseRuntimeProfilesFromArtifact,
} from "./attack-defense-runtime-profile-source.server.js";
import type { AttackDefenseRuntimeProfilesResult } from "./attack-defense-runtime-profile-source.js";

export interface AttackDefenseProductionDependencies {
  attackDefenseMode: AttackDefenseGoalModelMode;
  attackDefenseReadiness: AttackDefenseRuntimeReadiness;
  attackDefenseActivationDecision: AttackDefenseActivationDecision;
  attackDefenseProfiles?: AttackDefenseRuntimeProfilesResult;
  attackDefenseDiagnostics: AttackDefenseRuntimeDiagnostics;
}

export function createAttackDefenseProductionDependencies(input: {
  env?: Record<string, string | undefined>;
  selectedCandidateArtifact?: unknown;
  runtimeProfilesArtifact?: unknown;
  builtAt?: string;
} = {}): AttackDefenseProductionDependencies {
  const env = input.env ?? process.env;
  const mode = parseAttackDefenseGoalModelMode(env["ATTACK_DEFENSE_GOAL_MODEL_MODE"]);

  if (mode === "off") {
    const readiness: AttackDefenseRuntimeReadiness = { ready: false, reason: "feature_disabled" };
    return {
      attackDefenseMode: "off",
      attackDefenseReadiness: readiness,
      attackDefenseActivationDecision: "disabled",
      attackDefenseDiagnostics: {
        featureEnabled: false,
        rolloutMode: "off",
        activationDecision: "disabled",
        artifactReady: false,
        readinessReason: "feature_disabled",
        candidateId: null,
        lastLoadStatus: "not_attempted",
        runtimeProfileArtifactReady: false,
        runtimeProfileArtifactReason: "not_attempted",
        runtimeProfileArtifactFingerprint: null,
        runtimeProfileArtifactFingerprintShort: null,
        runtimeProfileArtifactSchemaVersion: null,
        runtimeProfileCount: null,
        runtimeProfileSourceFixtureCount: null,
      },
    };
  }

  const readiness = validateAttackDefenseRuntimeArtifact(input.selectedCandidateArtifact);
  const activationDecision = evaluateAttackDefenseProductionActivationGate({ mode, readiness });

  const diagnostics: AttackDefenseRuntimeDiagnostics = {
    featureEnabled: true,
    rolloutMode: mode,
    activationDecision,
    artifactReady: readiness.ready,
    readinessReason: readiness.ready ? "ready" : readiness.reason,
    candidateId: readiness.ready ? readiness.candidateId : null,
    lastLoadStatus: readiness.ready ? "loaded" : "failed",
    runtimeProfileArtifactReady: false,
    runtimeProfileArtifactReason: "not_attempted",
    runtimeProfileArtifactFingerprint: null,
    runtimeProfileArtifactFingerprintShort: null,
    runtimeProfileArtifactSchemaVersion: null,
    runtimeProfileCount: null,
    runtimeProfileSourceFixtureCount: null,
  };

  if (!readiness.ready) {
    return {
      attackDefenseMode: mode,
      attackDefenseReadiness: readiness,
      attackDefenseActivationDecision: activationDecision,
      attackDefenseDiagnostics: diagnostics,
    };
  }

  let profiles: AttackDefenseRuntimeProfilesResult | undefined;
  try {
    profiles =
      input.runtimeProfilesArtifact === undefined
        ? buildAttackDefenseRuntimeProfiles(input.builtAt !== undefined ? { builtAt: input.builtAt } : {})
        : buildAttackDefenseRuntimeProfilesFromArtifact({
            artifact: input.runtimeProfilesArtifact,
            ...(input.builtAt === undefined ? {} : { builtAt: input.builtAt }),
          });
  } catch (error) {
    const reason =
      error instanceof AttackDefenseRuntimeProfileArtifactError
        ? error.reason
        : "artifact_unavailable";
    return {
      attackDefenseMode: mode,
      attackDefenseReadiness: readiness,
      attackDefenseActivationDecision: activationDecision,
      attackDefenseDiagnostics: {
        ...diagnostics,
        lastLoadStatus: "failed",
        runtimeProfileArtifactReady: false,
        runtimeProfileArtifactReason: reason,
      },
    };
  }

  return {
    attackDefenseMode: mode,
    attackDefenseReadiness: readiness,
    attackDefenseActivationDecision: activationDecision,
    attackDefenseProfiles: profiles,
    attackDefenseDiagnostics: {
      ...diagnostics,
      runtimeProfileArtifactReady: true,
      runtimeProfileArtifactReason: "ready",
      runtimeProfileArtifactFingerprint: profiles.artifact.fingerprint,
      runtimeProfileArtifactFingerprintShort: profiles.artifact.fingerprintShort,
      runtimeProfileArtifactSchemaVersion: profiles.artifact.schemaVersion,
      runtimeProfileCount: profiles.artifact.profileCount,
      runtimeProfileSourceFixtureCount: profiles.artifact.sourceFixtureCount,
    },
  };
}
