# Roadmap

This roadmap organizes the project into phases so each step has a clear purpose and quality bar.

| Phase | Name | Primary Outcome | Status |
| --- | --- | --- | --- |
| 0.0 | Project Foundation | Define scope, docs, roadmap, and working standards. | Done |
| 0.1 | Architecture Foundation | Define repository structure, architecture rules, ADRs, and package boundaries. | Done |
| 0.2 | Technical Decisions Foundation | Define stack choices, coding standards, Git workflow, and technical ADRs. | Done |
| 0.5 | UX Research & Product Discovery | Research dashboard patterns, prediction UX, product principles, and user journeys. | Done |
| 0.6 | Data & Modeling Research | Define data sources, data dictionary, model path, validation, and backtesting strategy. | Done |
| 0.7 | Delivery & Development Plan | Define repository structure, Definition of Done, milestones, and release strategy. | Done |
| 0.8 | AI Collaboration Workflow | Document how Codex CLI and Claude Code collaborate, hand off between sessions, and minimize token usage. | Done |
| 1.0 | Data Pipeline Foundation | Create workspace structure, data package contracts, validation, normalization, and tests. | Done |
| 2.0 | Elo Baseline Foundation | Build a transparent baseline rating and prediction model. | Done |
| 3.0 | Poisson/Dixon-Coles Foundation | Model goal distributions and improve match probability estimates. | Done |
| 4.0A | Monte Carlo Simulation Engine Foundation | Simulate single matches from scoreline probabilities. | Done |
| 4.0B | Tournament Simulation Foundation | Simulate groups, knockouts, and a simplified tournament. | Done |
| 4.0C | Tournament Simulation Validation & Repeated Runs | Run repeated tournament simulations and summarize stage/champion probabilities. | Done |
| 4.0D | FIFA 2026 Format & Fixture Modeling | Model the real tournament structure, fixtures, and official progression rules. | Done |
| 4.0E | Historical Tournament Validation | Validate tournament logic and model assumptions against historical tournament structures and results. | Done |
| 4.0F | Real Historical Dataset Integration | Connect validation helpers to licensed historical tournament data and real backtest outputs. | Done |
| 4.0G | Historical Backtesting & Calibration | Score historical probability outputs and document calibration before API work. | Done |
| 4.0H | Complete Historical World Cup Dataset | Expand historical fixtures before relying on backtesting for model decisions. | Done |
| 4.0I | Real Historical Backtesting Reports | Generate documented reports from complete historical fixtures and model probability snapshots. | Done |
| 4.0J | True Pre-Tournament Snapshot Generation | Generate real historical model snapshots using only pre-tournament data cutoffs. | Done |
| 4.0K | Historical Tournament Replay Backtesting | Replay historical tournaments with pre-tournament snapshots and compare against outcomes. | Done |
| 4.0L | Historical Elo Snapshot Replay | Generate cutoff-safe historical Elo foundation snapshots from available match data. | Done |
| 4.0M | Historical Monte Carlo Replay | Replay historical tournament simulations from pre-tournament model snapshots. | Done |
| 4.0N | Historical Tournament Bracket Reconstruction | Rebuild historical groups and brackets for more realistic replay simulations. | Done |
| 4.0O | Complete Historical Replay Validation | Connect reconstructed brackets to replay validation and prepare careful model-quality summaries. | Done |
| 4.0P | Historical Replay Accuracy Audit | Audit replay metrics, validation status, known gaps, and API readiness. | Done |
| 5.0 | API Foundation | Expose stable model outputs and validation metadata through pure TypeScript handlers. | Done |
| 5.1 | API Integration Validation | Validate all pure API handlers together before adding transport or UI. | Done |
| 5.2 | API Runtime Foundation | Expose pure API handlers through a local HTTP-ready runtime adapter. | Done |
| 5.3 | API Endpoint Validation | Validate HTTP-shaped runtime endpoints before adding a real server. | Done |
| 5.4 | API Server Adapter | Wrap the runtime adapter with a real server process when deployment is needed. | Planned |
| 6.0 | Dashboard Foundation | Create the first minimal Next.js dashboard shell over local API handlers. | Done |
| 6.1 | Match Simulation Dashboard | Add the first interactive match simulation UI over the local API client. | Done |
| 6.2 | Dashboard Validation | Add focused UI, accessibility, and routing checks for the dashboard foundation. | Done |
| 6.3 | Tournament Simulation Dashboard | Add a foundation tournament simulation section showing illustrative champion/runner-up probabilities and simulation engine status. | Done |
| 6.4 | Live Tournament Simulation Integration | Replace static foundation preview with a live local `simulateTournamentFoundation` API handler using `runTournamentRepeatedRuns`. | Done |
| 6.5 | World Cup 2026 Team Ratings Dashboard | Add a team ratings section showing Elo-based strength ratings, tiers, offense/defense scores, and indicators for the top 10 contenders. | Done |
| 6.6 | Live Team Ratings Integration | Replace static `FOUNDATION_TEAM_RATINGS` with a live `getTeamRatingsFoundation` API handler; migrate types to the API package. | Done |
| 7.0A | Live Elo Pipeline Foundation | Build a live Elo pipeline that computes current team ratings from available historical match data. | Done |
| 7.0B | Historical International Match Dataset Foundation | Create the data infrastructure for loading, validating, and normalizing a broader international match dataset beyond World Cup fixtures. | Done |
| 7.0C | International Dataset to Live Elo Integration | Wire the international match dataset foundation into the live Elo API flow; supplement World Cup fixtures with Copa, Euro, WCQ, and Friendly matches. | Done |
| 7.0D | Expanded International Dataset | Expand the curated international fixture sample and mirror it as the preferred live Elo supplement. | Done |
| 7.1 | Live Elo Dashboard Integration | Show live Elo ratings from the API in the dashboard with partial-data warnings. | Done |
| 7.3 | Team Alias & Coverage | Improve live Elo prediction team-name matching and coverage visibility. | Done |
| 7.4 | Recency Weighting | Add opt-in recency weighting to the Live Elo pipeline while preserving baseline behavior. | Done |
| 7.5 | Competition Weighting | Add opt-in competition weighting to the Live Elo pipeline while preserving baseline behavior. | Done |
| 7.6 | Home Advantage | Add opt-in home advantage expected-score adjustment to the Live Elo pipeline while preserving baseline behavior. | Done |
| 7.7 | Attack / Defense Ratings | Add opt-in attack and defense scores derived from goal data to the Live Elo pipeline as a foundation for expected-goals generation. | Done |
| 7.8 | Elo-to-xG Calibration | Create a transparent Elo-to-expected-goals model function with optional attack/defense adjustment, replacing the inline API calculation. | Done |
| 7.9 | Elo Prediction Presets | Add conservative/balanced/aggressive prediction presets to the Elo-to-xG pipeline with dashboard preset selector and metadata in API responses. | Done |
| 7.0 | QA Automation | Expand automated checks for code, data, models, and dashboard flows. | Planned |
| 8.0 | CI/CD | Add repeatable GitHub Actions workflows and deployment automation. | Planned |
| 8.5 | CI/CD Pipeline Foundation | Add the first GitHub Actions workflow for PR and main-branch validation. | Done |
| 9.0 | Portfolio Polish | Refine documentation, case study, visuals, and final presentation. | Done |
| 9.1 | Screenshots & Demo Assets | Define the manual screenshot checklist, filenames, capture guidance, and demo scripts for portfolio presentation. | Done |
| 9.2 | Architecture Diagrams | Add Mermaid architecture, data flow, API flow, QA strategy, and interview-story diagrams for portfolio presentation. | Done |
| 9.3 | Portfolio Release Preparation | Add final release checklist, demo scripts, PR checklist, portfolio summary text, and release limitations. | Done |
| 9.4 | Final Release Tag & Portfolio QA Review | Add final portfolio QA review, release readiness template, manual tag instructions, and tag rollback guidance. | Done |
| 10.1 | Bugfix: Stale Results on Validation Error | Clear stale prediction results when the form returns a validation error so users never see old results alongside new validation messages. | Done |
| 10.2 | World Cup 2026 Full Team Coverage | Make Auto Predict From Elo available for all expected 48 teams with explicit fallback seed metadata for teams missing from the partial Live Elo pipeline. | Done |
| 10.2A | UI Polish & Consistency | Format Elo values as whole numbers, add fallback seed indicator in match simulation results, clarify Live Elo dataset count vs WC 2026 coverage, and distinguish static contender ratings from the Live Elo pipeline. | Done |
| 10.3 | World Cup 2026 Fixtures & Groups | Add static Groups A-L and all 72 group-stage fixtures to the API and dashboard as tournament structure foundation data. | Done |
| 10.4 | Group Standings Engine | Calculate deterministic World Cup 2026 group standings from local completed fixture results while ignoring scheduled fixtures. | Done |
| 10.4A | Results Provider Strategy | Route World Cup 2026 standings through normalized local result provider records with source metadata and external providers disabled. | Done |
| 10.6 | Round of 32 Bracket Foundation | Derive 32 projected knockout qualifiers from current standings and create 16 deterministic Round of 32 foundation fixtures. | Done |
| 10.7 | Knockout Bracket Progression Foundation | Build complete placeholder bracket structure from Round of 32 through the Final. No winner simulation. | Done |
| 10.8 | Knockout Match Simulation Foundation | Simulate individual projected R32 fixtures using Live Elo and Poisson model. No bracket advancement. | Done |
| 10.9 | Round of 16 Simulation Foundation | Derive projected R16 participants from R32 probabilities via deterministic winner selection. No R16 match simulation. | Done |
| 10.10 | Round of 16 Match Simulation | Simulate 8 projected R16 fixtures using Live Elo and Poisson model. No winner selection. No bracket advancement. | Done |
| 10.11 | Quarterfinal Simulation Foundation | Derive projected QF participants from R16 match probabilities via deterministic winner selection. No QF match simulation. | Done |
| 10.12 | Quarterfinal Match Simulation | Simulate 4 projected QF fixtures using Live Elo and Poisson model. No winner selection. No semifinal generation. | Done |
| 10.13 | Semifinal Simulation Foundation | Derive projected semifinal participants from QF match probabilities via deterministic winner selection. No semifinal match simulation. | Done |
| 10.14 | Semifinal Match Simulation | Simulate 2 projected SF fixtures using Live Elo and Poisson model. No winner selection. No final generation. | Done |
| 10.15 | Final Simulation Foundation | Derive projected finalists from SF match probabilities via deterministic winner selection. No Final match simulation. | Done |
| 10.16 | Final Match Simulation | Simulate the projected Final fixture using Live Elo and Poisson model. No champion selection. | Done |
| 11.0 | Knockout Winner Resolution Foundation | Resolve deterministic winners from all simulated knockout match probabilities (R32–Final). Expose champion, runner-up, and winner paths by round. | Done |
| 11.1 | Third Place Match Foundation | Project the Third Place Match fixture from deterministic SF loser selection. No match simulation, no winner selection, no penalty logic. | Done |
| 11.2 | Third Place Match Simulation | Simulate the projected Third Place fixture using Live Elo and Poisson model. No winner selection, no extra time, no penalty logic. | Done |
| 11.3 | Champion Projection Summary | Dashboard polish: projected champion card, runner-up card, and five-round champion path derived from Phase 11.0 winner resolution. No new prediction logic. | Done |
| 11.4 | Tournament Projection Overview | Dashboard polish: full tournament overview section (champion, runner-up, third place match, anchor nav), AppHeader nav items, numbered champion path steps, portfolio readiness banner. No new prediction logic. | Done |
| 11.5 | Dashboard Ordering & Section Cleanup | Reorder dashboard to summary-first flow (overview → champion → final → semis → QF → R16 → R32 → third place → audit). Add section captions, full AppHeader anchor nav, E2E ordering test. No new prediction logic. | Done |
| 11.6 | Header Anchor Cleanup | Fix pre-existing AppHeader anchor links (`#match-preview`, `#replay-audit`, `#historical`) that had no matching section ids. Add `id="match-preview"` to the match simulation section and `id="historical"` wrapper for the historical validation section; `#replay-audit` was already present inside `HistoricalReplayAuditPreviewCard`. Add two E2E anchor-validation tests. | Done |
| 11.7 | Remove Orphaned MatchSimulationPreviewCard | Delete `MatchSimulationPreviewCard.tsx` — confirmed zero consumers across all source and test files. No visible dashboard change; `#match-preview` anchor is now provided by the section id added in Phase 11.6. | Done |
| 11.8 | Portfolio Demo Final QA Pass | Final QA pass after full tournament projection polish. Create `PORTFOLIO_DEMO_FINAL_QA_PASS.md`, update demo script for tournament projection flow, polish README and web README, update FINAL_PORTFOLIO_QA_REVIEW.md, update dashboard intro copy. No API or model changes. | Done |
| 12.0 | Live Data, Model Quality & UX Backlog | Define the prioritized documentation backlog that evolves the static World Cup dashboard into a live, confidence-aware tournament intelligence product. | Done |
| 12.1 | Scheduled Match Selector by Group | Make scheduled World Cup fixtures the primary prediction path with official fixture ordering, group context, and status/date metadata. | Done |
| 12.2 | Searchable Grouped Team Selectors | Keep custom matchup mode as an advanced path with grouped selectors, aliases, swap action, keyboard support, and mobile-friendly behavior. | Done |
| 12.3 | Prediction Confidence & Data Coverage | Expose confidence levels, provenance, freshness, fallback status, and coverage gaps directly in prediction UX and API metadata. | Done |
| 12.4 | External Results-Provider Foundation | Define the normalized external/live results provider layer with cache and local static fallback chain. | Done |
| 12.5 | Live Results Synchronization | Synchronize scheduled, live, halftime, finished, postponed, and cancelled fixtures while preserving last valid cache behavior. | Done |
| 12.6 | Live Group Standings | Support official, provisional live, and projected standings with best third-place and projected Round of 32 updates. | Done |
| 12.7 | World Cup Results-to-Elo Ingestion | Process completed tournament results idempotently into ratings and future projections without look-ahead leakage. | Done |
| 12.8 | Prediction Snapshot Storage | Persist immutable pre-match prediction snapshots for later evaluation and product history views. | Done |
| 12.9 | Model vs Reality Tracker | Measure prediction quality against actual outcomes with calibration, Brier Score, Log Loss, and fallback-vs-full-coverage analysis. | Done |
| 12.10A | Tournament Form Calculation Foundation | Calculate bounded, deterministic tournament-form summaries and conservative Elo-adjustment recommendations from completed World Cup 2026 matches without integrating them into predictions yet. | Done |
| 12.10B | Tournament Form Integration | Apply tournament-form recommendations carefully as an optional secondary signal in live prediction workflows after the calculation foundation is validated. | Done |
| 12.10C | Tournament Form UI & Review | Expose the tournament-form opt-in control and provenance in the dashboard after the API integration is validated. | Done |
| 12.11A | Elo-to-xG V2 Calibration Dataset & Experiment Plan | Build reproducible calibration dataset foundation, chronological splits, Elo-gap bucket analysis, baseline metrics, and documented experiment plan for V2 candidates. No formula change. | Done |
| 12.11B | Elo-to-xG V1 Baseline Experiment | Load all fixture files through the calibration builder, run V1 metrics via real Poisson path across all splits, produce structured artifact with bucket compression analysis. | Done |
| 12.11C | Elo-to-xG V2 Candidate Evaluation | Evaluate the first V2 candidate formula against the V1 baseline established in 12.11B. | Done |
| 12.11D | Elo-to-xG V2 Candidate Production Decision | Review all eligible candidates, apply nine acceptance checks, conservative tie-breaking, and produce a typed production decision. | Done |
| 12.11E | Elo-to-xG V2 Production Promotion | Safely promote steeper-0.15 to production: update balanced preset, preserve V1 rollback path, add formula-version metadata, run regression tests. | Done |
| 12.11 | Elo-to-xG Calibration V2 | Recalibrate compressed Elo-to-xG behavior only after broader evaluation evidence and backtesting exist. | Planned |
| 12.12A | Today’s Matches Data Foundation | Add a deterministic daily-match API foundation with timezone-aware filtering, normalized states, fallback metadata, and optional snapshot association. | Done |
| 12.12B | Today’s Matches & Live Match Center UI | Add the first daily dashboard experience for upcoming, live, halftime, and final World Cup 2026 matches using the daily-match foundation. | Done |
| 12.12C | Today’s Matches Prediction & History Integration | Enrich Match Center cards with immutable pre-match prediction history and completed-match evaluation summaries without creating snapshots or evaluations automatically. | Done |
| 12.13A | Group Detail Data Foundation | Add a deterministic single-group API foundation that composes standings, categorized fixtures, qualification context, prediction-history summaries, and provider metadata. | Done |
| 12.13B | Group Detail Prediction Page UI | Build the group-centered dashboard page over the 12.13A data foundation, keeping standings, results, live fixtures, and qualification context in one compact workflow. | Done |
| 12.13C | Group Detail Prediction & Qualification Integration | Extended group detail pages with optional projected view using stored snapshots or Auto Predict for unplayed fixtures; projected standings and qualification; per-fixture source labels; no snapshot creation or standings mutation. | Done |
| 12.14A | Projection Refresh Policy Foundation | Pure deterministic policy layer assessing whether a group projection is current, stale, invalidated, or unavailable. No prediction execution, no polling, no snapshot mutation. | Done |
| 12.14B | Server-Side Projection Refresh Integration | Wired `shouldRefresh: true` assessments to re-prediction inside `buildGroupProjection()`; caller supplies `previousProjection`; stale `auto_predict` fixtures refreshed once per request; failed refresh preserves previous; snapshot fixtures immutable; no persistent store. | Done |
| 12.14C | Group Detail UI: Projection Refresh Display | Surface `refreshExecution` metadata and refreshed assessment state in the group detail projection UI. In-memory server-side cache threads `previousProjection` across SSR renders; per-fixture refresh status badges (Current/Stale/Invalidated/Unavailable); stored-snapshot immutable label; failure alert; no browser polling, no database. | Done |
| 12.T1 | AI Token Efficiency Baseline | Establish a reproducible token-usage measurement method, selective-reading manifest, compact shell helpers, and reduced instruction duplication for Codex CLI and Claude Code. | Done |
| 12.T2 | Controlled Token Efficiency Comparison | Run one controlled documentation consistency task against the Phase 12.T1 baseline and record the measured workflow, output, and limitations. | Done |
| 12.T3 | Repeated Task Token Measurement | Define paired run prompts for the same low-risk documentation task so a later before/after comparison can use the same branch/task structure with and without the optimized workflow. | Done |
| 12.15 | Shareable Prediction Cards | Package predictions and evaluation summaries into portfolio-, creator-, and sponsor-ready share assets. | Planned |
| 12.16 | Multi-Tournament Architecture After Validation | Generalize the product beyond World Cup 2026 only after the live World Cup workflow and value proposition are validated. | Planned |

