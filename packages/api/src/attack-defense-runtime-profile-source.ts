import {
  ATTACK_DEFENSE_PARTIAL_COVERAGE_MIN_MATCHES,
  type CompetitionGoalEnvironment,
  type TeamAttackDefenseProfile,
} from "../../model/src/index.js";

export const ATTACK_DEFENSE_WC2026_CUTOFF = "2026-06-11";
export const ATTACK_DEFENSE_RUNTIME_ALLOW_FULL = true;
export const ATTACK_DEFENSE_RUNTIME_ALLOW_PARTIAL = true;
export const ATTACK_DEFENSE_RUNTIME_ALLOW_SPARSE = false;
export const ATTACK_DEFENSE_RUNTIME_ALLOW_FALLBACK = false;
export const ATTACK_DEFENSE_RUNTIME_MIN_PROFILE_SAMPLE = ATTACK_DEFENSE_PARTIAL_COVERAGE_MIN_MATCHES;

export interface AttackDefenseRuntimeCoverageStats {
  full: number;
  partial: number;
  sparse: number;
  fallback: number;
  total: number;
  fallbackRate: number;
}

export interface AttackDefenseRuntimeProfileArtifactMetadata {
  sourceKind: "embedded_production_runtime_profiles";
  schemaVersion: string;
  candidateId: string;
  fingerprint: string;
  fingerprintShort: string;
  profileCount: number;
  sourceFixtureCount: number;
}

export interface AttackDefenseRuntimeProfilesResult {
  profiles: Map<string, TeamAttackDefenseProfile>;
  competitionEnv: CompetitionGoalEnvironment;
  coverageStats: AttackDefenseRuntimeCoverageStats;
  cutoffAt: string;
  builtAt: string;
  artifact: AttackDefenseRuntimeProfileArtifactMetadata;
}

export type AttackDefenseRuntimeEligibilityReason =
  | "home_profile_missing"
  | "away_profile_missing"
  | "invalid_home_profile"
  | "invalid_away_profile"
  | "home_profile_fallback"
  | "away_profile_fallback"
  | "home_profile_sparse"
  | "away_profile_sparse"
  | "insufficient_home_sample"
  | "insufficient_away_sample";

export type AttackDefenseRuntimeEligibility =
  | { eligible: true }
  | { eligible: false; reason: AttackDefenseRuntimeEligibilityReason };

function isFiniteNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function getAttackDefenseRuntimeProfileSampleSize(profile: TeamAttackDefenseProfile): number {
  return Math.min(profile.attackSampleSize, profile.defenseSampleSize);
}

export function isValidAttackDefenseRuntimeProfile(profile: TeamAttackDefenseProfile): boolean {
  return (
    Number.isFinite(profile.attackStrength) &&
    profile.attackStrength > 0 &&
    Number.isFinite(profile.defenseStrength) &&
    profile.defenseStrength > 0 &&
    isFiniteNonNegativeNumber(profile.attackSampleSize) &&
    isFiniteNonNegativeNumber(profile.defenseSampleSize) &&
    Number.isFinite(profile.strengthOfScheduleAdjustment) &&
    Number.isFinite(profile.recencyWeight) &&
    profile.recencyWeight >= 0 &&
    profile.recencyWeight <= 1 &&
    Number.isFinite(Date.parse(profile.cutoffAt))
  );
}

export function assessAttackDefenseRuntimeEligibility(
  homeTeam: string,
  awayTeam: string,
  profiles: Map<string, TeamAttackDefenseProfile>
): AttackDefenseRuntimeEligibility {
  const homeProfile = profiles.get(homeTeam);
  const awayProfile = profiles.get(awayTeam);

  if (homeProfile === undefined) return { eligible: false, reason: "home_profile_missing" };
  if (awayProfile === undefined) return { eligible: false, reason: "away_profile_missing" };

  if (!isValidAttackDefenseRuntimeProfile(homeProfile)) {
    return { eligible: false, reason: "invalid_home_profile" };
  }

  if (!isValidAttackDefenseRuntimeProfile(awayProfile)) {
    return { eligible: false, reason: "invalid_away_profile" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_FALLBACK && homeProfile.coverage === "fallback") {
    return { eligible: false, reason: "home_profile_fallback" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_FALLBACK && awayProfile.coverage === "fallback") {
    return { eligible: false, reason: "away_profile_fallback" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_SPARSE && homeProfile.coverage === "sparse") {
    return { eligible: false, reason: "home_profile_sparse" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_SPARSE && awayProfile.coverage === "sparse") {
    return { eligible: false, reason: "away_profile_sparse" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_PARTIAL && homeProfile.coverage === "partial") {
    return { eligible: false, reason: "insufficient_home_sample" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_PARTIAL && awayProfile.coverage === "partial") {
    return { eligible: false, reason: "insufficient_away_sample" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_FULL && homeProfile.coverage === "full") {
    return { eligible: false, reason: "insufficient_home_sample" };
  }

  if (!ATTACK_DEFENSE_RUNTIME_ALLOW_FULL && awayProfile.coverage === "full") {
    return { eligible: false, reason: "insufficient_away_sample" };
  }

  if (getAttackDefenseRuntimeProfileSampleSize(homeProfile) < ATTACK_DEFENSE_RUNTIME_MIN_PROFILE_SAMPLE) {
    return { eligible: false, reason: "insufficient_home_sample" };
  }

  if (getAttackDefenseRuntimeProfileSampleSize(awayProfile) < ATTACK_DEFENSE_RUNTIME_MIN_PROFILE_SAMPLE) {
    return { eligible: false, reason: "insufficient_away_sample" };
  }

  return { eligible: true };
}

export function findFirstEligibleAttackDefenseRuntimeMatchup(
  profiles: Map<string, TeamAttackDefenseProfile>,
  teamNames?: readonly string[]
): { homeTeam: string; awayTeam: string } | null {
  const teams = [...(teamNames ?? profiles.keys())].sort((a, b) => a.localeCompare(b));

  for (let i = 0; i < teams.length; i += 1) {
    const homeTeam = teams[i];
    if (homeTeam === undefined) continue;

    for (let j = i + 1; j < teams.length; j += 1) {
      const awayTeam = teams[j];
      if (awayTeam === undefined) continue;

      if (assessAttackDefenseRuntimeEligibility(homeTeam, awayTeam, profiles).eligible) {
        return { homeTeam, awayTeam };
      }
    }
  }

  return null;
}
