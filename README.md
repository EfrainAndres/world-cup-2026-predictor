# World Cup 2026 Predictor

World Cup 2026 Predictor is a TypeScript monorepo portfolio project that predicts football match outcomes with transparent models, deterministic tests, API contracts, dashboard workflows, and CI validation.

The project is built to show engineering judgment as much as prediction output: clean package boundaries, reproducible checks, model caveats, and user-facing uncertainty are treated as first-class requirements.

## Project Overview

This repository models a full product-quality prediction workflow:

- Validated football match data contracts.
- Elo team ratings and match probability foundations.
- Poisson scoreline probability simulation.
- Monte Carlo match and tournament simulation.
- Historical replay and validation helpers.
- Pure API handlers with stable response contracts.
- A Next.js dashboard for match prediction and model evidence.
- Vitest, Playwright, regression, API contract, and CI checks.

It is intentionally not betting software. Predictions are presented as model outputs with known limitations, not guarantees.

## Why This Project Exists

The project exists to demonstrate how a prediction system can be built with professional software quality practices:

- Keep data, model, API, and UI responsibilities separate.
- Start with transparent baseline models before adding complexity.
- Validate outputs with deterministic tests and historical replay.
- Expose clear warnings where data coverage or model calibration is limited.
- Build a dashboard that explains uncertainty instead of hiding it.
- Make quality gates repeatable locally and in GitHub Actions.

For recruiters and interviewers, the repository is meant to be readable as an engineering case study: each phase adds capability while preserving testability and documentation.

## Features Implemented

| Area | Implemented Capability |
| --- | --- |
| Data | Match contracts, validation, normalization, historical World Cup fixtures, and international fixture samples. |
| Modeling | Elo rating updates, Poisson scoreline probabilities, Dixon-Coles foundation, Elo-to-xG calibration, and prediction presets. |
| Simulation | Seeded Monte Carlo match simulation, group/knockout tournament simulation, repeated tournament runs, FIFA 2026 format helpers, and full five-round World Cup 2026 knockout tournament projection (R32 → R16 → QF → SF → Final). |
| Historical validation | Historical brackets, replay snapshots, Monte Carlo replay, backtesting reports, and replay accuracy audit helpers. |
| API | Pure TypeScript handlers, runtime adapter, validation errors, deterministic responses, and API contract tests. |
| Dashboard | Next.js dashboard with full tournament projection overview, deterministic champion projection, five-round champion path, third-place match foundation and simulation, round-by-round knockout simulations, match simulation form, Live Elo predictions, team ratings, and historical validation evidence. |
| QA | Unit tests, integration tests, deterministic regression snapshots, API contract tests, and 52 Playwright E2E tests covering tournament projections, match simulation, form validation, Elo mode, presets, team aliases, and anchor navigation. |
| CI/CD | GitHub Actions workflow for install, tests, typecheck, build, and Chromium E2E validation. |

## Architecture

The repository follows a layered monorepo structure:

```text
apps/web
  Next.js dashboard and thin UI orchestration

packages/api
  Pure API handlers, schemas, validation, and runtime adapter

packages/model
  Elo, Poisson, simulation, tournament, and historical validation logic

packages/data
  Data contracts, fixture loading, validation, and normalization

docs
  Architecture, roadmap, QA, model results, data quality, and portfolio notes
```

Core boundaries:

- UI components do not own prediction logic.
- API handlers stay thin and delegate model behavior.
- Model logic is framework-independent.
- Data code owns validation and normalization.
- Tests cover deterministic behavior before behavior is exposed through the dashboard.

Portfolio architecture diagrams are available in `docs/architecture/ARCHITECTURE_DIAGRAMS.md`.

Portfolio release preparation docs are available in `docs/portfolio/PORTFOLIO_RELEASE_CHECKLIST.md`, `docs/portfolio/FINAL_PORTFOLIO_QA_REVIEW.md`, `docs/portfolio/RELEASE_TAGGING_GUIDE.md`, and `docs/portfolio/DEMO_SCRIPT.md`.

## Data Pipeline

