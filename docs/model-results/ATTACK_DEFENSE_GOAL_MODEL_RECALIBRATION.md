# Phase 12.21A3 - Attack/Defense Goal Model Recalibration

Phase 12.21A3 recalibrates the experimental attack/defense goal model after Phase 12.21A2 cleared the profile-coverage blocker. This remains an offline-only evaluation. Production Elo-to-xG V2, Poisson, StatsBomb rollout behavior, snapshots, evaluations, persistence, standings, qualification, tournament topology, public routes, and production UI are unchanged.

## Reason for Recalibration

The Phase 12.21A2 rerun showed that expanded historical data created useful team differentiation but the current full-strength log-linear candidate over-amplified attack/defense signals:

| Candidate | Brier | Log Loss | Total Goal MAE | Unique xG | Unique modal | 1-1 frequency |
|---|---:|---:|---:|---:|---:|---:|
| Elo V2 baseline | 0.2170 | 1.0738 | 1.3281 | 1 | 1 | 100.0% |
| Current log-linear | 0.2207 | 1.1123 | 1.4221 | 121 | 12 | 39.8% |

The current candidate improved scoreline diversity but materially regressed probability calibration and total-goal calibration. The root cause was not data coverage; it was signal amplification from full-strength attack and defense factors.

## Diagnostic Findings

Component diagnostics confirmed that attack/defense factors were driving xG expansion:

| Split | Candidate | Avg abs attack log | Avg abs defense log | Avg abs Elo log | Clamp rate | Threshold exceedances |
|---|---|---:|---:|---:|---:|---:|
| WC2018 tuning | Current log-linear | 0.1694 | 0.2062 | 0.0000 | 0.0% | 24 |
| WC2022 validation | Current log-linear | 0.2636 | 0.2129 | 0.0000 | 0.0% | 35 |
| WC2022 validation | Selected damped | 0.1714 | 0.0426 | 0.0000 | 0.0% | 2 |

The offline backtest path uses neutral 1500 Elo inputs for the attack/defense candidate comparison, so direct Elo contribution is zero in this phase. Strength-of-schedule remains part of the profile construction. The selected candidate therefore removes the extra Elo multiplier and dampens defense contribution sharply rather than duplicating team-strength information.

## Train and Validation Split

Candidate selection uses only WC2018.

| Role | Tournament | Fixtures |
|---|---|---:|
| Parameter tuning | World Cup 2018 | 64 |
| Validation holdout | World Cup 2022 | 64 |
| Secondary combined report | World Cup 2018 + 2022 | 128 |

WC2022 holdout metrics are not used to select the candidate. WC2026 remains excluded. No-look-ahead violations are 0.

## Candidate Grid

The recalibration CLI evaluates a bounded deterministic grid of 200 configurations across:

- current log-linear comparison;
- damped log-linear coefficients;
- residual-over-Elo variants;
- regularized attack/defense variants;
- calibrated blends;
- residual caps;
- optional coverage damping.

Only compact artifacts are committed:

- `docs/model-results/artifacts/attack-defense-recalibration-comparison.json`
- `docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json`

## Selected Candidate

The selected offline candidate is:

```text
attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0
```

Configuration:

| Parameter | Value |
|---|---:|
| Candidate family | `attack_defense_log_linear_damped` |
| Attack weight | 0.65 |
| Defense weight | 0.20 |
| Elo weight | 0.00 |
| Venue weight | 0.50 |
| Attack/defense blend weight | 1.00 |
| Residual cap | 0.20 |
| Coverage damping | false |

## WC2018 Tuning Metrics

| Metric | Baseline | Current log-linear | Selected damped |
|---|---:|---:|---:|
| Brier | 0.2160 | 0.2232 | 0.2124 |
| Log Loss | 1.0691 | 1.1273 | 1.0580 |
| Outcome accuracy | 40.6% | 43.8% | 43.8% |
| Home-goal MAE | 1.0078 | 1.0995 | 1.0031 |
| Away-goal MAE | 0.7734 | 0.8674 | 0.7636 |
| Total-goal MAE | 1.1875 | 1.3158 | 1.2062 |
| Exact score | 10.9% | 14.1% | 12.5% |
| Top-3 coverage | 34.4% | 37.5% | 35.9% |
| Top-5 coverage | 50.0% | 54.7% | 50.0% |
| Top-10 coverage | 79.7% | 76.6% | 78.1% |
| Unique xG pairs | 1 | 57 | 57 |
| Unique modal scorelines | 1 | 10 | 4 |
| Modal 1-1 frequency | 100.0% | 42.2% | 81.3% |

## WC2022 Holdout Metrics

