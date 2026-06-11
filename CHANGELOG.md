# Changelog

All notable changes to this project will be documented in this file.

This project follows a simple, human-readable changelog format and aims to use clear conventional commit messages.

## [Unreleased]

### Added

- Phase 7.0B historical international match dataset foundation.
- `packages/data/src/international-matches.ts` with `loadInternationalMatchDataset`, `validateInternationalMatchDataset`, `normalizeInternationalMatch`, `normalizeInternationalMatches`, and full type exports for `InternationalMatch`, `InternationalMatchInput`, `InternationalMatchDatasetMetadata`, `InternationalMatchDatasetResult`, and related validation types.
- `packages/data/fixtures/international/sample-international-matches.json` — 15-match curated sample covering FIFA World Cup 2022, Copa America 2024, UEFA Euro 2024, FIFA World Cup 2026 Qualifier, and International Friendly.
- `packages/data/fixtures/international/README.md` documenting the fixture schema, field requirements, and guidance for adding real match data.
- `INTERNATIONAL_MATCH_DATASET_FOUNDATION_WARNING` and `INTERNATIONAL_MATCH_SAMPLE_ONLY_WARNING` constants for downstream metadata propagation.
- `docs/data-quality/INTERNATIONAL_MATCH_DATASET_FOUNDATION.md` documenting the module design, schema, validation rules, normalization mapping, limitations, and next steps.
- Phase 7.0A live Elo pipeline foundation.
- `runLiveEloPipeline()` in `packages/model/src/live-elo-pipeline.ts` — pure pipeline accepting `EloMatch[]`, processing matches chronologically, returning ranked team ratings, match counts, coverage metadata, and warnings.
- `LiveEloDataCoverage`, `LiveEloPipelineInput`, `LiveEloRankedEntry`, `LiveEloPipelineResult` types in `packages/model/src/types.ts`.
- `packages/api/src/live-elo-data.ts` with 256 curated World Cup fixture records (2010, 2014, 2018, 2022) as typed `EloMatch` constants.
- `getLiveEloRatingsFoundation()` pure API handler returning the top 15 Elo-rated teams computed from World Cup fixture history with full metadata and foundation warnings.
- `LiveEloRatedTeamEntry` and `LiveEloRatingsFoundationResponse` schema types in `packages/api/src/schemas.ts`, exported from `packages/api/src/index.ts`.
- 17 new tests for `runLiveEloPipeline` in `packages/model/tests/live-elo-pipeline.test.ts`.
- 10 new tests for `getLiveEloRatingsFoundation` in `packages/api/tests/api.test.ts`.
- `docs/model-results/LIVE_ELO_PIPELINE_FOUNDATION.md` documenting assumptions, data sources, sample output, limitations, and next steps.
- Phase 6.6 live team ratings integration.
- `getTeamRatingsFoundation()` pure API handler in `packages/api` returning `TeamRatingsFoundationResponse` with 10 team entries, derived summary stats, and standard `ApiMetadata`.
- `TeamRatingTier`, `TeamRatingFoundationEntry`, and `TeamRatingsFoundationResponse` schema types in `packages/api/src/schemas.ts`, exported from `packages/api/src/index.ts`.
- Removed `FOUNDATION_TEAM_RATINGS`, `TeamRatingEntry`, `TeamRatingTier`, and `TeamRatingsFoundation` from `apps/web/src/lib/api-client.ts`; replaced with live handler call and re-exported API types.
- Updated `TeamRatingCard` to import `TeamRatingFoundationEntry` and `TeamRatingTier` from `@world-cup-2026-predictor/api`.
- Updated `TeamRatingsSection` to import `TeamRatingsFoundationResponse` from `@world-cup-2026-predictor/api`.
- `docs/dashboard/LIVE_TEAM_RATINGS_INTEGRATION.md` documenting the handler, type migration, consistency check, and next steps.
- Phase 6.5 team ratings dashboard.
- `TeamRatingsSection` component with foundation warning, five summary stat cards (teams count, top Elo, average Elo, strongest offense, strongest defense), and a 10-card team grid.
- `TeamRatingCard` component showing rank, team name, Elo rating, tier pill, offense/defense strength scores, and a short summary.
- `TeamRatingEntry`, `TeamRatingTier`, and `TeamRatingsFoundation` types added to `apps/web/src/lib/api-client.ts`.
- `FOUNDATION_TEAM_RATINGS` constant with static seed ratings for top 10 World Cup 2026 contenders.
- `teamRatings: TeamRatingsFoundation` added to `DashboardSnapshot`.
- `docs/dashboard/TEAM_RATINGS_DASHBOARD.md` documenting components, data, tier system, boundaries, and next steps.
- Phase 6.4 live tournament simulation integration.
- `simulateTournamentFoundation()` pure API handler in `packages/api` using `runTournamentRepeatedRuns` with an 8-team sample tournament (seed 2026, 1000 runs).
- `TournamentSimulationTeamResult` and `TournamentSimulationSuccessResponse` schema types in `packages/api/src/schemas.ts`.
- Updated `TournamentSimulationSection` to render live handler output from `TournamentSimulationSuccessResponse` instead of the static `FOUNDATION_TOURNAMENT_SIMULATION` constant.
- Updated `TournamentProbabilityCard` to use `TournamentSimulationTeamResult` from the API package instead of `TournamentProbabilityEntry` from the web client.
- Removed `FOUNDATION_TOURNAMENT_SIMULATION`, `TournamentSimulationFoundation`, and `TournamentProbabilityEntry` from `apps/web/src/lib/api-client.ts`.
- `docs/dashboard/LIVE_TOURNAMENT_SIMULATION_INTEGRATION.md` documenting the handler, sample tournament input, determinism, component changes, and accuracy framing.
- Phase 6.3 tournament simulation dashboard.
- `TournamentSimulationSection` component with simulation engine status, foundation warning, top-5 illustrative probability card grid, model limitations, and match simulation CTA.
- `TournamentProbabilityCard` component showing team rank, illustrative champion probability, and runner-up probability.
- `FOUNDATION_TOURNAMENT_SIMULATION` constant and `TournamentSimulationFoundation` / `TournamentProbabilityEntry` types in `api-client.ts`.
- `docs/dashboard/TOURNAMENT_SIMULATION_DASHBOARD.md` documenting the section purpose, components, data sources, accuracy framing, and future API roadmap note.
- Phase 6.2 historical validation dashboard.
- `HistoricalValidationSection` component with aggregate audit status, component availability summary, audit disclaimer, and per-year tournament card grid.
- `HistoricalTournamentCard` component showing champion, runner-up, match count, dataset status, replay-supported status, and foundation-only warning for each supported year.
- `docs/dashboard/HISTORICAL_VALIDATION_DASHBOARD.md` documenting the section purpose, components, data sources, boundaries, accuracy framing, and next steps.
- Phase 0.8 AI Collaboration Workflow documentation.
- `CLAUDE.md` with Claude Code session rules, git responsibility split, required reading list, checks, and handoff format.
- `docs/AI_COLLABORATION_WORKFLOW.md` with tool roles, phase-scoped reading guide, git responsibility split, handoff format, scope rules, and token efficiency guidance.
- `docs/PROMPTING_GUIDELINES.md` with prompt structure, low-token examples, anti-patterns, tool selection guide, and context management advice.
- Updated `AGENTS.md` to reference Claude Code, `CLAUDE.md`, `docs/AI_COLLABORATION_WORKFLOW.md`, and `docs/PROMPTING_GUIDELINES.md`.
- Phase 6.1 match simulation dashboard.
- Interactive dashboard match simulation form with team, expected-goals, max-goals, optional simulation-count inputs, validation messages, result cards, most likely scorelines, baseline warning copy, and dashboard documentation.
- Phase 6.0 dashboard foundation.
- Minimal Next.js, TypeScript, and Tailwind web app with dashboard home page, accessible layout, navigation, model status, match simulation preview, historical replay audit preview, historical tournament summaries, local API client wrapper, and dashboard foundation documentation.
- Phase 5.3 API endpoint validation.
- Endpoint-level runtime tests for health, model info, match simulation, all supported historical summaries, invalid historical years, replay audit metadata, unsupported routes, unsupported methods, deterministic responses, and JSON error shapes.
- Phase 5.2 API runtime foundation.
- Dependency-free HTTP-ready runtime adapter with JSON routes for health, model info, match simulation, historical tournament summaries, replay audit metadata, typed runtime errors, deterministic local request tests, and runtime documentation.
- Phase 5.1 API integration validation.
- Integration-style API tests for all pure handlers, stable response shapes, validation-error consistency, optional Monte Carlo simulation, historical summary handling, replay audit metadata, and no-server/no-database/no-network boundaries.
- Phase 5.0 API foundation.
- Lightweight TypeScript API package with pure handlers for health, model info, match simulation, historical tournament summaries, historical replay audit metadata, deterministic tests, and API documentation.
- Phase 4.0P historical replay accuracy audit foundation.
- TypeScript audit helpers for per-year and aggregate replay status, metric availability, dataset/bracket/Elo/Monte Carlo/replay validation checks, foundation-warning detection, API readiness recommendations, deterministic tests, and model result documentation.
- Phase 4.0O complete historical replay validation foundation.
- TypeScript validation helpers that audit dataset completeness, bracket reconstruction, historical Elo snapshots, Monte Carlo replay, replay backtesting reports, per-year status, aggregate status, foundation warnings, deterministic tests, and model result documentation.
- Phase 4.0N historical tournament bracket reconstruction foundation.
- TypeScript reconstruction helpers for 2010, 2014, 2018, and 2022 historical groups, standings, qualifiers, knockout rounds, champion, runner-up, third place, match-count validation, deterministic tests, and model result documentation.
- Phase 4.0M historical Monte Carlo replay foundation.
- TypeScript Monte Carlo replay helpers for Elo-to-expected-goals mapping, Poisson score matrices, explicit simplified tournament simulations, per-year replay scoring, aggregate summaries, deterministic tests, and model result documentation.
- Phase 4.0L historical Elo snapshot replay foundation.
- TypeScript historical Elo replay helpers for cutoff-safe match filtering, Elo rating snapshots, Elo-derived probability normalization, foundation snapshot metadata, replay warnings, deterministic tests, and model result documentation.
- Phase 4.0K historical tournament replay backtesting foundation.
- TypeScript replay helpers for 2010, 2014, 2018, and 2022 pre-tournament snapshots, per-year replay metrics, aggregate replay summaries, look-ahead guardrail status, baseline snapshot warnings, deterministic tests, and replay documentation.
- Phase 4.0J true pre-tournament snapshot generation foundation.
- Baseline pre-tournament snapshot helpers, seed-rating probability normalization, look-ahead bias guardrails, deterministic snapshot tests, and model result documentation.
- Phase 4.0I real historical backtesting report foundation.
- TypeScript historical backtesting report helpers for complete 2010, 2014, 2018, and 2022 fixture datasets, synthetic snapshot warnings, per-year reports, aggregate metrics, deterministic tests, and model result documentation.
- Phase 4.0H complete historical World Cup dataset foundation.
- Complete curated 2010, 2014, 2018, and 2022 World Cup fixture result files, expanded historical fixture validation, 256-match dataset checks, deterministic data tests, and historical dataset validation documentation.
- Phase 4.0G historical backtesting and calibration foundation.
- TypeScript backtesting helpers for curated historical fixture subsets, champion and runner-up extraction, Brier Score, Log Loss, Top-N hits, calibration buckets, deterministic tests, and model result documentation.
- Phase 4.0F real historical dataset integration foundation.
- Curated 2018 and 2022 World Cup fixture JSON subsets, TypeScript historical fixture loader, validation tests, and data quality documentation.
- Phase 4.0E historical tournament validation foundation.
- TypeScript historical validation metrics for champion probabilities, runner-up ranking, knockout qualification, calibration buckets, deterministic tests, and model result documentation.
- Phase 4.0D FIFA 2026 format and fixture modeling foundation.
- TypeScript FIFA 2026 format constants, group validation, best third-place qualification, Round of 32 fixture validation, deterministic tests, and model result documentation.
- Phase 4.0C tournament repeated-runs foundation.
- Repeated TypeScript tournament simulation aggregation with champion, runner-up, group qualification, knockout qualification probabilities, deterministic tests, and model result documentation.
- Phase 4.0B tournament simulation foundation.
- Simplified TypeScript group-stage standings, knockout rounds, tournament orchestration, deterministic tests, and tournament model result documentation.
- Phase 4.0A Monte Carlo match simulation engine foundation.
- Seeded TypeScript match simulation, simulation aggregation, deterministic tests, and Monte Carlo model result documentation.
- Phase 3.0 Poisson/Dixon-Coles foundation implementation.
- TypeScript Poisson scoreline probabilities, outcome aggregation, Dixon-Coles low-score adjustment foundation, deterministic tests, and model result documentation.
- Phase 2.0 Elo baseline foundation implementation.
- TypeScript model package with Elo rating logic, deterministic tests, and model result documentation.
- Phase 1.0 data pipeline foundation implementation.
- pnpm workspace and Turborepo configuration.
- TypeScript data package with match contracts, validation, normalization, tests, and data quality docs.
- Phase 0.7 delivery and development plan documentation.
- Repository structure plan, Definition of Done, milestones, and release strategy.
- Phase 0.6 data and modeling research documentation.
- Data source inventory, planned data dictionary, model roadmap, validation strategy, and backtesting strategy.
- Phase 0.5 UX research and product discovery documentation.
- Product vision, user flows, dashboard structure, design system direction, and portfolio story.
- Phase 0.2 technical decisions foundation documentation.
- Technical stack, coding standards, Git workflow, and decision index.
- Architecture Decision Records for pnpm, Turborepo, FastAPI, PostgreSQL, and GitHub Actions.
- Phase 0.1 architecture foundation documentation.
- Monorepo and Clean Architecture / Hexagonal Architecture direction.
- Architecture Decision Records for monorepo, architecture style, Next.js App Router, and Python modeling.
- Project foundation documentation.
- Roadmap for data, modeling, simulation, dashboard, QA, CI/CD, and portfolio polish.
- Data, model, QA, and validation strategy documents.
- Agent working instructions for future Codex sessions.

## [0.0.0] - 2026-06-08

### Added

- Initial documentation foundation for the World Cup 2026 Predictor project.
