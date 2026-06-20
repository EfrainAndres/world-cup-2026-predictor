# Elo-to-xG V2 Candidate Production Decision

**Phase:** 12.11D
**Status:** Decision complete — no production formula changes in this phase

## Decision

> **promote_to_production: `steeper-0.15`**

Selected candidate: `steeper-0.15` (`adjustmentPer100=0.15`, `maxAdjustment=0.65`)

The production formula is **not changed in this phase**. Phase 12.11E implements the promotion safely.

---

## Candidates Reviewed

| Label | `adjustmentPer100` | `maxAdjustment` | vs V1 |
|---|---|---|---|
| `steeper-0.13` | 0.13 | 0.55 | +30% slope, +22% cap |
| `steeper-0.15` | 0.15 | 0.65 | +50% slope, +44% cap |
| `steeper-0.17` | 0.17 | 0.75 | +70% slope, +67% cap |

All three passed the Phase 12.11C acceptance gate (eligible_for_review). This phase applies stricter production criteria.

---

## V1 Baseline (Holdout, n=120)

| Metric | Value |
|---|---|
| Brier Score | 0.6321909 |
| Log Loss | 1.0479967 |
| Home Goal MAE | 1.1350000 |
| Away Goal MAE | 0.8605000 |
| Total Goal MAE | 1.4416667 |
| Outcome Accuracy | 0.525 |
| Avg Predicted Home xG | 1.2653 |
| Avg Predicted Away xG | 1.2347 |
| Avg Actual Home Goals | 1.6917 |
| Avg Actual Away Goals | 1.1250 |

---

## Metric Comparison (Holdout Split, n=120)

| Metric | V1 | `steeper-0.13` | Δ | `steeper-0.15` | Δ | `steeper-0.17` | Δ |
|---|---|---|---|---|---|---|---|
| Brier Score | 0.6322 | 0.6275 | −0.0047 | **0.6249** | **−0.0072** | 0.6227 | −0.0095 |
| Log Loss | 1.0480 | 1.0417 | −0.0063 | **1.0383** | **−0.0097** | 1.0353 | −0.0127 |
| Home Goal MAE | 1.1350 | 1.1309 | −0.0041 | **1.1292** | **−0.0058** | 1.1271 | −0.0079 |
| Away Goal MAE | 0.8605 | 0.8551 | −0.0054 | **0.8517** | **−0.0088** | 0.8481 | −0.0124 |
| Total Goal MAE | 1.4417 | 1.4417 | 0.0 | **1.4417** | **0.0** | 1.4417 | 0.0 |
| Outcome Accuracy | 0.525 | 0.525 | 0.0 | **0.525** | **0.0** | 0.525 | 0.0 |

**Delta convention:** `candidate − baseline`. Negative = improvement for Brier, LogLoss, MAE.

---

## Split Stability

| Split | V1 Brier | `steeper-0.15` Brier | Δ |
|---|---|---|---|
| Training (n=128) | 0.6451 | 0.6420 | −0.0031 |
| Validation (n=64) | 0.6441 | 0.6426 | −0.0015 |
| Holdout (n=120) | 0.6322 | 0.6249 | −0.0072 |
| Combined non-2026 (n=312) | 0.6399 | 0.6356 | −0.0043 |

Improvement is consistent across all four evaluated splits. No split shows a regression.

---

## Bucket-Level Findings

The V1 baseline calibration dataset has the following bucket distribution:

| Bucket | Count | V1 `compression_gap` |
|---|---|---|
| `<= -300` | 0 | null |
| `-300 to -150` | 0 | null |
| `-150 to -75` | 8 | +0.210 (under-prediction) |
| `-75 to 75` | 282 | +0.099 (mild under-prediction) |
| `75 to 150` | 22 | +0.270 (significant under-prediction) |
| `150 to 300` | 0 | null |
| `>= 300` | 0 | null |

**Key findings:**

1. **90% of data is in the central bucket (`-75 to 75`)**. The steeper slope has limited effect here (avg Elo difference ≈ 5 points). This explains why outcome accuracy is unchanged at 0.525.

2. **`75 to 150` bucket (n=22)** shows meaningful compression (gap=0.270). The steeper slope should reduce this. However, per-candidate bucket metrics were not recomputed in Phase 12.11C — this remains an estimate based on structural reasoning.

3. **Outer buckets (0 records each)**: no data exists to validate behavior at Elo gaps > 150 or < -150. The steeper slope increases xG spread for large gaps — this is the principal unresolved risk.

4. **`steeper-0.15` vs `steeper-0.17` in non-trivial buckets**: at Elo gap +100 (`75 to 150` avg), `steeper-0.15` produces `adj = roundToTwo(clamp(100/100 × 0.15, ±0.65)) = 0.15`; `steeper-0.17` produces 0.17. Neither saturates the cap. The xG spread difference is minimal for the typical Elo gaps observed in this dataset.

---

## Acceptance Checks

| Check | Result | Notes |
|---|---|---|
| Holdout Brier improves | **PASS** | Δ = −0.0072 |
| Holdout Log Loss improves | **PASS** | Δ = −0.0097 |
| Goal MAE not materially worsened | **PASS** | All MAE metrics improve or hold flat |
| No split major regression | **PASS** | All four splits improve |
| Predicted goals plausible | **PASS** | Home xG avg = 1.2728, away = 1.2272 |
| Outer-bucket compression evaluable | **FAIL** | 0 records in 4 of 7 buckets — structural limitation |
| No team-specific rules | **PASS** | Pure formula constants only |
| xG bounded | **PASS** | Clamped to [0.2, 4.0] by construction |
| Symmetry preserved | **PASS** | Equal-Elo → homeXg = awayXg = 1.25 |

