# Vercel Live Runtime Deployment

Phase 12.18B7 makes the deployed Vercel application render from the same validated live runtime used by scheduled capture:

```text
PostgreSQL / Neon persistence
football-data.org result synchronization
dynamic Node.js server rendering
safe local fallback only when live services are unavailable
```

No prediction formula, Elo/xG constant, snapshot identity, migration, provider credential, or capture workflow changes are included.

## Required Vercel Environment Variables

Set these as **server-side Vercel environment variables**. Do not use any `NEXT_PUBLIC_` prefix.

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `PERSISTENCE_PROVIDER` | `postgres` | `postgres` or `memory` | Use `postgres` for live history. Preview may use `memory` only for non-live smoke deployments. |
| `DATABASE_URL` | required | required when `PERSISTENCE_PROVIDER=postgres` | Neon/PostgreSQL connection string. Never expose in browser code or logs. |
| `RESULTS_PROVIDER` | `football_data_org` | `football_data_org` or `local` | `football_data_org` is required for kickoff-bearing live fixtures. |
| `FOOTBALL_DATA_API_TOKEN` | required | required when `RESULTS_PROVIDER=football_data_org` | football-data.org API token. Never use `NEXT_PUBLIC_`. |
| `FOOTBALL_DATA_COMPETITION_CODE` | `WC` | `WC` | Explicit World Cup competition code. |
| `FOOTBALL_DATA_SEASON` | `2026` | `2026` | Explicit provider season. |
| `STATSBOMB_PREDICTION_SIGNAL_MODE` | `off` until approved | `off`, then `shadow`, then Preview-only `on` | Private server-side rollout mode. Accepted values: `off`, `shadow`, `on`. Invalid values default to `off`. |
| `STATSBOMB_PREDICTION_SIGNAL_ENABLED` | unset or `false` | unset or `false` | Deprecated compatibility fallback used only when `STATSBOMB_PREDICTION_SIGNAL_MODE` is absent. Accepted true values: `true`, `1`. |

After changing Vercel environment variables, redeploy the application. Existing deployments do not automatically pick up new values.

These server-side variable names are also allowlisted in `turbo.json` under the `build` task `env` field. That keeps Turborepo and Vercel build caching aware of runtime configuration changes without exposing any values or introducing `NEXT_PUBLIC_` variables.

## Vercel CLI Commands

Examples only. Do not paste secrets into shared logs.

```bash
vercel env add PERSISTENCE_PROVIDER production
vercel env add DATABASE_URL production
vercel env add RESULTS_PROVIDER production
vercel env add FOOTBALL_DATA_API_TOKEN production
vercel env add FOOTBALL_DATA_COMPETITION_CODE production
vercel env add FOOTBALL_DATA_SEASON production
vercel env add STATSBOMB_PREDICTION_SIGNAL_MODE production
```

Verify variable names and scopes without printing values:

```bash
vercel env ls
```

Redeploy after env updates:

```bash
vercel --prod
```

Inspect deployment logs for sanitized status only:

```bash
vercel logs <deployment-url>
```

Do not print `DATABASE_URL`, `FOOTBALL_DATA_API_TOKEN`, request headers, raw provider responses, or stack traces containing credentials.

## Database Migration Requirement

The PostgreSQL database must have the checked-in migrations applied before enabling persistent runtime reads:

```bash
pnpm --filter @world-cup-2026-predictor/api db:migrate
```

Run migrations from a trusted server-side environment with `DATABASE_URL` configured. Never run migrations from browser code or request handlers.

## Runtime Rendering Strategy

The live pages use dynamic Node.js rendering:

- `/`
- `/groups/[group]`
- `/prediction-history`
- `/api/world-cup-2026/daily-matches`
- `/api/world-cup-2026/groups/[group]`

This prevents build-time static rendering from freezing local fallback data into production output.

Client components never call football-data.org or PostgreSQL directly. The browser receives only normalized internal contracts and safe metadata.

## Shared Sync Behavior

The dashboard performs one server-side World Cup result synchronization per page render and passes that result into:

- Today’s Matches / Live Match Center;
- World Cup group standings;
- Auto Predict match-context seed data;
- runtime status diagnostics.

This avoids separate football-data.org calls for each dashboard section during one render.

Group detail and API proxy routes still perform their own request-scoped synchronization because they are independent entry points.

