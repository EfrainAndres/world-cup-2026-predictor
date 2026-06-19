# Live Group Standings (Phase 12.6)

## Overview

Phase 12.6 adds a three-mode standings view to the World Cup 2026 dashboard. The standings section
displays official, live provisional, and projected group standings via a tabbed UI. Projected
standings are not yet implemented and remain null in this phase.

## Modes

### Official (default)

Calculated from completed (`finished`) matches only. Scheduled, postponed, suspended, and cancelled
fixtures are excluded. This is the default tab shown on page load.

### Live provisional

Calculated from completed matches plus current live and halftime scores. If no matches are active,
the tab is disabled with an explanatory tooltip. When enabled, a warning panel reminds the user
that scores are not yet official.

A shared deduplication set ensures that a fixture counted as `finished` in the completed records
is never also counted from the live records. The finished score takes precedence.

### Projected (disabled in Phase 12.6)

Reserved for model-projected outcomes of remaining fixtures. Always disabled in Phase 12.6 with
a tooltip: "Projected standings not yet implemented". The tab is present so the UI layout is stable
when projected standings are later introduced.

## Data flow

```
synchronizeWorldCup2026Results()   (async, called externally)
         │
         ▼
getWorldCup2026LiveGroupStandings(input?)   (synchronous)
         │
         ├─ completedResults  →  buildOfficialGroups()
         │                              │
         │                              └─ FINISHED_STATUSES only
         │
         └─ liveMatches       →  buildProvisionalGroups()
                                       │
                                       ├─ FINISHED_STATUSES (shared seenInternalIds)
                                       └─ LIVE_STATUSES     (skip already-seen fixtures)
```

In SSG mode (build time), `getWorldCup2026LiveGroupStandings()` is called with no input. It falls
back to the local static provider synchronously — no network calls, no env vars required.

## Fixture resolution

External providers return numeric provider IDs. Internal fixtures use string IDs such as
`wc2026-group-a-md1-01-mexico-vs-south-africa`. Resolution is attempted in two steps:

1. Match `record.providerFixtureId` against the internal fixture `id` (works for local static).
2. Match `record.homeTeam|record.awayTeam` against the internal fixture team names (works for
   external providers).

Records that match neither are silently ignored.

## Warnings

The following warnings are always present in the response:

- Official standings use completed matches only; scheduled fixtures are excluded.
- Tie-breaking is limited to points, goal difference, goals for, and team name.
- Live provisional standings are only available when active matches exist.
- Projected standings are not yet available.

Additional runtime warnings are appended when:

- `cacheUsed: true` — stale cache notice.
- `localFallbackUsed: true` with `externalProviderEnabled: true` — local fallback notice.
- Provisional mode is active — count of live/halftime matches included.

## UI components

- `WorldCupStandingsSection` — updated to `"use client"` with `useState` for the active mode tab.
- Three `<button role="tab">` elements rendered as mode tabs.
- Disabled tabs carry `aria-disabled="true"` and a `title` tooltip explaining the reason.
- Active tab has `aria-selected="true"`.
- Official mode: "Official standings" info panel.
- Provisional mode: amber warning panel with live match count.
- Projected mode: blue warning panel (for future use).
- Stale cache: amber banner shown when `syncMetadata.cacheUsed === true`.

## Security

- The football-data.org API token is never passed to or stored in
  `getWorldCup2026LiveGroupStandings`. The handler accepts only pre-resolved records.
- No provider token appears in any API response, warning, or log.
- `"use client"` is required for React state; no secrets are ever passed to client components.

## Testing

Unit tests are in `packages/api/tests/live-group-standings.test.ts` and cover:

- official standings use only finished records
- scheduled, postponed, and cancelled matches do not affect standings
- live match score updates provisional standings
- halftime behaves as live
- no double-counting of a finished fixture present in live records
- deduplication of duplicate providerFixtureId records in liveMatches
- local fallback produces current official standings unchanged
- projected groups are always null in Phase 12.6
- all 12 groups A–L are present
- provider metadata is exposed correctly
- stale cache and local fallback warnings are surfaced
- external record matching by team name when IDs differ
- unknown records are ignored

E2E tests in `apps/web/tests/e2e/match-simulation.spec.ts` verify:

- "Live group standings" label is visible
- Results source and external provider badges are visible
- Official tab is selected by default
- Live provisional tab is disabled when no live matches
- Projected tab is always disabled
- Group tables (A through L) remain accessible

## Files changed

| File | Purpose |
|---|---|
| `packages/api/src/schemas.ts` | Added `WorldCup2026StandingsMode`, `WorldCup2026LiveStandingsSyncMetadata`, `WorldCup2026LiveGroupStandingsResponse`; added route to `ApiRoutes` |
| `packages/api/src/live-group-standings.ts` | New handler: `getWorldCup2026LiveGroupStandings` |
| `packages/api/src/model-info.ts` | Added handler to `supportedHandlers` |
| `packages/api/src/routes.ts` | Wired up handler in `apiRoutes` |
| `packages/api/src/index.ts` | Exported handler and types |
| `packages/api/tests/live-group-standings.test.ts` | New unit tests |
| `packages/api/tests/api-contracts.test.ts` | Updated `supportedHandlers` list |
| `packages/api/tests/api-integration.test.ts` | Updated `supportedHandlers` list |
| `packages/api/tests/endpoint-validation.test.ts` | Updated `supportedHandlers` list |
| `apps/web/src/lib/api-client.ts` | Updated `DashboardSnapshot` type and `getDashboardSnapshot()` |
| `apps/web/src/components/WorldCupStandingsSection.tsx` | Rewritten with mode tabs and `"use client"` |
| `apps/web/tests/e2e/match-simulation.spec.ts` | Updated existing test; added new E2E tests |
