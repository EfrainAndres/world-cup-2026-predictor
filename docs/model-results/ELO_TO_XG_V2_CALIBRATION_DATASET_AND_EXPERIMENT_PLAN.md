# Elo-to-xG V2 — Calibration Dataset & Experiment Plan

**Phase:** 12.11A
**Status:** Foundation implemented — no production formula changes

## Purpose

Phase 12.11A creates the reproducible calibration foundation needed before any Elo-to-xG formula change can be evaluated responsibly. Known issues with the V1 formula motivate this work:

- Elo differences at extreme gaps (>300 points) are clamped to ±0.45 goals, compressing predicted margins for mismatched fixtures.
- The base rate of 1.25 goals per team was set without calibration against observed international goal distributions.
- Fallback rating 1500 can make new or poorly-covered teams appear artificially competitive.

This phase does not change the production formula. It creates the evidence-gathering infrastructure.

---

## Included Sources

| Source | Dataset ID | Scope |
|---|---|---|
| Historical World Cup 2010 | `world-cup-2010-results` | All 64 group + knockout fixtures |
| Historical World Cup 2014 | `world-cup-2014-results` | All 64 group + knockout fixtures |
| Historical World Cup 2018 | `world-cup-2018-results` | All 64 group + knockout fixtures |
| Historical World Cup 2022 | `world-cup-2022-results` | All 64 group + knockout fixtures |
| Expanded International Sample | `international-matches-expanded-v1` | Curated WC22, Copa 2024, Euro 2024, WCQ, and Friendly matches |
| World Cup 2026 Completed | `wc2026` (holdout sentinel) | Completed WC2026 group + knockout matches when available locally |

All sources are existing curated repository fixtures. No external data is downloaded or redistributed.

---

## Exclusions

The following are excluded from calibration records:

- Matches with missing, empty, or unparseable dates
- Matches with missing or empty team names
- Matches with non-integer or negative scores
- Matches where the declared result contradicts the scores (e.g. `home_win` but home score < away score)
- Matches with missing or invalid match IDs
- Duplicate match IDs (only the first occurrence by chronological sort is kept; the rest are rejected)
- Synthetic or placeholder fixtures (if added to future fixture files for testing purposes)

Rejections are surfaced in `rejection_reasons` and counted in `rejected_count`. No data is silently invented or imputed.

---

## No Look-Ahead Rule

Pre-match Elo is computed by replaying all eligible matches in strict chronological order, sorted by `match_date` then `match_id`. The Elo ratings captured for each calibration record are the ratings at the start of that match — before the match result is applied.

This means:

- A team that played its first match in 2010 has its initial rating (1500) as its pre-match rating for that first match.
- Ratings for subsequent matches reflect only prior results.
- WC2026 completed matches, if supplied, are sorted into the same chronological sequence and processed in order.

No future result is ever used to compute a past match's pre-match rating.

---

## Chronological Splits

Splits are deterministic and time-based. No random assignment.

| Split | Policy | Rationale |
|---|---|---|
| `training` | WC2010, WC2014; international matches before 2019 | Older data for formula fitting |
| `validation` | WC2018; international 2019–2021 | Held back during training for hyperparameter selection |
| `holdout` | WC2022; international 2022+ | Final evaluation benchmark |
| `wc2026_holdout` | All WC2026 completed matches | Isolated holdout — never used for fitting or validation |

**Policy:** WC2026 matches are always `wc2026_holdout`, regardless of date. They must not be used as both training and holdout in the same experiment.

---

## Elo-Difference Bucket Design

Fixed deterministic boundaries chosen to expose compression at large gaps:

| Bucket | Range |
|---|---|
| `<= -300` | Away team 300+ Elo points stronger |
| `-300 to -150` | Away team moderately stronger |
| `-150 to -75` | Away team slightly stronger |
| `-75 to 75` | Near-equal matchup |
| `75 to 150` | Home team slightly stronger |
| `150 to 300` | Home team moderately stronger |
| `>= 300` | Home team 300+ Elo points stronger |

The middle bucket (`-75 to 75`) covers the majority of international matches. The outer two buckets (`<= -300`, `>= 300`) are where V1 clamping effects are most visible.

---

## Baseline Metric Coverage

`evaluateEloToXgBaseline()` reports:

