# World Cup 2026 Group Standings

Phase 10.4 adds a standings foundation for the expected World Cup 2026 group stage.

This is a local calculation over normalized result provider data. It is not a live score service and does not add knockout brackets or full tournament simulation.

## API Handler

`getWorldCup2026GroupStandingsFoundation()` exposes:

- 12 groups.
- 48 teams.
- 4 standings entries per group.
- completed fixture count.
- pending fixture count.
- per-team points, played, wins, draws, losses, goals for, goals against, and goal difference.
- `resultProvider` metadata describing the current local static result source.
- warnings explaining that standings are local foundation data.

## Result Provider

Phase 10.4A separates fixture structure from fixture results.

The standings engine consumes normalized result records with:

- `fixtureId`
- `status`
- optional `homeScore`
- optional `awayScore`
- `resultSource`
- optional `updatedAt`

The current source is the local static provider:

- `providerName`: `local static provider`
- `resultSource`: `local_static`
- `externalProviderEnabled`: `false`
- `localOverridesEnabled`: `true`
- `dataUpdatedAt`: `2026-06-14`

This keeps the standings engine ready for future `manual_override` or `external_api` records without changing the table calculation.

## Calculation Rules

Scheduled fixtures do not affect standings.

Completed normalized result records update both teams:

- Win: 3 points to the winner.
- Draw: 1 point to both teams.
- Loss: 0 points.
- Goals for and goals against update from the completed score.
- Goal difference is `goalsFor - goalsAgainst`.

## Sorting

Standings sort by:

1. points
2. goal difference
3. goals for
4. team name as a deterministic fallback

Full FIFA tie-break rules are deferred to a future phase.

## Current Data Status

The current local static provider includes eight completed results:

| Match | Score |
| --- | --- |
| Mexico vs South Africa | 2-0 |
| South Korea vs Czechia | 2-1 |
| Canada vs Bosnia-Herzegovina | 1-1 |
| United States vs Paraguay | 4-1 |
| Qatar vs Switzerland | 1-1 |
| Brazil vs Morocco | 1-1 |
| Haiti vs Scotland | 0-1 |
| Australia vs Turkey | 2-0 |

All remaining group fixtures are scheduled and ignored by standings until completed result records are present.

API tests use normalized result records to prove win, draw, goal-difference, goals-for, scheduled-ignore, and ordering behavior.

## Dashboard Section

The dashboard now includes `WorldCupStandingsSection` near the groups and fixtures section.

It displays:

- "World Cup 2026 Group Standings"
- foundation standings summary
- completed and pending fixture counts
- result provider and external-provider status
- one compact table per group
- columns for Team, Pts, P, W, D, L, GF, GA, and GD
- the note: "Standings are calculated from local normalized results. Scheduled matches are ignored."

## Boundaries

- No external API calls.
- No live score service.
- No secrets.
- No knockout bracket.
- No standings prediction.
- No changes to Elo formulas.
- No changes to match prediction formulas.
