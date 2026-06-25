# Live Prediction Evidence & Recalibration Gate

**Phase:** 12.18C1  
**Status:** Active — evidence collection in progress  
**Service:** `packages/api/src/live-prediction-evidence-gate.ts`  
**CLI:** `packages/api/src/live-prediction-evidence-gate-cli.ts`

---

## Purpose

The Live Prediction Evidence & Recalibration Gate is a read-only analysis phase
that consumes persisted World Cup 2026 prediction snapshots and completed
Model-vs-Reality evaluations to derive a conservative, named verdict about
production prediction behaviour.

It **never** regenerates predictions, mutates snapshots, or triggers any model
change. The gate exists solely to determine which of seven possible decisions
the accumulated live evidence currently supports.

---

## Gate Decisions

| Decision | When issued |
|---|---|
| `insufficient_evidence` | Fewer than 8 unique evaluated fixtures |
| `data_quality_blocked` | Data quality problems exceed configured thresholds |
| `evidence_collection_continue` | 8–19 evaluated fixtures, data is clean but sample is too small for reliable recalibration |
| `presentation_change_only` | 1X2 accuracy acceptable but exact modal accuracy poor |
| `recalibrate_scoreline_selection` | Scoreline concentration excessive with acceptable 1X2 accuracy |
| `recalibrate_elo_to_xg` | xG compression and favorite under-separation both triggered |
| `broader_model_review` | Three or more independent evidence dimensions fail with ≥25 evaluated fixtures |

### Conservative design

With the current live sample (≈9 evaluated fixtures as of 2026-06-24) the gate
will always return `evidence_collection_continue`. Recalibration verdicts require
at least 20 unique evaluated fixtures; the `broader_model_review` verdict requires
at least 25. These thresholds are exported as `LIVE_EVIDENCE_GATE_THRESHOLDS`.

---

## Named Thresholds

| Constant | Value | Meaning |
|---|---|---|
| `minUniqueEvaluatedFixtures` | 8 | Below this → `insufficient_evidence` |
| `minForRecalibrationEvidence` | 20 | Below this → `evidence_collection_continue` |
| `minForBroaderModelReview` | 25 | Below this → broader review verdict not possible |
| `maxDataQualityErrorProportion` | 0.30 | Blocks gate if exceeded |
| `minPreMatchLockedProportion` | 0.50 | Below this → data quality warning |
| `maxFallbackCoverageProportion` | 0.50 | Above this → data quality warning |
| `favoriteWeakMinProbability` | 0.40 | `no_clear_favorite` / `weak` boundary |
| `favoriteModerateMinProbability` | 0.55 | `weak` / `moderate` boundary |
| `favoriteStrongMinProbability` | 0.70 | `moderate` / `strong` boundary |
| `oneOneConcentrationThreshold` | 0.40 | 1-1 modal rate above this → concentration flag |
| `scorelineConcentrationRatioThreshold` | 0.50 | Top-1 rate above this → concentration flag |
| `topTwoScorelinesDominanceThreshold` | 0.70 | Top-2 combined rate above this → concentration flag |
| `exactScoreDiversityMinimum` | 3 | Unique modal scorelines below this → concentration flag |
| `drawOverpredictionDelta` | 0.05 | Mean predicted draw − actual draw rate threshold |
| `drawFalsePositiveRateThreshold` | 0.50 | Draw FPR above this → flagged |
| `xgCompressionDifference` | 0.25 | |xG diff| below this is "compressed" |
| `xgCompressionShare` | 0.50 | Share compressed above this → compression flag |
| `strongFavoriteMinXgAdvantage` | 0.40 | xG advantage below this for strong fav → under-separation |

---

## Selection Policy

One canonical snapshot is selected per fixture from the persisted store:

1. Valid probability sums (within ±2% of 1.0) and at least one scoreline.
2. Must be pre-kickoff (captured before `kickoffAt`).
3. Prefer `pre_match_locked` status over `foundation_unverified`.
4. Among equal-status candidates: latest `capturedAt`.
5. Tiebreaker: `snapshotId` descending (lexicographic).

