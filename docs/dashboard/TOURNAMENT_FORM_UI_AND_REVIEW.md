# Tournament Form UI & Review

## Overview

Phase 12.10C exposes the optional tournament-form Elo adjustment (Phase 12.10B) in the dashboard. A toggle control in Auto Predict mode lets users opt into the secondary signal, and the results panel shows whether it applied and what each team's Elo adjustment was.

## Toggle Behavior

The toggle appears inside the Auto Predict From Elo form panel only. It is never shown in Manual xG mode.

| State | Request sent |
|---|---|
| Off (default) | No `tournamentFormAdjustment` field |
| On | `tournamentFormAdjustment: { enabled: true }` |

Switching the toggle clears any stale prediction result immediately, consistent with all other form control changes.

## Default-Off Design

The toggle defaults to Off for every new page load and every mode switch. This preserves the existing baseline Elo prediction as the default experience. Users who want to compare the secondary signal must opt in explicitly.

## Applied State

When the API returns `tournamentFormAdjustment.applied: true`, the results section shows:

- Applied status badge
- Caption: "Secondary Elo adjustment from completed World Cup 2026 matches."
- Formula version (when available)
- Cutoff timestamp (when available)
- Per-team card showing:
  - Baseline Elo (the Elo entering the tournament-form step)
  - Adjustment (+/- bounded value, one decimal place)
  - Effective Elo (baseline + adjustment)
  - Matches included
  - Form score (when available)
- Any warnings returned by the API

## Not-Applied State

When the API returns `tournamentFormAdjustment.enabled: true` but `applied: false`:

- "Not applied" badge is shown
- Caption: "Not enough completed tournament matches yet to apply a secondary Elo adjustment."
- Any API warnings are listed

This is the expected behavior early in the tournament when fewer than 2 completed matches exist per team.

## Disabled State

When `tournamentFormAdjustment` is undefined (toggle was Off), no tournament form section is rendered at all. Manual xG results never show a tournament form section.

## Secondary Signal Disclaimer

All tournament form result panels include a fixed note:

> Tournament form is an optional secondary signal, not a separate prediction model. It does not automatically increase confidence.

This note remains visible in both Applied and Not-applied states.

## Confidence Integration

Prediction confidence continues to be displayed separately under its own heading. Tournament form provenance data (whether it was enabled/applied, matches per team, formula version) is available in `predictionConfidence.dataPoints` in the API response but is not duplicated in the results panel to avoid redundant copy.

## Stale-Result Clearing

Tournament form toggle changes clear stale results in addition to:

- Fixture changes
- Group changes
- Custom team changes
- Match-selection mode changes
- Prediction mode changes
- Validation failures

## Current Sparse-Data Limitation

At the start of the tournament, few completed matches exist, so tournament form will often show "Not applied." This is expected and correct behavior. The minimum-matches threshold is set conservatively at 2 matches per team (Phase 12.10A constant).

## No Accuracy Guarantee

Tournament form is described throughout the UI and docs as:

- an optional bounded secondary signal
- not a separate probability model
- not a reason to treat the prediction as more certain

Future empirical calibration work (Phase 12.9, 12.11) will provide evidence on whether and when the adjustment improves accuracy.

## Files

| File | Role |
|---|---|
| `apps/web/src/components/MatchSimulationForm.tsx` | Toggle state, fieldset UI, request field wiring |
| `apps/web/src/components/MatchSimulationResults.tsx` | `TournamentFormAdjustmentSection` component |
| `apps/web/src/lib/tournament-form-helpers.ts` | Pure helpers: `buildTournamentFormRequestField`, `getTournamentFormDisplayState` |
| `apps/web/src/lib/tournament-form-helpers.test.ts` | 10 focused unit tests |
| `apps/web/tests/e2e/match-simulation.spec.ts` | 15 new Playwright tests |
