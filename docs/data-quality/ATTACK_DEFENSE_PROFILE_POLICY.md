# Attack/Defense Profile Data Policy

## Overview

Team attack/defense profiles are constructed from historical scored match data. This document defines the data requirements, quality thresholds, and fallback behavior for Phase 12.21A profiles.

## Data Sources

| Source | Matches | Score Fields | Date Range |
|---|---|---|---|
| `LIVE_ELO_FOUNDATION_MATCHES` | ~130 | result only (no scores) | WC2010, WC2014 |
| `international-matches-expanded-v1` supplement | 56 | home_score, away_score | 2022–2024 |
| WC fixture files (`world-cup-YYYY-results.json`) | 64 per year | home_score, away_score | 2010, 2014, 2018, 2022 |

Foundation matches have no scores and cannot be used for profile building. Phase 12.21A2 adds a shared historical scored-fixture loader that reuses the committed WC2010, WC2014, WC2018, and WC2022 fixture files plus the existing curated supplement.

## No-Look-Ahead Guarantee

Every profile has a `cutoffAt` field. Only matches with `matchDate < cutoffAt` are used. This is enforced at two layers:

1. **Caller pre-filters**: The backtest runner filters `historicalMatchRecords` to `matchDate < yearCutoff` before calling `buildProfilesForEvaluationSet`
2. **Builder enforces**: `buildTeamAttackDefenseProfile` independently checks each match date and counts any post-cutoff match as a violation

The expected invariant after correct pre-filtering is `noLookAheadViolations === 0`. Any non-zero violation count indicates a data integrity bug.

## Coverage Thresholds

| Coverage | Matches | Quality |
|---|---|---|
| `fallback` | 0 | Neutral strength (1.0/1.0); no information |
| `sparse` | 1–3 | High shrinkage (up to 70% shrunk toward 1.0) |
| `partial` | 4–9 | Moderate shrinkage |
| `full` | 10+ | Low shrinkage; data drives the profile |

The `ATTACK_DEFENSE_FULL_COVERAGE_MATCH_COUNT = 10` threshold is the point at which shrinkage reaches 1.0 (no shrinkage) and the team's data fully governs the profile.

## Profile Decision Gate Thresholds

The decision gate in `attack-defense-goal-model-decision.ts` blocks promotion when:

| Condition | Threshold | Rationale |
|---|---|---|
| Fallback rate | > 50% | Too many teams using neutral profiles undermines model signal |
| No-look-ahead violations | > 0 | Data integrity failure |
| Fixture count | < 32 | Insufficient evaluation sample |
| Brier regression vs baseline | > 0.005 | Candidate is worse than Elo-only |
| Log Loss regression vs baseline | > 0.008 | Candidate is worse than Elo-only |
| Average home xG | > 3.5 | Implausible goal volume; calibration failure |

## Phase 12.21A2 Coverage Result

The Phase 12.21A2 expansion materially improves profile coverage:

| Evaluation | Fallback rate before | Fallback rate after | Median prior matches after |
|---|---:|---:|---:|
| WC2018 | 100.0% | 31.3% | 5 |
| WC2022 | 25.0% | 9.4% | 8.5 |
| Combined | 62.5% | 20.3% | 7 |

The combined fallback rate is now below the existing 50% decision threshold. However, the stricter historical data target remains only partially met:

- WC2018 still has 10 teams with zero prior matches before 2018-01-01.
- WC2018 fallback rate is 31.3%, above the <25% target.
- WC2022 fallback rate is 9.4%, below the <15% target, but median prior-match count is 8.5, below the 12-match target.

The attack/defense candidate remains offline-only because the model decision is now `goal_calibration_blocked`, not because combined profile coverage is above the 50% threshold.

## Remaining Data Gaps

To improve profile quality without changing formulas, add reliable scored international fixtures before WC2018:

- World Cup 2018 qualifiers.
- Continental championships and continental qualifiers.
- Nations League or equivalent official competitions where available.
- Major friendlies only where source quality and redistribution policy are clear.

## Strength Bounds

All profile strengths are hard-clamped:
- Attack strength: [0.25, 3.0]
- Defense strength: [0.25, 3.0]
- Elo multiplier: [0.65, 1.55]
- Output xG: [0.2, 4.0]

These bounds prevent extreme inputs from propagating to the Poisson score matrix. The xG bounds match the existing `ELO_TO_XG_MIN_GOALS` and `ELO_TO_XG_MAX_GOALS` constants for consistency with the production system.
