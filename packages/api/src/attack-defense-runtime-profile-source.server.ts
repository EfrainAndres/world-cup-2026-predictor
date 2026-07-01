import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import type {
  AttackDefenseProfileCoverage,
  CompetitionGoalEnvironment,
  TeamAttackDefenseProfile,
} from "../../model/src/index.js";
import { ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID } from "./attack-defense-production-config.js";
import {
  ATTACK_DEFENSE_WC2026_CUTOFF,
  isValidAttackDefenseRuntimeProfile,
} from "./attack-defense-runtime-profile-source.js";
import type {
  AttackDefenseRuntimeCoverageStats,
  AttackDefenseRuntimeProfilesResult,
} from "./attack-defense-runtime-profile-source.js";

const require = createRequire(import.meta.url);
const embeddedRuntimeProfilesArtifact = require("./data/attack-defense-runtime-profiles.json") as unknown;

export type AttackDefenseRuntimeProfileArtifactFailureReason =
  | "artifact_unavailable"
  | "artifact_mismatch";

export class AttackDefenseRuntimeProfileArtifactError extends Error {
  constructor(
    public readonly reason: AttackDefenseRuntimeProfileArtifactFailureReason,
    message: string
  ) {
    super(message);
    this.name = "AttackDefenseRuntimeProfileArtifactError";
  }
}

type RuntimeProfileArtifactProfile = TeamAttackDefenseProfile & {
  competitionId: string;
};

type RuntimeProfileArtifact = {
  schemaVersion: "1.0.0";
  sourceKind: "embedded_production_runtime_profiles";
  candidateId: string;
  cutoffAt: string;
  generatedAt: string;
  teamCount: number;
  sourceFixtureCount: number;
  competitionEnv: CompetitionGoalEnvironment;
  profiles: RuntimeProfileArtifactProfile[];
  fingerprint: string;
};

let cachedRuntimeProfiles: AttackDefenseRuntimeProfilesResult | null = null;

export function resetAttackDefenseRuntimeProfileCache(): void {
  cachedRuntimeProfiles = null;
}

