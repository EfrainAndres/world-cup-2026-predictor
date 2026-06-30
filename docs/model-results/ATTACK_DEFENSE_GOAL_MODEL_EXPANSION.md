# Phase 12.21A — Attack/Defense Goal Model Expansion

## Overview

Phase 12.21A introduces a reusable attack/defense strength foundation and four goal-model candidates as an **experimental, offline-only** system. Production Elo-to-xG V2 is unchanged. No candidate is promoted in this phase.

## Architecture

### Model layer (`packages/model/src/`)

**`attack-defense-strength.ts`** — pure, stateless helpers:
- `classifyProfileCoverage(sampleSize)` → `fallback | sparse | partial | full`
- `computeSampleShrinkage(n, fullCoverageN)` → [0, 1] Bayesian shrinkage toward neutral
- `computeRecencyWeight(matchDate, cutoffDate, strategy)` → weight for three strategies
- `computeSosAdjustment(avgOpponentElo, direction)` → strength-of-schedule multiplier
- `computeAttackStrength(goalsForPerMatch, competitionAvg, shrinkage, sosMultiplier)` → bounded strength
- `computeDefenseStrength(goalsAgainstPerMatch, competitionAvg, shrinkage, sosMultiplier)` → bounded strength
- `computeEloMultiplier(eloDiff, referenceGoals, adjustmentPer100, maxAdjustment)` → bounded multiplier

**`attack-defense-goal-model.ts`** — four goal-model candidates:
- `elo_only_v2_baseline` — wraps current Elo-to-xG V2; provides the reference baseline
- `attack_defense_multiplicative` — `homeXg = avgHomeGoals × homeAttack × awayDefense × eloMult × venueMult`
- `attack_defense_log_linear` — same factors in log space, exponentiated and clamped
- `attack_defense_statsbomb_blend` — multiplicative form, falls back to StatsBomb-adjusted profiles when xG data is available

### API layer (`packages/api/src/`)

**`attack-defense-profile-builder.ts`** — historical profile construction:
- `buildCompetitionGoalEnvironment` — average home/away goals per match before a cutoff date
- `buildTeamAttackDefenseProfile` — per-team attack/defense strengths; enforces no-look-ahead strictly (`matchDate < cutoffAt`)
- `buildProfilesForEvaluationSet` — builds profiles for all teams in an evaluation set

**`attack-defense-goal-model-backtest.ts`** — WC2018/WC2022 backtester:
- Loads evaluation fixtures from `packages/data/fixtures/world-cup/`
- Builds per-year profiles with the correct cutoff (WC2018 cutoff = 2018-01-01; WC2022 cutoff = 2022-01-01)
- Pre-filters historical records before profile building — violations = 0 is the invariant
- Computes Brier, Log Loss, Outcome Accuracy, Goal MAE, xG diversity metrics per candidate
- `BACKTEST_EVALUATION_YEARS = [2018, 2022]`

**`attack-defense-goal-model-decision.ts`** — decision gate:
- Requires `fixtureCount ≥ 32`, `noLookAheadViolations = 0`, `fallbackRate < 50%`
- Blocks promotion if Brier regresses by more than `0.005`, Log Loss by more than `0.008`
- Blocks if any candidate's average home xG exceeds `3.5`
- Selects the best non-baseline candidate by Brier score

**`attack-defense-goal-model-cli.ts`** — `goal-model:compare` entry point:
- Writes `docs/model-results/artifacts/attack-defense-goal-model-comparison.json`
- Writes `docs/model-results/artifacts/attack-defense-team-profiles.json`
- Always exits 0 (data-blocked and coverage-blocked are expected outcomes, not errors)

## Constants