A secondary all-snapshots view counts modal scorelines across all valid
pre-kickoff snapshots (including non-primary selections) to detect duplication
bias between the selection policy and the raw snapshot corpus.

---

## Evidence Sections

### Core Metrics
- Outcome accuracy, exact scoreline accuracy, Brier score, log loss.
- Home/away/total goal MAE, goal difference MAE.
- Average predicted vs. actual goals per game.

### Scoreline Concentration
- Modal scoreline (primary selections and all-snapshots secondary view).
- 1-1, 0-0, 1-0, 0-1 individual rates.
- Top-2 combined rate, unique modal scoreline count.
- Modal draw proportion (proportion of fixtures whose modal score is a draw).
- `compressedModalSelectionFlag` triggers when any concentration threshold is breached.

### Draw Calibration
- Predicted draw probability vs. actual draw rate.
- Draw false-positive rate: predicted draws that were not draws.
- Draw false-negative rate: actual draws that were not predicted.
- Calibration buckets in 0.10-wide probability bands.

### Favorite Separation (4 probability-based buckets)
- `no_clear_favorite`: max outcome probability < 0.40.
- `weak`: 0.40–0.54.
- `moderate`: 0.55–0.69.
- `strong`: ≥ 0.70.
- Per-bucket: outcome accuracy, favorite win rate, avg xG advantage, avg actual goal margin.
- `underSeparationFlag` set when moderate/strong favorites show average predicted xG advantage below `strongFavoriteMinXgAdvantage`.

### xG Compression
- Average, median |xG diff|.
- Share of fixtures with |xG diff| < 0.10 / 0.25 / 0.50.
- Per-strength-bucket averages.
- `xgCompressionFlag` when share-below-0.25 ≥ 0.50 or strong-favorite has low xG.

### Confidence/Coverage Segmentation
Metrics broken out by: `confidence_level` (high/medium/low/very_low),
`coverage_type` (full/partial/fallback/fallback_only), `fallback_used` (true/false),
`snapshot_status` (pre_match_locked/foundation_unverified).
Segments with fewer than 3 evaluated fixtures are marked `reliable: false`.

### Data Quality Assessment
- Proportion of primary snapshots that are `pre_match_locked`.
- Proportion using fallback Elo coverage.
- Duplicate evaluation detection (same snapshotId evaluated more than once).
- Distinct groups and matchdays represented.
- Issues list; `readinessVote` aligned with the main gate decision.

---

## Metrics Contract

- All rates/means return `null` (never `NaN` or `Infinity`) when the sample is
  insufficient or denominators are zero.
- The gate is deterministic: `generatedAt` is injected; no `Date.now()` inside the service.
- No evaluation, snapshot, or external state is ever mutated.

---

## PostgreSQL Requirement

The gate reads from the PostgreSQL persistence layer in production:

```
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=...
```

The `write_artifact` CLI mode enforces postgres — it will not fall back to
in-memory storage. The `summary` mode can run with `PERSISTENCE_PROVIDER=memory`
for a preview using whatever snapshots are in the in-memory default store
(effectively empty in a fresh process).

---

## Running

```bash
# Human-readable summary to stdout
PERSISTENCE_PROVIDER=postgres DATABASE_URL=... \
  pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence

# Write JSON artifact
LIVE_EVIDENCE_MODE=write_artifact \
PERSISTENCE_PROVIDER=postgres DATABASE_URL=... \
  pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
```

Default artifact path: `docs/model-results/artifacts/world-cup-2026-live-prediction-evidence-gate.json`

Override with `LIVE_EVIDENCE_OUTPUT_PATH`.

---

## What This Phase Does NOT Do

- Does not change Elo-to-xG constants.
- Does not change the Poisson goal model.
- Does not change the modal scoreline selection algorithm.
- Does not change the confidence assessment logic.
- Does not retrain or regenerate any prediction.
- Does not push any changes to production.

Any recalibration action must be taken in a separate, named phase after this
gate returns a recalibration verdict.
