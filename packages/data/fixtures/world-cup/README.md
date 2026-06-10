# World Cup Fixture Fixtures

This directory contains small curated historical FIFA World Cup fixture subsets for deterministic tests and future backtesting foundations.

## Included Files

| File | Scope | Match Count |
| --- | --- | --- |
| `world-cup-2018-results.json` | 2018 semi-finals, third-place match, and final. | 4 |
| `world-cup-2022-results.json` | 2022 semi-finals, third-place match, and final. | 4 |

## Fixture Rules

Each match includes:

- `match_id`
- `tournament_year`
- `stage`
- `match_date`
- `home_team`
- `away_team`
- `home_score`
- `away_score`
- `result`
- `winner`
- `decided_by`
- `stage_order`
- `neutral_site`
- `source_note`

The files are intentionally small and manually reviewable. They are not complete tournament datasets and should not be used to claim model accuracy.

## Result Field Note

`result` follows the scoreline from the listed home-team perspective:

- `home_win`
- `draw`
- `away_win`

For knockout matches decided on penalties, the scoreline can still be a draw. The `winner` and penalty score fields identify the team that advanced or won the match.

## Winner Metadata

`winner` identifies the match winner when a knockout match requires more than scoreline result. `decided_by` can be:

- `regular_time`
- `extra_time`
- `penalties`

Penalty shootout scores are included only when `decided_by` is `penalties`.
