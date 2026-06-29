# Phase 12.19 Final UX QA Audit Inventory

Phase: 12.19H  
Branch: `feat/phase-12-19h-responsive-accessibility-final-ux-qa`  
Audit date: 2026-06-28

## Purpose

This audit records the current UX, responsive, accessibility, and test coverage state before production code changes in Phase 12.19H. The goal is to stabilize the completed Phase 12.19 migration without adding product features, changing prediction logic, or redesigning route architecture.

## Primary Routes

| Route | Page owner | Current h1 | Rendering mode | Main client boundaries |
| --- | --- | --- | --- | --- |
| `/` | `apps/web/app/page.tsx` | Home | Dynamic Node SSR | `TeamFlag`; shell navigation; generated prediction summary is server-rendered |
| `/matches` | `apps/web/app/matches/page.tsx` | Matches | Dynamic Node SSR | `TeamFlag`; route controls are server-rendered links |
| `/matches/[fixtureId]` | `apps/web/app/matches/[fixtureId]/page.tsx` | Missing route h1 | Dynamic Node SSR | `TeamFlag`; details are native |
| `/groups` | `apps/web/app/groups/page.tsx` | Groups | Dynamic Node SSR | `TeamFlag` |
| `/groups/[group]` | `apps/web/app/groups/[group]/page.tsx` | `World Cup 2026 · Group {A-L}` | Dynamic Node SSR | `TeamFlag`; `GroupNav` is server-rendered links |
| `/predictions` | `apps/web/app/predictions/page.tsx` | Predictions | Dynamic Node SSR | `MatchSimulationForm`, `SearchableTeamSelect`, `MatchSimulationResults`, `TeamFlag` |
| `/prediction-history` | `apps/web/app/prediction-history/page.tsx` | Prediction History Dashboard | Dynamic Node SSR | `TeamFlag`; filters are server-rendered form controls |
| `/tournament` | `apps/web/app/tournament/page.tsx` | Tournament | Dynamic Node SSR | `TeamFlag`; bracket is server-rendered |
| `/model` | `apps/web/app/model/page.tsx` | Model and Evidence Center | Dynamic Node SSR | none beyond shell/flags |

## Landmark Counts

`AppShell` owns the only page-level landmarks:

| Landmark | Owner | Expected count per route |
| --- | --- | --- |
| Header/banner | `AppHeader` | 1 |
| Main | `AppShell <main id="main-content">` | 1 |
| Desktop primary navigation | `PrimaryNavigation` | 1 on desktop, visually hidden on mobile |
| Mobile navigation | `MobileBottomNavigation` | 1 on mobile, visually hidden on desktop |

Baseline check: `navigation.spec.ts --workers=1` passed with 41 tests before production edits.

## Existing Responsive Coverage

| Area | Current coverage |
| --- | --- |
| Shell/navigation | 320, 375, 390, 430 mobile widths and desktop checks in `navigation.spec.ts` |
| Home | 320, 375, 390, 430, 768, 1440 in `home-dashboard.spec.ts` |
| Matches | 320, 375, 390, 430 in `matches.spec.ts` |
| Groups | 320, 375, 390, 430 in `groups.spec.ts`; additional group detail mobile checks in `group-detail.spec.ts` |
| Tournament | 320, 375, 390, 430, 768, 1440 in `tournament.spec.ts` |
| Model | 320, 375, 390, 430 in `model.spec.ts` |
| Predictions | Covered through interaction regression in `match-simulation.spec.ts`; no route-wide viewport matrix |
| Prediction history | 390 mobile smoke in `prediction-history.spec.ts` |

Phase 12.19H needs one route-by-viewport matrix covering 320, 360, 375, 390, 430, 768, 820, 1280, 1440, and 1920 widths.

## Existing Accessibility Coverage

