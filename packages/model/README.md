# Model Package

`packages/model` contains prediction model logic. Phase 2.0 started with a deterministic Elo baseline. Phase 3.0 added a Poisson goal-modeling foundation and a simple Dixon-Coles low-score adjustment foundation. Phase 4.0A added a match-level Monte Carlo simulation engine. Phase 4.0B added simplified group-stage, knockout, and tournament simulation foundations. Phase 4.0C added repeated tournament runs and probability summaries. Phase 4.0D adds FIFA 2026 format and fixture modeling foundations.

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

## Boundaries

This package does not implement:

- Mapping Elo ratings to expected goals.
- Calibrated attack and defense strengths.
- Full Dixon-Coles parameter optimization.
- Full FIFA World Cup 2026 tournament format.
- Real World Cup 2026 fixtures and groups.
- Official FIFA group tie-breakers.
- Official FIFA knockout slot mapping.
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
