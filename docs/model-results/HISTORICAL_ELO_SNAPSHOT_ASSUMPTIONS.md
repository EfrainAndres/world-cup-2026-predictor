# Historical Elo Snapshot Assumptions

Phase 4.0L adds a foundation for generating pre-tournament snapshots from replayed Elo ratings.

## What Historical Elo Snapshot Replay Means

Historical Elo snapshot replay means processing historical match results in chronological order, stopping at a cutoff date before the target tournament starts, and freezing the resulting team ratings as a pre-tournament snapshot.

The snapshot can then be scored against actual tournament outcomes without using matches that happened after the cutoff.

## Why Elo Snapshots Are Better Than Synthetic Seed Ratings

Synthetic seed-rating snapshots are useful for testing report plumbing, but they are caller-supplied inputs. Elo replay is stronger because ratings are derived from match results and deterministic update rules.

This improves the foundation by:

- Using sequential match evidence instead of hand-built seed order.
- Recording how many matches were used.
- Ignoring and reporting matches after the cutoff.
- Producing team probabilities from Elo ratings.
- Carrying look-ahead guardrail status into replay reports.

## Data Used Now

The repo currently has complete curated World Cup fixture datasets for 2010, 2014, 2018, and 2022.

It does not yet include a complete international match history before each tournament. For that reason, snapshots generated from the current available data are labeled:

`historical_elo_replay_snapshot_foundation`

This label means the snapshot is an implementation foundation, not a full historical forecast.

## Why This Is Still A Foundation

The current helper can replay any deterministic match input provided by tests or future data pipelines. However, with only curated World Cup fixtures available in the repo, it cannot yet reconstruct true pre-tournament national-team strength before each World Cup.

The foundation is valuable because it defines:

- Cutoff validation.
- Match filtering before replay.
- Elo rating generation.
- Elo-derived probability normalization.
- Ranking behavior.
- Replay metadata and warnings.

## Why Full International Match History Is Needed

Strong pre-tournament Elo snapshots need many matches before each tournament, not only World Cup fixtures.

Future work should add validated international results covering qualifiers, friendlies, and major tournaments before each World Cup. Only then can Elo ratings represent what the model could reasonably have known before the tournament started.
