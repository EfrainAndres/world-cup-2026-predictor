# API Endpoint Validation

Phase 5.3 validates the API runtime as HTTP-shaped endpoints before adding a real server, dashboard, database, or external services.

## Purpose

Endpoint validation checks the runtime from the outside: method, path, status code, JSON content type, response shape, error shape, and deterministic behavior. Tests still inject local `Request` objects directly into the runtime, so no network listener is started.

## Validated Endpoints

| Method | Path | Expected Status |
| --- | --- | --- |
| `GET` | `/health` | `200` |
| `GET` | `/model-info` | `200` |
| `POST` | `/simulate-match` | `200` for valid requests, `400` for validation errors |
| `GET` | `/historical/2010` | `200` |
| `GET` | `/historical/2014` | `200` |
| `GET` | `/historical/2018` | `200` |
| `GET` | `/historical/2022` | `200` |
| `GET` | `/historical/9999` | `400` |
| `GET` | `/historical-replay-audit` | `200` |
| `GET` | unsupported route | `404` |
| unsupported method | supported route | `405` |

## Response Shape Coverage

The endpoint tests validate:

- JSON content type.
- Success response shape.
- Validation error response shape.
- Runtime error response shape.
- Historical summary fields for all supported years.
- Replay audit readiness and metric metadata.
- Deterministic repeated responses for seeded simulation requests.

## Current Boundary

Endpoint validation does not start an HTTP server, open sockets, call external APIs, connect to a database, or download data. It proves that the runtime adapter is ready to be wrapped by a future server adapter.

## What This Does Not Prove

Endpoint validation does not prove predictive accuracy. Match simulation still depends on caller-supplied expected goals, and historical replay audit outputs remain foundation metadata with documented limitations.
