# Competition Weighting

Phase 7.5 adds opt-in competition weighting to the Live Elo pipeline.

## What Changed

The default Live Elo pipeline remains unchanged. When no competition weighting config is provided, matches are processed chronologically with the standard Elo K-factor.

When competition weighting is enabled, each match still appears once. The competition weight scales the Elo K-factor for that match. If recency weighting is also enabled, the recency weight and competition weight are multiplied together, then applied once to the K-factor.

## Weight Buckets

Default competition weights are:

| Competition category | Weight |
| --- | ---: |
| `fifa_world_cup` | `4.0` |
| `continental_championship` | `3.0` |
| `world_cup_qualifier` | `2.0` |
| `nations_league` | `1.5` |
| `international_friendly` | `1.0` |
| `unknown` | `1.0` |

The current classifier uses explicit match `competition` metadata when available, then optional `source` metadata, then simple source-id inference for known local fixture patterns. Unknown competitions fall back to `unknown`.

## Metadata

Live Elo results now include `competitionWeighting` metadata:

- whether weighting was enabled
- how many matches were weighted
- the fixed weight table
- count of matches missing explicit competition metadata
- count of matches classified as unknown

API responses from `getLiveEloRatingsFoundation()` include the same metadata and a note stating whether competition weighting was enabled.

## Warnings

Competition weighting does not fix partial data coverage or calibration. When enabled, the pipeline warns that the buckets are fixed and uncalibrated.

Additional warnings are emitted when matches are missing explicit competition metadata or when competitions are unknown.

## What This Can Prove

This phase proves that:

- baseline Live Elo behavior stays unchanged by default
- different competition categories can deterministically scale Elo update impact
- recency and competition weights combine through one K-factor multiplier
- API responses expose enough metadata to audit whether weighted or unweighted ratings were used

## What This Cannot Prove

This phase does not prove better predictive accuracy. The competition weights are transparent defaults, not calibrated parameters. The project still relies on partial curated international match history and does not include player, injury, squad, travel, rest-day, or xG data.

Future phases should compare competition weighting choices against historical validation metrics before treating them as model improvements.
