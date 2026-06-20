# Today’s Matches Prediction & History Integration

Phase 12.12C extends the Match Center cards with read-only prediction and evaluation history.

## Purpose

The card should show three things without mixing them:

- the current or final match state
- the immutable pre-match prediction
- the historical model evaluation when a completed result has already been evaluated

This phase does not create predictions, snapshots, or evaluations automatically.

## Snapshot Selection

Daily-match history uses deterministic snapshot selection for each fixture:

1. `pre_match_locked` before `foundation_unverified`
2. latest valid pre-kickoff `capturedAt`
3. highest `snapshotId`

Rejected snapshots:

- post-kickoff captures
- unsupported snapshot states
- fixtures that do not match the card fixture identity

The API never reruns the model during selection.

## Evaluation Selection

Evaluation history is resolved only for the selected snapshot.

Rules:

- `snapshotId` must match the selected snapshot
- `fixtureId` must match the card fixture
- provider fixture identity must match when present
- final home/away scores must match the normalized completed result

Mismatched stored evaluations are ignored and surfaced only as read-only warnings.

## Card States

### Upcoming, no snapshot

`No pre-match prediction saved`

### Upcoming, snapshot available

Show:

- projected score
- 1X2 probabilities
- xG
- confidence
- coverage
- model version
- captured time

### Live or halftime

Show the immutable pre-match prediction under:

`Pre-match prediction`

Live score and prediction remain visually separate.

### Final, snapshot without evaluation

Show:

- final result
- saved prediction details
- `Evaluation pending`

### Final, evaluation available

Show:

- pre-match projected score
- final score
- outcome prediction result
- exact-score result
- Brier Score
- Log Loss
- total-goal absolute error

## Immutable Boundary

This integration is read-only.

It does not:

- create snapshots
- create evaluations
- mutate snapshot content
- mutate evaluation records
- regenerate predictions
- rewrite predictions from final results

## Missing History Behavior

Missing snapshot or evaluation data is not treated as an API failure.

Expected gaps include:

- no stored snapshot
- foundation-unverified snapshot only
- final result with evaluation pending
- in-memory store reset between runs

## In-Memory Limitation

Snapshot and evaluation stores are still in-memory foundations.

That means prediction history may disappear across server restarts or separate serverless instances even when the fixture data remains available.

## Future Work

Later work can add:

- persistent snapshot/evaluation storage
- saved prediction browsing
- fixture-level history pages
- richer comparison views between prediction and result
