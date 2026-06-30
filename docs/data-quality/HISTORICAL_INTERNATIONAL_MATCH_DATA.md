# Historical International Match Data

## Phase 12.21A2 Summary

Phase 12.21A2 expands the offline scored-match foundation used by the attack/defense goal-model backtest. It reuses existing committed normalized fixture data and does not add runtime downloads, credentials, raw event data, snapshots, evaluations, or production prediction behavior.

## Sources

| Source | Scope | License/usage status | Commit policy |
|---|---:|---|---|
| `packages/data/fixtures/world-cup/world-cup-2010-results.json` | 64 scored fixtures | Curated factual World Cup records indexed in `docs/data-quality/HISTORICAL_DATASET_SOURCES.md` | Committed normalized fixture artifact |
| `packages/data/fixtures/world-cup/world-cup-2014-results.json` | 64 scored fixtures | Curated factual World Cup records indexed in `docs/data-quality/HISTORICAL_DATASET_SOURCES.md` | Committed normalized fixture artifact |
| `packages/data/fixtures/world-cup/world-cup-2018-results.json` | 64 scored fixtures | Curated factual World Cup records indexed in `docs/data-quality/HISTORICAL_DATASET_SOURCES.md` | Committed normalized fixture artifact |
| `packages/data/fixtures/world-cup/world-cup-2022-results.json` | 64 scored fixtures | Curated factual World Cup records indexed in `docs/data-quality/HISTORICAL_DATASET_SOURCES.md` | Committed normalized fixture artifact |
| `international-matches-expanded-v1` supplement | 56 scored fixtures | Existing curated sample for validation and Elo pipeline foundation work | Committed compact normalized supplement |

No raw event-level StatsBomb data is committed. No match results were invented.

## Normalized Contract

The API layer exposes scored fixtures through `HistoricalInternationalScoredFixture`:

| Field | Purpose |
|---|---|
| `fixtureId` | Deterministic source fixture identity |
| `kickoffAt` | ISO timestamp used for chronological cutoff checks |
| `competitionId` | Competition/source label |
| `homeTeam`, `awayTeam` | Canonicalized team names |
| `homeGoals`, `awayGoals` | Eligible score, excluding penalty shootout goals |
| `neutralVenue` | Neutral-site flag |
| `competitionWeightKey` | Existing live-Elo competition weight category |
| `sourceId` | Source provenance |

## Score Policy

World Cup scores use the committed scored fixture files. Extra-time scores remain part of the final eligible score when the source fixture stores them that way. Penalty shootout goals are not folded into `homeGoals` or `awayGoals`.

## Canonicalization

The loader reuses the existing team alias system. Phase 12.21A2 adds historical aliases for `DPR Korea`, `Korea DPR`, `Republic of Korea`, and `United States of America`. Existing aliases cover `Korea Republic`, `IR Iran`, `Côte d'Ivoire`, `Congo DR`, `Türkiye`, `Czech Republic`, `Curaçao`, and `Cape Verde Islands`.

## Competition Mapping

Competition weights reuse existing live-Elo categories only:

| Input | Weight key |
|---|---|
| FIFA World Cup and `*-WC-*` / `EXP-WC22-*` fixtures | `fifa_world_cup` |
| World Cup qualifiers and `EXP-WCQ*` fixtures | `world_cup_qualifier` |
| Copa America and Euro supplement fixtures | `continental_championship` |
| Nations League | `nations_league` |
| Friendly supplement fixtures | `international_friendly` |

No new K-factor or competition-weight values were introduced.

## Duplicate Policy

Duplicate detection uses canonical home team, canonical away team, kickoff timestamp, competition, and final score. Exact duplicates are excluded deterministically using source priority. Same teams, timestamp, and competition with conflicting scores are reported as structural issues rather than merged.

## Before/After Coverage

| Metric | Phase 12.21A source | Phase 12.21A2 expanded source |
|---|---:|---:|
| Accepted scored fixtures | 184 | 312 |
| Date range | 2018-06-14 to 2024-07-14 | 2010-06-11 to 2024-07-14 |
| Unique teams | 50 | 60 |
| Neutral-site fixtures | 163 | 291 |
| Duplicate fixtures | 0 | 0 |
| Conflicting duplicates | 0 | 0 |
| Unknown competition-weight mappings | 0 | 0 |
| No-look-ahead violations | 0 | 0 |

## Fixtures By Year

| Year | Accepted fixtures |
|---|---:|
| 2010 | 64 |
| 2014 | 64 |
| 2018 | 64 |
| 2022 | 76 |
| 2023 | 13 |
| 2024 | 31 |

## Fixtures By Source

| Source | Accepted fixtures |
|---|---:|
| `curated_world_cup_results` | 256 |
| `international-matches-expanded-v1` | 56 |

## Evaluation Coverage

| Evaluation | Fallback rate before | Fallback rate after | Median prior matches after | Partial-or-better after |
|---|---:|---:|---:|---:|
| WC2018 | 100.0% | 31.3% | 5 | 53.1% |
| WC2022 | 25.0% | 9.4% | 8.5 | 71.9% |
| Combined | 62.5% | 20.3% | 7 | 62.5% |

WC2018 still misses the stricter data-ready target because 10 of 32 teams have zero prior matches before the 2018 cutoff. WC2022 improves below the fallback target but still misses the median-history target.

## No-Look-Ahead Protection

Profiles use strict-before semantics:

```text
historical fixture kickoff < evaluation fixture cutoff
```

The validation artifact records zero leakage violations. WC2026 fixtures are excluded completely.

## Data Decision

`historical_data_partial`

Blocking reasons:

- `wc2018_zero_history`
- `wc2018_fallback_rate_high`
- `median_history_too_low`

The combined Phase 12.21A promotion prerequisite is now satisfied because fallback profile rate is 20.3%, below the existing 50% decision threshold. The remaining blocker is candidate calibration in the goal-model decision, not combined profile coverage.

## Reproducibility

```bash
pnpm --filter @world-cup-2026-predictor/api historical-data:validate
pnpm --filter @world-cup-2026-predictor/api goal-model:compare
```

Artifacts:

- `docs/model-results/artifacts/historical-international-data-coverage.json`
- `docs/model-results/artifacts/attack-defense-goal-model-comparison.json`
- `docs/model-results/artifacts/attack-defense-team-profiles.json`