## Expected Live UI States

With production variables configured and services reachable:

- database status: `Connected`;
- external services: `Live provider active`;
- Today’s Matches source: `football_data_org_results_provider` or equivalent active provider label;
- Today’s Matches timezone: `Colombia time (America/Bogota, UTC-5)`;
- fixtures with kickoff metadata should be non-zero;
- local static fallback warning should not appear unless the provider is unavailable;
- Prediction History should read from persistent PostgreSQL when records exist.

Safe fallback states:

- provider unavailable: external warning, cache or local fallback visible;
- database unavailable: database status `Configured, unavailable`, prediction history returns sanitized persistence errors;
- cached provider data: cache/stale warning visible;
- local mode: `Local fallback` or `Disabled` labels visible.
- StatsBomb mode off: `Baseline model` remains authoritative and no profile artifact is loaded.
- StatsBomb shadow mode: comparison metadata may be computed server-side, but displayed predictions remain baseline-authoritative.
- StatsBomb on mode: the signal applies only when the compact artifact is ready and Phase 12.20C2 validation remains `promote_signal_candidate`.

## StatsBomb Rollout

StatsBomb production integration is private and server-side only. Do not add any `NEXT_PUBLIC_` StatsBomb variable.

Recommended rollout:

1. Deploy with `STATSBOMB_PREDICTION_SIGNAL_MODE=off`.
2. Confirm baseline parity and runtime diagnostics.
3. Deploy with `STATSBOMB_PREDICTION_SIGNAL_MODE=shadow`.
4. Inspect sanitized diagnostics and comparison metadata; prediction authority must remain baseline.
5. Deploy with `STATSBOMB_PREDICTION_SIGNAL_MODE=on` in Preview only.
6. Test covered and fallback teams.
7. Verify rollback by returning `STATSBOMB_PREDICTION_SIGNAL_MODE=off`.
8. Production activation requires explicit approval after Preview inspection.

The compact profile artifact is cached per server process. Vercel cold starts reload it; no cross-instance cache guarantee exists. If the artifact is missing, stale, unreadable, or fails validation, runtime predictions fall back to the baseline model.

## Verification Checklist

1. Confirm Vercel env names and scopes.
2. Redeploy after env changes.
3. Open the dashboard.
4. Confirm the boundary summary does not show `Database Disabled` when PostgreSQL is connected.
5. Confirm the model status card shows `Live provider active` and `Connected`.
6. Confirm Today’s Matches shows a live provider or cache source, not local fallback, when football-data.org succeeds.
7. Confirm daily matches include kickoff times for real dated fixtures in Colombia local time.
8. Confirm World Cup group standings show external provider metadata and fixture-derived results.
9. Open `/groups/A` and confirm source metadata matches the live provider/fallback state.
10. Open `/prediction-history` and confirm persistent history metadata or a sanitized database error.
11. Confirm no secret values appear in page HTML, JSON responses, or Vercel logs.

## Rollback

To roll back to deterministic local behavior:

```text
RESULTS_PROVIDER=local
PERSISTENCE_PROVIDER=memory
STATSBOMB_PREDICTION_SIGNAL_MODE=off
```

Redeploy after changing values. This disables live provider calls and persistent history reads for the web runtime. The scheduled capture workflow has its own GitHub Actions secrets and is not changed by this rollback unless those secrets/workflow settings are also modified.

## Secret Rotation

When rotating secrets:

1. Add the replacement Vercel environment value.
2. Redeploy.
3. Verify live runtime status.
4. Revoke the old secret at the provider.
5. Confirm no old value appears in Vercel logs.

Rotate `FOOTBALL_DATA_API_TOKEN` through football-data.org and `DATABASE_URL` through Neon/PostgreSQL provider controls.

## Security Boundary

- No `NEXT_PUBLIC_` runtime secrets.
- No database client in client components.
- No football-data.org request from the browser.
- No automatic migrations during requests.
- No raw provider payloads in UI.
- No raw PostgreSQL errors in UI.
- No provider token, database URL, request headers, or credentials in logs.

## Limitations

- football-data.org rate limits still apply.
- In-memory provider cache is best-effort per server instance.
- Dynamic rendering improves freshness but is not polling.
- Prediction history requires migrations and database connectivity.
- Provider fallback remains visible and expected during genuine upstream or database outages.
