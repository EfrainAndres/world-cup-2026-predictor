# Evidence Coverage After Provider-First Resolver

Date: 2026-07-09
Status: Audit complete; capture coverage follow-up implemented for provider-backed knockout fixtures

## 1. Executive Summary

The Model and Evidence Center is behaving according to the current evidence policy: it does **not** count every completed World Cup match. It counts only fixtures that have both:

- a valid stored pre-match prediction snapshot; and
- a persisted Model-vs-Reality evaluation joined to a completed official result.

The originally observed production numbers were:

| Metric | Current value | Meaning |
| --- | ---: | --- |
| Stored snapshots | 20 | Raw immutable snapshot rows in persistence. |
| Evaluation records | 20 | Raw immutable evaluation rows in persistence. |
| Unique evaluated fixtures | 17 | Gate-selected fixture count after collapsing multiple snapshots/evaluations for the same fixture. |
| Display threshold | 8 | Minimum unique evaluated fixtures before metrics are considered display-usable. |
| Recalibration review threshold | 20 | Minimum unique evaluated fixtures before recalibration can be considered. |
| Gate verdict | `evidence_collection_continue` | Expected for 8-19 clean unique evaluated fixtures. |

The gap between 20 evaluation records and 17 unique evaluated fixtures is expected if three evaluation rows are duplicates at the fixture level, or if multiple snapshots for the same fixture each have evaluations. The gate intentionally selects one canonical snapshot per fixture and counts fixtures, not rows.

The follow-up PostgreSQL + `football_data_org` evidence coverage run reported:

| Metric | Current value |
| --- | ---: |
| Completed group fixtures | 48 |
| Total snapshots | 20 |
| Total evaluations | 20 |
| Unique evaluated fixtures | 17 |
| Completed fixtures without any snapshot | 31 |
| Duplicate evaluation fixtures | 2 |

This confirms the gate is working but evidence capture coverage is too low. The system is not blocked because completed matches are excluded incorrectly; it is blocked because many completed fixtures never had valid pre-match snapshots.

This local environment does not have `DATABASE_URL`, `AUDIT_DATABASE_URL`, `TEST_DATABASE_URL`, or `WC2026_DATABASE_URL` configured, so production fixture IDs still require a database-backed run. A read-only helper exists for that fixture-level breakdown:

```bash
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:evidence-coverage
```

The helper refuses to run without PostgreSQL and does not print secrets.

## 2. Current Evidence Numbers

The user-observed evidence center state before the coverage fix was:

- Stored snapshots: 20
- Evaluation records: 20
- Unique evaluated fixtures: 17
- Gate verdict: `evidence_collection_continue`
- Display threshold: 8 unique fixtures
- Recalibration review threshold: 20 unique fixtures

The PostgreSQL audit then showed 48 completed group fixtures but only 20 snapshot rows. Because 31 completed fixtures had no snapshot, the limiting factor is pre-match capture coverage, not evaluation-gate math.

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

`packages/api/src/prematch-snapshot-capture.ts` discovers scheduled World Cup 2026 fixtures from normalized provider records and captures a snapshot only when the fixture is inside the configured pre-match window. It supports static group-stage identities and provider-backed knockout identities when the provider supplies resolved teams, kickoff, supported stage/matchday, and scheduled status.

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

Preflight and dry-run capture now share the same fixture identity resolver. Before the fix, preflight counted one scheduled provider fixture inside the timing window while dry run resolved only static group-stage fixtures, so a provider-backed knockout fixture could be reported as `in_current_capture_window: 1` but later show `eligible: 0` and only a coarse skipped count. Dry run now reports `skipped_by_reason` counts such as `already_completed`, `too_early`, `window_closed`, `unsupported_fixture_stage`, `unresolved_teams`, `invalid_kickoff`, and `already_captured`.

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

Important boundary: existing group-stage snapshot identities remain unchanged. Evaluation now also accepts provider-backed knockout snapshot IDs produced by capture, but it still rejects snapshots captured at or after kickoff and snapshots with unresolved/TBD teams.

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

Production had 20 stored snapshot rows at the time of audit. The exact fixture list requires PostgreSQL access. Run:

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

Observed primary cause:

- The capture scheduler had too few successful pre-match snapshots before completed group fixtures reached 48 completed matches.

Common causes:

- capture scheduler was not active before that fixture entered the 24h-to-15m window;
- provider kickoff/status was unavailable or invalid during the window;
- the fixture was already live/finished when capture ran;
- capture failed due prediction or persistence error;
- fixture was unsupported by the then-current group-stage-only capture/evaluation pipeline.

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

No local production row scan was possible in this environment, so whether any of the 20 production snapshots are post-kickoff must be answered by:

```bash
PERSISTENCE_PROVIDER=postgres DATABASE_URL="postgres://..." \
  pnpm --filter @world-cup-2026-predictor/api audit:evidence-coverage
```

### Status Priority Exclusions

Yes, status priority can exclude otherwise valid snapshots. A valid `foundation_unverified` snapshot is counted as non-primary if a valid `pre_match_locked` snapshot exists for the same fixture. This is intentional: `pre_match_locked` is stronger evidence.

### Preflight vs Dry-Run Eligibility Mismatch

The mismatch:

```txt
preflight: in_current_capture_window = 1
dry_run:   eligible = 0, skipped = 100
```

was caused by inconsistent eligibility scope. Preflight evaluated provider records by status, kickoff, and capture-window timing. Capture first resolved records through a static group-stage fixture lookup. Once all group-stage matches were complete and the current upcoming fixture was knockout, preflight could see an in-window provider fixture that capture treated as unsupported.

The fix is additive:

- group-stage fixture identities remain static and unchanged;
- provider-backed knockout records with canonical teams now receive deterministic `wc2026-knockout-<stage>-<providerFixtureId>` snapshot fixture IDs;
- knockout snapshots leave `group` unset so the PostgreSQL `group_code` A-L constraint is respected;
- completed-result evaluation resolves the same provider-backed knockout IDs;
- no retroactive snapshots are created.

## 6. Impact of Previous Provider/Topology Bugs

The provider-first knockout resolver changes the Home and `/tournament` knockout view model. It does not alter existing group-stage snapshot/evaluation identity.

Reasons:

- existing group-stage snapshot capture and completed evaluation remain based on static group-stage fixture IDs;
- new knockout snapshots use provider-backed deterministic IDs and are not inferred from stale internal topology;
- existing persisted snapshot IDs/content hashes are immutable;
- no database writes or migrations were introduced by the provider-first knockout resolver.

Provider-first knockout topology bugs do not make existing group-stage evidence stale. New knockout evidence must come only from provider-backed fixtures captured before kickoff.

## 7. Whether Recalibration Is Justified Now

No. Recalibration is not justified at 17 unique evaluated fixtures.

The current gate policy requires at least 20 unique evaluated fixtures for any recalibration review, and at least 25 for broader model review. With 17 unique fixtures, the correct action is to continue evidence collection.

## 8. Whether More Evidence Collection Is Needed

Yes. The project needs at least three more unique evaluated fixtures to reach the 20-fixture recalibration review threshold.

This threshold should be reached naturally if:

- pre-match capture is running before upcoming fixtures enter the capture window, including provider-backed knockout fixtures;
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
