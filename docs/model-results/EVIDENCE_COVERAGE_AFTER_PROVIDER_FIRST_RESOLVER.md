# Evidence Coverage After Provider-First Resolver

Date: 2026-07-09
Status: Audit complete; production fixture identity breakdown requires PostgreSQL access

## 1. Executive Summary

The Model and Evidence Center is behaving according to the current evidence policy: it does **not** count every completed World Cup match. It counts only fixtures that have both:

- a valid stored pre-match prediction snapshot; and
- a persisted Model-vs-Reality evaluation joined to a completed official result.

The currently observed production numbers are:

| Metric | Current value | Meaning |
| --- | ---: | --- |
| Stored snapshots | 20 | Raw immutable snapshot rows in persistence. |
| Evaluation records | 20 | Raw immutable evaluation rows in persistence. |
| Unique evaluated fixtures | 17 | Gate-selected fixture count after collapsing multiple snapshots/evaluations for the same fixture. |
| Display threshold | 8 | Minimum unique evaluated fixtures before metrics are considered display-usable. |
| Recalibration review threshold | 20 | Minimum unique evaluated fixtures before recalibration can be considered. |
| Gate verdict | `evidence_collection_continue` | Expected for 8-19 clean unique evaluated fixtures. |

The gap between 20 evaluation records and 17 unique evaluated fixtures is expected if three evaluation rows are duplicates at the fixture level, or if multiple snapshots for the same fixture each have evaluations. The gate intentionally selects one canonical snapshot per fixture and counts fixtures, not rows.

This local environment does not have `DATABASE_URL`, `AUDIT_DATABASE_URL`, `TEST_DATABASE_URL`, or `WC2026_DATABASE_URL` configured, so the exact production fixture IDs behind the 20/17 split could not be enumerated here. A read-only helper was added for that fixture-level breakdown:

```bash
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:evidence-coverage
```

The helper refuses to run without PostgreSQL and does not print secrets.

## 2. Current Evidence Numbers

The user-observed evidence center state is:

- Stored snapshots: 20
- Evaluation records: 20
- Unique evaluated fixtures: 17
- Gate verdict: `evidence_collection_continue`
- Display threshold: 8 unique fixtures
- Recalibration review threshold: 20 unique fixtures

Local verification commands cannot reproduce production counts without the production persistence database:

```bash
pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
```

Local result:

| Field | Local memory-mode value |
| --- | ---: |
| Total snapshots | 0 |
| Unique fixtures | 0 |
| Evaluated fixtures | 0 |
| Decision | `insufficient_evidence` |

```bash
COMPLETED_EVALUATION_MODE=dry_run \
  pnpm --filter @world-cup-2026-predictor/api evaluate:completed-predictions
```

Local result:

| Field | Local memory-mode value |
| --- | ---: |
| Completed results | 8 |
| Snapshots scanned | 0 |
| Eligible | 0 |
| Already evaluated | 0 |

Those local values are expected because in-memory persistence starts empty in a fresh process.

## 3. Evaluation Records vs Unique Evaluated Fixtures

The UI and gate intentionally report different concepts:

- `apps/web/src/lib/server-runtime.ts` loads persisted snapshots and evaluations, then passes raw row counts to the Model page.
- `apps/web/src/components/ModelEvidenceSummary.tsx` displays raw evaluation records from `summarizeWorldCup2026ModelReality(evaluations)` alongside the gate's unique fixture count.
- `packages/api/src/live-prediction-evidence-gate.ts` groups snapshots by `fixtureId`, selects one primary snapshot per fixture, then counts only primary snapshots that have an evaluation.

Gate selection policy:

1. Drop malformed probability payloads.
2. Drop snapshots captured at or after kickoff.
3. Prefer `pre_match_locked` over `foundation_unverified`.
4. Among equal statuses, prefer latest `capturedAt`.
5. Use `snapshotId` as final deterministic tie-breaker.

Therefore:

```txt
20 evaluation records - 17 unique evaluated fixtures = 3 extra evaluation rows attached to already-counted fixtures
```

This is not by itself a bug. It is expected whenever:

- a fixture has multiple snapshots and more than one snapshot was evaluated;
- a fixture has duplicate logical evaluations;
- a non-primary snapshot has an evaluation but is not selected by the gate;
- an older `foundation_unverified` snapshot was evaluated and later superseded by a `pre_match_locked` snapshot for the same fixture.

## 4. Evidence Pipeline Flow

### Pre-Match Snapshot Capture

`packages/api/src/prematch-snapshot-capture.ts` discovers scheduled World Cup 2026 group-stage fixtures from normalized provider records and captures a snapshot only when the fixture is inside the configured pre-match window.

Current capture policy:

