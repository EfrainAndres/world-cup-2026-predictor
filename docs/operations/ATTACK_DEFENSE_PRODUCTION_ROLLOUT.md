# Attack/Defense Goal Model — Production Rollout Guide

## Phase 12.21B — Controlled Integration

This document describes how to safely progress the attack/defense goal model from the current default-off state to shadow and production modes.

## Current Status

`ATTACK_DEFENSE_GOAL_MODEL_MODE=off` — default. Baseline Elo V2 used for all predictions.

## Rollout Steps

### Step 1: Enable Shadow Mode

```bash
ATTACK_DEFENSE_GOAL_MODEL_MODE=shadow
```

In shadow mode:
- Runtime loads the selected-candidate artifact and builds WC2026 profiles on process start
- Every prediction computes both the AD xG and the Elo V2 baseline xG
- Only the baseline is authoritative (no change to scores, probabilities, or scorelines)
- `attackDefenseGoalModel.shadowExpectedGoals` in the prediction response shows the AD pair for comparison
- No impact on snapshots, evaluations, standings, or qualification

Monitor `attackDefenseGoalModel.shadowExpectedGoals` vs `baselineExpectedGoals` in prediction logs. Confirm xG values are plausible (typically 0.5–2.5 per team) and not clamped at extremes.

### Step 2: Verify Runtime Diagnostics

Call the diagnostics endpoint or inspect `ProductionRuntimeDiagnostics.attackDefense`:

```json
{
  "featureEnabled": true,
  "rolloutMode": "shadow",
  "activationDecision": "shadow_ready",
  "artifactReady": true,
  "readinessReason": "ready",
  "candidateId": "attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0",
  "lastLoadStatus": "loaded"
}
```

If `artifactReady: false`, check `readinessReason` for the failure:

| Reason | Action |
|---|---|
| `feature_disabled` | Mode is `off`; increase to `shadow` or `on` |
| `artifact_missing` | `attack-defense-recalibration-selected-candidate.json` not found |
| `artifact_unreadable` | JSON parse failed or schema mismatch |
| `decision_not_promote` | Artifact does not have `promote_recalibrated_candidate` decision |
| `candidate_mismatch` | `selectedCandidateId` does not match expected ID |

### Step 3: Enable Production Mode

```bash
ATTACK_DEFENSE_GOAL_MODEL_MODE=on
```

In production mode:
- Activation decision becomes `production_ready` (since artifact passes the gate)
- AD xG replaces Elo V2 xG in all predictions
- `attackDefenseGoalModel.applied: true` in prediction responses
- StatsBomb (if enabled) adjusts on top of AD xG

### Step 4: Validate Production Predictions

After enabling `on` mode, verify:
1. Prediction `expectedGoals.home` and `expectedGoals.away` differ per match (not all 1.09/1.09)
2. `attackDefenseGoalModel.homeProfile.coverage` shows realistic mix (full/partial/sparse/fallback)
3. No extreme xG values (< 0.2 or > 4.0) — these are clamped by the model
4. Scoreline diversity: most likely scorelines should vary between matches

## Rollback

To revert to baseline Elo V2 at any time:

```bash
ATTACK_DEFENSE_GOAL_MODEL_MODE=off
```

No code changes, no deployments. Takes effect on the next request (or next process start for cached deps).

## WC2026 Profile Coverage

Profiles are built from pre-tournament historical data (cutoff: 2026-06-11). Expected coverage:

- WC2022 qualifying teams with strong WC2018 history → `full` or `partial`
- Teams that qualified only for WC2026 with limited WC history → `sparse` or `fallback`
- `fallback` teams use neutral attack/defense strength (1.0/1.0); AD xG ≈ competition average

Coverage stats are reported in `attackDefenseGoalModel.homeProfile.coverage` per prediction.

## Artifact Version

The selected candidate is fixed:

```
attack_defense_log_linear_damped__a0p65__d0p20__e0p00__v0p50__b1p00__r0p20__damp0
```

If a new recalibration produces a different `selectedCandidateId`, the activation gate will return `candidate_mismatch` until `attack-defense-production-config.ts` is updated with the new expected ID.

## Security

- `ATTACK_DEFENSE_GOAL_MODEL_MODE` is read from `process.env` at request time
- Never set `NEXT_PUBLIC_ATTACK_DEFENSE_GOAL_MODEL_MODE` — this would expose the mode to the client bundle
- The embedded artifact is bundled at build time; no filesystem reads at runtime on Vercel

## Related Documents

- `docs/model-results/ATTACK_DEFENSE_CONTROLLED_PRODUCTION_INTEGRATION.md` — architecture details
- `docs/model-results/ATTACK_DEFENSE_GOAL_MODEL_EXPANSION.md` — Phase 12.21A/A2/A3 background
- `docs/data-quality/ATTACK_DEFENSE_PROFILE_POLICY.md` — profile data quality policy
