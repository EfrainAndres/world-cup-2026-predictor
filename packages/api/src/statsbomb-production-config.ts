import type { TeamPerformanceProfile } from "./providers/statsbomb/index.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "./world-cup-2026-teams.js";

export type StatsBombRolloutMode = "off" | "shadow" | "on";

export type StatsBombActivationDecision =
  | "disabled"
  | "shadow_ready"
  | "production_ready"
  | "blocked_artifact"
  | "blocked_validation"
  | "blocked_configuration";

export type StatsBombReadinessFailureReason =
  | "feature_disabled"
  | "artifact_missing"
  | "artifact_placeholder"
  | "schema_unsupported"
  | "profile_count_invalid"
  | "duplicate_team_id"
  | "invalid_metric"
  | "artifact_stale"
  | "artifact_unreadable";

export type StatsBombProductionReadiness =
  | { ready: true; profileCount: 48; cutoffAt: string; generatedAt: string }
  | { ready: false; reason: StatsBombReadinessFailureReason };

export interface StatsBombRuntimeDiagnostics {
  featureEnabled: boolean;
  rolloutMode: StatsBombRolloutMode;
  activationDecision: StatsBombActivationDecision;
  artifactReady: boolean;
  readinessReason: string;
  profileCount: number | null;
  artifactCutoffAt: string | null;
  artifactGeneratedAt: string | null;
  lastLoadStatus: "not_attempted" | "loaded" | "failed";
}

export interface StatsBombProductionActivationGateInput {
  mode: StatsBombRolloutMode;
  readiness: StatsBombProductionReadiness;
  backtestDecision?: string | null;
  dataQualityDecision?: string | null;
}

export const STATSBOMB_SUPPORTED_PROFILE_ARTIFACT_SCHEMA_VERSION = "1.0.0";
export const STATSBOMB_PRODUCTION_MAX_ARTIFACT_AGE_DAYS = 90;

const VALID_COVERAGE = new Set(["full", "partial", "sparse", "fallback"]);
const VALID_FRESHNESS = new Set(["fresh", "aging", "stale", "unknown"]);
const CANONICAL_TEAM_COUNT = 48;

export function parseStatsBombPredictionSignalEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

export function parseStatsBombRolloutMode(
  modeValue: string | undefined,
  enabledValue?: string | undefined
): StatsBombRolloutMode {
  if (modeValue !== undefined) {
    const normalized = modeValue.trim().toLowerCase();
    if (normalized === "off" || normalized === "shadow" || normalized === "on") return normalized;
    return "off";
  }

  return parseStatsBombPredictionSignalEnabled(enabledValue) ? "on" : "off";
}

function isValidIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isFiniteNullableNonNegative(value: unknown): boolean {
  return value === null || isFiniteNonNegative(value);
}

function isValidProfile(profile: unknown): profile is TeamPerformanceProfile {
  if (typeof profile !== "object" || profile === null) return false;
  const p = profile as Record<string, unknown>;

  if (p["provider"] !== "statsbomb_open_data") return false;
  if (typeof p["teamId"] !== "string" || p["teamId"].trim().length === 0) return false;
  if (typeof p["canonicalName"] !== "string" || p["canonicalName"].trim().length === 0) return false;
  if (!isValidIsoTimestamp(p["cutoffAt"])) return false;
  if (!VALID_COVERAGE.has(String(p["coverage"]))) return false;
  if (!VALID_FRESHNESS.has(String(p["freshness"]))) return false;

  for (const field of [
    "matchCount",
    "minutesPlayed",
    "shotCountFor",
    "shotCountAgainst",
    "xgSampleCountFor",
    "xgSampleCountAgainst",
    "uniqueOpponentCount"
  ]) {
    if (!isFiniteNonNegative(p[field])) return false;
  }

  for (const field of [
    "totalXgFor",
    "totalXgAgainst",
    "xgForPer90",
    "xgAgainstPer90",
    "goalsFor",
    "goalsAgainst",
    "goalsForPer90",
    "goalsAgainstPer90",
    "shotQualityFor",
    "shotQualityAgainst"
  ]) {
    if (!isFiniteNullableNonNegative(p[field])) return false;
  }

  return true;
}