| Constant | Value | Purpose |
|---|---|---|
| `ATTACK_DEFENSE_STRENGTH_MIN` | 0.25 | Lower bound for attack/defense strength |
| `ATTACK_DEFENSE_STRENGTH_MAX` | 3.0 | Upper bound |
| `ATTACK_DEFENSE_NEUTRAL_STRENGTH` | 1.0 | Shrinkage target; neutral fallback |
| `ATTACK_DEFENSE_XG_MIN` | 0.2 | Lower xG bound (shared with `ELO_TO_XG_MIN_GOALS`) |
| `ATTACK_DEFENSE_XG_MAX` | 4.0 | Upper xG bound (shared with `ELO_TO_XG_MAX_GOALS`) |
| `ATTACK_DEFENSE_HOME_ADVANTAGE_MULTIPLIER` | 1.1 | Applied at non-neutral venues |
| `ATTACK_DEFENSE_ELO_MULTIPLIER_MIN` | 0.65 | Elo multiplier lower bound |
| `ATTACK_DEFENSE_ELO_MULTIPLIER_MAX` | 1.55 | Elo multiplier upper bound |
| `ATTACK_DEFENSE_RECENCY_HALF_LIFE_DAYS` | 365 | Exponential decay half-life |
| `ATTACK_DEFENSE_LINEAR_DECAY_WINDOW_DAYS` | 1095 | Linear decay window (3 years) |
| `ATTACK_DEFENSE_REFERENCE_ELO` | 1500 | SOS neutral reference point |
| `ATTACK_DEFENSE_SOS_MAX_ADJUSTMENT` | 0.25 | Maximum SOS multiplier offset |
| `ATTACK_DEFENSE_SOS_ELO_SCALE` | 400 | SOS sigmoid steepness |

## Profile Strategies

| Strategy | Description |
|---|---|
| `goals_unadjusted` | Raw goals for/against per match; no SOS correction |
| `goals_strength_of_schedule_adjusted` | Goals scaled by opponent Elo relative to reference |
| `goals_plus_statsbomb_xg` | Blends xG data when available; falls back to goals |

## Recency Strategies

| Strategy | Description |
|---|---|
| `uniform` | All matches equally weighted; baseline |
| `linear_decay` | Weight decays linearly to 0 over 3 years |
| `exponential_half_life` | Weight = 2^(−days/365); halves every year |

## Coverage Classification

| Coverage | Sample Size | Behavior |
|---|---|---|
| `fallback` | 0 | Neutral strength (1.0/1.0); no data |
| `sparse` | 1–3 | Heavy shrinkage toward neutral |
| `partial` | 4–9 | Moderate shrinkage |
| `full` | 10+ | Minimal shrinkage; full data confidence |

## Backtesting Results (Phase 12.21A)

**Run configuration**: `goals_strength_of_schedule_adjusted` + `exponential_half_life`

**Fixtures evaluated**: 128 (WC2018: 64, WC2022: 64)

**Profile coverage**:
- Competition env sample size: 64 (WC2018 scored matches, used for WC2022 profiles)
- Full: 0 teams, Partial: 13 teams, Sparse: 11 teams, Fallback: 40 teams (62.5%)
- No-look-ahead violations: 0

**WC2018 coverage is fully fallback** — no pre-2018 scored international match data exists in the current data sources. The foundation matches (WC2010/WC2014) have only result fields, not scores.

**WC2022 coverage is partial/sparse** — WC2018 scored data provides historical profiles for the 32 WC2018-qualifying nations; new WC2022 entrants remain fallback.

**Candidate metrics (128 fixtures)**:

| Candidate | Brier | Log Loss | OutAcc | GoalMAE | UniqueXG |
|---|---|---|---|---|---|
| elo_only_v2_baseline | 0.2170 | 1.0738 | 42.97% | 1.3281 | 1 |
| attack_defense_multiplicative | 0.2145 | 1.0655 | 41.41% | 1.3233 | 60 |
| attack_defense_log_linear | 0.2145 | 1.0655 | 41.41% | 1.3233 | 60 |
| attack_defense_statsbomb_blend | 0.2145 | 1.0655 | 41.41% | 1.3233 | 60 |

The multiplicative and log-linear candidates improve Brier by −0.0025 and Log Loss by −0.0083 over the baseline — within the regression tolerance. UniqueXG pairs rise from 1 to 60, demonstrating genuine diversity.

## Decision Gate Result

**Decision**: `insufficient_profile_coverage`
**Blocker**: Fallback rate 62.5% exceeds the 50% threshold

**Final phase status**: `attack_defense_data_blocked`

The model candidates themselves are well-formed and show improvement over the baseline, but the fallback rate is too high to promote reliably. This is a data availability constraint, not a model quality failure.

## Phase 12.21A2 Rerun

Phase 12.21A2 expands the historical scored-match foundation by reusing the already committed WC2010 and WC2014 scored fixture files in addition to WC2018, WC2022, and the existing curated international supplement. The profile formulas, shrinkage, recency, strength-of-schedule, candidate formulas, Elo constants, Elo-to-xG V2, StatsBomb weights, Poisson implementation, and production routes remain unchanged.

