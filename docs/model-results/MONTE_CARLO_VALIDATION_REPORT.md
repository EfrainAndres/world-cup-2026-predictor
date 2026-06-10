# Monte Carlo Validation Report

## Current Status

Phase 4.0A validates the match-level Monte Carlo engine with deterministic unit tests. This confirms simulation mechanics, reproducibility, and probability aggregation. It does not yet validate full tournament behavior or real-world model calibration.

## Current Test Coverage

| Area | Validation |
| --- | --- |
| Reproducibility | Seeded simulations return identical results for the same seed and inputs. |
| Single-match sampling | One simulated match returns a scoreline from the input matrix. |
| Simulation count | Batch simulations return the requested number of runs. |
| Count integrity | Home wins, draws, and away wins sum to the simulation count. |
| Probability integrity | Estimated outcome probabilities sum close to `1`. |
| Common scorelines | Most common scorelines are sorted by count. |
| Invalid count handling | Invalid simulation counts are rejected. |
| Matrix validation | Invalid probability matrices are rejected. |
| Immutability | Input probability matrices are not mutated. |
| Analytical comparison | High-count simulations approximate analytical win/draw/loss probabilities within tolerance. |

## Analytical Comparison

The engine compares high-count sampled outcomes against analytical probabilities from the same score matrix. This is useful because the analytical probabilities are known before sampling. With enough simulations, the sampled estimates should be close to the analytical values.

## Known Validation Gaps

- No group-stage simulation validation yet.
- No knockout bracket validation yet.
- No tournament-path probability validation yet.
- No real dataset backtesting yet.
- No calibration review against historical matches yet.
- No simulation stability report across multiple simulation counts yet.

## Phase 4.0A Acceptance

This phase is acceptable when:

- Sampling is deterministic when a seed or injected random function is used.
- The engine rejects invalid inputs clearly.
- Estimated probabilities are internally consistent.
- Existing Elo, Poisson, Dixon-Coles, and data tests still pass.
- Documentation explains that this is match-level simulation only.
