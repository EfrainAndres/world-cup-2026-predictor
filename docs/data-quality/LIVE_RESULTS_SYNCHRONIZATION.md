# Live Results Synchronization

## Purpose

Phase 12.5 adds the first real external provider adapter and a synchronization orchestration function on top of the provider-agnostic foundation from Phase 12.4.

The core capability is `synchronizeWorldCup2026Results()`, which selects the active provider based on environment configuration, fetches and normalizes data if an external provider is configured, runs the fallback chain, and returns a typed sync result with freshness metadata and explicit warnings.

## What Was Added

### `createFootballDataOrgResultsProvider(config)`

An async factory that:

- fetches all matches and standings from the football-data.org v4 API
- normalizes raw API responses into `WorldCup2026ExternalFixtureRecord[]` and `WorldCup2026ExternalStandingRecord[]`
- maps football-data.org status values to normalized statuses:
  - `FINISHED` → `finished`
  - `IN_PLAY` → `live`
  - `PAUSED` → `halftime`
  - `SCHEDULED` or `TIMED` → `scheduled`
  - `POSTPONED` → `postponed`
  - `SUSPENDED` or `CANCELLED` → `cancelled`
  - any other value → `unknown`
- strips the `GROUP_` prefix from group names (`GROUP_A` → `A`)
- accepts a dependency-injected `fetch` function for full testability without real network calls
- returns a synchronous `WorldCup2026FootballResultsProvider` backed by pre-fetched data
- returns a failing provider if the HTTP request fails, throws, or returns invalid JSON

### `synchronizeWorldCup2026Results(input?)`

An async orchestration function that:

- reads `RESULTS_PROVIDER`, `FOOTBALL_DATA_API_TOKEN`, `FOOTBALL_DATA_COMPETITION_CODE`, and `FOOTBALL_DATA_SEASON` from environment variables
- uses injected `input` fields to override any env var at call time
- returns local static data immediately when `RESULTS_PROVIDER` is not `football_data_org`
- returns an error sync result with local fallback data when `FOOTBALL_DATA_API_TOKEN` is missing
- creates the football-data.org provider, wraps it with the in-memory cache, and applies the local static fallback chain when the external provider is configured
- returns a `WorldCup2026SyncResult` with:
  - `status`: `"success"` or `"error"`
  - `providerMode`: `"football_data_org"` or `"local_static"`
  - `activeProvider`: which provider served the data
  - `cacheUsed`: whether the in-memory cache served the response
  - `localFallbackUsed`: whether local static data was used instead of external data
  - `externalProviderEnabled`: whether the external provider was attempted
  - `syncedAt`: ISO timestamp of this synchronization attempt
  - `lastSuccessfulSync`: ISO timestamp from the most recent successful provider response, if available
  - normalized `fixtures`, `liveMatches`, `completedResults`, and `standings`
  - `normalizationIssues` and `warnings`
  - optional typed `error`

## Security Rules

- The API token is a server-only secret. Never use `NEXT_PUBLIC_FOOTBALL_DATA_API_TOKEN`.
- The token is never included in log output, warnings, or error messages.
- The token is never passed to any client-side code path.
- The `.env` file is gitignored. Use `.env.example` to document variable names with safe placeholder values.

## Fallback Chain

```
RESULTS_PROVIDER=football_data_org

  football-data.org API
       │
       ▼ (on failure)
  In-memory cache (prior successful response)
       │
       ▼ (on failure or empty cache)
  Local static provider (deterministic, always available)
```

When `RESULTS_PROVIDER` is absent or set to anything other than `football_data_org`, the sync function uses the local static provider directly without attempting any external request.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `RESULTS_PROVIDER` | `local` | `local` uses local static data only. `football_data_org` activates live sync. |
| `FOOTBALL_DATA_API_TOKEN` | (none) | API token for football-data.org. Required when `RESULTS_PROVIDER=football_data_org`. |
| `FOOTBALL_DATA_COMPETITION_CODE` | `WC` | Competition code used in API URL path. |
| `FOOTBALL_DATA_SEASON` | `2026` | Season year used as a query parameter. |

## Testability

`createFootballDataOrgResultsProvider` accepts a `fetch` dependency in its config. Tests pass a `vi.fn()` mock fetch that returns shaped API response fixtures. No real network calls are made in any test.

`synchronizeWorldCup2026Results` accepts an optional `fetch` input for the same reason.

The full test suite for this module is in `packages/api/tests/live-results-sync.test.ts` with 30+ scenarios covering:

- status mapping for all known football-data.org status values
- group name normalization
- fixture splitting into live/completed/all
- standings mapping and HOME/AWAY group filtering
- HTTP error handling
- network failure handling
- invalid JSON handling
- token not appearing in any output
- local mode behavior
- missing token fallback
- cache warm-up and re-use
- provider mode selection
- timestamp presence and validity
- alias normalization applied to provider data

## API Endpoints Used

| Operation | Endpoint |
| --- | --- |
| All fixtures and results | `GET /v4/competitions/{code}/matches?season={year}` |
| Group standings | `GET /v4/competitions/{code}/standings?season={year}` |

Header: `X-Auth-Token: {token}`

## Current Limitations

- No polling or scheduled refresh. `synchronizeWorldCup2026Results` must be called explicitly.
- No database persistence. The in-memory cache is lost when the process restarts.
- No webhook or push mechanism. Live scores require polling to detect changes.
- Live standings UI is not implemented. Phase 12.6 will add live standings to the dashboard.
- No Elo ingestion from completed results. Phase 12.7 will process completed tournament results into ratings.

## Future Work

Phase 12.6 adds live group standings computed from the synchronized results.
Phase 12.7 adds idempotent Elo ingestion from completed World Cup match results.
Phase 12.14 adds automatic projection refresh triggered by live result processing.
