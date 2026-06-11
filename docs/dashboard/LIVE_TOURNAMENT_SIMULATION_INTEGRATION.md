# Live Tournament Simulation Integration

Phase 6.4 replaces the static `FOUNDATION_TOURNAMENT_SIMULATION` preview from Phase 6.3 with a live local tournament simulation using existing API and model package helpers.

## Purpose

Phase 6.3 used a static constant with hardcoded champion probabilities to preview the tournament simulation section layout. Phase 6.4 replaces this with a real call to `simulateTournamentFoundation()` — a pure API handler that runs `runTournamentRepeatedRuns` with a seeded deterministic 8-team sample tournament at build time.

The result is baked into the Next.js static HTML at build time alongside all other dashboard data.

## What changed

### New API handler: `simulateTournamentFoundation`

Added to `packages/api/src/routes.ts` and exported from `packages/api/src/index.ts`.

The handler:
1. Builds group score matrices using `generateScoreMatrix` (expectedHomeGoals 1.1, expectedAwayGoals 1.1, maxGoals 5, normalizeMatrix true).
2. Builds knockout score matrices (expectedHomeGoals 1.0, expectedAwayGoals 1.0).
3. Constructs a 2-group round-robin tournament input:
   - Group A: Brazil, France, Germany, Portugal
   - Group B: Argentina, England, Spain, Netherlands
   - Top 2 per group qualify (groupQualifiersCount: 2 → 4 knockout qualifiers, a power of 2)
4. Calls `runTournamentRepeatedRuns(input, { runCount: 1000, seed: 2026 })`.
5. Joins `championProbabilities` and `runnerUpProbabilities` by team name.
6. Returns `TournamentSimulationSuccessResponse` with `dataScope: "sample_foundation_8_team_tournament"`.

### New schema types

Added to `packages/api/src/schemas.ts`:

- `TournamentSimulationTeamResult` — `{ rank, team, championProbability, runnerUpProbability }`
- `TournamentSimulationSuccessResponse` — success envelope with `simulationCount`, `tournamentName`, `dataScope`, `teamResults`, `warnings`, `metadata`

### Web API client

`apps/web/src/lib/api-client.ts`:
- Removed `TournamentProbabilityEntry`, `TournamentSimulationFoundation`, and `FOUNDATION_TOURNAMENT_SIMULATION`.
- Added import of `simulateTournamentFoundation` and `TournamentSimulationSuccessResponse` from `@world-cup-2026-predictor/api`.
- `DashboardSnapshot.tournamentSimulation` is now typed as `TournamentSimulationSuccessResponse`.
- `getDashboardSnapshot()` calls `simulateTournamentFoundation()` directly.

### UI components

`TournamentProbabilityCard.tsx`:
- Imports `TournamentSimulationTeamResult` from `@world-cup-2026-predictor/api` instead of `TournamentProbabilityEntry` from the web API client.
- Field names (`rank`, `team`, `championProbability`, `runnerUpProbability`) are identical — no JSX changes.

`TournamentSimulationSection.tsx`:
- Props type changed from `TournamentSimulationFoundation` to `TournamentSimulationSuccessResponse`.
- Engine label is now a static string ("Monte Carlo — Poisson, simplified bracket") since the response has no engine field.
- Data scope is labeled "8-team sample foundation tournament" for readability.
- Foundation warning renders `simulation.warnings` as a list instead of a single string.
- Team probability grid renders `simulation.teamResults` (all 8 teams) instead of `simulation.entries` (5 entries).
- Status pill label changed from "Foundation preview" to "Live local simulation".
- CTA text updated to reflect the live handler.

## Sample tournament

The 8-team sample is intentionally small to keep build time short and to avoid requiring real FIFA 2026 fixture data:

| Group A | Group B |
| --- | --- |
| Brazil | Argentina |
| France | England |
| Germany | Spain |
| Portugal | Netherlands |

All matches use the same symmetric expected-goals value (1.1 group, 1.0 knockout) so that no team has an artificial advantage from the score matrix inputs. Probability differences arise solely from the stochastic simulation and bracket draw mechanics.

## Determinism

The handler uses `seed: 2026` via `runTournamentRepeatedRuns`. The same seed always produces the same `teamResults` array, which means the static Next.js build is reproducible.

## Accuracy framing

The section and API response both include the warning: **"Live local simulation foundation, not a public forecast."**

These probabilities reflect a simplified equal-strength simulation with no calibration from real pre-tournament statistics, Elo ratings, or FIFA 2026 squad data.

## Boundaries

Phase 6.4 does not add:

- Charts or probability bar visuals.
- Full FIFA 2026 format team inputs.
- An HTTP API endpoint.
- Authentication.
- Database storage.
- External UI libraries.
- New model or data package behavior.

## Next steps

Future phases can:

- Replace the equal-strength score matrices with Elo-derived expected-goals inputs.
- Expand the tournament to the full FIFA 2026 48-team format once squad data is available.
- Expose `simulateTournamentFoundation` via the HTTP adapter added in a future API server phase.
- Add group-stage qualification probability summaries to the dashboard.
