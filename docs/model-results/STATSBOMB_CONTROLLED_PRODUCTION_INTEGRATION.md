# StatsBomb Controlled Production Integration

Phase 12.20D integrates the validated StatsBomb Open Data signal into server runtime predictions behind a private feature flag.

## Evidence Basis

Phase 12.20C2 selected `expanded_international_weighted` as the replay strategy:

| Metric | Result |
| --- | ---: |
| Evaluated fixtures | 128 |
| Signal applied | 86 |
| Max Elo gap | 383.077 |
| Fixtures above 167 Elo points | 24 |
| Unique baseline xG pairs | 59 |
| Unique modal scorelines | 3 |
| Baseline 1-1 frequency | 78.9% |
| Backtest decision | `promote_signal_candidate` |

Backtest deltas were small but directionally positive: Brier `-0.0018`, Log Loss `-0.0027`, outcome accuracy `+0.8pp`, total-goal MAE `-0.0014`, exact-score accuracy unchanged.

## Runtime Design

The production runtime uses:

```text
STATSBOMB_PREDICTION_SIGNAL_MODE=off | shadow | on
```

`off` is the default. `shadow` computes comparison metadata while preserving baseline output. `on` applies the signal only after activation gates pass.

The legacy boolean `STATSBOMB_PREDICTION_SIGNAL_ENABLED` is accepted only as a fallback when the mode variable is absent.

## Server Boundary

`createProductionPredictionDependencies()` is server-only. It may read the compact profile artifact in `shadow` or `on`, validates readiness, creates an in-memory profile source, and exposes sanitized diagnostics.

Client bundles do not access raw profile artifacts, local data, `node:fs`, `node:path`, or StatsBomb environment variables.

## Readiness Rules

The compact artifact must be:

- schema version `1.0.0`;
- generated and cutoff timestamps present;
- exactly 48 profiles;
- no duplicate team IDs;
- finite metrics only;
- non-negative counts;
- valid coverage/freshness states;
- provider `statsbomb_open_data`;
- not a placeholder;
- not stale under the production policy.

If readiness fails, the prediction request does not crash. It returns baseline output and a compact not-applied reason.

## Activation Gate

`evaluateStatsBombProductionActivationGate()` returns:

- `disabled`;
- `shadow_ready`;
- `production_ready`;
- `blocked_artifact`;
- `blocked_validation`;
- `blocked_configuration`.

`production_ready` requires both artifact readiness and the Phase 12.20C2 `promote_signal_candidate` decision. Environment mode alone is not sufficient.

## Integrated Entry Points

Enabled in this phase:

- `/predictions` Auto Predict via a server action boundary;
- Home generated featured prediction;
- `/tournament` official-plus-projected knockout projection;
- server-rendered runtime diagnostics and Home technical disclosure;
- match prediction UI presentation when response metadata includes the signal.

Deferred:

- group projection cache integration, until projection cache identity versions signal mode/version safely;
- automated immutable snapshot capture, to preserve existing content hashes and idempotency.

## UI Semantics

When applied, UI may show:

```text
StatsBomb enriched
Model: Elo V2 + StatsBomb
Coverage: Partial / Partial
Signal weight: 0.14
Data cutoff: June 1, 2026
```

When disabled, unavailable, or shadow-only, UI shows `Baseline model`. Shadow mode does not claim the signal affected the prediction.

Technical disclosure may include baseline xG, authoritative xG, shadow adjusted xG, provider, signal version, and sanitized warnings.

## Observability

Runtime diagnostics expose:

- feature enabled;
- rollout mode;
- activation decision;
- artifact readiness;
- readiness reason;
- profile count;
- cutoff/generated timestamps;
- last load status.

Diagnostics never include filesystem paths, raw artifacts, raw events, credentials, or raw parser errors.

## Compatibility

No production Elo constants, Elo-to-xG V2 constants, Poisson settings, modal scoreline selection, balanced preset, fixture identity, snapshot identity, evaluation identity, persistence schema, standings, qualification, official bracket topology, existing snapshots, or existing evaluations were changed.

Automated snapshot capture remains baseline-only in 12.20D.

## Rollback

Set `STATSBOMB_PREDICTION_SIGNAL_MODE=off` and redeploy. No code change is required.

## Deferred Work

- Server action/API boundary for authoritative interactive prediction mode.
- Snapshot versioning for StatsBomb-enriched immutable captures.
- Projection cache key versioning for group projections.
- Longer monitoring window in `shadow` before production activation.
