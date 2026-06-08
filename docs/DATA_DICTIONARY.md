# Data Dictionary

This document defines planned fields for match, prediction, and model-output datasets. Field names may evolve during implementation, but changes should be documented.

## Planned Fields

| Field | Description | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- | --- |
| `match_id` | Stable unique identifier for a match. | String | Required | `2026-WC-GA-001` | Should be deterministic where possible. |
| `match_date` | Match date in ISO format. | Date | Required | `2026-06-11` | Store timezone separately later if kickoff time is needed. |
| `competition` | Competition or tournament name. | String | Required | `FIFA World Cup 2026` | Normalize names across sources. |
| `home_team` | Home-designated team or first listed team. | String | Required | `Mexico` | Use canonical team names in processed data. |
| `away_team` | Away-designated team or second listed team. | String | Required | `Canada` | Must not equal `home_team`. |
| `neutral_site` | Whether the match is at a neutral venue. | Boolean | Required | `true` | Important for home advantage assumptions. |
| `home_score` | Goals scored by home-designated team. | Integer | Optional | `2` | Required for completed matches; null for future fixtures. |
| `away_score` | Goals scored by away-designated team. | Integer | Optional | `1` | Required for completed matches; null for future fixtures. |
| `result` | Match result from home-team perspective. | String | Optional | `home_win` | Allowed values: `home_win`, `draw`, `away_win`; null before match. |
| `home_elo_before` | Home team Elo before the match. | Float | Optional | `1842.5` | Required for Elo model outputs. |
| `away_elo_before` | Away team Elo before the match. | Float | Optional | `1768.2` | Required for Elo model outputs. |
| `home_elo_after` | Home team Elo after the match. | Float | Optional | `1850.1` | Available only after result is known. |
| `away_elo_after` | Away team Elo after the match. | Float | Optional | `1760.6` | Available only after result is known. |
| `expected_home_goals` | Expected goals for home-designated team from goal model. | Float | Optional | `1.42` | Must be non-negative. |
| `expected_away_goals` | Expected goals for away-designated team from goal model. | Float | Optional | `1.08` | Must be non-negative. |
| `home_win_probability` | Predicted probability of home-team win. | Float | Optional | `0.48` | Must be between 0 and 1. |
| `draw_probability` | Predicted probability of draw. | Float | Optional | `0.27` | Must be between 0 and 1. |
| `away_win_probability` | Predicted probability of away-team win. | Float | Optional | `0.25` | Must be between 0 and 1. |
| `model_version` | Version or label of model that produced prediction fields. | String | Optional | `elo-baseline-v1` | Required for published predictions. |
| `data_source` | Source used for the row or prediction input. | String | Required | `kaggle-international-results` | Keep source metadata separately later. |
| `created_at` | Timestamp when the processed row or output was created. | Timestamp | Required | `2026-06-08T14:30:00Z` | Use UTC for generated artifacts. |

## Validation Rules

Future data validation should enforce:

- Required fields are present.
- Dates parse as valid ISO dates.
- Scores are non-negative integers when present.
- Probabilities are between 0 and 1.
- Match outcome probabilities sum to approximately 1.
- Team names map to canonical team IDs.
- Future fixtures do not include final scores.
- Training features do not use post-match values.
- `model_version` is present for any published prediction.

## Notes For Future Implementation

Additional fields may be added for:

- Team IDs.
- Venue.
- City.
- Confederation.
- Tournament stage.
- Group.
- Kickoff time.
- Source row hash.
- Data version.
- Validation status.

Do not add fields only because they are available. Add fields when they support a model, validation check, dashboard view, or audit trail.
