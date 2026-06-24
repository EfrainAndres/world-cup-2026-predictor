# Live Standings Completed-Fixture Reconciliation

Phase 12.18B8C fixes a standings reconciliation gap where valid completed football-data.org group-stage results could be normalized successfully but then be skipped by grouped standings if the provider listed the teams in the reverse order from the repository's canonical fixture template.

Production prediction formulas, Elo/xG constants, snapshot identities, evaluation identities, migrations, scheduled capture, provider selection, and timezone behavior are unchanged.

## Root Cause

The live standings pipeline already used normalized football-data.org match records as grouped-standings truth:

```text
football-data.org matches
-> normalized external fixture records
-> canonical fixture resolution
-> buildWorldCup2026GroupStandings()
```

Fixture resolution first checked `providerFixtureId` against the internal canonical fixture ID, then fell back to a normalized team-pair key:

```text
homeTeam|awayTeam
```

Real provider IDs are numeric football-data.org IDs, so they do not match canonical fixture IDs. When the provider supplied a valid result with teams reversed from the canonical template, the order-sensitive fallback missed it.

Examples:

| Provider result | Canonical fixture | Previous behavior | Correct behavior |
| --- | --- | --- | --- |
| `Portugal 5-0 Uzbekistan` | `Portugal vs Uzbekistan` | Accepted | Accepted |
| `Colombia 1-0 Congo DR` | `DR Congo vs Colombia` | Rejected as unresolved | Accepted, score swapped to canonical `DR Congo 0-1 Colombia` |
| `England 0-0 Ghana` | `England vs Ghana` | Accepted | Accepted |
| `Panama 0-1 Croatia` | `Croatia vs Panama` | Rejected as unresolved | Accepted, score swapped to canonical `Croatia 1-0 Panama` |

## Reconciliation Rules

The standings adapter now resolves fixtures in this order:

1. `providerFixtureId` matching the canonical internal fixture ID.
2. Canonicalized direct team pair: `homeTeam|awayTeam`.
3. Canonicalized reversed team pair: `awayTeam|homeTeam`.

When reversed team-pair resolution is used, the provider score is swapped into the canonical home/away orientation before it is passed to `buildWorldCup2026GroupStandings()`.

Canonical kickoff timestamps remain UTC and are not part of fixture identity.

## Accepted Completed Records

A completed provider record contributes to official standings only when:

- status is `finished`;
- both final scores are non-negative integers;
- provider group is missing or maps to the resolved canonical group;
- both teams canonicalize to the World Cup 2026 team list;
- the record resolves to one canonical group-stage fixture;
- the fixture has not already contributed to the same standings calculation;
- the record is not after the requested cutoff.

Scheduled, live, halftime, postponed, cancelled, malformed, unresolved, duplicate, future, and knockout records do not contribute to official standings.

Live provisional standings remain separate. They start with the same accepted completed records and add valid current `live` or `halftime` scores without double-counting fixtures.

## Metadata Counts

`completedMatchCount` now reflects accepted completed records used by official standings, not merely the raw count of provider records with `finished` status.

When provider finished records are rejected during validation, `syncMetadata.warnings` includes an accepted-versus-provider count message, and `standingsIssues` contains the structured rejection reasons.

## Structured Issues

Rejected records continue to use the existing typed issue codes, including:

- `invalid_group_label`
- `missing_group_label`
- `provider_group_mismatch`
- `unresolved_canonical_team`
- `provider_fixture_unresolved`
- `duplicate_fixture`
- `invalid_finished_score`
- `future_record_excluded`

One rejected record must not corrupt valid groups.

## Group K and L Regression

With the known completed results, Group K is expected to be:

| Team | P | W | D | L | GF | GA | GD | Pts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Colombia | 2 | 2 | 0 | 0 | 4 | 1 | +3 | 6 |
| Portugal | 2 | 1 | 1 | 0 | 6 | 1 | +5 | 4 |
| DR Congo | 2 | 0 | 1 | 1 | 1 | 2 | -1 | 1 |
| Uzbekistan | 2 | 0 | 0 | 2 | 1 | 8 | -7 | 0 |

Group L is expected to be:

| Team | P | W | D | L | GF | GA | GD | Pts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| England | 2 | 1 | 1 | 0 | 4 | 2 | +2 | 4 |
| Ghana | 2 | 1 | 1 | 0 | 1 | 0 | +1 | 4 |
| Croatia | 2 | 1 | 0 | 1 | 3 | 4 | -1 | 3 |
| Panama | 2 | 0 | 0 | 2 | 0 | 2 | -2 | 0 |

## Boundaries

This phase does not:

- change football-data.org synchronization;
- change fallback provider selection;
- change Colombia timezone display behavior;
- use provider global `TOTAL`/`HOME`/`AWAY` standings as grouped truth;
- change projected standings;
- change prediction, Elo, xG, snapshot, evaluation, persistence, or migration behavior.

## Next Phase

Phase 12.18B9 should implement automatic evaluation of eligible completed fixtures against existing immutable pre-match snapshots, using the corrected completed-result acceptance path as input.
