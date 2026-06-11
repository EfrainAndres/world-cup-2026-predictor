# API Integration Validation

Phase 5.1 validates the pure API handler layer before adding any HTTP server, UI, database, or external service.

## Purpose

The API foundation exposes TypeScript functions that future transports can call. Integration validation checks those functions together through the exported route map so later server adapters can remain thin and predictable.

## Validated Handlers

| Handler | Validation Focus |
| --- | --- |
| `getHealth()` | Deterministic service metadata and disabled server/database/external-service flags. |
| `getModelInfo()` | Supported handler list, model scope, and limitations. |
| `simulateMatch(request)` | Valid request shape, invalid expected goals, invalid `maxGoals`, optional seeded Monte Carlo output, warnings, and metadata. |
| `getHistoricalTournamentSummary(year)` | Supported historical years and typed errors for unsupported years. |
| `getHistoricalReplayAudit()` | Readiness metadata, metric availability, component availability, known gaps, and foundation-only warnings. |

## Response Shape Checks

The integration test asserts stable success and validation-error shapes. This matters because a future transport layer should serialize existing handler responses rather than inventing new behavior.

Validation errors consistently include:

- `status: "validation_error"`
- `issues`
- `metadata`

Successful responses consistently include API metadata showing:

- `mode: "pure_handlers"`
- `serverEnabled: false`
- `databaseEnabled: false`
- `externalServicesEnabled: false`

## Current Boundary

The validation suite does not start a server, open sockets, connect to a database, call external APIs, or download data. It proves that the current TypeScript handler boundary is internally consistent and ready to be wrapped by a future transport layer.

## What This Does Not Prove

This validation does not prove predictive accuracy. Match simulation still depends on caller-supplied expected goals, and historical replay audit responses remain foundation metadata with documented limitations.
