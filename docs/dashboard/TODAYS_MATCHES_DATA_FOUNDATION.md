# Today’s Matches Data Foundation

## Overview

Phase 12.12A adds a server-side World Cup 2026 daily-matches foundation with no dashboard UI yet.

The handler groups normalized synchronized fixtures by localized calendar date and returns:

- ordered daily matches
- explicit unscheduled matches with missing kickoff metadata
- normalized match states
- provider and fallback metadata
- optional read-only snapshot association

## Handler

`getWorldCup2026DailyMatches(input?)`

Input:

```ts
{
  date?: string;      // YYYY-MM-DD
  timezone?: string;  // IANA timezone
}
```

Rules:

- `date` must use `YYYY-MM-DD`
- `timezone` must be a valid IANA timezone
- default timezone is `UTC`
- when `date` is omitted, the handler derives the requested day from `generatedAt` in the chosen timezone
- the machine’s implicit local timezone is never used

## Data Source

The handler consumes normalized internal synchronization output from Phase 12.5.

It does not call football-data.org directly.

Fallback chain remains:

1. external provider
2. cached response
3. local static provider

In default local mode, the handler stays deterministic.

## State Mapping

State mapping uses normalized provider status as the source of truth:

- `scheduled` → `upcoming`
- `live` → `live`
- `halftime` → `halftime`
- `finished` → `final`
- `postponed` → `postponed`
- `cancelled` → `cancelled`
- `unknown` → `unknown`

The handler does not infer live state from kickoff time alone.

Finished matches require valid non-negative integer scores. Invalid finished records are skipped and returned as typed issues.

## Daily Filtering

Filtering is based on kickoff date in the requested timezone using `Intl.DateTimeFormat`.

Rules:

- include fixtures whose localized calendar date matches the requested date
- preserve official home/away order
- sort by kickoff time
- use deterministic `fixtureId` as the final tie-break
- do not invent kickoff timestamps

Fixtures without kickoff metadata are excluded from the dated list and returned separately as `unscheduledMatches`.

## Provider Metadata

The response exposes:

- configured provider mode
- active provider
- whether an external request was attempted
- whether cache was used
- whether local fallback was used
- last successful sync
- stale flag

This allows future UI work to distinguish:

- live provider data
- cached data
- local static fallback

## Snapshot Association

Each fixture can expose an optional read-only snapshot summary:

- `available`
- `snapshotId`
- `capturedAt`
- `modelVersion`

Selection is deterministic:

1. latest valid pre-kickoff snapshot
2. highest `capturedAt`
3. highest `snapshotId`

The handler never creates snapshots automatically.

## Missing Kickoff Metadata

Local static WC2026 fixture structure still has deferred kickoff timestamps in this phase.

That means:

- local fallback mode often returns `matches: []` for a requested day
- those fixtures appear under `unscheduledMatches`
- `counts.unavailableKickoff` surfaces the gap explicitly

## No UI in This Phase

This phase adds data contracts and runtime exposure only.

It does not add:

- Today’s Matches UI
- Live Match Center UI
- automatic prediction creation
- result evaluation

## Next Phase

Phase 12.12B can build the first Today’s Matches / Live Match Center UI on top of this foundation.