## Phase 10.1 - Bugfix: Stale Results on Validation Error

Fix the UI bug where a previously successful prediction remained visible in the results panel after the user submitted a form that failed validation.

Deliverables:

- `MatchSimulationForm` result state changed to `MatchSimulationResultState | null`.
- `setResult(null)` called on both client-side and API-side validation failures.
- Empty state panel rendered when result is null: "Prediction unavailable / Fix validation errors and run a new simulation."
- New E2E test: stale-result-cleared sequence (valid predict → invalid submit → assert heading gone and empty state visible).

Exit criteria:

- After any validation failure, the previous result heading and probability cards are no longer visible.
- The empty state panel is visible in the results column when validation has failed.
- All 30 E2E tests pass.
- All unit, integration, typecheck, and build checks pass with no regressions.

## Phase 12.0 - Live Data, Model Quality & UX Backlog

Define the ordered backlog that takes the project from a deterministic local World Cup predictor to a live, confidence-aware World Cup intelligence dashboard.

Deliverables:

- `docs/roadmap/PHASE_12_LIVE_DATA_MODEL_QUALITY_UX_BACKLOG.md` with prioritized backlog items, acceptance criteria, risks, dependencies, and test expectations.
- Immediate-value roadmap for scheduled fixtures, grouped selectors, prediction confidence, provider foundation, live sync, and live standings.
- Model-value roadmap for result ingestion, immutable prediction snapshots, model-vs-reality tracking, tournament-form adjustment, and Elo-to-xG recalibration.
- Product-value roadmap for daily match center, group detail pages, automatic projection refresh, shareable prediction cards, and post-validation multi-tournament architecture.
- New workflow rule documenting that every future phase starts only after fetching `origin`, comparing against `origin/main`, and verifying previous work has actually merged.

Exit criteria:

- The detailed Phase 12 backlog exists under `docs/roadmap/`.
- `docs/ROADMAP.md`, `PROJECT_BRIEF.md`, `AGENTS.md`, `CLAUDE.md`, and `CHANGELOG.md` contain only concise summary updates that link back to the Phase 12 backlog.
- The roadmap clearly distinguishes immediate-value, model-value, and product-value priorities.
- No production code, dependencies, provider credentials, environment variables, database changes, model formula changes, or UI implementation work is introduced.

## Phase 10.13 - Semifinal Simulation Foundation

Create the projected semifinal advancement layer from the existing quarterfinal match simulation foundation.

Deliverables:

- `simulateWorldCup2026SemifinalFoundation()` pure API handler consuming `simulateWorldCup2026QuarterfinalMatchesFoundation()`.
- Deterministic winner selection using highest win probability, then Elo tie-break, then home-team fallback.
- Four `WorldCup2026SemifinalQualifier` entries with source fixture, advancement reason, and probability snapshot.
- Two projected semifinal fixtures paired as QF 1 vs 2 winners and QF 3 vs 4 winners.
- `WorldCupSemifinalSimulationSection` dashboard section showing projected semifinal fixtures, advancement reasons, probability snapshots, and Live Elo / Partial data badges.
- `docs/dashboard/WORLD_CUP_2026_SEMIFINAL_SIMULATION.md`.
- API, contract, integration, endpoint-validation, and E2E coverage for deterministic semifinal projection behavior.

