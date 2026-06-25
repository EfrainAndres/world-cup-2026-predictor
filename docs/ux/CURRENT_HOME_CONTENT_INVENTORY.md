# Current Home Content Inventory

Phase 12.19A inventory of the current Home page. This is a documentation-only audit of `apps/web/app/page.tsx` and directly rendered dashboard components.

Counting rule: top-level visible Home regions are counted in render order. The plain divider rows such as `Summary` and `Projected final` are counted because they create separate visual stops in the page.

## Current Render Order

| # | Current Region | Component / Source | Primary Data Source | User Purpose | Visual Weight | Duplication / Overlap | Classification | Explanation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Application header and anchor navigation | `AppHeader` in `apps/web/src/components/AppHeader.tsx` | Static route/anchor list | Navigate the dashboard | Medium | Mirrors implementation sections rather than user tasks | simplify_on_home | Keep brand/navigation, replace long anchor list with compact route navigation later. |
| 2 | Dashboard intro and runtime status | Inline section in `apps/web/app/page.tsx` | `getProductionRuntimeDiagnostics()`, live sync metadata | Explain product and runtime state | High | Repeats provider/database state later in match and group sections | simplify_on_home | Keep one short status line; move detailed diagnostics to Model page. |
| 3 | Foundation preview wrapper | Inline section with `SectionHeader` in `page.tsx` | `getDashboardSnapshot()` | Frame model/API evidence | Medium | Overlaps model status and historical audit cards | move_to_model | Evidence matters, but not as the second major Home task. |
| 4 | Model status card | `ModelStatusCard` | Health, model info, runtime diagnostics | Show model/runtime readiness | Medium | Repeats status/provenance concepts across Home | move_to_model | Home should show a compact model status summary only. |
| 5 | Historical replay audit preview | `HistoricalReplayAuditPreviewCard` | Historical replay audit | Show validation readiness | Medium | Overlaps full historical validation at bottom | move_to_model | Evidence preview belongs in Model/Evidence center. |
| 6 | Interactive match simulation | `MatchSimulationForm` | Fixture foundation, initial match context, simulation APIs | Let user run Auto Predict | High | Competes with Today's Matches for first action | move_to_predictions | Keep a featured prediction CTA on Home; move the full form to `/predictions`. |
| 7 | Today's World Cup Matches | `TodaysMatchesSection` | `buildDashboardDailyMatchesFromSync()` and daily matches API | Show current daily fixtures/results | High | Some prediction/history/context detail overlaps match and model pages | keep_on_home | This is the strongest sports-first Home content; simplify cards and keep. |
| 8 | Live Elo ratings | `LiveEloRatingsSection` | Live Elo foundation | Explain rating input coverage | High | Technical input duplicates model status and team ratings | move_to_model | Rating inputs are model detail, not primary Home content. |
| 9 | Static contender ratings | `TeamRatingsSection` | Team ratings foundation | Show team strength tiers | Medium | Overlaps Live Elo and prediction tool inputs | move_to_model | Useful support data; route-level model/prediction context is better. |
| 10 | `Summary` divider | Inline divider in `page.tsx` | None | Create visual section break | Low | Adds scroll stop without content | remove_or_merge | Future Home should use real section headers, not many divider rows. |
| 11 | Tournament Projection Overview | `TournamentProjectionOverviewSection` | Knockout winner resolution, third-place match | Summarize projection state | High | Overlaps champion, bracket, tournament simulation | simplify_on_home | Keep one tournament outlook summary only. |
| 12 | Champion Projection Summary | `WorldCupChampionProjectionSummarySection` | Knockout winner resolution | Show projected champion/runner-up | High | Overlaps tournament overview and simulation estimates | simplify_on_home | Fold into the tournament outlook Home section. |
| 13 | `Projected final` divider | Inline divider | None | Separate final projection group | Low | Adds visual friction | remove_or_merge | Move round detail to `/tournament`. |
| 14 | Final match simulation | `WorldCupFinalMatchSimulationSection` | Final match simulation foundation | Show final match probabilities | High | Overlaps final foundation and champion summary | move_to_tournament | Detail belongs to tournament page. |
| 15 | Projected Final | `WorldCupFinalSimulationSection` | Final foundation | Show finalists and final fixture | Medium | Overlaps final match simulation | move_to_tournament | Combine with tournament bracket/detail. |
| 16 | `Projected semifinals` divider | Inline divider | None | Separate semifinal projection group | Low | Adds visual friction | remove_or_merge | Move round detail to `/tournament`. |
| 17 | Semifinal match simulations | `WorldCupSemifinalMatchSimulationSection` | Semifinal match simulation foundation | Show semifinal probabilities | High | Overlaps semifinal projection | move_to_tournament | Tournament detail. |
| 18 | Projected Semifinals | `WorldCupSemifinalSimulationSection` | Semifinal foundation | Show semifinal fixtures | Medium | Overlaps semifinal match simulations | move_to_tournament | Tournament detail. |
| 19 | `Projected quarterfinals` divider | Inline divider | None | Separate quarterfinal group | Low | Adds visual friction | remove_or_merge | Move round detail to `/tournament`. |
| 20 | Quarterfinal match simulations | `WorldCupQuarterfinalMatchSimulationSection` | Quarterfinal match simulation foundation | Show quarterfinal probabilities | High | Overlaps quarterfinal projection | move_to_tournament | Tournament detail. |
| 21 | Projected Quarterfinals | `WorldCupQuarterfinalSimulationSection` | Quarterfinal foundation | Show quarterfinal fixtures | Medium | Overlaps quarterfinal match simulations | move_to_tournament | Tournament detail. |
| 22 | `Projected early knockout` divider | Inline divider | None | Separate early knockout group | Low | Adds visual friction | remove_or_merge | Move round detail to `/tournament`. |
| 23 | Round of 16 match simulations | `WorldCupRoundOf16MatchSimulationSection` | Round-of-16 match simulation foundation | Show Round-of-16 probabilities | High | Overlaps Round-of-16 projection and R32 simulation | move_to_tournament | Tournament detail. |
| 24 | Projected Round of 16 | `WorldCupRoundOf16SimulationSection` | Round-of-16 foundation | Show Round-of-16 fixtures | Medium | Overlaps match simulations | move_to_tournament | Tournament detail. |
| 25 | Round of 32 match simulations | `WorldCupKnockoutSimulationSection` | Knockout simulation foundation | Show Round-of-32 probabilities | High | Overlaps Round-of-32 foundation | move_to_tournament | Tournament detail. |
| 26 | Projected Round of 32 | `WorldCupRoundOf32Section` | Round-of-32 foundation | Show knockout entry fixtures | Medium | Overlaps Round-of-32 simulations | move_to_tournament | Tournament detail. |
| 27 | `Third place match` divider | Inline divider | None | Separate third-place group | Low | Adds visual friction | remove_or_merge | Move to tournament detail. |
| 28 | Third Place Match simulation | `WorldCupThirdPlaceMatchSimulationSection` | Third-place simulation foundation | Show third-place probabilities | Medium | Overlaps third-place fixture foundation | move_to_tournament | Tournament detail. |
| 29 | Projected Third Place Match | `WorldCupThirdPlaceMatchSection` | Third-place match foundation | Show third-place fixture | Medium | Overlaps third-place simulation | move_to_tournament | Tournament detail. |
| 30 | `Audit detail` divider | Inline divider | None | Separate audit group | Low | Adds visual friction | remove_or_merge | Technical audit does not need Home divider. |
| 31 | Projected Tournament Winner | `WorldCupKnockoutWinnerResolutionSection` | Knockout winner resolution | Show deterministic winner path | High | Overlaps champion summary and tournament overview | move_to_tournament | Keep as tournament detail or model provenance. |
| 32 | Groups & Fixtures | `WorldCupGroupsSection` | Fixture foundation | Show all groups and fixture counts | High | Overlaps group detail routes and standings | move_to_groups | Home should show only a compact group snapshot. |
| 33 | World Cup 2026 Group Standings | `WorldCupStandingsSection` | Live group standings foundation | Show official/provisional/projected standings | High | Overlaps group detail pages | move_to_groups | Full standings belong to `/groups` and `/groups/[group]`. |
| 34 | Projected knockout bracket | `WorldCupKnockoutBracketSection` | Knockout bracket foundation | Show bracket | High | Overlaps tournament projections | move_to_tournament | Bracket is a tournament page centerpiece. |
| 35 | Foundation champion and runner-up estimates | `TournamentSimulationSection` | Tournament simulation foundation and model info | Show broad tournament estimate | Medium | Overlaps champion and tournament projection sections | move_to_tournament | Keep in tournament/model detail. |
| 36 | Replay audit and tournament summaries | `HistoricalValidationSection` | Historical tournaments and replay audit | Show validation history | High | Overlaps replay preview and prediction history evidence | move_to_model | Evidence center should own this. |

