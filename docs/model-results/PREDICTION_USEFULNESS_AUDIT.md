# Prediction Usefulness Audit

**Phase:** 12.18A — Prediction Usefulness Audit
**Status:** Audit harness implemented and validated. Empirical verdict pending real stored snapshots (see [Dataset Coverage](#dataset-coverage)).
**Artifact:** `docs/model-results/artifacts/world-cup-2026-prediction-usefulness-audit.json`
**Service:** `runWorldCup2026PredictionUsefulnessAudit` (`packages/api/src/prediction-usefulness-audit.ts`)
**Command:** `pnpm --filter @world-cup-2026-predictor/api audit:prediction-usefulness`

---

## Purpose

Measure whether the current World Cup 2026 predictor is practically useful for match-by-match prediction, and explain a set of intuitions about its behaviour with evidence rather than assertion:

- why `1-1` appears so frequently as the modal exact score;
- whether the predictor overestimates draws;
- whether it underestimates strong favorites and large score differences;
- whether expected-goals (xG) values are too compressed;
- whether the single most likely exact scoreline is misleading compared with the aggregate 1X2 outcome;
- how often the model gets the winner/draw correct even when the exact score is wrong.

This phase **does not change** any production formula, model constant, preset, provider, standings, persistence schema, runtime behaviour, or UI prediction logic. It only reads immutable stored snapshots/evaluations and completed results, and derives metrics. The audit never reruns the prediction model: every prediction value (xG, 1X2 probabilities, scorelines, Elo inputs) is read directly from the stored snapshot, and outcome/Brier/Log-Loss derivations reuse the same pure helpers as the Model-vs-Reality tracker.

## Dataset Coverage

The audit dataset is built from completed World Cup 2026 fixtures for which a valid pre-match snapshot and a completed result both exist.

- **Completed results source:** `WORLD_CUP_2026_LOCAL_STATIC_RESULTS` joined to `WORLD_CUP_2026_GROUP_STAGE_FIXTURES` (currently **8** completed group-stage fixtures as of 2026-06-14).
- **Snapshots source:** the configured prediction-history persistence (memory by default; PostgreSQL when `PERSISTENCE_PROVIDER=postgres`).

**Current artifact result (memory mode):** `completedFixtures = 8`, `eligiblePredictions = 0`, `recommendation = insufficient_evidence`. In a fresh runtime the in-memory snapshot store holds no pre-match snapshots, so no completed fixture can be paired with a stored prediction. This is the honest, measured state — not a claim about model quality.

To produce an empirically meaningful audit, run the command against a persistence source that actually contains pre-match snapshots for the completed fixtures:

```bash
PERSISTENCE_PROVIDER=postgres AUDIT_DATABASE_URL="postgres://…read-only…" \
  pnpm --filter @world-cup-2026-predictor/api audit:prediction-usefulness
```

The command requires an explicit `AUDIT_DATABASE_URL`, `TEST_DATABASE_URL`, or `DATABASE_URL` when `PERSISTENCE_PROVIDER=postgres`, and **never falls back to memory silently**. It writes no secret or connection string to the artifact or logs.

> Runtime note: the CLI follows the repository convention `node --experimental-strip-types ./src/*.ts` (matching `db:migrate`). That convention resolves relative `.js` import specifiers to their `.ts` sources only on Node versions where type-stripping performs that rewrite; on older Node the same limitation applies to `db:migrate`. The pure audit service is fully exercised by the test suite regardless of Node version.

## Prediction Selection Rule

Exactly one prediction is selected per fixture (`selectAuditSnapshotForFixture`), applying these gates in order and reporting the first failing gate as the exclusion reason:

1. **`no_snapshot`** — the completed fixture has no candidate snapshot.
2. **`mismatched_teams`** — no candidate snapshot's `homeTeam`/`awayTeam` matches the official fixture in order.
3. **`unsupported_schema_version`** — when a supported-version allow-list is supplied, no candidate uses a supported `modelVersion`.
4. **`malformed_data`** — no candidate has finite, sum-to-one probabilities and a non-empty scoreline list.
5. **`post_kickoff_snapshot`** — every remaining candidate was captured at or after kickoff.

Among valid pre-match candidates, the **latest `capturedAt`** wins, with **`snapshotId` descending** as the final deterministic tie-breaker. Snapshots from the same fixture are never merged. A separate **`no_completed_result`** reason counts snapshots whose fixture has no completed result.

## Core Usefulness Metrics

Computed over eligible predictions; every metric returns `null` (never `NaN`) when it cannot be computed:

| Metric | Meaning |
|---|---|
| `outcomeAccuracy` | Share where predicted 1X2 outcome (argmax probability) equals the actual outcome. |
| `exactScorelineAccuracy` | Share where the modal exact scoreline equals the actual score. |
| `homeWinPrecision` / `drawPrecision` / `awayWinPrecision` | Precision of each predicted outcome class. |
| `top3ExactScoreCoverage` / `top5ExactScoreCoverage` | Share where the actual score appears in the top-3 / top-5 scorelines. |
| `averageBrierScore` | Mean three-outcome summed Brier score (same convention as the Model-vs-Reality tracker). |
| `averageLogLoss` | Mean log loss on the probability assigned to the actual outcome (clamped). |
| `averageHomeGoalError` / `averageAwayGoalError` | Mean absolute goal error of the modal scoreline. |
| `averageGoalDifferenceError` / `averageTotalGoalsError` | Mean absolute goal-difference / total-goals error of the modal scoreline. |

Stored evaluation metrics are reused verbatim when an evaluation exists for the selected snapshot; otherwise the identical pure formulas derive them from the stored probabilities.

## 1-1 Frequency

`scorelineFrequency` reports, for `0-0, 1-0, 0-1, 1-1, 2-0, 0-2, 2-1, 1-2, 2-2, 3-0, 0-3` (plus any other observed modal/actual score): modal count, modal rate, actual frequency, exact-hit count, and over/under-prediction delta. The headline `oneOneScoreline` block reports `modalRate`, `actualRate`, and `overpredictionDelta = modalRate − actualRate`.

## Draw Bias

`drawBias` reports average predicted draw probability, actual draw rate, the number of fixtures where draw was the highest 1X2 probability, the number where `1-1` was modal but a win was the highest aggregate outcome, the number of modal draws against strong favorites (|Elo| ≥ 200), and a calibration table over predicted-draw-probability buckets (`0.00–0.19`, `0.20–0.29`, `0.30–0.39`, `0.40–0.49`, `0.50+`) with mean predicted vs observed draw rate and the calibration gap.

## Favorite Separation

`favoriteSeparation` buckets matches by absolute Elo difference (`0-49`, `50-99`, `100-149`, `150-199`, `200-299`, `300+`) and reports per bucket: match count, average favorite win probability, actual favorite win rate, average predicted xG difference, average actual goal difference, modal `1-1` rate, draw-prediction rate, exact-score accuracy, and outcome accuracy. Matches are also classified by `FavoriteStrength` using documented thresholds:

| Strength | Absolute Elo difference |
|---|---|
| `balanced` | `< 50` |
| `slight_favorite` | `50–99` |
| `moderate_favorite` | `100–149` |
| `strong_favorite` | `150–299` |
| `heavy_favorite` | `≥ 300` |

## xG Compression

`xgCompression` reports average home/away xG, min/max xG, average and median absolute xG difference, the share of fixtures with |xG difference| below `0.10 / 0.25 / 0.50 / 0.75`, average |xG difference| by Elo bucket, the Pearson correlation between Elo difference and xG difference, and the count of strong favorites (|Elo| ≥ 200) whose xG advantage is below `0.40`.

## Modal Versus Aggregate Outcome

`modalVsAggregate` lists fixtures where the most likely **exact scoreline is a draw** yet the **aggregate 1X2 outcome favors a win**. For each it records teams, modal scoreline + probability, 1X2 probabilities, Elo difference, xG values, and the actual result.

These two answer different questions: the modal exact scoreline is the single most probable *grid cell*, while the 1X2 outcome aggregates *all* cells for each result. A skewed-but-spread win distribution can easily have `1-1` as its tallest single cell while "home win" is the larger summed mass. Treating the modal score as "the prediction" therefore misrepresents the model when its own aggregate already favors a winner.

## Top-3 / Top-5 Usefulness

`topN` measures whether the actual exact score is contained in the top-1 (modal), top-3, and top-5 scorelines, and whether the actual outcome is represented by the modal scoreline, anywhere in the top-3, and anywhere in the top-5. A large gap between top-1 and top-3/top-5 exact coverage indicates the problem is the *presentation of a single modal score*, not the underlying distribution.

## Upset and Blowout Behaviour

`upsetAndBlowout` defines and counts: **upsets** (actual winner had lower pre-match Elo), **blowouts** (absolute goal difference ≥ 3), **strong-favorite misses** (favorite Elo advantage ≥ 200 but favorite did not win), and **underestimated blowouts** (actual goal difference ≥ 3 while predicted xG difference < 1.0), with worked examples (capped, with a truncation flag). No team-specific corrections are applied.

## Examples

With the current memory-mode dataset there are no eligible predictions, so no worked examples are available. The audit emits worked examples automatically (upset / blowout / strong-favorite-miss / underestimated-blowout, and modal-vs-aggregate cases) once eligible predictions exist. The test suite contains a fully hand-computed five-fixture scenario demonstrating every section.

## Limitations

- The empirical verdict depends entirely on stored pre-match snapshots; with none present, the audit correctly reports `insufficient_evidence`.
- The completed-result set is small (8 group-stage fixtures), well below the `minSampleForEvidence = 8` and any threshold for statistical significance.
- The audit reuses stored snapshot probabilities; it does not re-derive predictions and therefore cannot detect issues that would only appear by rerunning the model.
- xG/Elo correlation and calibration buckets are descriptive; small samples are not meaningful.
- No betting interpretation is provided or implied.

## Final Recommendation

The audit ends with one documented recommendation, selected by named thresholds (see `PREDICTION_USEFULNESS_AUDIT_THRESHOLDS`), evaluated in this precedence:

1. `insufficient_evidence` — eligible predictions `< 8`.
2. `data_quality_blocked` — coverage `< 0.5`.
3. `recalibrate_elo_to_xg` — xG compression share (|diff| < 0.25) `≥ 0.5` **and** strong favorites under-separate (avg xG diff `< 0.4` in the 200+ Elo buckets, or any strong-favorite-low-xG case).
4. `recalibrate_scoreline_selection` — top-3/top-5 exact coverage exceeds top-1 by `≥ 0.15`.
5. `presentation_change_only` — 1X2 outcome accuracy `≥ 0.5` but exact modal accuracy `< 0.15`.
6. `keep_current_model` — no threshold breached.

**Current artifact recommendation:** `insufficient_evidence` (0 eligible predictions). The gates for `insufficient_evidence` and `data_quality_blocked` are evaluated first by design: no model judgement is credible without data.

## Evidence Required for Phase 12.18B and 12.18C

**Phase 12.18B (scoreline-selection / presentation):** proceed when, over a sufficient eligible sample (≥ 8, ideally far more), the audit reports `presentation_change_only` or `recalibrate_scoreline_selection` — i.e. acceptable 1X2 outcome accuracy with poor modal exact accuracy, and/or top-3/top-5 exact coverage materially above top-1. Required evidence: `outcomeAccuracy`, `exactScorelineAccuracy`, `topN.*`, `oneOneScoreline.overpredictionDelta`, and the `modalVsAggregate` case list.

**Phase 12.18C (Elo-to-xG recalibration):** proceed when the audit reports `recalibrate_elo_to_xg` — systematic xG compression with under-separated favorites. Required evidence: `xgCompression.shareBelow025`, `xgCompression.eloXgCorrelation`, `xgCompression.strongFavoriteLowXgCount`, and the `favoriteSeparation` buckets showing favorite win probability and actual favorite win rate diverging with low predicted xG difference. Any Elo-to-xG change would reuse the existing V1/V2 calibration and decision workflow (see `ELO_TO_XG_V2_PRODUCTION_INTEGRATION.md`) and must be evaluated on a holdout, not on the audit sample alone.

In all cases, gather a materially larger eligible sample (more completed fixtures with stored pre-match snapshots) before acting; the current dataset cannot support a model change.
