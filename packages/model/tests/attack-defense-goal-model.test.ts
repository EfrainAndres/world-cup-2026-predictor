import { describe, expect, it } from "vitest";
import {
  ATTACK_DEFENSE_NEUTRAL_STRENGTH,
  ATTACK_DEFENSE_XG_MAX,
  ATTACK_DEFENSE_XG_MIN,
  buildNeutralAttackDefenseProfile,
  computeAttackDefenseGoalModel,
} from "../src/index.js";
import type {
  AttackDefenseGoalModelCandidateId,
  AttackDefenseGoalModelInput,
  CompetitionGoalEnvironment,
  TeamAttackDefenseProfile,
} from "../src/index.js";

const baseCompetition: CompetitionGoalEnvironment = {
  competitionId: "test_wc",
  averageHomeGoals: 1.4,
  averageAwayGoals: 1.1,
  averageTotalGoals: 2.5,
  sampleSize: 60,
  cutoffAt: "2022-01-01",
};

function makeProfile(
  teamId: string,
  attackStrength: number,
  defenseStrength: number,
  coverage: TeamAttackDefenseProfile["coverage"] = "full"
): TeamAttackDefenseProfile {
  return {
    teamId,
    competitionId: "test_wc",
    attackStrength,
    defenseStrength,
    attackSampleSize: 10,
    defenseSampleSize: 10,
    goalsForPerMatch: 1.5,
    goalsAgainstPerMatch: 1.0,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: 0,
    recencyWeight: 1.0,
    coverage,
    cutoffAt: "2022-01-01",
  };
}

const neutralHome = makeProfile("home_team", ATTACK_DEFENSE_NEUTRAL_STRENGTH, ATTACK_DEFENSE_NEUTRAL_STRENGTH);
const neutralAway = makeProfile("away_team", ATTACK_DEFENSE_NEUTRAL_STRENGTH, ATTACK_DEFENSE_NEUTRAL_STRENGTH);

const strongAttackHome = makeProfile("strong_attack", 1.5, ATTACK_DEFENSE_NEUTRAL_STRENGTH);
const weakAttackHome = makeProfile("weak_attack", 0.6, ATTACK_DEFENSE_NEUTRAL_STRENGTH);
const strongDefenseAway = makeProfile("strong_defense", ATTACK_DEFENSE_NEUTRAL_STRENGTH, 0.6);
const weakDefenseAway = makeProfile("weak_defense", ATTACK_DEFENSE_NEUTRAL_STRENGTH, 1.5);

const NEUTRAL_INPUT: AttackDefenseGoalModelInput = {
  homeTeamId: "home_team",
  awayTeamId: "away_team",
  competition: baseCompetition,
  homeProfile: neutralHome,
  awayProfile: neutralAway,
  homeElo: 1500,
  awayElo: 1500,
  neutralVenue: true,
};

const CANDIDATES: AttackDefenseGoalModelCandidateId[] = [
  "elo_only_v2_baseline",
  "attack_defense_multiplicative",
  "attack_defense_log_linear",
  "attack_defense_statsbomb_blend",
];

describe.each(CANDIDATES)("computeAttackDefenseGoalModel (%s)", (candidateId) => {
  it("returns finite non-negative xG values", () => {
    const output = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    expect(Number.isFinite(output.homeXg)).toBe(true);
    expect(Number.isFinite(output.awayXg)).toBe(true);
    expect(output.homeXg).toBeGreaterThanOrEqual(0);
    expect(output.awayXg).toBeGreaterThanOrEqual(0);
  });

  it("does not exceed XG bounds", () => {
    const output = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    expect(output.homeXg).toBeGreaterThanOrEqual(ATTACK_DEFENSE_XG_MIN);
    expect(output.homeXg).toBeLessThanOrEqual(ATTACK_DEFENSE_XG_MAX);
    expect(output.awayXg).toBeGreaterThanOrEqual(ATTACK_DEFENSE_XG_MIN);
    expect(output.awayXg).toBeLessThanOrEqual(ATTACK_DEFENSE_XG_MAX);
  });

  it("is deterministic", () => {
    const a = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const b = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    expect(a.homeXg).toBe(b.homeXg);
    expect(a.awayXg).toBe(b.awayXg);
  });

  it("reports the correct candidateId", () => {
    const output = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    expect(output.candidateId).toBe(candidateId);
  });
});

