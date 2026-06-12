# Elo Prediction Presets

Phase 7.9 adds three prediction presets — conservative, balanced, and aggressive — to the Elo-to-xG pipeline. Presets let users tune how strongly Elo rating differences translate into expected-goals gaps, without changing the underlying data or model.

## Purpose

The baseline Elo-to-xG mapping uses fixed parameters (`adjustmentPer100 = 0.1`, `maxAdjustment = 0.45`). Those values are reasonable defaults but impose a specific sensitivity on every prediction. Presets expose two parameters per scenario so users can explore how xG sensitivity affects outcome probabilities without touching any model internals.

Presets do not recalibrate the model. All output remains clearly labeled as uncalibrated.

## Preset Definitions

| Preset | adjustmentPer100 | maxAdjustment | Description |
| --- | --- | --- | --- |
| `conservative` | 0.07 | 0.30 | Smaller xG gap — closer outcomes, suits low-scoring expectations. |
| `balanced` | 0.10 | 0.45 | Default xG mapping. Matches the baseline pipeline behavior. |
| `aggressive` | 0.14 | 0.65 | Larger xG gap — stronger teams are favored more heavily. |

`balanced` is always the default when `preset` is omitted. It produces numerically identical output to the Phase 7.8 baseline.

## Formula Impact

For a given Elo difference `d`:

```
rawAdj = (d / 100) * adjustmentPer100
eloAdj = clamp(rawAdj, -maxAdjustment, +maxAdjustment)
homeXg = clamp(1.25 + eloAdj, 0.2, 4.0)
awayXg = clamp(1.25 - eloAdj, 0.2, 4.0)
```

Example: home Elo 1700, away Elo 1500 (`d = 200`):

| Preset | rawAdj | eloAdj (clamped) | Home xG | Away xG | Gap |
| --- | --- | --- | --- | --- | --- |
| conservative | 0.14 | 0.14 | 1.39 | 1.11 | 0.28 |
| balanced | 0.20 | 0.20 | 1.45 | 1.05 | 0.40 |
| aggressive | 0.28 | 0.28 | 1.53 | 0.97 | 0.56 |

## API Fields

### Request

`PredictMatchFromLiveEloRequest` accepts an optional `preset?: EloXgPreset` field. Omitting it is equivalent to `"balanced"`. An invalid string value returns a `validation_error` on the `preset` field.

### Response

`PredictMatchFromLiveEloSuccessResponse.expectedGoals` includes:

- `preset: EloXgPreset` — the active preset name
- `presetDescription: string` — human-readable description of the active preset

`metadata.notes` includes a line: `Prediction preset: <name>.`

`warnings` includes `ELO_TO_XG_PRESET_WARNING` when preset is not `"balanced"`.

## Warnings

Two constants control warning output:

- `ELO_TO_XG_UNCALIBRATED_WARNING` — always emitted regardless of preset.
- `ELO_TO_XG_PRESET_WARNING` — emitted when preset is `"conservative"` or `"aggressive"`.

The uncalibrated warning signals that expected goals come from a deterministic Elo mapping, not a fitted goals model.

## Dashboard Behavior

In Auto Predict From Elo mode, a 3-button preset selector appears inside the Elo panel. The active preset is highlighted. The selected preset is passed to `predictMatchFromLiveElo()` on submit.

Results show the active preset name and description below the Elo summary line so users can see which scenario produced the displayed probabilities.

Switching to Manual xG mode has no effect on the preset state — the preset selector is only shown and applied in Elo mode.

## Limitations

- Preset parameter values are not calibrated from real-world goal distributions. They are transparent scenario controls, not fitted model parameters.
- All three presets use the same Elo ratings. They differ only in how Elo difference is mapped to xG.
- Presets do not interact with attack/defense adjustment or recency/competition weighting.
- The `balanced` preset is the only one with any empirical basis — it was selected to produce plausible xG outputs for typical international match Elo ranges.
- Preset output must not be interpreted as a real match prediction or accuracy claim.
