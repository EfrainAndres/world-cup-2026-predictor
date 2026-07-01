import { describe, expect, test } from "vitest";
import {
  buildEligiblePairs,
  collectAttackDefenseRuntimeEligibilityDiagnostic,
  validateAttackDefenseRuntimeEligibilityDiagnostic,
} from "../src/scripts/list-attack-defense-runtime-eligibility.js";
import { assessAttackDefenseRuntimeEligibility } from "../src/attack-defense-runtime-profile-source.js";
import type { TeamAttackDefenseProfile } from "../../model/src/index.js";

describe("attack-defense runtime eligibility diagnostic script helpers", () => {
  test("deterministically sorts eligible pairs", () => {
    const pairs = buildEligiblePairs([
      { team: "Brazil", coverage: "partial", sampleSize: 5, valid: true, individuallyEligible: true, rejectionReason: null },
      { team: "Argentina", coverage: "full", sampleSize: 12, valid: true, individuallyEligible: true, rejectionReason: null },
      { team: "Japan", coverage: "sparse", sampleSize: 1, valid: true, individuallyEligible: false, rejectionReason: "away_profile_sparse" },
      { team: "Croatia", coverage: "partial", sampleSize: 4, valid: true, individuallyEligible: true, rejectionReason: null },
    ]);

    expect(pairs).toEqual([
      { homeTeam: "Argentina", awayTeam: "Brazil" },
      { homeTeam: "Argentina", awayTeam: "Croatia" },
      { homeTeam: "Brazil", awayTeam: "Croatia" },
    ]);
  });

  test("diagnostic excludes fallback and sparse teams from eligible teams", () => {
    const diagnostic = collectAttackDefenseRuntimeEligibilityDiagnostic();
    expect(diagnostic.eligibleTeams.every((team) => team.coverage === "full" || team.coverage === "partial")).toBe(true);
    expect(diagnostic.eligibleTeams.every((team) => team.sampleSize >= 4)).toBe(true);
  });

  test("diagnostic exposes the immutable production runtime artifact fingerprint", () => {
    const diagnostic = collectAttackDefenseRuntimeEligibilityDiagnostic();
    expect(diagnostic.artifact.sourceKind).toBe("embedded_production_runtime_profiles");
    expect(diagnostic.artifact.profileCount).toBe(48);
    expect(diagnostic.artifact.sourceFixtureCount).toBe(312);
    expect(diagnostic.artifact.fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("pins required Preview regression fixture profiles", () => {
    const diagnostic = collectAttackDefenseRuntimeEligibilityDiagnostic();
    const algeria = diagnostic.teams.find((team) => team.team === "Algeria");
    const argentina = diagnostic.teams.find((team) => team.team === "Argentina");

    expect(algeria?.coverage).toBe("partial");
    expect(algeria?.sampleSize).toBe(7);
    expect(argentina?.coverage).toBe("full");
    expect(argentina?.sampleSize).toBe(35);
    expect(diagnostic.eligiblePairs).toContainEqual({ homeTeam: "Algeria", awayTeam: "Argentina" });
  });

  test("every listed eligible pair returns eligible from the runtime policy", () => {
    const diagnostic = collectAttackDefenseRuntimeEligibilityDiagnostic();
    const profiles = new Map<string, TeamAttackDefenseProfile>(
      diagnostic.teams.map((team) => [
        team.team,
        {
          teamId: team.team,
          competitionId: "world_cup",
          attackStrength: 1,
          defenseStrength: 1,
          attackSampleSize: team.sampleSize,
          defenseSampleSize: team.sampleSize,
          goalsForPerMatch: team.sampleSize === 0 ? null : 1.2,
          goalsAgainstPerMatch: team.sampleSize === 0 ? null : 1.1,
          expectedGoalsForPerMatch: null,
          expectedGoalsAgainstPerMatch: null,
          strengthOfScheduleAdjustment: 0,
          recencyWeight: team.sampleSize === 0 ? 0 : 0.8,
          coverage: team.coverage as TeamAttackDefenseProfile["coverage"],
          cutoffAt: diagnostic.artifact.cutoffAt,
        },
      ])
    );

    for (const pair of diagnostic.eligiblePairs.slice(0, 20)) {
      expect(assessAttackDefenseRuntimeEligibility(pair.homeTeam, pair.awayTeam, profiles)).toEqual({ eligible: true });
    }
  });

  test("fails clearly when zero eligible pairs exist", () => {
    expect(() =>
      validateAttackDefenseRuntimeEligibilityDiagnostic({
        artifact: {
          sourceKind: "embedded_production_runtime_profiles",
          cutoffAt: "2026-06-11",
          candidateId: "candidate",
          profileCount: 2,
          schemaVersion: "1.0.0",
          sourceFixtureCount: 0,
          fingerprint: "sha256:test",
          fingerprintShort: "test",
        },
        teams: [
          { team: "Haiti", coverage: "fallback", sampleSize: 0, valid: true, individuallyEligible: false, rejectionReason: "home_profile_fallback" },
          { team: "Japan", coverage: "sparse", sampleSize: 1, valid: true, individuallyEligible: false, rejectionReason: "away_profile_sparse" },
        ],
        eligibleTeams: [],
        eligiblePairs: [],
      })
    ).toThrow("zero eligible teams");
  });

});