**Historical data validation**:

| Metric | Before | After |
|---|---:|---:|
| Accepted scored fixtures | 184 | 312 |
| Earliest fixture | 2018-06-14 | 2010-06-11 |
| Latest fixture | 2024-07-14 | 2024-07-14 |
| Unique teams | 50 | 60 |
| Unknown competition-weight mappings | 0 | 0 |
| Duplicate/conflicting fixtures | 0 / 0 | 0 / 0 |
| No-look-ahead violations | 0 | 0 |

**Profile coverage after expansion**:

| Coverage | Teams |
|---|---:|
| Full | 20 |
| Partial | 20 |
| Sparse | 11 |
| Fallback | 13 |

Fallback rate falls from 62.5% to 20.3%, below the existing 50% combined promotion prerequisite. WC2018 remains data-partial because 10 teams still have zero prior matches before the 2018 cutoff; WC2022 fallback improves to 9.4%.

**Rerun candidate metrics (128 fixtures)**:

| Candidate | Brier | Log Loss | OutAcc | GoalMAE | Exact | Top-5 | UniqueXG | Unique modal |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| elo_only_v2_baseline | 0.2170 | 1.0738 | 42.97% | 1.3281 | 9.38% | 46.88% | 1 | 1 |
| attack_defense_multiplicative | 0.2207 | 1.1123 | 43.75% | 1.4221 | 13.28% | 48.44% | 121 | 12 |
| attack_defense_log_linear | 0.2207 | 1.1123 | 43.75% | 1.4221 | 13.28% | 48.44% | 121 | 12 |
| attack_defense_statsbomb_blend | 0.2207 | 1.1123 | 43.75% | 1.4221 | 13.28% | 48.44% | 121 | 12 |

The expanded data resolves the combined fallback-rate blocker and increases scoreline diversity, but the existing decision gate now blocks promotion on calibration:

- **Decision**: `goal_calibration_blocked`
- **Selected diagnostic candidate**: `attack_defense_log_linear`
- **Brier delta**: +0.00376
- **Log Loss delta**: +0.03850, above the +0.008 regression threshold
- **Total goal MAE delta**: +0.0939, above the +0.05 regression threshold

This does not promote the candidate and does not change production behavior.

## Phase 12.21A3 Recalibration

Phase 12.21A3 adds an offline-only recalibration harness for the attack/defense goal model. The harness keeps `elo_only_v2_baseline` unchanged, compares bounded damped, residual, regularized, and blend candidates, selects parameters on WC2018 only, and validates the selected candidate on WC2022.

Selected offline candidate:

```text
attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0
```

| Split | Candidate | Brier | Log Loss | GoalMAE | UniqueXG | Unique modal | 1-1 freq |
|---|---|---:|---:|---:|---:|---:|---:|
| WC2022 holdout | Elo V2 baseline | 0.2180 | 1.0785 | 1.4688 | 1 | 1 | 100.0% |
| WC2022 holdout | Current log-linear | 0.2182 | 1.0973 | 1.5283 | 64 | 10 | 35.9% |
| WC2022 holdout | Selected damped | 0.2063 | 1.0339 | 1.4704 | 64 | 3 | 70.3% |
| Combined | Selected damped | 0.2093 | 1.0460 | 1.3383 | 121 | 4 | 75.8% |

Decision: `promote_recalibrated_candidate` for offline review. This does not change production behavior. See `docs/model-results/ATTACK_DEFENSE_GOAL_MODEL_RECALIBRATION.md`.

## What Unlocks Production Promotion

To promote beyond offline review:

1. Run a dedicated production-integration decision phase for the selected recalibrated candidate.
2. Define runtime provenance, compatibility, monitoring, and rollback.
3. Decide whether richer pre-match Elo inputs should be included without double-counting strength-of-schedule.
4. Keep production Elo V2 unchanged until an explicit promotion phase approves replacement or controlled rollout.

## Production Safety

- Elo-to-xG V2 production constants are unchanged
- StatsBomb weights, Poisson score matrix, 1X2 aggregation are unchanged
- No production code paths reference Phase 12.21A types or functions
- All new exports are additive; no existing exports shadow or replace anything
- `elo_only_v2_baseline` candidate wraps the production function and is validated by compatibility tests
