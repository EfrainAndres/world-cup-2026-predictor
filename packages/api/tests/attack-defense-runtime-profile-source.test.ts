import { describe, test, expect, beforeEach } from "vitest";
import {
  assessAttackDefenseRuntimeEligibility,
  ATTACK_DEFENSE_RUNTIME_MIN_PROFILE_SAMPLE,
  ATTACK_DEFENSE_WC2026_CUTOFF,
  findFirstEligibleAttackDefenseRuntimeMatchup,
  getAttackDefenseRuntimeProfileSampleSize,
} from "../src/attack-defense-runtime-profile-source.js";
import {
  buildAttackDefenseRuntimeProfiles,
  buildAttackDefenseRuntimeProfilesFromArtifact,
  computeAttackDefenseRuntimeProfileArtifactFingerprint,
  parseAttackDefenseRuntimeProfileArtifact,
  resetAttackDefenseRuntimeProfileCache,
} from "../src/attack-defense-runtime-profile-source.server.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../src/world-cup-2026-teams.js";
import type { TeamAttackDefenseProfile } from "../../model/src/index.js";
import runtimeProfilesArtifact from "../src/data/attack-defense-runtime-profiles.json" with { type: "json" };

function makeProfile(
  teamId: string,
  coverage: TeamAttackDefenseProfile["coverage"] = "partial",
  overrides: Partial<TeamAttackDefenseProfile> = {}
): TeamAttackDefenseProfile {
  const defaultSampleSize =
    coverage === "fallback"
      ? 0
      : coverage === "sparse"
        ? 1
        : ATTACK_DEFENSE_RUNTIME_MIN_PROFILE_SAMPLE + 1;

  return {
    teamId,
    competitionId: "world_cup",
    attackStrength: 1.0,
    defenseStrength: 1.0,
    attackSampleSize: defaultSampleSize,
    defenseSampleSize: defaultSampleSize,
    goalsForPerMatch: coverage === "fallback" ? null : 1.2,
    goalsAgainstPerMatch: coverage === "fallback" ? null : 1.1,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: 0,
    recencyWeight: coverage === "fallback" ? 0 : 0.8,
    coverage,
    cutoffAt: ATTACK_DEFENSE_WC2026_CUTOFF,
    ...overrides,
  };
}

describe("assessAttackDefenseRuntimeEligibility", () => {
  test("full + full returns eligible", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "full")],
      ["Argentina", makeProfile("Argentina", "full")],
    ]);
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result.eligible).toBe(true);
  });

  test("full + partial returns eligible", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "full")],
      ["Argentina", makeProfile("Argentina", "partial")],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles)).toEqual({ eligible: true });
  });

  test("partial + partial returns eligible", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "partial")],
      ["Argentina", makeProfile("Argentina", "partial")],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles)).toEqual({ eligible: true });
  });

  test("returns home_profile_missing when home profile is missing", () => {
    const profiles = new Map([["Argentina", makeProfile("Argentina")]]);
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result).toEqual({ eligible: false, reason: "home_profile_missing" });
  });

  test("returns away_profile_missing when away profile is missing", () => {
    const profiles = new Map([["Brazil", makeProfile("Brazil")]]);
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result).toEqual({ eligible: false, reason: "away_profile_missing" });
  });

  test("missing takes precedence over every later reason", () => {
    const profiles = new Map<string, TeamAttackDefenseProfile>();
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles)).toEqual({
      eligible: false,
      reason: "home_profile_missing",
    });
  });

  test("returns invalid_home_profile before fallback or sample checks", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "partial", { attackStrength: Number.NaN })],
      ["Argentina", makeProfile("Argentina", "fallback")],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles)).toEqual({
      eligible: false,
      reason: "invalid_home_profile",
    });
  });

  test("partial + sparse rejects away_profile_sparse", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "partial")],
      ["Japan", makeProfile("Japan", "sparse")],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Japan", profiles)).toEqual({
      eligible: false,
      reason: "away_profile_sparse",
    });
  });

  test("sparse + partial rejects home_profile_sparse", () => {
    const profiles = new Map([
      ["Japan", makeProfile("Japan", "sparse")],
      ["Brazil", makeProfile("Brazil", "partial")],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Japan", "Brazil", profiles)).toEqual({
      eligible: false,
      reason: "home_profile_sparse",
    });
  });

  test("partial + fallback rejects away_profile_fallback", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "partial")],
      ["Haiti", makeProfile("Haiti", "fallback")],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Haiti", profiles)).toEqual({
      eligible: false,
      reason: "away_profile_fallback",
    });
  });

  test("fallback + partial rejects home_profile_fallback", () => {
    const profiles = new Map([
      ["Haiti", makeProfile("Haiti", "fallback")],
      ["Brazil", makeProfile("Brazil", "partial")],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Haiti", "Brazil", profiles)).toEqual({
      eligible: false,
      reason: "home_profile_fallback",
    });
  });

  test("below minimum sample rejects insufficient_home_sample", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "partial", { attackSampleSize: 3, defenseSampleSize: 3 })],
      ["Argentina", makeProfile("Argentina", "partial")],
    ]);
    expect(getAttackDefenseRuntimeProfileSampleSize(profiles.get("Brazil")!)).toBeLessThan(ATTACK_DEFENSE_RUNTIME_MIN_PROFILE_SAMPLE);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles)).toEqual({
      eligible: false,
      reason: "insufficient_home_sample",
    });
  });

  test("deterministic precedence is missing, invalid, fallback, sparse, sample", () => {
    const profiles = new Map([
      ["Argentina", makeProfile("Argentina", "sparse", { attackStrength: Number.NaN })],
    ]);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles)).toEqual({
      eligible: false,
      reason: "home_profile_missing",
    });
  });
});

