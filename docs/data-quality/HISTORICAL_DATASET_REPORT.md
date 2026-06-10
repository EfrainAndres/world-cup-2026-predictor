# Historical Dataset Report

Phase 4.0F adds a small curated historical FIFA World Cup fixture foundation for future backtesting.

This report describes the dataset structure and validation coverage. It does not claim model accuracy.

## Data Added

| File | Tournament | Scope | Matches |
| --- | --- | --- | --- |
| `packages/data/fixtures/world-cup/world-cup-2018-results.json` | FIFA World Cup 2018 | Semi-finals, third-place match, final | 4 |
| `packages/data/fixtures/world-cup/world-cup-2022-results.json` | FIFA World Cup 2022 | Semi-finals, third-place match, final | 4 |

The fixtures are intentionally lightweight. They are meant to prove the data structure, validation behavior, and future backtesting path before adding larger historical datasets.

## Why 2018 And 2022 First

2018 and 2022 were selected first because they are recent World Cups with familiar teams, well-documented knockout results, and useful candidate backtesting periods already named in `docs/BACKTESTING_STRATEGY.md`.

They also give the project two different tournament contexts:

- 2018: recent pre-2026 European-hosted tournament cycle.
- 2022: most recent completed men's World Cup before 2026.

## What Is Validated

The data package now validates:

- Fixture file shape.
- Required fields.
- Supported tournament year.
- Supported stage value.
- ISO-compatible match date.
- Non-empty and distinct teams.
- Non-negative integer scores.
- Result values.
- Result consistency with score.
- Winner and decision method metadata.
- Penalty scores when a match is decided by penalties.
- Stage-order metadata for deterministic extraction.
- Neutral-site boolean.
- Duplicate `match_id` values.

## What Is Not Validated Yet

Current validation does not yet cover:

- Complete tournament coverage.
- Official venue, city, referee, or attendance metadata.
- Full penalty shootout detail beyond winner and score.
- Complete extra-time event metadata.
- Group standings.
- Official FIFA tie-breaker reconstruction.
- Cross-source reconciliation.
- Automated freshness or source synchronization.

## How This Supports Future Backtesting

This phase gives future backtesting work a deterministic input shape:

1. Load curated fixture JSON.
2. Validate every match.
3. Normalize fixtures into the existing `NormalizedMatch` contract.
4. Feed normalized results into future model scoring and backtesting commands.
5. Document metrics without claiming more than the data can support.

Future phases should expand the dataset only after source rights, provenance, and quality checks are clear.