Exit criteria:

- API returns 4 projected semifinal teams and 2 projected semifinal fixtures.
- Output is deterministic with no randomness, no penalties, no finalist generation, and no champion calculation.
- All semifinal fixture teams come from `projectedSemifinalTeams` and no duplicate teams appear.
- Advancement reasons and probability snapshots are present for every projected semifinal team.
- Unit, typecheck, build, Playwright E2E, and `git diff --check` pass.

## Phase 10.14 - Semifinal Match Simulation

Simulate the 2 projected semifinal fixtures using the same match-level foundation already used for the Round of 32, Round of 16, and Quarterfinal phases.

Deliverables:

- `simulateWorldCup2026SemifinalMatchesFoundation()` pure API handler consuming `simulateWorldCup2026SemifinalFoundation()`.
- Two `WorldCup2026SemifinalMatchSimulationFixture` entries with Elo-derived expected goals, win/draw/win probabilities, scorelines, rating-source metadata, and fallback warnings.
- `WorldCup2026SemifinalMatchSimulationFoundationResponse`.
- `WorldCupSemifinalMatchSimulationSection` dashboard section showing 2 compact semifinal simulation cards.
- `docs/dashboard/WORLD_CUP_2026_SEMIFINAL_MATCH_SIMULATION.md`.
- API, contract, integration, endpoint-validation, and E2E coverage for deterministic semifinal match simulation behavior.

Exit criteria:

- API returns 2 simulated semifinal fixtures.
- Each fixture exposes expected goals, win/draw/win probabilities, and most likely scorelines.
- Draws after 90 minutes are preserved in output.
- No winners are selected, no final advancement is generated, and no penalties are modeled.
- Output is deterministic.
- Unit, typecheck, build, Playwright E2E, and `git diff --check` pass.

## Phase 10.15 - Final Simulation Foundation

Derive the projected Final participants from semifinal match probabilities.

Deliverables:

- `simulateWorldCup2026FinalFoundation()` pure API handler consuming `simulateWorldCup2026SemifinalMatchesFoundation()`.
- Deterministic winner selection using highest win probability, then Elo tie-break, then home-team fallback.
- Two `WorldCup2026FinalQualifier` entries with source fixture, advancement reason, and probability snapshot.
- One projected Final fixture pairing the two semifinal winners.
- `WorldCupFinalSimulationSection` dashboard section showing projected finalists, advancement reasons, probability snapshots, and Live Elo / Partial data badges.
- `docs/dashboard/WORLD_CUP_2026_FINAL_SIMULATION.md`.
- API, contract, integration, endpoint-validation, and E2E coverage for deterministic Final projection behavior.

Exit criteria:

- API returns 2 projected finalists and 1 projected Final fixture.
- Output is deterministic with no randomness, no penalties, no Final match simulation, no champion selection, and no title probabilities.
- Advancement reasons and probability snapshots are present for both projected finalists.
- Unit, typecheck, build, Playwright E2E, and `git diff --check` pass.

## Phase 10.2 - World Cup 2026 Full Team Coverage

Ensure Auto Predict From Elo works for every expected World Cup 2026 team, including teams with limited or missing current Live Elo data.

Deliverables:

- Grouped 48-team World Cup 2026 coverage list for Groups A-L.
- Full available-team list returned from `getAvailableLiveEloTeams()`.
- Fallback seed rating behavior for teams missing from the current Live Elo pipeline.
- Response metadata and warnings that mark fallback ratings as uncalibrated.
- Expanded team aliases for common names, FIFA names, accents, and abbreviations.
- API tests covering all 48 canonical teams, key aliases, and fallback-enabled predictions.
- Dashboard E2E coverage for Haiti vs Scotland in Auto Predict From Elo mode.
- `docs/model-results/WORLD_CUP_2026_FULL_TEAM_COVERAGE.md`.

Exit criteria:

- Auto Predict From Elo works for all expected 48 World Cup 2026 teams.
- Pipeline-rated teams keep their existing Live Elo ratings and ranks.
- Fallback teams use the deterministic `1500` seed rating and are clearly marked.
- Suggestions still work for typo or unavailable input.
- No external API calls, dependencies, database, deployment, or unrelated app/model refactors are introduced.
- All unit, typecheck, build, and Playwright E2E checks pass.

## Phase 10.2A - UI Polish & Consistency

Polish the dashboard UI after Phase 10.2 so Live Elo, fallback seed ratings, and static foundation ratings are easier to understand and do not look inconsistent.

Deliverables:

- `formatElo` helper in `apps/web/src/lib/api-client.ts` — rounds Elo floats to whole numbers for display.
- `LiveEloRatingCard` updated to show formatted whole-number Elo ratings.
- `LiveEloRatingsSection` updated to format top Elo rating, rename "Teams rated" to "Teams in dataset", and add a WC 2026 coverage note.
- `MatchSimulationResults` updated to format Elo values, suppress rank for fallback teams, and show fallback seed indicator when any team is uncalibrated.
- `TeamRatingsSection` updated with "Static contender ratings" eyebrow, clarified description, and footer note distinguishing from Live Elo pipeline.
- E2E test 13 (Haiti vs Scotland) extended to assert fallback seed indicator is visible.
- `docs/dashboard/UI_ELO_CONSISTENCY_POLISH.md`.

Exit criteria:

- All Elo values displayed as whole numbers in the Live Elo section and match simulation results.
- Fallback seed teams show a visible amber note and no uncalibrated rank in match simulation.
- Live Elo section clearly distinguishes curated dataset count from 48-team Auto Predict coverage.
- Team Ratings section clearly states these are static ratings separate from the Live Elo pipeline.
- All existing tests pass; no logic, model, or API changes made.

## Phase 10.3 - World Cup 2026 Fixtures & Groups

Add World Cup 2026 group and fixture foundation data so users can inspect the tournament structure before standings and full tournament simulation are implemented.

Deliverables:

- Static Groups A-L with 48 expected teams.
- Deterministic 72-fixture group-stage foundation, with 6 fixtures per group and 3 fixtures per team.
- `getWorldCup2026FixtureFoundation()` pure API handler.
- Schema types for World Cup 2026 groups, fixtures, and fixture foundation response.
- Dashboard section showing all groups, four teams per group, six fixtures per group, summary counts, and foundation warnings.
- API tests for group/team/fixture counts, per-group fixture counts, per-team fixture counts, duplicate-pair prevention, fixture-team coverage, and deterministic response.
- Contract test for response shape.
- E2E smoke test for the dashboard groups section and Group C.
- `docs/dashboard/WORLD_CUP_2026_FIXTURES_GROUPS.md`.

Exit criteria:

- API returns 12 groups, 48 teams, and 72 group fixtures.
- Each group contains each unique team pair exactly once.
- Each team has exactly 3 group fixtures.
- Fixture IDs are deterministic and human-readable.
- Dates and venues remain deferred metadata.
- Dashboard labels this as local curated tournament structure data.
- No standings simulation, full tournament simulation, real-time scores, external APIs, dependencies, prediction formula changes, or Elo rating changes are introduced.
- Unit, typecheck, build, Playwright E2E, and `git diff --check` pass.

## Phase 10.4 - Group Standings Engine

Add a group standings foundation for World Cup 2026 using the existing Groups A-L and group-stage fixture data.

Deliverables:

- Group standings calculation for Groups A-L.
- Points, played, wins, draws, losses, goals for, goals against, and goal difference.
- Deterministic standings sort by points, goal difference, goals for, then team name.
- Scheduled fixtures ignored by standings calculation.
- Completed local fixture results supported through normalized result records.
- `getWorldCup2026GroupStandingsFoundation()` pure API handler.
- Schema types for standings entries, group standings, and standings response.
- Dashboard standings section with compact tables for all groups.
- API tests for zero-state standings with no results, win/draw scoring, goals for/against, goal difference, scheduled-match behavior, deterministic ordering, and Group A/Group C completed-result scenarios.
- Contract test for response shape.
- E2E smoke test for Group A and Group C standings tables.
- `docs/dashboard/WORLD_CUP_2026_GROUP_STANDINGS.md`.

Exit criteria:

- API returns 12 groups and 4 standings entries per group.
- Teams start with zeroes when no completed result records are provided.
- Completed match results update standings when provided by local normalized data.
- Scheduled fixtures do not affect standings.
- Dashboard labels standings as local result-provider output.
- No external API calls, live score service, knockout bracket, Elo formula changes, prediction formula changes, or dependencies are introduced.
- Unit, typecheck, build, Playwright E2E, and whitespace checks pass.

## Phase 10.4A - Results Provider Strategy

Prepare the World Cup 2026 standings architecture so result data can come from normalized provider records instead of fixture objects.

Deliverables:

- `WorldCup2026FixtureStatus`, `WorldCup2026ResultSource`, `WorldCup2026FixtureResult`, and `WorldCup2026ResultProviderMetadata` contracts.
- Local static result provider with external providers disabled and local overrides enabled.
- Eight completed local static group-stage results modeled as normalized result records.
- Standings engine consuming result records by fixture ID.
- `getWorldCup2026GroupStandingsFoundation()` response metadata exposing provider name, result source, external-provider flag, local-overrides flag, result count, warnings, and data update date.
- Dashboard provider/source note showing the local static provider and disabled external provider state.
- API and contract tests for provider metadata, normalized result behavior, scheduled-result ignore behavior, deterministic output, and local static standings updates.
- E2E smoke coverage for provider/source notes and local static points in Group A and Group C.
- `docs/data-quality/RESULTS_PROVIDER_STRATEGY.md`.

Exit criteria:

- Standings calculation does not depend on hardcoded score fields inside fixture objects.
- Local static completed results update standings.
- Scheduled result records and scheduled fixtures are ignored.
- API response exposes provider metadata and local-data warnings.
- No external API calls, live score service, secrets, database, dependencies, Elo formula changes, prediction formula changes, or deployment changes are introduced.
- Unit, typecheck, build, Playwright E2E, and whitespace checks pass.

## Phase 10.6 - Round of 32 Bracket Foundation

Add a projected Round of 32 foundation for World Cup 2026 using current group standings and best third-place ranking logic.

Deliverables:

- Derive 12 group winners, 12 group runners-up, and 8 best third-place teams from current standings.
- Build 32 qualified-team entries with group and qualification source metadata.
- Generate 16 deterministic `round_of_32` projected fixtures.
- Add `getWorldCup2026RoundOf32Foundation()` pure API handler.
- Add schema types for qualification sources, qualified teams, Round of 32 fixtures, and response.
- Dashboard section showing "Projected Round of 32", 32 qualified teams, 16 fixtures, and qualification source labels.
- API tests for counts, fixture shape, duplicate-team prevention, qualified-team linkage, deterministic response, and projected warning.
- Contract test for response shape.
- E2E smoke test for the projected Round of 32 dashboard section.
- `docs/dashboard/WORLD_CUP_2026_ROUND_OF_32_FOUNDATION.md`.

