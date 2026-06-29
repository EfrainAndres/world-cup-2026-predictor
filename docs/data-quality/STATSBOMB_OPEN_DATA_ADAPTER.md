# StatsBomb Open Data Adapter

**Phase:** 12.20A2  
**Status:** Implemented — provider architecture complete; raw data not committed  
**Depends on:** `docs/data-quality/STATSBOMB_OPEN_DATA_COVERAGE_AUDIT.md`

---

## Overview

This document describes the deterministic, additive StatsBomb Open Data ingestion and aggregation adapter introduced in Phase 12.20A2. The adapter reads locally cached StatsBomb JSON files and produces normalized `TeamPerformanceProfile` records for all 48 World Cup 2026 teams.

**No production prediction formulas, Elo constants, Poisson behavior, snapshots, evaluations, persistence schema, standings, qualification, or tournament topology were changed.**

---

## Provider Location

```
packages/api/src/providers/statsbomb/
├── statsbomb-types.ts            — all TypeScript types
├── statsbomb-team-mapping.ts     — StatsBomb name → canonical name, supported competitions
├── statsbomb-normalization.ts    — JSON parsing and validation
├── statsbomb-event-aggregation.ts — per-match shot event aggregation
├── statsbomb-performance-profile.ts — coverage/freshness classification, profile building
├── statsbomb-open-data-provider.ts  — main TeamPerformanceDataProvider implementation
├── statsbomb-commercial-stub.ts     — stub for future commercial API adapter
└── index.ts                         — public exports
```

---

## Data Directory Structure

```
.local-data/statsbomb-open-data/     ← gitignored
├── data/
│   ├── matches/{competitionId}/{seasonId}.json
│   └── events/{matchId}.json
```

Raw StatsBomb data is never committed to the repository. See `docs/operations/STATSBOMB_OPEN_DATA_LOCAL_INGESTION.md` for setup and download instructions.

---

## Supported Competitions

| Competition | Competition ID | Season ID | Matches |
|---|---|---|---|
| FIFA World Cup 2022 | 43 | 106 | 64 |
| FIFA World Cup 2018 | 43 | 3 | 64 |
| Copa América 2024 | 223 | 282 | 32 |
| AFCON 2023 | 1267 | 107 | 52 |
| UEFA Euro 2024 | 55 | 282 | 51 |
| UEFA Euro 2020 | 55 | 43 | 51 |

---

## Aggregation Policy

### Included

- Regulation time (periods 1–2): all shot events and scores
- Extra time (periods 3–4): all shot events; minutesPlayed set to 120 if any period ≥ 3 event found
- Goals: from `home_score`/`away_score` match record fields (includes own goals)

### Excluded

- Penalty shootout (period 5): all shots excluded from xG and shot counts
- Own goals (`shot.outcome.name === "Own Goal For"`): excluded from xG and shot counts; goals already included via match score

### Extra Time Detection

`hasExtraTime = events.some(e => e.period >= 3)` — checks all event types, not just shots.

### Per-90 Rates

`xgForPer90 = (totalXgFor / minutesPlayed) × 90`. Returns `null` when:
- `minutesPlayed === 0`
- `totalXgFor === null` (no xG samples available)

---

## cutoffAt Semantics

`getTeamPerformanceProfile(teamId, cutoffAt)` filters matches using strict `match_date < cutoffAt`. A match on the exact cutoff date is **excluded**. This prevents look-ahead for pre-match predictions.

---

## Coverage Thresholds

| Classification | Condition |
|---|---|
| full | matchCount ≥ 10 AND xgSampleCount ≥ 100 AND freshness in [fresh, aging] |
| partial | matchCount ≥ 5 AND xgSampleCount ≥ 40 |
| sparse | matchCount ≥ 1 |
| fallback | matchCount = 0 |

Named constants in `statsbomb-performance-profile.ts`:
- `COVERAGE_THRESHOLDS.FULL_MIN_MATCHES = 10`
- `COVERAGE_THRESHOLDS.FULL_MIN_XG_SAMPLES = 100`
- `COVERAGE_THRESHOLDS.PARTIAL_MIN_MATCHES = 5`
- `COVERAGE_THRESHOLDS.PARTIAL_MIN_XG_SAMPLES = 40`

xgSampleCount used for classification = `xgSampleCountFor + xgSampleCountAgainst` (total across all matches).

---

## Freshness Thresholds

| Classification | Condition (days between latestMatchAt and cutoffAt) |
|---|---|
| fresh | ≤ 180 days |
| aging | 181–365 days |
| stale | > 365 days |
| unknown | latestMatchAt is null (no matches) |

Named constants:
- `FRESHNESS_THRESHOLDS_DAYS.FRESH_MAX = 180`
- `FRESHNESS_THRESHOLDS_DAYS.AGING_MAX = 365`

---

## Fallback Behavior

Teams with no eligible matches before cutoffAt receive a fallback profile:
- `matchCount: 0`, `minutesPlayed: 0`
- All per-90 rates: `null`
- `coverage: "fallback"`, `freshness: "unknown"`
- `totalXgFor: null`, `totalXgAgainst: null`

The 8 WC2026 teams with no StatsBomb open data coverage will always receive fallback profiles regardless of cutoffAt:
Bosnia-Herzegovina, Haiti, Curacao, New Zealand, Iraq, Norway, Jordan, Uzbekistan.

---

## Team Name Normalization

StatsBomb names are resolved to WC2026 canonical names via the existing `canonicalizeTeamName` function (NFD normalization + TEAM_ALIASES lookup). The four required StatsBomb→canonical mappings were already present in `TEAM_ALIASES` before Phase 12.20A2:

| StatsBomb Name | Canonical Name |
|---|---|
| Czech Republic | Czechia |
| Côte d'Ivoire | Ivory Coast |
| Cape Verde Islands | Cape Verde |
| Congo DR | DR Congo |

`resolveStatsBombTeamName(statsBombName)` returns `null` for any team name that does not resolve to a WC2026 canonical name. Such records are silently skipped during match file loading (they are non-WC2026 teams appearing in audited competitions).

---

## null Safety Guarantees

- `NaN` and `Infinity` are never returned in any profile field
- Per-90 rates return `null` instead of dividing by zero
- `totalXgFor` / `totalXgAgainst` return `null` when no xG samples exist (xgSampleCount = 0)
- `shotQualityFor` / `shotQualityAgainst` return `null` when shotCount = 0

---

## Commercial Adapter Boundary

`createStatsBombCommercialApiProvider()` in `statsbomb-commercial-stub.ts` implements the same `TeamPerformanceDataProvider` interface but always returns fallback profiles with a `no_data` issue code. It is a typed stub for future commercial API integration and is not connected to any external service.
