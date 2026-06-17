# Phase 12.0 - Live Data, Model Quality & UX Backlog

## Purpose

Phase 12.0 is documentation-only. It defines how the project should evolve from a mostly static World Cup 2026 predictor into a live, confidence-aware World Cup intelligence dashboard without rushing into provider integrations, model changes, or UI implementation before the architecture is clear.

This backlog is intentionally value-first:

1. Improve the primary prediction experience.
2. Make data freshness, fallback usage, and confidence explicit.
3. Add live-results infrastructure that does not break when providers fail.
4. Ingest real tournament results safely and evaluate model quality with immutable snapshots.
5. Expand into richer product experiences only after the live prediction loop is trustworthy.

## Phase 12 Workflow Gate

Before starting any future phase:

1. Fetch `origin`.
2. Compare the current branch with `origin/main`.
3. Inspect open pull requests when GitHub tooling is available.
4. Verify the previous completed branch was actually merged.
5. Stop if prior work is still unmerged.
6. Create the new branch only from the latest `origin/main`.

Pushing a branch does not mean it has been merged.

## Product Direction

The preferred future experience is not a raw free-form team picker. The primary journey should be:

1. Open a scheduled World Cup match from its group and official fixture order.
2. See prediction, confidence, freshness, and tournament context in one place.
3. Watch standings and qualification projections refresh as official results are processed.
4. Compare pre-match predictions against what actually happened.

Custom matchups remain available as an advanced workflow, not the default path.

## Required Capability Foundations

### Live Fixtures and Results

Future live data support should normalize:

- scheduled fixtures
- live matches
- halftime state
- finished state
- scores
- kickoff date/time
- matchday
- group
- venue when available
- postponed state
- cancelled state
- last successful synchronization timestamp

Resilience chain:

1. external provider
2. last valid cache
3. local static fallback

Standings and projections must continue working when the external provider is unavailable.

### Live Group Standings States

Future standings logic must distinguish between:

- official standings: completed matches only
- provisional live standings: in-progress matches reflected as current state
- projected standings: unplayed fixtures resolved by model output

The product should eventually update:

- played
- wins
- draws
- losses
- goals for
- goals against
- goal difference
- points
- group order
- best third-place ranking
- projected Round of 32 qualification

### World Cup 2026 Results Ingestion Flow

Completed match ingestion should follow this future flow:

1. receive official result
2. validate and normalize it
3. detect duplicates using a stable fixture identifier
4. persist or cache the processed result
5. update Elo only once
6. update recent-form and attack/defense inputs when supported
7. recalculate future fixtures
8. refresh qualification and knockout projections
9. preserve the original pre-tournament prediction for comparison

Required safeguards:

- `providerFixtureId`
- processing status
- `processedForRatingsAt`
- idempotent ingestion
- no look-ahead leakage
- no use of a match result in its own pre-match prediction

### Known Model Quality Problems

Observed issues to carry into future evaluation work:

- Elo-to-xG differences are too compressed.
- Fallback rating `1500` can make weak or missing teams appear artificially competitive.
- Fallback predictions can display false precision.
- Current presets may not separate scenarios sufficiently.
- Sparse or old international data affects reliability.
- Isolated large wins must not be overfitted.
- Manual contextual adjustments can also be wrong.
- External consensus must be treated as evaluation evidence, not as automatic truth.

Known evaluation cases to revisit:

- Germany vs Curacao
- Spain vs Cape Verde
- Belgium vs Egypt
- Saudi Arabia vs Uruguay
- Iran vs New Zealand
- Iraq vs Norway
- Argentina vs Algeria
- Austria vs Jordan
- Portugal vs DR Congo
- England vs Croatia
- Ghana vs Panama
- Uzbekistan vs Colombia

This document does not invent missing outcomes or statistics for those examples.

### Confidence and Provenance

Future confidence levels:

- High
- Medium
- Low
- Very Low

Confidence should consider:

- full Elo coverage
- partial Elo coverage
- fallback use
- number of historical matches
- recency
- attack/defense data availability
- current tournament matches processed
- provider freshness
- missing inputs

Future user-facing provenance fields:

- data source
- last successful sync
- coverage type
- fallback status
- number of relevant matches
- tournament matches included
- confidence reasons
- manual xG recommendation

### UX Direction

Scheduled World Cup match mode should be the primary experience:

- user selects a group
- user selects one scheduled fixture in that group
- home and away teams fill automatically
- matchday, date, time, and status are shown
- prediction uses official fixture order

Custom matchup mode remains available as an advanced option:

- searchable team selectors
- groups A-L visible
- all 48 teams available
- aliases supported
- selected home team excluded from away options
- swap-teams action
- keyboard navigation
- mobile-friendly behavior

### Group-Centered and Daily Experiences

Future group detail view should contain:

- current standings
- completed results
- live matches
- upcoming fixtures
- predictions for remaining fixtures
- data confidence
- qualification probabilities
- link to detailed match analysis

Future daily live center should contain:

- today’s matches
- upcoming, live, and final states
- pre-match prediction
- saved prediction timestamp
- projected score
- 1X2 probabilities
- expected goals
- confidence
- result after the match
- link to model-vs-reality evaluation

Pre-match predictions must become immutable once a match starts.

### Model vs Reality Tracking

Future stored evaluation inputs:

- prediction timestamp
- model version
- Elo inputs
- expected goals
- outcome probabilities
- top scorelines
- confidence
- actual result
- winner accuracy
- draw accuracy
- exact-score accuracy
- absolute goal error
- Brier Score
- Log Loss
- calibration by confidence level
- performance with and without fallback ratings

### Future Model Improvements

Future model backlog includes:

- expanded international dataset
- complete World Cup 2026 result ingestion
- Elo-to-xG Calibration V2
- recent-form weighting
- current-tournament form
- opponent-strength adjustment
- neutral-venue treatment
- optional squad-availability context
- context-adjusted xG
- Tournament Reality preset only after empirical calibration
- historical backtesting before formula replacement

### Commercial and Post-World-Cup Opportunities

Future product opportunities:

- daily predictions landing page
- group intelligence pages
- shareable prediction cards
- sponsor-ready branding
- creator/media dashboard
- prediction accuracy reports
- multi-tournament architecture after product validation

The product should not be framed as a gambling or betting tool.

## Ordered Backlog

| Priority | Phase | Item | Value Track | Primary Surfaces |
| --- | --- | --- | --- | --- |
| 1 | 12.1 | Scheduled Match Selector by Group | Immediate value | UI, API |
| 2 | 12.2 | Searchable Grouped Team Selectors | Immediate value | UI |
| 3 | 12.3 | Prediction Confidence and Data Coverage | Immediate value | UI, API, data |
| 4 | 12.4 | External Results-Provider Foundation | Immediate value | API, data |
| 5 | 12.5 | Live Results Synchronization | Immediate value | API, data |
| 6 | 12.6 | Live Group Standings | Immediate value | UI, API, data, model |
| 7 | 12.7 | World Cup Results-to-Elo Ingestion | Model value | API, data, model |
| 8 | 12.8 | Prediction Snapshot Storage | Model value | API, data |
| 9 | 12.9 | Model vs Reality Tracker | Model value | UI, API, data, model |
| 10 | 12.10 | Tournament-Form Adjustment | Model value | model, API |
| 11 | 12.11 | Elo-to-xG Calibration V2 | Model value | model, API |
| 12 | 12.12 | Today’s Matches and Live Match Center | Product value | UI, API, data |
| 13 | 12.13 | Group Detail Prediction Pages | Product value | UI, API, data |
| 14 | 12.14 | Automatic Projection Refresh | Product value | UI, API, data, model |
| 15 | 12.15 | Shareable Prediction Cards | Product value | UI, API |
| 16 | 12.16 | Multi-Tournament Architecture After Validation | Product value | UI, API, data, model |

## Detailed Backlog Items

### 12.1 Scheduled Match Selector by Group

- Problem: the current free-form workflow makes users supply context the product already knows, and it hides official tournament structure.
- Proposed capability: make group-first scheduled fixture selection the default prediction path with auto-filled home/away teams plus matchday, date/time, and status.
- User value: faster, lower-friction match prediction with clearer tournament context and fewer input mistakes.
- Dependencies: static fixture foundation, future live fixture metadata, grouped selector UI.
- Major risks: provider mismatch with local fixture ids, stale kickoff metadata, duplicate fixture representations.
- Acceptance criteria: users can select group then fixture; teams fill automatically; official fixture order is preserved; status and scheduled time are visible.
- Tests expected: UI flow coverage, API contract coverage for fixture metadata, accessibility checks for selector state.
- Affects: UI, API.
- Priority: 1.
- Recommended phase number: 12.1.

### 12.2 Searchable Grouped Team Selectors