Exit criteria:

- API returns 32 qualified teams and 16 projected fixtures.
- Qualified team counts are 12 group winners, 12 runners-up, and 8 best third-place teams.
- Every projected fixture has two unique teams and every fixture team comes from qualified teams.
- Dashboard labels the section as projected/foundation only.
- Warning states official third-place pairing rules may differ and pending fixtures can change qualification.
- No Round of 16, knockout winner simulation, champion probabilities, external API calls, dependencies, Elo formula changes, xG formula changes, or test weakening are introduced.
- Unit, typecheck, build, Playwright E2E, and whitespace checks pass.

## Phase 0.0 - Project Foundation

Define the professional foundation for the project.

Deliverables:

- Project brief
- Agent instructions
- README
- Changelog
- Roadmap
- Data strategy
- Model strategy
- QA strategy
- Validation backlog

Exit criteria:

- Documentation clearly describes the project intent and rules.
- No application logic, dependencies, data pipeline, model, or web app has been created.
- The foundation is committed and pushed when a remote exists.

## Phase 0.1 - Architecture Foundation

Decide how the repository will be organized before implementation begins.

Deliverables:

- Proposed repository tree
- Architecture overview
- Layer responsibility rules
- Dependency direction rules
- Testing strategy by package or layer
- C4-style Mermaid diagrams
- Architecture Decision Records
- Initial package boundary guidance

Deferred to future phases:

- Exact package manager and workspace configuration
- Environment variable strategy
- Data directory implementation
- CI workflow files
- Application scaffolding

Exit criteria:

- Future implementation work has a clear structure.
- Tool choices are documented with tradeoffs.
- No major app or model implementation has started prematurely.
- Future architecture changes are expected to update `docs/ARCHITECTURE.md` or relevant ADRs.

## Phase 0.2 - Technical Decisions Foundation

Define the project-level technology decisions before implementation begins.

Deliverables:

- Technical stack documentation
- Decision index
- Coding standards
- Git workflow rules
- ADRs for package manager, monorepo tooling, model service, database, and CI/CD

Deferred to future phases:

- Dependency installation
- Next.js initialization
- Python or FastAPI initialization
- Database schema and migrations
- GitHub Actions workflow files
- Application logic

Exit criteria:

- The planned stack is documented with responsibilities and tradeoffs.
- Future contributors know the expected coding and Git standards.
- Major technical decisions have ADRs.
- No dependencies, app scaffolding, data pipelines, models, or CI files have been created.

## Phase 0.5 - UX Research & Product Discovery

Research how the future dashboard should communicate predictions, uncertainty, and tournament scenarios.

Deliverables:

- UX research notes
- Dashboard inspiration references
- Core user journeys
- Product vision
- Planned dashboard structure
- Design system direction
- Portfolio story

Exit criteria:

- The dashboard has a clear product direction before UI implementation.
- Prediction displays avoid misleading certainty.
- Future UI work has product, design, and portfolio guidance.

## Phase 0.6 - Data & Modeling Research

Research and document the data and modeling foundation before creating pipelines or prediction logic.

Deliverables:

- Candidate data source inventory
- Planned data dictionary
- Progressive model roadmap
- Model validation strategy
- Backtesting strategy

Deferred to future phases:

- Dependency installation
- Dataset download
- Data pipeline implementation
- Prediction logic
- Model training
- Dashboard integration

Exit criteria:

- Candidate sources and licensing risks are documented.
- MVP data source direction is clear.
- Planned data fields are defined before pipeline work begins.
- Model progression and validation expectations are clear.
- Phase 1.0 can start with a concrete data pipeline target.

## Phase 0.7 - Delivery & Development Plan

Define how the project should be structured, delivered, reviewed, and released before implementation begins.

Deliverables:

- Planned repository structure
- Definition of Done
- Milestone plan
- Release strategy

Deferred to future phases:

- Creating `apps/` or `packages/`
- Installing dependencies
- Initializing Next.js or Python tooling
- Writing application, data, or model code
- Creating release tags

Exit criteria:

- Future phases have a clear delivery framework.
- Repository structure is documented without creating placeholder folders.
- Phase-specific quality expectations are defined.
- Release criteria are clear before MVP implementation begins.

## Phase 0.8 - AI Collaboration Workflow

Document how Codex CLI and Claude Code collaborate in this repository, hand off between sessions, and minimize token and credit usage.

Deliverables:

- `CLAUDE.md` with Claude Code session rules, required reading order, git responsibility split, check commands, and handoff format.
- `docs/AI_COLLABORATION_WORKFLOW.md` with tool roles, phase-scoped reading guide, handoff format and examples, scope rules, and token efficiency guidance.
- `docs/PROMPTING_GUIDELINES.md` with prompt structure, low-token examples for documentation and implementation tasks, anti-patterns, tool selection guide, and context management advice.
- Updated `AGENTS.md` to reference Claude Code and the new collaboration docs.
- Updated `CHANGELOG.md` and `docs/ROADMAP.md` to reflect this phase.

Exit criteria:

- Any new Codex or Claude Code session can read `CLAUDE.md` and the four required files and start work without needing prior conversation context.
- The handoff format makes it possible to continue work across sessions and tools without retransmitting full history.
- Prompt guidelines reduce unnecessary token use while keeping output quality high.
- No application code, tests, dependencies, or implementation logic was created.

## Phase 1.0 - Data Pipeline Foundation

Build a reliable data foundation.

Deliverables:

- pnpm workspace setup
- Turborepo configuration
- Initial monorepo folders
- `packages/data` TypeScript package
- Data contracts from `docs/DATA_DICTIONARY.md`
- Match validation and normalization functions
- Small local test fixtures
- Data validation checks
- Data quality documentation

Deferred to future phases:

- External dataset downloads
- Large raw data files
- CSV ingestion
- Canonical team ID mapping
- Duplicate detection across full datasets
- Prediction models

Exit criteria:

- Workspace configuration exists for future packages.
- Data package tests cover core validation and normalization behavior.
- Data quality docs explain current coverage and gaps.
- No model, web app, FastAPI service, database, or external dataset has been added.

## Phase 2.0 - Elo Baseline Foundation

Create the first working prediction baseline.

Deliverables:

- Elo rating implementation
- Default Elo configuration
- Expected score and rating delta functions
- Sequential match processing
- Rating history output
- Deterministic model unit tests
- Documentation of assumptions
- Documentation of validation coverage and limitations

Deferred to future phases:

- Poisson modeling
- Dixon-Coles adjustment
- Monte Carlo simulation
- Historical backtesting on full datasets
- Home advantage
- Competition weighting
- Recency weighting
- Dashboard integration

Exit criteria:

- The model is simple, explainable, and tested.
- Ratings update deterministically without mutating inputs.
- Assumptions, validation coverage, and limitations are documented.
- No Poisson, Dixon-Coles, Monte Carlo, FastAPI, database, or dashboard work has been added.

## Phase 3.0 - Poisson/Dixon-Coles Foundation

Add goal-based match modeling.

Deliverables:

- Expected-goals input type
- Poisson probability mass function
- Scoreline probability calculation
- Configurable score matrix generation
- Win/draw/loss probability aggregation
- Most likely scoreline ranking
- Dixon-Coles low-score adjustment foundation
- Deterministic model unit tests
- Documentation of assumptions, validation coverage, and limitations

Deferred to future phases:

- Team attack and defense strength estimates
- Elo-to-expected-goals mapping
- Home advantage
- Full Dixon-Coles parameter optimization
- Comparison against Elo baseline on historical backtests
- Calibration and scoring reports from real data
- Monte Carlo tournament simulation

Exit criteria:

- The model produces valid match outcome probabilities.
- Scoreline probabilities are deterministic and tested.
- Dixon-Coles behavior is documented as a foundation, not a calibrated model.
- Existing Elo and data tests still pass.
- No Monte Carlo, FastAPI, database, dashboard, or external dataset work has been added.

## Phase 4.0A - Monte Carlo Simulation Engine Foundation

Create the match-level simulation engine that future tournament simulations will use.

Deliverables:

- Seeded pseudo-random support
- Injectable random function support
- Single-match scoreline sampling
- Repeated match simulation
- Home win, draw, and away win count aggregation
- Estimated outcome probabilities
- Most common scoreline summaries
- Probability matrix validation
- Deterministic simulation tests
- Monte Carlo assumptions, validation, and limitation docs

Deferred to future phases:

- Group-stage standings
- Knockout bracket simulation
- Full tournament path simulation
- Official World Cup 2026 rules
- Penalty shootout handling
- Dashboard-ready tournament exports

Exit criteria:

- Match-level simulations are reproducible with a seed.
- Result counts sum to the requested simulation count.
- Estimated probabilities are internally consistent.
- High-count simulation approximates analytical probabilities.
- No group-stage, knockout, FastAPI, database, dashboard, or external dataset work has been added.

## Phase 4.0B - Tournament Simulation Foundation

Simulate a simplified tournament from explicit group fixtures through a knockout bracket.

Deliverables:

- Group-stage simulation
- Knockout bracket simulation
- Group standings with points, goal difference, goals for, and team-name fallback sorting
- Group qualifier selection
- Knockout draw tie-break handling
- Simplified power-of-two tournament bracket
- Champion and runner-up output
- Simulation reproducibility checks
- Tournament assumptions, validation, and limitation docs

Deferred to future phases:

- Repeated tournament runs
- Stage and champion probability summaries
- Full FIFA World Cup 2026 format
- Official FIFA group tie-breakers
- Real fixtures and groups
- Dashboard-ready exports

Exit criteria:

- A simplified tournament can produce group results, knockout results, champion, and runner-up.
- Group and knockout rules are deterministic and tested.
- Existing data, Elo, Poisson, Dixon-Coles, and Monte Carlo tests still pass.
- No FastAPI, database, dashboard, real fixtures, or external datasets have been added.

## Phase 4.0C - Tournament Simulation Validation & Repeated Runs

Run many tournament simulations to estimate tournament-level probabilities.

Deliverables:

- Repeated tournament simulation runner
- Champion probability summaries
- Runner-up probability summaries
- Group qualification probability summaries
- Knockout qualification probability summaries
- Seed strategy for repeated runs
- Validation report for tournament probability outputs
- Deterministic repeated-run tests

Deferred to future phases:

- Full FIFA World Cup 2026 format
- Official FIFA fixture and group modeling
- Official tournament progression rules
- Stage-specific probability summaries beyond the simplified bracket
- Large-run performance optimization
- Dashboard-ready exports

Exit criteria:

- Repeated simulations produce stable, explainable probability summaries.
- Outputs include model and simulation metadata.
- Known limitations are documented before dashboard integration.
- Existing data, Elo, Poisson, Dixon-Coles, Monte Carlo, group, knockout, and tournament tests still pass.

## Phase 4.0D - FIFA 2026 Format & Fixture Modeling

