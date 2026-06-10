# Historical Dataset Report

Phase 4.0H expands the curated historical FIFA World Cup fixture dataset from small knockout subsets into complete tournament result fixtures for 2010, 2014, 2018, and 2022.

This report describes the dataset structure and validation coverage. It does not claim model accuracy.

## Data Included

| File | Tournament | Scope | Matches |
| --- | --- | --- | --- |
| `packages/data/fixtures/world-cup/world-cup-2010-results.json` | FIFA World Cup 2010 | Group stage through final | 64 |
| `packages/data/fixtures/world-cup/world-cup-2014-results.json` | FIFA World Cup 2014 | Group stage through final | 64 |
| `packages/data/fixtures/world-cup/world-cup-2018-results.json` | FIFA World Cup 2018 | Group stage through final | 64 |
| `packages/data/fixtures/world-cup/world-cup-2022-results.json` | FIFA World Cup 2022 | Group stage through final | 64 |

Total curated fixture records: **256 matches**.

## Fields Added Or Standardized

Each match now includes:

| Field | Purpose |
| --- | --- |
| `match_id` | Stable local identifier for deterministic tests and backtesting. |
| `tournament_year` | Tournament year. |
| `stage` | Normalized tournament stage. |
| `stage_order` | Chronological stage order from group stage to final. |
| `match_date` | ISO date for sorting and filtering. |
| `home_team`, `away_team` | Listed teams for the match record. |
| `home_score`, `away_score` | Final score after regular time or extra time, excluding penalties. |
| `result` | Scoreline result from the home-team perspective. |
| `winner` | Team that advanced or won; `null` for group-stage draws. |
| `decided_by` | Whether the match was decided by regular time, extra time, penalties, or group-stage draw. |
| `penalty_home_score`, `penalty_away_score` | Shootout score when applicable; otherwise `null`. |
| `neutral_site` | Boolean placeholder for future venue-aware modeling. |
| `source_note` | Concise source provenance note. |

## Active Validations

The data package validates:

- Required field presence.
- Supported tournament years.
- Supported stage values.
- Stage-order consistency.
- ISO-compatible match dates.
- Non-empty and distinct teams.
- Non-negative integer scores.
- Valid result values.
- Result consistency with score.
- Valid `decided_by` values.
- Winner consistency with teams, result, and penalty scores.
- Penalty score presence for penalty-decided matches.
- Null penalty scores for non-penalty matches.
- Neutral-site boolean.
- Source-note presence.
- Duplicate `match_id` values.
- Expected 64-match count per tournament.
- Expected 256-match count across the complete dataset.

## How This Supports Backtesting

The expanded dataset lets future phases evaluate model outputs against complete tournament outcomes rather than only late knockout matches. It supports:

- Full tournament champion and runner-up extraction.
- Group-stage and knockout fixture coverage.
- Match-level model scoring in future phases.
- Calibration and probability reports over multiple tournament years.
- Better validation of result, winner, penalty, and stage metadata.

## Still Not A Model Accuracy Claim

This dataset is an input for backtesting, not the backtest itself. Future phases still need:

- Pre-match or pre-tournament probability snapshots.
- Model version metadata.
- Data cutoffs.
- Scoring reports.
- Calibration interpretation.
- Human review of historical assumptions.
