# Elo-to-xG V1 Baseline Experiment

**Phase:** 12.11B
**Status:** Baseline complete — no production formula changes

## Purpose

Phase 12.11B runs the V1 Elo-to-xG baseline experiment over the calibration dataset built in Phase 12.11A. It produces a structured, reproducible metric report revealing where the current formula performs well and where it may be compressed in mismatched fixtures.

This phase does not change the production formula, presets, API responses, or UI.

---

## Datasets Loaded

| Source | Dataset ID | Matches | Split |
|---|---|---|---|
| World Cup 2010 | `world-cup-2010-results` | 64 | training |
| World Cup 2014 | `world-cup-2014-results` | 64 | training |
| World Cup 2018 | `world-cup-2018-results` | 64 | validation |
| World Cup 2022 | `world-cup-2022-results` | 64 | holdout |
| Expanded International | `international-matches-expanded-v1` | varies | training/validation/holdout |
| WC2026 completed | `wc2026` (sentinel) | optional | wc2026_holdout only |

All data is loaded from existing repository fixture files. No external data is downloaded.

---

## Production Prediction Path

For every calibration record:

```
pre-match home Elo, pre-match away Elo
  → eloToExpectedGoals(preset = balanced)
  → homeExpectedGoals, awayExpectedGoals
  → generateScoreMatrix(maxGoals = 7, normalizeMatrix = true)
  → aggregateOutcomeProbabilities(scoreMatrix)
  → homeWinProbability, drawProbability, awayWinProbability
  → multiclass Brier Score, Log Loss, outcome accuracy
  → home/away MAE and RMSE vs actual goals
```

This is the **real production Poisson path** — not an approximation. It reuses `eloToExpectedGoals`, `generateScoreMatrix`, and `aggregateOutcomeProbabilities` from the production model package without modification.

### V1 Production Constants

| Constant | Value |
|---|---|
| Base expected goals | 1.25 |
| Adjustment per 100 Elo | 0.1 |
| Max Elo adjustment | ±0.45 |
| Preset | balanced |
| Poisson maxGoals | 7 |

---

## Splits Evaluated

| Split | Policy | Purpose |
|---|---|---|
| `training` | WC2010 + WC2014 + international pre-2019 | Baseline characterization on training data |
| `validation` | WC2018 + international 2019–2021 | Generalization check |
| `holdout` | WC2022 + international 2022+ | Final benchmark reference |
| `wc2026_holdout` | All completed WC2026 matches (when supplied) | Live tournament holdout — never used for fitting |
| `combined_non_2026` | All non-WC2026 records | Summary across training + validation + holdout |

---

## Metric Conventions

### Goal Error Metrics

| Metric | Definition |
|---|---|
| MAE home goals | `mean(|predicted_home_xg - actual_home_goals|)` |
| MAE away goals | `mean(|predicted_away_xg - actual_away_goals|)` |
| MAE total goals | `mean(|predicted_total_xg - actual_total_goals|)` |
| RMSE home goals | `sqrt(mean(|predicted - actual|^2))` per home |
| RMSE away goals | Same per away |
| RMSE total goals | Same for totals |

### Outcome Metrics

| Metric | Definition |
|---|---|
| Brier Score | Multiclass: `(p_home - y_home)^2 + (p_draw - y_draw)^2 + (p_away - y_away)^2` |
| Log Loss | `-log(p_actual_outcome)`, epsilon-clamped to avoid `-inf` |
| Outcome accuracy | Fraction of records where predicted outcome = actual outcome |

All metrics return `null` (not `NaN`) for empty splits.

---

## Bucket Compression Indicator

The `compression_gap` field in each Elo-difference bucket is defined as:

```
compression_gap = actualFavoriteWinFrequency - predictedFavoriteWinProbability
```

**Sign convention:**
- **Positive** → the model under-predicts the stronger team's win probability (compression — the actual win rate is higher than the model predicts)
- **Negative** → the model over-predicts the stronger team's win probability
- **Zero** → model is well-calibrated for this bucket

