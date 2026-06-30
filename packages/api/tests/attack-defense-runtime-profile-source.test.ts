import { describe, test, expect, beforeEach } from "vitest";
import {
  assessAttackDefenseRuntimeEligibility,
  ATTACK_DEFENSE_WC2026_CUTOFF,
} from "../src/attack-defense-runtime-profile-source.js";
import {
  buildAttackDefenseRuntimeProfiles,
  resetAttackDefenseRuntimeProfileCache,
} from "../src/attack-defense-runtime-profile-source.server.js";
import type { TeamAttackDefenseProfile } from "../../model/src/index.js";

function makeProfile(teamId: string, coverage: TeamAttackDefenseProfile["coverage"] = "partial"): TeamAttackDefenseProfile {
  return {
    teamId,
    competitionId: "world_cup",
    attackStrength: 1.0,
    defenseStrength: 1.0,
    attackSampleSize: coverage === "fallback" ? 0 : 5,
    defenseSampleSize: coverage === "fallback" ? 0 : 5,
    goalsForPerMatch: coverage === "fallback" ? null : 1.2,
    goalsAgainstPerMatch: coverage === "fallback" ? null : 1.1,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: 0,
    recencyWeight: coverage === "fallback" ? 0 : 0.8,
    coverage,
    cutoffAt: ATTACK_DEFENSE_WC2026_CUTOFF,
  };
}

describe("assessAttackDefenseRuntimeEligibility", () => {
  test("returns eligible when both profiles exist", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil")],
      ["Argentina", makeProfile("Argentina")],
    ]);
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result.eligible).toBe(true);
  });

  test("returns not eligible when home profile is missing", () => {
    const profiles = new Map([["Argentina", makeProfile("Argentina")]]);
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reason).toContain("Brazil");
  });

  test("returns not eligible when away profile is missing", () => {
    const profiles = new Map([["Brazil", makeProfile("Brazil")]]);
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reason).toContain("Argentina");
  });

  test("returns not eligible when both profiles are missing", () => {
    const profiles = new Map<string, TeamAttackDefenseProfile>();
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result.eligible).toBe(false);
  });

  test("returns eligible for fallback coverage profiles", () => {
    const profiles = new Map([
      ["Brazil", makeProfile("Brazil", "fallback")],
      ["Argentina", makeProfile("Argentina", "fallback")],
    ]);
    const result = assessAttackDefenseRuntimeEligibility("Brazil", "Argentina", profiles);
    expect(result.eligible).toBe(true);
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
});
