# Groups and Tournament Experience

Phase: 12.19F  
Status: Complete

## Product Goal

`/groups` and `/tournament` are complete sports-oriented destination pages that replace cluttered, undifferentiated layouts with clear information hierarchies. Neither page adds client state or new data fetching; they compose existing server-side data into coherent region-based layouts.

## Route Architecture

| Route | Purpose |
| --- | --- |
| `/groups` | Overview of all 12 groups — cards, qualification summary, best-third ranking, activity CTA |
| `/groups/[group]` | Full detail for one group — standings, matches, projection, qualification status |
| `/tournament` | Knockout bracket, round summaries, champion outlook, simulation disclosure |

---

## Groups (`/groups`)

### Region layout (6 regions)

1. **Page header** — eyebrow "World Cup 2026", title "Groups", description
2. **Tournament progress bar** — groups complete, matches played, live count, data source badge
3. **Group overview grid** — 12 `GroupOverviewCard` components (1 col / 2 col / 3 col breakpoints)
4. **Qualification overview** — winners column, runners-up column, best third-places column (top 8 advance)
5. **Best third-place table** — full sortable table when any third-place data is available; ranked Pts → GD → GF → name
6. **Activity summary** — matches played / live count + CTA link to `/matches`
7. **Technical disclosure** — collapsed `<details>` with provider, cache, sync timestamp, warnings

### GroupOverviewCard

- Shows group label as a link to `/groups/[group]`
- Shows top 3 teams with `TeamIdentity` (size="xs", useShortName)
- Position circles: teal for top 2 (qualifying positions), slate for 3rd
- Pts and GD columns, aligned tabular-nums
- "View group →" footer link
- Complete/In-progress badge

### Qualification overview semantics

| Column | Source | Notes |
| --- | --- | --- |
| Group winners | `officialGroups[i].standings[0]` | Reflects current official table position |
| Runners-up | `officialGroups[i].standings[1]` | Reflects current official table position |
| Best third places | `buildWorldCup2026BestThirdPlaceRanking` | Re-ranks all third-place teams across groups |

Qualification status caveat is shown: "X of 12 groups complete — remaining positions subject to change."

### Data source

Single `getDashboardLiveSyncResult()` call → `buildDashboardStandingsFromSync()`. No additional fetches.

---

## Group Detail (`/groups/[group]`)

### Changes from previous version

| Element | Before | After |
| --- | --- | --- |
| Breadcrumb | "← Dashboard" (href="/") | "← Groups" (href="/groups") |
| Provider metadata | Prominent section above matches | Collapsed `<details>` at page bottom |
| GroupNav | `<a>` tags, `flex-wrap` | `<Link>`, horizontal scroll, keyboard accessible |

### GroupNav

- Uses `<Link>` from `next/link` for prefetching
- Horizontal scroll container: `-mx-4 overflow-x-auto sm:mx-0`
- Inner: `flex gap-1.5 px-4 pb-1 sm:px-0`
- Touch targets: `min-h-[44px] min-w-[44px]`
- `focus-visible` ring on each link

---

## Tournament (`/tournament`)

### Region layout (7 regions)

1. **Page header + tournament status** — qualified teams, R32 fixtures, resolved fixtures, Projected badge
2. **Round navigation** (`TournamentRoundNav`) — horizontal scroll anchors: Champion, R32, R16, QF, SF, Final, 3rd
3. **Champion outlook** (`TournamentChampionOutlook`) — champion, runner-up, third-place match cards with `TeamIdentity` and disclaimer
4. **Knockout bracket** — `WorldCupKnockoutBracketSection` under `#tournament-bracket`
5. **Stage summaries** — one `<section>` per round (R32, R16, QF, SF, Final, Third Place), each with a collapsed `<details>` for match-by-match simulation data
6. **Technical/projection disclosure** — collapsed `<details>` containing `WorldCupKnockoutWinnerResolutionSection` + `TournamentSimulationSection`

### Section IDs (for round navigation anchors)

| Section | `id` attribute |
| --- | --- |
| Champion outlook | `tournament-champion-outlook` |
| Knockout bracket | `tournament-bracket` |
| Round of 32 | `tournament-round-of-32` |
| Round of 16 | `tournament-round-of-16` |
| Quarterfinals | `tournament-quarterfinals` |
| Semifinals | `tournament-semifinals` |
| Final | `tournament-final` |
| Third Place | `tournament-third-place` |

### TournamentChampionOutlook

- Takes `resolution: WorldCup2026KnockoutWinnerResolutionResponse` and `thirdPlaceMatch: WorldCup2026ThirdPlaceMatchFoundationResponse`
- Champion card: teal border, `TeamIdentity` size="md" showFifaCode, defeat description, 1X2 probability
- Runner-up card: white border, `TeamIdentity` size="md" showFifaCode
- Third-place match card: two teams with `TeamIdentity` size="xs" useShortName
- "Projected only" badge, methodology disclaimer

### TournamentRoundNav

- `aria-label="Tournament round navigation"`
- Horizontal scroll (hidden scrollbar), `-mx-4 sm:mx-0`
- 7 anchor links with `title` for full round names
- `focus-visible` ring on each anchor

### Data source

Single synchronous `getDashboardSnapshot()` call. No new fetches.

---

## New Files

| File | Type | Purpose |
| --- | --- | --- |
| `apps/web/src/lib/groups-tournament-ui.ts` | Pure helpers | Source presentation mapping, group validation, progress formatting |
| `apps/web/src/lib/groups-tournament-ui.test.ts` | Unit tests | 25 tests covering all exported helpers |
| `apps/web/src/components/GroupOverviewCard.tsx` | Server component | Compact group card for overview grid |
| `apps/web/src/components/TournamentRoundNav.tsx` | Server component | Round navigation anchors |
| `apps/web/src/components/TournamentChampionOutlook.tsx` | Server component | Champion, runner-up, third-place match |
| `apps/web/tests/e2e/groups.spec.ts` | Playwright tests | Groups and group detail E2E tests |
| `apps/web/tests/e2e/tournament.spec.ts` | Playwright tests | Tournament E2E tests |
| `docs/ux/GROUPS_AND_TOURNAMENT_EXPERIENCE.md` | Documentation | This file |

## Updated Files

| File | Change |
| --- | --- |
| `apps/web/app/groups/page.tsx` | Complete rewrite to 6-region server page |
| `apps/web/app/groups/[group]/page.tsx` | Breadcrumb to /groups, provider metadata behind disclosure |
| `apps/web/app/tournament/page.tsx` | Complete rewrite to 7-region server page |
| `apps/web/src/components/GroupNav.tsx` | Link + horizontal scroll + touch targets |

## Non-goals

- Did not change qualification rules or standings logic
- Did not change any group standings data computation
- Did not change provider, fixture, or prediction models
- Did not add client state or new `"use client"` components
- Did not modify shared layout or navigation components
- Did not modify the API package
