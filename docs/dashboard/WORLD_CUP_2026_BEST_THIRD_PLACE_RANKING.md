# World Cup 2026 Best Third-Place Ranking

Phase 10.5 adds a best third-place ranking foundation for the World Cup 2026 dashboard and API.

This is not an official ranking. It is a deterministic foundation view derived from current local group standings.

## Tournament Context

In the FIFA World Cup 2026 format, 8 of the 12 third-place teams advance to the Round of 32. The top 8 are determined by comparing third-place finishers across all groups using standard FIFA tiebreaker criteria.

This phase ranks all 12 third-place teams and marks the top 8 as currently qualifying based on local standing data.

## API Handler

`getWorldCup2026BestThirdPlaceFoundation()` exposes:

- All 12 third-place teams with their current stats (Pts, GD, GF).
- Qualification status for each team: `"currently_qualifies"` or `"currently_outside"`.
- The qualifying cutoff threshold.
- Source metadata showing the ranking is based on current local standings.
- Warning text that results are pending and the ranking may change.

## Ranking Rules

Teams are ranked by:

1. Points.
2. Goal difference.
3. Goals for.
4. Team name (tiebreaker for determinism).

The top 8 teams are marked as currently qualifying; the remaining 4 are marked as currently outside.

## Dashboard Section

The dashboard includes `WorldCupBestThirdPlaceSection` showing:

- "World Cup 2026 Best Third-Place Ranking" heading.
- "Top 8 qualify" and "Bottom 4 outside" counts.
- A table of all 12 third-place teams with rank, team, Pts, GD, GF, and qualification status.
- "Currently qualifies" and "Currently outside" labels.
- A source note identifying the local-standings data origin.

## Warning

The API and dashboard display this warning:

> Best third-place ranking is based on current local standings. Pending group-stage fixtures may change qualification.

## Boundaries

- Not an official FIFA ranking.
- Based only on local static result records from the results provider.
- No Round of 32 fixture mapping in this phase.
- No champion probability changes.
- No external API calls.
- No Elo or xG formula changes.
