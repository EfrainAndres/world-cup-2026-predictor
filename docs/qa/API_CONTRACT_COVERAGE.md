# API Contract Coverage

Phase 8.3 adds contract-level coverage for the API foundation before adding a production server, external services, database, or dashboard-specific endpoint layer.

## Purpose

API contract tests verify that public handlers return stable response shapes that downstream callers can depend on. The tests focus on deterministic pure handlers first and use the runtime adapter only where HTTP route behavior matters.

## Covered Contracts

| Contract | Coverage |
| --- | --- |
| Health | Status, service name, version, and metadata shape. |
| Model info | Supported handler list, limitations, and metadata shape. |
| Match simulation | Request echo, probability totals, scoreline shape, warnings, metadata, and seeded Monte Carlo determinism. |
| Live Elo prediction | Team-name prediction response, expected-goals metadata, live Elo metadata, probabilities, scorelines, warnings, and seeded Monte Carlo determinism. |
| Live Elo ratings | Rating entries, data coverage metadata, weighting metadata, attack/defense fields, warnings, and metadata. |
| Team ratings | Static foundation team ratings, strength fields, warnings, and metadata. |
| Tournament simulation | Sample tournament run count, team result probabilities, warnings, and metadata. |
| Historical summary | Supported-year summary shape and unsupported-year validation error shape. |
| Historical replay audit | Readiness, metric availability, component availability, warnings, known gaps, and metadata. |
| Runtime errors | Unsupported route and unsupported method status codes plus typed JSON error bodies. |
| Validation errors | Stable validation error status, issue fields, messages, suggestions when available, and metadata. |

## Determinism

Seeded simulation paths are called twice with the same inputs and compared for exact equality. This confirms that callers can rely on deterministic outputs when they provide a seed.

## Probability Checks

Probability contracts verify that:

- Win/draw/loss fields are present.
- Values are finite and bounded between `0` and `1`.
- Outcome probabilities sum to the reported total probability.
- The total probability is close to `1.0`.
- Most-likely scoreline entries include home goals, away goals, and probability.

## Current Boundary

This coverage does not start a network server and does not prove predictive accuracy. It confirms that the local API foundation exposes auditable, typed, deterministic contracts for the current modeling foundation.