- Problem: custom matchup entry still needs to work for exploration, but flat selectors make all-team coverage harder to navigate.
- Proposed capability: add grouped A-L team selectors with alias support, swap action, keyboard support, and exclusion of the chosen home team from away options.
- User value: advanced comparisons stay available without forcing users to remember exact naming.
- Dependencies: 48-team coverage, alias normalization, existing match simulation UX.
- Major risks: accessibility regressions, inconsistent alias labeling, mobile overflow.
- Acceptance criteria: all 48 teams available; grouped search works; aliases resolve cleanly; swap action works; keyboard navigation is accessible.
- Tests expected: UI interaction tests, alias coverage tests, E2E custom-match smoke coverage.
- Affects: UI.
- Priority: 2.
- Recommended phase number: 12.2.

### 12.3 Prediction Confidence and Data Coverage

- Problem: current outputs can look more certain than the underlying coverage, freshness, and fallback usage justify.
- Proposed capability: expose High/Medium/Low/Very Low confidence plus provenance fields, fallback state, freshness, and confidence reasons.
- User value: predictions become easier to trust appropriately and easier to challenge when inputs are weak.
- Dependencies: live Elo metadata, provider metadata, future result freshness metadata.
- Major risks: false precision in confidence labels, overly simplistic thresholds, UI clutter.
- Acceptance criteria: every prediction includes confidence level, coverage type, fallback status, relevant-match count, tournament-matches-included count, and short reasons.
- Tests expected: contract tests for provenance fields, deterministic confidence classification tests, UI rendering checks for fallback and freshness badges.
- Affects: UI, API, data.
- Priority: 3.
- Recommended phase number: 12.3.

### 12.4 External Results-Provider Foundation

- Problem: current standings and projections rely on local static records with no normalized path for live provider data.
- Proposed capability: define provider adapter contracts, normalized fixture/result model, provider freshness metadata, and resilience chain of external provider -> cache -> local static fallback.
- User value: live tournament experiences can be added without breaking the existing deterministic dashboard when providers fail.
- Dependencies: fixture identifiers, result provider strategy, cache design.
- Major risks: provider schema drift, unstable identifiers, hidden coupling between provider data and standings logic.
- Acceptance criteria: provider interface documented; normalized fixture/result fields defined; fallback chain explicit; standings and projections remain available when provider is down.
- Tests expected: provider adapter unit tests, cache fallback tests, contract tests for result-source metadata.
- Affects: API, data.
- Priority: 4.
- Recommended phase number: 12.4.

### 12.5 Live Results Synchronization

- Problem: provider foundation alone does not define how data gets refreshed, validated, and carried forward safely.
- Proposed capability: synchronize scheduled, live, halftime, finished, postponed, and cancelled fixtures with last successful sync tracking and last valid cache reuse.
- User value: users can trust that tournament state reflects the latest successful refresh without blanking the product during outages.
- Dependencies: 12.4 provider foundation, cache policy, normalized fixture status model.
- Major risks: partial sync writes, duplicate fixture updates, stale cache presented as current without warning.
- Acceptance criteria: sync stores freshness metadata, preserves last valid cache, distinguishes scheduled/live/final/postponed/cancelled, and surfaces sync warnings.
- Tests expected: sync idempotency tests, stale-cache fallback tests, contract tests for status and freshness fields.
- Affects: API, data.
- Priority: 5.
- Recommended phase number: 12.5.

### 12.6 Live Group Standings

- Problem: users need standings that reflect completed matches, active live scenarios, and projected remaining fixtures without mixing those states silently.
- Proposed capability: compute official standings, provisional live standings, best third-place ranking, and projected Round of 32 qualification from synchronized results.
- User value: the dashboard becomes useful during the tournament rather than only before it.
- Dependencies: 12.4 provider foundation, 12.5 sync, existing group standings engine, best third-place logic, projection refresh rules.
- Major risks: confusing official vs provisional vs projected views, active-match volatility, tie-break ambiguity.
- Acceptance criteria: standings mode is explicit; official completed-only table exists; live provisional state exists; projected qualification updates exist; best third-place ranking stays deterministic.
- Tests expected: standings-state calculation tests, API contract tests, E2E rendering checks for official/provisional/projected labels.
- Affects: UI, API, data, model.
- Priority: 6.
- Recommended phase number: 12.6.

### 12.7 World Cup Results-to-Elo Ingestion

- Problem: completed tournament results must influence future forecasts, but ratings updates must stay idempotent and leakage-free.
- Proposed capability: ingest official results once, dedupe by stable fixture id, record processing status and `processedForRatingsAt`, and update Elo/recent-form inputs without self-leakage.
- User value: future predictions reflect the actual tournament while preserving trustworthy historical comparison.
- Dependencies: 12.4 provider foundation, 12.5 sync, stable fixture ids, ratings pipeline hooks.
- Major risks: double-processing results, rating contamination, using a result in its own pre-match prediction, loss of pre-tournament baseline.
- Acceptance criteria: `providerFixtureId` and processing state exist; Elo updates only once per match; pre-tournament predictions are preserved for comparison; future fixtures recalculate after successful ingestion.
- Tests expected: ingestion idempotency tests, duplicate-detection tests, no-look-ahead tests, rating-update sequencing tests.
- Affects: API, data, model.
- Priority: 7.
- Recommended phase number: 12.7.

