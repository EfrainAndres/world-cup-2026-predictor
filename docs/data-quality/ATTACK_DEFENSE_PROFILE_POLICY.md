# Attack/Defense Profile Data Policy

## Overview

Team attack/defense profiles are constructed from historical scored match data. This document defines the data requirements, quality thresholds, and fallback behavior for Phase 12.21A profiles.

## Data Sources (Phase 12.21A)

| Source | Matches | Score Fields | Date Range |
|---|---|---|---|
| `LIVE_ELO_FOUNDATION_MATCHES` | ~130 | result only (no scores) | WC2010, WC2014 |
| `LIVE_ELO_EXPANDED_INTERNATIONAL_SUPPLEMENT` | ~68 | home_score, away_score | 2022–2024 |
| WC fixture files (`world-cup-YYYY-results.json`) | 64 per year | home_score, away_score | 2018, 2022 |

Foundation matches have no scores and cannot be used for profile building. The WC fixture files are the primary source of scored international match data.

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

## WC2018 Coverage Gap

For WC2018 evaluation (cutoff 2018-01-01), no pre-2018 scored international match data exists in the current data sources. All 32 WC2018 teams receive fallback profiles. This is a genuine data availability constraint.

**To improve WC2018 coverage**: Add international scored matches from 2014–2017 (UEFA/CONMEBOL qualifiers, Confederations Cup 2017, international friendlies with scores). The profile builder will automatically incorporate them once they appear in the historical match records.

## WC2022 Coverage Profile

WC2022 evaluation (cutoff 2022-01-01) uses WC2018 scored data as historical context. As of Phase 12.21A:
- 13 teams achieve **partial** coverage (4–9 WC2018 matches)
- 11 teams achieve **sparse** coverage (1–3 WC2018 matches)
- 40 teams remain **fallback** (no WC2018 matches)

Teams appear in WC2022 but not WC2018 (first-time qualifiers) will always be fallback without additional data sources.

## Strength Bounds

All profile strengths are hard-clamped:
- Attack strength: [0.25, 3.0]
- Defense strength: [0.25, 3.0]
- Elo multiplier: [0.65, 1.55]
- Output xG: [0.2, 4.0]

These bounds prevent extreme inputs from propagating to the Poisson score matrix. The xG bounds match the existing `ELO_TO_XG_MIN_GOALS` and `ELO_TO_XG_MAX_GOALS` constants for consistency with the production system.