function artifactMismatch(message: string): never {
  throw new AttackDefenseRuntimeProfileArtifactError("artifact_mismatch", message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCoverage(value: unknown): value is AttackDefenseProfileCoverage {
  return value === "full" || value === "partial" || value === "sparse" || value === "fallback";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function assertCompetitionEnv(value: unknown): asserts value is CompetitionGoalEnvironment {
  if (!isObject(value)) artifactMismatch("Runtime profile artifact competition environment is missing.");

  if (typeof value["competitionId"] !== "string") artifactMismatch("Runtime profile artifact competitionId is invalid.");
  if (!isFiniteNumber(value["averageHomeGoals"])) artifactMismatch("Runtime profile artifact averageHomeGoals is invalid.");
  if (!isFiniteNumber(value["averageAwayGoals"])) artifactMismatch("Runtime profile artifact averageAwayGoals is invalid.");
  if (!isFiniteNumber(value["averageTotalGoals"])) artifactMismatch("Runtime profile artifact averageTotalGoals is invalid.");
  if (!isFiniteNumber(value["sampleSize"]) || value["sampleSize"] < 0) {
    artifactMismatch("Runtime profile artifact sampleSize is invalid.");
  }
  if (typeof value["cutoffAt"] !== "string") artifactMismatch("Runtime profile artifact cutoffAt is invalid.");
}

function parseProfile(value: unknown): RuntimeProfileArtifactProfile {
  if (!isObject(value)) artifactMismatch("Runtime profile artifact contains an invalid profile.");

  const profile = {
    teamId: value["teamId"],
    competitionId: value["competitionId"],
    attackStrength: value["attackStrength"],
    defenseStrength: value["defenseStrength"],
    attackSampleSize: value["attackSampleSize"],
    defenseSampleSize: value["defenseSampleSize"],
    goalsForPerMatch: value["goalsForPerMatch"],
    goalsAgainstPerMatch: value["goalsAgainstPerMatch"],
    expectedGoalsForPerMatch: value["expectedGoalsForPerMatch"],
    expectedGoalsAgainstPerMatch: value["expectedGoalsAgainstPerMatch"],
    strengthOfScheduleAdjustment: value["strengthOfScheduleAdjustment"],
    recencyWeight: value["recencyWeight"],
    coverage: value["coverage"],
    cutoffAt: value["cutoffAt"],
  };

  if (typeof profile.teamId !== "string" || profile.teamId.trim().length === 0) {
    artifactMismatch("Runtime profile artifact contains a profile with invalid teamId.");
  }
  if (typeof profile.competitionId !== "string") artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid competitionId.`);
  if (!isFiniteNumber(profile.attackStrength)) artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid attackStrength.`);
  if (!isFiniteNumber(profile.defenseStrength)) artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid defenseStrength.`);
  if (!isFiniteNumber(profile.attackSampleSize) || profile.attackSampleSize < 0) {
    artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid attackSampleSize.`);
  }
  if (!isFiniteNumber(profile.defenseSampleSize) || profile.defenseSampleSize < 0) {
    artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid defenseSampleSize.`);
  }
  if (profile.goalsForPerMatch !== null && !isFiniteNumber(profile.goalsForPerMatch)) {
    artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid goalsForPerMatch.`);
  }
  if (profile.goalsAgainstPerMatch !== null && !isFiniteNumber(profile.goalsAgainstPerMatch)) {
    artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid goalsAgainstPerMatch.`);
  }
  if (profile.expectedGoalsForPerMatch !== null && !isFiniteNumber(profile.expectedGoalsForPerMatch)) {
    artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid expectedGoalsForPerMatch.`);
  }
  if (profile.expectedGoalsAgainstPerMatch !== null && !isFiniteNumber(profile.expectedGoalsAgainstPerMatch)) {
    artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid expectedGoalsAgainstPerMatch.`);
  }
  if (!isFiniteNumber(profile.strengthOfScheduleAdjustment)) {
    artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid strengthOfScheduleAdjustment.`);
  }
  if (!isFiniteNumber(profile.recencyWeight)) artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid recencyWeight.`);
  if (!isCoverage(profile.coverage)) artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid coverage.`);
  if (typeof profile.cutoffAt !== "string") artifactMismatch(`Runtime profile artifact ${profile.teamId} has invalid cutoffAt.`);

  const parsed: RuntimeProfileArtifactProfile = {
    teamId: profile.teamId,
    competitionId: profile.competitionId,
    attackStrength: profile.attackStrength,
    defenseStrength: profile.defenseStrength,
    attackSampleSize: profile.attackSampleSize,
    defenseSampleSize: profile.defenseSampleSize,
    goalsForPerMatch: profile.goalsForPerMatch,
    goalsAgainstPerMatch: profile.goalsAgainstPerMatch,
    expectedGoalsForPerMatch: profile.expectedGoalsForPerMatch,
    expectedGoalsAgainstPerMatch: profile.expectedGoalsAgainstPerMatch,
    strengthOfScheduleAdjustment: profile.strengthOfScheduleAdjustment,
    recencyWeight: profile.recencyWeight,
    coverage: profile.coverage,
    cutoffAt: profile.cutoffAt,
  };

  if (!isValidAttackDefenseRuntimeProfile(parsed)) {
    artifactMismatch(`Runtime profile artifact ${parsed.teamId} fails runtime profile validation.`);
  }

  return parsed;
}

