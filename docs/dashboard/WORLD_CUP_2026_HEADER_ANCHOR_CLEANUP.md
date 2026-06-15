# World Cup 2026 Header Anchor Cleanup

Phase 11.6 fixes three pre-existing `AppHeader` anchor links that pointed to section ids not present in the rendered page. No new prediction logic, API handlers, or visible UI changes.

## Problem

Three `AppHeader` navigation items linked to ids that did not exist in `apps/web/app/page.tsx`:

| Nav label | Href | Problem |
| --- | --- | --- |
| Match Preview | `#match-preview` | No `id="match-preview"` on any always-rendered element |
| Replay Audit | `#replay-audit` | Appeared to be missing but was already inside `HistoricalReplayAuditPreviewCard` |
| Historical | `#historical` | `HistoricalValidationSection` uses `id="historical-validation"` internally |

### Investigation findings

- **`#match-preview`**: `MatchSimulationPreviewCard.tsx` has `id="match-preview"` at line 17, but the component has **zero consumers** — it is not imported anywhere in the codebase. Its id was never rendered. The outer `<section>` wrapping the match simulation form in `page.tsx` had no id.
- **`#replay-audit`**: `HistoricalReplayAuditPreviewCard.tsx` already renders `id="replay-audit"` on its own internal `<section>` element. No change needed — just confirmed functional.
- **`#historical`**: `HistoricalValidationSection.tsx` uses `id="historical-validation"` on its internal `<section>`, not `id="historical"`. The `page.tsx` wrapper had no id.

## Fix

| Element | Change |
| --- | --- |
| `<section aria-labelledby="match-section-title">` in `page.tsx` | Added `id="match-preview"` |
| `<HistoricalValidationSection>` in `page.tsx` | Wrapped in `<div id="historical">` |
| `HistoricalReplayAuditPreviewCard` | No change — already has `id="replay-audit"` |
| `MatchSimulationPreviewCard` | Not modified — orphaned component, out of scope |

## All AppHeader Anchor Targets (verified)

After Phase 11.6, every nav link in `AppHeader` resolves to an existing element:

| Nav label | Href | Source |
| --- | --- | --- |
| Home | `#overview` | `<main id="overview">` in `page.tsx` |
| Tournament | `#world-cup-tournament-overview` | `TournamentProjectionOverviewSection` |
| Champion | `#world-cup-champion-projection-summary` | `WorldCupChampionProjectionSummarySection` |
| Final | `#world-cup-final-match-simulation` | `WorldCupFinalMatchSimulationSection` |
| Semifinals | `#world-cup-semifinal-match-simulation` | `WorldCupSemifinalMatchSimulationSection` |
| Quarterfinals | `#world-cup-quarterfinal-match-simulation` | `WorldCupQuarterfinalMatchSimulationSection` |
| Round of 16 | `#world-cup-round-of-16-match-simulation` | `WorldCupRoundOf16MatchSimulationSection` |
| Round of 32 | `#world-cup-knockout-simulation` | `WorldCupKnockoutSimulationSection` |
| Third Place | `#world-cup-third-place-match-simulation` | `WorldCupThirdPlaceMatchSimulationSection` |
| Match Preview | `#match-preview` | `<section id="match-preview">` in `page.tsx` (**added Phase 11.6**) |
| Replay Audit | `#replay-audit` | `HistoricalReplayAuditPreviewCard` internal section (pre-existing) |
| Historical | `#historical` | `<div id="historical">` wrapper in `page.tsx` (**added Phase 11.6**) |

## E2E Coverage

Phase 11.6 adds two new E2E tests (tests #44 and #45):

| # | Test | What it verifies |
| --- | --- | --- |
| 44 | AppHeader anchor links have matching section targets in the page | All 12 `href` targets are attached to the DOM (`#match-preview`, `#replay-audit`, `#historical`, and all nine knockout-round ids) |
| 45 | Clicking Match Preview AppHeader link navigates to the match simulation section | Clicking the "Match Preview" nav link updates the URL hash to `#match-preview` |

## Files Changed

| File | Change |
| --- | --- |
| `apps/web/app/page.tsx` | Added `id="match-preview"` to match simulation section; added `<div id="historical">` wrapper |
| `apps/web/tests/e2e/match-simulation.spec.ts` | Added tests #44 and #45 |
| `docs/dashboard/WORLD_CUP_2026_HEADER_ANCHOR_CLEANUP.md` | This file |
| `docs/ROADMAP.md` | Phase 11.6 row |
| `docs/qa/E2E_MATCH_PREDICTION_COVERAGE.md` | Count 43 → 45, tests #44 and #45 added |
| `CHANGELOG.md` | Phase 11.6 entry under `### Fixed` |
| `apps/web/README.md` | Updated anchor nav description |

## Orphaned Component Note

`MatchSimulationPreviewCard.tsx` exists with `id="match-preview"` but has no consumers. It is left in place but out of scope for Phase 11.6. Its removal or repurposing is a future cleanup task.
