import type { AttackDefenseProfileCoverage, AttackDefenseRecencyStrategy } from "./types.js";

// ── Sample size thresholds ────────────────────────────────────────────────────

export const ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT = 10;
export const ATTACK_DEFENSE_PARTIAL_COVERAGE_MIN_MATCHES = 4;
export const ATTACK_DEFENSE_SPARSE_MAX_MATCHES = 3;
export const ATTACK_DEFENSE_MIN_MATCH_COUNT = 1;

// ── Strength bounds ───────────────────────────────────────────────────────────

export const ATTACK_DEFENSE_STRENGTH_MIN = 0.25;
export const ATTACK_DEFENSE_STRENGTH_MAX = 3.0;
export const ATTACK_DEFENSE_NEUTRAL_STRENGTH = 1.0;

// ── XG bounds for experimental candidates ────────────────────────────────────

export const ATTACK_DEFENSE_XG_MIN = 0.2;
export const ATTACK_DEFENSE_XG_MAX = 4.0;

// ── Recency weighting ─────────────────────────────────────────────────────────

export const ATTACK_DEFENSE_RECENCY_HALF_LIFE_DAYS = 365;
export const ATTACK_DEFENSE_LINEAR_DECAY_WINDOW_DAYS = 1095; // 3 years → weight reaches 0

// ── Strength-of-schedule ─────────────────────────────────────────────────────

export const ATTACK_DEFENSE_REFERENCE_ELO = 1500;
export const ATTACK_DEFENSE_SOS_MAX_ADJUSTMENT = 0.25;
export const ATTACK_DEFENSE_SOS_ELO_SCALE = 400;

// ── Elo multiplier range (for multiplicative/log-linear candidates) ───────────

export const ATTACK_DEFENSE_ELO_MULTIPLIER_MIN = 0.65;
export const ATTACK_DEFENSE_ELO_MULTIPLIER_MAX = 1.55;

// ── Venue ─────────────────────────────────────────────────────────────────────

export const ATTACK_DEFENSE_HOME_ADVANTAGE_MULTIPLIER = 1.1;
export const ATTACK_DEFENSE_NEUTRAL_VENUE_MULTIPLIER = 1.0;

// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(dateA: string, dateB: string): number {
  const a = Date.parse(dateA);
  const b = Date.parse(dateB);
  return Math.abs(b - a) / 86_400_000;
}

// ── Coverage classification ───────────────────────────────────────────────────

export function classifyProfileCoverage(sampleSize: number): AttackDefenseProfileCoverage {
  if (sampleSize <= 0) return "fallback";
  if (sampleSize <= ATTACK_DEFENSE_SPARSE_MAX_MATCHES) return "sparse";
  if (sampleSize < ATTACK_DEFENSE_PARTIAL_COVERAGE_MIN_MATCHES) return "sparse";
  if (sampleSize < ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT) return "partial";
  return "full";
}

// ── Shrinkage ─────────────────────────────────────────────────────────────────

/**
 * Returns a [0, 1] weight representing how much of the observed signal to retain.
 * 0 = fully shrink toward the prior (neutral strength 1.0).
 * 1 = retain full observed strength.
 */
export function computeSampleShrinkage(
  sampleSize: number,
  fullCoverageSampleSize: number = ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT
): number {
  if (sampleSize <= 0) return 0;
  if (fullCoverageSampleSize <= 0) return 1;
  return Math.min(1, sampleSize / fullCoverageSampleSize);
}

// ── Recency weighting ─────────────────────────────────────────────────────────

export function computeRecencyWeight(
  matchDate: string,
  cutoffDate: string,
  strategy: AttackDefenseRecencyStrategy
): number {
  if (strategy === "uniform") return 1.0;

  const days = daysBetween(matchDate, cutoffDate);

  if (strategy === "linear_decay") {
    if (days >= ATTACK_DEFENSE_LINEAR_DECAY_WINDOW_DAYS) return 0.0;
    return 1.0 - days / ATTACK_DEFENSE_LINEAR_DECAY_WINDOW_DAYS;
  }

  // exponential_half_life
  const halfLifeDays = ATTACK_DEFENSE_RECENCY_HALF_LIFE_DAYS;
  return Math.exp(-Math.LN2 * (days / halfLifeDays));
}

// ── Strength of schedule ──────────────────────────────────────────────────────

