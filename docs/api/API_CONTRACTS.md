# API Contracts

Phase 5.0 API contracts are TypeScript function contracts, not HTTP contracts.

## Health

```ts
getHealth()
```

Returns service name, version, and metadata showing that server, database, and external services are disabled.

## Model Info

```ts
getModelInfo()
```

Returns supported handler names, model scope notes, and limitations.

## Match Simulation

```ts
simulateMatch({
  homeTeam,
  awayTeam,
  expectedHomeGoals,
  expectedAwayGoals,
  maxGoals,
  normalizeMatrix,
  mostLikelyScorelineLimit,
  monteCarlo
})
```

Required fields:

- `homeTeam`
- `awayTeam`
- `expectedHomeGoals`
- `expectedAwayGoals`

Optional fields:

- `maxGoals`
- `normalizeMatrix`
- `mostLikelyScorelineLimit`
- `monteCarlo.simulationCount`
- `monteCarlo.seed`
- `monteCarlo.mostCommonScorelineLimit`

The handler returns either `success` or `validation_error`.

## Historical Tournament Summary

```ts
getHistoricalTournamentSummary(year)
```

Supported years:

- 2010
- 2014
- 2018
- 2022

Unsupported years return `validation_error`.

## Historical Replay Audit

```ts
getHistoricalReplayAudit()
```

Returns historical replay readiness metadata, metric availability, component availability, known gaps, and warnings.

The audit response must not be interpreted as final predictive accuracy.