describe("buildAttackDefenseRuntimeProfiles", () => {
  beforeEach(() => {
    resetAttackDefenseRuntimeProfileCache();
  });

  test("builds profiles for WC2026 teams", () => {
    const result = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    expect(result.profiles.size).toBeGreaterThan(0);
    expect(result.cutoffAt).toBe(ATTACK_DEFENSE_WC2026_CUTOFF);
    expect(result.competitionEnv.competitionId).toBe("world_cup");
    expect(result.coverageStats.total).toBeGreaterThan(0);
    expect(result.coverageStats.fallbackRate).toBeGreaterThanOrEqual(0);
    expect(result.coverageStats.fallbackRate).toBeLessThanOrEqual(1);
    expect(result.artifact.sourceKind).toBe("embedded_production_runtime_profiles");
    expect(result.artifact.profileCount).toBe(result.profiles.size);
    expect(result.artifact.sourceFixtureCount).toBe(312);
    expect(result.artifact.fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("returns cached result on second call", () => {
    const first = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    const second = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-12T00:00:00.000Z" });
    expect(first).toBe(second);
  });

  test("cache resets after resetAttackDefenseRuntimeProfileCache", () => {
    const first = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    resetAttackDefenseRuntimeProfileCache();
    const second = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-12T00:00:00.000Z" });
    expect(first).not.toBe(second);
    expect(second.builtAt).toBe("2026-06-12T00:00:00.000Z");
  });

  test("coverage stats are internally consistent", () => {
    const result = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    const { full, partial, sparse, fallback, total } = result.coverageStats;
    expect(full + partial + sparse + fallback).toBe(total);
  });

  test("no profile has a cutoff after WC2026_CUTOFF", () => {
    const result = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    for (const profile of result.profiles.values()) {
      expect(profile.cutoffAt <= ATTACK_DEFENSE_WC2026_CUTOFF + "T23:59:59Z").toBe(true);
    }
  });

  test("finds a deterministic eligible runtime matchup", () => {
    const result = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    const fixture = findFirstEligibleAttackDefenseRuntimeMatchup(result.profiles, WORLD_CUP_2026_TEAM_NAMES);
    expect(fixture).not.toBeNull();
    if (fixture === null) return;

    expect(assessAttackDefenseRuntimeEligibility(fixture.homeTeam, fixture.awayTeam, result.profiles)).toEqual({ eligible: true });
  });

  test("pins Algeria and Argentina production artifact profile values", () => {
    const result = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    const algeria = result.profiles.get("Algeria");
    const argentina = result.profiles.get("Argentina");

    expect(algeria?.coverage).toBe("partial");
    expect(algeria === undefined ? null : getAttackDefenseRuntimeProfileSampleSize(algeria)).toBe(7);
    expect(argentina?.coverage).toBe("full");
    expect(argentina === undefined ? null : getAttackDefenseRuntimeProfileSampleSize(argentina)).toBe(35);
    expect(assessAttackDefenseRuntimeEligibility("Algeria", "Argentina", result.profiles)).toEqual({ eligible: true });
  });

  test("pins Brazil fallback and final artifact classifications", () => {
    const result = buildAttackDefenseRuntimeProfiles({ builtAt: "2026-06-11T00:00:00.000Z" });
    const haiti = result.profiles.get("Haiti");
    const japan = result.profiles.get("Japan");

    expect(haiti?.coverage).toBe("fallback");
    expect(haiti === undefined ? null : getAttackDefenseRuntimeProfileSampleSize(haiti)).toBe(0);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Haiti", result.profiles)).toEqual({
      eligible: false,
      reason: "away_profile_fallback",
    });

    expect(japan?.coverage).toBe("full");
    expect(japan === undefined ? null : getAttackDefenseRuntimeProfileSampleSize(japan)).toBe(16);
    expect(assessAttackDefenseRuntimeEligibility("Brazil", "Japan", result.profiles)).toEqual({ eligible: true });
  });

  test("fingerprint is deterministic", () => {
    const parsed = parseAttackDefenseRuntimeProfileArtifact(runtimeProfilesArtifact);
    expect(computeAttackDefenseRuntimeProfileArtifactFingerprint(parsed)).toBe(parsed.fingerprint);
    expect(computeAttackDefenseRuntimeProfileArtifactFingerprint(parsed)).toBe(parsed.fingerprint);
  });

  test("missing artifact does not rebuild from historical data", () => {
    expect(() => buildAttackDefenseRuntimeProfilesFromArtifact({ artifact: null })).toThrow(/unavailable/i);
  });

  test("malformed artifact fails closed instead of producing fallback profiles", () => {
    expect(() => buildAttackDefenseRuntimeProfilesFromArtifact({ artifact: { schemaVersion: "1.0.0" } })).toThrow(/mismatch|unsupported|missing|invalid/i);
  });
});
