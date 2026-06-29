# StatsBomb Prediction Signal Policy

## Purpose

This document defines the data quality and staleness policies governing when and how StatsBomb Open Data team-performance profiles are incorporated into match predictions.

## Coverage Classification

A profile's coverage level is set at ingestion time and determines its base weight:

| Level | Min Matches | Min xG Samples | Base Weight |
|-------|-------------|----------------|-------------|
| `full` | 10 | 100 | 0.30 |
| `partial` | 5 | 40 | 0.20 |
| `sparse` | 1 | — | 0.10 |
| `fallback` | 0 | — | 0.00 (never applied) |

## Freshness Policy

Freshness is computed from `latestMatchAt` to `cutoffAt` at prediction time:

| Level | Age | Multiplier |
|-------|-----|-----------|
| `fresh` | ≤ 180 days | 1.00 |
| `aging` | 181–365 days | 0.75 |
| `stale` | > 365 days | 0.25 |
| `unknown` | no match data | 0.00 (rejected) |

Profiles with `freshness: "unknown"` are always rejected with `reason: "stale_profile"`.

## No-Look-Ahead Rule

Only profiles whose `cutoffAt ≤ request.cutoffAt` are accepted. A profile produced after the requested cutoff date is discarded; the signal falls back to the Elo-only baseline. This prevents future competition data from contaminating historical or tournament-window predictions.

## Sample Shrinkage

Weight is scaled by `min(1, matchCount / 15)` to reduce the influence of profiles derived from fewer than 15 matches. A profile with 5 matches from a full-coverage competition receives approximately 33% of the full-coverage base weight.

## Minimum Applied Weight

The combined `pairWeight = min(homeWeight, awayWeight)` must exceed `0.001` before the signal is applied. Below this threshold the adjustment is negligible and the signal is discarded with `reason: "insufficient_coverage"`.

## Global Prior

When `xgForPer90` or `xgAgainstPer90` is null (e.g., no xG data in source competition), the global prior of `1.05 xG per 90 minutes` is used as the attack or defense signal. This preserves a sensible signal for teams with goal-count-only records.

## Team Fallback Policy

Eight World Cup 2026 teams have no StatsBomb Open Data coverage:

- Bosnia-Herzegovina, Haiti, Curaçao, New Zealand, Iraq, Norway, Jordan, Uzbekistan

These teams always receive `coverage: "fallback"`, weight 0. Predictions involving them use the Elo-only baseline.

## Supported Competitions (for ingestion)

| Competition | Season |
|-------------|--------|
| FIFA World Cup 2022 | compId=43, seasonId=106 |
| FIFA World Cup 2018 | compId=43, seasonId=3 |
| Copa América 2024 | compId=223, seasonId=282 |
| AFCON 2023 | compId=1267, seasonId=107 |
| UEFA Euro 2024 | compId=55, seasonId=282 |
| UEFA Euro 2020 | compId=55, seasonId=43 |

## Attribution

StatsBomb Open Data is used under the StatsBomb Open Data License. Attribution: "Data provided by StatsBomb. All rights reserved."

Do not commit raw StatsBomb JSON to this repository. Use the local `.local-data/` cache directory which is `.gitignore`d.

## Artifact Lifecycle

1. Run `pnpm statsbomb:download` to fetch Open Data locally.
2. Run `pnpm statsbomb:build-profiles` to generate `docs/model-results/artifacts/statsbomb-team-performance-profiles.json`.
3. Commit only the generated artifact (not the raw download).
4. Re-run after each new StatsBomb data release or after a staleness threshold is exceeded.

## Staleness Review Trigger

Review and regenerate profiles when:
- A supported competition concludes and data is published.
- Any team's profile enters `stale` freshness (> 365 days since latest match).
- The artifact's `generatedAt` is more than 90 days old.
