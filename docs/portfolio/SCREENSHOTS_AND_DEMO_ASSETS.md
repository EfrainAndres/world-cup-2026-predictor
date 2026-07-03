# Screenshots And Demo Assets

Phase 9.1 defines the manual screenshot and demo asset plan for the portfolio version of World Cup 2026 Predictor.

No binary screenshots are included in this phase. Screenshots are manual portfolio assets and should not be committed until they are captured, reviewed, and intentionally selected for publication.

## Asset Location

Use `docs/portfolio/assets/` for future portfolio media.

Recommended rules:

- Commit only final, reviewed assets.
- Prefer `.png` for screenshots.
- Use lowercase kebab-case filenames.
- Keep images focused on product or engineering evidence, not decorative backgrounds.
- Avoid committing local browser captures with personal data, unrelated browser chrome, or noisy desktop content.
- Re-capture screenshots after major dashboard layout changes.

## Screenshot Checklist

| Screenshot | Suggested filename | What to highlight |
| --- | --- | --- |
| Dashboard overview | `dashboard-overview.png` | Full dashboard structure, evidence-first presentation, model status, and main sections visible together. |
| Manual match simulation | `manual-match-simulation.png` | Manual xG inputs, submitted teams, probability cards, scoreline list, and baseline-not-guarantee framing. |
| Auto Predict From Elo | `auto-predict-from-elo.png` | Auto mode inputs, Live Elo result heading, partial-data warning, and API-driven prediction output. |
| Prediction presets | `prediction-presets.png` | Conservative, balanced, and aggressive preset controls plus visible preset metadata in the result. |
| Live Elo ratings | `live-elo-ratings.png` | Ranked teams, Elo values, matches processed, latest match date, and partial curated data warning. |
| Historical validation | `historical-validation.png` | Replay audit status, supported historical years, component availability, and known limitation framing. |
| Tournament simulation | `tournament-simulation.png` | Foundation simulation status, champion/runner-up probability cards, run count, and simulation limitations. |
| Team ratings | `team-ratings.png` | Top contender ratings, tier labels, offense/defense scores, and summary stats. |
| Playwright E2E passing | `playwright-e2e-passing.png` | Terminal or CI-style output showing Chromium full-suite coverage plus Firefox/WebKit smoke passing, with current totals visible. |
| GitHub Actions CI passing | `github-actions-ci-passing.png` | GitHub Actions workflow run showing the CI job passed on a pull request or `main` push. |

## Capture Guidance

### Dashboard overview

Capture the dashboard at a desktop width where the main sections are easy to scan. The screenshot should communicate that this is a working dashboard backed by model/API outputs, not a static landing page.

### Manual match simulation

Use a recognizable matchup and keep the result area visible. Highlight that manual expected-goals mode is useful for controlled scenario testing and produces outcome probabilities plus likely scorelines.

### Auto Predict From Elo

Show the Auto Predict From Elo mode after a successful prediction. Make sure the Live Elo framing and partial-data warning are visible so the screenshot reinforces honest model communication.

### Prediction presets

Capture the preset selector and resulting metadata together. The goal is to show that model tuning is explicit and user-visible rather than hidden in code.

### Live Elo ratings

Capture enough rating cards or rows to show ranked output and metadata. The important story is data-driven team strength with documented coverage limits.

### Historical validation

Show the aggregate audit and at least some supported years. This screenshot should support interview discussion about domain-specific validation, not only UI testing.

### Tournament simulation

Show champion/runner-up probability cards and the simulation status. Highlight seeded, repeatable simulation rather than claiming predictive certainty.

### Team ratings

Show rating tiers, offense/defense values, and summary stats. This supports a quick recruiter-facing explanation of what the dashboard contains.

### Playwright E2E passing

Capture terminal output after:

```bash
pnpm --filter @world-cup-2026-predictor/web test:e2e:ci
```

The screenshot should show that browser workflow tests pass. Avoid including unrelated shell history.

### GitHub Actions CI passing

Capture the GitHub Actions run after the workflow completes. Show the workflow name, passed status, and validation job if possible.

## Demo Script: 2-Minute Walkthrough

Use this for recruiter screens or quick portfolio reviews.

1. Start with the purpose: a World Cup 2026 prediction project built as an engineering-quality portfolio system.
2. Show the dashboard overview and explain that predictions include model and data warnings.
3. Run one manual match simulation and point out probabilities plus scorelines.
4. Switch to Auto Predict From Elo and explain that ratings come from curated historical data.
5. Close on quality: TypeScript monorepo, deterministic tests, Playwright E2E, API contracts, and GitHub Actions CI.

Core message:

> This is not just a prediction UI. It is a tested, documented system with visible model limits and repeatable quality gates.

## Demo Script: 5-Minute Technical Walkthrough

Use this for engineering interviews where the interviewer wants architecture and validation detail.

1. Explain the package boundaries: `packages/data`, `packages/model`, `packages/api`, and `apps/web`.
2. Show the dashboard overview and connect each visible section to a package responsibility.
3. Demonstrate manual match simulation and describe Poisson scoreline probabilities.
4. Demonstrate Auto Predict From Elo and explain Live Elo metadata, partial-data warnings, aliases, and presets.
5. Show historical validation and explain replay/backtesting as domain-specific validation.
6. Show or reference test output: Vitest, API contract tests, regression snapshots, Playwright E2E, and CI.
7. End with next steps: broader data, calibration reports, accessibility automation, and deployment.

Core message:

> The architecture makes prediction behavior testable without React, API contracts testable without a server, and user workflows testable in the browser.

## Demo Script: Senior SDET Interview Walkthrough

Use this when the interview is focused on automation strategy, risk, and system design.

1. Start with the risk model: probabilistic outputs, data quality, API/UI drift, and user-facing trust.
2. Explain deterministic design: pure model functions, seeded simulations, typed contracts, and explicit metadata.
3. Show API contract and regression snapshot coverage as protection against invisible behavior changes.
4. Show Playwright coverage for critical user workflows and mention accessible selectors.
5. Show CI as the repeatable quality gate and explain why deployment is intentionally deferred.
6. Discuss what would be added next: accessibility checks, CI artifacts, data freshness validation, broader calibration reports, and deployment smoke tests.

Core message:

> I separated software correctness, model validation, and browser workflow validation so each risk is tested at the right layer.

## Publication Checklist

Before committing real screenshots:

- Confirm the dashboard is visually stable.
- Confirm screenshots match the current README and portfolio guide.
- Confirm no personal data, browser extensions, local paths, or unrelated desktop content are visible.
- Confirm image filenames match this document.
- Confirm image dimensions are suitable for GitHub README rendering.
- Confirm screenshots still reflect passing local or CI checks.
