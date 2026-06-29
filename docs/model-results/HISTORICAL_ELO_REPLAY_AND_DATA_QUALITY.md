# Historical Elo Replay and Data Quality

Phase 12.20C2 expands the historical Elo replay used to evaluate the optional StatsBomb signal. The previous Phase 12.20C backtest was structurally correct, but it replayed a narrow World Cup-only history. That compressed Elo gaps below the active Elo-to-xG V2 modal-score threshold, so every evaluated WC2018/WC2022 fixture produced a 1-1 baseline modal scoreline.

This phase does not change production Elo constants, Elo-to-xG V2 constants, Poisson configuration, scoreline selection, prediction defaults, snapshots, evaluations, persistence, official fixtures, standings, or qualification logic.

## Reused Datasets

The replay reuses the existing Phase 12.11 and live-Elo data boundaries:

| Dataset | Use |
| --- | --- |
| World Cup 2010, 2014, 2018, 2022 foundation matches | Preserved as the diagnostic `world_cup_only_basic` replay and as part of expanded strategies. |
| Expanded international supplement | Added before and between tournament fixtures for expanded replays. |
| Competition metadata | Reused for live-Elo competition weighting in the weighted strategy. |
| Neutral-site metadata | Reused by the weighted strategy through the live-Elo home-advantage helper. |
| StatsBomb WC2018/WC2022 score lookup | Used only for historical actual scores and per-fixture profiles. |

WC2026 fixtures are explicitly excluded from historical replay.

## Replay Strategies

| Strategy | Behavior |
| --- | --- |
| `world_cup_only_basic` | Preserves the Phase 12.20C diagnostic baseline using World Cup-only fixtures and the basic Elo update path. |
| `expanded_international_basic` | Replays World Cup plus expanded international fixtures chronologically, using the same basic Elo K-factor update. |
| `expanded_international_weighted` | Replays World Cup plus expanded international fixtures chronologically, using the live-Elo competition weight and home-advantage helpers. |

All strategies capture pre-match Elo before updating the evaluated fixture, then update Elo only after the prediction inputs are captured.

## Data Quality Results

Generated artifact: `docs/model-results/artifacts/historical-elo-replay-comparison.json`.

| Strategy | Evaluated fixtures | Max gap | Avg abs gap | >167 gap fixtures | xG pairs | Modal scorelines | 1-1 frequency | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `world_cup_only_basic` | 128 | 126.368 | 35.578 | 0 | 31 | 1 | 100.0% | blocked |
| `expanded_international_basic` | 128 | 126.368 | 35.578 | 0 | 31 | 1 | 100.0% | blocked |
| `expanded_international_weighted` | 128 | 383.077 | 103.083 | 24 | 59 | 3 | 78.9% | `weighted_replay_ready` |

The expanded basic replay remains compressed because adding the current supplement without competition-sensitive weighting does not materially widen WC2018/WC2022 pre-match Elo gaps. The weighted replay passes because it reuses the existing live-Elo competition-weight behavior and produces a broader rating and xG surface.

## Baseline Metrics

| Strategy | Brier | Log Loss | Outcome accuracy | Exact score | Top-3 score | Top-5 score | Total goal MAE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `world_cup_only_basic` | 0.6421 | 1.0622 | 48.4% | 9.4% | 28.1% | 49.2% | 0.9468 |
| `expanded_international_basic` | 0.6421 | 1.0622 | 48.4% | 9.4% | 28.1% | 49.2% | 0.9468 |
| `expanded_international_weighted` | 0.6383 | 1.0608 | 48.4% | 9.4% | 28.9% | 48.4% | 0.9435 |

## StatsBomb Comparison

Generated artifact: `docs/model-results/artifacts/statsbomb-backtesting-expanded-elo.json`.

The StatsBomb comparison ran only for `expanded_international_weighted`, because it was the only replay strategy that passed data-quality validation.

| Metric | Baseline | Enriched | Delta |
| --- | ---: | ---: | ---: |
| Brier Score | 0.6383 | 0.6365 | -0.0018 |
| Log Loss | 1.0608 | 1.0581 | -0.0027 |
| Outcome accuracy | 48.4% | 49.2% | +0.8 pp |
| Exact score accuracy | 9.4% | 9.4% | 0.0 pp |
| Total goal MAE | 0.9435 | 0.9421 | -0.0014 |
| Baseline 1-1 frequency | 78.9% | 78.9% | 0.0 pp |
| Unique modal scorelines | 3 | 3 | 0 |

Signal applied to 86 of 128 fixtures, a 67.2% application rate. The StatsBomb decision returned `promote_signal_candidate` after the weighted replay passed data-quality validation.

## No-Look-Ahead Policy

- Evaluation fixtures are WC2018 and WC2022 only.
- For each evaluated fixture, only prior replayed matches affect pre-match Elo.
- StatsBomb profiles are loaded with `cutoffAt = historical fixture kickoff`.
- WC2026 fixtures never enter historical calibration.
- Duplicate same-date/team fixtures are excluded before replay, so supplement mirrors do not update Elo twice.

## Artifacts

- `docs/model-results/artifacts/historical-elo-replay-comparison.json`
- `docs/model-results/artifacts/statsbomb-backtesting-expanded-elo.json`

## Limitations

- The expanded supplement is still curated partial history, not a complete international match archive.
- The weighted replay validates the backtest surface for the current data; it does not recalibrate Elo or xG constants.
- The enriched StatsBomb signal did not change modal scorelines in this run, even though probability metrics improved slightly.
- Phase 12.20D remains a separate production-promotion decision and must not be marked ready unless this phase is reviewed and the StatsBomb promotion gate is accepted.
