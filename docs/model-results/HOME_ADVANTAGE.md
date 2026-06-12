# Home Advantage

Phase 7.6 adds opt-in home advantage support to the Live Elo pipeline.

## What Changed

The default Live Elo pipeline remains unchanged. When no home advantage config is provided, matches are processed with the standard Elo expected-score calculation.

When home advantage is enabled, non-neutral matches add a fixed Elo-point adjustment to the home team for expected-score calculation only. The adjustment is not permanently added to the home team's stored rating.

## Default Setting

The default home advantage adjustment is:

| Setting | Value |
| --- | ---: |
| Home advantage points | `60` |

Home advantage applies only when `neutral_site` or `neutralSite` is `false`.

No home advantage applies when neutral-site metadata is `true`.

If neutral-site metadata is missing, home advantage is not applied and the pipeline reports a warning.

## Interaction With Other Weighting

Home advantage affects expected score only.

Recency weighting and competition weighting continue to scale the Elo K-factor. If all three options are enabled:

1. The home team's effective rating is adjusted only for expected-score calculation.
2. Recency and competition weights are multiplied together.
3. The combined weight scales the K-factor once.
4. Rating updates are applied to the real team ratings, not to the temporary home-advantage rating.

## Metadata

Live Elo results now include `homeAdvantage` metadata:

- whether home advantage was enabled
- Elo points used
- matches evaluated
- non-neutral matches where home advantage was applied
- neutral-site match count
- missing neutral-site metadata count

API responses from `getLiveEloRatingsFoundation()` include the same metadata and a note stating whether home advantage was enabled.

## Warnings

Home advantage does not fix partial data coverage or calibration. When enabled, the pipeline warns that the setting is fixed and uncalibrated.

If neutral-site metadata is missing, the pipeline adds a warning and does not apply home advantage to those matches.

## What This Can Prove

This phase proves that:

- baseline Live Elo behavior stays unchanged by default
- non-neutral matches can deterministically adjust expected score calculations
- neutral-site matches do not receive home advantage
- home advantage composes with recency and competition K-factor weighting
- API responses expose enough metadata to audit whether home advantage was used

## What This Cannot Prove

This phase does not prove better predictive accuracy. The `60` Elo-point adjustment is a transparent default, not a calibrated parameter. The project still relies on partial curated international match history and does not include player, injury, squad, travel, rest-day, or xG data.

Future calibration should compare home advantage settings against historical validation metrics before treating them as model improvements.
