# Match Context Read Model

## Purpose

Phase 12.18B3 adds a pure, read-only match-context layer that enriches each World Cup 2026 group-stage fixture with provenance-rich context derived from the real standings pipeline.

The context is **display-only and server-side only**. It never feeds into prediction formulas, Elo ratings, or xG calculations.

## What the Read Model Provides

For each canonical group-stage fixture, `buildWorldCup2026MatchContext` returns:

| Field | Description |
| --- | --- |
| `fixtureId` | Canonical internal fixture ID. |
| `providerFixtureId` | External provider's ID if a matching record was found. |
| `group` | Canonical group letter (`A`–`L`). |
| `matchday` | Group-stage matchday (1, 2, or 3). |
| `homeTeam` / `awayTeam` | Canonical team names. |
| `kickoffAt` | ISO 8601 kickoff time from provider records if available. |
| `standingsContext` | Pre-match standings for both teams in this fixture's group. |
| `tournamentForm` | Optional form summary for both teams if a pre-computed form result is passed in. |
| `qualificationState` | Current qualification picture for the fixture's group. |
| `fixtureImportance` | Heuristic importance level (`low` / `medium` / `high` / `unknown`) with reasons. |
| `providerFreshness` | Active provider, cache/fallback status, and stale flag. |
| `fallbackState` | Whether external provider is enabled, local fallback is active, and any warnings. |

## Standings Context

`standingsContext.mode` is either `"official"` (only completed matches) or `"live_provisional"` (completed plus current live/halftime scores).

`groupPosition` is `null` when a team has not yet played any group-stage matches. Once at least one match is completed, positions are assigned based on the standard sort: points → goal difference → goals for → team name.

`groupComplete` is `true` when all 6 group-stage fixtures have been played and scored.

## Qualification State

| `status` | Meaning |
| --- | --- |
| `foundation_only` | No group-stage matches completed. No qualification picture yet. |
| `provisional` | Some matches completed. Current leaders in `firstPlace` / `secondPlace` / `thirdPlace`, but rankings can still change. |
| `official` | All 6 group-stage matches completed. Qualified teams are confirmed. |

`thirdPlaceCurrentlyQualifying` is not set in the current implementation. Best third-place determination is a cross-group concern handled separately.

## Fixture Importance

The importance heuristic is matchday-based and a **placeholder** until Model-vs-Reality evidence supports a more sophisticated signal:

| Matchday | Default level |
| --- | --- |
| 1 | `low` |
| 2 | `medium` |
| 3 | `high` (reduced to `low` if the group is already complete) |

The `reasons` array describes why the level was assigned. This field is read-only context and **must not** be used as a prediction model input.

## No-Look-Ahead Rules

When `cutoffAt` is provided, the context respects the prediction cutoff:

- Only completed fixture records with `updatedAt` or `kickoffAt` before or at the cutoff are used for standings.
- Records timestamped after the cutoff are excluded with a `future_record_excluded` issue in the underlying standings pipeline.
- Live/halftime scores are excluded from cutoff-based contexts.

This ensures pre-match snapshots are not contaminated by results that were not yet available at the time the snapshot was captured.

## Provider Freshness

`providerFreshness.stale` is `true` when:
- `cacheUsed: true` — standings were served from the in-memory cache rather than a fresh external response.
- `localFallbackUsed: true` — the external provider was unavailable and local static data was used.

The match context read model never changes provider state, triggers refreshes, or mutates any provider or cache.

## Fallback Behavior

| Condition | Behavior |
| --- | --- |
| No `completedResults` provided | Uses `getWorldCup2026LiveGroupStandings()` with local static data. |
| Empty `completedResults` | Standings show all zeros for the group; positions are null. |
| Live matches provided | Provisional standings are computed and mode is `live_provisional`. |
| Provider records found for fixture | `providerFixtureId` and `kickoffAt` are populated. |
| No provider records match | `providerFixtureId` and `kickoffAt` are omitted. |
| Unknown fixture ID | Returns `{ status: "error", code: "fixture_not_found" }`. |

## What This Does Not Change

- No prediction formula, Elo rating, xG constant, or preset was changed.
- No snapshot identity, content hash, or evaluation metric was changed.
- No provider, migration, or persistence adapter was changed.
- No UI was changed.
- No production standings calculation was changed.

## Related Phases

- **12.18B1** — Real standings source audit that established the architecture this phase follows.
- **12.18B2** — Normalization guardrails for provider standings used by the underlying pipeline.
- **12.18B4** — UI and snapshot provenance presentation (next phase, gated on this one).
