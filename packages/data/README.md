# Data Package

`packages/data` contains the TypeScript foundation for data contracts, normalization, validation, and future data pipeline work.

## Current Scope

This package currently includes:

- Match result input types.
- Normalized match types.
- Required-field validation.
- Date validation.
- Team-name validation.
- Score validation.
- Result-value validation.
- Neutral-site validation.
- Team-name normalization.
- Result-value standardization.
- Date parsing to ISO output.
- Result derivation from completed-match scores.
- Curated historical World Cup fixture loading.
- Complete curated 2010, 2014, 2018, and 2022 World Cup fixture results.
- Historical fixture validation for years, stages, stage order, scores, results, winners, penalties, source notes, duplicate match IDs, and expected match counts.
- Historical fixture winner, decision method, penalty score, and stage-order metadata.
- Historical fixture normalization into the existing `NormalizedMatch` contract.
- Deterministic unit tests with local curated fixtures.

## Out Of Scope

This package does not yet include:

- Dataset downloads.
- CSV parsing.
- External APIs.
- Large raw data files.
- Automated historical source synchronization.
- Complete penalty shootout detail beyond winner and penalty score metadata.
- Player-level, lineup, injury, venue, xG, or pre-match rating data.
- Elo ratings.
- Poisson or Dixon-Coles modeling.
- Monte Carlo simulation.
- Database persistence.

## Commands

From the repository root:

```bash
pnpm install
pnpm test:data
pnpm --filter @world-cup-2026-predictor/data typecheck
```

These commands require `pnpm` and workspace dependencies to be installed.

## Design Notes

The package follows `docs/DATA_DICTIONARY.md` for planned field names and `docs/ARCHITECTURE.md` for layer boundaries. Model logic belongs in `packages/model`, not this package.

The historical World Cup fixtures are curated JSON files for complete 2010, 2014, 2018, and 2022 tournament results. They are useful for fixture-level validation and future backtesting reports, but they are not enough on their own to claim model accuracy.
