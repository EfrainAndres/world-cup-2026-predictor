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
- Historical fixture validation for years, stages, scores, results, and duplicate match IDs.
- Historical fixture winner, decision method, penalty score, and stage-order metadata.
- Historical fixture normalization into the existing `NormalizedMatch` contract.
- Deterministic unit tests with small local fixtures.

## Out Of Scope

This package does not yet include:

- Dataset downloads.
- CSV parsing.
- External APIs.
- Large raw data files.
- Complete historical World Cup coverage.
- Automated historical source synchronization.
- Complete penalty shootout detail beyond winner and penalty score metadata.
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

The historical World Cup fixtures are intentionally small curated JSON files. They are useful for validating data structure and loader behavior, but they are not enough to claim model accuracy or run complete historical backtests.
