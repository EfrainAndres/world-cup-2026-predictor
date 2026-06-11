# API Runtime Foundation

Phase 5.2 adds an HTTP-ready runtime adapter around the existing pure API handlers.

## Purpose

The runtime foundation maps local `Request` objects to API handler calls and returns JSON `Response` objects. It gives the project a route-shaped boundary before adding a real server, deployment target, authentication layer, database, or dashboard.

## Runtime Style

The runtime uses standard Web `Request` and `Response` primitives. No framework dependency was added in this phase.

Hono remains a reasonable future option, but adding it would require package metadata and lockfile changes. The current adapter stays small enough to validate route behavior without introducing dependency churn.

## Routes

| Method | Path | Handler |
| --- | --- | --- |
| `GET` | `/health` | `getHealth()` |
| `GET` | `/model-info` | `getModelInfo()` |
| `POST` | `/simulate-match` | `simulateMatch(request)` |
| `GET` | `/historical/:year` | `getHistoricalTournamentSummary(year)` |
| `GET` | `/historical-replay-audit` | `getHistoricalReplayAudit()` |

## Error Handling

The runtime returns JSON for success and failure responses.

Validation failures use:

```json
{
  "status": "validation_error",
  "issues": [],
  "metadata": {}
}
```

Runtime routing failures use:

```json
{
  "status": "error",
  "error": {
    "code": "not_found",
    "message": "..."
  },
  "metadata": {}
}
```

Unsupported methods return `405`. Missing paths return `404`. Invalid request bodies return `400`.

## Testing Boundary

Runtime tests inject local `Request` objects directly into the adapter. They do not open a network port, start a server, connect to a database, call external services, or download data.

## What This Does Not Add

This phase does not add:

- Express, Fastify, Hono, or FastAPI.
- A production server process.
- Authentication.
- PostgreSQL or any other database.
- Dashboard or UI code.
- New predictive accuracy claims.
