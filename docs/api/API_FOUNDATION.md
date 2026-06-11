# API Foundation

Phase 5.0 creates the first API boundary for World Cup 2026 Predictor.

This phase exposes pure TypeScript handler functions. It does not start an HTTP server and does not add a framework.

## Package

The API foundation lives in:

```txt
packages/api
```

## Handlers

| Handler | Purpose |
| --- | --- |
| `getHealth()` | Returns API package health metadata. |
| `getModelInfo()` | Returns model capability and limitation metadata. |
| `simulateMatch(request)` | Returns Poisson match probabilities and optional seeded Monte Carlo output. |
| `getHistoricalTournamentSummary(year)` | Returns curated historical tournament summary metadata for supported years. |
| `getHistoricalReplayAudit()` | Returns historical replay audit readiness metadata and warnings. |

## Boundaries

The API package is intentionally small:

- No HTTP server.
- No FastAPI service.
- No Express server.
- No database.
- No dashboard.
- No external service calls.

Future phases can wrap these handlers with a real transport layer.
