# Calibration Foundation

Calibration checks whether predicted probabilities match observed frequencies over time.

## What Calibration Means

If a model gives teams a 60% probability, those outcomes should happen about 60% of the time over a large enough set of comparable predictions.

Calibration is different from simply picking the winner. A model can pick many winners correctly but still be overconfident or underconfident.

## Why Calibration Matters

World Cup prediction outputs should communicate uncertainty honestly.

Calibration helps answer:

- Are high-confidence predictions too confident?
- Are underdogs assigned reasonable probability?
- Does the model understate draws or close matchups?
- Are tournament champion probabilities plausible over repeated historical checks?

## How Calibration Buckets Work

Calibration buckets group predictions into probability ranges.

Example:

| Bucket | Meaning |
| --- | --- |
| `0.00` to `0.25` | Low-confidence outcomes. |
| `0.25` to `0.50` | Moderate outcomes. |
| `0.50` to `0.75` | Higher-confidence outcomes. |
| `0.75` to `1.00` | Strong favorites. |

For each bucket, the project can compare average predicted probability with actual outcome frequency.

## Current Implementation

Phase 4.0G can generate champion calibration buckets from supplied historical tournament probability snapshots.

This is a foundation only. The current dataset has too few tournaments to produce meaningful calibration claims.

## Needed For A Real Calibration Report

A real calibration report needs:

- More historical tournaments.
- Many more prediction events.
- Model-generated probability snapshots.
- Data cutoff and model version metadata.
- Separate calibration views for match outcomes, champion probabilities, and stage qualification probabilities.

Calibration should become part of the model promotion decision before dashboard predictions are presented as useful.