export function computeAttackDefenseRuntimeProfileArtifactFingerprint(artifact: RuntimeProfileArtifact): string {
  const { fingerprint: _fingerprint, ...payload } = artifact;
  return "sha256:" + createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function parseAttackDefenseRuntimeProfileArtifact(artifact: unknown): RuntimeProfileArtifact {
  if (!isObject(artifact)) {
    throw new AttackDefenseRuntimeProfileArtifactError("artifact_unavailable", "Runtime profile artifact is unavailable.");
  }

  if (artifact["schemaVersion"] !== "1.0.0") artifactMismatch("Runtime profile artifact schema is unsupported.");
  if (artifact["sourceKind"] !== "embedded_production_runtime_profiles") {
    artifactMismatch("Runtime profile artifact source kind is unsupported.");
  }
  if (artifact["candidateId"] !== ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID) {
    artifactMismatch("Runtime profile artifact candidate ID does not match selected candidate.");
  }
  if (artifact["cutoffAt"] !== ATTACK_DEFENSE_WC2026_CUTOFF) artifactMismatch("Runtime profile artifact cutoff does not match runtime policy.");
  if (typeof artifact["generatedAt"] !== "string") artifactMismatch("Runtime profile artifact generatedAt is invalid.");
  if (!isFiniteNumber(artifact["teamCount"]) || artifact["teamCount"] <= 0) artifactMismatch("Runtime profile artifact teamCount is invalid.");
  if (!isFiniteNumber(artifact["sourceFixtureCount"]) || artifact["sourceFixtureCount"] < 0) {
    artifactMismatch("Runtime profile artifact sourceFixtureCount is invalid.");
  }
  if (typeof artifact["fingerprint"] !== "string" || !artifact["fingerprint"].startsWith("sha256:")) {
    artifactMismatch("Runtime profile artifact fingerprint is invalid.");
  }

  assertCompetitionEnv(artifact["competitionEnv"]);
  if (!Array.isArray(artifact["profiles"])) artifactMismatch("Runtime profile artifact profiles are invalid.");

  const parsed: RuntimeProfileArtifact = {
    schemaVersion: "1.0.0",
    sourceKind: "embedded_production_runtime_profiles",
    candidateId: artifact["candidateId"],
    cutoffAt: artifact["cutoffAt"],
    generatedAt: artifact["generatedAt"],
    teamCount: artifact["teamCount"],
    sourceFixtureCount: artifact["sourceFixtureCount"],
    competitionEnv: artifact["competitionEnv"],
    profiles: artifact["profiles"].map(parseProfile),
    fingerprint: artifact["fingerprint"],
  };

  if (parsed.profiles.length !== parsed.teamCount) artifactMismatch("Runtime profile artifact teamCount does not match profiles.");

  const seen = new Set<string>();
  for (const profile of parsed.profiles) {
    if (seen.has(profile.teamId)) artifactMismatch(`Runtime profile artifact duplicate team: ${profile.teamId}.`);
    seen.add(profile.teamId);
  }

  if (parsed.fingerprint !== computeAttackDefenseRuntimeProfileArtifactFingerprint(parsed)) {
    artifactMismatch("Runtime profile artifact fingerprint mismatch.");
  }

  return parsed;
}

function buildCoverageStats(profiles: readonly RuntimeProfileArtifactProfile[]): AttackDefenseRuntimeCoverageStats {
  const coverageStats: AttackDefenseRuntimeCoverageStats = {
    full: 0,
    partial: 0,
    sparse: 0,
    fallback: 0,
    total: profiles.length,
    fallbackRate: 0,
  };

  for (const profile of profiles) {
    coverageStats[profile.coverage] += 1;
  }

  coverageStats.fallbackRate = profiles.length > 0 ? coverageStats.fallback / profiles.length : 1;
  return coverageStats;
}

export function buildAttackDefenseRuntimeProfilesFromArtifact(input: {
  artifact: unknown;
  builtAt?: string;
}): AttackDefenseRuntimeProfilesResult {
  const artifact = parseAttackDefenseRuntimeProfileArtifact(input.artifact);
  const profiles = new Map<string, TeamAttackDefenseProfile>(
    artifact.profiles.map((profile) => [profile.teamId, profile])
  );

  return {
    profiles,
    competitionEnv: artifact.competitionEnv,
    coverageStats: buildCoverageStats(artifact.profiles),
    cutoffAt: artifact.cutoffAt,
    builtAt: input.builtAt ?? artifact.generatedAt,
    artifact: {
      sourceKind: artifact.sourceKind,
      schemaVersion: artifact.schemaVersion,
      candidateId: artifact.candidateId,
      fingerprint: artifact.fingerprint,
      fingerprintShort: artifact.fingerprint.replace(/^sha256:/, "").slice(0, 12),
      profileCount: artifact.teamCount,
      sourceFixtureCount: artifact.sourceFixtureCount,
    },
  };
}

export function buildAttackDefenseRuntimeProfiles(input: {
  builtAt?: string;
} = {}): AttackDefenseRuntimeProfilesResult {
  if (cachedRuntimeProfiles !== null) return cachedRuntimeProfiles;

  const result = buildAttackDefenseRuntimeProfilesFromArtifact({
    artifact: embeddedRuntimeProfilesArtifact,
    ...(input.builtAt === undefined ? {} : { builtAt: input.builtAt }),
  });

  cachedRuntimeProfiles = result;
  return result;
}