| Policy | Value |
| --- | --- |
| Window opens | 24 hours before kickoff |
| Window closes | 15 minutes before kickoff |
| Snapshot identity cutoff | fixture kickoff |
| Default preset | `balanced` |
| Tournament result adjustment | off |
| Tournament form adjustment | off |

Snapshots are idempotent by fixture/cutoff/model/preset identity. A scheduler that starts after the window closes will not backfill a valid pre-match snapshot.

### Official Result Sync

`packages/api/src/live-results-sync.ts` normalizes provider fixtures and puts completed provider records into `syncResult.completedResults`.

The completed-evaluation CLI consumes those completed results:

```bash
COMPLETED_EVALUATION_MODE=dry_run \
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api evaluate:completed-predictions
```

### Completed Prediction Evaluation

`packages/api/src/automatic-completed-prediction-evaluation.ts` scans stored snapshots and attempts to evaluate each snapshot against completed results.

`packages/api/src/prediction-evaluation-service.ts` requires:

- snapshot status is `pre_match_locked` or `foundation_unverified`;
- `capturedAt < kickoffAt`;
- snapshot fixture ID is an official World Cup 2026 group-stage fixture;
- probabilities are valid;
- exactly one matching completed result exists;
- the completed result is `finished` with valid scores.

Important boundary: current Model-vs-Reality evaluation is group-stage fixture based. It checks `WORLD_CUP_2026_GROUP_STAGE_FIXTURES`, so knockout topology/resolver changes do not mutate or reinterpret existing snapshot identities.

### Evidence Gate Unique-Fixture Selection

`packages/api/src/live-prediction-evidence-gate.ts` then:

- indexes evaluations by `snapshotId`, preferring the latest evaluation if multiple exist for the same snapshot;
- groups snapshots by `fixtureId`;
- selects one primary snapshot per fixture;
- counts only selected primary snapshots with an evaluation as `uniqueEvaluatedFixtures`.

## 5. Findings

### Completed Fixtures Count

Local memory-mode completed-evaluation dry run sees 8 local static completed results. Production likely has more completed provider results, but the exact production completed count was not available in this environment because no provider/database secrets are configured.

### Fixtures With Valid Snapshots

Production has 20 stored snapshot rows. The exact fixture list requires PostgreSQL access. Run:

```bash
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:evidence-coverage
```

The report prints:

- fixtures with any snapshot;
- fixtures with valid primary snapshot;
- duplicate snapshot fixtures;
- excluded snapshots and reasons.

### Fixtures With Evaluations

Production has 20 evaluation rows but 17 unique evaluated fixture IDs. This means at least three evaluation rows are not adding new fixture coverage.

The new audit helper prints:

- duplicate evaluation fixtures;
- duplicate evaluation snapshots;
- completed fixtures with selected snapshot but no evaluation.

### Unique Fixtures Counted By Gate

The gate currently counts 17 unique evaluated fixtures. This is above the display threshold (8) and below the recalibration threshold (20), so `evidence_collection_continue` is the correct conservative verdict.

### Duplicate Fixture Evaluations

Exact duplicate fixture IDs could not be listed locally because production persistence is unavailable. The likely shape is one of:

- three fixtures each have two evaluated snapshots;
- one fixture has four evaluated snapshots;
- another combination totaling three extra evaluation rows beyond the 17 unique fixture IDs.

This is expected if earlier/foundation snapshots and later locked snapshots both exist for the same fixture.

### Completed Fixtures With Official Results But No Valid Pre-Match Snapshot

This cannot be answered from raw row counts. It requires joining current completed provider results to the snapshot store. The new helper reports:

- `completedFixturesWithoutAnySnapshot`;
- `completedFixturesWithoutValidPrimarySnapshot`.

Common causes:

- capture scheduler was not active before that fixture entered the 24h-to-15m window;
- provider kickoff/status was unavailable or invalid during the window;
- the fixture was already live/finished when capture ran;
- capture failed due prediction or persistence error;
- fixture was unsupported by the current group-stage evidence pipeline.

### Completed Fixtures With Snapshots But No Persisted Evaluation

This is reported by the helper as `completedFixturesWithSnapshotButNoEvaluation`.

Common causes:

- completed-evaluation job has not run after the match finished;
- result sync has not yet returned the fixture as `finished`;
- completed result team order or identity did not match the snapshot;
- evaluation was rejected for invalid result/snapshot data;
- persistence conflict prevented a new immutable evaluation.

### Excluded Snapshots/Evaluations and Reasons

Gate-level snapshot exclusion reasons:

| Reason | Meaning |
| --- | --- |
| `not_primary_selection` | Snapshot was valid, but another snapshot for the fixture won the primary selection policy. |
| `malformed_data` | Probability payload invalid or no scorelines available. |
| `post_kickoff` | Snapshot captured at or after kickoff. |
| `no_valid_candidate` | No valid snapshot for the fixture. |

