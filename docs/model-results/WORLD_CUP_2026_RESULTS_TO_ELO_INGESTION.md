# World Cup 2026 Results-to-Elo Ingestion

## Overview

Phase 12.7 adds `ingestWorldCup2026ResultsIntoLiveElo`, a pure service that applies completed World Cup 2026 match results to the live Elo pipeline. This produces tournament-adjusted team ratings that reflect actual on-pitch results alongside the historical pre-tournament baseline.

## Design Goals

- **Deterministic**: same inputs always produce the same outputs
- **Chronological**: matches are applied in kickoff order, undated records last
- **Idempotent**: each fixture is processed at most once, regardless of how many times it appears in the input
- **Look-ahead-free**: an optional `cutoffAt` timestamp excludes future matches
- **Auditable**: every accepted fixture produces a `WorldCup2026EloIngestionRecord` entry

## Data Flow

```
Local Static Results (WorldCup2026ExternalFixtureRecord[])
      │
      ▼
Reject non-finished records ──► issues: record_rejected_non_finished
      │
      ▼
Filter missing scores ──────────► issues: score_missing
      │
      ▼
Cutoff check (kickoffAt < cutoffAt) ──► issues: cutoff_exceeded
      │
      ▼
Fixture identity resolution:
  1. By providerFixtureId (internal fixture ID match)
  2. By normalized homeTeam|awayTeam (case/punctuation-insensitive)
        │
        └── not found ──────────► issues: fixture_not_found
      │
      ▼
Idempotency check (fixture already in ledger) ──► issues: duplicate_skipped
      │
      ▼
Build EloMatch (competition: "FIFA World Cup", neutralSite: true)
      │
      ▼
updateRatingsAfterMatch(ratings, eloMatch, DEFAULT_ELO_CONFIG)
      │
      ▼
Thread updated ratings through next match (sequential, chronological)
      │
      ▼
Return WorldCup2026EloIngestionResult
```

## Fixture Identity Resolution

The ingestion service builds two indexes from `WORLD_CUP_2026_GROUP_STAGE_FIXTURES`:

| Index | Key | Use |
|-------|-----|-----|
| `byId` | fixture.id (e.g., `wc2026-group-a-md1-01-mexico-vs-south-africa`) | Matched against `record.providerFixtureId` |
| `byTeams` | `normalize(homeTeam)\|normalize(awayTeam)` (both orderings) | Fuzzy canonical lookup |

Normalization uses `normalizeTeamSearchText(canonicalizeTeamName(name))` — lowercased, alphanumeric only — so "Bosnia & Herzegovina", "Bosnia-Herzegovina", and "bosnia herzegovina" all resolve to the same fixture.

## Idempotency Ledger

Each processed record produces a `WorldCup2026EloIngestionRecord`:

```typescript
interface WorldCup2026EloIngestionRecord {
  fixtureId: string;         // canonical internal fixture ID
  providerFixtureId?: string;
  processedAt: string;       // ISO timestamp
  kickoffAt?: string;
  homeTeam: string;          // canonical team name from internal fixture
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}
```

The ledger is keyed by `fixtureId`. Callers can persist the `processedRecords` array and pass it back as `previouslyProcessed` to prevent re-processing across invocations.

## Look-Ahead Protection

`isBeforeCutoff(kickoffAt, cutoffAt)` returns:
- `true` if `cutoffAt` is undefined (no cutoff, accept all)
- `true` if `kickoffAt` is undefined (undated records are accepted)
- `true` if `kickoffAt < cutoffAt` (strict ISO string comparison)
- `false` otherwise (record excluded)

## Elo Integration

- Reuses existing `updateRatingsAfterMatch(ratings, match, config)` from `packages/model`
- No formula changes; `DEFAULT_ELO_CONFIG` (K=20, initial=1500) applies
- WC2026 matches use `competition: "FIFA World Cup"`, `neutralSite: true`
- Baseline ratings are taken from the live Elo pipeline output (historical WC+supplement)
- Teams not in baseline default to `DEFAULT_ELO_CONFIG.initialRating` (1500)

## Prediction Integration

`predictMatchFromLiveElo` accepts an optional opt-in:

```typescript
tournamentResultsAdjustment?: {
  enabled: boolean;
  cutoffAt?: string;
}
```

When `enabled: true`, the handler:
1. Runs the baseline pipeline
2. Calls `ingestWorldCup2026ResultsIntoLiveElo` with local static results
3. Overrides `worldCupCoverageEntries` eloRatings with adjusted values
4. Adds `tournamentAdjustment: { applied: true, matchesIncluded: N }` to the response
5. Updates `currentTournamentMatchesIncluded` in confidence provenance

## API Handler

`getWorldCup2026EloIngestionFoundation()` runs the full ingestion foundation using local static results and returns:

```typescript
interface WorldCup2026EloIngestionFoundationResponse {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_elo_ingestion_foundation";
  ingestion: WorldCup2026EloIngestionResult;
  warnings: readonly string[];
  metadata: ApiMetadata;
}
```

## Security

- No API tokens, environment variables, or external HTTP calls in this path
- All inputs are local static data in foundation mode
- `cutoffAt` is a plain ISO string; no user input reaches Elo formula

## Limitations

- Group-stage fixtures only (144 fixtures across Groups A–L)
- No knockout match ingestion in Phase 12.7
- No live/halftime ingestion; `status === "finished"` only
- No automatic provider polling; ingestion is on-demand and pure
- Elo formula unchanged; K-factor inherently bounds rating swings per match

## Files Changed

| File | Change |
|------|--------|
| `packages/api/src/schemas.ts` | New ingestion types; updated `PredictMatchFromLiveEloRequest` and `PredictMatchFromLiveEloSuccessResponse`; `getWorldCup2026EloIngestionFoundation` in `ApiRoutes` |
| `packages/api/src/elo-ingestion.ts` | New file — core ingestion service and `isBeforeCutoff` helper |
| `packages/api/src/routes.ts` | `getWorldCup2026EloIngestionFoundation` handler; `predictMatchFromLiveElo` tournament adjustment |
| `packages/api/src/model-info.ts` | Added handler to `supportedHandlers` and `modelScope` |
| `packages/api/src/index.ts` | Exports for new function, types |
| `packages/api/tests/elo-ingestion.test.ts` | New — 36 unit tests |
| `packages/api/tests/api-contracts.test.ts` | Updated `supportedHandlers` |
| `packages/api/tests/api-integration.test.ts` | Updated `supportedHandlers` |
| `packages/api/tests/endpoint-validation.test.ts` | Updated `supportedHandlers` |
