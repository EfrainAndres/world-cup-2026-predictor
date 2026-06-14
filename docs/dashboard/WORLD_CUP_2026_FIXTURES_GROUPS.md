# World Cup 2026 Fixtures & Groups

Phase 10.3 adds local foundation data for the expected World Cup 2026 group structure and group-stage fixtures.

This is tournament structure data only. It does not simulate standings, knockout qualification, full tournament outcomes, real-time scores, dates, or venues.

## API Handler

`getWorldCup2026FixtureFoundation()` exposes:

- 12 groups.
- 48 teams.
- 72 group-stage fixtures.
- 6 fixtures per group.
- 3 group fixtures per team.
- Deterministic fixture IDs.
- Fixture status (`scheduled` by default; completed scores are modeled as separate normalized result records).
- Deferred date and venue status.
- Foundation warnings explaining that this is static local structure data.

## Fixture Rules

Each four-team group uses the same deterministic pairing template:

| Matchday | Fixtures |
| --- | --- |
| 1 | Team 1 vs Team 2, Team 3 vs Team 4 |
| 2 | Team 1 vs Team 3, Team 2 vs Team 4 |
| 3 | Team 1 vs Team 4, Team 2 vs Team 3 |

The API tests verify that each group contains each unique team pair exactly once and that each team appears in exactly three group fixtures.

## Dashboard Section

The dashboard now includes `WorldCupGroupsSection` before the tournament simulation section.

It displays:

- "World Cup 2026 Groups & Fixtures"
- "Foundation tournament structure"
- "12 groups"
- "72 group fixtures"
- "48 teams"
- all Groups A-L
- four teams per group
- six group fixtures per group
- the note: "This section shows local curated tournament structure data. Standings and full tournament simulation are planned next."

## Boundaries

- No standings simulation.
- No full tournament simulation from these fixtures yet.
- No real-time scores.
- No dates or venues beyond deferred metadata.
- No external API calls.
- No changes to prediction formulas, Elo ratings, or match simulation behavior.

## Next Steps

Future phases can use this foundation to add:

- group standings simulation
- third-place qualification logic against the real 2026 format
- Round of 32 fixture mapping
- full tournament simulation using match-level probabilities