### 12.8 Prediction Snapshot Storage

- Problem: model evaluation and product trust both break down if pre-match predictions can be overwritten after kickoff.
- Proposed capability: store immutable pre-match prediction snapshots with timestamp, model version, Elo inputs, expected goals, probabilities, scorelines, confidence, and fallback metadata.
- User value: the product can show what it predicted before kickoff and compare that to reality later.
- Dependencies: scheduled fixture ids, prediction metadata, 12.7 ingestion rules.
- Major risks: snapshot duplication, mutable records after match start, missing schema versioning.
- Acceptance criteria: each scheduled match can store one immutable pre-match snapshot version per prediction event; snapshots remain available after results arrive.
- Tests expected: snapshot immutability tests, API contract tests, duplicate-prevention tests, storage schema validation.
- Affects: API, data.
- Priority: 8.
- Recommended phase number: 12.8.

### 12.9 Model vs Reality Tracker

- Problem: current project quality claims are mostly structural; the product needs persistent evidence of forecast performance.
- Proposed capability: compare stored predictions with actual outcomes and report winner accuracy, draw accuracy, exact-score accuracy, absolute goal error, Brier Score, Log Loss, confidence calibration, and fallback-vs-full-coverage splits.
- User value: users and interview reviewers can inspect where the model performs well, where it fails, and how fallback behavior changes quality.
- Dependencies: 12.7 result ingestion, 12.8 prediction snapshots, evaluation metric definitions.
- Major risks: small-sample overinterpretation, confidence-label misuse, biased comparisons across partial coverage.
- Acceptance criteria: each completed tracked fixture can be scored; dashboard/reporting can segment by confidence and fallback status; original prediction metadata is preserved.
- Tests expected: metric calculation tests, contract tests for stored evaluation records, UI/report rendering checks.
- Affects: UI, API, data, model.
- Priority: 9.
- Recommended phase number: 12.9.

### 12.10 Tournament-Form Adjustment

- Problem: pre-tournament priors can become stale once several tournament matches have been played, but ad hoc form adjustments can easily overfit noise.
- Proposed capability: add a controlled tournament-form layer that updates future match context only after ingestion and snapshot tracking are stable.
- User value: later-stage predictions can reflect current competition form without pretending that a single big result fully changes team strength.
- Dependencies: 12.7 ingestion, 12.8 snapshots, 12.9 evaluation baseline.
- Major risks: overfitting isolated wins, double-counting Elo movement plus form, hiding manual overrides behind opaque logic.
- Acceptance criteria: tournament-form effect is optional, documented, bounded, and measurable against the baseline model.
- Tests expected: deterministic model tests, no-double-count tests, backtesting comparisons against non-form baseline.
- Affects: model, API.
- Priority: 10.
- Recommended phase number: 12.10.

### 12.11 Elo-to-xG Calibration V2

- Problem: current Elo-to-xG behavior appears too compressed in several evaluation cases, and fallback ratings can exaggerate weak-team competitiveness.
- Proposed capability: recalibrate the Elo-to-xG mapping after broader evaluation evidence, historical backtesting, and tournament tracking exist.
- User value: scoreline and 1X2 outputs become more believable in mismatched fixtures while staying transparent.
- Dependencies: 12.9 evaluation tracker, expanded dataset work, calibration research.
- Major risks: replacing a transparent formula with a less explainable one, calibration drift from sparse data, overfitting headline mismatches.
- Acceptance criteria: V2 is benchmarked against V1, documented, and supported by historical and tournament evaluation evidence before any default switch.
- Tests expected: calibration regression tests, benchmark comparison reports, deterministic API/model tests.
- Affects: model, API.
- Priority: 11.
- Recommended phase number: 12.11.

### 12.12 Today’s Matches and Live Match Center