Model the real World Cup 2026 structure before exposing tournament results more broadly.

Deliverables:

- FIFA 2026 group and fixture input contracts
- Official number of teams and groups
- Third-place qualification modeling
- Group validation for 12 groups of 4 teams
- Unique 48-team validation
- Best 8 third-place selection helper
- Round of 32 fixture validation
- Simple deterministic Round of 32 development bracket builder
- Fixture metadata requirements
- Validation docs for format assumptions

Deferred to future phases:

- Real FIFA 2026 fixture loading
- Official knockout slot mapping
- Full official FIFA tie-breaker chain
- Historical validation against past tournaments
- API/dashboard integration

Exit criteria:

- The tournament engine can represent the real FIFA 2026 structure.
- Simplified assumptions are replaced or clearly isolated.
- The engine remains deterministic and tested.
- No external fixtures, API, UI, database, or network-dependent logic has been added.

## Phase 4.0E - Historical Tournament Validation

Validate tournament-level probability snapshots against known tournament outcomes before exposing outputs.

Deliverables:

- Historical tournament validation contracts
- Champion probability Brier Score
- Champion probability Log Loss with safe epsilon handling
- Top-N champion hit checks
- Runner-up probability ranking checks
- Knockout qualification hit-rate foundation
- Champion calibration bucket foundation
- Deterministic validation tests
- Historical validation assumptions, report, and limitations docs

Deferred to future phases:

- Real historical World Cup dataset ingestion
- Real historical fixture loading
- Time-based historical model outputs
- Official FIFA historical tie-breaker validation
- Model promotion or accuracy claims

Exit criteria:

- Historical validation metrics are implemented and tested.
- Invalid probability snapshots and missing actual outcomes are rejected.
- The docs clearly state that no real model accuracy is claimed yet.
- The model is ready for real historical dataset integration or API planning.

## Phase 4.0F - Real Historical Dataset Integration

Connect the validation foundation to real historical tournament data after source licensing and data provenance are clear.

Deliverables:

- Curated 2018 and 2022 historical fixture subsets
- Historical World Cup fixture JSON structure
- Historical fixture loader and validation helpers
- Historical fixture normalization into `NormalizedMatch`
- Dataset metadata and retrieval-date tracking
- Documentation of data quality exclusions
- Deterministic tests for loading, validation, and normalization

Deferred to future phases:

- Complete historical World Cup coverage
- Automated source synchronization
- Penalty winner modeling
- Historical pre-tournament probability snapshots
- Backtest reports using real model outputs
- Calibration notes across historical tournaments

Exit criteria:

- Historical data provenance is documented.
- Validation results are reproducible from local commands.
- The fixture subset is small, curated, and validated.
- No model quality claims are made from the partial dataset.

## Phase 4.0G - Historical Backtesting & Calibration

Use validated historical fixture data and supplied probability snapshots to produce the first backtesting and calibration foundation.

Deliverables:

- Historical backtesting input and output contracts
- Champion and runner-up extraction from fixture subsets
- Tournament-level historical validation helpers
- Accuracy, Brier Score, Log Loss, and calibration output
- Top-N hit reporting
- Calibration bucket generation
- Partial dataset warning metadata
- Backtesting assumptions, validation, limitations, and calibration docs
- Deterministic tests using 2018 and 2022 curated fixtures

Deferred to future phases:

- Complete historical World Cup fixtures
- Historical prediction snapshot fixtures generated by the model
- Match-level backtesting commands
- Baseline comparison reports
- Data cutoff and model version metadata for real model runs
- Model promotion decisions

Exit criteria:

- Historical metrics are generated from reproducible local commands.
- Calibration and scoring reports are documented.
- Output is clearly marked as partial historical validation.
- No public model quality claims are made from the partial dataset.

## Phase 4.0H - Complete Historical World Cup Dataset

Expand historical data coverage so future backtesting can evaluate full tournament behavior.

Deliverables:

- Complete 2010, 2014, 2018, and 2022 fixture coverage
- Group-stage and knockout result records
- Winner, decision method, penalty score, and stage-order metadata
- Source metadata and review notes
- 64-match validation per tournament
- 256-match validation across the historical dataset
- Expanded data validation tests

Exit criteria:

- Historical fixture coverage is complete enough for meaningful backtesting.
- Source provenance and limitations are documented.
- Data validation protects full-tournament structure before model scoring.

## Phase 4.0I - Real Historical Backtesting Reports

Use complete historical fixture data and model-generated probability snapshots to produce documented backtesting reports.

Deliverables:

- Historical report generation helpers
- Per-year reports for 2010, 2014, 2018, and 2022
- Champion and runner-up extraction from complete fixture datasets
- Champion rank, probability, Top-1, Top-3, and Top-5 outputs
- Brier Score and Log Loss report fields
- Calibration bucket summaries
- Dataset completeness metadata
- Synthetic snapshot warnings
- Clear interpretation of what the reports can and cannot prove

Exit criteria:

- Backtesting reports are reproducible from local commands.
- Reports use complete fixture coverage and documented model snapshots.
- Results are framed as validation evidence, not guarantees.
- Remaining calibration and data limitations are documented.

## Phase 4.0J - True Pre-Tournament Snapshot Generation

Generate real historical probability snapshots from model logic using only information available before each evaluated tournament.

Deliverables:

- Baseline pre-tournament snapshot input contracts
- Team seed rating probability normalization
- Deterministic team probability ranking
- Look-ahead bias guardrail results
- Snapshot metadata with model version and data cutoff
- Baseline snapshots for 2010, 2014, 2018, and 2022 in tests
- Integration with historical backtesting report helpers

Exit criteria:

- Historical snapshots are generated reproducibly.
- Data leakage checks protect tournament cutoffs.
- Reports distinguish model-generated snapshots from synthetic fixtures.
- Model performance remains framed as evidence with limitations.

## Phase 4.0K - Historical Tournament Replay Backtesting

Replay historical tournament predictions using pre-tournament snapshots and compare the generated probabilities against actual outcomes.

Deliverables:

- Historical tournament replay helper
- Baseline report reruns using `baseline_pre_tournament_snapshot`
- Per-year replay outputs for 2010, 2014, 2018, and 2022
- Snapshot safety checks in report generation
- First replay-oriented model validation report
- Look-ahead guardrail status in replay outputs
- Baseline snapshot warnings in per-year and aggregate summaries
- Clear decision to improve model realism before public accuracy claims

Exit criteria:

- Historical replay outputs are deterministic.
- Reports use safe pre-tournament snapshots.
- Results are interpreted without overclaiming accuracy.
- Remaining gaps toward calibrated Elo/Poisson simulation are documented.

## Phase 4.0L - Historical Elo Snapshot Replay

Replace seed-rating replay snapshots with cutoff-safe Elo snapshots generated from available historical match data.

Deliverables:

- Historical Elo replay input, config, snapshot, metadata, and warning contracts.
- Match filtering that uses only matches on or before the cutoff date.
- Rejection of cutoffs on or after tournament start dates.
- Sequential Elo replay before each tournament start date when data is supplied.
- Elo-derived champion probability normalization and deterministic ranking.
- `historical_elo_replay_snapshot_foundation` snapshot outputs.
- Replay-helper compatibility for generated Elo foundation snapshots.
- Documentation of remaining data and calibration gaps before API/dashboard publication.

Exit criteria:

- Elo snapshots are generated only from data available on or before the cutoff.
- Replay reports distinguish Elo foundation replay from seed-rating baseline replay.
- Metrics are reported with Brier Score, Log Loss, Top-N hits, and calibration notes.
- The project has enough evidence to decide whether Phase 5.0 can begin or model realism should improve further.

## Phase 4.0M - Historical Monte Carlo Replay

Convert cutoff-safe pre-tournament snapshots into historical tournament simulations and compare simulated probabilities against actual outcomes.

Deliverables:

- Elo-to-match-probability mapping foundation.
- Elo-to-expected-goals mapping foundation.
- Poisson score matrix generation from Elo-derived expected goals.
- Explicit simplified historical tournament replay simulation inputs.
- Monte Carlo replay outputs for champion and runner-up probabilities.
- Per-year replay scoring with Brier Score, Log Loss, Top-1, Top-3, and Top-5.
- Aggregate replay summaries with simulation count metadata.
- Warnings for uncalibrated Elo-to-goals mapping and simplified bracket assumptions.
- Documentation of remaining realism gaps before API/dashboard publication.

Exit criteria:

- Historical simulations use only pre-tournament data.
- Simulation outputs are deterministic when seeded.
- Reports distinguish simulation evidence from public accuracy claims.
- Remaining gaps toward dashboard/API publication are documented.

## Phase 4.0N - Historical Tournament Bracket Reconstruction

Rebuild historical group and knockout structures so Monte Carlo replay can use more realistic tournament paths.

Deliverables:

- Historical fixture grouping by tournament year.
- Stage separation for group, Round of 16, quarter-final, semi-final, third-place, and final fixtures.
- Historical group reconstruction for 2010, 2014, 2018, and 2022.
- Group standings, winners, and runners-up from actual group-stage results.
- Knockout progression from recorded historical winners.
- Champion, runner-up, and third-place extraction.
- Match-count validation for the historical 32-team format.
- Documentation of remaining official tie-breaker and result-level reconstruction limitations.

Exit criteria:

- Historical replay simulations can use tournament-specific group and bracket structures.
- Bracket reconstruction does not use actual match outcomes to generate pre-tournament probabilities.
- Existing data/model checks remain deterministic.
- Remaining model calibration gaps are documented before Phase 5.0.

## Phase 4.0O - Complete Historical Replay Validation

Connect reconstructed historical brackets to the historical replay foundations and produce careful validation outputs.

Deliverables:

- Per-year validation status for 2010, 2014, 2018, and 2022.
- Dataset completeness availability checks.
- Historical bracket reconstruction availability checks.
- Historical Elo snapshot replay availability checks.
- Historical Monte Carlo replay availability checks.
- Replay backtesting report availability checks.
- Aggregate validation status and warning summary.
- Explicit foundation-only warnings that prevent public accuracy overclaims.

Exit criteria:

- Historical replay validation uses reconstructed 2010, 2014, 2018, and 2022 tournament structures.
- Reports clearly separate data, calibration, and bracket limitations.
- No public accuracy claims are made without calibrated inputs.
- The project has enough evidence to choose Phase 5.0 or another model-validation phase.

## Phase 4.0P - Historical Replay Accuracy Audit

Summarize the historical replay foundation across metrics, validation status, known gaps, and API readiness.

Deliverables:

- Per-year audit status for 2010, 2014, 2018, and 2022.
- Aggregate audit summary.
- Metric availability checks for Brier Score, Log Loss, Top-1, Top-3, and Top-5.
- Dataset completeness, bracket reconstruction, Elo snapshot, Monte Carlo replay, and replay validation checks.
- Foundation-only warning detection.
- API readiness recommendation: `ready`, `ready_with_warnings`, or `not_ready`.
- Documentation that prevents replay audit outputs from being presented as real predictive accuracy.

Exit criteria:

