# StatsBomb Performance Data Integration Architecture

**Phase:** 12.20A1  
**Status:** Design document — no production code implemented  
**Depends on:** `docs/data-quality/STATSBOMB_OPEN_DATA_COVERAGE_AUDIT.md`

---

## Overview

This document designs the adapter architecture for integrating StatsBomb-derived team performance data (xG for/against per 90) into the existing Elo-based prediction model. The design preserves all current prediction behavior and adds an optional, injectable performance layer.

**Critical constraints — nothing below changes any of the following:**
- Production Elo/xG formulas or constants
- Poisson scoreline selection
- Prediction snapshots or evaluation hashes
- Persistence schema or migrations
- Tournament topology or qualification logic
- Provider sync behavior or standings calculation

---

## Current Architecture

The current prediction pipeline derives expected goals from the Elo rating gap between teams:

```
Elo ratings → eloToExpectedGoals(V2) → Poisson scoreline distribution → 1X2 probabilities
```

The `eloToExpectedGoals` function (V2: `adjustmentPer100 = 0.15`, `maxAdjustment = 0.65`) uses only the Elo differential to compute home/away expected goals. Attack/defense ratings derived from historical goal tallies provide an optional secondary signal.

---

## Proposed Performance Data Layer

### Interface: `TeamPerformanceDataProvider`

```typescript
export interface TeamPerformanceDataProvider {
  readonly name: string;
  readonly version: string;
  getProfile(canonicalTeamName: string, cutoffAt: Date): TeamPerformanceProfile | null;
  isAvailable(): boolean;
}

export interface TeamPerformanceProfile {
  canonicalTeamName: string;
  matchCount: number;
  recentMatchDate: string | null;
  xgForPer90: number | null;
  xgAgainstPer90: number | null;
  shotCountFor: number | null;
  shotCountAgainst: number | null;
  coverageClassification: "full" | "partial" | "sparse" | "fallback";
  sourceCompetitions: readonly PerformanceDataSource[];
  cutoffAt: string;
}

export interface PerformanceDataSource {
  competition: string;
  season: string;
  matchCount: number;
}
```

### Key Design Decisions

**1. `cutoffAt` no-look-ahead protection**

`getProfile(teamName, cutoffAt)` must filter out any match whose `match_date > cutoffAt`. This prevents test-time data from leaking into pre-match predictions. The `cutoffAt` parameter is derived from the snapshot's `kickoffAt` and must be enforced at every call site.

**2. Null safety for missing xG**

`xgForPer90` and `xgAgainstPer90` return `null` when `matchCount === 0` or when events data is unavailable. Callers must check for null before using profile values. `NaN` and `Infinity` are never returned.

**3. Coverage classification drives shrinkage weight**

The coverage classification determines how much weight to give the StatsBomb sample mean versus the Elo-derived prior:

| Classification | Suggested sample weight |
|---|---|
| full (≥10 matches) | 0.60 – 0.80 |
| partial (4–9 matches) | 0.30 – 0.60 |
| sparse (1–3 matches) | 0.10 – 0.30 |
| fallback (0 matches) | 0.00 |

The exact shrinkage formula is to be determined in a follow-up calibration phase.

---

## Planned Providers

### `StatsBombOpenDataProvider` (open data, no credentials)

Reads pre-extracted JSON from a local data file. Data is extracted offline from the StatsBomb Open Data GitHub repository, transformed into `TeamPerformanceProfile` records, and stored as a versioned JSON artifact in `docs/model-results/artifacts/`.

**Data pipeline (not yet implemented):**
1. Download events files from `statsbomb/open-data` for the audited competitions
2. For each team: filter shots by `period ≤ 2` (regulation), exclude own goals, compute xG for/against per 90
3. Apply `cutoffAt` filtering during lookup (not during extraction)
4. Serialize to JSON keyed by canonical team name

**Licensing:** Attribution required per StatsBomb terms. Do not commit raw StatsBomb JSON datasets to the repository. Commit only derived aggregate profiles (match counts, xG averages). Review license compliance before any public deployment.

### `StatsBombCommercialApiProvider` (commercial, not implemented)

A stub interface for a future StatsBomb commercial API integration. The `TeamPerformanceDataProvider` interface above is identical for both providers — the adapter pattern isolates the production prediction path from the data source.

**Not implemented in Phase 12.20A1.** Commercial API access is not required to begin the open data experiment.

---

## Team Name Normalization

StatsBomb Open Data uses different names for four WC2026 teams:

