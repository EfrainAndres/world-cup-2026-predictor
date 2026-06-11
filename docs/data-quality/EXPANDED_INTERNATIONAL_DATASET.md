# Expanded International Dataset

Phase 7.0D adds `packages/data/fixtures/international/expanded-international-matches.json`, a manually curated partial fixture set for validating the international match loader and strengthening the live Elo foundation.

## Scope

The expanded fixture contains 56 matches across:

| Competition | Coverage |
| --- | --- |
| FIFA World Cup 2022 | Selected group-stage and knockout matches |
| Copa America 2024 | Selected group-stage, knockout, and final matches |
| UEFA Euro 2024 | Selected group-stage, knockout, and final matches |
| FIFA World Cup 2026 Qualifier | Selected CONMEBOL qualifiers |
| International Friendly | Selected 2023 and 2024 friendlies |

This is still a curated sample. It is intentionally small enough to review manually and is not a complete global match-history database.

## Validation

The data package validates:

- required match fields
- ISO-compatible match dates
- non-empty, distinct teams
- non-negative integer scores
- result consistency with scores
- boolean neutral-site flags
- duplicate match IDs
- dataset metadata, competitions, and date bounds

The fixture also normalizes into the existing `NormalizedMatch` shape used by Elo-compatible model helpers.

## Warning Codes

All loaded international datasets now expose warning codes in metadata:

| Warning code | Meaning |
| --- | --- |
| `partial_international_history` | The fixture covers selected competitions and dates only. |
| `curated_sample_only` | The fixture is manually selected for lightweight validation coverage. |
| `not_complete_global_match_history` | The fixture is not a complete senior international match database. |

## API Use

The live Elo API foundation uses an Elo-compatible static mirror of the expanded fixture as its preferred international supplement and preserves the previous inline supplement as fallback behavior. This keeps the dashboard/browser build free of filesystem access while keeping the JSON fixture as the reviewed data artifact. Metadata labels the supplement count, dataset ID, warning codes, and no-network/no-database constraints.

## Limitations

- The fixture is partial and curated.
- It should not be used for public accuracy claims.
- It is not a full pre-tournament international match history.
- It is not automatically downloaded or scraped.
- It is not calibrated for final model quality.
