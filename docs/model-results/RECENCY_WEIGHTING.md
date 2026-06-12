# Recency Weighting

Phase 7.4 adds an opt-in recency weighting mode to the Live Elo pipeline.

## What Changed

The default Live Elo pipeline remains unchanged. When no recency weighting config is provided, matches are processed chronologically with the standard Elo K-factor.

When recency weighting is enabled, each match still appears once in chronological order. The match weight scales the Elo K-factor for that match, so recent results can move ratings more than older results without duplicating matches.

## Weight Buckets

Weights are calculated from the match date to a reference date:

| Match age | Weight |
| --- | ---: |
| Within 12 months | `1.0` |
| 12-24 months | `0.75` |
| 24-48 months | `0.5` |
| Older than 48 months | `0.25` |

Tests use fixed reference dates for deterministic behavior. If recency weighting is enabled without an explicit reference date, the pipeline uses the latest match date in the supplied matches. Empty weighted inputs require an explicit valid reference date.

## Metadata

Live Elo results now include `recencyWeighting` metadata:

- whether weighting was enabled
- the reference date used
- how many matches were weighted
- the fixed bucket weights

API responses from `getLiveEloRatingsFoundation()` include the same metadata and a note stating whether recency weighting was enabled.

## Warnings

Recency weighting does not fix partial data coverage. The current Live Elo foundation still uses curated World Cup fixtures plus a partial expanded international sample.

When weighting is enabled, the pipeline adds a warning that the buckets are fixed and uncalibrated.

## What This Can Prove

This phase proves that:

- the pipeline can keep baseline Elo behavior unchanged by default
- recent matches can deterministically influence ratings more than older matches
- weighted and unweighted outputs can be compared safely
- API responses expose enough metadata to audit which mode was used

## What This Cannot Prove

This phase does not prove real predictive accuracy. The weighting buckets are not calibrated, the international match history is still partial, and no player, injury, squad, travel, rest-day, or xG data is included.

Future calibration should compare weighting choices with historical backtesting metrics before treating any weighted setting as a stronger model.
