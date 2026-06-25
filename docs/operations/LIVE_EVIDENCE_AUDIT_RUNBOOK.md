# Live Evidence Audit Runbook

**Phase:** 12.18C1 — Live Prediction Evidence & Recalibration Gate  
**Updated:** 2026-06-24

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
