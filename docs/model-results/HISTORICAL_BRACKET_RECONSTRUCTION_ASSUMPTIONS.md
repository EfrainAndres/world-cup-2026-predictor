# Historical Bracket Reconstruction Assumptions

Phase 4.0N reconstructs historical World Cup tournament structures from the curated 2010, 2014, 2018, and 2022 fixture datasets.

## What Reconstruction Means

Historical bracket reconstruction turns result-level fixture records into structured tournament objects:

- Groups A through H.
- Group-stage tables.
- Group winners and runners-up.
- Round of 16, quarter-final, semi-final, third-place, and final fixtures.
- Champion, runner-up, and third-place outputs.

This does not generate model probabilities. It rebuilds the actual historical tournament path so future replay simulations can compare simulated paths against the real structure.

## Historical Format

The 2010, 2014, 2018, and 2022 tournaments used the 32-team World Cup format:

- 8 groups.
- 4 teams per group.
- 6 matches per group.
- 48 group-stage matches.
- 16 knockout and placement matches.
- 64 matches total.

This logic is separate from the FIFA 2026 48-team format and does not use the FIFA 2026 Round of 32 foundation.

## Group Standings

The reconstruction infers group membership from the curated fixture order, where every six group-stage matches represent one historical group.

Tables are calculated from actual group-stage scores using:

1. Points.
2. Goal difference.
3. Goals for.
4. Team-name fallback for deterministic ordering.

The fallback is intentionally simple and documented as a limitation until the full official FIFA tie-breaker chain is implemented.

## Knockout Progression

Knockout progression is reconstructed from fixture winners in the curated dataset. Drawn knockout scorelines must still include a winner through extra time or penalties.

## Why This Improves Replay

Earlier Monte Carlo replay used simplified explicit tournament fixtures. Reconstructed historical brackets make future replay more realistic because simulations can be aligned to actual group structures, qualification slots, knockout rounds, final outcomes, and third-place matches.
