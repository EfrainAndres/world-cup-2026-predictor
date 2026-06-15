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
- World Cup 2026 groups and fixtures section showing Groups A-L, 48 teams, 72 local group-stage fixtures, deferred date/venue metadata, and foundation warnings.
- World Cup 2026 group standings section showing local standings tables for Groups A-L with points, record, goals for/against, and goal difference.
- Projected World Cup 2026 Round of 32 section showing 32 qualified teams, 16 projected fixtures, and qualification source labels.
- Projected knockout bracket section showing the complete placeholder bracket structure from Round of 32 through the Final with Projected and Placeholder badges.
- Round of 32 knockout match simulation section showing match-level probabilities (home win, draw, away win) and top 3 scorelines for all 16 projected R32 fixtures using Live Elo ratings and the Poisson model.
- Projected Round of 16 section showing 8 projected R16 fixtures derived from R32 probabilities via deterministic winner selection, with advancement reason, R32 source matchup, and probability snapshot per qualifier.
- Round of 16 match simulation section showing match-level probabilities (home win, draw, away win) and top 3 scorelines for all 8 projected R16 fixtures using Live Elo ratings and the Poisson model. Advancement after extra time/penalties is not modeled.
- Projected Quarterfinals section showing 4 projected QF fixtures derived from R16 match probabilities via deterministic winner selection, with projected qualifier cards showing advancement reason, R16 source matchup, and probability snapshot.
- Quarterfinal match simulation section showing match-level probabilities (home win, draw, away win) and top 3 scorelines for all 4 projected QF fixtures using Live Elo ratings and the Poisson model. Advancement after extra time/penalties is not modeled.
- Champion projection summary section showing the projected champion card, projected runner-up card, final matchup, final probability snapshot, and a five-round champion path (Round of 32 → Round of 16 → Quarterfinal → Semifinal → Final) with opponents and probability snapshots. Derived from the existing knockout winner resolution snapshot — no new API handler.
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

## World Cup 2026 Groups & Fixtures

The groups and fixtures section calls `getWorldCup2026FixtureFoundation()` through the local API client wrapper. It shows static local tournament structure data only: 12 groups, 48 teams, and 72 group-stage fixtures. Dates, venues, standings, and full tournament simulation are deferred.

## World Cup 2026 Group Standings

The standings section calls `getWorldCup2026GroupStandingsFoundation()` through the local API client wrapper. It calculates standings from normalized local result provider records, shows the active result source, and ignores scheduled matches without completed results. The current provider is local static data with external providers disabled.

## World Cup 2026 Round of 32

The Round of 32 section calls `getWorldCup2026RoundOf32Foundation()` through the local API client wrapper. It derives 12 group winners, 12 runners-up, and 8 best third-place teams from current local standings, then displays 16 deterministic projected fixtures. It is a foundation view only, not the final official knockout bracket.

## World Cup 2026 Knockout Bracket

The knockout bracket section calls `getWorldCup2026KnockoutBracketFoundation()` through the local API client wrapper. It builds a complete bracket structure from Round of 32 through the Final. R32 uses the actual projected team names; R16, QF, SF, Third Place, and Final use deterministic placeholder slots (Winner R32-01, Winner R16-1, etc.). No winners are simulated and no champion probabilities are calculated.

## World Cup 2026 Round of 16 Projection

The Round of 16 projection section calls `simulateWorldCup2026RoundOf16Foundation()` through the local API client wrapper. It derives a projected winner for each of the 16 Round of 32 simulation fixtures using a deterministic rule: the team with the higher win probability advances; if win probabilities are equal, the team with the higher Live Elo rating advances; if Elo is also equal, the home team advances. The 16 projected winners are paired into 8 Round of 16 fixtures. No R16 match probabilities are computed. No quarterfinal generation. No penalties. No champion probabilities.

## World Cup 2026 Knockout Match Simulation

The knockout simulation section calls `simulateWorldCup2026KnockoutFixturesFoundation()` through the local API client wrapper. For each of the 16 projected Round of 32 fixtures, it looks up Live Elo ratings from the same pipeline used by Auto Predict From Elo, converts ratings to expected goals via `eloToExpectedGoals`, builds a Poisson score matrix, and computes home win / draw / away win probabilities plus the top 3 most likely scorelines. Teams not in the Live Elo pipeline receive a fallback seed rating of 1500 and are labeled "Partial data". No winners are selected. No teams advance. No extra time or penalty logic is applied.

## World Cup 2026 Round of 16 Match Simulation

The Round of 16 match simulation section calls `simulateWorldCup2026RoundOf16MatchesFoundation()` through the local API client wrapper. It consumes the 8 projected R16 fixtures from `simulateWorldCup2026RoundOf16Foundation()` and runs the same Live Elo → Poisson pipeline for each fixture, producing home win / draw / away win probabilities and the top 3 most likely scorelines. Teams not in the Live Elo pipeline receive a fallback seed rating of 1500 and are labeled "Partial data". No winners are selected. Advancement after extra time or penalties is not modeled in this phase.

## World Cup 2026 Quarterfinal Projection

The Quarterfinal projection section calls `simulateWorldCup2026QuarterfinalFoundation()` through the local API client wrapper. It consumes the 8 R16 simulated fixtures from `simulateWorldCup2026RoundOf16MatchesFoundation()` and applies a deterministic winner-selection rule to each: the team with the higher win probability advances; if win probabilities are equal, the team with the higher Live Elo rating advances; if Elo is also equal, the home team advances. The 8 projected QF qualifiers are paired into 4 quarterfinal fixtures. No QF match probabilities are computed. No semifinal generation. No champion probabilities.

## World Cup 2026 Quarterfinal Match Simulation

The Quarterfinal match simulation section calls `simulateWorldCup2026QuarterfinalMatchesFoundation()` through the local API client wrapper. It consumes the 4 projected QF fixtures from `simulateWorldCup2026QuarterfinalFoundation()` and runs the same Live Elo → Poisson pipeline for each fixture, producing home win / draw / away win probabilities and the top 3 most likely scorelines. Teams not in the Live Elo pipeline receive a fallback seed rating of 1500 and are labeled "Partial data". No winners are selected. Advancement after extra time or penalties is not modeled in this phase.

## Champion Projection Summary

The champion projection summary section calls `resolveWorldCup2026KnockoutWinnersFoundation()` through the local API client wrapper (same snapshot used by the detailed knockout winner resolution section). It derives the champion's five-round path by searching the `roundOf32Winners`, `roundOf16Winners`, `quarterfinalWinners`, and `semifinalWinners` arrays for the champion's name, then reads each defeated opponent and probability snapshot. No extra time, penalties, or champion probability distribution is modeled. The section displays a deterministic-only disclaimer banner.

## Commands

From the repository root:

```bash
pnpm test
pnpm typecheck
pnpm build
```
