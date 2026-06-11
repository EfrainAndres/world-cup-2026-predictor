# Match Simulation Dashboard

Phase 6.1 adds the first interactive match simulation UI to the dashboard.

## Purpose

The match simulation dashboard lets a user enter two teams, expected goals, a score-matrix goal cap, and an optional simulation count. The UI calls the existing API client wrapper, which delegates to the `packages/api` pure handler. Components do not call the model package directly.

## Current UI

The dashboard now includes:

- Home team input.
- Away team input.
- Expected home goals input.
- Expected away goals input.
- Max goals input.
- Optional simulation count input.
- Submit button with a basic submitting state.
- Field-level validation messages.
- Result cards for home win, draw, and away win probabilities.
- Most likely scoreline list.
- Clear note: `Baseline simulation, not a guarantee.`

## Boundaries

This phase does not add:

- Charts.
- Authentication.
- Database storage.
- Server deployment.
- External UI libraries.
- New model or API package behavior.

## Accuracy Framing

The simulation is a baseline scenario based on user-provided expected goals. It is useful for exploring how the current API response can drive UI, but it is not a guarantee and should not be presented as final predictive accuracy.

## Next Steps

Future dashboard phases can add:

- Dedicated match pages.
- Better team selection controls.
- Probability bars or simple charts.
- More detailed model notes.
- Focused component and accessibility tests.
