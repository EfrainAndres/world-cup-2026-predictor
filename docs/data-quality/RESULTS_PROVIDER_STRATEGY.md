# Results Provider Strategy

Phase 10.4A prepares World Cup 2026 standings for multiple result sources without adding an external integration.

The current implementation uses a normalized local static provider. Future phases can add manual override or external API providers behind the same result contract.

## Provider Contract

Fixture structure and match results are intentionally separate.

Fixtures describe tournament structure:

- fixture ID
- group
- matchday and order
- home team
- away team
- scheduled/completed status for structure display
- deferred date and venue metadata

Results describe scores:

- `fixtureId`
- `status`: `scheduled` or `completed`
- `homeScore`
- `awayScore`
- `resultSource`: `local_static`, `manual_override`, or `external_api`
- optional `updatedAt`

Standings consume normalized result records by fixture ID. They do not depend on hardcoded score fields inside fixture objects.

## Current Provider

The active provider is the local static provider.

| Field | Value |
| --- | --- |
| `providerName` | `local static provider` |
| `resultSource` | `local_static` |
| `externalProviderEnabled` | `false` |
| `localOverridesEnabled` | `true` |
| `dataUpdatedAt` | `2026-06-14` |

No network calls, secrets, databases, or external services are used.

## Included Local Results

The local static provider currently includes these normalized completed results:

| Fixture | Score | Source |
| --- | --- | --- |
| Mexico vs South Africa | 2-0 | `local_static` |
| South Korea vs Czechia | 2-1 | `local_static` |
| Canada vs Bosnia-Herzegovina | 1-1 | `local_static` |
| United States vs Paraguay | 4-1 | `local_static` |
| Qatar vs Switzerland | 1-1 | `local_static` |
| Brazil vs Morocco | 1-1 | `local_static` |
| Haiti vs Scotland | 0-1 | `local_static` |
| Australia vs Turkey | 2-0 | `local_static` |

Scheduled fixtures without a completed result record are ignored by standings.

## API Metadata

`getWorldCup2026GroupStandingsFoundation()` exposes `resultProvider` metadata so consumers can tell where standings results came from.

The response includes:

- provider name
- result source
- external provider enabled flag
- local overrides enabled flag
- result count
- data update date
- provider warnings

The response also warns that standings are based on local normalized results until an external provider is added.

## Future Provider Path

Future work can add:

- manual override result files for locally corrected scores
- external API normalization adapters
- freshness and provider health metadata
- source priority rules between local overrides and external API records
- validation checks for duplicate fixture IDs, missing fixture IDs, score ranges, and stale updates

External provider work should keep the standings engine unchanged. The integration should normalize incoming data into `WorldCup2026FixtureResult` records first, then pass those records to the standings calculation.

## Boundaries

- No external API integration yet.
- No live score service.
- No secrets.
- No database.
- No dependencies.
- No betting advice or public accuracy claim.