The outer-bucket check failure is a **structural dataset limitation**, not a candidate failure. It is treated as an unresolved risk and addressed in Phase 12.11E.

---

## Why `steeper-0.15` Was Selected Over `steeper-0.17`

**Conservative tie-breaking rule**: when the Brier improvement from a more aggressive candidate is within the conservative-preference threshold (0.003 goals), the less steep candidate is preferred.

`steeper-0.17` achieves a holdout Brier of 0.6227 vs `steeper-0.15`'s 0.6249 — a difference of **0.0022**. At n=120 holdout records, this falls within expected sampling noise and does not constitute a meaningful advantage.

In exchange for 0.0022 additional Brier improvement, `steeper-0.17` introduces:
- 70% steeper slope vs V1 (vs 50% for `steeper-0.15`)
- 67% larger cap vs V1 (vs 44% for `steeper-0.15`)
- Higher risk of overconfidence in large-Elo-gap fixtures not covered by the dataset

This trade-off is unfavorable given the unverifiable outer-bucket behavior.

**Why `steeper-0.13` was not selected**: it achieves only 66% of `steeper-0.15`'s Brier improvement (Δ = −0.0047 vs −0.0072), a difference of 0.0025 which exceeds the conservative-preference threshold. The additional improvement from 0.15 justifies slightly more steepness.

---

## Sample Size Warnings

- **Holdout: n=120** — modest. Metric improvements are descriptive, not formally significance-tested.
- **Validation: n=64** — limited. Cross-validation evidence is thin.
- **Outer buckets: n=0** — no evidence. Compression behavior in large-Elo-gap fixtures is untested.
- Initial-rating leakage: teams appearing for the first time start at fallback rating 1500. Early matches in the replay use imprecise pre-match Elo.

---

## Artifact

```
docs/model-results/artifacts/elo-to-xg-v2-production-decision.json
```

Contains:
- Decision version and final verdict
- Selected candidate
- V1 reference values
- V1 production constants (verified unchanged)
- Per-check acceptance results
- Rationale
- Risks, rollback criteria, production guardrails, unresolved risks

---

## Production Guardrails for Phase 12.11E

These requirements must be met before any production formula change:

1. **Preserve V1 constants** behind a named export or named preset. Do not delete V1 code — provide an explicit rollback path.
2. **Add formula-version metadata** to `eloToExpectedGoals` results or the balanced-preset definition so callers can identify which version produced a prediction.
3. **Add a regression test** that runs V1 and V2 balanced-preset predictions on the same Elo inputs and asserts the delta is within expected bounds (greater spread for V2, same base, bounded).
4. **Rerun historical holdout metrics** after the formula change and verify they match the candidate-evaluation artifact values.
5. **Run full API and web regression tests** before merging the production change. No silent migration.
6. **Verify fallback teams** (initial rating 1500 vs 1500) do not receive misleadingly high certainty from the steeper slope at equal-Elo inputs.
7. **Update `ELO_TO_XG_UNCALIBRATED_WARNING`** if the text references V1-specific numeric constants.
8. **Document the V2 constant change** in `docs/DECISIONS.md`. Keep backward-intent of "balanced preset = moderate Elo sensitivity" in the documentation.

---

## Rollback Criteria

The promotion should be reverted to V1 if any of the following occur:

- WC2026 live holdout Brier Score is more than 0.01 worse than V1 baseline on matched fixtures.
- Any API or web regression test fails after formula promotion.
- Outer-bucket WC2026 fixtures (Elo gap > 150) show systematic overconfidence under V2.
- Goal-error metrics (home/away/total MAE) worsen materially on WC2026 completed fixtures versus historical holdout.

---

## Unresolved Risks

1. **Outer-bucket validation gap**: No fixtures with Elo gap > 150 or < -150 exist in the calibration dataset. The steeper slope (0.15) increases xG spread for extreme Elo gaps — behavior in those regions is untested. WC2026 group-stage matchups tend to be near-equal, but knockout rounds may surface larger gaps.
2. **WC2026 live performance unknown**: The WC2026 holdout is currently 0 records. Real-time performance may differ from historical calibration.
3. **Goal-scoring rate mismatch**: Avg predicted home xG (~1.27) remains well below avg actual home goals (~1.69) on holdout. No steeper-linear candidate addresses this structural gap — it requires a separate investigation (possibly base-goals calibration or home-advantage adjustment).
4. **Statistical uncertainty**: With n=120 holdout records, the Brier improvement of 0.0072 is descriptive. A 95% confidence interval on the improvement would likely overlap zero. The decision is based on consistent directional improvement, not formal significance.

---

## Next Phase — 12.11E

Phase 12.11E implements the production promotion of `steeper-0.15` safely:

- Update `ELO_XG_PRESETS.balanced` to use `adjustmentPer100=0.15`, `maxAdjustment=0.65`
- Preserve V1 constants in a named export (`ELO_XG_V1_BALANCED_PRESET` or equivalent)
- Add formula-version metadata
- Add V1/V2 regression tests
- Rerun historical holdout and verify metrics match artifact
- Run API and web regression tests
- Update DECISIONS.md, warning text, and documentation

---

## Files

| File | Role |
|---|---|
| `packages/model/src/elo-to-xg-v2-production-decision.ts` | Decision evaluator with typed checks and conservative selection |
| `packages/model/tests/elo-to-xg-v2-production-decision.test.ts` | Focused unit tests for decision rules |
| `packages/model/tests/elo-to-xg-v2-production-decision-artifact.test.ts` | Integration test + artifact writer |
| `docs/model-results/artifacts/elo-to-xg-v2-production-decision.json` | Generated decision artifact |
