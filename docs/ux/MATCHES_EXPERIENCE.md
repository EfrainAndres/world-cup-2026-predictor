# Matches Experience

Phase: 12.19E  
Status: Complete

## Product Goal

`/matches` is the primary match center for the World Cup 2026 Predictor. It replaces the full `TodaysMatchesSection` client component that was moved from Home in 12.19D, and adds date navigation, match filters, a compact sortable match list, and per-fixture detail routes.

## Route Architecture

| Route | Purpose |
| --- | --- |
| `/matches` | Full match center — date navigation, filter bar, sorted match list |
| `/matches?date=YYYY-MM-DD` | Match list for a specific Colombia-local date |
| `/matches?filter={filter}` | Match list filtered by status or prediction availability |
| `/matches/[fixtureId]` | Full match detail — teams, score/kickoff, prediction summary, model evaluation, match context |

## Date Navigation

- Default date is today in Colombia timezone (`America/Bogota`, UTC-5).
- `?date=YYYY-MM-DD` is the authoritative URL parameter.
- Invalid or missing dates silently fall back to today.
- Prev/Next are `<Link>` components; no client state needed.
- The Today badge is highlighted when `currentDate === todayDate`.
- Date navigation preserves the active filter in the URL.

## Match Filters

Five filters: **All**, **Live**, **Upcoming**, **Finished**, **Predicted**.

- `?filter=all` (or absent) shows all matches.
- `?filter=live` shows `live` and `halftime` states.
- `?filter=upcoming` shows `upcoming` state.
- `?filter=finished` shows `final` state.
- `?filter=predicted` shows matches with `predictionHistory.snapshot.available === true`.
- Invalid filter values fall back to `all`.
- Filter counts are computed from the full unfiltered match list for the current date.
- The active filter tab has `aria-current="page"`.

## Match Ordering

Sorted by priority group, then by kickoff time within each group:

| Priority | States |
| --- | --- |
| 0 | `live`, `halftime` |
| 1 | `upcoming` |
| 2 | `final` |
| 3 | `postponed` |
| 4 | `cancelled` |
| 5 | `unknown` |

Within the same priority:
- Upcoming: sorted by kickoff ascending; matches without kickoff placed last.
- Final: sorted by kickoff descending (most recent first).
- Live/halftime: no secondary sort (order is already significant).

Matches without kickoff metadata are included via `unscheduledMatches`.

## Match Status Normalization

Central helpers in `apps/web/src/lib/matches-experience.ts`:

- `getMatchStatusPriority(state)` — numeric priority for sorting.
- `sortMatchesForDisplay(matches)` — applies priority + kickoff ordering.
- `applyMatchFilter(matches, filter)` — filter predicate.
- `parseMatchFilter(value)` — validates URL param, falls back to `"all"`.
- `parseMatchDate(value, fallback)` — validates `YYYY-MM-DD`, falls back to `fallback`.
- `buildMatchesUrl(date, filter)` — canonical `/matches?date=...&filter=...` URL builder.
- `getPrevDate(date)` / `getNextDate(date)` — date arithmetic via `shiftDailyMatchesDate`.

No provider-specific status strings appear in React components.

## Match Detail Route

`/matches/[fixtureId]` resolves a canonical fixture ID to a `WorldCup2026DailyMatchEntry` using `buildDashboardMatchEntryById` in `server-runtime.ts`.

Resolution algorithm:
1. Find canonical fixture in `WORLD_CUP_2026_GROUP_STAGE_FIXTURES` by `fixture.id === fixtureId`.
2. If not found: `notFound()`.
3. Deduplicate external records from `syncResult.fixtures + liveMatches + completedResults` by `providerFixtureId`.
4. Find external record by canonical team names using `canonicalizeTeamName`.
5. If external record has `kickoffAt`: convert to Colombia date, call `buildWorldCup2026DailyMatches({syncResult, date, timezone})`, return matching entry.
6. If external record missing or no `kickoffAt`: call `buildWorldCup2026DailyMatches({syncResult})` (no date), return from `unscheduledMatches`.
7. If still not found: return `null` → page calls `notFound()`.

