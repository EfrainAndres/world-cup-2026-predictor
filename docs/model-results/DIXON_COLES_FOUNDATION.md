# Dixon-Coles Foundation

## Purpose

The Dixon-Coles adjustment is used in football modeling to improve how a plain Poisson model handles low-score outcomes. Football has many close, low-scoring matches, and independent Poisson distributions can misrepresent outcomes such as `0-0`, `1-0`, `0-1`, and `1-1`.

## What Is Implemented

Phase 3.0 implements a small foundation:

- A Dixon-Coles adjustment factor for low-score outcomes.
- A default fixed `rho` value of `-0.1`.
- Adjusted scoreline probability calculation.
- Adjusted score matrix generation.
- Normalization of adjusted score matrices.
- Unit tests proving low-score outcomes change while high-score outcomes are not directly adjusted.

## What Is Not Implemented Yet

- Historical calibration of `rho`.
- Attack and defense parameter estimation.
- Time decay.
- Likelihood optimization.
- Backtesting against plain Poisson.
- Promotion of Dixon-Coles as the preferred model.

## Current Formula Behavior

| Scoreline | Adjustment |
| --- | --- |
| `0-0` | Adjusted using expected home goals, expected away goals, and `rho`. |
| `0-1` | Adjusted using expected home goals and `rho`. |
| `1-0` | Adjusted using expected away goals and `rho`. |
| `1-1` | Adjusted using `rho`. |
| Other scorelines | Adjustment factor is `1`. |

## Why This Is A Foundation

The current function demonstrates the shape of Dixon-Coles behavior without pretending to be calibrated. That keeps the implementation transparent and testable while preserving a clear path toward real validation.

## Validation Expectations Before Trusting It

Before Dixon-Coles powers published predictions, the project should:

- Estimate `rho` from historical data.
- Compare against plain Poisson on identical time-based test windows.
- Report accuracy, Brier Score, log loss, and calibration.
- Check whether draw and low-score predictions improve.
- Keep the simpler Poisson or Elo model if Dixon-Coles does not improve validation results.