- Historical replay metrics and validation artifacts can be audited consistently.
- API readiness is based on validation status and warnings, not accuracy overclaims.
- Known gaps are surfaced before API exposure.
- Existing data/model checks remain deterministic.

## Phase 5.0 - API Foundation

Expose stable model outputs behind a small TypeScript service boundary without starting a server.

Deliverables:

- `packages/api` package with pure handler functions.
- Health and model information handlers.
- Match simulation handler using existing Poisson, probability, and optional Monte Carlo helpers.
- Historical tournament summary and replay audit handlers.
- Request validation and typed response contracts.
- API tests for response shape, validation errors, deterministic simulation behavior, and audit warnings.
- API foundation documentation covering contracts, limits, and next steps.

Exit criteria:

- API outputs preserve model limitations and validation metadata.
- No endpoint presents foundation replay as final predictive accuracy.
- The service boundary remains thin and testable.
- No HTTP server, dashboard, database, or external service is added.

## Phase 5.1 - API Integration Validation

Strengthen the pure API boundary with integration-style tests before adding transport.

Deliverables:

- Integration tests that exercise all pure handlers through the exported route map.
- Valid and invalid match simulation request coverage.
- Optional Monte Carlo simulation validation.
- Historical tournament summary validation for supported and unsupported years.
- Historical replay audit readiness and metadata validation.
- Stable response shape checks for success and validation-error responses.
- Documentation of what the integration validation proves and does not prove.

Exit criteria:

- Pure handlers can be validated together without a server, database, network call, or dashboard.
- Error responses are typed and consistent enough for a future transport layer.
- API metadata continues to expose foundation limitations and no public accuracy claim.

## Phase 5.2 - API Runtime Foundation

Expose pure API handlers through an HTTP-ready runtime adapter without starting a server.

Deliverables:

- Runtime adapter based on standard `Request` and `Response` primitives.
- JSON route mapping for health, model info, match simulation, historical summaries, and replay audit metadata.
- Request body parsing for match simulation.
- Typed runtime errors for validation failures, unsupported methods, and missing routes.
- Deterministic runtime tests using local request injection.
- Runtime documentation that preserves no-server, no-database, and no-external-service boundaries.

Exit criteria:

- Route-shaped behavior can be tested without opening a network port.
- Runtime responses preserve existing handler metadata and validation errors.
- The runtime layer remains thin and does not contain prediction logic.
- No dashboard, database, authentication, external service, or production deployment is added.

## Phase 5.3 - API Endpoint Validation

Validate runtime routes like stable HTTP endpoints before adding a server process.

Deliverables:

- Endpoint-level tests for all runtime routes.
- Status-code checks for success, validation errors, missing routes, and unsupported methods.
- JSON response shape checks for success and error responses.
- Historical summary endpoint checks for 2010, 2014, 2018, and 2022.
- Invalid historical year validation checks.
- Deterministic response checks for seeded simulation requests.
- Documentation of endpoint validation scope and boundaries.

Exit criteria:

- Runtime endpoints behave consistently through local `Request` injection.
- Endpoint validation requires no server, database, network call, dashboard, or external service.
- Endpoint responses preserve model limitations and do not claim predictive accuracy.

## Phase 5.4 - API Server Adapter

Wrap the runtime adapter in a real server process only after the local runtime boundary is stable.

Potential deliverables:

- HTTP framework selection and ADR if needed.
- Thin server entrypoint that delegates to `packages/api` runtime.
- Request/response serialization tests against the server adapter.
- Error mapping for validation failures.
- Deployment and environment guidance.

Exit criteria:

- The server adapter does not contain prediction or data logic.
- Existing pure handler and runtime tests remain the source of behavior confidence.
- Service deployment decisions do not require a database, dashboard, or external service.

## Phase 6.0 - Dashboard Foundation

Create the first minimal user-facing dashboard foundation.

Deliverables:

- Next.js App Router web app scaffold.
- TypeScript and Tailwind CSS dashboard foundation.
- Dashboard home page with basic layout and navigation.
- Model status card.
- Match simulation preview card.
- Historical replay audit preview card.
- Historical tournaments preview section.
- Local API client wrapper that calls `packages/api` pure handlers directly.
- Responsive and semantic HTML structure.
- Dashboard foundation documentation.

Exit criteria:

- The dashboard renders useful API/model foundation context without a deployed server.
- Model limitations and replay warnings remain visible.
- No auth, database, charts, external UI library, or deployment is added.

## Phase 6.1 - Match Simulation Dashboard

Add the first interactive dashboard workflow for match simulation.

Deliverables:

- Match simulation form.
- Home and away team inputs.
- Expected-goals inputs.
- Max-goals input.
- Optional simulation-count input.
- Submit control with a basic submitting state.
- Validation messages.
- Result cards for home win, draw, and away win probabilities.
- Most likely scoreline results.
- Visible baseline simulation warning.
- Match simulation dashboard documentation.

Exit criteria:

- The UI calls the existing API client wrapper instead of model package internals.
- Users can run a local baseline simulation without a server, database, auth, charts, or deployment.
- The UI clearly states that the simulation is not a guarantee.

## Phase 6.2 - Dashboard Validation

Add focused checks around the dashboard foundation before deeper product screens.

Potential deliverables:

- Component smoke tests.
- Route rendering checks.
- Accessibility checks for headings, landmarks, and focus states.
- Basic responsive layout verification.
- Documentation of dashboard validation coverage.

Exit criteria:

- The dashboard foundation can be changed with confidence.
- User-facing warnings and limitations remain visible.
- Validation does not require auth, database, deployment, or external services.

## Phase 6.3 - Tournament Simulation Dashboard

Add a foundation tournament simulation section to the dashboard.

Deliverables:

- `TournamentSimulationSection` component with simulation engine status card, foundation warning, top-5 illustrative probability grid, model limitations summary, and match simulation call-to-action.
- `TournamentProbabilityCard` component with team rank, champion probability, and runner-up probability.
- `TournamentSimulationFoundation` and `TournamentProbabilityEntry` types and `FOUNDATION_TOURNAMENT_SIMULATION` constant in `apps/web/src/lib/api-client.ts`.
- `docs/dashboard/TOURNAMENT_SIMULATION_DASHBOARD.md` documenting the section purpose, components, data sources, static foundation data, accuracy framing, and future API roadmap note.

Exit criteria:

- The tournament simulation section renders clearly labeled foundation estimates without claiming predictive accuracy.
- Component code calls only the API client wrapper — no direct model or data package imports.
- Foundation warning and disclaimer are visible before the probability entries.
- No charts, auth, database, deployment, or new dependencies are added.
- All existing tests, typecheck, and build checks pass.

## Phase 6.4 - Live Tournament Simulation Integration

Replace the static foundation preview with a live local API handler.

Deliverables:

- `simulateTournamentFoundation()` pure API handler in `packages/api/src/routes.ts` using `generateScoreMatrix` and `runTournamentRepeatedRuns` with an 8-team 2-group sample tournament (seed 2026, 1000 runs).
- `TournamentSimulationTeamResult` and `TournamentSimulationSuccessResponse` schema types in `packages/api/src/schemas.ts`.
- `simulateTournamentFoundation` exported from `packages/api/src/index.ts`.
- Updated `apps/web/src/lib/api-client.ts` to call the live handler and expose `TournamentSimulationSuccessResponse`; removed static `FOUNDATION_TOURNAMENT_SIMULATION`, `TournamentSimulationFoundation`, and `TournamentProbabilityEntry`.
- Updated `TournamentSimulationSection` to render `TournamentSimulationSuccessResponse` fields.
- Updated `TournamentProbabilityCard` to use `TournamentSimulationTeamResult` from the API package.
- `docs/dashboard/LIVE_TOURNAMENT_SIMULATION_INTEGRATION.md` documenting the handler, sample tournament structure, determinism, component changes, and accuracy framing.

Exit criteria:

- The tournament simulation section renders live output from `simulateTournamentFoundation()` baked at Next.js static build time.
- The section is clearly labeled "Live local simulation foundation, not a public forecast."
- Component code calls only the API client wrapper.
- All 8 sample tournament teams appear in the probability grid.
- Static foundation constant and its associated types are removed from the web layer.
- All tests, typecheck, and build checks pass with no regressions.

## Phase 6.5 - World Cup 2026 Team Ratings Dashboard

Add a team ratings section to the dashboard showing contender strength.

Deliverables:

- `TeamRatingsSection` component with section header, amber foundation warning, five summary stat cards (teams rated, top Elo, average Elo, strongest offense indicator, strongest defense indicator), and a responsive 10-card grid.
- `TeamRatingCard` component with rank badge, team name, Elo rating, tier pill, offense/defense strength scores, and a short summary.
- `TeamRatingTier`, `TeamRatingEntry`, and `TeamRatingsFoundation` types in `apps/web/src/lib/api-client.ts`.
- `FOUNDATION_TEAM_RATINGS` constant with seed ratings for Argentina, France, Spain, England, Brazil, Portugal, Germany, Netherlands, Belgium, and Italy.
- `teamRatings` field added to `DashboardSnapshot` and populated in `getDashboardSnapshot()`.
- `docs/dashboard/TEAM_RATINGS_DASHBOARD.md` documenting the section purpose, components, tier system, data, boundaries, and next steps.

Exit criteria:

- The team ratings section renders correctly with all 10 contenders, summary stats, and foundation warning.
- Strongest offense and defense indicators correctly identify the highest-scoring teams.
- Component code calls only the API client wrapper — no direct model or data package imports inside components.
- No charts, auth, database, deployment, or new dependencies are added.
- All existing tests, typecheck, and build checks pass.

## Phase 6.6 - Live Team Ratings Integration

Replace the static web-layer constant with a proper API handler, migrating types to the API package.

Deliverables:

- `getTeamRatingsFoundation()` pure API handler in `packages/api/src/routes.ts`.
- `TeamRatingTier`, `TeamRatingFoundationEntry`, and `TeamRatingsFoundationResponse` schema types in `packages/api/src/schemas.ts`, exported from `packages/api/src/index.ts`.
- `getTeamRatingsFoundation` added to `supportedHandlers` and `modelScope` in `model-info.ts`.
- 7 new tests for `getTeamRatingsFoundation` in `packages/api/tests/api.test.ts`, including consistency checks for offense/defense indicators.
- Removed `FOUNDATION_TEAM_RATINGS`, `TeamRatingEntry`, `TeamRatingTier`, and `TeamRatingsFoundation` from `apps/web/src/lib/api-client.ts`; live handler wired in.
- `TeamRatingCard` and `TeamRatingsSection` components updated to import types from `@world-cup-2026-predictor/api`.
- `docs/dashboard/LIVE_TEAM_RATINGS_INTEGRATION.md` documenting the migration.

Exit criteria:

- `getTeamRatingsFoundation()` returns a valid `TeamRatingsFoundationResponse` with 10 entries.
- `strongestOffenseScore` and `strongestDefenseScore` are verified to match the actual maximums in the team data.
- Static constant and its associated web-layer types are fully removed.
- All tests, typecheck, and build checks pass with no regressions.

