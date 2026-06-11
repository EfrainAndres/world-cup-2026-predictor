# Live Team Ratings Integration

Phase 6.6 replaces the static `FOUNDATION_TEAM_RATINGS` constant from Phase 6.5 with a live API handler call, following the same pattern established in Phase 6.4 for tournament simulation.

## Purpose

Phase 6.5 used a static constant defined entirely in the web layer (`apps/web/src/lib/api-client.ts`) to supply team ratings data to the dashboard. Phase 6.6 moves that data into a proper API handler (`getTeamRatingsFoundation`) in `packages/api`, which is then called through the existing api-client wrapper pattern. This aligns team ratings with every other piece of data on the dashboard — sourced from the API package, consumed by the web client.

## What changed

### New API handler: `getTeamRatingsFoundation`

Added to `packages/api/src/routes.ts` and exported from `packages/api/src/index.ts`.

The handler returns a `TeamRatingsFoundationResponse` containing:

- `status: "success"`
- `teams` — 10 `TeamRatingFoundationEntry` objects, ranked by Elo rating descending.
- `ratingSource` — attribution note.
- `foundationWarning` — accuracy framing text.
- `strongestOffenseTeam` / `strongestOffenseScore` — precomputed from the team data.
- `strongestDefenseTeam` / `strongestDefenseScore` — precomputed from the team data.
- `averageEloRating` / `topEloRating` — summary stats.
- `warnings` — explicit data-quality caveats.
- `metadata` — standard `ApiMetadata` envelope (pure handlers, no server/database/external services).

The underlying team data (`TEAM_RATINGS_FOUNDATION_DATA`) is an internal constant in `routes.ts` — not exported.

### New schema types

Added to `packages/api/src/schemas.ts`:

- `TeamRatingTier` — `"Elite" | "Strong" | "Competitive"`
- `TeamRatingFoundationEntry` — per-team record with `rank`, `team`, `eloRating`, `tier`, `offenseStrength`, `defenseStrength`, `summary`
- `TeamRatingsFoundationResponse` — success envelope wrapping `teams` plus derived summary fields

All three are exported from `packages/api/src/index.ts`.

### Web API client

`apps/web/src/lib/api-client.ts`:

- Removed `TeamRatingTier`, `TeamRatingEntry`, `TeamRatingsFoundation` local type definitions.
- Removed `FOUNDATION_TEAM_RATINGS` static constant.
- Added `getTeamRatingsFoundation` to the function imports from `@world-cup-2026-predictor/api`.
- Added `TeamRatingFoundationEntry`, `TeamRatingTier`, `TeamRatingsFoundationResponse` to the type imports, and re-exports them so consumer code doesn't need to import from two places.
- `DashboardSnapshot.teamRatings` is now typed as `TeamRatingsFoundationResponse`.
- `getDashboardSnapshot()` calls `getTeamRatingsFoundation()` instead of referencing the static constant.

### UI components

`TeamRatingCard.tsx`:
- Import changed from `TeamRatingEntry, TeamRatingTier` (from `../lib/api-client`) to `TeamRatingFoundationEntry, TeamRatingTier` (from `@world-cup-2026-predictor/api`).
- Prop type updated from `TeamRatingEntry` to `TeamRatingFoundationEntry`.
- No JSX changes — field names are identical.

`TeamRatingsSection.tsx`:
- Import changed from `TeamRatingsFoundation` (from `../lib/api-client`) to `TeamRatingsFoundationResponse` (from `@world-cup-2026-predictor/api`).
- Prop type updated accordingly.
- No JSX changes — all fields accessed by the component exist on `TeamRatingsFoundationResponse` with the same names.

## Data

The team rating data is identical to Phase 6.5. The 10 entries (Argentina through Italy) are now owned by the API package rather than the web layer. No values changed.

## Accuracy framing

The response includes:

- `foundationWarning`: "These ratings are a static foundation for dashboard preview. They are not derived from a live model, official FIFA rankings, or recent match data."
- `warnings`: explicit array noting that ratings are curated seed values and strength scores are approximate.

These warnings are propagated through the API response and remain visible in the dashboard.

## Consistency check: strongest offense/defense

The `getTeamRatingsFoundation` tests verify that `strongestOffenseScore` and `strongestDefenseScore` match the maximum values in the `teams` array, and that the named teams actually hold those scores. This guards against future data edits that would make the precomputed fields inconsistent.

## Boundaries

Phase 6.6 does not add:

- A calibrated live ratings calculation.
- Integration with the historical fixture dataset.
- Charts or visual strength bars.
- Authentication, database, or deployment.
- New dependencies.

## Next steps

Future phases can:

- Replace `TEAM_RATINGS_FOUNDATION_DATA` in `routes.ts` with a live derivation from `processMatches` / `getCurrentTeamRatings` using the historical fixture data from `packages/data`.
- Expand to all 48 FIFA 2026 qualified teams.
- Add Elo trend (change since last tournament) once multi-year history snapshots are available.
- Expose `getTeamRatingsFoundation` via the HTTP adapter added in a future API server phase.
