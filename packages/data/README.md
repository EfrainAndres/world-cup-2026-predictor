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
- Deterministic unit tests with small local fixtures.

## Out Of Scope

This package does not yet include:

- Dataset downloads.
- CSV parsing.
- External APIs.
- Large raw data files.
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