## Phase 7.0A - Live Elo Pipeline Foundation

Replace static curated seed ratings with a live pipeline that computes current Elo ratings from available historical match data.

Deliverables:

- `runLiveEloPipeline()` pure pipeline function in `packages/model` accepting `EloMatch[]`.
- `LiveEloDataCoverage`, `LiveEloPipelineInput`, `LiveEloRankedEntry`, `LiveEloPipelineResult` types.
- Embedded curated World Cup fixture data (256 matches, 2010–2022) in `packages/api/src/live-elo-data.ts`.
- `getLiveEloRatingsFoundation()` API handler returning top 15 computed Elo ratings with metadata.
- `LiveEloRatedTeamEntry` and `LiveEloRatingsFoundationResponse` API schema types.
- Deterministic pipeline tests and API handler tests.
- `docs/model-results/LIVE_ELO_PIPELINE_FOUNDATION.md` documenting the pipeline, assumptions, limitations, and next steps.

Exit criteria:

- Pipeline computes deterministic rated team rankings from any `EloMatch[]` input.
- Handler returns 15 teams ranked by computed Elo rating from World Cup 2010–2022 fixtures.
- All tests, typecheck, and build pass with no regressions.
- Existing `getTeamRatingsFoundation()` handler is preserved.
- No dashboard UI changes, no new dependencies, no model calibration claims.

## Phase 7.0B - Historical International Match Dataset Foundation

Create the data infrastructure for a broader international match dataset so the live Elo pipeline can eventually use more than World Cup fixtures.

Deliverables:

- `packages/data/src/international-matches.ts` with loading, validation, normalization, and dataset metadata.
- `packages/data/tests/international-matches.test.ts` with full unit test coverage.
- `packages/data/fixtures/international/sample-international-matches.json` — 15-match curated sample across 5 competition types.
- `packages/data/fixtures/international/README.md` documenting the fixture schema.
- `docs/data-quality/INTERNATIONAL_MATCH_DATASET_FOUNDATION.md` documenting design, validation rules, normalization mapping, limitations, and next steps.

Exit criteria:

- `loadInternationalMatchDataset` loads, validates, and returns matches with full metadata from any fixture file matching the schema.
- Foundation and sample-only warnings propagate through metadata.
- All tests, typecheck, and build pass with no regressions.
- No API changes, no dashboard changes, no model changes.

## Phase 7.0C - International Dataset to Live Elo Integration

Wire the international match dataset foundation into the live Elo API flow while preserving the World Cup-only embedded dataset as a fallback.

Deliverables:

- `packages/api/src/international-elo-adapter.ts` — `EloCompatibleMatch` interface, `toEloMatch()`, `mergeEloMatchSources()`, `LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING`.
- `LIVE_ELO_INTERNATIONAL_SUPPLEMENT` (12 matches) added to `packages/api/src/live-elo-data.ts` as embedded TypeScript constants.
- `getLiveEloRatingsFoundation()` updated to use `mergeEloMatchSources()` and `dataCoverage: "partial_international_history"`.
- `packages/api/tests/international-elo-adapter.test.ts` with unit tests for adapter functions.
- `docs/model-results/INTERNATIONAL_DATASET_LIVE_ELO_INTEGRATION.md` documenting the integration design.

Exit criteria:

- `matchesProcessed` is 268 (256 WC + 12 international supplement).
- `latestMatchDate` reflects "2024-09-07" (latest supplement match).
- `LIVE_ELO_INTERNATIONAL_SUPPLEMENT_WARNING` appears in every response.
- World Cup fixture data is unchanged and preserved as the pipeline foundation.
- `supportedHandlers` count remains at 8.
- All tests, typecheck, and build pass with no regressions.
- No web package changes, no database, no external services.

## Phase 7.0D - Expanded International Dataset

Expand the international match dataset foundation from the tiny sample into a larger manually curated fixture set while keeping the data partial, validated, and clearly labeled.

Deliverables:

- `packages/data/fixtures/international/expanded-international-matches.json` with 56 curated matches.
- International dataset metadata warning codes for partial history, curated sample status, and incomplete global coverage.
- Data tests covering expanded fixture loading, minimum count, duplicate match IDs, competition metadata, warnings, and normalization.
- `getLiveEloRatingsFoundation()` updated to use a static Elo-compatible mirror of the expanded fixture as the international supplement while preserving inline fallback behavior.
- `docs/data-quality/EXPANDED_INTERNATIONAL_DATASET.md` documenting scope, validation, warnings, API use, and limitations.

Exit criteria:

- Expanded fixture remains manually reviewable and between 50 and 100 matches.
- Dataset validation catches required-field, duplicate, and result consistency issues.
- Live Elo metadata reflects expanded international coverage without claiming full global history.
- No downloads, scraping, database, dashboard changes, or external services.
- All required checks pass with no regressions.

## Phase 7.1 - Live Elo Dashboard Integration

Show the live Elo API foundation in the dashboard instead of leaving the UI limited to static foundation team ratings.

Deliverables:

- `LiveEloRatingsSection` dashboard component with summary cards, data coverage, warnings, and top-team grid.
- `LiveEloRatingCard` dashboard component showing rank, team, Elo rating, and matches played.
- Dashboard snapshot updated to include `getLiveEloRatingsFoundation()` from the API client wrapper.
- `docs/dashboard/LIVE_ELO_DASHBOARD_INTEGRATION.md` documenting UI scope, warnings, boundaries, and next steps.

Exit criteria:

- Dashboard shows top live Elo teams, Elo rating, rank, matches processed, data coverage, latest match date, and partial-data warnings.
- UI clearly states: “Live Elo is based on partial curated data and is not a public accuracy claim.”
- Components do not call model or data packages directly.
- No charts, dependencies, database, deployment, or API/model/data refactor.
- Required checks pass with no regressions.

## Phase 7.3 - Team Alias & Coverage

Improve live Elo team-name matching and coverage visibility so users can search or predict with common team names and aliases.

Deliverables:

- `packages/api/src/team-aliases.ts` with canonical team-name normalization, alias resolution, accent-insensitive matching, coverage lists, and suggestions.
- `packages/api/tests/team-aliases.test.ts` covering alias and coverage behavior.
- `predictMatchFromLiveElo()` updated to resolve aliases and return unavailable-team suggestions.
- Dashboard Auto Predict From Elo mode updated to show available teams and suggestions without autocomplete.
- `docs/model-results/TEAM_ALIAS_AND_COVERAGE.md` documenting aliases, coverage, unavailable-team behavior, and limits.

Exit criteria:

- Common aliases resolve to canonical team names.
- Matching is case-insensitive, trims extra spaces, and supports simple accent-insensitive matching.
- Unavailable teams return clear validation errors with suggestions.
- No data downloads, dependencies, database, charts, or unrelated refactors.
- Required checks pass with no regressions.

## Phase 7.4 - Recency Weighting

Add opt-in recency weighting to the Live Elo pipeline so recent matches can influence ratings more than older matches while preserving the existing baseline mode.

Deliverables:

- Recency weighting config in `runLiveEloPipeline()`.
- `calculateLiveEloRecencyWeight()` helper with fixed deterministic age buckets.
- Live Elo metadata showing whether weighting was enabled, reference date, matches weighted, and bucket weights.
- API support for opt-in recency-weighted `getLiveEloRatingsFoundation()` responses.
- `docs/model-results/RECENCY_WEIGHTING.md` documenting behavior, warnings, and limitations.

Exit criteria:

- Default Live Elo output remains unweighted unless recency weighting is explicitly enabled.
- Recent matches receive full Elo update impact, while older matches receive reduced impact.
- Tests cover deterministic reference dates, invalid config handling, and API metadata.
- No data downloads, dependencies, dashboard changes, database, charts, or unrelated refactors.
- Required checks pass with no regressions.

## Phase 7.5 - Competition Weighting

Add opt-in competition weighting to the Live Elo pipeline so matches from different competition categories can scale Elo update impact differently while preserving the existing baseline mode.

Deliverables:

- Competition weighting config in `runLiveEloPipeline()`.
- `classifyLiveEloCompetition()` and `calculateLiveEloCompetitionWeight()` helpers with fixed deterministic buckets.
- Live Elo metadata showing whether weighting was enabled, matches weighted, weight table, missing metadata count, and unknown competition count.
- API support for opt-in competition-weighted `getLiveEloRatingsFoundation()` responses.
- `docs/model-results/COMPETITION_WEIGHTING.md` documenting behavior, warnings, and limitations.

Exit criteria:

- Default Live Elo output remains competition-unweighted unless competition weighting is explicitly enabled.
- World Cup, continental championship, qualifier, Nations League, friendly, and unknown categories have deterministic weights.
- Recency and competition weighting combine through one Elo K-factor multiplier.
- Missing or unknown competition metadata is reported clearly.
- No data downloads, dependencies, dashboard changes, database, charts, or unrelated refactors.
- Required checks pass with no regressions.

## Phase 7.6 - Home Advantage

Add opt-in home advantage support to the Live Elo pipeline so non-neutral matches can adjust expected-score calculations while preserving the existing baseline mode.

Deliverables:

- Home advantage config in `runLiveEloPipeline()`.
- `getLiveEloMatchLocationContext()` and `calculateEffectiveHomeRating()` helpers.
- Live Elo metadata showing whether home advantage was enabled, Elo points used, matches evaluated, applied count, neutral-site count, and missing neutral-site metadata count.
- API support for opt-in home-advantage `getLiveEloRatingsFoundation()` responses.
- `docs/model-results/HOME_ADVANTAGE.md` documenting behavior, warnings, interactions with other weighting, and limitations.

Exit criteria:

- Default Live Elo output remains unchanged unless home advantage is explicitly enabled.
- Home advantage affects expected score only and does not permanently add Elo points to stored ratings.
- Neutral-site matches do not receive home advantage.
- Recency and competition weighting continue to scale K-factor safely when home advantage is enabled.
- Missing neutral-site metadata is reported clearly.
- No data downloads, dependencies, dashboard changes, database, charts, or unrelated refactors.
- Required checks pass with no regressions.

## Phase 7.7 - Attack / Defense Ratings

Add opt-in attack and defense scores to the Live Elo pipeline, derived from historical goal data, as a foundation layer for future expected-goals generation.

Deliverables:

- `LiveEloAttackDefenseConfig` and `LiveEloAttackDefenseMetadata` types.
- `resolveAttackDefense()` helper computing per-team attack and defense scores relative to the dataset average.
- `attackScore` and `defenseScore` optional fields on `LiveEloRankedEntry` — populated only when enabled.
- Three warning constants: general calibration disclaimer, sparse-data warning, no-goal-data warning.
- API support: `getLiveEloRatingsFoundation()` accepts and forwards the config and returns the metadata plus per-team scores.
- `docs/model-results/ATTACK_DEFENSE_RATINGS.md` documenting formulas, data coverage, metadata, and limitations.

Exit criteria:

