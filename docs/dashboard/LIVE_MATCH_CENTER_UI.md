# Live Match Center UI

Phase 12.12B adds the first dashboard section over the daily matches foundation from Phase 12.12A.

## Purpose

The section gives the dashboard a compact daily match view without moving date filtering, timezone handling, or status classification into React.

## Data Source

- Initial render uses `getWorldCup2026DailyMatches()` on the server.
- Date navigation calls the local web route that proxies to the existing API runtime.
- The UI only renders normalized internal contracts.

## Displayed Content

The section shows:

- selected date
- explicit timezone
- source badge
- last successful sync
- daily match cards
- empty state
- unscheduled-fixtures warning

Each match card can show:

- kickoff time
- group and matchday
- home and away teams
- normalized state label
- live or final score when available
- saved snapshot indicator
- snapshot model version and capture time when available

## Status Display

The UI maps normalized states to plain labels:

- Upcoming
- Live
- Halftime
- Final
- Postponed
- Cancelled
- Unknown

Live and Halftime are visually stronger than inactive states, but the section still exposes stale-cache and local-fallback warnings so the screen does not imply guaranteed freshness.

## Date Navigation

The section uses three controls only:

- Previous day
- Today
- Next day

The UI keeps one explicit timezone and sends both `date` and `timezone` back to the handler for every navigation request.

## Timezone

The public dashboard now uses `America/Bogota` as the explicit display timezone and labels it as:

`Colombia time (America/Bogota, UTC-5)`

The dashboard does not silently switch to the browser timezone or the Vercel server region timezone. Explicit API requests for `UTC` remain supported.

## Provider Metadata

The section distinguishes:

- live provider data
- cached provider data
- local static fallback

It also surfaces `lastSuccessfulSync` when available.

## Empty and Unscheduled States

When no dated matches are available for the selected day, the section shows:

`No scheduled matches are available for this date.`

When fixtures exist but have no kickoff metadata, the section shows an informational warning with the `unscheduledMatches` count and keeps those fixtures out of the dated match list.

## Snapshot Indicator

If a fixture already has a stored pre-match snapshot, the card shows:

- `Pre-match prediction saved`
- optional model version
- optional capture time

The UI does not create snapshots.

## Limitations

- no polling or automatic refresh timer
- no browser-side timezone detection
- no snapshot creation
- no Model vs Reality evaluation
- local static fallback often has no kickoff metadata yet, so unscheduled warnings are expected in local mode

## Next Phase

Phase 12.12C can build on this section with deeper prediction integration, richer live-match context, and tighter connection to saved prediction history.
