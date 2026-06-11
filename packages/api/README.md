# API Package

`packages/api` contains the Phase 5.0 API foundation for World Cup 2026 Predictor.

This package exposes pure TypeScript handler functions and a lightweight HTTP-ready runtime adapter. It does not start an HTTP server, connect to a database, call external services, or create dashboard UI.

## Handlers

| Handler | Purpose |
| --- | --- |
| `getHealth()` | Returns deterministic API package health metadata. |
| `getModelInfo()` | Returns model capability and limitation metadata. |
| `simulateMatch(request)` | Generates Poisson outcome probabilities and optional seeded Monte Carlo match simulation from caller-supplied expected goals. |
| `getHistoricalTournamentSummary(year)` | Returns curated historical tournament summary metadata for 2010, 2014, 2018, or 2022. |
| `getHistoricalReplayAudit()` | Returns historical replay audit readiness metadata and warnings. |
| `getLiveEloRatingsFoundation()` | Computes live foundation Elo ratings from curated World Cup fixtures plus the expanded partial international supplement. |

## Runtime

The Phase 5.2 runtime adapter exposes the handlers through local `Request`/`Response` routing:

| Method | Path |
| --- | --- |
| `GET` | `/health` |
| `GET` | `/model-info` |
| `POST` | `/simulate-match` |
| `GET` | `/historical/:year` |
| `GET` | `/historical-replay-audit` |

Use `apiRuntime.fetch(request)` or `createApiRuntime()` in tests and future server adapters. The runtime does not open a network port.

## Boundaries

- No HTTP server.
- No FastAPI service.
- No Express server.
- No database.
- No external services.
- No dashboard.
- No public predictive accuracy claim.
- No runtime framework dependency.

## Live Elo Data

The live Elo foundation processes 256 curated World Cup fixtures and uses an Elo-compatible static mirror of `packages/data/fixtures/international/expanded-international-matches.json` for the supplement. The expanded fixture currently contains 56 manually curated matches and is still labeled with partial-history warning codes.

The API preserves the previous inline international supplement as fallback behavior. No network, filesystem access during dashboard bundling, database, or external services are used.

## Validation

The package includes unit-style handler tests and integration-style validation through `apiRoutes`.

Integration validation covers:

- Health and model metadata.
- Valid and invalid match simulation requests.
- Optional seeded Monte Carlo simulation.
- Historical tournament summary success and validation errors.
- Historical replay audit readiness metadata.
- Stable success and error response shapes.
- No server, database, network, or external service requirements.

Endpoint validation covers:

- Runtime status codes.
- JSON response shapes.
- Validation error shapes.
- Supported historical year endpoints.
- Unsupported route and method errors.
- Deterministic seeded simulation responses.

See `docs/api/API_INTEGRATION_VALIDATION.md` for the validation scope.
See `docs/api/API_RUNTIME_FOUNDATION.md` for the runtime boundary.
See `docs/api/API_ENDPOINT_VALIDATION.md` for endpoint-level runtime validation.

## Commands

From the repository root:

```bash
pnpm test
pnpm typecheck
pnpm build
```
