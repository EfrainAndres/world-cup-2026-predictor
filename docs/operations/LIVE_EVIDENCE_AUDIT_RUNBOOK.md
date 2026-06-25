# Live Evidence Audit Runbook

**Phase:** 12.18C1 — Live Prediction Evidence & Recalibration Gate

**Updated:** 2026-06-24

**Workflow:** `.github/workflows/live-prediction-evidence-audit.yml`

---

## GitHub Actions Execution

### Required GitHub Secret

| Secret | Purpose |
|---|---|
| `WC2026_DATABASE_URL` | Neon PostgreSQL connection string for the production database |

No results-provider token is required. The gate reads only persisted snapshots and
evaluations — it never calls football-data.org or any external results API.

### Manual Dispatch

1. Go to **Actions → Live Prediction Evidence Audit** in the GitHub repository.
2. Click **Run workflow**.
3. Select a mode:
   - `summary` — prints the evidence summary to the workflow log. No files written.
   - `write_artifact` — generates the JSON artifact and uploads it to GitHub Artifacts.
4. Click **Run workflow**.

### Expected Conservative Decision at Low Sample Size

With fewer than 20 unique evaluated fixtures the gate always returns
`evidence_collection_continue`. This is correct. The `summary` mode log will show:

```
DECISION: EVIDENCE_COLLECTION_CONTINUE
- Unique evaluated fixtures (N) below minForRecalibrationEvidence=20.
- Evidence is clean but sample is too small for a reliable recalibration verdict.
```

No model action is required when this verdict is returned.

### summary vs write_artifact Behavior

| Mode | Output | Files written | Artifact uploaded |
|---|---|---|---|
| `summary` | Human-readable stdout in workflow log | None | No |
| `write_artifact` | Human-readable stdout + JSON file | `docs/model-results/artifacts/world-cup-2026-live-prediction-evidence-gate.json` | Yes |

### Downloading the Artifact

After a `write_artifact` run:
1. Open the completed workflow run in the GitHub Actions UI.
2. Scroll to **Artifacts** at the bottom of the summary page.
3. Download `live-prediction-evidence-gate`.
4. The ZIP contains `world-cup-2026-live-prediction-evidence-gate.json`.

To commit the artifact to the repository for traceability, extract it to
`docs/model-results/artifacts/` and commit with a message referencing the gate verdict.

### Scheduling Policy

The workflow is **manual-only** by design. The gate returns `evidence_collection_continue`
until at least 20 unique fixtures are evaluated; running on a schedule before that
threshold generates noise without actionable output. Re-evaluate adding a schedule
(e.g. weekly) once the evidence sample reliably exceeds `minForRecalibrationEvidence=20`.

---

## Troubleshooting: GitHub Actions

### Missing secret — `WC2026_DATABASE_URL` not configured

The job will fail at the audit step with:
```
DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres.
```
Fix: Add the `WC2026_DATABASE_URL` secret in **Settings → Secrets and variables → Actions**.

### PostgreSQL connectivity failure

The job will fail at the audit step with a sanitized operational error (no connection
string is printed). Confirm:
- The Neon database is reachable from GitHub Actions (no IP allowlist restrictions).
- `WC2026_DATABASE_URL` contains a valid connection string (check for typos via a
  `dry_run` of the `evaluate:completed-predictions` workflow).

### write_artifact mode fails before upload

If the CLI exits with code 1, the artifact verification step catches the missing file:
```
::error::Expected artifact was not generated at docs/model-results/artifacts/...
```
Check the preceding step log for the root cause (postgres required, missing DATABASE_URL).

---

## When to Run

Run the live evidence gate:
- After every batch of completed fixtures has been evaluated
  (`pnpm --filter @world-cup-2026-predictor/api evaluate:completed-predictions`).
- After the evaluated fixture count crosses 8, 15, 20, or 25 (named thresholds).
- When a new model change is being considered, to confirm baseline evidence state.
- On demand for any stakeholder evidence review.

The gate is read-only and safe to run at any time.

---

## Prerequisites

- `PERSISTENCE_PROVIDER=postgres` and a valid `DATABASE_URL` for the production
  PostgreSQL database.
- At least one pre-match snapshot and one completed evaluation in the store.

---

## Running a Summary (stdout)

