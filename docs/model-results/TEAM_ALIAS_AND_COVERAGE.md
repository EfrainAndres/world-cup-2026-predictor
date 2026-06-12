# Team Alias And Coverage

Phase 7.3 improves live Elo match prediction by resolving common team aliases before looking up ratings.

## Alias Rules

The API supports these aliases:

| Input | Canonical name |
| --- | --- |
| Czech Republic | Czechia |
| Korea Republic | South Korea |
| South Korea | South Korea |
| USA | United States |
| USMNT | United States |
| IR Iran | Iran |
| Ivory Coast | Côte d'Ivoire |
| Cote d'Ivoire | Côte d'Ivoire |
| Netherlands | Netherlands |
| Holland | Netherlands |

Matching is case-insensitive, trims extra spaces, and uses simple accent-insensitive normalization.

## Coverage

`getAvailableLiveEloTeams()` exposes the canonical team names currently available from the live Elo pipeline. The dashboard shows this list in Auto Predict From Elo mode so users can see which teams can be predicted from the current partial dataset.

## Unavailable Teams

When a requested team is unavailable, `predictMatchFromLiveElo()` returns a validation error with:

- the unavailable field
- a clear message
- suggested available teams
- the full available team list

## Limits

Team aliases do not improve the underlying data coverage. Live Elo predictions still depend on partial curated match data and are not a public accuracy claim.