The detail page shows:
- **Match header**: group/matchday context, state badge, team identities with flags, score or kickoff time.
- **Pre-match prediction**: 1X2 probability bars, projected score, expected goals, confidence, coverage type.
- **Model vs reality**: outcome correct/incorrect, exact score correct/incorrect, Brier score, log loss. Only shown when `evaluation.available === true`.
- **Group standing context**: rendered via `MatchContextDisplay`. Only shown when `matchContext !== undefined`.
- **Technical details**: fixture ID, model version, snapshot capture time, snapshot status, evaluation timestamp, probability sum, warnings. Collapsed by default via `<details>`.

## Component Summary

| File | Type | Purpose |
| --- | --- | --- |
| `apps/web/src/lib/matches-experience.ts` | Pure helpers | Status priority, sorting, filtering, URL building, date parsing |
| `apps/web/src/components/CompactMatchRow.tsx` | Server component | Single match row with `<Link>` to detail, TeamIdentity, status badge, score/kickoff, prediction dot |
| `apps/web/src/components/MatchList.tsx` | Server component | `<ol>` list of `CompactMatchRow` with `EmptyState` fallback |
| `apps/web/src/components/MatchesDateNavigation.tsx` | Server component | Prev/today/next `<Link>` nav with formatted date label |
| `apps/web/src/components/MatchFilterBar.tsx` | Server component | Filter tabs with per-filter counts, horizontal scroll |
| `apps/web/app/matches/page.tsx` | Server page | Full match center; reads `searchParams` (awaited) |
| `apps/web/app/matches/[fixtureId]/page.tsx` | Server page | Match detail; `notFound()` for invalid fixtures |
| `apps/web/src/lib/server-runtime.ts` | Server utility | Added `buildDashboardMatchEntryById` |

## Server Behavior

- All new components are server components (no `"use client"`).
- `dynamic = "force-dynamic"` and `runtime = "nodejs"` on both pages.
- A single `getDashboardLiveSyncResult()` call per render.
- No new snapshots, evaluations, migrations, or provider changes.
- No new client-side state or API routes.
- `searchParams` is awaited following Next.js 15 App Router semantics.

## Mobile Behavior

- Filter bar scrolls horizontally within its container; document never scrolls horizontally.
- `CompactMatchRow` uses `truncate` on team names to prevent overflow.
- Mobile bottom navigation remains visible (inherited from application shell padding).
- All interactive elements have `min-h-[44px]` on mobile touch targets.
- Tested at 320×568, 375×667, 390×844, 430×932.

## Accessibility

- Date navigation has `aria-label="Date navigation"` on the `<nav>`.
- Filter bar has `aria-label="Match filters"` on the `<nav>` wrapper.
- Active filter link has `aria-current="page"`.
- Prev/Next buttons have `aria-label="Previous day"` / `"Next day"`.
- Match list is an `<ol aria-label="Matches">`.
- `CompactMatchRow` has a full `aria-label` on the link: `"{home} vs {away}, {status}"`.
- `ProbabilityBar` uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- Technical details `<details>` is collapsed by default; `<summary>` is visible.
- All interactive elements use `focus-visible:ring-2 focus-visible:ring-teal-500`.

## Performance

- No client components added; First Load JS for `/matches` unchanged relative to 12.19D.
- Match center is fully server-rendered; no hydration needed for navigation or filtering.

## Non-Goals

This phase did not:

- Redesign `/groups`, `/tournament`, `/predictions`, `/model`, or `/prediction-history`.
- Add new persistence schema, snapshots, or evaluations.
- Add live push / WebSocket updates.
- Add new database migrations or provider changes.
- Replace or modify `TodaysMatchesSection` (Home still uses it for its compact 4-match summary).