describe("attack_defense_multiplicative symmetry and direction", () => {
  const candidateId: AttackDefenseGoalModelCandidateId = "attack_defense_multiplicative";

  it("equal profiles and equal Elo at neutral venue produce symmetric xG (within rounding)", () => {
    // Use a perfectly symmetric competition env so home/away averages are equal
    const symmetricComp: CompetitionGoalEnvironment = {
      ...baseCompetition,
      averageHomeGoals: 1.25,
      averageAwayGoals: 1.25,
      averageTotalGoals: 2.5,
    };
    const symmetricInput: AttackDefenseGoalModelInput = {
      ...NEUTRAL_INPUT,
      competition: symmetricComp,
      homeProfile: { ...neutralHome, competitionId: symmetricComp.competitionId },
      awayProfile: { ...neutralAway, competitionId: symmetricComp.competitionId },
      neutralVenue: true,
    };
    const homeFirst = computeAttackDefenseGoalModel(candidateId, symmetricInput);
    const swapped = computeAttackDefenseGoalModel(candidateId, {
      ...symmetricInput,
      homeTeamId: "away_team",
      awayTeamId: "home_team",
      homeProfile: symmetricInput.awayProfile,
      awayProfile: symmetricInput.homeProfile,
    });
    expect(homeFirst.homeXg).toBeCloseTo(swapped.awayXg, 4);
    expect(homeFirst.awayXg).toBeCloseTo(swapped.homeXg, 4);
  });

  it("stronger home attack → higher home xG", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const strong = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      homeProfile: strongAttackHome,
    });
    expect(strong.homeXg).toBeGreaterThan(base.homeXg);
  });

  it("weaker home attack → lower home xG", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const weak = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      homeProfile: weakAttackHome,
    });
    expect(weak.homeXg).toBeLessThan(base.homeXg);
  });

  it("stronger opponent defense → lower home xG", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const strongDef = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      awayProfile: strongDefenseAway,
    });
    expect(strongDef.homeXg).toBeLessThan(base.homeXg);
  });

  it("weaker opponent defense → higher home xG", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const weakDef = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      awayProfile: weakDefenseAway,
    });
    expect(weakDef.homeXg).toBeGreaterThan(base.homeXg);
  });

  it("stronger opponent attack does NOT directly increase home xG", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const strongAwayAttack = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      awayProfile: makeProfile("away", 2.0, ATTACK_DEFENSE_NEUTRAL_STRENGTH),
    });
    // Home xG should not change because away attack affects away xG, not home xG
    expect(strongAwayAttack.homeXg).toBeCloseTo(base.homeXg, 4);
  });

  it("higher home Elo increases home xG and decreases away xG", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const strongHome = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      homeElo: 1800,
      awayElo: 1500,
    });
    expect(strongHome.homeXg).toBeGreaterThan(base.homeXg);
    expect(strongHome.awayXg).toBeLessThan(base.awayXg);
  });

  it("home venue advantage increases home xG vs neutral", () => {
    const neutral = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      neutralVenue: true,
    });
    const homeVenue = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      neutralVenue: false,
    });
    expect(homeVenue.homeXg).toBeGreaterThan(neutral.homeXg);
  });
});

describe("attack_defense_log_linear", () => {
  const candidateId: AttackDefenseGoalModelCandidateId = "attack_defense_log_linear";

  it("stronger attack increases home xG (same as multiplicative direction)", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const strong = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      homeProfile: strongAttackHome,
    });
    expect(strong.homeXg).toBeGreaterThan(base.homeXg);
  });

  it("stronger opponent defense decreases home xG", () => {
    const base = computeAttackDefenseGoalModel(candidateId, NEUTRAL_INPUT);
    const strongDef = computeAttackDefenseGoalModel(candidateId, {
      ...NEUTRAL_INPUT,
      awayProfile: strongDefenseAway,
    });
    expect(strongDef.homeXg).toBeLessThan(base.homeXg);
  });
});

describe("buildNeutralAttackDefenseProfile", () => {
  it("returns a fallback profile with neutral strengths", () => {
    const profile = buildNeutralAttackDefenseProfile("test_team", baseCompetition);
    expect(profile.attackStrength).toBe(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
    expect(profile.defenseStrength).toBe(ATTACK_DEFENSE_NEUTRAL_STRENGTH);
    expect(profile.coverage).toBe("fallback");
    expect(profile.teamId).toBe("test_team");
  });

  it("links the profile to the competition environment", () => {
    const profile = buildNeutralAttackDefenseProfile("test_team", baseCompetition);
    expect(profile.competitionId).toBe(baseCompetition.competitionId);
    expect(profile.cutoffAt).toBe(baseCompetition.cutoffAt);
  });
});

describe("elo_only_v2_baseline compatibility", () => {
  it("does not change when eloToExpectedGoals V2 would produce the same result", () => {
    const output = computeAttackDefenseGoalModel("elo_only_v2_baseline", NEUTRAL_INPUT);
    // Both teams equal Elo → xG should be symmetric around base goal
    expect(output.homeXg).toBeCloseTo(output.awayXg, 2);
    expect(output.homeXg).toBeGreaterThan(0);
  });
});

describe("sparse profile behavior", () => {
  const sparseHome = makeProfile("sparse_home", 1.8, 0.7, "sparse");
  const sparseAway = makeProfile("sparse_away", 0.7, 1.8, "sparse");

  it.each(["attack_defense_multiplicative", "attack_defense_log_linear"] as AttackDefenseGoalModelCandidateId[])(
    "%s includes warnings for sparse profiles",
    (candidateId) => {
      const output = computeAttackDefenseGoalModel(candidateId, {
        ...NEUTRAL_INPUT,
        homeProfile: sparseHome,
        awayProfile: sparseAway,
      });
      expect(output.warnings.length).toBeGreaterThan(0);
    }
  );
});

describe("fallback profile behavior", () => {
  it.each(["attack_defense_multiplicative", "attack_defense_log_linear"] as AttackDefenseGoalModelCandidateId[])(
    "%s produces valid xG even for fallback profiles",
    (candidateId) => {
      const fallbackHome = buildNeutralAttackDefenseProfile("fallback_home", baseCompetition, "fallback");
      const fallbackAway = buildNeutralAttackDefenseProfile("fallback_away", baseCompetition, "fallback");
      const output = computeAttackDefenseGoalModel(candidateId, {
        ...NEUTRAL_INPUT,
        homeProfile: fallbackHome,
        awayProfile: fallbackAway,
      });
      expect(Number.isFinite(output.homeXg)).toBe(true);
      expect(Number.isFinite(output.awayXg)).toBe(true);
      expect(output.homeXg).toBeGreaterThanOrEqual(ATTACK_DEFENSE_XG_MIN);
      expect(output.awayXg).toBeGreaterThanOrEqual(ATTACK_DEFENSE_XG_MIN);
    }
  );
});