| WC2026 Canonical | StatsBomb Name | Normalization |
|---|---|---|
| Czechia | Czech Republic | Extend `TEAM_ALIASES` in `team-aliases.ts` |
| Ivory Coast | Côte d'Ivoire | Extend `TEAM_ALIASES` |
| Cape Verde | Cape Verde Islands | Extend `TEAM_ALIASES` |
| DR Congo | Congo DR | Extend `TEAM_ALIASES` |

The existing `canonicalizeTeamName(value)` function resolves aliases before lookup, so StatsBomb names will resolve to WC2026 canonical names transparently once these four entries are added.

**Implementation note:** Add the four entries to `TEAM_ALIASES` in `packages/api/src/team-aliases.ts` when the data provider is implemented (not as part of this design phase).

---

## Sparse-Data Shrinkage Policy

For teams with limited StatsBomb coverage, the xG estimate must be blended toward a prior to avoid overfitting to a handful of matches:

### Prior Sources (in order of specificity)

1. **Elo-derived baseline xG** — computed from the current V2 Elo-to-xG formula for a neutral-site match against a league-average opponent (Elo ≈ 1500). Available for all 48 teams. Never null.
2. **Confederation prior** — average xG per 90 across all covered teams in the same confederation. Reduces bias for AFC/OFC teams that consistently have different attacking patterns than UEFA/CONMEBOL.
3. **Global prior** — tournament-level average across all 48 WC2026 teams.

### Shrinkage Formula (proposed, not yet calibrated)

```
blendedXgFor = (sampleWeight × statsBombXgFor) + ((1 − sampleWeight) × eloBaselineXgFor)
```

Where `sampleWeight` is determined by coverage classification (see table above).

**Critical invariant:** The `eloBaselineXgFor` is computed fresh at prediction time from the current Elo ratings. It is never a stale cached value.

---

## `cutoffAt` Protection Design

### Problem

Using StatsBomb data from matches played after the snapshot's `capturedAt` timestamp would constitute look-ahead. For example: a pre-match snapshot captured before a group-stage match must not include events from that match or any later match in its xG profile.

### Solution

```typescript
function getProfileWithCutoff(
  profiles: Map<string, TeamPerformanceProfile[]>,
  teamName: string,
  cutoffAt: Date
): TeamPerformanceProfile | null {
  const allProfiles = profiles.get(teamName) ?? [];
  const eligible = allProfiles.filter(p =>
    p.recentMatchDate !== null &&
    new Date(p.recentMatchDate) < cutoffAt
  );
  // Re-aggregate eligible profiles or return pre-aggregated up-to-cutoff
  return eligible.length > 0 ? aggregateProfiles(eligible) : null;
}
```

### Match-Level Cutoff (preferred approach)

Rather than filtering at the profile level, the preferred approach is to record individual match-level xG contributions during extraction, then aggregate only those with `match_date < cutoffAt` at lookup time. This is more precise than filtering pre-aggregated profiles.

---

## No Production Behavior Changes

The integration architecture is additive and opt-in:

1. `TeamPerformanceDataProvider.isAvailable()` returns `false` when no data is loaded — the prediction pipeline falls through to Elo-only behavior unchanged.
2. The `TeamPerformanceProfile` result is passed to the prediction function as an optional argument. When `null`, the existing code path executes unchanged.
3. No `predictMatchFromLiveElo` signature changes in this phase.
4. No persistence schema changes. Profile data is in-memory or loaded from a local JSON file.
5. Existing prediction snapshot identity and content hash are unaffected.

---

## Implementation Phases (not started)

The following phases are gated on the audit findings in this document:

| Phase | Description | Gate |
|---|---|---|
| 12.20A2 | Extract and validate aggregate profiles from StatsBomb open data for the 40 covered teams | This audit (12.20A1) complete |
| 12.20B | Implement `StatsBombOpenDataProvider` with `cutoffAt` protection | 12.20A2 profiles validated |
| 12.20C | Backtesting comparison: Elo-only vs Elo+StatsBomb blended xG | 12.20B provider passing tests |
| 12.20D | Production integration (opt-in, behind feature flag) | Backtesting shows improvement |

---

## Audit Recommendation

Based on the coverage audit findings:

**`open_data_partial_use_with_priors`** — The StatsBomb Open Data set covers 40 of 48 WC2026 teams across multiple competitions with confirmed xG availability. The uncovered 8 teams fall back to Elo-derived priors unchanged. This is sufficient to begin an experiment without commercial API access.
