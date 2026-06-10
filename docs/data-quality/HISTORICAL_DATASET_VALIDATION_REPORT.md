# Historical Dataset Validation Report

Phase 4.0H adds validation around complete historical World Cup fixtures for 2010, 2014, 2018, and 2022.

## Validation Strategy

Validation happens in `packages/data/src/historical-world-cup.ts` and is covered by deterministic Vitest tests in `packages/data/tests/historical-world-cup.test.ts`.

The validator checks each fixture file first, then can validate the complete multi-tournament dataset.

## Match Count Checks

| Check | Expected Value |
| --- | --- |
| Matches per tournament file | 64 |
| Supported tournament files | 2010, 2014, 2018, 2022 |
| Total historical matches | 256 |

These checks prevent future backtesting from accidentally running on partial fixture files.

## Field And Consistency Checks

The current validator checks:

- Required fields are present.
- Tournament year is supported.
- Stage is one of the normalized stage values.
- Stage order matches the stage.
- Teams are present and distinct.
- Scores are non-negative integers.
- Result matches the listed scoreline.
- Winner is one of the two teams, except valid group-stage draws where `winner` is `null`.
- Group-stage draws use `decided_by: "draw"`.
- Knockout scoreline draws have a winner and use `decided_by: "penalties"`.
- Penalty-decided matches include penalty scores.
- Non-penalty matches use `null` penalty scores.
- `source_note` is present.
- Match IDs are unique within a fixture and across the full dataset.

## Penalty And Winner Checks

Penalty shootouts are represented with:

- Drawn `home_score` and `away_score`.
- `result: "draw"`.
- `winner` set to the team that advanced or won the match.
- `decided_by: "penalties"`.
- Numeric `penalty_home_score` and `penalty_away_score`.

This is important for matches such as the 2022 final, where Argentina and France were level at 3-3 after extra time but Argentina won on penalties.

## Known Risks

- The dataset is manually curated, so factual review remains important.
- Row-level `source_note` values are concise by design.
- Venue, referee, attendance, and official match IDs are not modeled yet.
- Official tie-breaker reconstruction is not validated yet.
- The data is complete at fixture/result level, but not at player or probability-snapshot level.

## Reliability For Phase 4.0I

The dataset is now reliable enough for Phase 4.0I to produce real historical backtesting reports against complete fixture outcomes, provided those reports clearly document:

- The model version being evaluated.
- The prediction snapshot source.
- The data cutoff.
- Whether the report is match-level, tournament-level, or both.
- Any remaining calibration gaps.
