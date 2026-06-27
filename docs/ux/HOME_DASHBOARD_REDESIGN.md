# Home Dashboard Redesign

Phase: 12.19D  
Status: Complete

## Previous Home Problems

The previous Home page rendered roughly 36 visible regions. It mixed match activity, full prediction tooling, complete group standings, every tournament round, Elo tables, model diagnostics, historical validation, provider state, and repeated technical warnings in one long page.

The main issues were:

- too many sections with similar visual weight;
- match content appeared after model and methodology content;
- tournament projection detail was fragmented across many full sections;
- technical/provider/persistence metadata repeated across the page;
- mobile users had to scroll through full tables and bracket content before reaching key actions.

## New 8-Section Architecture

Home now has exactly 8 primary sections:

| Order | Section | Purpose |
| ---: | --- | --- |
| 1 | Compact Home introduction | Product identity, short description, primary actions. |
| 2 | Today's matches | Highest-priority match list, capped at 4 entries. |
| 3 | Featured prediction | One focused forecast summary with 1X2 probabilities. |
| 4 | Group snapshot | Up to 4 relevant group summaries with top teams. |
| 5 | Tournament outlook | Champion, runner-up, current phase, and a tournament CTA. |
| 6 | Model track record | Up to 4 public evidence metrics. |
| 7 | Quick actions | Four compact route actions. |
| 8 | Technical status disclosure | Collapsed provider/runtime/persistence status. |

## Content Moved

| Previous Home content | New route owner |
| --- | --- |
| Full daily match center with date navigation | `/matches` |
| Full Auto Predict form and result flow | `/predictions` |
| Full groups and fixtures overview | `/groups` |
| Full 12-group standings tables | `/groups` and `/groups/[group]` |
| Full tournament projection overview, rounds, bracket, third-place, and simulations | `/tournament` |
| Model status, Live Elo ratings, static team ratings, and historical validation | `/model` |
| Prediction history table and filters | `/prediction-history` |

## Content Retained On Home

Home retains only summary-level content:

- up to 4 prioritized matches;
- one featured prediction;
- up to 4 group snapshots;
- champion and runner-up outlook;
- compact model track record;
- route CTAs for deeper workflows;
- a single collapsed technical disclosure.

## Route Ownership

The route upgrades are intentionally targeted. They do not redesign destination pages; they move existing working functionality out of Home so no capability becomes unreachable.

- `/matches` owns date navigation and full daily match cards.
- `/predictions` owns scheduled fixture prediction, custom matchup selection, Auto Predict, and tournament form adjustment.
- `/groups` owns full group fixture and standings views.
- `/tournament` owns the detailed bracket/projection tree.
- `/model` owns model status, ratings, and historical validation evidence.

## Server-Side Data Reuse

Home preserves the one-sync-per-render strategy:

1. `getDashboardLiveSyncResult()` runs once.
2. The same sync result feeds daily matches, standings, and runtime diagnostics.
3. Home reads prediction history summary defensively; unavailable evidence degrades to "Evidence collection in progress."
4. Home may run one read-only featured prediction fallback when no stored upcoming prediction is available.
5. Home does not create immutable snapshots, write evaluations, mutate persistence, or call provider synchronization more than once.

The new Home avoids `getDashboardSnapshot()` because that helper eagerly computes the full tournament tree. Destination routes still use it where they intentionally own full detail.

## Mobile Behavior

The Home uses compact rows and stacked summaries:

- one match per compact row/card on narrow screens;
- flags stay visible through `TeamIdentity`;
- long team names can truncate inside their own row without forcing document overflow;
- group summaries use compact top-three lists instead of tables;
- tournament outlook stacks cleanly;
- the fixed mobile bottom navigation remains visible with existing shell padding;
- no full-width tables or bracket grids render on Home.

## Progressive Disclosure

Always visible:

- teams, flags, kickoff/status, score, projected score, key probabilities, points, champion/runner-up, and public evidence metrics.

Collapsed or moved:

- provider state, persistence state, last sync, fallback state, formula version, model version, calibration details, Elo internals, full scoreline lists, full diagnostics, and audit details.

## Accessibility

- Home keeps one application shell header and one main landmark.
- Each primary Home section has a stable `data-home-section` marker and accessible heading/label relationship.
- `TechnicalDisclosure` uses native `details`/`summary` and is collapsed by default.
- Team flags are rendered through the canonical `TeamIdentity`/`TeamFlag` path.
- CTAs are ordinary links to route-owned destinations, not nested interactive elements.

## Performance Impact

Expected impact:

- primary Home section count reduced from 36 visible regions to 8;
- full hidden tournament trees no longer render on Home;
- full match simulation form no longer hydrates on Home;
- full standings tables no longer render on Home;
- complete model/rating/history sections no longer render on Home;
- initial visible card count is materially lower.

The Home still performs dynamic Node.js SSR because live provider diagnostics and synchronized match/standings state remain server-side concerns.

## Deferred Work For 12.19E-H

- 12.19E: redesign `/matches` into a dedicated match experience rather than the current moved full section.
- 12.19F: redesign `/groups` and `/tournament` with route-specific IA and denser sports layouts.
- 12.19G: turn `/model` into a focused evidence center with clearer public metrics and technical disclosures.
- 12.19H: final responsive, accessibility, visual, and performance QA across the full route set.

## Non-Goals

This phase did not:

- change prediction formulas;
- recalibrate Elo/xG;
- change snapshot identity or persistence schema;
- modify evaluation logic;
- change database migrations;
- change result provider behavior;
- introduce authentication, notifications, personalization, or a third-party UI framework;
- redesign group detail or prediction history pages;
- replace flags or add federation crests.
