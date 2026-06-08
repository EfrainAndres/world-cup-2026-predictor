# Data Strategy

The prediction quality of this project depends on data that is accurate, reproducible, and legally usable.

## Potential Data Sources

Possible sources to evaluate in later phases:

| Source Type | Examples | Potential Use | Notes |
| --- | --- | --- | --- |
| International match results | Kaggle datasets, football-data repositories, open football datasets | Historical outcomes, scorelines, match dates | Confirm license and update freshness. |
| FIFA rankings | FIFA public ranking pages or published files | Team strength feature or comparison baseline | Rankings may change over time and should be timestamped. |
| Elo ratings | World Football Elo or a custom Elo calculation | Baseline strength estimates | External ratings can be useful but should not replace a reproducible internal model. |
| Confederation and tournament metadata | FIFA, confederation sites, Wikipedia for references | Team region, tournament stage, neutral-site context | Use carefully and validate against primary sources where possible. |
| Betting odds, if allowed | Public odds archives | Market comparison benchmark | Licensing and ethical constraints must be reviewed first. |
| Squad and player data, if used | Public squad lists or sports APIs | Optional advanced features | This should be deferred until baseline models are reliable. |

## Data Principles

- Prefer sources with clear licensing and stable access.
- Keep raw data immutable when possible.
- Separate raw, intermediate, and model-ready datasets.
- Record data source URLs, retrieval dates, and transformation steps.
- Treat manual corrections as documented data patches.
- Avoid building fragile workflows around undocumented web scraping.

## Data Quality Rules

Future validation should check:

| Rule | Example Check |
| --- | --- |
| Required fields | Match date, home team, away team, goals, venue type, competition. |
| Type validity | Dates parse correctly, goals are non-negative integers. |
| Team identity | Team names map to canonical team IDs. |
| Duplicate detection | Same teams, date, competition, and score should not appear twice unless documented. |
| Chronology | Model training should not use matches after the prediction cutoff date. |
| Missingness | Missing values are counted, explained, and handled intentionally. |
| Ranges | Scores, rankings, and ratings are within plausible bounds. |
| Freshness | Data update date is visible and checked. |

## Update Strategy

Early phases should use a small, reproducible dataset to keep modeling work understandable.

Later phases should define:

1. A command to fetch or refresh raw data.
2. A command to build processed datasets.
3. A command to run data validation.
4. A changelog or metadata file for dataset versions.
5. A clear cutoff date for each model training run.

## Data Directory Direction

The exact structure will be decided in Phase 0.1. A likely direction is:

| Directory | Purpose |
| --- | --- |
| `data/raw/` | Original downloaded or manually captured data. |
| `data/interim/` | Cleaned but not final data. |
| `data/processed/` | Model-ready datasets. |
| `data/exports/` | Outputs for the future dashboard. |
| `reports/data/` | Data quality reports. |

Large data files may eventually need Git LFS, external storage, or reproducible download scripts instead of normal Git tracking.

## Key Risks

| Risk | Mitigation |
| --- | --- |
| Source license uncertainty | Review terms before using or redistributing data. |
| Team naming inconsistencies | Create canonical team IDs and mapping tables. |
| Historical competition differences | Track competition type and match context. |
| Data leakage | Enforce date cutoffs in feature generation and validation. |
| Stale data | Add freshness checks and visible update metadata. |
| Overcomplicated data collection | Start with a minimal reliable dataset before adding advanced features. |
