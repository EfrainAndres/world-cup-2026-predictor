# Model and Evidence Center — UX Specification

Phase 12.19G. Route: `/model`.

## Product goal

Turn `/model` into the primary Model and Evidence Center: a single destination
where operators can understand what the production model is, verify the data
pipeline that produces every prediction, read the live evidence accumulated from
real WC2026 matches, and check the recalibration gate verdict.

The page is read-only. It does not trigger recalibration, does not write any
records, and does not sync result-provider data. Evidence is loaded once per
render from persistence.

---

## Information architecture — 7 regions

| # | Section ID | Heading |
|---|-----------|---------|
| 1 | `#model-status` | Model status |
| 2 | `#model-pipeline` | How predictions are produced |
| 3 | `#model-configuration` | Production model configuration |
| 4 | `#model-confidence` | Confidence and data coverage |
| 5 | `#model-evidence` | Model-vs-reality evidence |
| 6 | `#model-recalibration` | Recalibration gate |
| 7 | `#model-disclosure` | Technical disclosure |

---

## Region 1 — Model status

**Component:** `ModelStatusSummary`

Always rendered. Never shows a spinner or loading state (SSR).

Shows:
- "Production active" badge (always teal/success).
- Evidence state badge (derived from `ModelEvidenceStateKind`).
- Definition list: formula version, model version (monospace), active preset,
  persistence type, stored snapshots count, evaluated fixtures count, gate
  verdict (if available), evidence updated timestamp.
- Progress bar (`role="progressbar"`) toward minimum evidence threshold
  (`minUniqueEvaluatedFixtures = 8`). Amber while below threshold, teal once met.
- Warnings list if `data.warnings.length > 0`.

**Empty states:** handled by the evidence state badge and warnings list — no
dedicated empty region for status.

---

## Region 2 — Prediction pipeline

**Component:** `PredictionPipelineOverview`

Static 8-step ordered list. Steps:
1. Resolve canonical teams
2. Load baseline or live Elo
3. Apply Elo-to-xG conversion (V2)
4. Build score probability matrix
5. Aggregate 1X2 probabilities
6. Select likely scorelines
7. Attach confidence and coverage metadata
8. Optionally persist immutable snapshot

Note box: tournament-form adjustment is off by default.

No data dependencies — renders identically regardless of evidence state.

---

## Region 3 — Production configuration

**Component:** `ProductionModelConfiguration`

Primary DL shows: formula version, active preset, tournament-form adjustment
(off by default), tournament-result adjustment (off by default), V1 rollback
availability, manual xG mode availability.

Inside a `<details>` disclosure: full V2 vs V1 parameter table (adjustment per
100, max adjustment, base/min/max goals), Poisson config (max goals per side,
normalization), model version string.

Values come from `getProductionModelConfig()` in `model-evidence-center.ts` —
a pure function with no I/O. Constants are sourced from the api package where
exported, or from documented model-package constants with source comments.

---

## Region 4 — Confidence and coverage guide

**Component:** `ConfidenceCoverageGuide`

Two-column grid:
- Confidence levels: `high`, `medium`, `low`, `very_low` — each with badge,
  description, and note.
- Coverage types: `full`, `partial`, `fallback`, `fallback_only` — each with
  label and description.

Blue notice box: confidence describes input data quality, not prediction accuracy.

`<details>` disclosure: fallback behavior and manual xG recommendation.

---

## Region 5 — Model-vs-reality evidence

**Component:** `ModelEvidenceSummary`

**If `stateKind !== "usable"`:** renders an `EvidenceEmptyState` with a
message appropriate to the state kind. No metrics are shown.

**If `stateKind === "usable"`:**
- Sample size header (`n=X evaluated fixtures`).
- 4-cell metric grid: 1X2 outcome accuracy, draw accuracy, exact-score
  accuracy, mean Brier score.
- Goal absolute errors row: home goals MAE, away goals MAE, total goals MAE,
  goal diff MAE.
- `<details>` disclosure: by-confidence-level accuracy table
  (`WorldCup2026ModelRealityConfidenceSummary[]`).
- Footer: mean log loss value with context note.

---

## Region 6 — Recalibration gate

**Component:** `RecalibrationGateSummary`

**If `gateReport === null`:** shows an empty state panel.

**Otherwise:**
- Verdict banner: colour-coded by `statusVariant` from `getVerdictPresentation()`.
  Shows title, decision badge, explanation, next action. Warning box if
  `preserveModel === false`.
- Recalibration threshold progress bar toward
  `minForRecalibrationEvidence = 20`.
- `<details>` disclosures for decision reasons and blocked reasons (if any).
- Next recommended phase label.
- Footer: "No recalibration is performed automatically" note.

---

## Region 7 — Technical disclosure

Expandable `<details>` panels:
- Model scope (list from `modelInfo.modelScope`).
- Known limitations (list from `modelInfo.limitations`).
- Supported prediction handlers (monospace list from
  `modelInfo.supportedHandlers`).