The data package defines typed match records, validation rules, normalization helpers, and fixture-based datasets. Historical World Cup fixtures and curated international samples provide a controlled foundation for model and API development.

Data work emphasizes:

- Clear contracts before model use.
- Validation for missing, malformed, or inconsistent match fields.
- Normalization before downstream scoring.
- Documentation of partial coverage and fixture limitations.

## Elo Model

The Elo foundation provides a transparent team-strength model with deterministic rating updates. Later phases extend it with opt-in recency weighting, competition weighting, home advantage, attack/defense ratings, and prediction presets.

The Live Elo pipeline computes current ratings from available historical match data and exposes metadata about coverage, match counts, latest match date, and warnings for partial data.

## Poisson Simulation

The model package includes Poisson scoreline probability helpers and match outcome aggregation. Elo-derived expected goals can feed scoreline probabilities, which are then used to produce home win, draw, away win, and most-likely scoreline outputs.

The simulation path favors explainability:

- Probabilities are bounded and normalized.
- Seeded simulation paths are deterministic.
- Scoreline distributions are inspectable.
- Model warnings are surfaced to API and dashboard callers.

## Historical Validation

Historical validation work covers more than a single backtest. The repository includes helpers for:

- Historical World Cup fixture validation.
- Pre-tournament snapshot generation.
- Historical Elo replay.
- Tournament bracket reconstruction.
- Monte Carlo replay against historical tournaments.
- Replay accuracy audits and known-gap reporting.

This makes model limitations visible before predictions are presented as useful.

## Live Elo Pipeline

The Live Elo pipeline combines World Cup fixture history with a curated international supplement covering competitions such as Copa America, UEFA Euro, World Cup qualifying, and friendlies.

It supports opt-in model adjustments while preserving a transparent baseline:

- Recency weighting.
- Competition weighting.
- Neutral-site-aware home advantage.
- Attack and defense scoring.
- Elo-to-xG calibration.
- Conservative, balanced, and aggressive prediction presets.

## Dashboard Features

The Next.js dashboard presents model outputs in a summary-first layout:

- **Tournament Projection Overview** — projected champion, runner-up, and third-place match at a glance; anchor navigation to all knockout rounds.
- **Champion Projection Summary** — champion card, runner-up card, and five-round champion path (R32 → R16 → QF → SF → Final) with numbered step badges and per-round probability snapshots.
- **Full knockout simulation** — match-level probabilities and top scorelines for every round: Final, Semifinals, Quarterfinals, Round of 16, and Round of 32 (31 fixtures total).
- **Third Place Match** — projected fixture from semifinal losers and match-level simulation.
- **Interactive manual xG match simulation** — enter teams and expected goals to run a local Poisson simulation.
- **Auto Predict From Elo mode** — derive expected goals automatically from Live Elo ratings.
- **Prediction preset selector** — conservative, balanced, and aggressive presets.
- **Team alias handling** and field-level validation suggestions.
- **Live Elo team ratings** — computed from curated historical data with partial-data warnings.
- **Historical validation evidence** and replay audit status.

All predictions include source metadata, data warnings, and explicit model limitations. The dashboard does not hide uncertainty.

12 AppHeader anchor links provide direct navigation to all major dashboard sections.

## QA Strategy

The QA strategy is a major portfolio focus. Coverage includes:

- Unit tests for deterministic data and model logic.
- Integration tests for API handler behavior.
- API contract tests for response shapes and validation errors.
- Regression snapshot tests for critical model/API outputs.
- Playwright E2E tests for dashboard workflows.
- Historical validation and replay checks.
- Local commands that match CI checks.

This makes the project relevant for QA Engineer, Senior QA, and SDET interviews because the test strategy covers both product behavior and technical contracts.

## CI/CD

GitHub Actions validates pull requests and pushes to `main`.

