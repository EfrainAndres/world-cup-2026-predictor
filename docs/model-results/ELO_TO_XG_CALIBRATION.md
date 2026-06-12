# Elo-to-Expected Goals Calibration — Foundation

**Phase:** 7.8
**Status:** Implemented — transparent foundation, uncalibrated

## Purpose

`eloToExpectedGoals` converts team Elo ratings into a pair of expected-goals values (home and away) suitable for driving the Poisson scoreline model. It replaces the previous inline calculation in the API layer with a testable, documented model function.

## Design Decisions

### Placement in the model package

Prediction logic belongs in `packages/model`, not `packages/api`. Moving the Elo-to-xG calculation here makes it independently testable and reusable outside of the API layer.

### Simple, transparent formulas

The goal is an explainable baseline, not a black-box model. Every parameter is a named constant.

**Base expected goals:** 1.25 per team (a typical international match average).

**Elo adjustment:**

```
eloDifference = homeElo - awayElo
rawAdjustment = (eloDifference / 100) × 0.1
eloAdjustment = clamp(rawAdjustment, −0.45, +0.45)
```

- Per 100 Elo points of difference, expected goals shift by ±0.1.
- The adjustment is clamped so no single large Elo gap can produce unrealistic xG.

**Final xG:**

```
homeExpectedGoals = clamp(1.25 + eloAdjustment + adAdjHome, 0.2, 4.0)
awayExpectedGoals = clamp(1.25 − eloAdjustment + adAdjAway, 0.2, 4.0)
```

### Attack/defense adjustment (opt-in)

When `applyAttackDefense: true` and all four scores are provided, a small additional adjustment is applied:

```
adAdjHome = clamp((norm(homeAttack) − norm(awayDefense)) × 0.1, −0.2, +0.2)
adAdjAway = clamp((norm(awayAttack) − norm(homeDefense)) × 0.1, −0.2, +0.2)

where norm(score) = (score − 50) / 50   [in −1, +1]
```

- A team with attack score 80 scores `(80 − 50)/50 = +0.6` → +0.06 home xG adjustment.
- An away team with defense score 30 contributes `(30 − 50)/50 = −0.4` → reduces the away defense penalty applied to home goals by −0.04, yielding net +0.1.
- Maximum combined adjustment per side: ±0.2 goals.

The attack/defense adjustment is off by default and does not affect `predictMatchFromLiveElo` in the current API implementation. It is available as a tested building block for future integration.

### Clamping

All xG values are clamped to `[0.2, 4.0]` to prevent non-positive expected goals from entering the Poisson model and to cap unrealistic high-scoring predictions.

## Constants

| Name | Value | Role |
|---|---|---|
| `ELO_TO_XG_BASE_GOALS` | 1.25 | Starting expected goals per team |
| `ELO_TO_XG_ADJUSTMENT_PER_100` | 0.1 | Goals shift per 100 Elo points |
| `ELO_TO_XG_MAX_ELO_ADJUSTMENT` | 0.45 | Cap on Elo-based goals shift |
| `ELO_TO_XG_MIN_GOALS` | 0.2 | Minimum allowed xG output |
| `ELO_TO_XG_MAX_GOALS` | 4.0 | Maximum allowed xG output |
| `ELO_TO_XG_ATTACK_DEFENSE_WEIGHT` | 0.1 | Scaling factor per normalized attack/defense signal |

## Return Fields

| Field | Description |
|---|---|
| `homeExpectedGoals` | Clamped, rounded home team xG |
| `awayExpectedGoals` | Clamped, rounded away team xG |
| `eloDifference` | Raw Elo difference (home minus away) |
| `baseGoals` | Configured base goals constant |
| `eloAdjustment` | Clamped goals shift from Elo difference |
| `attackDefenseAdjustmentHome` | Goals added/removed from home xG by attack/defense |
| `attackDefenseAdjustmentAway` | Goals added/removed from away xG by attack/defense |
| `warnings` | Always includes the uncalibrated disclaimer |

## Warnings Emitted

| Constant | Condition |
|---|---|
| `ELO_TO_XG_UNCALIBRATED_WARNING` | Always — simple Elo difference mapping disclaimer |
| `ELO_TO_XG_ATTACK_DEFENSE_ADJUSTMENT_WARNING` | When `applyAttackDefense: true` |

## API Integration

`predictMatchFromLiveElo()` now calls `eloToExpectedGoals()` with the two teams' live Elo ratings. The numeric output is identical to the previous inline calculation: same base, same adjustment scale, same clamping. The `expectedGoals` fields in the API response (`home`, `away`, `eloDifference`, `baseExpectedGoals`, `goalsAdjustment`) are mapped directly from the model function's return value.

The `ELO_TO_XG_UNCALIBRATED_WARNING` constant replaces the former hardcoded warning string, so both the model and API share the same message.

## What This Does Not Claim

- This formula is **not calibrated** against historical match data or international goal rates.
- The base of 1.25 and the 0.1-per-100-Elo adjustment are reasonable starting values but have not been validated against observed match outcomes.
- The attack/defense adjustment is experimental and is not used in the default prediction path.

## Future Work

- Calibrate `ELO_TO_XG_BASE_GOALS` and `ELO_TO_XG_ADJUSTMENT_PER_100` against historical World Cup and international match goal distributions.
- Enable attack/defense adjustment in `predictMatchFromLiveElo` once more scored-match data is available and the signals are validated.
- Add home advantage bonus to the xG function when the match is not at a neutral site.
- Report calibration metrics (MAE, bias) once a validation dataset is established.
