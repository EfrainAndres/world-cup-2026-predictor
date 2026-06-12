# Web Dashboard

`apps/web` contains the dashboard for World Cup 2026 Predictor (through Phase 7.3).

The app is a minimal Next.js, TypeScript, and Tailwind dashboard shell. It reads from the local `packages/api` pure handlers through a small client wrapper and does not call a network server.

## Included

- Dashboard home page.
- Header and navigation.
- Model status card.
- Interactive match simulation form.
- Match simulation preview card.
- Match simulation result cards.
- Historical replay audit preview card.
- Live Elo ratings section showing top computed teams, ranks, Elo ratings, matches processed, data coverage, latest match date, and partial-data warnings.
- Team ratings section with foundation Elo seed ratings for top 10 World Cup 2026 contenders, tier pills (Elite/Strong/Competitive), offense/defense scores, strongest offense/defense indicators, and summary stats.
- Tournament simulation section with live local foundation simulation (8-team sample, seed 2026, 1000 runs), champion/runner-up probability cards for all 8 teams, model limitations, and match simulation CTA.
- Historical validation section with aggregate audit status and per-year tournament cards.
- Responsive Tailwind layout.
- Accessible semantic HTML.
- Local API client wrapper.

## Boundaries

- No authentication.
- No database.
- No payments.
- No production deployment.
- No dashboard charts yet.
- No external UI component library.
- No public predictive accuracy claim.

## Match Simulation

The match simulation form calls the local API client wrapper. It supports manual expected-goals inputs and Auto Predict From Elo mode. Auto mode accepts team names, resolves common aliases, shows available live Elo teams, and displays suggestions when a team is unavailable. Results remain labeled as baseline or partial-data live Elo outputs, not guarantees.

## Live Elo Ratings

The live Elo ratings section calls the local API client wrapper for `getLiveEloRatingsFoundation()`. It shows computed ratings from curated World Cup fixtures plus the expanded partial international supplement, with the note: `Live Elo is based on partial curated data and is not a public accuracy claim.`

## Commands

From the repository root:

```bash
pnpm test
pnpm typecheck
pnpm build
```
