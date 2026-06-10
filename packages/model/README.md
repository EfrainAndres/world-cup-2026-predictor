# Model Package

`packages/model` contains prediction model logic. Phase 2.0 started with a deterministic Elo baseline. Phase 3.0 added a Poisson goal-modeling foundation and a simple Dixon-Coles low-score adjustment foundation. Phase 4.0A added a match-level Monte Carlo simulation engine. Phase 4.0B added simplified group-stage, knockout, and tournament simulation foundations. Phase 4.0C added repeated tournament runs and probability summaries. Phase 4.0D added FIFA 2026 format and fixture modeling foundations. Phase 4.0E added historical tournament validation foundations. Phase 4.0G added historical backtesting and calibration foundations. Phase 4.0H expanded the data package with complete 2010, 2014, 2018, and 2022 fixture results for future reports. Phase 4.0I added historical backtesting report helpers over those fixtures. Phase 4.0J adds baseline pre-tournament snapshot generation and look-ahead guardrails. Phase 4.0K adds historical tournament replay backtesting with pre-tournament snapshots. Phase 4.0L adds cutoff-safe historical Elo snapshot replay foundations.

## Current Scope

The package currently includes:

- Elo rating types and interfaces.
- Default Elo configuration.
- Expected score calculation.
- Rating delta calculation.
- Single-match rating updates.
- Sequential match processing.
- Team rating initialization.
- Current rating output.
- Match history and team history helpers.
- Expected-goals input types.
- Poisson probability mass function.
- Scoreline probability matrix generation.
- Win/draw/loss probability aggregation.
- Most likely scoreline ranking.
- Simple Dixon-Coles low-score adjustment with fixed `rho`.
- Seeded match-level Monte Carlo simulation.
- Simulation aggregation for home wins, draws, away wins, and common scorelines.
- Simplified group-stage standings and qualifiers.
- Simplified knockout match and round simulation.
- Simplified tournament orchestration from group qualifiers to champion.
- Repeated tournament simulation aggregation.
- Champion, runner-up, group qualification, and knockout qualification probability summaries.
- FIFA 2026 format constants for 48 teams, 12 groups, and 32 knockout qualifiers.
- FIFA 2026 group/team validation helpers.
- Best third-place qualification helpers.
- Round of 32 fixture validation and simple development bracket builder.
- Historical tournament prediction validation types.
- Champion Brier Score and Log Loss helpers.
- Top-N champion hit checks.
- Runner-up and knockout qualification evaluation helpers.
- Multi-tournament validation summaries and calibration bucket foundation.
- Historical backtesting helpers for curated fixture inputs.
- Champion and runner-up extraction from historical fixtures.
- Backtest summaries with dataset coverage metadata.
- Calibration bucket generation for supplied historical probability snapshots.
- Historical backtesting report helpers for per-year and aggregate summaries.
- Synthetic probability snapshot warnings for report validation fixtures.
- Baseline pre-tournament snapshot generation from seed ratings.
- Look-ahead bias guardrails for historical snapshot inputs.
- Historical tournament replay backtesting helpers for 2010, 2014, 2018, and 2022.
- Replay aggregate summaries with Brier Score, Log Loss, Top-1, Top-3, Top-5, snapshot type counts, guardrail status, and baseline warnings.
- Historical Elo replay helpers for cutoff-safe match filtering, Elo rating generation, Elo-derived probabilities, and foundation snapshot metadata.
- `historical_elo_replay_snapshot_foundation` outputs that can feed replay backtesting helpers.
- Deterministic Vitest unit tests.

## Defaults

| Setting | Value |
| --- | --- |
| Initial team rating | `1500` |
| K-factor | `20` |
| Win score | `1` |
| Draw score | `0.5` |
| Loss score | `0` |
| Poisson max goals | `7` |
| Poisson matrix normalization | `true` |
| Dixon-Coles rho | `-0.1` |
| Maximum simulation count | `1,000,000` |
| Maximum repeated tournament runs | `10,000` |
| FIFA 2026 teams | `48` |
| FIFA 2026 groups | `12` |
| FIFA 2026 knockout teams | `32` |

## Poisson And Dixon-Coles Scope

The Poisson foundation accepts expected home and away goals directly, then converts those expected goals into scoreline probabilities. Outcome probabilities are calculated by summing scorelines into home win, draw, and away win buckets.

The Dixon-Coles foundation applies a small fixed adjustment to low-score outcomes: `0-0`, `1-0`, `0-1`, and `1-1`. It is intentionally not calibrated yet. Future phases must validate whether this adjustment improves probabilistic metrics before using it as a trusted product model.

## Monte Carlo Scope

The Monte Carlo foundation simulates one match many times from an existing score probability matrix. It supports deterministic seeds and injected random functions so tests and future reports can reproduce results.

This phase does not simulate group tables, knockout brackets, penalty shootouts, or full tournament paths. Those rules belong in later tournament simulation phases.