| Metric | Baseline | Current log-linear | Selected damped |
|---|---:|---:|---:|
| Brier | 0.2180 | 0.2182 | 0.2063 |
| Log Loss | 1.0785 | 1.0973 | 1.0339 |
| Outcome accuracy | 45.3% | 43.8% | 48.4% |
| Home-goal MAE | 1.1406 | 1.2885 | 1.0916 |
| Away-goal MAE | 0.9063 | 1.1089 | 0.8882 |
| Total-goal MAE | 1.4688 | 1.5283 | 1.4704 |
| Exact score | 7.8% | 12.5% | 9.4% |
| Top-3 coverage | 23.4% | 34.4% | 26.6% |
| Top-5 coverage | 43.8% | 42.2% | 42.2% |
| Top-10 coverage | 73.4% | 48.4% | 71.9% |
| Expected calibration error | 0.0629 | 0.0939 | 0.0645 |
| Unique xG pairs | 1 | 64 | 64 |
| Unique modal scorelines | 1 | 10 | 3 |
| Modal 1-1 frequency | 100.0% | 35.9% | 70.3% |

Holdout deltas for the selected candidate versus baseline:

| Metric | Delta |
|---|---:|
| Brier | -0.0117 |
| Log Loss | -0.0446 |
| Home-goal MAE | -0.0491 |
| Away-goal MAE | -0.0181 |
| Total-goal MAE | +0.0017 |

The selected candidate keeps the total-goal MAE change inside the material-regression threshold while improving Brier, Log Loss, outcome accuracy, and per-team goal MAE on the validation holdout.

## Combined Metrics

| Metric | Baseline | Current log-linear | Selected damped |
|---|---:|---:|---:|
| Brier | 0.2170 | 0.2207 | 0.2093 |
| Log Loss | 1.0738 | 1.1123 | 1.0460 |
| Outcome accuracy | 43.0% | 43.8% | 46.1% |
| Home-goal MAE | 1.0742 | 1.1940 | 1.0473 |
| Away-goal MAE | 0.8398 | 0.9882 | 0.8259 |
| Total-goal MAE | 1.3281 | 1.4221 | 1.3383 |
| Exact score | 9.4% | 13.3% | 10.9% |
| Top-3 coverage | 28.9% | 35.9% | 31.3% |
| Top-5 coverage | 46.9% | 48.4% | 46.1% |
| Top-10 coverage | 76.6% | 62.5% | 75.0% |
| Unique xG pairs | 1 | 121 | 121 |
| Unique modal scorelines | 1 | 12 | 4 |
| Modal 1-1 frequency | 100.0% | 39.8% | 75.8% |

## Goal and Extreme Diagnostics

Selected candidate validation diagnostics:

| Metric | Value |
|---|---:|
| Avg predicted total goals | 2.6318 |
| Avg actual total goals | 2.6875 |
| xG below 0.5 | 0 |
| xG below 0.8 | 1 |
| xG above 1.5 | 33 |
| xG above 2.0 | 0 |
| xG above 2.5 | 0 |
| xG clamp rate | 0.0% |
| Predicted 3+ goal margins | 0 |
| Predicted 4+ total goals | 0 |
| Predicted 5+ total goals | 0 |
| Blowout-rate delta | -14.1 percentage points |

The selected candidate no longer inflates blowout projections and does not rely on xG clamping.

## Decision Gate

**Decision:** `promote_recalibrated_candidate`

The selected candidate passes the offline validation holdout gate:

- no look-ahead violations;
- fallback rate remains 20.3%, below the existing 50% combined threshold;
- Brier and Log Loss improve on WC2022;
- total-goal MAE does not materially regress;
- home-goal and away-goal MAE improve;
- xG clamp rate is 0;
- blowout frequency is not inflated;
- exact-score and top-N coverage do not materially regress;
- scoreline diversity improves over the Elo-only baseline;
- no team-specific logic is introduced.

## Production Compatibility

This phase does not promote the candidate to production. It only produces an offline candidate ready for a dedicated production-integration decision.

Unchanged:

- production Elo V2 constants;
- Elo-to-xG V2 formula and bounds;
- Poisson score matrix generation;
- StatsBomb rollout behavior and constants;
- scoreline presentation;
- snapshots and evaluations;
- persistence schema;
- standings and qualification;
- official tournament topology;
- public web routes and UI.

## Reproducibility

Run:

```bash
pnpm --filter @world-cup-2026-predictor/api goal-model:recalibrate
```

The command is read-only and writes only the compact recalibration artifacts listed above.

## Remaining Limitations

- The selected candidate is calibrated only on WC2018 and validated on WC2022.
- WC2018 remains partially covered because some teams still have no pre-2018 scored history.
- The offline attack/defense harness uses neutral Elo inputs for this candidate family; future work should evaluate whether richer pre-match Elo should be included without double-counting strength-of-schedule.
- The candidate should not be enabled in production until a separate phase defines runtime integration, provenance, monitoring, and rollback.

