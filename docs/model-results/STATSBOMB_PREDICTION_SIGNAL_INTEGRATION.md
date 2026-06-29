# StatsBomb Prediction Signal Integration

## Overview

Phase 12.20B integrates StatsBomb Open Data team-performance profiles as an experimental, opt-in signal in the `predictMatchFromLiveElo` route. The signal is **additive and nullable**: the production Elo-to-xG baseline is unchanged when the signal is disabled, unavailable, invalid, or stale.

## Signal Version

`statsbomb-signal-v1`

## Pipeline Position

After `eloToExpectedGoals` (Elo → xG baseline), before `generateScoreMatrix` (Poisson matrix).

```
Elo ratings
  ↓ eloToExpectedGoals
baselineHomeXg / baselineAwayXg
  ↓ calculateStatsBombPredictionAdjustment  [opt-in]
effectiveHomeXg / effectiveAwayXg
  ↓ generateScoreMatrix
Poisson score matrix
```

## Opt-In Contract

Add `statsBombSignal: { enabled: true }` to the `predictMatchFromLiveElo` request:

```json
{
  "homeTeam": "France",
  "awayTeam": "Brazil",
  "statsBombSignal": {
    "enabled": true,
    "profileSource": "artifact",
    "cutoffAt": "2025-01-01T00:00:00.000Z",
    "maxWeight": 0.30
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Must be `true` to activate the signal. |
| `profileSource` | `"artifact"` | `"artifact"` reads the local JSON artifact; `"provider"` uses a null source (future). |
| `cutoffAt` | current ISO timestamp | Only profiles with `cutoffAt ≤ request cutoffAt` are accepted (no look-ahead). |
| `maxWeight` | `0.30` | Capped at `0.30`; cannot exceed the global default. |

## Adjustment Formula

For each team, the **performance xG** is the average of attack signal and defense signal:

```
homeAttackSignal  = home.xgForPer90   ?? globalPrior (1.05)
homeDefenseSignal = away.xgAgainstPer90 ?? globalPrior (1.05)
homePerformanceXg = (homeAttackSignal + homeDefenseSignal) / 2

adjustedHomeXg = baseline * (1 - pairWeight) + homePerformanceXg * pairWeight
```

`pairWeight = min(homeWeight, awayWeight)` — symmetric application.

## Weight Calculation

```
coverageBaseWeight × freshnessMultiplier × sampleWeight
sampleWeight = min(1, matchCount / 15)
```

| Coverage | Base Weight |
|----------|-------------|
| full (≥10 matches, ≥100 xG samples) | 0.30 |
| partial (≥5, ≥40) | 0.20 |
| sparse (≥1) | 0.10 |
| fallback (0) | 0.00 |

| Freshness | Multiplier |
|-----------|-----------|
| fresh (≤180 days) | 1.00 |
| aging (181–365 days) | 0.75 |
| stale (>365 days) | 0.25 |
| unknown (no data) | 0.00 |

## Rejection Reasons

| `reason` | Condition |
|----------|-----------|
| `disabled` | `enabled !== true` |
| `both_profiles_missing` | Both profiles null or fallback |
| `home_profile_missing` | Home profile null or fallback |
| `away_profile_missing` | Away profile null or fallback |
| `stale_profile` | Either profile has `freshness: "unknown"` |
| `insufficient_coverage` | `pairWeight < 0.001` |
| `invalid_profile` | Non-finite baseline or adjusted xG |
| `source_unavailable` | Profile source returned an error |
| `applied` | Signal was applied successfully |

## Baseline Preservation Invariant

When the signal is not applied (any reason other than `"applied"`), `adjustedHomeXg === baselineHomeXg` and `adjustedAwayXg === baselineAwayXg` exactly. The production Elo-to-xG V2 output is preserved bit-for-bit when `statsBombSignal` is omitted or `enabled: false`.

## Response Metadata

When `enabled: true`, the response includes a `statsBombSignal` field:

```json
{
  "statsBombSignal": {
    "enabled": true,
    "applied": true,
    "reason": "applied",
    "provider": "statsbomb_open_data",
    "cutoffAt": "2025-01-01T00:00:00.000Z",
    "signalVersion": "statsbomb-signal-v1",
    "baselineExpectedGoals": { "home": 1.42, "away": 1.18 },
    "adjustedExpectedGoals": { "home": 1.51, "away": 1.09 },
    "homeProfile": {
      "coverage": "full",
      "freshness": "fresh",
      "matchCount": 15,
      "latestMatchAt": "2024-07-14T20:00:00.000Z",
      "weight": 0.30
    },
    "awayProfile": { ... },
    "warnings": []
  }
}
```

## Safety Bounds

- Adjusted xG is clamped to `[0, 4.0]`.
- The signal cannot exceed `maxWeight = 0.30` regardless of coverage level.
- NaN or Infinity in adjusted values falls back to baseline with `reason: "invalid_profile"`.

## Artifact

Profiles are read from `docs/model-results/artifacts/statsbomb-team-performance-profiles.json`. Populate it by running:

```bash
pnpm statsbomb:download && pnpm statsbomb:build-profiles
```

The placeholder artifact contains an empty `profiles` array; predictions fall back to Elo-only baseline.

## Status

Experimental — not promoted to production default. The signal is opt-in per request and will not affect any existing predictions, snapshots, or evaluations unless explicitly enabled.

## Files

| File | Role |
|------|------|
| `packages/api/src/statsbomb-prediction-signal.ts` | Pure adjustment function, constants |
| `packages/api/src/statsbomb-artifact-profile-source.ts` | Profile source implementations |
| `packages/api/src/statsbomb-prediction-signal-comparison.ts` | Comparison builder |
| `packages/api/src/providers/statsbomb/` | Data provider, types, mapping |
| `packages/api/tests/statsbomb-prediction-signal.test.ts` | Unit tests (31 tests) |
| `docs/model-results/artifacts/statsbomb-team-performance-profiles.json` | Artifact placeholder |
