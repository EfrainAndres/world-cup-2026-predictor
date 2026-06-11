# Live Elo Pipeline Foundation

Phase 7.0A introduced a live Elo rating pipeline that computes current team ratings from available historical match data, replacing the static curated seed ratings used in earlier dashboard phases.

## What This Phase Delivers

- `packages/model/src/live-elo-pipeline.ts` — pure pipeline function accepting `EloMatch[]` and returning ranked team ratings.
- `packages/api/src/live-elo-data.ts` — embedded curated historical World Cup fixture data (2010, 2014, 2018, 2022) as typed `EloMatch` constants.
- `getLiveEloRatingsFoundation()` API handler returning the top 15 teams computed from 256 World Cup matches.
- New types: `LiveEloDataCoverage`, `LiveEloPipelineInput`, `LiveEloRankedEntry`, `LiveEloPipelineResult` in the model package.
- New API types: `LiveEloRatedTeamEntry`, `LiveEloRatingsFoundationResponse` in the API package.

## How the Pipeline Works

1. The caller supplies a list of `EloMatch` entries (match ID, date, home team, away team, neutral site flag, result).
2. Matches are sorted chronologically by match date, then match ID.
3. Elo ratings are processed sequentially using `processMatches` from the existing `elo.ts` module.
4. Teams are ranked by final rating descending, with alphabetical tie-breaking.
5. Match counts per team are tracked separately.
6. Warnings are attached if the data coverage is not complete international history or if teams have sparse match data (fewer than 3 matches).

## Data Foundation

The `getLiveEloRatingsFoundation()` handler uses 256 curated World Cup fixtures spanning 2010, 2014, 2018, and 2022. These are the same fixtures used by the historical validation and replay pipelines in `packages/data/fixtures/world-cup/`.

| Tournament | Matches | Teams |
| --- | --- | --- |
| 2010 FIFA World Cup | 64 | 32 |
| 2014 FIFA World Cup | 64 | 32 |
| 2018 FIFA World Cup | 64 | 32 |
| 2022 FIFA World Cup | 64 | 32 |
| **Total** | **256** | **53 unique** |

All teams start at the default initial Elo rating (1500). Ratings are updated sequentially across all four tournaments in chronological order.

## Sample Output (Top 10 — approximate)

Ratings below are illustrative and may change if the Elo constants are tuned.

| Rank | Team | Approx. Elo |
| --- | --- | --- |
| 1 | Netherlands | ~1606 |
| 2 | France | ~1588 |
| 3 | Argentina | ~1571 |
| 4 | Belgium | ~1564 |
| 5 | Germany | ~1562 |
| 6 | Brazil | ~1555 |
| 7 | Spain | ~1539 |
| 8 | Colombia | ~1535 |
| 9 | Uruguay | ~1532 |
| 10 | Croatia | ~1529 |

These ratings differ from the static curated seed ratings in `getTeamRatingsFoundation()` because they are computed from actual match outcomes rather than manually assigned.

## Assumptions

- All teams start at 1500 (the default initial Elo rating) before the first match in the dataset.
- The K-factor is 20 (the default from `DEFAULT_ELO_CONFIG`).
- There is no home advantage adjustment. All World Cup matches are played on neutral sites, so `neutral_site: true` for all fixtures.
- Matches decided by penalty shootout are recorded as draws in the `result` field, which means neither team gains or loses rating from the shootout itself.
- The pipeline does not apply competition weighting, recency weighting, or goal-margin adjustments.

## Limitations

- Elo ratings reflect only World Cup performance (four tournaments). Teams that perform well in World Cup qualifiers or friendly matches are not rewarded here.
- Starting from 1500 for all teams means early tournament results carry more weight relative to later ones.
- Teams with fewer than 3 matches in the dataset have less reliable ratings.
- The pipeline is not calibrated. No tuning has been done to optimize K-factor, initial rating, or other hyperparameters against historical predictive accuracy.
- This is a `world_cup_fixtures_only` foundation, not a complete international match history pipeline.

## Determinism

The pipeline is deterministic for a given input. The same set of matches in any order produces the same output because matches are sorted chronologically before processing. The API handler `getLiveEloRatingsFoundation()` uses a fixed embedded dataset and produces identical results on every call.

## Accuracy Claims

This pipeline produces foundation evidence only. The ratings computed here should not be presented as calibrated pre-tournament probability forecasts. No accuracy claims have been validated for this pipeline output.

## Next Steps

- Add recency weighting to reduce the influence of older matches.
- Include qualification and friendly matches for a richer data history.
- Apply home advantage adjustments for non-neutral-site matches.
- Calibrate K-factor and initial rating against historical predictive accuracy metrics.
- Expose the pipeline to the dashboard once ratings are validated.
