# Tournament Form Prediction Integration

## Overview

Phase 12.10B integrates the Phase 12.10A tournament-form foundation into `predictMatchFromLiveElo()` as an optional secondary Elo adjustment.

This integration is:

- opt-in
- conservative
- deterministic
- metadata-first

It does **not** introduce a new probability model. It adjusts the Elo inputs used by the existing Elo-to-xG and Poisson prediction path.

## Request Contract

`predictMatchFromLiveElo()` now accepts:

```ts
tournamentFormAdjustment?: {
  enabled: boolean;
  cutoffAt?: string;
};
```

Default behavior remains unchanged when this field is absent or `enabled: false`.

## Adjustment Order

When enabled, prediction Elo inputs follow this order:

1. baseline Live Elo
2. optional completed-results Elo ingestion adjustment
3. optional tournament-form secondary adjustment
4. existing Elo-to-xG mapping
5. existing Poisson probability generation

This keeps tournament-results ingestion and tournament-form adjustments separate in the response metadata.

## Baseline Versus Effective Elo

Tournament-form metadata reports:

- `baselineElo`: the Elo value entering the tournament-form step
- `adjustment`: the bounded tournament-form recommendation
- `effectiveElo`: `baselineElo + adjustment`

The baseline entering the tournament-form step may already include Phase 12.7 tournament-results Elo ingestion when that option is enabled.

## Cutoff Protection

`cutoffAt` is passed into the Phase 12.10A calculation.

Only completed eligible matches with `kickoffAt < cutoffAt` may contribute. Matches at or after the cutoff are excluded and surfaced as warnings in tournament-form metadata.

## Minimum Match Behavior

Tournament form remains conservative:

- teams below the minimum completed-match threshold keep `adjustment: 0`
- metadata explains why no non-zero adjustment was applied
- sparse samples do not automatically increase confidence

## Response Metadata

When tournament form is enabled, successful responses include:

- `enabled`
- `applied`
- optional `cutoffAt`
- per-team `baselineElo`
- per-team `adjustment`
- per-team `effectiveElo`
- per-team `matchesIncluded`
- optional per-team `formScore`
- `formulaVersion`
- `warnings`

This metadata is explanatory. It does not replace the main prediction fields.

## Confidence Provenance

Prediction confidence now carries optional provenance fields when tournament form is enabled:

- whether tournament form was enabled
- whether it applied
- tournament matches included per team
- tournament-form formula version

Confidence is not automatically raised because tournament form was enabled. Sparse or partial tournament samples can still leave a prediction at `medium` or `low`.

## No-Mutation Guarantee

Tournament form:

- does not mutate baseline Live Elo ratings
- does not rewrite tournament-results ingestion outputs
- does not change Phase 12.10A constants
- does not persist state

It produces temporary effective Elo inputs for the current prediction only.

## Current Bounds

The integration reuses Phase 12.10A bounds unchanged:

- minimum matches: `2`
- maximum absolute adjustment: `12`
- formula version: `wc2026-tournament-form-v1`

These values are conservative safeguards, not calibrated claims.

## Limitations

- no dashboard control or visualization yet
- no empirical calibration claim for tournament-form weights
- local deterministic completed-result input remains the default in this phase
- tournament form is a secondary signal, not a replacement for the historical Elo baseline

## Next Phase

Phase 12.10C can expose tournament-form controls and provenance in the dashboard once the API integration and metadata are stable.
