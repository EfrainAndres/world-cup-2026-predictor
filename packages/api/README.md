# API Package

`packages/api` contains the Phase 5.0 API foundation for World Cup 2026 Predictor.

This package exposes pure TypeScript handler functions only. It does not start an HTTP server, connect to a database, call external services, or create dashboard UI.

## Handlers

| Handler | Purpose |
| --- | --- |
| `getHealth()` | Returns deterministic API package health metadata. |
| `getModelInfo()` | Returns model capability and limitation metadata. |
| `simulateMatch(request)` | Generates Poisson outcome probabilities and optional seeded Monte Carlo match simulation from caller-supplied expected goals. |
| `getHistoricalTournamentSummary(year)` | Returns curated historical tournament summary metadata for 2010, 2014, 2018, or 2022. |
| `getHistoricalReplayAudit()` | Returns historical replay audit readiness metadata and warnings. |

## Boundaries

- No HTTP server.
- No FastAPI service.
- No Express server.
- No database.
- No external services.
- No dashboard.
- No public predictive accuracy claim.

## Commands

From the repository root:

```bash
pnpm test
pnpm typecheck
pnpm build
```
