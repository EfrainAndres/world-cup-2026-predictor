# Group Detail Pages UI

Phase 12.13B adds dedicated group-detail pages for each of the 12 World Cup 2026 groups.

## Route Structure

```
/groups/A
/groups/B
...
/groups/L
```

Dynamic App Router route: `apps/web/app/groups/[group]/page.tsx`

- `generateStaticParams` pre-generates routes for Groups A–L.
- Invalid group identifiers (anything outside A–L) call `notFound()`, returning a 404.
- URL values are normalized to uppercase before validation, so `/groups/a` resolves to Group A.

## Group Navigation

Component: `apps/web/src/components/GroupNav.tsx`

- Renders A–L as links to `/groups/<group>`.
- The current group is highlighted with a filled teal background and `aria-current="page"`.
- Uses `flex-wrap` for mobile-friendly wrapping with no horizontal scroll required.
- No new dependencies — plain anchor elements with Tailwind styling.

## Data Source

Server-side data call: `getDashboardGroupDetail({ group, timezone })` from `api-client.ts`, which delegates to `getWorldCup2026GroupDetail()` from `@world-cup-2026-predictor/api`.

- Timezone: `UTC` (matches `DAILY_MATCHES_DISPLAY_TIMEZONE`).
- No provider secrets or internal environment variables are exposed to the client.
- Data is fetched server-side in the Next.js App Router server component.

API route at `apps/web/app/api/world-cup-2026/groups/[group]/route.ts` also provides the data over HTTP for direct consumption or testing.

## Standings Sections

Component: `apps/web/src/components/GroupDetailStandingsTable.tsx`

- Accepts `standings: readonly WorldCup2026GroupStandingEntry[]` and a `label` string.
- Renders Team, Pts, P, W, D, L, GF, GA, GD columns.
- Official standings are always shown.
- Live provisional standings are shown in a separate labeled section only when `standings.liveAvailable === true`.
- Provisional standings include a note: "Current live scores are included. This view does not replace official qualification status."

## Match Sections

Component: `apps/web/src/components/GroupDetailMatchCard.tsx`

Six categories are rendered:
- **Live** — shown first when present; not rendered if empty.
- **Completed** — always shown with empty state message when none.
- **Upcoming** — always shown with empty state message when none.
- **Postponed** — only rendered when count > 0.
- **Cancelled** — only rendered when count > 0.
- **Unscheduled** — shown with a count note when fixtures have no kickoff metadata.

Each card shows: teams, matchday, state badge, kickoff (or "Kickoff unavailable"), score when valid, and compact prediction history summary.

## Qualification Summary

Component: `apps/web/src/components/GroupDetailQualificationSummary.tsx`

Shows current 1st, 2nd, and 3rd place from official standings. When available, also shows whether the 3rd-place team currently qualifies as a best third-place team.

Status badge wording:
- `official` → "Official"
- `provisional` → "Provisional (live scores included)"
- `foundation_only` → "Foundation only"

When `foundation_only`, an explanatory note is shown.

No qualification probabilities or projected standings are shown in this phase.

## Prediction-History Boundary

The prediction history summary reuses the compact read-only format from Phase 12.12C:
- Pre-match projected score, xG, 1X2 probabilities, confidence.
- Evaluation metrics (outcome, exact score, Brier) for completed matches when available.

The component does **not**:
- Create snapshots.
- Create evaluations.
- Regenerate predictions.
- Mutate any store.

## Provider Metadata

Component: `apps/web/src/components/GroupDetailProviderMetadata.tsx`

Displays: active provider, cache used, local fallback status, stale status, last successful sync.

- Uses amber styling when `localFallbackUsed` or `stale` is true.
- Explicit note when local fallback is active: "Local static fallback is active. This data does not reflect live provider results."

## Empty States

| Situation | Behavior |
| --- | --- |
| No completed matches | "No completed matches yet." message under section heading |
| No live matches | Live section omitted entirely |
| No upcoming matches | "No upcoming scheduled fixtures." message |
| No postponed/cancelled | Sections omitted entirely |
| Unscheduled fixtures | Count note with compact cards |
| Qualification undetermined | "Undetermined" in place of team name |
| Provider fallback active | Amber warning in provider metadata block |
| Stale cache | Amber warning in provider metadata block |

Empty sections with no useful label context are omitted rather than rendered blank.

## Dashboard Integration

`apps/web/src/components/WorldCupGroupCard.tsx` adds a "View group details →" link to each group card in the dashboard `WorldCupGroupsSection`. The link uses the stable URL `/groups/<group>`. No existing dashboard anchors or section ordering were altered.

## Limitations

- No qualification probabilities in this phase.
- No projected standings.
- No prediction recalculation.
- No snapshot or evaluation creation.
- No polling or live refresh.
- Local static fallback reflects the current static fixture/result foundation, not live data.
- Timezone display is UTC only; no per-user timezone selection.

## Next Phase

Phase 12.13C will build on this group-detail foundation. Possible scope: enhanced qualification tracking, live polling, multi-group comparison, or deeper prediction context.
