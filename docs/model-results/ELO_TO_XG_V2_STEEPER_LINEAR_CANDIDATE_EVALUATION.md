# Elo-to-xG V2 Steeper Linear Candidate Evaluation

**Phase:** 12.11C
**Status:** Evaluation complete — 3/3 candidates eligible for review — no production formula changes

## Purpose

Phase 12.11C evaluates the first V2 candidate family against the V1 baseline established in Phase 12.11B. The candidate is a **steeper linear mapping**: the same structural form as V1 (linear adjustment from Elo gap, capped at a maximum), but with a larger slope and cap.

This phase does not change the production formula, presets, API responses, or UI.

---

## Hypothesis

The V1 holdout compression analysis showed meaningful under-prediction of stronger teams in non-trivial Elo-gap buckets. A steeper slope translates a given Elo gap into a larger predicted xG differential, reducing compression without introducing team-specific or non-linear rules.

---

## V1 Baseline Reference

Source: `docs/model-results/artifacts/elo-to-xg-v1-baseline-summary.json`

| Metric | V1 Value |
|---|---|
| Holdout Brier Score | 0.632191 |
| Holdout Log Loss | 1.047997 |
| Holdout Home Goal MAE | 1.135000 |
| Holdout Away Goal MAE | 0.860500 |
| Holdout Total Goal MAE | 1.441667 |
| Holdout Outcome Accuracy | 0.525 |

---

## Candidate Set

| Label | `adjustmentPer100` | `maxAdjustment` | Change vs V1 |
|---|---|---|---|
| `steeper-0.13` | 0.13 | 0.55 | +30% slope, +22% cap |
| `steeper-0.15` | 0.15 | 0.65 | +50% slope, +44% cap |
| `steeper-0.17` | 0.17 | 0.75 | +70% slope, +67% cap |

V1 reference: `adjustmentPer100=0.10`, `maxAdjustment=0.45`

All candidates share the same base structure:
- Base expected goals: **1.25** (unchanged)
- `xG = clamp(1.25 ± adj, 0.2, 4.0)` where `adj = roundToTwo(clamp(eloDiff/100 × adjustmentPer100, ±maxAdjustment))`
- Symmetry preserved: equal-Elo teams always get xG = 1.25 / 1.25
- No team-specific rules, no non-linear terms

---

## Holdout Evaluation Results

| Candidate | Brier Score | Δ Brier | Log Loss | Δ Log Loss | Home MAE Δ | Away MAE Δ | Total MAE Δ |
|---|---|---|---|---|---|---|---|
| V1 baseline | 0.632191 | — | 1.047997 | — | — | — | — |
| `steeper-0.13` | 0.627499 | **−0.004692** | 1.041714 | **−0.006282** | −0.0041 | −0.0054 | 0.0000 |
| `steeper-0.15` | 0.624949 | **−0.007242** | 1.038349 | **−0.009648** | −0.0058 | −0.0088 | 0.0000 |
| `steeper-0.17` | 0.622651 | **−0.009540** | 1.035318 | **−0.012679** | −0.0079 | −0.0124 | 0.0000 |

**Delta convention:** `candidateMetric − baselineMetric`. Negative = improvement for Brier, Log Loss, and MAE.

All three candidates improve both Brier Score and Log Loss on the holdout split. Goal MAE also improves or holds flat across all candidates and all goal-direction metrics — no material worsening detected.

---

## Per-Split Brier Score Summary

| Candidate | Training | Validation | Holdout | Combined Non-2026 |
|---|---|---|---|---|
| V1 baseline | 0.645162 | 0.644100 | 0.632191 | 0.639900 |
| `steeper-0.13` | 0.6431 | 0.6430 | 0.6275 | 0.6380 |
| `steeper-0.15` | 0.6419 | 0.6424 | 0.6249 | 0.6369 |
| `steeper-0.17` | 0.6410 | 0.6420 | 0.6227 | 0.6361 |

