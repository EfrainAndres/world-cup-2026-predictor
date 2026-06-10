# World Cup Fixture Fixtures

This directory contains curated historical FIFA World Cup fixture results for deterministic tests and future backtesting.

## Included Files

| File | Scope | Match Count |
| --- | --- | --- |
| `world-cup-2010-results.json` | Complete 2010 tournament from group stage through final. | 64 |
| `world-cup-2014-results.json` | Complete 2014 tournament from group stage through final. | 64 |
| `world-cup-2018-results.json` | Complete 2018 tournament from group stage through final. | 64 |
| `world-cup-2022-results.json` | Complete 2022 tournament from group stage through final. | 64 |

Total fixture records: **256**.

## Fixture Rules

Each match includes:

- `match_id`
- `tournament_year`
- `stage`
- `stage_order`
- `match_date`
- `home_team`
- `away_team`
- `home_score`
- `away_score`
- `result`
- `winner`
- `decided_by`
- `penalty_home_score`
- `penalty_away_score`
- `neutral_site`
- `source_note`

## Result Field Note

`result` follows the scoreline from the listed home-team perspective:

- `home_win`
- `draw`
- `away_win`

For knockout matches decided on penalties, the listed match score can still be a draw. The `winner` and penalty score fields identify the team that advanced or won the match.

## Winner Metadata

`winner` identifies the match winner or advancing team. For group-stage draws, `winner` is `null`.

`decided_by` can be:

- `regular_time`
- `extra_time`
- `penalties`
- `draw`

Penalty shootout scores are numbers only when `decided_by` is `penalties`; otherwise they are `null`.

## Source Notes

The fixtures are manually curated from public result references. See `docs/data-quality/HISTORICAL_DATASET_SOURCES.md` for source guidance and verification expectations.
