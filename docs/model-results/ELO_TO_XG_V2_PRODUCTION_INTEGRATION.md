# Elo-to-xG V2 Production Integration

**Phase:** 12.11E  
**Status:** Complete  
**Decision artifact:** `docs/model-results/artifacts/elo-to-xg-v2-production-decision.json`  
**Verification artifact:** `docs/model-results/artifacts/elo-to-xg-v2-production-verification.json`

---

## Summary

Phase 12.11E promotes the `steeper-0.15` candidate (approved in Phase 12.11D) to the production balanced preset. The V2 formula uses `adjustmentPer100=0.15` and `maxAdjustment=0.65`, replacing V1's `0.10/0.45`.

---

## Formula Changes

| Parameter | V1 (prior) | V2 (current) |
|---|---|---|
| `adjustmentPer100` (balanced) | 0.10 | 0.15 |
| `maxAdjustment` (balanced) | 0.45 | 0.65 |
| `adjustmentPer100` (aggressive) | 0.14 | 0.17 |
| `maxAdjustment` (aggressive) | 0.65 | 0.75 |
| `adjustmentPer100` (conservative) | 0.07 | 0.07 (unchanged) |
| `maxAdjustment` (conservative) | 0.30 | 0.30 (unchanged) |

The aggressive preset was updated from 0.14/0.65 to 0.17/0.75 to preserve the strict ordering: `conservative < balanced < aggressive`.

---

## Holdout Performance (n=120)

| Metric | V1 | V2 | Delta |
|---|---|---|---|
| Brier Score | 0.6322 | 0.6249 | −0.0072 |
| Log Loss | 1.0480 | 1.0383 | −0.0097 |

Both metrics improve. The conservative-preference tie-breaking threshold (0.003 Brier) selected steeper-0.15 over steeper-0.17, which had a 0.0022 Brier advantage — within the threshold.

---

## xG Spot Checks (V2 balanced)

| Elo Diff | Home xG | Away xG |
|---|---|---|
| 0 | 1.25 | 1.25 |
| +25 | 1.29 | 1.21 |
| +75 | 1.36 | 1.14 |
| +150 | 1.47 | 1.03 |
| +300 | 1.70 | 0.80 |
| +500 | 1.90 | 0.60 (clamped) |
| −75 | 1.14 | 1.36 |
| −150 | 1.03 | 1.47 |
| −300 | 0.80 | 1.70 |

---

## Code Changes

### `packages/model/src/elo-to-xg.ts`
- Added `ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100 = 0.1` and `ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT = 0.45` as named rollback constants.
- Added `ELO_TO_XG_V2_BALANCED_ADJUSTMENT_PER_100 = 0.15` and `ELO_TO_XG_V2_BALANCED_MAX_ADJUSTMENT = 0.65`.
- `ELO_TO_XG_ADJUSTMENT_PER_100` and `ELO_TO_XG_MAX_ELO_ADJUSTMENT` now alias V2 constants.
- Added `ELO_TO_XG_FORMULA_VERSION: EloToXgFormulaVersion = "v2"`.
- `eloToExpectedGoals` result now includes `formulaVersion`, `adjustmentPer100`, `maxAdjustment`, `v1RollbackAvailable`.

### `packages/model/src/types.ts`
- Added `EloToXgFormulaVersion = "v1" | "v2"`.
- Added `formulaVersion`, `adjustmentPer100`, `maxAdjustment`, `v1RollbackAvailable` to `EloToExpectedGoalsResult`.

### `packages/api/src/schemas.ts`
- Added four new fields to `expectedGoals` in `PredictMatchFromLiveEloSuccessResponse`.

### `packages/api/src/routes.ts`
- Passes the four new fields through from `xgResult` to the `expectedGoals` response object.

---

## Rollback

To revert to V1:
1. In `elo-to-xg.ts`, set `ELO_TO_XG_ADJUSTMENT_PER_100 = ELO_TO_XG_V1_BALANCED_ADJUSTMENT_PER_100`.
2. Set `ELO_TO_XG_MAX_ELO_ADJUSTMENT = ELO_TO_XG_V1_BALANCED_MAX_ADJUSTMENT`.
3. Set `ELO_TO_XG_FORMULA_VERSION = "v1"`.
4. Restore aggressive preset to 0.14/0.65.
5. Update regression snapshot tests to V1 xG values.

---

## Limitations

- Calibration uses a deterministic Elo-to-xG mapping, not a learned goals model.
- Holdout n=120 is small for robust conclusions.
- WC2026 holdout was excluded from all evaluation and remains reserved.
- Outer bucket compression and team-specific effects were not formally evaluated.
