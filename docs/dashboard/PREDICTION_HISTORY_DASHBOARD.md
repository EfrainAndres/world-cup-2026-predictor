# Prediction History Dashboard

## Purpose

The Prediction History Dashboard adds a read-only view over persisted World Cup 2026 prediction snapshots and their Model-vs-Reality evaluations.

It keeps three concerns separate on every record:

1. the immutable pre-match prediction;
2. the actual completed result;
3. the derived evaluation metrics.

The page never creates, updates, deletes, or regenerates prediction history.

## Route

- `/prediction-history`

The page loads server-side using the existing prediction-history persistence resolver and list handler.

## API Handler

- `listWorldCup2026PredictionHistory(query?)`

The handler:

- validates query parameters;
- resolves the configured persistence provider through `resolvePredictionHistoryPersistence()`;
- reads snapshots and evaluations from memory or PostgreSQL;
- joins one evaluation summary to each selected snapshot when available;
- returns paginated rows, filter metadata, summary counts, and safe persistence metadata.

## Query Parameters

Supported URL filters:

- `group`
- `team`
- `fixtureId`
- `status`
- `evaluationState`
- `page`
- `pageSize`
- `sort`

Defaults:

- `page=1`
- `pageSize=20`
- `evaluationState=all`
- `sort=captured_desc`

Allowed page sizes:

- `10`
- `20`
- `50`

Invalid values return the existing typed validation-error shape.

## Pagination

The response includes:

- current page;
- page size;
- total items;
- total pages;
- previous/next availability.

PostgreSQL pagination is query-backed and does not load the full snapshot history into memory just to page one result set.

## Filters

Filters are split into a basic tier and a collapsed advanced tier so the raw
fixture ID (an internal identifier) does not compete with the filters a
recruiter/QA reader actually needs first:

Basic filters:

- group A–L;
- team or match search (substring match against home or away team name);
- evaluated / pending / all;
- sort order.

Advanced filters (collapsed behind an "Advanced filters" `<details>` toggle):

- fixture ID (exact internal identifier, for QA/audit lookups);
- snapshot status;
- page size.

All filters share the same underlying query parameters and URL representation
as before — only the visual grouping changed. Filters are represented in the
URL so refresh and direct linking preserve the current state.

## Duplicate-Fixture Grouping (Display Only)

The current page's items are grouped by `fixtureId` for display. Each fixture
group shows:

- a header with team names, group, matchday, snapshot count, and evaluated count;
- one **preferred snapshot** shown prominently, selected using the same
  precedence as the evidence gate's one-per-fixture selection policy
  (`packages/api/src/live-prediction-evidence-gate.ts`): prefer
  `pre_match_locked` over `foundation_unverified`, then the latest
  `capturedAt`, then `snapshotId` descending;
- when a fixture has more than one stored snapshot, a "View all N snapshots
  for this fixture" details block containing every snapshot's full
  prediction/reality/accuracy detail, including its raw fixture ID.

This is a presentation-only grouping over already-fetched, already-valid
items. It does not alter pagination, persistence, or the evidence gate's own
audit selection — every stored snapshot remains reachable for QA/audit.

## Explainers

Two short, static explainer blocks accompany the summary and records:

- a Brier Score explainer near the filter-scoped summary
  ("Lower is better ... measures how close the predicted 1X2 probabilities
  were to the actual outcome");
- a "What do snapshot statuses mean?" details block using the exact
  capture-timing semantics from
  `docs/model-results/PREDICTION_SNAPSHOT_STORAGE.md` (pre_match_locked vs.
  foundation_unverified).

The "Historical match context was not captured for this snapshot" note is
shown once per fixture group rather than once per individual snapshot row.

## Prediction / Reality / Accuracy Separation

Each record is presented in three distinct sections:

### Prediction

- teams;
- group and matchday;
- captured time;
- kickoff time;
- snapshot status;
- projected score;
- xG;
- 1X2 probabilities;
- confidence and coverage.

### Reality

When evaluated:

- actual score;
- actual outcome;
- evaluation time.

When not evaluated:

- `Awaiting official completed result`

### Accuracy

When evaluated:

- outcome correct or incorrect;
- exact scoreline correct or miss;
- Brier Score;
- Log Loss;
- home-goal absolute error;
- away-goal absolute error.

## Memory and PostgreSQL Behavior

The page works with both supported persistence modes:

- `memory`
- `postgres`

Memory mode remains the default local and test path.

PostgreSQL mode reads through the same runtime resolver used by the snapshot and evaluation handlers.

## Security Boundaries

- No database URL is exposed to the browser.
- No raw PostgreSQL errors are rendered.
- No write action is exposed from the page.
- No mutable store references are exposed.
- No persistence secret uses `NEXT_PUBLIC_`.

## Known Limitations

- The page is read-only.
- No CSV or PDF export is included.
- No charts are included in this phase.
- Default local memory mode may legitimately show an empty history list if no snapshots or evaluations have been stored in that runtime instance.
- Projection cache persistence is unrelated to this page and is not used here.

## Future Improvements

- richer team filtering with grouped selectors;
- dedicated aggregate endpoints for larger history volumes;
- export workflows;
- charted evaluation trends;
- authenticated administrative history management if the product ever needs it.
