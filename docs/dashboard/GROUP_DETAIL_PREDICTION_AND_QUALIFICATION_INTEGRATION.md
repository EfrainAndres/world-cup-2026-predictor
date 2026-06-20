# Group Detail Prediction & Qualification Integration

**Phase:** 12.13C  
**Status:** Complete

## Overview

Extends each group detail page (`/groups/[group]`) with an optional projected view that combines completed official results with stored or auto-predicted outcomes for unplayed fixtures. The projection is read-only: it never mutates official standings, creates snapshots, or uses live scores as final results.

## Projection Shape

### `WorldCup2026GroupProjection`

```ts
{
  available: boolean;
  status: "complete" | "partial" | "unavailable";
  standings?: readonly WorldCup2026GroupStandingEntry[];
  qualification?: WorldCup2026GroupProjectionQualification;
  fixtures: readonly WorldCup2026GroupProjectionFixture[];
  warnings: readonly string[];
}
```

- **available**: `false` only when every unplayed fixture is unprojectable.
- **status**: `complete` if all unplayed fixtures are covered; `partial` if some are not; `unavailable` if none are.
- **standings**: projected final standings using actual scores for completed fixtures and projected scorelines for unplayed ones.
- **qualification**: projected 1st / 2nd / 3rd place, including whether the 3rd place is projected to qualify as best third (via `buildWorldCup2026BestThirdPlaceRanking`).
- **fixtures**: only **unplayed** fixtures — completed and live fixtures are never included.

### `WorldCup2026GroupProjectionFixture`

```ts
{
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  source: "stored_snapshot" | "auto_predict" | "unavailable";
  projectedScoreline?: { homeGoals: number; awayGoals: number };
  homeWinProbability?: number;
  drawProbability?: number;
  awayWinProbability?: number;
  confidenceLevel?: PredictionConfidenceLevel;
  coverageType?: PredictionCoverageType;
  warnings: readonly string[];
}
```

## Prediction Precedence

For each unplayed group-stage fixture, in order:

1. **Stored snapshot** — most recent `pre_match_locked` or `foundation_unverified` snapshot from `PredictionSnapshotStore.getByFixtureId()`, sorted by `capturedAt` descending.
2. **Auto Predict** — `predictorFn(homeTeam, awayTeam)` with `preset: "balanced"` (wired in `routes.ts` via `predictMatchFromLiveElo`).
3. **Unavailable** — contributes a projection fixture with `source: "unavailable"` and a warning.

Postponed and cancelled fixtures are excluded entirely from the projection (with a warning each).

## Scoreline Selection

`selectBestProjectionScoreline()` picks the scoreline with the highest probability from `mostLikelyScorelines`. On ties it prefers the lower home goals count, then lower away goals.

## Circular Import Resolution

`group-detail.ts` cannot import `predictMatchFromLiveElo` directly from `routes.ts` (circular). Instead:

- `BuildWorldCup2026GroupDetailInput` accepts an optional `predictorFn?: (homeTeam, awayTeam) => PredictMatchFromLiveEloResponse`.
- `routes.ts` exports `getWorldCup2026GroupDetail` as a proper async wrapper that passes `predictMatchFromLiveElo` as the predictor.
- `buildWorldCup2026GroupDetail` (pure, testable) receives the predictor as a callback.

## UI Component: `GroupDetailProjection`

Located at `apps/web/src/components/GroupDetailProjection.tsx`.

- Shows a status badge: **Complete projection** (teal), **Partial projection** (amber), or **Unavailable** (slate).
- Renders projected standings via `GroupDetailStandingsTable`.
- Shows projected qualification (1st / 2nd / 3rd) with third-place best-third note.
- Lists per-fixture source labels: **Stored prediction** (teal), **Auto Predict** (blue), **Unavailable** (slate).
- Each fixture shows projected scoreline, outcome probabilities (H/D/A), confidence level and coverage type.
- Fixture-level and projection-level warnings are shown inline.
- Placed immediately after the official qualification section on the group detail page.

## Files Changed

| File | Change |
|---|---|
| `packages/api/src/schemas.ts` | Added `WorldCup2026GroupProjection*` types; added `projection` to `WorldCup2026GroupDetailSuccessResponse` |
| `packages/api/src/group-detail.ts` | Added `predictorFn` to `BuildWorldCup2026GroupDetailInput`; implemented `buildGroupProjection()`; added `selectBestProjectionScoreline()` |
| `packages/api/src/routes.ts` | Replaced re-export with proper async wrapper that passes `predictMatchFromLiveElo` as `predictorFn` |
| `packages/api/src/index.ts` | Added projection type exports |
| `apps/web/src/lib/api-client.ts` | Added projection type imports and re-exports |
| `apps/web/src/components/GroupDetailProjection.tsx` | New component |
| `apps/web/app/groups/[group]/page.tsx` | Added `<GroupDetailProjection>` section |
| `packages/api/tests/group-detail.test.ts` | 9 new projection unit tests; updated contract test |
| `packages/api/tests/api-contracts.test.ts` | Updated contract key list to include `projection` |
| `apps/web/src/components/GroupDetailProjection.test.tsx` | 12 new component tests |
| `apps/web/tests/e2e/group-detail.spec.ts` | 8 new E2E projection tests; updated mock helper |

## Invariants

- Official standings are never mutated.
- No snapshots are created or modified.
- Live scores are never used as final projected results.
- Completed fixtures never appear in `projection.fixtures`.
- Projection is always present in the API response (`available: false` when no predictor or all unavailable).
