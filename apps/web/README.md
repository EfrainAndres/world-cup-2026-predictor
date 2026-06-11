# Web Dashboard

`apps/web` contains the dashboard for World Cup 2026 Predictor (through Phase 6.6).

The app is a minimal Next.js, TypeScript, and Tailwind dashboard shell. It reads from the local `packages/api` pure handlers through a small client wrapper and does not call a network server.

## Included

- Dashboard home page.
- Header and navigation.
- Model status card.
- Interactive match simulation form.
- Match simulation preview card.
- Match simulation result cards.
- Historical replay audit preview card.
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

The match simulation form calls the local API client wrapper. It accepts team names, expected goals, max goals, and an optional simulation count. Results are displayed as baseline probabilities and likely scorelines with the note: `Baseline simulation, not a guarantee.`

## Commands

From the repository root:

```bash
pnpm test
pnpm typecheck
pnpm build
```
