# World Cup 2026 Full Team Coverage

Phase 10.2 expands Auto Predict From Elo coverage so every expected World Cup 2026 team can be selected in the dashboard, even when the current partial Live Elo pipeline has limited or no match history for that team.

This is a coverage foundation, not a calibration claim.

## Coverage List

| Group | Teams |
| --- | --- |
| A | Mexico, South Africa, South Korea, Czechia |
| B | Canada, Bosnia-Herzegovina, Qatar, Switzerland |
| C | Brazil, Morocco, Haiti, Scotland |
| D | United States, Paraguay, Australia, Turkey |
| E | Germany, Curacao, Ivory Coast, Ecuador |
| F | Netherlands, Japan, Sweden, Tunisia |
| G | Belgium, Egypt, Iran, New Zealand |
| H | Spain, Cape Verde, Saudi Arabia, Uruguay |
| I | France, Senegal, Iraq, Norway |
| J | Argentina, Algeria, Austria, Jordan |
| K | Portugal, DR Congo, Uzbekistan, Colombia |
| L | England, Croatia, Ghana, Panama |

## Behavior

- Teams already present in the Live Elo pipeline keep their computed Elo rating, rank, and matches-played count.
- Teams missing from the current Live Elo pipeline receive a fallback seed rating of `1500`.
- Fallback teams are marked with `ratingSource: "fallback_seed"` in `predictMatchFromLiveElo()` metadata.
- Pipeline-rated teams are marked with `ratingSource: "live_elo_pipeline"`.
- Fallback seed ratings are uncalibrated and exist only so the dashboard can run Auto Predict for all expected 48 teams.

## Alias Coverage

The API resolves common names, FIFA names, accents, and abbreviations before checking the available team list.

Examples covered by tests:

- Haiti
- Curacao / Curaçao
- DR Congo / Congo DR / Democratic Republic of the Congo
- Cape Verde
- Turkey / Türkiye
- Bosnia-Herzegovina / Bosnia and Herzegovina
- Ivory Coast / Côte d'Ivoire
- South Korea / Korea Republic
- Czechia / Czech Republic
- United States / USA / US / USMNT

## API Notes

`getAvailableLiveEloTeams()` now returns the sorted 48-team World Cup 2026 coverage list.

`predictMatchFromLiveElo()` returns additional Live Elo metadata:

- `homeGroup`
- `awayGroup`
- `homeRatingSource`
- `awayRatingSource`
- `fallbackSeedRating`

When a fallback team is used, the response warnings include the fallback team names and clearly state that the fallback rating is not calibrated.

## Validation

Phase 10.2 adds tests for:

- All 48 canonical team names.
- Key alias variants.
- Auto Predict From Elo success for Haiti vs Scotland.
- Auto Predict From Elo success for Australia vs Turkey.
- Auto Predict From Elo success for Germany vs Curacao.
- Auto Predict From Elo success for Portugal vs DR Congo.
- Dashboard E2E coverage for Haiti vs Scotland.

## Limitations

- The Live Elo dataset remains partial.
- Fallback seed ratings are not model-quality ratings.
- Prediction output remains a foundation model result, not betting advice.
- No public accuracy claim should be made from these fallback-enabled predictions.

