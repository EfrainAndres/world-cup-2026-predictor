# Phase 12.19 Responsive Matrix

Phase: 12.19H  
Status: Local validation complete; Preview inspection pending

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home dashboard |
| `/matches` | Match center |
| `/matches/wc2026-group-a-md1-01-mexico-vs-south-africa` | Match detail representative |
| `/groups` | Groups overview |
| `/groups/A` | Group detail representative |
| `/predictions` | Prediction tool |
| `/prediction-history` | Prediction history |
| `/tournament` | Official knockout bracket |
| `/model` | Model and Evidence Center |

## Viewports

| Category | Sizes |
| --- | --- |
| Mobile | 320x568, 360x640, 375x667, 390x844, 430x932 |
| Tablet | 768x1024, 820x1180 |
| Desktop | 1280x800, 1440x900, 1920x1080 |

## Automated Result

`apps/web/tests/e2e/final-ux-qa.spec.ts` runs every route across every viewport in Chromium.

Validated result: `104 passed, 7 skipped` for the standalone Final UX QA Chromium matrix, and `353 passed, 7 skipped` for the full Chromium Web E2E regression after obsolete Home historical-validation coverage was removed.

| Route | Mobile | Tablet | Desktop | Notes |
| --- | --- | --- | --- | --- |
| `/` | Pass | Pass | Pass | Home remains 8 sections; bottom nav clearance verified. |
| `/matches` | Pass | Pass | Pass | Filter bar uses local scroll only. |
| `/matches/[fixtureId]` | Pass | Pass | Pass | Matchup h1 added; technical values wrap. |
| `/groups` | Pass | Pass | Pass | Group cards stack; best-third table uses local scroll. |
| `/groups/A` | Pass | Pass | Pass | GroupNav and standings tables use local scroll. |
| `/predictions` | Pass | Pass | Pass | Form fields stack and controls remain reachable. |
| `/prediction-history` | Pass | Pass | Pass | Filters stack; nested main removed. |
| `/tournament` | Pass | Pass | Pass | Bracket cards wrap; round nav uses local scroll. |
| `/model` | Pass | Pass | Pass | Tables and model strings wrap inside containers. |

## Accepted Local-Scroll Exceptions

- Match filter bar.
- GroupNav A-L links.
- Tournament round navigation.
- Standings tables.
- Best third-place ranking table.
- Prediction history desktop table.
- Model configuration and evidence disclosure tables.

All accepted local-scroll regions are constrained inside their containers and do not increase document-level `scrollWidth`.