| Category | Metrics |
|---|---|
| Goal prediction | Mean Absolute Error (home, away, total); RMSE (home, away, total) |
| Outcome prediction | Brier Score (multiclass); Log Loss; outcome accuracy |
| Distribution | Average predicted home/away xG; average actual home/away goals |
| Elo-gap buckets | All above metrics per bucket, plus avg Elo difference and sample count |
| By competition | MAE, Brier, Log Loss per competition |
| By neutral site | MAE, Brier per neutral/non-neutral split |

The baseline uses the V1 production formula directly (`eloToExpectedGoals` from `packages/model/src/elo-to-xg.ts`). Outcome probability approximation uses an Elo win-expectancy formula with a calibrated draw probability. This is intentionally a simple, transparent baseline — it is not the Poisson model.

---

## Candidate Model Families for V2

No candidate is selected in this phase. The following families are defined for later experimentation.

### 1. Current linear capped mapping (V1 baseline)

**Hypothesis:** Transparent, easily explainable, already deployed.
**Parameters:** `baseGoals = 1.25`, `adjustmentPer100 = 0.1`, `maxAdjustment = 0.45`.
**Expected benefit:** Existing behavior.
**Overfitting risk:** Low — no free parameters tuned to specific matches.
**Rejection criteria:** If V2 candidates consistently improve holdout metrics, V1 becomes the reference only.

### 2. Steeper linear mapping

**Hypothesis:** A higher `adjustmentPer100` would spread xG more in mismatched games without requiring piecewise complexity.
**Parameters:** `adjustmentPer100` in `[0.10, 0.20]`; `maxAdjustment` in `[0.45, 0.80]`.
**Expected benefit:** Better calibration in outer Elo-gap buckets.
**Overfitting risk:** Moderate — wider range risks inflating predicted margins for small outlier samples.
**Evaluation metrics:** MAE, RMSE, Brier Score, outer-bucket accuracy.
**Rejection criteria:** Worsens middle-bucket calibration; produces xG > 3.0 for common matchups.

### 3. Piecewise linear mapping

**Hypothesis:** A shallower slope for near-equal matchups and a steeper slope for large gaps would match observed goal distributions better.
**Parameters:** Breakpoint location (e.g. ±150 Elo), slope per segment.
**Expected benefit:** Separate calibration for near-equal and mismatched fixtures.
**Overfitting risk:** Higher — multiple breakpoints can overfit to historical bucket distributions.
**Evaluation metrics:** Per-bucket MAE, overall Brier Score.
**Rejection criteria:** Requires bucket-specific exceptions; unstable across validation/holdout splits.

### 4. Logistic or sigmoid-based mapping

**Hypothesis:** A sigmoid saturates naturally at large differences without a hard cap, matching human intuition that 500 Elo points does not produce unbounded xG.
**Parameters:** Sigmoid scale, offset, and maximum output.
**Expected benefit:** Smooth capping behavior; no discontinuity at the current ±0.45 boundary.
**Overfitting risk:** Moderate — three-parameter function, but analytically bounded.
**Evaluation metrics:** MAE at outer buckets, RMSE, Brier.
**Rejection criteria:** Less interpretable than linear; no measurable improvement over piecewise linear.

### 5. Separate total-goals and goal-share mapping

**Hypothesis:** Model total expected goals independently from the goal share between teams. Elo difference mainly determines share; match context determines total.
**Parameters:** `totalGoalsBase` (tunable), `goalShareSlope` (Elo-based), `totalGoalsEloFactor` (small).
**Expected benefit:** Decouples scoring rate from Elo asymmetry — may improve total-goal MAE independently.
**Overfitting risk:** Higher — more parameters; correlation between total goals and Elo may be low.
**Evaluation metrics:** Total-goal MAE and RMSE; Brier Score (outcome still depends on share).
**Rejection criteria:** No improvement in total-goal MAE; adds complexity without interpretability gain.

### 6. Optional attack/defense contribution

**Hypothesis:** Attack and defense scores (already computed in the live Elo pipeline) may add signal beyond Elo difference alone.
**Parameters:** `adWeight` (existing default `0.1`), max adjustment (existing `±0.2`).
**Expected benefit:** Small additional discrimination for teams with extreme attack or defense profiles.
**Overfitting risk:** High — attack/defense scores are derived from the same historical goals used in the response variable.
**Evaluation metrics:** Holdout MAE vs V1 without attack/defense.
**Rejection criteria:** No holdout improvement; circular dependency risk; team-specific scores not available for all 48 WC2026 teams.