Current CI checks:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @world-cup-2026-predictor/web test:e2e
```

The workflow uses Node 20, pnpm caching, and Chromium Playwright browser dependencies. Deployment, Docker, cloud providers, databases, and secrets are intentionally deferred.

## Repository Structure

```text
.
├── .github/workflows/        # GitHub Actions CI workflow
├── apps/web/                 # Next.js dashboard
├── packages/api/             # Pure API handlers and contracts
├── packages/data/            # Data validation and normalization
├── packages/model/           # Prediction, simulation, and validation logic
├── docs/                     # Architecture, QA, data, model, and portfolio docs
├── package.json              # Workspace scripts
├── pnpm-lock.yaml            # Locked dependency graph
└── turbo.json                # Monorepo task orchestration
```

## Local Setup

Prerequisites:

- Node.js 20.
- pnpm 9.15.4 or compatible with the committed `packageManager` field.

Install dependencies:

```bash
pnpm install
```

Run the dashboard locally:

```bash
pnpm --filter @world-cup-2026-predictor/web dev
```

Run E2E tests for the first time after installing Playwright browsers:

```bash
pnpm --filter @world-cup-2026-predictor/web exec playwright install chromium
pnpm --filter @world-cup-2026-predictor/web test:e2e
```

## Test Commands

From the repository root:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @world-cup-2026-predictor/web test:e2e
```

Focused package checks:

```bash
pnpm --filter @world-cup-2026-predictor/data test
pnpm --filter @world-cup-2026-predictor/model test
pnpm --filter @world-cup-2026-predictor/api test
```

## Future Roadmap

Planned next steps include:

- Expand real international data coverage.
- Add deeper model calibration and accuracy reports.
- Add accessibility automation.
- Add deployment once the dashboard and release path are stable.
- Capture and review the planned portfolio screenshots and demo assets.
- Complete the `v0.1.0-portfolio` release checklist before tagging a portfolio release.
- Introduce production data storage only when the use case requires it.

## Portfolio Release

Recommended portfolio release tag:

```text
v0.1.0-portfolio
```

Before tagging a release, use `docs/portfolio/PORTFOLIO_RELEASE_CHECKLIST.md` to confirm the README, architecture diagrams, screenshots, demo script, local checks, Playwright E2E, GitHub Actions, PR merge, and release tag are complete.

Use `docs/portfolio/FINAL_PORTFOLIO_QA_REVIEW.md` for final acceptance criteria and release readiness status.

Use `docs/portfolio/RELEASE_TAGGING_GUIDE.md` for manual tag commands and rollback guidance after the release PR is merged to `main`.

Use `docs/portfolio/DEMO_SCRIPT.md` for 2-minute, 5-minute, and Senior SDET walkthroughs.

## Screenshots Placeholder Section

Screenshots are planned manual portfolio assets and should not be committed until they are captured, reviewed, and intentionally selected for publication. The screenshot plan and demo scripts live in `docs/portfolio/SCREENSHOTS_AND_DEMO_ASSETS.md`.

| Screenshot | Purpose |
| --- | --- |
| AppHeader with all 12 nav links | Show navigation scope |
| Tournament Projection Overview | Headline projection — champion, runner-up, third place |
| Champion Projection Summary with path | Five-round path with numbered badges |
| Final match simulation | Probabilities and scorelines |
| Semifinal match simulation | Probabilities and scorelines |
| Third Place Match simulation | Probabilities and scorelines |
| Manual match simulation result | Show form + probability output |
| Auto Predict From Elo result | Show Elo mode and partial-data warning |
| Live Elo ratings | Model metadata and coverage warnings |
| Historical validation | Replay evidence and known limitations |
| Playwright E2E passing (52 tests) | Dashboard workflow automation passing |
| GitHub Actions CI passing | Automated checks passing on GitHub Actions |
| Architecture diagrams | Monorepo structure, prediction flow, QA strategy |

## Portfolio Highlights

This project is designed to support technical discussion around:

- TypeScript across app, API, data, and model packages.
- Monorepo structure with pnpm workspaces and Turborepo.
- Clean Architecture boundaries between UI, API, model, and data layers.
- Deterministic testing for prediction and simulation behavior.
- API contract testing for stable response shapes and validation errors.
- Playwright E2E coverage for user-facing dashboard workflows.
- Historical validation using replay, snapshots, and audit reports.
- Monte Carlo simulation for match and tournament outcomes.
- Elo rating system with transparent extensions and warnings.
- CI/CD foundation through GitHub Actions.