/**
 * Returns a multiplicative SOS adjustment for an attack or defense rate.
 *
 * A team that scored heavily against weak opposition (low opponent Elo) receives
 * a downward adjustment (< 1). A team that scored well against elite opposition
 * (high opponent Elo) receives an upward adjustment (> 1).
 *
 * defenseDirection = true inverts the logic: conceding few goals against elite
 * opposition is better, so high avgOpponentElo → downward defense adjustment.
 *
 * Returns 1.0 when avgOpponentElo is null (no Elo available).
 */
export function computeSosAdjustment(
  avgOpponentElo: number | null,
  direction: "attack" | "defense"
): number {
  if (avgOpponentElo === null) return 1.0;

  const eloDeviation = (avgOpponentElo - ATTACK_DEFENSE_REFERENCE_ELO) / ATTACK_DEFENSE_SOS_ELO_SCALE;
  // raw: positive means opponents were above average
  const rawAdjustment = direction === "attack"
    ? eloDeviation * ATTACK_DEFENSE_SOS_MAX_ADJUSTMENT
    : -eloDeviation * ATTACK_DEFENSE_SOS_MAX_ADJUSTMENT;

  const clampedAdj = clamp(rawAdjustment, -ATTACK_DEFENSE_SOS_MAX_ADJUSTMENT, ATTACK_DEFENSE_SOS_MAX_ADJUSTMENT);
  return 1.0 + clampedAdj;
}

// ── Attack/defense strength ───────────────────────────────────────────────────

/**
 * Computes the attack strength multiplier for a team.
 *
 * attackStrength = 1.0 means the team scores at exactly the competition average.
 * Values > 1.0 indicate above-average attacking; < 1.0 below-average.
 *
 * shrinkageFactor ∈ [0, 1]: blends between neutral prior (1.0) and observed rate.
 */
export function computeAttackStrength(
  goalsForPerMatch: number,
  competitionAvgGoals: number,
  shrinkageFactor: number,
  sosMultiplier: number = 1.0
): number {
  if (competitionAvgGoals <= 0) return ATTACK_DEFENSE_NEUTRAL_STRENGTH;

  const rawRatio = goalsForPerMatch / competitionAvgGoals;
  const adjustedRatio = rawRatio * sosMultiplier;
  const shrunk = ATTACK_DEFENSE_NEUTRAL_STRENGTH + shrinkageFactor * (adjustedRatio - ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  return clamp(shrunk, ATTACK_DEFENSE_STRENGTH_MIN, ATTACK_DEFENSE_STRENGTH_MAX);
}

/**
 * Computes the defense strength multiplier for a team.
 *
 * defenseStrength = 1.0 means the team concedes at exactly the competition average.
 * Values > 1.0 indicate worse-than-average defense (concedes more).
 * Values < 1.0 indicate better-than-average defense (concedes less).
 *
 * Opponents multiply their xG by the opposing team's defenseStrength, so a
 * weaker defense (> 1) increases opponent xG and a stronger defense (< 1)
 * decreases it.
 */
export function computeDefenseStrength(
  goalsAgainstPerMatch: number,
  competitionAvgGoals: number,
  shrinkageFactor: number,
  sosMultiplier: number = 1.0
): number {
  if (competitionAvgGoals <= 0) return ATTACK_DEFENSE_NEUTRAL_STRENGTH;

  const rawRatio = goalsAgainstPerMatch / competitionAvgGoals;
  const adjustedRatio = rawRatio * sosMultiplier;
  const shrunk = ATTACK_DEFENSE_NEUTRAL_STRENGTH + shrinkageFactor * (adjustedRatio - ATTACK_DEFENSE_NEUTRAL_STRENGTH);
  return clamp(shrunk, ATTACK_DEFENSE_STRENGTH_MIN, ATTACK_DEFENSE_STRENGTH_MAX);
}

// ── Elo multiplier ────────────────────────────────────────────────────────────

/**
 * Converts an Elo difference to a multiplicative factor ∈ [ELO_MULT_MIN, ELO_MULT_MAX].
 *
 * positive eloDiff = home stronger → home multiplier > 1, away multiplier < 1.
 * Uses the same sensitivity as V2 balanced (adjustmentPer100 = 0.15) but expressed
 * as a ratio rather than an absolute goal offset.
 */
export function computeEloMultiplier(
  eloDiff: number,
  referenceGoals: number,
  adjustmentPer100: number,
  maxAdjustment: number
): number {
  const rawAdj = clamp((eloDiff / 100) * adjustmentPer100, -maxAdjustment, maxAdjustment);
  if (referenceGoals <= 0) return 1.0;
  return clamp(1.0 + rawAdj / referenceGoals, ATTACK_DEFENSE_ELO_MULTIPLIER_MIN, ATTACK_DEFENSE_ELO_MULTIPLIER_MAX);
}
