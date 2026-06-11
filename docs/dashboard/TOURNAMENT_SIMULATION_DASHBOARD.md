# Tournament Simulation Dashboard

Phase 6.3 adds the tournament simulation section to the dashboard.

## Purpose

The tournament simulation section makes the tournament simulation engine visible in the UI. It surfaces the Monte Carlo, Poisson/Dixon-Coles, and simplified bracket simulation capabilities built across Phases 4.0A through 4.0O — while being honest that no calibrated tournament API handler exists yet.

The section uses a clearly labeled static foundation preview to represent the kind of output the tournament simulation will produce once the API is extended.

## Current UI

The dashboard now includes a tournament simulation section with:

- Section header and description explaining the foundation scope.
- Simulation status card showing:
  - Engine name: Monte Carlo — Poisson/Dixon-Coles, simplified bracket.
  - Simulation run count.
  - Data scope label: illustrative baseline seed ratings, not calibrated from real pre-tournament data.
  - Foundation warning banner.
- Foundation label and disclaimer: "Tournament simulation is a foundation scenario, not a public forecast."
- Top-5 foundation estimate cards for Brazil, France, Argentina, England, and Spain, each showing:
  - Rank.
  - Team name.
  - Champion probability (illustrative).
  - Runner-up probability (illustrative).
- Model limitations summary from `modelInfo.limitations`.
- Call-to-action card directing users to the interactive match simulation section for current model output.

## Components

| Component | Purpose |
| --- | --- |
| `TournamentSimulationSection` | Section wrapper with simulation status, foundation probability grid, limitations, and CTA. |
| `TournamentProbabilityCard` | Individual team card with rank, champion probability, and runner-up probability. |

Both components are pure — they receive all data through props. No model or data package is imported inside components.

## Data Sources

| Prop | Source |
| --- | --- |
| `simulation` | `snapshot.tournamentSimulation` — `FOUNDATION_TOURNAMENT_SIMULATION` constant from `apps/web/src/lib/api-client.ts` |
| `modelInfo` | `snapshot.modelInfo` — `getModelInfo()` from `@world-cup-2026-predictor/api` |

The `FOUNDATION_TOURNAMENT_SIMULATION` constant is defined in the API client wrapper (`apps/web/src/lib/api-client.ts`) so component code stays clean. It contains static illustrative entries with clearly labeled warnings.

## Static Foundation Data

The current foundation entries use illustrative champion and runner-up probabilities for Brazil, France, Argentina, England, and Spain. These are:

- **Not calibrated** from real pre-tournament match data.
- **Not derived** from a calibrated Elo-to-expected-goals mapping.
- **Intended** only to show the shape of future tournament simulation output.

Once a `getTournamentSimulation` handler is added to `packages/api`, the static constant can be replaced with a live API call and the warning label can be updated or removed.

## Boundaries

This phase does not add:

- A real tournament simulation API handler.
- Charts or probability bar visuals.
- Authentication.
- Database storage.
- Server deployment.
- External UI libraries.
- New model or data package behavior.

## Accuracy Framing

The section prominently labels the data as a foundation scenario. The foundation warning and the disclaimer text ("Tournament simulation is a foundation scenario, not a public forecast.") ensure no reader mistakes these estimates for calibrated model predictions.

## API Roadmap Note

A `getTournamentSimulation` handler for `packages/api` is the natural next step. It would call the existing `runTournamentRepeatedRuns` and `summarizeTeamCounts` functions from `packages/model` with a seed-rated or Elo-derived team input and return champion and runner-up probability summaries. The Phase 5.4 API Server Adapter phase would expose this as an HTTP endpoint.

## Next Steps

Future dashboard work can add:

- A real tournament simulation API handler that replaces the static constant.
- Probability bar widths or simple visual cues for comparing team chances.
- Group-stage probability summaries.
- Knockout bracket path probabilities.
- Full FIFA 2026 format team inputs once official squad data is available.