## Tournament Scope

The tournament foundation simulates explicit group fixtures, ranks group standings by points, goal difference, goals for, then team name, and advances qualifiers into a simplified power-of-two knockout bracket.

This is not full FIFA World Cup 2026 support. Real fixtures, official FIFA tie-breakers, third-place qualification, extra time, penalties, and repeated tournament probability runs are future work.

## Repeated Runs Scope

The repeated-runs foundation simulates the same simplified tournament many times and summarizes how often teams become champion, finish runner-up, qualify from groups, and enter the knockout bracket.

These probabilities are still based on simplified tournament rules and input score matrices. They are useful for validating aggregation and explaining uncertainty, but they are not final World Cup 2026 predictions.

## FIFA 2026 Format Scope

The FIFA 2026 format foundation models 48 teams, 12 groups of 4, top-2 automatic qualification, 8 best third-place teams, and a Round of 32 fixture foundation.

This phase does not load real teams or fixtures. The Round of 32 builder is a deterministic development helper, not the official FIFA knockout mapping.

## Historical Validation Scope

The historical validation foundation compares tournament-level probability snapshots against known outcomes. It supports champion Brier Score, champion Log Loss, Top-N hit checks, runner-up ranking checks, knockout qualification hit rates, and basic champion calibration buckets.

This phase does not load real historical World Cup data and does not claim predictive accuracy. It creates tested validation mechanics so future historical dataset integration can report model quality honestly.

## Backtesting And Calibration Scope

The backtesting foundation evaluates supplied tournament probability snapshots against curated historical fixtures. It can extract champions and runner-ups, calculate Brier Score and Log Loss, report Top-N hit results, and generate calibration buckets.

The data package now includes complete fixture-level results for 2010, 2014, 2018, and 2022. The model still needs real probability snapshots and reporting commands before the project can claim backtesting results.

## Historical Report Scope

The historical report foundation generates per-year report objects for complete 2010, 2014, 2018, and 2022 fixture datasets. Reports include champion and runner-up outcomes, champion rank, Top-1/Top-3/Top-5 flags, Brier Score, Log Loss, calibration bucket summaries, dataset completeness metadata, and snapshot warnings.

Current tests use deterministic `synthetic_report_fixture` snapshots. These validate the report pipeline only; they are not real historical model predictions.

## Pre-Tournament Snapshot Scope

The pre-tournament snapshot foundation generates `baseline_pre_tournament_snapshot` outputs from caller-supplied team seed ratings. It normalizes seed ratings into champion probabilities, ranks teams deterministically, records snapshot metadata, and evaluates basic look-ahead guardrails.

This is a transparent baseline, not a calibrated model forecast. Future work should replace seed ratings with sequential historical Elo replay using only data available before each tournament.

## Historical Replay Scope

The historical replay foundation evaluates pre-tournament snapshots against complete historical World Cup outcomes for 2010, 2014, 2018, and 2022.

Replay outputs include actual champion and runner-up, snapshot type, champion and runner-up probabilities and ranks, Top-1/Top-3/Top-5 champion hits, Brier Score, Log Loss, calibration bucket summaries when available, dataset completeness, look-ahead guardrail status, replay warnings, and aggregate summaries.

Current replay results using `baseline_pre_tournament_snapshot` are baseline replay results only. They prove the replay pipeline and reporting contracts, not final model accuracy.

## Historical Elo Snapshot Scope

The historical Elo snapshot foundation replays supplied historical matches up to a cutoff date before the target tournament starts. Matches after the cutoff are ignored and counted in snapshot metadata.

Generated snapshots use `historical_elo_replay_snapshot_foundation` because the repo does not yet include full international match history before each evaluated tournament. Elo-derived probabilities are deterministic and replay-compatible, but they are not calibrated tournament simulation probabilities yet.

## Boundaries

This package does not implement:

- Mapping Elo ratings to expected goals.
- Calibrated attack and defense strengths.
- Full Dixon-Coles parameter optimization.
- Full FIFA World Cup 2026 tournament format.
- Real World Cup 2026 fixtures and groups.
- Official FIFA group tie-breakers.
- Official FIFA knockout slot mapping.
- Historical match replay from complete international results.
- Calibrated pre-tournament Elo snapshots from full international match history.
- Historical Monte Carlo replay from true pre-tournament match probabilities.
- Public model accuracy claims.
- Large-scale repeated-run performance optimization.
- FastAPI service.
- Database access.
- Dashboard behavior.
- External dataset ingestion.

## Type Integration Note

The model package uses a small local `EloMatch` interface that is compatible with the normalized match shape from `packages/data`. A future shared package or workspace-level type strategy can improve cross-package contracts once more packages exist.

## Commands

From the repository root:

```bash
pnpm test:model
pnpm --filter @world-cup-2026-predictor/model typecheck
pnpm build
```
