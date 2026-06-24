# Match Context UI and Snapshot Provenance

## Purpose

Phase 12.18B4 surfaces the read-only World Cup 2026 match context (introduced in 12.18B3) across four views: the daily match center, group-detail pages, the prediction result component, and the prediction-history dashboard.

Match context is **display-only and never a model input**. It is built server-side at response time from the current sync result and existing standings pipeline — no prediction formulas, Elo ratings, or snapshot identities were changed.

## Where Match Context Appears

### Daily Match Center (`DailyMatchCard`)

Each match card optionally shows a "Match context" section when `matchContext` is present on the `WorldCup2026DailyMatchEntry`.

Displays:
- Home and away team group position, points, played, and goal difference
- Fixture importance badge (`low` / `medium` / `high`)
- Standings mode badge: `Official` or `Live (provisional)`
- Freshness badge: `Fresh` or `Stale` (stale when `cacheUsed` or `localFallbackUsed` is true)
- Fallback warnings as an alert when present
- Expandable provenance section (provider, cache/fallback flags, last sync, group complete, no-look-ahead confirmation)
- Label: "Not used as a model input"

### Group Detail (`GroupDetailMatchCard`)

The same `MatchContextDisplay` component is rendered per fixture when `matchContext` is available on `WorldCup2026GroupDetailMatch`.

### Prediction Result (`MatchSimulationResults`)

A "Match context — not used as a model input" section is shown after the tournament form adjustment section. When `matchContext` is passed as a prop, `MatchContextDisplay` renders the context. When absent, the section shows "Match context is not available for this prediction."

### Prediction History (`PredictionHistoryDashboard`)

Each history record (desktop table and mobile card) includes a "Match context" row showing:
> Historical match context was not captured for this snapshot.

Pre-match context was not stored in snapshots during capture. Historical reconstruction from current standings is intentionally refused to prevent misleading provenance.

## API Composition

`matchContext` is composed server-side into `WorldCup2026DailyMatchEntry` and `WorldCup2026GroupDetailMatch` using `buildWorldCup2026MatchContext()` from the match-context read model (12.18B3).

The composition calls are:
1. `buildWorldCup2026DailyMatches` — for each fixture entry after `buildDailyMatchEntry`
2. `buildWorldCup2026GroupDetail` — for each group fixture entry before `toGroupDetailMatch`

When the fixture ID cannot be resolved to a canonical group-stage fixture (e.g., provider-only records not in the canonical list), the context result is `{ status: "error" }` and `matchContext` is omitted from the entry. Existing fields are never affected.

## Provenance Presentation

The expandable provenance section in `MatchContextDisplay` exposes:

| Field | Description |
| --- | --- |
| Provider | Active standings provider ID |
| Cache used | Whether standings were served from the in-memory cache |
| Local fallback | Whether the external provider was unavailable |
| Last sync | Most recent successful external sync timestamp (if available) |
| Group complete | Whether all 6 group-stage fixtures are completed |
| No-look-ahead | Static confirmation that context was built from completed results only |

Sensitive data (API tokens, database URLs, raw provider responses, error stacks) is never exposed.

## Visual Language

| Badge | Color | Meaning |
| --- | --- | --- |
| Low importance | Slate | MD1 opener or group already complete |
| Medium importance | Amber | MD2 shapes standings |
| High importance | Rose | MD3 decisive for qualification |
| Official | Teal | Standings from completed matches only |
| Live (provisional) | Blue | Includes live/halftime scores |
| Fresh | Teal | Provider data is current |
| Stale | Amber | Cache or local fallback is active |

## Compatibility Constraints

- No prediction formula, Elo rating, or xG constant was changed.
- No snapshot identity, content hash, or evaluation metric was changed.
- No provider selection, migration, or persistence adapter was changed.
- Match context is never passed into `predictMatchFromLiveElo()` or any model input.
- `WorldCup2026DailyMatchEntry.matchContext` is optional: callers that do not compose context (e.g., tests using `buildDailyMatchEntry` directly) are unaffected.

## Related Phases

- **12.18B3** — Match context read model (`buildWorldCup2026MatchContext`), types, and unit tests.
- **12.18B2** — Normalization guardrails for provider standings.
- **12.18B1** — Real standings source audit.
