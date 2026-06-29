# StatsBomb Production Rollout

Phase 12.20D adds a controlled, server-only rollout boundary for the validated StatsBomb Open Data prediction signal.

## Rollout Modes

| Mode | Behavior | User-facing authority |
| --- | --- | --- |
| `off` | Default. No compact profile artifact is loaded. | Baseline Elo V2 prediction |
| `shadow` | Loads and validates the compact artifact, computes comparison metadata when possible. | Baseline Elo V2 prediction |
| `on` | Applies the signal only when artifact readiness and Phase 12.20C2 validation gates pass. | Elo V2 plus StatsBomb signal when applied |

`STATSBOMB_PREDICTION_SIGNAL_MODE` is authoritative when set. Accepted values are `off`, `shadow`, and `on`; invalid values default to `off`.

`STATSBOMB_PREDICTION_SIGNAL_ENABLED` remains as a deprecated compatibility fallback only when the mode variable is absent. It enables `on` only for `true` or `1`.

No `NEXT_PUBLIC_` StatsBomb variable is used.

## Activation Gate

Production `on` mode requires all of the following:

- mode is explicitly `on`;
- compact artifact is readable and schema-supported;
- artifact contains exactly 48 canonical profiles;
- profile metrics are finite and non-negative where required;
- artifact is not stale under the production policy;
- Phase 12.20C2 historical replay decision passed;
- StatsBomb backtest decision is `promote_signal_candidate`.

If any gate fails, predictions fall back to baseline and expose only sanitized diagnostics.

## Readiness Checks

The runtime checks:

- schema version;
- generated and cutoff timestamps;
- profile count;
- duplicate team IDs;
- valid coverage and freshness values;
- provider value `statsbomb_open_data`;
- placeholder status;
- stale artifact policy;
- invalid metrics such as `NaN`, `Infinity`, and negative counts.

Failure reasons are typed: `artifact_missing`, `artifact_placeholder`, `schema_unsupported`, `profile_count_invalid`, `duplicate_team_id`, `invalid_metric`, `artifact_stale`, and `artifact_unreadable`.

## Artifact Packaging (Vercel deployments)

The compact profile artifact and the backtesting artifact are loaded at runtime via `readFileSync` using a path derived from `import.meta.url`. Because the path is computed dynamically, `@vercel/nft` (Next.js output file tracing) cannot statically detect them and does not include them in the deployment bundle by default.

`apps/web/next.config.ts` declares both artifacts via `outputFileTracingIncludes` so they are always packaged:

```
outputFileTracingRoot: <monorepo root>   # so Vercel can resolve files outside apps/web/
outputFileTracingIncludes:
  '/**':                                 # applied to every route
    - ../../docs/model-results/artifacts/statsbomb-team-performance-profiles.json
    - ../../docs/model-results/artifacts/statsbomb-backtesting-expanded-elo.json
```

Paths in `outputFileTracingIncludes` are globs resolved relative to `apps/web/` (the Next.js app directory). `../../` traverses up to the monorepo root.

Both files are tracked in Git and committed to the repository. They must not be `.gitignore`-d or excluded from the repository while this loading strategy is in use.

If either artifact is missing from the deployment bundle, `createProductionPredictionDependencies` returns `artifact_missing` and all predictions fall back to baseline.

## Caching

The compact profile artifact is cached in process memory after a successful load. Failed loads may retry after a bounded interval or on process restart.

On Vercel, this cache is per function instance. Cold starts reload the compact artifact. There is no cross-instance cache guarantee, so fallback behavior remains baseline-safe.

## Snapshot Policy

Phase 12.20D keeps automated immutable pre-match snapshot capture baseline-only. This avoids silently changing snapshot content hashes, idempotency behavior, or evaluation lookup semantics under the same capture workflow.

Interactive/server-rendered runtime predictions may use the controlled signal in `shadow` or `on`. Existing snapshots and evaluations are not modified.

## QA Matrix

| Scenario | Expected result |
| --- | --- |
| Covered team pair, `off` | Baseline model; no artifact load |
| Covered team pair, `shadow` | Baseline output plus comparison metadata |
| Covered team pair, `on` and ready | StatsBomb enriched output |
| Fallback/missing team profile | Baseline output with not-applied reason |
| Artifact missing | Baseline output; sanitized unavailable reason |
| Artifact stale or invalid | Baseline output; typed readiness reason |
| Server cold start | Artifact loads once per instance when mode is `shadow` or `on` |
| Repeated requests | Cached artifact reused |
| `/predictions` Auto Predict | Uses the private server action boundary and controlled runtime mode |
| Snapshot capture | Baseline-only |
| Tournament projection | Controlled runtime signal may apply to recalculable projections |
| Group projection | Deferred until projection cache identity can version the signal mode safely |

## Rollout Sequence

1. Deploy with `STATSBOMB_PREDICTION_SIGNAL_MODE=off`.
2. Confirm baseline parity.
3. Deploy with `STATSBOMB_PREDICTION_SIGNAL_MODE=shadow`.
4. Inspect runtime diagnostics and comparison metadata.
5. Confirm no authoritative output changed in shadow mode.
6. Deploy with `STATSBOMB_PREDICTION_SIGNAL_MODE=on` in Preview only.
7. Test covered and fallback teams.
8. Verify rollback to `off`.
9. Production activation only after explicit approval.

## Rollback

Set:

```text
STATSBOMB_PREDICTION_SIGNAL_MODE=off
```

Redeploy after changing Vercel environment variables. Rollback does not require a code change.

## Limitations

- StatsBomb Open Data is not real-time coverage.
- Eight World Cup 2026 teams remain fallback/prior-only.
- Shadow comparison metadata is diagnostic, not authoritative.
- Immutable snapshot integration is deferred to a dedicated versioning phase.
- Group projection signal application is deferred to avoid ambiguous projection-cache identity.
