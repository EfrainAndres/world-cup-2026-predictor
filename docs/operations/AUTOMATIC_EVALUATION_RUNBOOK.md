# Automatic Evaluation Runbook

This runbook covers Phase 12.18B9 automatic completed-prediction evaluation.

## Command

```bash
pnpm --filter @world-cup-2026-predictor/api evaluate:completed-predictions
```

The command synchronizes World Cup 2026 results, scans stored prediction snapshots, and evaluates eligible completed fixtures through the existing immutable Model-vs-Reality service.

## Modes

Set `COMPLETED_EVALUATION_MODE`:

| Mode | Writes? | Purpose |
| --- | --- | --- |
| `preflight` | No | Validate PostgreSQL/provider readiness and scan eligibility. |
| `dry_run` | No | Identify evaluations that would be created. |
| `evaluate` | Yes | Persist immutable evaluations. Default for scheduled runs. |

## Required Environment

For `evaluate` and scheduled production use:

```text
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=...
RESULTS_PROVIDER=football_data_org
FOOTBALL_DATA_API_TOKEN=...
```

Do not use `NEXT_PUBLIC_` variables for persistence or provider secrets.

`preflight` also requires the provider variables so it can verify live result readiness.

## GitHub Actions

Workflow: `.github/workflows/completed-prediction-evaluation.yml`

Properties:

- `workflow_dispatch` supports `preflight`, `dry_run`, and `evaluate`.
- Scheduled runs use `evaluate`.
- `permissions: contents: read`.
- `concurrency.group: completed-prediction-evaluation`.
- `DATABASE_URL` is mapped from `WC2026_DATABASE_URL`.
- Secrets are not echoed.

## Expected Output

The CLI prints only safe counts:

- completed results;
- snapshots scanned;
- eligible;
- evaluated;
- already evaluated;
- pending result;
- unresolved fixture;
- invalid result;
- ineligible snapshot;
- conflicts;
- failures.

It never prints database URLs, API tokens, request headers, or raw provider payloads.

## Failure Handling

| Failure | Behavior |
| --- | --- |
| Missing `DATABASE_URL` in postgres mode | Exits non-zero before any write. |
| Memory provider in evaluate mode | Exits non-zero; no fallback. |
| football-data.org unavailable in evaluate mode | Exits non-zero; no local-fallback evaluation. |
| Duplicate existing evaluation | Reports already evaluated. |
| Conflicting existing evaluation | Reports conflict; no overwrite. |
| Persistence write failure | Reports sanitized failure; exits non-zero through partial failure. |

## Manual Verification

1. Run `COMPLETED_EVALUATION_MODE=preflight`.
2. Run `COMPLETED_EVALUATION_MODE=dry_run`.
3. Confirm the counts are plausible.
4. Run `COMPLETED_EVALUATION_MODE=evaluate`.
5. Open `/prediction-history`.
6. Verify completed fixtures show final score, actual outcome, correctness, Brier Score, Log Loss, and goal-error metrics.

Do not paste or print secret values while verifying.

## Rollback

Disable the scheduled workflow in GitHub Actions or remove the schedule block.

No evaluation update/delete path exists. If administrative deletion is ever required, it must be handled by a separate audited operational process.

## Limitations

- This runner does not persist completed result records separately.
- It does not rerun predictions.
- It does not evaluate future, live, postponed, cancelled, malformed, unresolved, duplicate, or knockout-placeholder records.
- It does not change standings, Elo, xG, snapshot capture, or provider selection.
