# Automatic Completed-Prediction Evaluation

Phase 12.18B9 adds a server-side orchestration layer that evaluates immutable World Cup 2026 pre-match prediction snapshots once their official fixtures have completed.

This phase does not change prediction formulas, Elo, xG, Poisson/Dixon-Coles behavior, confidence scoring, snapshot identity, evaluation identity, migrations, standings formulas, provider selection, or Colombia timezone display behavior.

## Flow

```text
synchronizeWorldCup2026Results()
-> completed normalized official results
-> list persisted prediction snapshots
-> skip snapshots that already have an evaluation
-> evaluate eligible snapshots with Model-vs-Reality service
-> persist immutable evaluation records
-> Prediction History reads the evaluation join
```

The runner is not coupled to dashboard page requests. It is suitable for manual CLI runs, GitHub Actions scheduling, and a future Vercel Cron wrapper.

## Eligibility

A snapshot is evaluated only when:

- it exists in the selected persistence store;
- its fixture is an official World Cup 2026 group-stage fixture;
- its status is `pre_match_locked` or the existing `foundation_unverified` evaluation contract allows it;
- it was captured before kickoff when kickoff metadata is available;
- a normalized completed result exists for the same fixture;
- the final score is valid and non-negative;
- team identity resolves to the canonical fixture orientation;
- no existing immutable evaluation already covers the snapshot/result identity.

The runner does not evaluate scheduled, live, halftime, postponed, cancelled, malformed, unresolved, duplicate, or knockout-placeholder records.

## Reversed Provider Orientation

football-data.org can return a completed result with home/away order reversed relative to the repository's canonical fixture template. The evaluation service now canonicalizes those records before metric calculation.

Examples:

- `Colombia 1-0 Congo DR` maps to canonical `DR Congo 0-1 Colombia`.
- `Panama 0-1 Croatia` maps to canonical `Croatia 1-0 Panama`.

Canonical UTC kickoff timestamps remain unchanged.

## Idempotency

Evaluations remain immutable and append-only.

- First eligible run creates an evaluation.
- Repeated runs return/report the existing evaluation.
- If a snapshot already has an evaluation that conflicts with the current completed-result identity, the runner reports a conflict and does not overwrite data.
- Snapshots and evaluations are never updated or deleted.

## Execution Summary

The runner reports:

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

## Prediction History

No dashboard write path was added. Once an evaluation exists, the existing Prediction History read model joins it to the snapshot and displays:

- final score;
- actual outcome;
- outcome correctness;
- exact-score correctness;
- Brier Score;
- Log Loss;
- home/away goal absolute error;
- evaluation timestamp.

Rows remain pending only when no eligible completed official result is available.

## Dry Run

Dry run builds candidate evaluations through the same Model-vs-Reality calculation but uses a no-op store. It reports `would_evaluate` and performs no writes.

## Security

- Non-dry scheduled execution requires `PERSISTENCE_PROVIDER=postgres`.
- The CLI never falls back to memory for production writes.
- The CLI never prints `DATABASE_URL`, football-data.org tokens, request headers, raw provider responses, or stack traces.
- Operational errors are sanitized.

## Limitations

- The runner scans a bounded snapshot list in this phase.
- It depends on the current normalized results provider response; no persistent completed-result store is added.
- It does not regenerate predictions or repair historical snapshots.
- It does not evaluate knockout-placeholder fixtures.

## Next Phase

Phase 12.18C1 should use the newly populated evaluation evidence to decide whether recalibration work is justified.
