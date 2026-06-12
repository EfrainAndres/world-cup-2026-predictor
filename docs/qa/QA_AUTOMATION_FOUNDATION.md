# QA Automation Foundation

Phase 8.0 adds Playwright E2E smoke tests for the dashboard. The goal is reliable, focused coverage of the main user workflows — not exhaustive visual testing.

## Setup

Playwright is in `apps/web/devDependencies`. Run `pnpm install` from the repo root to install it.

Before running E2E tests for the first time, install the browser binaries:

```bash
pnpm --filter @world-cup-2026-predictor/web exec playwright install chromium
```

## Running Tests

From the repo root:

```bash
# Run E2E tests (starts dev server automatically if not running)
pnpm test:e2e

# Or from apps/web directly
pnpm --filter @world-cup-2026-predictor/web test:e2e

# Interactive UI mode (shows browser, trace viewer)
pnpm --filter @world-cup-2026-predictor/web test:e2e:ui
```

The Playwright config (`apps/web/playwright.config.ts`) starts `next dev` automatically on port 3001 (`PORT=3001`) before tests run. Port 3001 is used to avoid conflicts with any service already running on the default Next.js port 3000 (e.g. a local dev server or other tooling). If a server is already running on port 3001, it is reused (non-CI mode).

## Test Scope

All tests live in `apps/web/tests/e2e/match-simulation.spec.ts`.

| Test | What it verifies |
| --- | --- |
| Loads dashboard home with main heading | H1 is present and visible after page load |
| Main dashboard sections are visible | "Interactive match simulation" and "Current model and API evidence" headings |
| Match simulation form renders required inputs | Home team, away team, xG inputs, submit button present |
| Initial simulation results render on page load | Server-rendered Canada vs Mexico result is visible |
| Outcome probability cards render with percentages | Three articles each containing a `%` value |
| Most likely scorelines heading and list | Heading visible, at least one scoreline item rendered |
| Submitting manual simulation updates result heading | Teams change from Canada/Mexico to Brazil/Germany |
| Manual simulation result shows three probability cards | Cards present in the updated result section |
| Switching to Elo mode shows Elo info panel | "Expected goals generated from live Elo" text appears |
| Elo mode preset selector shows all three presets | Conservative, Balanced, Aggressive buttons all visible |
| Submitting unknown team in Elo mode shows alert | `role="alert"` element appears with validation error |

## Selectors

Tests prefer accessible selectors:
- `getByRole("heading", { level, name })` for section headings
- `getByLabel("…")` for form inputs
- `getByRole("button", { name })` for interactive controls
- `getByRole("region", { name })` for scoping to the results section
- `getByRole("article")` for outcome probability cards
- `getByRole("alert")` for validation messages

No brittle CSS class selectors are used.

## Configuration

`apps/web/playwright.config.ts`:
- Tests in `./tests/e2e`
- Chromium only (baseline coverage; more browsers can be added later)
- `fullyParallel: true`
- `reuseExistingServer` in non-CI mode (avoids port conflicts with local dev)
- `trace: "on-first-retry"` for debugging flaky failures
- CI mode: 2 retries, 1 worker, `forbidOnly`

## TypeScript

`apps/web/tsconfig.json` excludes `playwright.config.ts` and `tests/` so the Next.js typecheck does not attempt to compile Playwright files. Playwright handles its own TypeScript resolution.

## Limitations

- Chromium only in this phase. Firefox and WebKit coverage deferred.
- No visual regression / screenshot tests.
- No accessibility automation (axe, aria-audit) in this phase.
- No CI integration yet (Phase 8.0 / CI/CD phase).
- `next dev` (Turbopack) is used as the webServer. `next start` with a production build would be more stable for CI but requires a build step first.
- The tests verify rendering and basic interaction, not pixel-level design.

## Next Steps

- Add browser install step to CI (Phase 8.0).
- Add accessibility check smoke test using `@axe-core/playwright`.
- Add snapshot assertions for key sections once the UI stabilizes.
- Expand to Firefox and WebKit when baseline is stable.
