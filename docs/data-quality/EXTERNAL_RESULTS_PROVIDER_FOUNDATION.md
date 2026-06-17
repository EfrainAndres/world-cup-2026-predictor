# External Results Provider Foundation

## Purpose

Phase 12.4 adds a provider-agnostic foundation for World Cup 2026 fixtures, live matches, completed results, and standings without connecting a real external API yet.

The project remains deterministic by default:

1. try external provider contract
2. fall back to in-memory cache when available
3. fall back to local static data when external and cache are unavailable

## Provider Contracts

The new foundation defines typed provider-facing records for:

- fixtures
- live matches
- completed results
- standings
- provider errors
- sync timestamps
- fallback metadata

Key fields include:

- `providerFixtureId`
- `competition`
- `season`
- optional `stage`, `group`, `matchday`, `kickoffAt`, `venue`
- canonical `homeTeam` and `awayTeam`
- normalized status
- optional scores
- optional `updatedAt`

## Implemented Providers

### LocalStaticResultsProvider

Default deterministic provider built from the existing World Cup 2026 fixture and result foundation.

It:

- wraps the current 72 fixture structure
- exposes the existing 8 completed local results
- returns no live matches
- derives standings through the existing standings builder

### ExternalApiResultsProvider

Foundation stub only.

It does not:

- make network calls
- use API keys
- read environment variables

It returns a typed `provider_disabled` error for every operation.

### CachedResultsProvider

In-memory wrapper around another provider.

It:

- caches the last successful response per operation
- returns cached data when the wrapped provider later fails
- preserves upstream failure metadata so failures are visible

It does not persist to disk or a database.

## Fallback Chain

The orchestration path is:

1. attempt external provider
2. if the wrapped cache has prior valid data, use cached data
3. if not, use local static fallback

The response exposes:

- `attemptedProvider`
- `activeProvider`
- `cacheUsed`
- `localFallbackUsed`
- `externalProviderEnabled`
- `lastSuccessfulSync`
- `warnings`
- typed `error`
- non-fatal `normalizationIssues`

Provider failures are not silently hidden.

## Normalization Rules

Normalization is pure and deterministic.

Current rules:

- canonicalize team names through existing alias helpers
- preserve official home/away order
- normalize supported statuses to:
  - `scheduled`
  - `live`
  - `halftime`
  - `finished`
  - `postponed`
  - `cancelled`
  - `unknown`
- convert unsupported statuses to `unknown` and record a typed normalization issue
- reject duplicate `providerFixtureId` values
- reject finished matches without non-negative integer scores
- allow scheduled matches without scores
- avoid inventing missing date, venue, group, or matchday metadata

## Typed Errors

The foundation uses typed error codes instead of unstructured strings:

- `provider_disabled`
- `provider_unavailable`
- `invalid_provider_response`
- `duplicate_fixture_id`
- `unsupported_match_status`
- `stale_cache_unavailable`
- `normalization_failure`

## Current Default Behavior

Phase 12.4 still resolves to local static data by default because the external provider is intentionally disabled and the cache starts empty.

That means:

- no live polling
- no provider credentials
- no environment variables
- no database
- no persistent cache
- no live standings UI

## Standings Compatibility

The standings engine was not rewritten.

Normalized provider results can be converted back into the existing `WorldCup2026FixtureResult` input shape, and local-static provider results produce numerically identical standings to the current production handler.

## Future Work

Phase 12.5 can build on this foundation by adding:

- real provider adapters
- credential and environment-variable handling
- live synchronization behavior
- freshness windows
- retry rules
- stale-data warnings

None of that is implemented in Phase 12.4.