```bash
PERSISTENCE_PROVIDER=postgres \
DATABASE_URL="$DATABASE_URL" \
  pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
```

Prints the full evidence summary and gate decision to stdout.
No files are written. Safe to run repeatedly.

---

## Writing the JSON Artifact

```bash
LIVE_EVIDENCE_MODE=write_artifact \
PERSISTENCE_PROVIDER=postgres \
DATABASE_URL="$DATABASE_URL" \
  pnpm --filter @world-cup-2026-predictor/api audit:live-prediction-evidence
```

Writes to `docs/model-results/artifacts/world-cup-2026-live-prediction-evidence-gate.json`.

Override the path with `LIVE_EVIDENCE_OUTPUT_PATH`.

The artifact is the authoritative JSON record for that gate run.
Commit it to the repository for traceability.

---

## Reading the Output

### Key fields

| Field | Meaning |
|---|---|
| `decision` | The gate verdict (see below) |
| `decisionReasons` | Named reasons for the verdict |
| `blockedReasons` | Present only when `data_quality_blocked` |
| `nextRecommendedPhase` | Prose description of what to do next |
| `evidenceCounts.uniqueEvaluatedFixtures` | Number of distinct evaluated fixtures driving the verdict |
| `dataQualityAssessment.readinessVote` | Internal data quality pre-vote |
| `findings` | Named findings with severity (info/warning/critical) |

### Decision verdicts

| Verdict | Action |
|---|---|
| `insufficient_evidence` | Wait. Collect more snapshots and evaluations. |
| `data_quality_blocked` | Investigate `blockedReasons` and `dataQualityAssessment.issues`. Do not act on metrics. |
| `evidence_collection_continue` | No model change. Continue collecting. Re-run when fixture count grows. |
| `presentation_change_only` | Consider Phase 12.18B (show top-3 scorelines). No formula change. |
| `recalibrate_scoreline_selection` | Proceed to Phase 12.18B (scoreline selection change). |
| `recalibrate_elo_to_xg` | Proceed to Phase 12.18C (Elo-to-xG constant review). |
| `broader_model_review` | Multi-dimensional failure. Escalate for full model review. |

---

## Common Issues

### "insufficient_evidence" with 5 snapshots but 9 evaluations

The gate uses **unique evaluated fixtures** (one canonical snapshot per fixture).
If multiple evaluations belong to the same fixture (different snapshots), only one
snapshot is selected. Check `evidenceCounts.uniqueEvaluatedFixtures` vs.
`evidenceCounts.evaluatedSnapshots`.

### "data_quality_blocked"

Read `dataQualityAssessment.issues` for the specific problems.
Common causes:
- Many snapshots with invalid probability sums (>±2% from 1.0).
- High fallback coverage proportion.
- Duplicate evaluations for the same snapshot.

After fixing the underlying cause (re-running `evaluate:completed-predictions` is safe),
re-run the gate.

### Gate always returns "evidence_collection_continue"

This is the expected verdict until at least 20 unique fixtures have been evaluated.
Check `LIVE_EVIDENCE_GATE_THRESHOLDS.minForRecalibrationEvidence` (currently 20).

### NaN or Infinity in JSON artifact

This should never happen. If it does, report it as a bug — the service contract
guarantees all numeric fields are either `number` (finite) or `null`.

---

## Interpreting Metrics Before Recalibration Threshold

All metrics below `minForRecalibrationEvidence=20` are **preliminary**.
They may be directionally informative but must not be used to justify model
changes. Use them only to identify areas to watch as evidence grows.

---

## Artifact Retention

Keep every gate artifact in the repository under
`docs/model-results/artifacts/`. Name files by run date if multiple runs are
needed:

```
world-cup-2026-live-prediction-evidence-gate-2026-06-24.json
```

When a gate verdict changes (e.g. from `evidence_collection_continue` to
`recalibrate_scoreline_selection`), commit both the new artifact and the
decision record in CHANGELOG.md.

---

## Security Notes

- `DATABASE_URL` is never printed to stdout or stderr by the CLI.
- `write_artifact` mode requires `PERSISTENCE_PROVIDER=postgres` — it will
  refuse to run with in-memory storage and exit with code 1.
- The service is read-only: no snapshot or evaluation is ever created, updated,
  or deleted by this phase.
