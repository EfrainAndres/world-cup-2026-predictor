import {
  ATTACK_DEFENSE_HOME_ADVANTAGE_MULTIPLIER,
  ATTACK_DEFENSE_NEUTRAL_VENUE_MULTIPLIER,
  ATTACK_DEFENSE_XG_MAX,
  ATTACK_DEFENSE_XG_MIN,
  computeEloMultiplier,
} from "./attack-defense-strength.js";
import {
  ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
  ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT,
  eloToExpectedGoals,
} from "./elo-to-xg.js";
import type {
  AttackDefenseGoalModelCandidateId,
  AttackDefenseGoalModelInput,
  AttackDefenseGoalModelOutput,
} from "./types.js";

export const ATTACK_DEFENSE_GOAL_MODEL_VERSION = "attack-defense-goal-model-v1";

export const GOAL_MODEL_CANDIDATE_IDS: readonly AttackDefenseGoalModelCandidateId[] = [
  "elo_only_v2_baseline",
  "attack_defense_multiplicative",
  "attack_defense_log_linear",
  "attack_defense_statsbomb_blend",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeLog(x: number): number {
  return Math.log(Math.max(x, 1e-10));
}

// ── Baseline: Elo-only V2 (production formula unchanged) ─────────────────────

function computeEloOnlyV2Baseline(input: AttackDefenseGoalModelInput): AttackDefenseGoalModelOutput {
  const eloDiff = input.homeElo - input.awayElo;

  const result = eloToExpectedGoals({
    homeEloRating: input.homeElo,
    awayEloRating: input.awayElo,
    preset: "balanced",
  });

  return {
    homeXg: result.homeExpectedGoals,
    awayXg: result.awayExpectedGoals,
    homeAttackContribution: 1.0,
    awayDefenseContribution: 1.0,
    awayAttackContribution: 1.0,
    homeDefenseContribution: 1.0,
    eloHomeMultiplier: eloDiff > 0 ? result.homeExpectedGoals / result.awayExpectedGoals : 1.0,
    eloAwayMultiplier: 1.0,
    venueMultiplier: 1.0,
    candidateId: "elo_only_v2_baseline",
    warnings: result.warnings.slice(),
  };
}

// ── Multiplicative: competition × attack × defense × elo × venue ─────────────

function computeMultiplicative(input: AttackDefenseGoalModelInput): AttackDefenseGoalModelOutput {
  const { competition, homeProfile, awayProfile, homeElo, awayElo, neutralVenue } = input;
  const warnings: string[] = [];

  const venueMultiplier = neutralVenue
    ? ATTACK_DEFENSE_NEUTRAL_VENUE_MULTIPLIER
    : ATTACK_DEFENSE_HOME_ADVANTAGE_MULTIPLIER;

  const eloDiff = homeElo - awayElo;
  const eloHomeMultiplier = computeEloMultiplier(
    eloDiff,
    competition.averageHomeGoals,
    ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
    ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT
  );
  const eloAwayMultiplier = computeEloMultiplier(
    -eloDiff,
    competition.averageAwayGoals,
    ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
    ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT
  );

  // homeXg = competitionAvgHome * homeAttack * awayDefense * eloHome * venue
  // awayDefense > 1 means worse defense (concedes more) → higher opponent xG
  const rawHomeXg =
    competition.averageHomeGoals *
    homeProfile.attackStrength *
    awayProfile.defenseStrength *
    eloHomeMultiplier *
    venueMultiplier;

  const rawAwayXg =
    competition.averageAwayGoals *
    awayProfile.attackStrength *
    homeProfile.defenseStrength *
    eloAwayMultiplier;

  const homeXg = clamp(rawHomeXg, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);
  const awayXg = clamp(rawAwayXg, ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);

  if (homeProfile.coverage === "fallback" || homeProfile.coverage === "sparse") {
    warnings.push(`Home team "${input.homeTeamId}" has ${homeProfile.coverage} attack/defense coverage.`);
  }
  if (awayProfile.coverage === "fallback" || awayProfile.coverage === "sparse") {
    warnings.push(`Away team "${input.awayTeamId}" has ${awayProfile.coverage} attack/defense coverage.`);
  }

  return {
    homeXg,
    awayXg,
    homeAttackContribution: homeProfile.attackStrength,
    awayDefenseContribution: awayProfile.defenseStrength,
    awayAttackContribution: awayProfile.attackStrength,
    homeDefenseContribution: homeProfile.defenseStrength,
    eloHomeMultiplier,
    eloAwayMultiplier,
    venueMultiplier,
    candidateId: "attack_defense_multiplicative",
    warnings,
  };
}

// ── Log-linear: additive in log space ────────────────────────────────────────

function computeLogLinear(input: AttackDefenseGoalModelInput): AttackDefenseGoalModelOutput {
  const { competition, homeProfile, awayProfile, homeElo, awayElo, neutralVenue } = input;
  const warnings: string[] = [];

  const venueMultiplier = neutralVenue
    ? ATTACK_DEFENSE_NEUTRAL_VENUE_MULTIPLIER
    : ATTACK_DEFENSE_HOME_ADVANTAGE_MULTIPLIER;

  const eloDiff = homeElo - awayElo;
  const eloHomeMultiplier = computeEloMultiplier(
    eloDiff,
    competition.averageHomeGoals,
    ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
    ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT
  );
  const eloAwayMultiplier = computeEloMultiplier(
    -eloDiff,
    competition.averageAwayGoals,
    ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100,
    ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT
  );

  // log(homeXg) = log(avgHome) + log(homeAttack) + log(awayDefense) + log(eloHome) + log(venue)
  const logHomeXg =
    safeLog(competition.averageHomeGoals) +
    safeLog(homeProfile.attackStrength) +
    safeLog(awayProfile.defenseStrength) +
    safeLog(eloHomeMultiplier) +
    safeLog(venueMultiplier);

  const logAwayXg =
    safeLog(competition.averageAwayGoals) +
    safeLog(awayProfile.attackStrength) +
    safeLog(homeProfile.defenseStrength) +
    safeLog(eloAwayMultiplier);

  const homeXg = clamp(Math.exp(logHomeXg), ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);
  const awayXg = clamp(Math.exp(logAwayXg), ATTACK_DEFENSE_XG_MIN, ATTACK_DEFENSE_XG_MAX);

  if (homeProfile.coverage === "fallback" || homeProfile.coverage === "sparse") {
    warnings.push(`Home team "${input.homeTeamId}" has ${homeProfile.coverage} attack/defense coverage.`);
  }
  if (awayProfile.coverage === "fallback" || awayProfile.coverage === "sparse") {
    warnings.push(`Away team "${input.awayTeamId}" has ${awayProfile.coverage} attack/defense coverage.`);
  }

  return {
    homeXg,
    awayXg,
    homeAttackContribution: homeProfile.attackStrength,
    awayDefenseContribution: awayProfile.defenseStrength,
    awayAttackContribution: awayProfile.attackStrength,
    homeDefenseContribution: homeProfile.defenseStrength,
    eloHomeMultiplier,
    eloAwayMultiplier,
    venueMultiplier,
    candidateId: "attack_defense_log_linear",
    warnings,
  };
}

// ── StatsBomb blend: multiplicative base + optional StatsBomb layer ───────────
// This candidate is structurally identical to multiplicative in Phase 12.21A.
// StatsBomb blending is wired as a pass-through here; the API layer applies the
// StatsBomb signal on top after calling this function, consistent with the
// existing StatsBomb production pipeline.

function computeStatsBombBlend(input: AttackDefenseGoalModelInput): AttackDefenseGoalModelOutput {
  const base = computeMultiplicative(input);
  return {
    ...base,
    candidateId: "attack_defense_statsbomb_blend",
    warnings: [...base.warnings, "StatsBomb blend: StatsBomb signal applied by caller if available."],
  };
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

export function computeAttackDefenseGoalModel(
  candidateId: AttackDefenseGoalModelCandidateId,
  input: AttackDefenseGoalModelInput
): AttackDefenseGoalModelOutput {
  switch (candidateId) {
    case "elo_only_v2_baseline":
      return computeEloOnlyV2Baseline(input);
    case "attack_defense_multiplicative":
      return computeMultiplicative(input);
    case "attack_defense_log_linear":
      return computeLogLinear(input);
    case "attack_defense_statsbomb_blend":
      return computeStatsBombBlend(input);
  }
}

// ── Neutral fallback profile factory ─────────────────────────────────────────

import type { AttackDefenseProfileCoverage, CompetitionGoalEnvironment, TeamAttackDefenseProfile } from "./types.js";

export function buildNeutralAttackDefenseProfile(
  teamId: string,
  competition: CompetitionGoalEnvironment,
  coverage: AttackDefenseProfileCoverage = "fallback"
): TeamAttackDefenseProfile {
  return {
    teamId,
    competitionId: competition.competitionId,
    attackStrength: 1.0,
    defenseStrength: 1.0,
    attackSampleSize: 0,
    defenseSampleSize: 0,
    goalsForPerMatch: null,
    goalsAgainstPerMatch: null,
    expectedGoalsForPerMatch: null,
    expectedGoalsAgainstPerMatch: null,
    strengthOfScheduleAdjustment: 0.0,
    recencyWeight: 0.0,
    coverage,
    cutoffAt: competition.cutoffAt,
  };
}