The added coverage helper reports `not_primary_selection`, `malformed_data`, `post_kickoff`, and `unsupported_status` at fixture level.

### Captured At Or After Kickoff

The evaluator explicitly rejects these with `snapshot_after_kickoff`. The gate excludes these from primary selection as `post_kickoff`.

No local production row scan was possible, so whether any of the 20 production snapshots are post-kickoff must be answered by:

```bash
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:evidence-coverage
```

### Status Priority Exclusions

Yes, status priority can exclude otherwise valid snapshots. A valid `foundation_unverified` snapshot is counted as non-primary if a valid `pre_match_locked` snapshot exists for the same fixture. This is intentional: `pre_match_locked` is stronger evidence.

## 6. Impact of Previous Provider/Topology Bugs

The provider-first knockout resolver changes the Home and `/tournament` knockout view model. It does not alter existing group-stage snapshot/evaluation identity.

Reasons:

- snapshot capture and completed evaluation are based on group-stage fixture IDs;
- `prediction-evaluation-service.ts` rejects snapshots whose fixture ID is not in `WORLD_CUP_2026_GROUP_STAGE_FIXTURES`;
- existing persisted snapshot IDs/content hashes are immutable;
- no database writes or migrations were introduced by the provider-first knockout resolver.

If a future phase adds knockout prediction snapshots, that phase must define a separate provider-backed knockout fixture identity policy before those fixtures count toward model evidence.

## 7. Whether Recalibration Is Justified Now

No. Recalibration is not justified at 17 unique evaluated fixtures.

The current gate policy requires at least 20 unique evaluated fixtures for any recalibration review, and at least 25 for broader model review. With 17 unique fixtures, the correct action is to continue evidence collection.

## 8. Whether More Evidence Collection Is Needed

Yes. The project needs at least three more unique evaluated fixtures to reach the 20-fixture recalibration review threshold.

This threshold should be reached naturally if:

- pre-match capture is running before upcoming fixtures enter the capture window;
- completed-evaluation runs after each fixture finishes;
- provider result sync returns completed fixtures with stable identities and scores.

## 9. Recommended Next Actions

1. Run the new fixture-level coverage audit against production PostgreSQL:

   ```bash
   PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
     pnpm --filter @world-cup-2026-predictor/api audit:evidence-coverage
   ```

2. Run the existing gate summary after the coverage audit:

   ```bash
   PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
     pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
   ```

3. If completed fixtures have snapshots but no evaluations, run:

   ```bash
   COMPLETED_EVALUATION_MODE=dry_run \
   PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
     pnpm --filter @world-cup-2026-predictor/api evaluate:completed-predictions
   ```

4. If upcoming fixtures have no snapshots, run capture preflight/dry-run:

   ```bash
   PREMATCH_CAPTURE_MODE=preflight \
   PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
   RESULTS_PROVIDER=football_data_org FOOTBALL_DATA_API_TOKEN="..." \
     pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
   ```

5. Do not recalibrate until the gate returns a recalibration verdict at or above 20 unique evaluated fixtures.

## 10. Commands for Future Audits

Fixture-level evidence coverage:

```bash
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:evidence-coverage
```

Gate summary:

```bash
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
```

Gate artifact:

```bash
LIVE_EVIDENCE_MODE=write_artifact \
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
```

Completed-evaluation dry run:

```bash
COMPLETED_EVALUATION_MODE=dry_run \
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api evaluate:completed-predictions
```

Pre-match capture preflight:

```bash
PREMATCH_CAPTURE_MODE=preflight \
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
RESULTS_PROVIDER=football_data_org FOOTBALL_DATA_API_TOKEN="..." \
  pnpm --filter @world-cup-2026-predictor/api capture:prematch-snapshots
```

## 11. Acceptance Checklist Before Any Recalibration Phase

- At least 20 unique evaluated fixtures.
- Fixture-level audit explains every gap between raw evaluation rows and unique fixture count.
- No post-kickoff snapshots are selected as primary evidence.
- `pre_match_locked` primary selection rate is acceptable.
- Completed fixtures without snapshots are explained by scheduler timing or provider availability.
- Completed fixtures with snapshots but no evaluations are either evaluated or have documented rejection reasons.
- Gate decision is not `insufficient_evidence`, `data_quality_blocked`, or `evidence_collection_continue`.
- Any proposed model change is scoped to a separate named phase.
- No model formula, Elo/xG constant, Poisson behavior, StatsBomb behavior, Attack/Defense behavior, or persistence identity changes are made during the audit phase.

## 12. Audit Limitation

This repository-local audit could not enumerate the exact production duplicate fixture IDs because no production PostgreSQL connection string is available in the environment. The added helper is the required next step to fill the fixture-name tables without changing runtime behavior.