Improvement is consistent across training and validation splits as well as holdout, suggesting the steeper slope generalizes rather than overfitting.

---

## Acceptance Gate Results

| Candidate | Verdict | Brier Improves | Log Loss Improves | MAE Materially Worsened |
|---|---|---|---|---|
| `steeper-0.13` | **eligible_for_review** | Yes | Yes | No |
| `steeper-0.15` | **eligible_for_review** | Yes | Yes | No |
| `steeper-0.17` | **eligible_for_review** | Yes | Yes | No |

All three candidates pass the Phase 12.11A acceptance gate:
- Holdout Brier Score improved over V1
- Holdout Log Loss improved over V1
- No goal MAE metric increased by more than the 0.05-goal threshold

---

## Prediction Path

For every evaluation record:

```
pre-match home Elo, pre-match away Elo
  → v2SteepLinearXg(params) → homeXg, awayXg
  → generateScoreMatrix(maxGoals=7, normalizeMatrix=true)
  → aggregateOutcomeProbabilities(scoreMatrix)
  → homeWinProbability, drawProbability, awayWinProbability
  → multiclass Brier Score, Log Loss, outcome accuracy
  → home/away MAE vs actual goals
```

This is the same real Poisson path as the V1 baseline runner — only the xG generation step differs.

---

## Invariants Verified

- Symmetry: equal-Elo inputs produce `homeXg = awayXg = 1.25` for all candidates
- Bounds: all xG values remain in `[0.2, 4.0]`
- No NaN or Infinity in any split or delta metric
- WC2026 holdout excluded from all candidate evaluation records
- V1 production constants (`ELO_TO_XG_ADJUSTMENT_PER_100`, `ELO_TO_XG_MAX_ELO_ADJUSTMENT`) are unchanged
- Report is deterministic — repeated runs with the same fixture files produce byte-identical artifact

---

## Artifact

```
docs/model-results/artifacts/elo-to-xg-v2-steeper-linear-candidate-summary.json
```

Contains:
- V1 reference values loaded from `elo-to-xg-v1-baseline-summary.json`
- Candidate parameter set
- Per-candidate, per-split metrics
- Per-candidate, per-split deltas
- Acceptance gate verdicts and reasons
- Summary counts (eligible / rejected / inconclusive)
- Limitations

To regenerate:

```bash
pnpm --filter @world-cup-2026-predictor/model calibration:v2-candidate
```

---

## Limitations

1. Candidate evaluation uses the same calibration dataset as V1 baseline. No new data was introduced.
2. Holdout split contains WC2022 + international 2022+ matches only. Sample size may limit statistical power.
3. No statistical significance testing is performed. Metrics are descriptive.
4. The acceptance gate uses fixed thresholds (MAE worsening > 0.05 goals). These are heuristic, not theoretically derived.
5. WC2026 holdout is always excluded from candidate evaluation.
6. The candidate does not modify the production formula. It is isolated in `elo-to-xg-v2-candidate.ts` only.

---

## Recommendation for Next Phase

All three candidates are eligible for review. `steeper-0.17` achieves the largest improvement (Δ Brier = −0.0095, Δ Log Loss = −0.0127) without worsening any goal MAE metric. `steeper-0.15` is a reasonable middle point with meaningful improvement and more conservative slope increase.

Phase 12.11D should select one candidate for promotion consideration and evaluate outer-bucket compression gain on the holdout split before any production formula change.

---

## Files

| File | Role |
|---|---|
| `packages/model/src/elo-to-xg-v2-candidate.ts` | Isolated steeper-linear candidate function and evaluation runner |
| `packages/model/tests/elo-to-xg-v2-candidate.test.ts` | 35 focused unit tests |
| `packages/model/tests/elo-to-xg-v2-candidate-artifact.test.ts` | Integration test + artifact writer using real fixtures |
| `docs/model-results/artifacts/elo-to-xg-v2-steeper-linear-candidate-summary.json` | Generated candidate evaluation artifact |
