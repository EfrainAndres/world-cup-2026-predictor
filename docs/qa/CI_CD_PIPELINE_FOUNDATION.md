# CI/CD Pipeline Foundation

Phase 8.5 adds the first GitHub Actions workflow for repeatable pull request and main-branch validation.

## Workflow

The workflow lives at `.github/workflows/ci.yml`.

It runs on:

- Pull requests.
- Pushes to `main`.

The workflow has one job, `validate`, on `ubuntu-latest`. It uses Node.js 20, pnpm 9.15.4, and the pnpm cache from `actions/setup-node`.

## Checks

The CI job runs the same core validation commands used locally:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @world-cup-2026-predictor/web test:e2e
```

Before the E2E test step, CI installs Chromium and its Linux dependencies:

```bash
pnpm --filter @world-cup-2026-predictor/web exec playwright install --with-deps chromium
```

This matches the current Playwright scope: Chromium-only dashboard workflow coverage.

## Scope

This foundation intentionally includes:

- Dependency installation from the committed lockfile.
- Unit and integration tests through Turborepo.
- Type checking through Turborepo.
- Build validation through Turborepo.
- Web E2E validation through the web package Playwright suite.

This foundation intentionally excludes:

- Deployment.
- Docker.
- Cloud provider setup.
- Secrets.
- Databases or service containers.
- External API dependencies.

## Playwright Behavior

`apps/web/playwright.config.ts` starts the Next.js development server on port 3001 during E2E tests. In CI, Playwright does not reuse an existing server and runs with retries, one worker, and `forbidOnly` enabled.

## Failure Expectations

Failures should be actionable:

- Install failures usually indicate lockfile drift or package resolution problems.
- Test failures indicate a broken package, API contract, model regression, or dashboard behavior.
- Typecheck failures indicate broken TypeScript contracts.
- Build failures indicate an app or package cannot produce its build output.
- E2E failures indicate a user-facing dashboard workflow regression or a Playwright/browser setup issue.

## Future Work

Later CI/CD phases can add linting, accessibility checks, data/model validation jobs, separate job boundaries, artifacts, deployment, and release automation once those workflows are stable and needed.