- Model package identifier (monospace string).

---

## Cross-page CTAs

`<nav aria-label="Related pages">` at page bottom:
- Run a prediction → `/match`
- Group standings → `/groups`
- Tournament bracket → `/tournament`

---

## Data composition

**Function:** `getModelEvidenceCenterData()` in `apps/web/src/lib/server-runtime.ts`

Sequence:
1. `getModelInfo()` — pure, no I/O.
2. Check `getPredictionHistoryPersistenceConfig()` — is PostgreSQL configured?
3. `resolvePredictionHistoryPersistence()` — called exactly once.
4. `Promise.all([snapshotStore.list({limit: 2000}), evaluationStore.list({limit: 2000})])`.
5. `summarizeWorldCup2026ModelReality(evaluations)` — pure.
6. `runLiveEvidenceGate({snapshots, evaluations, generatedAt, persistenceMetadata})` — pure.
7. `deriveEvidenceStateKind(...)` — pure.

All errors are caught. Returns a valid `ModelEvidenceCenterData` for every error
path with appropriate `stateKind` and `warnings`.

**No `getDashboardSnapshot()` call** — that triggers full knockout-tree computation
and is not needed on the Model page.

---

## Evidence state machine

| `stateKind` | Meaning |
|---|---|
| `no_persistence_configured` | PostgreSQL not configured — in-memory only |
| `persistence_error` | Configured but inaccessible |
| `no_evidence` | No snapshots or evaluations stored |
| `insufficient` | `< minUniqueEvaluatedFixtures (8)` evaluated fixtures |
| `data_quality_blocked` | Quality issues block reliable verdict |
| `usable` | Sufficient clean evidence for metrics |

---

## Pure helper module

`apps/web/src/lib/model-evidence-center.ts`

Exports:
- `deriveEvidenceStateKind` — state machine
- `getEvidenceState` — state presentation
- `getVerdictPresentation` — all 7 gate decision presentations
- `getConfidenceLevelPresentation` — 4 confidence levels
- `getCoverageTypePresentation` — 4 coverage types
- `formatEvidencePercent`, `formatEvidenceDecimal`, `formatEvidenceGoals`,
  `formatSampleSize`, `formatEvidenceCount` — metric formatters
- `getEvidenceProgress` — progress toward minimum threshold (8)
- `getRecalibrationProgress` — progress toward recalibration threshold (20)
- `getProductionModelConfig` — `ProductionModelConfigViewModel`
- `getModelVersionLabel`

---

## Responsive behaviour

- Two-column grid for confidence/coverage guide collapses to one on narrow viewports.
- Metric grid: `grid-cols-2` by default, `sm:grid-cols-3 lg:grid-cols-4`.
- Wide tables (`<details>` disclosures) wrapped in `overflow-x: auto`.
- Body never scrolls horizontally. Verified at 320, 375, 390, 430 px widths.

---

## Accessibility

- Every `<section>` has `id` and `aria-labelledby` pointing to its `<h2>`.
- Progress bars use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`,
  `aria-valuemax`, `aria-label`.
- Tables have `aria-label` and `<caption class="sr-only">` where appropriate.
- All `<details>` disclosures use list-none `<summary>` with visible focus ring.
- Badge colours satisfy WCAG AA contrast.

---

## Non-goals

- No recalibration or parameter promotion — read-only.
- No AI-generated commentary on results.
- No chart library — plain HTML/CSS for progress bars.
- No writes to persistence.
- No provider sync.
- No `getDashboardSnapshot()` call on this route.
- No calibration bucket chart — data is exposed in the gate report only.

---

## Components added

| Component | File |
|---|---|
| `ModelStatusSummary` | `src/components/ModelStatusSummary.tsx` |
| `PredictionPipelineOverview` | `src/components/PredictionPipelineOverview.tsx` |
| `ProductionModelConfiguration` | `src/components/ProductionModelConfiguration.tsx` |
| `ConfidenceCoverageGuide` | `src/components/ConfidenceCoverageGuide.tsx` |
| `ModelEvidenceSummary` | `src/components/ModelEvidenceSummary.tsx` |
| `RecalibrationGateSummary` | `src/components/RecalibrationGateSummary.tsx` |

---

## Tests

- **Unit tests:** `apps/web/src/lib/model-evidence-center.test.ts` — 63 tests.
  Covers all 7 gate decisions, all 4 confidence levels, all 4 coverage types,
  all 6 evidence state kinds, all metric formatters, progress helpers,
  configuration constants.
- **Playwright tests:** `apps/web/tests/e2e/model.spec.ts` — covers all 7
  section IDs, pipeline step count, configuration disclosure, confidence guide
  content, gate progress bar, CTAs, mobile no-horizontal-overflow at 4
  viewports, aria-labelledby headings for all sections.