## Before Versus After

| State | Count | Notes |
| --- | ---: | --- |
| Current Home visible regions | 36 | Includes top-level sections, nested evidence cards that are presented as major cards, and divider rows. |
| Current Home without divider rows | 29 | Still too many visually equal destinations for one landing page. |
| Proposed Home sections | 8 | Header, status intro, Today's Matches, Featured Prediction, Group Snapshot, Tournament Outlook, Model Track Record, focused CTAs. |

## Classification Summary

| Classification | Count | Destination |
| --- | ---: | --- |
| keep_on_home | 1 | Today's Matches. |
| simplify_on_home | 4 | Header, intro/status, tournament overview, champion summary. |
| move_to_matches | 0 | Match pages are recommended for future detail, but current Home's match list remains on Home first. |
| move_to_groups | 2 | Groups & Fixtures, Group Standings. |
| move_to_tournament | 17 | Bracket, round details, simulations, winner path, third-place content. |
| move_to_predictions | 1 | Full Auto Predict form. |
| move_to_model | 6 | Model status, rating inputs, historical validation, replay audit. |
| move_to_history | 0 | Prediction History already exists off Home. |
| remove_or_merge | 5 | Visual divider rows. |

## Duplication and Overlap

- Model readiness appears in the intro, `ModelStatusCard`, rating sections, match simulation warnings, and projection warnings.
- Historical evidence appears as both a preview card near the top and a full validation section near the bottom.
- Tournament projections are split across overview, champion summary, each round's match simulations, each round's fixture foundation, bracket, winner resolution, and tournament simulation.
- Groups and standings are duplicated between Home and the dedicated `/groups/[group]` route.
- Technical source/fallback badges repeat across match, standings, model, and projection sections.

## Top Five Cognitive Overload Contributors

1. **Tournament round fragmentation:** final, semifinals, quarterfinals, Round of 16, Round of 32, third place, bracket, and winner resolution all compete as separate Home sections.
2. **Technical evidence too early:** model status, historical replay audit, Elo ratings, and team ratings appear before the product has centered the match experience.
3. **Long anchor navigation:** the header exposes implementation sections instead of a short sports-product navigation model.
4. **Repeated badges and warnings:** source, fallback, partial-data, model, and warning states appear in many containers.
5. **Card-heavy visual grammar:** many nested bordered containers give every metric and panel similar weight, making the page harder to scan.

## Recommended Home Outcome

Home should become a concise match-first dashboard. All existing major capabilities remain reachable through the proposed sitemap:

- matches and daily navigation: `/matches`;
- individual prediction/match context: `/matches/[fixtureId]` and `/predictions`;
- groups and standings: `/groups` and `/groups/[group]`;
- tournament progression: `/tournament`;
- model and evidence: `/model` and `/prediction-history`.
