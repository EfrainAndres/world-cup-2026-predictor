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

The dashboard exposes accessible controls for:

- group A–L;
- team text filter;
- fixture ID;
- snapshot status;
- evaluated / pending / all;
- sort order;
- page size.

Filters are represented in the URL so refresh and direct linking preserve the current state.

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