The "favorite" is the team with the higher pre-match Elo. For equal-Elo matchups, the home team is used as the nominal favorite.

This indicator does not claim statistical significance. Outer buckets (`<= -300` and `>= 300`) typically have small sample counts.

---

## Artifact Generation

The experiment runner writes a structured JSON artifact to:

```
docs/model-results/artifacts/elo-to-xg-v1-baseline-summary.json
```

The artifact contains:
- formula version and production constants
- dataset counts and sources
- split-by-split metrics
- 7-bucket compression analysis
- per-competition breakdown
- neutral-site split
- per-source breakdown
- limitations and warnings

The artifact is **deterministic** — repeated runs with the same fixture files produce byte-identical output. It does not include clock-based timestamps or runtime metadata.

---

## Reproducibility

To regenerate the artifact:

```bash
pnpm --filter @world-cup-2026-predictor/model calibration:baseline
```

Or as part of the full test suite:

```bash
pnpm --filter @world-cup-2026-predictor/model test
```

The runner exits non-zero only for genuine invariant failures (NaN in metrics, WC2026 isolation breach, xG outside production bounds), not for expected data-quality warnings such as fallback-rating usage.

---

## Limitations

1. **Curated sample only.** The calibration dataset covers selected competitions, not complete global international match history. Per-competition and per-bucket counts may be small.
2. **Initial rating leakage.** Teams appearing for the first time start at the fallback rating (1500). Their first few matches use imprecise pre-match Elo. These are flagged in `data_quality_warnings` per record.
3. **WC2026 holdout is empty** until completed WC2026 matches are explicitly supplied via `wc2026CompletedMatches`. The `wc2026_holdout` split will show 0 records in the artifact until then.
4. **Bucket sample sizes.** The outer Elo-gap buckets (`<= -300`, `>= 300`) have small sample counts in the WC + expanded international dataset. Compression estimates from these buckets are descriptive only.
5. **Poisson with maxGoals=7.** The Poisson score matrix is truncated at 7 goals per team. This is the production default. Extremely high-scoring matches may have slightly underweighted tail probabilities.
6. **No V2 formula selected.** Phase 12.11B provides baseline evidence only. A V2 candidate requires validation against these metrics on the holdout split before any production change.
7. **No statistical significance testing.** Sample sizes are too small for formal hypothesis testing. Treat metrics as descriptive baselines.

---

## Why No V2 Candidate is Selected Yet

Phase 12.11B produces the baseline evidence needed to evaluate V2 candidates fairly. A candidate is only eligible to advance (per the Phase 12.11A acceptance criteria) when it:

- Improves holdout Brier Score **or** Log Loss vs V1
- Does not materially worsen goal MAE
- Improves or preserves outer-bucket calibration
- Remains bounded, symmetric, and deterministic

Without the V1 baseline established in this phase, any candidate comparison would lack a reference point. Phase 12.11C defines the next step.

---

## Files

| File | Role |
|---|---|
| `packages/model/src/elo-to-xg-calibration-runner.ts` | Experiment runner using real Poisson path |
| `packages/model/tests/elo-to-xg-calibration-runner.test.ts` | 30 focused unit tests |
| `packages/model/tests/elo-to-xg-calibration-artifact.test.ts` | Integration test + artifact writer using real fixtures |
| `docs/model-results/artifacts/elo-to-xg-v1-baseline-summary.json` | Generated baseline artifact |
| `packages/model/package.json` | Added `calibration:baseline` script |

---

## Next Phase — 12.11C

Phase 12.11C will implement and evaluate the first V2 candidate against the baseline established here. Candidate selection should start with the **steeper linear mapping** (candidate family 2 from Phase 12.11A), as it is the simplest change with the clearest hypothesis for addressing Elo-gap compression.

Phase 12.11C acceptance gate: the candidate must improve holdout Brier Score or Log Loss over the values recorded in `elo-to-xg-v1-baseline-summary.json`.
