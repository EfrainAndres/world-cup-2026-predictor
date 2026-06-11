# International Match Fixtures

This directory contains curated international football match fixture files for use with the `international-matches` data module.

## Files

| File | Status | Matches | Purpose |
| --- | --- | --- | --- |
| `sample-international-matches.json` | Sample only | 15 | Foundation validation and infrastructure testing |

## Sample Fixture: `sample-international-matches.json`

A small curated sample of 15 international matches across five competition types:

| Competition | Stage | Matches |
| --- | --- | --- |
| FIFA World Cup 2022 | Group stage, semi-final, final | 3 |
| Copa America 2024 | Semi-final, final | 3 |
| UEFA Euro 2024 | Semi-final, final | 3 |
| FIFA World Cup 2026 Qualifier | Qualifier | 3 |
| International Friendly | Friendly | 3 |

**Date range:** 2022-11-22 to 2024-07-14

**Purpose:** This file exists to validate the `international-matches.ts` loading, validation, and normalization pipeline. It is marked `is_sample_only: true` and must not be used for model calibration or production predictions.

## Match Schema

Each match object requires all of the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `match_id` | string | Unique match identifier |
| `match_date` | string | ISO date (YYYY-MM-DD) |
| `competition` | string | Free-form competition name |
| `stage` | string | Free-form stage name (e.g. `group_stage`, `final`, `qualifier`, `friendly`) |
| `home_team` | string | Home team name |
| `away_team` | string | Away team name (must differ from home_team) |
| `home_score` | integer | Home team goals (non-negative) |
| `away_score` | integer | Away team goals (non-negative) |
| `result` | string | Must be `home_win`, `draw`, or `away_win` — must be consistent with the scores |
| `neutral_site` | boolean | Whether the match was at a neutral venue |
| `source_note` | string | Attribution or description of the data source |

## Adding Real Match Data

To add a full international match dataset to this directory:

1. Create a new JSON file (e.g. `international-matches-2010-2022.json`) following the schema above.
2. Set `is_sample_only: false` and provide a real `dataset_id`.
3. Validate the file using `validateInternationalMatchDataset` before using it in the pipeline.
4. Update this README with the new file's details.

## Foundation Warnings

All datasets loaded from this module emit `INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING` until a complete international match history dataset is available. The sample fixture also emits `INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING`.

These warnings propagate to `InternationalMatchDatasetMetadata.foundationWarnings` and downstream pipeline metadata.
