# Demo Script

This script supports the Phase 9.3 portfolio release. Use it when recording a walkthrough, presenting the project live, or preparing for QA Engineer, Senior QA, and SDET interviews.

## 2-Minute Demo

Use this version for recruiter screens, quick portfolio reviews, or a short LinkedIn/GitHub walkthrough.

1. Start with the purpose.
   - "World Cup 2026 Predictor is a TypeScript monorepo that turns a prediction idea into a quality engineering case study."
2. Show the README and architecture summary.
   - Point to the data, model, API, dashboard, QA, and CI layers.
3. Show the dashboard overview.
   - Emphasize that predictions include metadata, warnings, and limitations.
4. Demonstrate one match prediction.
   - Use manual xG or Auto Predict From Elo and point out probabilities plus scorelines.
5. Close with quality gates.
   - Mention deterministic tests, API contracts, Playwright E2E, historical validation, and GitHub Actions CI.

Closing line:

> The project shows how I build testable product systems: clear boundaries, honest model communication, and repeatable quality checks.

## 5-Minute Technical Demo

Use this version for engineering interviews or deeper portfolio walkthroughs.

1. Introduce the problem and non-goals.
   - Predict World Cup outcomes while avoiding certainty claims or betting framing.
2. Explain architecture.
   - `packages/data` validates and normalizes fixtures.
   - `packages/model` owns Elo, Poisson, Monte Carlo, and historical validation logic.
   - `packages/api` exposes pure handlers and typed responses.
   - `apps/web` presents dashboard workflows without owning model logic.
3. Walk through the data-to-prediction flow.
   - Historical fixtures -> validation -> normalization -> Live Elo -> Elo-to-xG -> Poisson -> Monte Carlo -> prediction output.
4. Demonstrate dashboard workflows.
   - Manual match simulation.
   - Auto Predict From Elo.
   - Prediction presets.
   - Live Elo ratings or historical validation.
5. Explain validation.
   - Unit tests protect deterministic logic.
   - API contract tests protect response shape.
   - Regression snapshots catch model output drift.
   - Playwright E2E validates user workflows.
   - CI repeats core gates on pull requests and `main`.
6. Close with limitations and next work.
   - Partial dataset, foundation model, not betting advice, no public accuracy claim.
   - Future work: broader data, calibration, accessibility automation, deployment only when needed.

Closing line:

> The main engineering decision was to keep software correctness, model validation, and browser workflow validation separate but connected.

## Senior SDET Interview Walkthrough

Use this version when the interviewer wants risk analysis, automation design, and test strategy depth.

1. Start with the risk model.
   - Probabilistic outputs can drift silently.
   - Data quality affects model trust.
   - API/UI contracts can diverge.
   - Browser workflows can regress even when unit tests pass.
2. Explain the architecture response.
   - Pure functions and pure handlers make logic testable without fragile environments.
   - Typed schemas make response contracts explicit.
   - The dashboard consumes API-shaped outputs instead of reaching into data or model internals.
3. Explain automation layers.
   - Unit tests for deterministic data/model behavior.
   - Integration tests for API handler coordination.
   - API contract tests for response and error shapes.
   - Regression snapshots for critical numeric outputs.
   - Playwright E2E for user workflows.
   - GitHub Actions for repeatable PR validation.
4. Show evidence.
   - Open architecture diagrams.
   - Open CI/CD foundation documentation.
   - Show local or CI check output if available.
   - Show screenshot plan if discussing portfolio publication.
5. Discuss future quality improvements.
   - Accessibility automation.
   - CI artifacts for traces and reports.
   - Data freshness checks.
   - Calibration reports.
   - Deployment smoke tests after a deployment target exists.

Closing line:

> I designed the test strategy around risk: deterministic correctness at the package layer, contract stability at the API layer, and user confidence at the browser layer.

## Interview Talking Points

### QA Engineer

- The dashboard shows warnings and limitations, so quality includes product communication, not only pass/fail behavior.
- Playwright validates critical user workflows with accessible selectors.
- API contract tests reduce UI/API drift.
- Regression snapshots make important output changes visible.
- CI runs repeatable checks before merge.

### Senior QA

- The test strategy is risk-based and layered.
- Predictive accuracy validation is separated from software correctness validation.
- Historical replay and snapshots are domain-specific quality tools.
- Known limitations are documented instead of hidden.
- Future gates can be added gradually to avoid slow or flaky CI.

### SDET

- Pure handlers make API automation possible without a server.
- Seeded simulation makes probabilistic behavior reproducible.
- Typed contracts support stable test assertions.
- Playwright E2E covers workflows that unit tests cannot.
- GitHub Actions mirrors the core local validation path.
- The architecture is ready for future accessibility, artifact, data freshness, and smoke-test automation.

## Limitations To Mention

- The dataset is partial and curated.
- The model is a foundation model, not a production-calibrated predictor.
- Predictions are not betting advice.
- The project does not make a public predictive accuracy claim.
- Deployment is intentionally not part of this release.
