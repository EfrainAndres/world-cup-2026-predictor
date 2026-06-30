# Phase 12.21B — Attack/Defense Controlled Production Integration

## Overview

Phase 12.21B integrates the selected attack/defense goal-model candidate behind a private `ATTACK_DEFENSE_GOAL_MODEL_MODE=off|shadow|on` rollout flag. Production Elo V2 is unchanged. The new model is disabled by default.

## Selected Candidate

From Phase 12.21A3:

```text
attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0
```

| Config | Value |
|---|---|
| attackWeight | 0.65 |
| defenseWeight | 0.20 |
| eloWeight | 0.00 |
| venueWeight | 0.50 |
| attackDefenseBlendWeight | 1 |
| residualCap | 0.20 |
| coverageDampingEnabled | false |

WC2022 holdout: Brier δ=−0.0117, LogLoss δ=−0.0446 vs Elo V2 baseline.

## Architecture

### New Files

| File | Purpose |
|---|---|
| `packages/api/src/attack-defense-production-config.ts` | Mode parser, artifact readiness validator, activation gate |
| `packages/api/src/attack-defense-runtime-profile-source.ts` | Process-cached WC2026 runtime profiles; eligibility check |
| `packages/api/src/attack-defense-server-composition.ts` | `createAttackDefenseProductionDependencies()` factory |
| `apps/web/src/lib/attack-defense-embedded-artifact.server.ts` | Build-time JSON embed for selected-candidate artifact |

### Modified Files

| File | Change |
|---|---|
| `packages/api/src/schemas.ts` | Added `AttackDefenseGoalModelRuntimeMetadata`, `AttackDefenseGoalModelProfileSummary`; added `attackDefenseGoalModel?` to success response |
| `packages/api/src/routes.ts` | Added AD deps to `predictMatchFromLiveElo`; integrated off/shadow/on logic |
| `apps/web/src/lib/server-runtime.ts` | Wired `createAttackDefenseProductionDependencies` via `buildProductionDependencies`; added `attackDefense` to diagnostics |
| `.env.example` | Added `ATTACK_DEFENSE_GOAL_MODEL_MODE=off` documentation |
| `turbo.json` | Added `ATTACK_DEFENSE_GOAL_MODEL_MODE` to build env list |

## Rollout Modes

| Mode | Behavior |
|---|---|
| `off` (default) | No artifact load; baseline Elo V2 only; no `attackDefenseGoalModel` metadata unless mode is explicitly supplied |
| `shadow` | Profiles loaded; AD xG computed alongside baseline; baseline remains authoritative; `shadowExpectedGoals` in metadata |
| `on` | AD xG replaces Elo V2 xG when artifact and activation gate pass; `applied: true` in metadata |

## Runtime Profile Source

- WC2026 cutoff: `2026-06-11` (pre-tournament)
- Profile strategy: `goals_strength_of_schedule_adjusted`
- Recency strategy: `exponential_half_life`
- Teams: all 48 WC2026 qualified teams
- Process-level cache: built once per server process

## StatsBomb Interaction Matrix

| AD mode | SB mode | xG source used |
|---|---|---|
| off | off | Elo V2 baseline |
| off | shadow | Elo V2 + SB shadow |
| off | on | Elo V2 + SB applied |
| shadow | off | Elo V2 (AD shadow recorded) |
| shadow | shadow | Elo V2 (both shadow recorded) |
| shadow | on | Elo V2 + SB applied (AD shadow recorded) |
| on | off | AD xG |
| on | shadow | AD xG + SB shadow |
| on | on | AD xG + SB applied |

## Snapshot Protection

Automated pre-match snapshots always call `predictMatchFromLiveElo` without AD dependencies. The snapshot service is not modified. When `ATTACK_DEFENSE_GOAL_MODEL_MODE=off` (default), predictions are identical to the pre-Phase-12.21B baseline.

## Response Schema

```typescript
attackDefenseGoalModel?: {
  mode: "off" | "shadow" | "on";
  applied: boolean;
  reason: string;
  activationDecision?: string;
  candidateId?: string;
  baselineExpectedGoals: { home: number; away: number };
  effectiveExpectedGoals: { home: number; away: number };
  shadowExpectedGoals?: { home: number; away: number };  // shadow mode only
  homeProfile: { coverage: string; matchCount: number; cutoffAt: string } | null;
  awayProfile: { coverage: string; matchCount: number; cutoffAt: string } | null;
  warnings: readonly string[];
}
```

## Production Safety

- Elo-to-xG V2 constants unchanged
- Poisson score matrix unchanged
- StatsBomb weights unchanged
- Scoreline selection and presentation policy unchanged
- Snapshots, evaluations, persistence, standings, qualification, topology unchanged
- `ATTACK_DEFENSE_GOAL_MODEL_MODE` never exposed via `NEXT_PUBLIC_*`
- Model off by default; no behavior change until operator sets the env var
