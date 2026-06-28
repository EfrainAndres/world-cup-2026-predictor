# Phase 12.19 Accessibility Checklist

Phase: 12.19H  
Status: Local validation complete; Preview inspection pending

## Automated Semantic Checks

`@axe-core/playwright` is not installed in the project, so Phase 12.19H uses existing Playwright dependencies for semantic smoke checks.

| Check | Result |
| --- | --- |
| Exactly one header/banner per primary route | Pass |
| Exactly one main landmark per primary route | Pass |
| Exactly one h1 per primary route | Pass |
| No duplicate IDs | Pass |
| `aria-labelledby` references existing unique IDs | Pass |
| Links/buttons/menu items have accessible names | Pass |
| Form controls have labels | Pass |
| Images have `alt` attributes | Pass |
| No nested interactive controls | Pass |
| Skip link is first keyboard target and focuses `#main-content` | Pass |
| Mobile More popover opens and closes with Escape | Pass |
| Technical disclosures are keyboard-native details/summary controls | Pass |

## Manual/Code Review Checklist

| Area | Finding |
| --- | --- |
| Landmarks | AppShell owns the single header and main. Prediction History nested main was removed. |
| Headings | Match detail now has a visible matchup h1. Prediction History h1 now uses approved route copy. |
| Keyboard | Navigation, links, form controls, disclosures, and popover controls are native focusable elements. |
| Focus | Existing focus-visible rings are preserved across shell, nav, CTAs, forms, and disclosures. |
| Touch targets | Mobile nav, GroupNav, tournament round links, CTAs, date/filter controls, and form actions remain practical at 320px. |
| Statuses | Official/projected/live/error/confidence states include visible text and do not rely only on color. |
| Images | `TeamFlag` keeps decorative flags empty-alt when adjacent text identifies the team and falls back to FIFA code on image failure. |
| Forms | Prediction form and prediction-history filters expose labels; validation messages wrap. |
| Disclosures | Native `<details>/<summary>` behavior is preserved; no custom focus trap was introduced. |

## Defects Fixed

| Defect | Fix |
| --- | --- |
| `/matches/[fixtureId]` had no h1 | Added one visible matchup h1. |
| `/prediction-history` created a nested main and used stale h1 copy | Converted nested main to a plain container and changed h1 to `Prediction History`. |
| `/model` related CTA pointed to `/match` | Updated href to `/predictions`. |
| `/tournament` tied projected advancement was unclear | Added projected regulation score, projected advancing team, and advancement method text from existing metadata. |
| Group detail local navigation lacked the expected descriptive E2E contract | Updated the GroupNav accessible name to `World Cup 2026 group navigation`; active links continue to expose `aria-current="page"`. |

## Accepted Exceptions

- Decorative flags render with empty alt text when the adjacent team name already provides identity.
- Dense tables and nav strips use local horizontal scrolling where approved by the Phase 12.19H scope.
- No axe dependency was added; semantic Playwright checks are the accepted smoke coverage for this phase.
