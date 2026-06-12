# Attack / Defense Ratings — Foundation

**Phase:** 7.7
**Status:** Implemented — opt-in, uncalibrated foundation

## Purpose

Attack/defense ratings provide per-team goal-scoring and goal-conceding signals derived from the processed match dataset. They are a foundation layer for future expected-goals generation that can move beyond a single Elo rating per team.

## Design Decisions

### Opt-in flag

Attack/defense computation is off by default (`enabled: false`). The Elo ranking pipeline behavior is completely unchanged unless `attackDefense: { enabled: true }` is passed. This ensures all existing callers remain unaffected.

### Formulas

Both scores are normalized to a 0–100 scale where 50 represents an average team.

**Attack score:**

```
attackScore = clamp(round((teamAvgGoalsScored / datasetAvg) × 50), 0, 100)
```

- A team that scores at exactly the dataset average receives 50.
- A team that scores twice the dataset average receives 100.
- A team that scores zero goals receives 0.

**Defense score:**

```
defenseScore = clamp(round((2 − teamAvgGoalsConceded / datasetAvg) × 50), 0, 100)
```

- A team that concedes at exactly the dataset average receives 50.
- A team that concedes zero goals receives 100.
- A team that concedes twice the dataset average receives 0.

### Dataset average

The dataset average goals per side is computed as:

```
datasetAvgGoalsPerSide = totalGoalsScored / totalMatchAppearances
```

where each match contributes two team appearances (one home, one away), and only matches with `home_score` and `away_score` present are included.

### Sparse data handling

- Teams with **fewer than 3 matches** with available goal data are flagged as sparse.
- When any sparse team exists, `LIVE_ELO_PIPELINE_ATTACK_DEFENSE_SPARSE_WARNING` is included in the pipeline warnings.
- Teams with **zero matches** with goal data receive neutral scores of 50/50 regardless of enable state.

### No goal data fallback

If the entire dataset contains no matches with scores, all teams receive 50/50 and `LIVE_ELO_PIPELINE_ATTACK_DEFENSE_NO_GOAL_DATA_WARNING` is emitted.

## Data Coverage

The Live Elo pipeline currently processes two match sources:

| Source | Matches | Scores Available |
|---|---|---|
| WC 2026 foundation fixtures | 256 | No (`result` only) |
| Expanded international supplement | 56 | Yes (`home_score`, `away_score`) |
| **Total** | **312** | **56 matches** |

Attack/defense ratings are therefore derived from 56 matches. This is a known limitation of the current data layer. As more scored matches are added to the supplement, rating quality will improve.

## Metadata

The `attackDefense` field in `LiveEloPipelineResult` exposes:

| Field | Description |
|---|---|
| `enabled` | Whether attack/defense scores were computed |
| `datasetAvgGoalsPerSide` | Average goals per team appearance across scored matches |
| `matchesWithGoalData` | Number of matches that had both home/away scores |
| `teamsWithGoalData` | Number of teams that appeared in at least one scored match |
| `teamsWithSparseGoalData` | Number of teams with fewer than 3 scored match appearances |

## Warnings Emitted

| Constant | Condition |
|---|---|
| `LIVE_ELO_PIPELINE_ATTACK_DEFENSE_WARNING` | Always emitted when `enabled: true` — calibration disclaimer |
| `LIVE_ELO_PIPELINE_ATTACK_DEFENSE_SPARSE_WARNING` | Any team has fewer than 3 scored matches |
| `LIVE_ELO_PIPELINE_ATTACK_DEFENSE_NO_GOAL_DATA_WARNING` | No scored matches found at all |

## What This Does Not Claim

- These scores are **not calibrated** and make no claim of predictive accuracy improvement over Elo alone.
- The scores reflect historical averages from a limited match sample, not true attacking/defensive quality.
- They are labeled "foundation" because they will be replaced or supplemented by a more rigorous model once sufficient scored data is available.

## Future Work

- Integrate attack/defense ratings as inputs to expected-goals generation (`predictMatchFromLiveElo`).
- Expand the scored-match supplement to improve sample sizes.
- Add decay or recency weighting to goal data computation to match Elo recency behavior.
- Calibrate scores against historical tournament outcomes before using them as predictive inputs.