- Problem: once live data exists, users need a fast daily view rather than navigating group tables and standalone match pages manually.
- Proposed capability: add a daily center showing today’s upcoming, live, and final matches with pre-match snapshot timestamp, projected score, 1X2 probabilities, expected goals, confidence, and result review link.
- User value: the product becomes habit-forming and much easier to use during the tournament day-by-day.
- Dependencies: 12.5 live sync, 12.8 immutable snapshots, 12.9 evaluation links.
- Major risks: state confusion around live vs pre-match predictions, cluttered mobile layout, stale data banners ignored by users.
- Acceptance criteria: daily list distinguishes upcoming/live/final; pre-match predictions remain immutable after kickoff; result-review links exist for completed matches.
- Tests expected: API freshness tests, E2E live-center rendering checks, accessibility and mobile layout coverage.
- Affects: UI, API, data.
- Priority: 12.
- Recommended phase number: 12.12.

### 12.13 Group Detail Prediction Pages

- Problem: group context is currently fragmented across standings, fixtures, and match prediction surfaces.
- Proposed capability: build group detail pages that combine standings, completed results, live matches, upcoming fixtures, remaining-fixture predictions, confidence, and qualification probabilities.
- User value: users can understand a group race without manually stitching together several dashboard sections.
- Dependencies: 12.6 live standings, 12.8 snapshots, 12.14 projection refresh.
- Major risks: heavy page density, inconsistent source labeling between official/live/projected states, duplicated logic across pages.
- Acceptance criteria: each group page exposes current table, recent/completed results, upcoming fixtures, remaining-fixture predictions, confidence context, and qualification summary.
- Tests expected: route/render tests, data-state tests for official/live/projected sections, E2E group-page smoke coverage.
- Affects: UI, API, data.
- Priority: 13.
- Recommended phase number: 12.13.

### 12.14 Automatic Projection Refresh

- Problem: once live results arrive, qualification and bracket projections must update consistently without manual recomputation steps.
- Proposed capability: automatically refresh standings, best third-place ranking, Round of 32 qualification, and downstream knockout projections after successful result processing.
- User value: projections stay coherent with the latest official state and users do not need to guess whether brackets are stale.
- Dependencies: 12.5 live sync, 12.6 live standings, 12.7 ingestion, 12.8 snapshots.
- Major risks: race conditions between sync and projection refresh, mixed-state caches, expensive recomputation chains.
- Acceptance criteria: successful result processing triggers deterministic projection refresh; warnings surface when data is partially refreshed or stale.
- Tests expected: integration tests for refresh orchestration, cache-consistency tests, contract tests for updated timestamps.
- Affects: UI, API, data, model.
- Priority: 14.
- Recommended phase number: 12.14.

### 12.15 Shareable Prediction Cards

- Problem: portfolio, creator, and sponsor use cases need polished artifacts rather than requiring people to inspect the full dashboard.
- Proposed capability: produce shareable prediction cards and summary exports that show pre-match probabilities, expected goals, confidence, freshness, and later model-vs-reality outcomes.
- User value: easier portfolio presentation, social sharing, and sponsor-ready storytelling without turning the product into a betting tool.
- Dependencies: 12.3 confidence/provenance, 12.8 snapshots, 12.9 evaluation records.
- Major risks: oversimplified claims, branding drift, sharing stale predictions without freshness context.
- Acceptance criteria: cards include timestamp, confidence, freshness, and clear non-betting framing; prediction and result variants are both defined.
- Tests expected: UI rendering checks, export layout tests if implemented, provenance-field contract tests.
- Affects: UI, API.
- Priority: 15.
- Recommended phase number: 12.15.

### 12.16 Multi-Tournament Architecture After Validation

- Problem: the codebase may eventually support more competitions, but expanding too early can dilute World Cup 2026 product quality and evidence gathering.
- Proposed capability: generalize fixture, standings, ingestion, snapshot, and evaluation workflows only after the live World Cup workflow proves valuable.
- User value: future reuse across tournaments without sacrificing the clarity of the current World Cup product.
- Dependencies: live World Cup flow validated end-to-end, product value confirmed, provider abstraction matured.
- Major risks: premature abstraction, generalized schemas that weaken World Cup-specific UX, extra maintenance burden before product validation.
- Acceptance criteria: architecture proposal is informed by actual live World Cup usage and evaluation evidence; no multi-tournament generalization happens before validation.
- Tests expected: future contract-compatibility tests, generalized schema tests, migration tests if the expansion is implemented later.
- Affects: UI, API, data, model.
- Priority: 16.
- Recommended phase number: 12.16.

## Recommended Next Phase

Recommended next implementation phase: `12.1 Scheduled Match Selector by Group`.

Reason:

- It delivers the biggest immediate UX improvement without requiring live provider integration first.
- It re-centers the product around official tournament structure rather than free-form manual entry.
- It prepares the UI contract needed for later confidence, live sync, and group-detail work.