### 7. Neutral-site-specific parameters

**Hypothesis:** Matches at neutral venues may have different base goal rates and different Elo sensitivity than home/away matches.
**Parameters:** Separate `baseGoals` and `adjustmentPer100` for neutral vs non-neutral.
**Expected benefit:** Better calibration when applying WC2026 predictions (all matches at neutral sites in host cities).
**Overfitting risk:** Moderate — World Cup data is almost entirely neutral-site, reducing non-neutral calibration data.
**Evaluation metrics:** Per-neutral-site MAE and Brier.
**Rejection criteria:** Insufficient non-neutral data in the calibration set to estimate parameters reliably.

---

## Acceptance Criteria for V2 Advancement

A candidate formula may advance to production only when it meets **all** of the following on the holdout split:

1. Improves holdout Brier Score **or** Log Loss vs V1.
2. Does not materially worsen goal MAE (tolerable slack: +0.05 goals MAE per team).
3. Improves or preserves calibration in the outer Elo-gap buckets (`<= -300` and `>= 300`).
4. Remains bounded: `homeExpectedGoals` and `awayExpectedGoals` stay in `[0.2, 4.0]`.
5. Is symmetric under team swap: swapping home/away Elo produces the mirror xG pair.
6. Maintains deterministic behavior: same inputs always produce the same outputs.
7. Does not depend on team-specific exceptions or manual overrides.
8. Passes the existing `packages/model` test suite without modification.
9. Passes a current-tournament regression check (WC2026 predictions remain finite and plausible for all 48 teams).

---

## Rejection Criteria

A candidate is rejected when it:

- Introduces NaN or Infinity in any xG output.
- Produces xG < 0.2 or xG > 4.0 for any realistic Elo input.
- Worsens holdout Brier Score AND Log Loss (both must be no worse).
- Requires team-specific parameters or manual exceptions.
- Breaks determinism across repeated runs.
- Cannot be expressed in fewer than five named constants (interpretability floor).

---

## WC2026 Holdout Policy

World Cup 2026 completed matches are permanently segregated into the `wc2026_holdout` split. They are never used for:

- Fitting candidate formula parameters.
- Selecting among candidates during validation.
- Reporting validation-split metrics.

They may only be used to report a final post-selection evaluation after a candidate has been chosen on the holdout split. This prevents any double use of live tournament results.

---

## Current Limitations

- **Calibration dataset is curated, not complete.** The expanded international sample covers selected competitions, not complete global history. Some team pairs have very few historical matches, making per-team bucket analysis unreliable.
- **Initial rating leakage is documented but not eliminated.** Teams appearing for the first time in the dataset start at 1500. Their first few matches use imprecise pre-match ratings. These records are flagged with `home_team_fallback_rating` / `away_team_fallback_rating` warnings in `data_quality_warnings`.
- **Outcome probability approximation is simplified.** The baseline uses a direct Elo win-expectancy model with a calibrated draw approximation, not the Poisson scorer used in production. This means the Brier Score and Log Loss from `evaluateEloToXgBaseline` may not exactly reflect production API behavior.
- **No external data.** This phase does not download or ingest any additional historical datasets.
- **No formula change.** V1 remains the production formula throughout this phase.

---

## Files

| File | Role |
|---|---|
| `packages/model/src/elo-to-xg-calibration.ts` | Dataset builder, split logic, bucket assignment, baseline metrics |
| `packages/model/tests/elo-to-xg-calibration.test.ts` | 57 focused tests |
| `packages/data/fixtures/world-cup/` | Historical WC fixture files (existing) |
| `packages/data/fixtures/international/expanded-international-matches.json` | International match sample (existing) |

---

## Next Subphase

**Phase 12.11B** — Calibration runner and summary artifact.

Work:
- Load all fixture files and pass them through `buildEloToXgCalibrationDataset`.
- Run `evaluateEloToXgBaseline` across all splits and produce a structured summary.
- Save a small, human-readable JSON or Markdown summary artifact to `docs/model-results/` for review.
- Identify which Elo-gap buckets show the largest compression in V1.

Phase 12.11B does not change the formula. It produces the first real calibration evidence.
