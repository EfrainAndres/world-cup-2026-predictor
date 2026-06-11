# International Match Dataset Foundation

Phase 7.0B establishes the data infrastructure for loading, validating, and normalizing a broader international match dataset beyond World Cup fixtures. This document records what was built, what it produces, and what must come next.

## Deliverables

| Artifact | Purpose |
| --- | --- |
| `packages/data/src/international-matches.ts` | Module for loading, validating, and normalizing international match records |
| `packages/data/tests/international-matches.test.ts` | Vitest unit tests for the module |
| `packages/data/fixtures/international/sample-international-matches.json` | 15-match curated sample covering 5 competition types |
| `packages/data/fixtures/international/README.md` | Fixture schema documentation |
| `packages/data/src/index.ts` | Updated to export all new types and functions |

## Dataset Schema

Each international match record requires:

```
match_id        — string, unique within the dataset
match_date      — ISO date string (YYYY-MM-DD)
competition     — free-form string (e.g. "FIFA World Cup 2022", "Copa America 2024")
stage           — free-form string (e.g. "group_stage", "final", "qualifier", "friendly")
home_team       — non-empty string, must differ from away_team
away_team       — non-empty string
home_score      — non-negative integer
away_score      — non-negative integer
result          — "home_win" | "draw" | "away_win" — must be consistent with scores
neutral_site    — boolean
source_note     — non-empty string
```

Competition and stage fields are intentionally free-form strings. There is no enforced competition or stage enum — this allows the dataset to accommodate any future competition type without code changes.

## Sample Dataset

The sample fixture (`sample-international-matches.json`) covers:

| Competition | Matches |
| --- | --- |
| FIFA World Cup 2022 | 3 (group stage, semi-final, final) |
| Copa America 2024 | 3 (two semi-finals, final) |
| UEFA Euro 2024 | 3 (two semi-finals, final) |
| FIFA World Cup 2026 Qualifier | 3 (CONMEBOL × 2, UEFA × 1) |
| International Friendly | 3 |
| **Total** | **15** |

**Date range:** 2022-11-22 to 2024-07-14

The sample is marked `is_sample_only: true` and is used for infrastructure testing only.

## Validation Rules

The validation pipeline enforces:

1. All 11 required fields must be present and non-empty.
2. `match_date` must be a valid ISO-compatible date string.
3. `home_team` and `away_team` must be non-empty and different from each other.
4. `home_score` and `away_score` must be non-negative integers.
5. `result` must be one of `home_win`, `draw`, `away_win`.
6. `result` must be consistent with the recorded scores (e.g. `home_score > away_score` requires `home_win`).
7. `neutral_site` must be a boolean.
8. `match_id` values must be unique within the dataset.

## Normalization

`normalizeInternationalMatch(match, createdAt)` converts an `InternationalMatch` to a `NormalizedMatch` using the existing `normalizeMatch` helper. The mapping is:

| InternationalMatch | NormalizedMatch |
| --- | --- |
| `match_id` | `match_id` |
| `match_date` | `match_date` |
| `competition` | `competition` |
| `home_team` | `home_team` |
| `away_team` | `away_team` |
| `neutral_site` | `neutral_site` |
| `home_score` | `home_score` |
| `away_score` | `away_score` |
| `result` | `result` |
| `source_note` | `data_source` |
| `createdAt` (argument) | `created_at` |

The `stage` field is dropped during normalization since `NormalizedMatch` does not include it. `NormalizedMatch` is the Elo-pipeline-compatible shape used by `runLiveEloPipeline`.

## Dataset Metadata

`loadInternationalMatchDataset` returns an `InternationalMatchDatasetResult` with:

- `matches` — all validated and parsed `InternationalMatch[]`
- `metadata.datasetId` — from the fixture file header
- `metadata.matchCount` — total matches loaded
- `metadata.competitions` — sorted unique competition names
- `metadata.earliestMatchDate` — earliest `match_date` in the dataset
- `metadata.latestMatchDate` — latest `match_date` in the dataset
- `metadata.isSampleOnly` — from the fixture file header (`is_sample_only`)
- `metadata.foundationWarnings` — always includes `INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING`; also includes `INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING` when `isSampleOnly` is true
- `metadata.createdAt` — from the fixture file header

## Foundation Warnings

| Warning Constant | When emitted |
| --- | --- |
| `INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING` | Always — the dataset is a small curated sample only |
| `INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING` | When `is_sample_only` is `true` in the fixture file |

These warnings are the data-layer equivalent of the model-layer `LIVE_ELO_PIPELINE_FOUNDATION_WARNING`. They inform downstream consumers (API handlers, dashboard metadata) that the data behind a result is incomplete.

## Relationship to the Live Elo Pipeline

The live Elo pipeline (`runLiveEloPipeline` in `packages/model`) currently runs on 256 embedded World Cup fixtures. To feed it from the international match dataset:

1. Load: `loadInternationalMatchDataset(rawFixtureFile)`
2. Normalize: `normalizeInternationalMatches(result.matches, createdAt)` → `NormalizedMatch[]`
3. Adapt: map `NormalizedMatch` to `EloMatch` in the API layer (no new model dependency needed — they share the same field names for Elo-relevant fields)
4. Pass to: `runLiveEloPipeline({ pipelineId, matches: eloMatches, dataCoverage: "partial_international_history" })`

This wiring is future work, tracked separately.

## Limitations

- The sample dataset covers 15 matches across 5 competitions. It is not a representative sample of international football history.
- Competition and stage fields are free-form strings. No cross-dataset normalization of competition names is applied (e.g. "World Cup 2022" and "FIFA World Cup 2022" would appear as two distinct competitions).
- There is no result weighting by competition importance. World Cup finals and friendly matches contribute equally during normalization.
- The dataset does not include extra-time or penalty shootout metadata. Matches decided by penalties are recorded with their full-time or extra-time score plus a `draw` result.
- No international match data before 2022 is included in the sample. Full historical coverage is future work.

## Next Steps

1. Source or curate a complete historical international match dataset covering all major competitions from 2000 onward (or earlier).
2. Store it in `packages/data/fixtures/international/` with `is_sample_only: false`.
3. Wire the dataset into the live Elo pipeline handler in the API layer.
4. Update `dataCoverage` from `"world_cup_fixtures_only"` to `"partial_international_history"` or `"complete_international_history"` as coverage improves.
5. Re-evaluate Elo ratings after adding broader match history.
