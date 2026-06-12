# Live Elo Dashboard Integration

Phase 7.1 adds a dashboard section for the live Elo API foundation.

## What It Shows

The dashboard now displays:

- top live Elo teams
- rank
- Elo rating
- matches played by each team in the current local pipeline
- total matches processed
- total teams rated
- latest match date
- data coverage and data scope
- live Elo warnings

The section uses `getLiveEloRatingsFoundation()` through `apps/web/src/lib/api-client.ts`. Components do not call model or data packages directly.

## Warnings

The UI keeps the main data limitations visible:

| Warning | Meaning |
| --- | --- |
| Partial international history | The current data covers selected competitions and dates only. |
| Curated sample only | The expanded international supplement is manually selected and lightweight. |
| Not complete global match history | The dataset is not a full senior international match database. |

The section also shows the required note: “Live Elo is based on partial curated data and is not a public accuracy claim.”

## Boundaries

- No charts.
- No new dependencies.
- No auth, database, or deployment.
- No API/model/data refactor.
- No public accuracy claim.

## Next Steps

Future dashboard work can add filtering, trend views, and comparison states after the data foundation grows beyond partial curated samples.