- Default Live Elo output unchanged unless `attackDefense.enabled: true` is explicitly supplied.
- Attack and defense scores are in the range [0, 100] and deterministic.
- Teams with no goal data receive neutral scores of 50.
- Sparse and no-goal-data warnings emitted appropriately.
- Elo rankings are identical whether attack/defense is enabled or disabled.
- No new handler added; `supportedHandlers` count remains 9.
- No data downloads, dependencies, dashboard changes, database, or unrelated refactors.
- Required checks pass with no regressions.

## Phase 7.8 - Elo-to-xG Calibration

Create a transparent, tested Elo-to-expected-goals model function that replaces the inline API calculation and serves as the foundation for future xG improvements.

Deliverables:

- `packages/model/src/elo-to-xg.ts` — `eloToExpectedGoals()` function with named constants, optional attack/defense adjustment, and deterministic output.
- `EloToExpectedGoalsInput` and `EloToExpectedGoalsResult` types in `types.ts`.
- Model package exports for all constants, types, and the function.
- `packages/model/tests/elo-to-xg.test.ts` — 16 unit tests.
- `predictMatchFromLiveElo()` updated to call the model function (numerically identical behavior).
- `packages/api/tests/api.test.ts` — 7 new API tests verifying xG behavior, warning propagation, and model/API consistency.
- `docs/model-results/ELO_TO_XG_CALIBRATION.md` documenting formulas, constants, limitations, and future work.

Exit criteria:

- `eloToExpectedGoals` produces the same values as the old inline calculation for identical inputs.
- All existing `predictMatchFromLiveElo` tests pass without modification.
- xG values are bounded, finite, and deterministic.
- Uncalibrated warning is always emitted.
- No data downloads, dependencies, dashboard changes, database, or new API handlers.
- Required checks pass with no regressions.

## Phase 7.9 - Elo Prediction Presets

Add conservative, balanced, and aggressive prediction presets to the Elo-to-xG pipeline so users can tune xG sensitivity from the dashboard.

Deliverables:

- `EloXgPreset` type and `EloXgPresetConfig` interface in `packages/model/src/types.ts`.
- `ELO_XG_PRESETS` constant in `packages/model/src/elo-to-xg.ts` — conservative, balanced, aggressive configs; balanced equals prior default behavior.
- `ELO_TO_XG_PRESET_WARNING` constant emitted for non-balanced presets.
- `preset` optional input on `EloToExpectedGoalsInput`; `preset` and `presetDescription` on `EloToExpectedGoalsResult`.
- `preset` field on `PredictMatchFromLiveEloRequest`; `preset` and `presetDescription` on `PredictMatchFromLiveEloSuccessResponse.expectedGoals`.
- Runtime preset validation — invalid preset returns a `validation_error`.
- 8 new model unit tests in `packages/model/tests/elo-to-xg.test.ts`.
- 6 new API tests in `packages/api/tests/api.test.ts`.
- Preset selector UI (3-button row) in the Auto Predict From Elo panel of `MatchSimulationForm`.
- Active preset shown in `MatchSimulationResults` for Live Elo predictions.
- `docs/model-results/ELO_PREDICTION_PRESETS.md`.

Exit criteria:

- Balanced preset is numerically identical to omitting preset.
- Conservative gap < balanced gap < aggressive gap for unequal Elo inputs.
- Invalid preset is rejected with a `validation_error`.
- Uncalibrated and preset warnings are emitted correctly per preset.
- All checks pass: `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`.

## Phase 7.0 - QA Automation

Strengthen automated quality coverage.

Potential deliverables:

- Unit tests
- Integration tests
- Data validation checks
- Model validation tests
- Dashboard E2E tests
- Accessibility checks

Exit criteria:

- Important regressions are caught before merge.
- Quality checks are documented and repeatable.

## Phase 8.0 - CI/CD

Automate checks and deployment paths.

Potential deliverables:

- GitHub Actions workflows
- Lint, test, and build jobs
- Data or model validation jobs
- Deployment workflow for dashboard
- Status badges

Exit criteria:

- Pull requests run meaningful automated checks.
- Deployment steps are repeatable.

## Phase 8.5 - CI/CD Pipeline Foundation

Add the first repeatable GitHub Actions validation workflow.

Deliverables:

- `.github/workflows/ci.yml`.
- Pull request and `main` push triggers.
- Node 20 setup with pnpm and pnpm dependency caching.
- Frozen lockfile installation.
- Unit/integration tests, type checks, build validation, and Chromium Playwright E2E checks.
- CI/CD foundation documentation in `docs/qa/CI_CD_PIPELINE_FOUNDATION.md`.

Deferred to future phases:

- Deployment.
- Docker.
- Cloud provider configuration.
- Secrets.
- Databases or service containers.
- Separate release workflows.

Exit criteria:

- Pull requests and pushes to `main` run the same core checks required locally.
- CI uses the committed pnpm lockfile.
- Chromium browser dependencies are installed before E2E tests.
- No deployment, Docker, cloud provider, database, or secret configuration is introduced.

## Phase 9.0 - Portfolio Polish

Turn the project into a strong portfolio artifact.

Deliverables:

- Portfolio-focused README.
- Interview presentation guide in `docs/portfolio/PORTFOLIO_PRESENTATION.md`.
- Clear explanation of architecture, data pipeline, modeling, simulation, validation, dashboard, QA, and CI/CD work.
- Recruiter-friendly and SDET-friendly project highlights.
- Screenshot placeholder plan for future visual assets.

Deferred to future phases:

- Final screenshots.
- Demo video or hosted walkthrough.
- Deployment.
- Additional model calibration reports.

Exit criteria:

- The project is understandable to recruiters, engineers, and data practitioners.
- The repository demonstrates both engineering and modeling judgment.

## Phase 9.1 - Screenshots & Demo Assets

Define the visual asset plan for portfolio presentation without adding binary screenshots.

Deliverables:

- Screenshot checklist for dashboard overview, manual match simulation, Auto Predict From Elo, prediction presets, Live Elo ratings, historical validation, tournament simulation, team ratings, Playwright E2E passing, and GitHub Actions CI passing.
- Suggested screenshot filenames.
- Capture guidance for what to highlight in each screenshot.
- Demo scripts for a 2-minute walkthrough, 5-minute technical walkthrough, and Senior SDET interview walkthrough.
- `docs/portfolio/assets/README.md` documenting the future manual asset directory.

Deferred to future phases:

- Captured binary screenshots.
- Demo video files.
- Hosted media or public portfolio page.

Exit criteria:

- Portfolio screenshots can be captured consistently later.
- Demo walkthroughs have clear talking points for recruiters, engineers, and SDET interviewers.
- No application, model, API, test, dependency, or CI behavior changes are introduced.

## Phase 9.2 - Architecture Diagrams

Add documentation-only Mermaid diagrams for portfolio and interview presentation.

Deliverables:

- Monorepo architecture diagram.
- Data-to-prediction flow diagram.
- API flow diagram.
- QA strategy diagram.
- Interview story diagram.
- README and portfolio presentation references to the diagram pack.

Deferred to future phases:

- Binary diagram exports.
- Hosted architecture visuals.
- Production deployment architecture diagrams.

Exit criteria:

- Diagrams render in GitHub Markdown.
- Diagrams explain current architecture and validation strategy without claiming undeployed infrastructure.
- No application, model, API, data, test, dependency, CI, or image-file changes are introduced.

## Phase 9.3 - Portfolio Release Preparation

Prepare the repository for a polished portfolio release.

Deliverables:

- `docs/portfolio/PORTFOLIO_RELEASE_CHECKLIST.md`.
- `docs/portfolio/DEMO_SCRIPT.md`.
- Recommended release tag: `v0.1.0-portfolio`.
- Local final validation command list.
- GitHub PR checklist.
- LinkedIn and GitHub portfolio summary text.
- 2-minute, 5-minute, and Senior SDET demo scripts.
- QA Engineer, Senior QA, and SDET interview talking points.
- Limitations section covering partial dataset, foundation model, not betting advice, and no public accuracy claim.

Deferred to future phases:

- Deployment.
- Dependency changes.
- Binary screenshots or videos.
- App, API, model, data, test, or CI behavior changes.

Exit criteria:

- Portfolio release readiness can be reviewed from documentation alone.
- Final validation, PR review, and tagging expectations are clear.
- Documentation remains honest about limitations and non-goals.

## Phase 9.4 - Final Release Tag & Portfolio QA Review

Prepare final portfolio QA review documentation and release tag instructions.

Deliverables:

- `docs/portfolio/FINAL_PORTFOLIO_QA_REVIEW.md`.
- `docs/portfolio/RELEASE_TAGGING_GUIDE.md`.
- Final QA review checklist covering local tests, typecheck, build, Playwright E2E, GitHub Actions, README review, architecture diagrams review, demo script review, and known limitations.
- Portfolio acceptance criteria.
- Final release readiness status template.
- Manual release tag commands for `v0.1.0-portfolio`.
- Tag rollback guidance.
- Final LinkedIn and GitHub summary text.
- Interview guidance for what to show and what not to claim.

Deferred to future phases:

- Running git tag commands.
- Deployment.
- Dependency changes.
- Binary images or videos.
- App, API, model, data, test, or CI behavior changes.

Exit criteria:

- Final release review can be completed from documentation alone.
- Manual tag creation and rollback steps are clear for the user.
- The portfolio release remains honest about partial data, foundation modeling, no betting advice, and no public accuracy claim.
## Phase 10.16 - Final Match Simulation

Status: Done

Deliverables:

- `simulateWorldCup2026FinalMatchFoundation()` API handler
- typed Final match simulation response contracts
- dashboard Final match simulation section
- Final match simulation documentation

Exit criteria:

- projected Final fixture is simulated deterministically
- win/draw/win probabilities and likely scorelines are returned
- no champion is selected
- no penalties or title probabilities are modeled

## Phase 11.0 - Knockout Winner Resolution Foundation

Status: Done

Deliverables:

- `resolveWorldCup2026KnockoutWinnersFoundation()` API handler
- typed winner resolution response contracts (`WorldCup2026ResolvedKnockoutWinner`, `WorldCup2026KnockoutWinnerResolutionResponse`)
- dashboard Knockout Winner Resolution section
- knockout winner resolution documentation

Exit criteria:

- deterministic winners resolved for all 31 knockout fixtures (R32, R16, QF, SF, Final)
- projected champion and runner-up identified
- no penalties, no randomization, no champion probability distribution

## Phase 11.1 - Third Place Match Foundation

Status: Done

Deliverables:

- `getWorldCup2026ThirdPlaceMatchFoundation()` API handler
- typed Third Place Match response contracts (`WorldCup2026ThirdPlaceParticipant`, `WorldCup2026ThirdPlaceMatchFixture`, `WorldCup2026ThirdPlaceMatchFoundationResponse`)
- dashboard Third Place Match section
- Third Place Match foundation documentation

Exit criteria:

- two SF losers identified via deterministic loser selection rule
- one projected Third Place Match fixture produced
- no Third Place Match simulation, no winner selection, no penalty logic