| Area | Current coverage |
| --- | --- |
| Skip link | `navigation.spec.ts` verifies first keyboard target and focus transfer |
| Header/main counts | `navigation.spec.ts` covers selected routes |
| Active route state | `navigation.spec.ts`, `matches.spec.ts`, `groups.spec.ts`, `tournament.spec.ts`, `model.spec.ts` |
| Mobile More popover | `navigation.spec.ts` verifies open and Escape close |
| Section labeling | `model.spec.ts` checks the seven model sections |
| Technical disclosures | Home, matches, groups, tournament, and model specs check collapsed/details behavior |
| Flags | Unit and E2E tests cover flag rendering and fallback behavior |

`@axe-core/playwright` is not installed, so Phase 12.19H should use semantic Playwright accessibility smoke checks with existing dependencies.

## Existing Browser Coverage

`apps/web/playwright.config.ts` currently defines a Chromium project only. Phase 12.19H must keep full Chromium regression and add focused Firefox/WebKit smoke runs through Playwright CLI browser selection or scoped projects.

## Known Local-Scroll Regions

Approved local scrolling is already used in:

- `MatchFilterBar` filter tabs;
- `GroupNav` A-L links;
- `TournamentRoundNav`;
- group standings tables;
- best-third-place table;
- prediction history desktop table;
- model configuration/evidence tables inside disclosures;
- legacy standings tab list where still used off primary Home.

These regions must not increase `document.documentElement.scrollWidth`.

## Known Deferred UX Issues

| Issue | Scope | Risk | Smallest safe correction |
| --- | --- | --- | --- |
| Match detail route has no h1 | `/matches/[fixtureId]` | Landmark/heading failure | Add one visible h1 using the matchup name inside the match header |
| Model CTA points to `/match`, which is not a primary route | `/model` | Broken navigation | Change "Run a prediction" href to `/predictions` and update the model E2E expectation |
| Prediction History adds a nested page-level `<main>` and h1 still says "Prediction History Dashboard" | `/prediction-history` | Landmark duplication and copy mismatch with approved route title | Convert nested `<main>` to a plain container, rename visible h1 to "Prediction History", and update E2E expectations |
| Tied knockout projections only show the modal score and advancing team | `/tournament` | Users cannot tell why a tied regulation projection advances one team | Add compact text from existing advancement metadata: projected after regulation, projected to advance, advancement method |
| Final route × viewport semantic matrix does not exist | E2E | Incomplete final QA coverage | Add `final-ux-qa.spec.ts` helpers for overflow, landmarks, duplicate IDs, controls, regions, and mobile nav clearance |
| Firefox/WebKit smoke coverage is not configured in tests | E2E | Cross-browser gaps | Add focused smoke tests runnable with `--browser=firefox` and `--browser=webkit` |

## Existing Test Failures Or Flakes

Baseline command run before production edits:

```bash
pnpm --filter @world-cup-2026-predictor/web exec playwright test tests/e2e/navigation.spec.ts --workers=1
```

Result: `41 passed`.

No current baseline failure was reproduced on the H branch. The prior G1 navigation failures appear to have been a transient local server/test-state issue and are not present after starting from the merged H branch.

## Post-Audit Resolution Notes

The pre-change findings above were addressed during Phase 12.19H:

- `/matches/[fixtureId]` now has a visible matchup h1.
- `/prediction-history` now uses `Prediction History` as the h1 and no longer nests a page-level `main`.
- `/model` now links its prediction CTA to `/predictions`.
- `/tournament` now explains tied projected regulation scores with the projected advancing team and advancement method.
- `GroupNav` now exposes `World Cup 2026 group navigation` and keeps active links marked with `aria-current="page"`.
- Obsolete Home-owned historical validation E2E coverage was removed because Phase 12.19D moved Home to the compact 8-section architecture and no Phase 12.19 primary route owns that old full section.

## Implementation Boundary

Phase 12.19H should limit production edits to:

1. route copy/CTA fixes that affect accessibility or reachability;
2. tied knockout projection presentation using existing metadata only;
3. shared CSS/accessibility hardening only when a reproduced defect requires it.

The phase must not modify prediction formulas, Elo/xG, standings, official fixtures, topology, provider normalization, persistence schemas, snapshots, or evaluations.