function isArtifactStale(generatedAt: string, now: string): boolean {
  const generatedMs = Date.parse(generatedAt);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(generatedMs) || !Number.isFinite(nowMs)) return true;
  const maxAgeMs = STATSBOMB_PRODUCTION_MAX_ARTIFACT_AGE_DAYS * 24 * 60 * 60 * 1000;
  return nowMs - generatedMs > maxAgeMs;
}

export function validateStatsBombProductionArtifact(
  artifact: unknown,
  now: string = new Date().toISOString()
): {
  readiness: StatsBombProductionReadiness;
  profiles: TeamPerformanceProfile[];
} {
  if (typeof artifact !== "object" || artifact === null) {
    return { readiness: { ready: false, reason: "artifact_unreadable" }, profiles: [] };
  }

  const value = artifact as Record<string, unknown>;
  if (value["status"] === "placeholder" || value["status"] === "real_data_evaluation_blocked") {
    return { readiness: { ready: false, reason: "artifact_placeholder" }, profiles: [] };
  }

  if (value["schemaVersion"] !== STATSBOMB_SUPPORTED_PROFILE_ARTIFACT_SCHEMA_VERSION) {
    return { readiness: { ready: false, reason: "schema_unsupported" }, profiles: [] };
  }

  if (!isValidIsoTimestamp(value["generatedAt"]) || !isValidIsoTimestamp(value["cutoffAt"])) {
    return { readiness: { ready: false, reason: "artifact_unreadable" }, profiles: [] };
  }

  const generatedAt = value["generatedAt"];
  const cutoffAt = value["cutoffAt"];

  if (isArtifactStale(generatedAt, now)) {
    return { readiness: { ready: false, reason: "artifact_stale" }, profiles: [] };
  }

  if (!Array.isArray(value["profiles"])) {
    return { readiness: { ready: false, reason: "profile_count_invalid" }, profiles: [] };
  }

  const profiles = value["profiles"];
  if (profiles.length !== CANONICAL_TEAM_COUNT) {
    return { readiness: { ready: false, reason: "profile_count_invalid" }, profiles: [] };
  }

  const canonicalNames = new Set(WORLD_CUP_2026_TEAM_NAMES);
  const teamIds = new Set<string>();
  const validProfiles: TeamPerformanceProfile[] = [];

  for (const profile of profiles) {
    if (!isValidProfile(profile)) {
      return { readiness: { ready: false, reason: "invalid_metric" }, profiles: [] };
    }

    if (!canonicalNames.has(profile.canonicalName)) {
      return { readiness: { ready: false, reason: "invalid_metric" }, profiles: [] };
    }

    if (teamIds.has(profile.teamId)) {
      return { readiness: { ready: false, reason: "duplicate_team_id" }, profiles: [] };
    }
    teamIds.add(profile.teamId);
    validProfiles.push(profile);
  }

  return {
    readiness: {
      ready: true,
      profileCount: CANONICAL_TEAM_COUNT,
      cutoffAt,
      generatedAt
    },
    profiles: validProfiles
  };
}

export function evaluateStatsBombProductionActivationGate(
  input: StatsBombProductionActivationGateInput
): StatsBombActivationDecision {
  if (input.mode === "off") return "disabled";
  if (!input.readiness.ready) return "blocked_artifact";
  if (input.mode === "shadow") return "shadow_ready";

  if (input.mode !== "on") return "blocked_configuration";
  if (input.backtestDecision !== "promote_signal_candidate") return "blocked_validation";
  if (
    input.dataQualityDecision !== undefined &&
    input.dataQualityDecision !== null &&
    input.dataQualityDecision !== "weighted_replay_ready" &&
    input.dataQualityDecision !== "expanded_basic_ready"
  ) {
    return "blocked_validation";
  }

  return "production_ready";
}
