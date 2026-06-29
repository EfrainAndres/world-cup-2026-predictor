# StatsBomb Backtesting and Scoreline Diversity Evaluation

Phase 12.20C — evaluation harness for the StatsBomb xG adjustment signal using WC2022 and WC2018 historical fixtures.

## Purpose

This harness measures whether the StatsBomb xG adjustment signal (Phase 12.20A/B) improves or regresses three-outcome prediction quality on historical World Cup fixtures. It does not promote the signal to production; promotion requires running the full pipeline with real StatsBomb data and reviewing the decision output.

## Architecture

All core logic is pure (no Node imports) and can be imported from client-safe modules.

| Module | Role |
|---|---|
| `statsbomb-backtesting.ts` | `evaluateBacktestFixture`, `computeBacktestMetrics`, `computeMetricDelta`, `buildBacktestCohorts`, `computeSignalCoverage` |
| `statsbomb-backtesting-decision.ts` | `makeStatsBombBacktestDecision` — 6-outcome decision function |
| `statsbomb-scoreline-diversity.ts` | `evaluateScorelineDiversity` — modal scoreline distribution and 1-1 tracking |
| `statsbomb-backtesting-cli.ts` | Server CLI — replays Elo, runs evaluation, writes artifacts |

## Dataset

- **Source**: `LIVE_ELO_FOUNDATION_MATCHES` + `loadLiveEloInternationalSupplement()` merged via `mergeEloMatchSources`
- **Replayed via**: `processMatches(mergedMatches)` to derive per-match pre-match Elo ratings
- **Filtered to**: matches with `match_id` prefixed `2022-WC` or `2018-WC`
- **Actual scores**: not available in `LIVE_ELO_FOUNDATION_MATCHES` — `actualHomeGoals` and `actualAwayGoals` are null for all historical fixtures; goal-level metrics (MAE, exact score, top-3/5 coverage) are null in results
- **Actual outcomes**: available as `home_win` / `draw` / `away_win` from `EloMatch.result`

## No-look-ahead enforcement

For each fixture, a profile is used only if `profile.cutoffAt <= fixture.kickoffAt` (strict `<=`). If a profile's data extends past the match date it is treated as unavailable for that fixture, exactly as if no profile existed. This prevents any future-data contamination.

## Metrics

### Three-class Brier Score
```
mean((pH - iH)² + (pD - iD)² + (pA - iA)²)
```
Lower is better. Range 0–2. A random predictor scores ≈ 0.667.

### Log Loss
```
-mean(log(p_actual + ε)), ε = 1e-15
```
Lower is better.

### Outcome accuracy
Fraction of fixtures where the predicted most-likely outcome matches actual.

### Goal MAE, exact score, top-3/5 coverage
Available only when `actualHomeGoals` / `actualAwayGoals` are non-null. Always null for the current historical dataset.

## Cohorts

16 cohorts are computed for every run:

| Cohort | Description |
|---|---|
| `all` | All fixtures |
| `wc_only` | World Cup fixtures only |
| `non_wc` | Non-World Cup fixtures |
| `neutral` | Neutral-venue fixtures |
| `knockout` | Knockout-stage fixtures |
| `group_stage` | Group-stage fixtures |
| `full_or_partial_coverage` | At least one team has full or partial profile |
| `sparse_coverage` | At least one team has sparse profile |
| `signal_applied` | Signal was applied (both profiles valid and in-window) |
| `signal_not_applied` | Signal was not applied |
| `strong_favorite` | Elo win-probability gap ≥ 0.40 |
| `moderate_favorite` | Gap ≥ 0.20 |
| `weak_favorite` | Gap ≥ 0.05 |
| `no_clear_favorite` | Gap < 0.05 |
| `baseline_modal_1_1` | Baseline modal scoreline is 1-1 |
| `draw_heavy_baseline` | Draw is the highest baseline probability |

## Decision function

`makeStatsBombBacktestDecision` returns one of 6 decisions:

| Decision | Condition |
|---|---|
| `real_data_evaluation_blocked` | `hasRealProfiles = false` |
| `disable_signal_candidate` | `hasLookaheadFailure` or `hasInvalidProfiles` |
| `insufficient_evidence` | `fixtureCount < 20` or `signalApplicationCount < 10` |
| `recalibrate_signal_weights` | Brier delta > 0.005 or LogLoss delta > 0.015 or goal MAE delta > 0.05 |
| `promote_signal_candidate` | Both Brier and LogLoss improved (delta < 0) |
| `retain_experimental` | No regression but insufficient improvement |

The signal must NOT be promoted to production default until `promote_signal_candidate` is returned with real StatsBomb data and the result is reviewed.

## Scoreline diversity

`evaluateScorelineDiversity` tracks:
- Top-10 modal scoreline distribution for baseline and enriched
- Unique modal scoreline count
- Top-1 and top-2 concentration
- Specific-score frequencies for 0-0, 1-0, 0-1, 1-1, 2-0, 0-2, 2-1, 1-2
- `pctModalScoreChanged` — fraction of fixtures where enriched modal differs from baseline
- `pctBaseline1_1ChangedAway` — fraction of baseline 1-1 predictions changed by the signal
- `pctNonBaseline1_1ChangedInto1_1` — fraction of non-1-1 baselines pushed into 1-1 by the signal

A healthy signal should shift some predictions away from 1-1 (the Poisson modal for equal Elo) toward scorelines consistent with a team's actual attacking strength.

## Round-of-32 comparison

The CLI also runs the signal over all 32 WC2026 first-round fixtures using current live Elo ratings. This is a prospective illustration only — not a backtesting evaluation. Results are written to `statsbomb-round-of-32-comparison.json`.

## Running the pipeline

```sh
# 1. Download StatsBomb Open Data (~800 MB)
pnpm --filter @world-cup-2026-predictor/api statsbomb:download

# 2. Build team performance profiles (cutoff 2026-06-01)
pnpm --filter @world-cup-2026-predictor/api statsbomb:build-profiles -- --cutoff-at 2026-06-01T00:00:00.000Z

# 3. Run backtesting evaluation
pnpm --filter @world-cup-2026-predictor/api statsbomb:backtest
```

Artifacts are written to:
- `docs/model-results/artifacts/statsbomb-backtesting-summary.json`
- `docs/model-results/artifacts/statsbomb-round-of-32-comparison.json`

When real data is unavailable, both artifacts contain a `real_data_evaluation_blocked` placeholder.

## Statistical caveats

- WC2022 (64 matches) + WC2018 (64 matches) = ≤ 128 historical fixtures. This is a limited sample; interpret Brier/LogLoss deltas cautiously.
- Profile coverage is uneven. Many WC participants have no StatsBomb data; the signal is only applied to fixtures where both teams have valid in-window profiles.
- Goal-level metrics are null for this dataset.
- The Elo replay uses `processMatches` (basic K-factor, no recency or competition weighting), which differs slightly from the live pipeline. Pre-match Elo values are approximations.
- A promotion decision from this harness should be treated as a necessary but not sufficient condition.
