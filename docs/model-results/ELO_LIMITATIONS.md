# Elo Limitations

## Current Limitations

The Phase 2.0 Elo baseline is intentionally simple.

Known limitations:

- No home advantage adjustment.
- No neutral-site effect.
- No competition weighting.
- No margin-of-victory scaling.
- No recency weighting.
- No squad or player context.
- No injury or suspension data.
- No goal probability output.
- No tournament simulation.
- No historical backtest yet.

## Why These Limits Are Acceptable Now

The goal of Phase 2.0 is to create a tested, transparent baseline. A simple Elo implementation gives future phases something to compare against.

Complexity should be added only when validation shows it improves probabilistic performance or explanation quality.

## Future Work

Future improvements may include:

- Home advantage.
- Competition weighting.
- Recency weighting.
- Margin of victory.
- FIFA rankings comparison.
- Poisson integration.
- Backtesting reports with accuracy, Brier Score, log loss, and calibration notes.
