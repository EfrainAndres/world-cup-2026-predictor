# Model vs Reality Tracker

## Overview

Phase 12.9 adds an immutable evaluation layer that links a stored pre-match World Cup 2026 prediction snapshot to the completed result of the same official fixture. The tracker never rewrites the original snapshot. It creates a separate evaluation record and exposes summary metrics over those records.

## Eligibility

An evaluation is created only when all of the following are true:

- a stored snapshot exists
- the snapshot fixture is an official World Cup 2026 fixture
- the snapshot status is `pre_match_locked` or `foundation_unverified`
- a normalized completed result exists for that same fixture
- the completed result preserves the official home/away order
- both final scores are non-negative integers
- the same snapshot/result/metric-version combination has not already been evaluated

Typed issues are returned for:

- missing snapshot
- missing completed result
- fixture mismatch
- team-order mismatch
- incomplete score
- live or scheduled status
- duplicate completed result
- invalid fixture identity
- unsupported snapshot state
- invalid snapshot probabilities

Custom matchups are not eligible because they do not map to official World Cup 2026 fixture identity.

## Immutable Evaluation Store

The tracker uses a dedicated in-memory `PredictionEvaluationStore`:

- `create`
- `getById`
- `getBySnapshotId`
- `getByFixtureId`
- `list`
- `reset` for test isolation only

There is no update path and no delete path. Reads return frozen copies. Duplicate creation returns the existing evaluation rather than silently replacing it.

As with snapshot storage, this is a serverless best-effort foundation only. In-memory evaluations do not survive restarts or instance changes.

## Snapshot-to-Result Linking

Completed result linking is deterministic:

1. exact internal fixture id match when available
2. canonical home/away team-name match in official order
3. reverse-order detection for typed rejection

The tracker rejects:

- reverse-order matches
- unresolved fixture identity
- duplicate completed results for the same fixture

It does not invent missing fixture metadata and does not regenerate predictions.

## Outcome Derivation

Actual outcome:

- `homeGoals > awayGoals` -> `home_win`
- `homeGoals = awayGoals` -> `draw`
- `homeGoals < awayGoals` -> `away_win`

Predicted outcome uses the stored snapshot probabilities:

- highest of home win, draw, away win
- deterministic tie-break:
  1. `home_win`
  2. `draw`
  3. `away_win`

The predicted outcome is not derived from the first scoreline.

## Predicted Scoreline Selection

The tracker reuses the stored snapshot scorelines and never reruns the model.

Top scoreline selection uses:

1. highest scoreline probability
2. lower total goals
3. lower home goals
4. lower away goals

This keeps scoreline selection stable even when two stored scorelines have equal probability.

## Metrics

Each evaluation stores:

- outcome correctness
- draw correctness
- exact-score correctness
- home-goal absolute error
- away-goal absolute error
- total-goal absolute error
- goal-difference absolute error
- multiclass Brier Score
- Log Loss
- predicted-outcome probability
- actual-outcome probability

### Brier Score Convention

The tracker uses the three-outcome multiclass Brier Score:

`(p_home - y_home)^2 + (p_draw - y_draw)^2 + (p_away - y_away)^2`

This phase does not divide by three, matching the existing project convention of reporting the direct summed score.

### Log Loss Protection

Log Loss uses the probability assigned to the actual outcome from the stored snapshot.

- probabilities must already be finite and sum to 1 within project tolerance
- values are clamped with the existing historical-validation epsilon before `log`
- the tracker never silently renormalizes invalid snapshots

## Confidence and Coverage Carry-Through

The evaluation record carries forward snapshot confidence and coverage:

- confidence level
- coverage type
- whether fallback was used by either team

This supports:

- breakdown by confidence level
- breakdown by coverage type
- fallback vs non-fallback comparison

Confidence is descriptive metadata, not a guarantee of correctness.

## Aggregate Summary

`getWorldCup2026ModelRealitySummary()` returns:

- evaluation count
- outcome accuracy
- draw accuracy
- exact-score accuracy
- mean goal-error metrics
- mean Brier Score
- mean Log Loss
- breakdown by confidence level
- breakdown by coverage type
- fallback vs non-fallback summary
- calibration buckets

For empty collections:

- counts are `0`
- averages are `null`
- no field returns `NaN`

## Calibration Buckets

The tracker adds a small deterministic calibration foundation over the probability assigned to the predicted outcome.

Fixed buckets:

- `0.00-0.20`
- `0.20-0.40`
- `0.40-0.60`
- `0.60-0.80`
- `0.80-1.00`

Each bucket reports:

- predictions count
- mean predicted probability
- observed frequency
- absolute calibration gap

This is a descriptive foundation only. Small samples are not statistically meaningful.

## Metric Versioning

Evaluation identity includes:

- snapshot id
- fixture identity
- final score
- result status
- explicit metric version

Current constant:

- `WORLD_CUP_2026_EVALUATION_METRIC_VERSION = "wc2026-model-vs-reality-v1"`

Changing metric behavior should use an explicit version bump rather than mutating old evaluations.

## Provenance

Each evaluation stores:

- snapshot content hash
- result source when known
- whether cache was used
- whether local fallback was used
- completed-result timestamp when available

This keeps evaluation evidence auditable without exposing raw provider payloads or secrets.

## Limitations

- in-memory only
- no background evaluation job
- no persistent analytics history
- no dashboard analytics surface beyond future small summary work
- no result polling or cron in this phase
- no snapshot mutation
- no Elo, xG, Poisson, or tournament-form changes
- no claim of statistical significance from small samples

## Future Work

Later phases can build on this foundation:

- persistent evaluation storage
- automatic evaluation after synchronized final results
- live dashboard summary cards
- richer per-fixture comparison pages
- tournament-form adjustments
- Elo-to-xG Calibration V2
