# Portfolio Presentation Guide

This guide explains how to present World Cup 2026 Predictor during interviews. It is written for QA Engineer, Senior QA, and SDET conversations where the interviewer is evaluating engineering quality, test strategy, and technical communication.

## Interview Summary

World Cup 2026 Predictor is a TypeScript monorepo that turns football prediction into a quality engineering case study. It includes data validation, deterministic model logic, pure API contracts, a Next.js dashboard, Playwright E2E coverage, regression snapshots, and GitHub Actions CI.

A concise introduction:

> I built a World Cup prediction project as a portfolio system, not just a demo UI. The focus is on clean architecture, deterministic model behavior, API contract coverage, historical validation, and repeatable CI checks.

## How To Present This Project During Interviews

Start with the product problem, then move into the engineering system:

1. The product predicts match and tournament outcomes while showing uncertainty and limitations.
2. The architecture separates data, model, API, and dashboard responsibilities.
3. The models start with explainable baselines: Elo ratings, Poisson scorelines, and Monte Carlo simulation.
4. Validation is built into the workflow through unit tests, API contracts, regression snapshots, historical replay, and E2E tests.
5. CI runs the core checks on pull requests and pushes to `main`.

Keep the message practical: the project demonstrates how to make a data/model product testable, auditable, and safe to change.

Use `docs/portfolio/SCREENSHOTS_AND_DEMO_ASSETS.md` when preparing visual material. The planned screenshots are manual portfolio assets and should not be committed until captured and reviewed.

Use `docs/architecture/ARCHITECTURE_DIAGRAMS.md` when an interviewer asks for system diagrams, data flow, API flow, QA strategy, or a concise interview story.

Use `docs/portfolio/DEMO_SCRIPT.md` for final 2-minute, 5-minute, and Senior SDET walkthrough scripts. Use `docs/portfolio/PORTFOLIO_RELEASE_CHECKLIST.md` before publishing or tagging the portfolio release.

## Talking Points For QA Engineer

- The project includes both product-facing and technical quality checks.
- Playwright E2E tests verify critical dashboard workflows, including match simulation, Live Elo prediction, validation messages, aliases, and historical validation sections.
- API contract tests verify response shapes, validation errors, deterministic seeded responses, probability ranges, and metadata.
- Regression snapshots protect important model and API outputs from accidental changes.
- The dashboard displays model warnings and limitations so QA is not only checking happy paths.
- CI runs tests, type checks, build validation, and E2E checks automatically.

Strong QA framing:

> I treated quality as part of the product. The user sees uncertainty and limitations, and the test suite protects the contracts behind those displays.

## Talking Points For Senior QA

- The test strategy is risk-based: deterministic model logic, API contracts, and user workflows receive the strongest coverage.
- The repository documents known limitations instead of hiding them, including partial data coverage and calibration caveats.
- Regression snapshot tests create change detection for model outputs where exact behavior matters.
- Contract tests reduce the risk of dashboard/API drift.
- Historical replay provides domain-specific validation beyond generic unit tests.
- CI makes the quality gates repeatable for review.

Senior-level discussion points:

- How to decide which model outputs deserve snapshot protection.
- How to avoid brittle E2E selectors by using accessible roles and labels.
- How to separate predictive accuracy validation from software correctness validation.
- How to introduce future gates gradually without creating slow or flaky CI.

## Talking Points For SDET

- The codebase is TypeScript-first and uses package boundaries to isolate testable logic.
- Pure handlers make API behavior testable without starting a server.
- Seeded Monte Carlo simulation makes probabilistic behavior reproducible.
- Playwright covers browser workflows while Vitest covers deterministic domain logic.
- The CI workflow mirrors local commands and installs Chromium dependencies for E2E validation.
- The architecture supports future automation layers such as accessibility scans, data freshness checks, and deployment smoke tests.

SDET framing:

> I designed the system so automation can test the most important behavior without relying on a fragile environment. Pure functions, deterministic seeds, typed contracts, and browser tests each cover a different risk.

## Technical Challenges Solved

| Challenge | Solution |
| --- | --- |
| Testing probabilistic simulation | Added seeded simulation paths and deterministic assertions. |
| Preventing API/UI drift | Added API contract tests and typed response schemas. |
| Making model changes visible | Added regression snapshot tests for key model and API outputs. |
| Handling imperfect data coverage | Surfaced metadata, warnings, and limitations in API and dashboard outputs. |
| Validating user workflows | Added Playwright tests using accessible selectors. |
| Keeping architecture testable | Kept data, model, API, and UI responsibilities in separate packages. |
| Making checks repeatable | Added documented local commands and GitHub Actions CI. |

## Architecture Decisions

Key decisions to highlight:

- Monorepo with pnpm workspaces for shared TypeScript packages.
- Turborepo for repeatable workspace tasks.
- Clean Architecture style boundaries between data, model, API, and UI layers.
- Next.js dashboard as a presentation layer over local API handlers.
- Pure TypeScript API handlers before adding a network server or deployment.
- GitHub Actions for pull request validation.
- Playwright for browser workflow coverage.

The main architectural message:

> The app is organized so model logic can be tested without React, API contracts can be tested without a server, and UI workflows can be tested through the browser only where that adds value.

For visual support, start with the Monorepo Architecture diagram, then move to API Flow or Data-To-Prediction Flow depending on the interviewer's focus.

## Validation Strategy

The validation strategy has several layers:

| Layer | Purpose |
| --- | --- |
| Data validation | Catch malformed match records before model use. |
| Unit tests | Verify deterministic logic in data, model, and API packages. |
| Integration tests | Validate API handlers together. |
| API contract tests | Protect public response shapes and error behavior. |
| Regression snapshots | Detect accidental changes in important numerical outputs. |
| Historical replay | Compare model/tournament behavior against historical structures and outcomes. |
| Playwright E2E | Verify dashboard workflows from the user's perspective. |
| CI | Run core checks repeatedly on pull requests and main-branch pushes. |

Important distinction:

- Software correctness asks, "Does the system behave as designed?"
- Model quality asks, "Are the predictions useful and well calibrated?"

This project keeps those concerns connected but separate.

## What Would Be Built Next

The next useful improvements are:

- Add real, broader international match data with documented source licensing.
- Add deeper calibration reports for Live Elo and Elo-to-xG outputs.
- Add accessibility automation with axe or a similar Playwright integration.
- Add CI artifacts for Playwright traces and model validation reports.
- Add deployment only after the dashboard release path is stable.
- Capture the planned portfolio screenshots and record a short demo walkthrough.
- Add observability for future runtime API routes if the system gets deployed.

Avoid claiming the project is finished as a production predictor. Present it as a strong foundation with clear next steps and honest limits.

## Portfolio Release Preparation

Recommended release tag:

```text
v0.1.0-portfolio
```

Before presenting this project publicly, confirm the release checklist is complete: README reviewed, architecture diagrams reviewed, screenshots captured, demo script tested, local checks passing, Playwright E2E passing, GitHub Actions passing, PR merged to `main`, and release tag created.
