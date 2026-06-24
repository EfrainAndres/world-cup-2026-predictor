# Colombia Timezone and Local Match Day

Phase 12.18B8 changes the public World Cup 2026 dashboard default match-day timezone from UTC to Colombia local time.

## Default

The named default is:

```ts
WORLD_CUP_2026_DISPLAY_TIMEZONE = "America/Bogota"
```

The UI label is:

```text
Colombia time (America/Bogota, UTC-5)
```

The implementation uses the IANA timezone identifier with `Intl.DateTimeFormat`. It does not use a fixed numeric offset as the primary date-filtering mechanism.

## Local Match-Day Rule

Daily Match Center membership is based on each fixture kickoff converted into `America/Bogota`.

Examples:

| UTC kickoff | Colombia local date | Daily Match Center date |
| --- | --- | --- |
| `2026-06-24T03:00:00Z` | `2026-06-23 22:00` | `2026-06-23` |
| `2026-06-24T05:00:00Z` | `2026-06-24 00:00` | `2026-06-24` |

This fixes the case where a late-night Colombia fixture was incorrectly grouped under the next UTC date.

## UTC Preservation

Provider and synchronized fixture records keep canonical UTC kickoff instants in `kickoffAt`.

The local date and `localizedKickoff` display fields are derived read-only values. The daily-match builder does not mutate synchronized fixture records, snapshot timestamps, database timestamps, provider sync timestamps, prediction cutoffs, or evaluation timestamps.

## Navigation

The dashboard initial selected date and the `Today` button use the current calendar date in `America/Bogota`.

Previous and Next navigation shift the selected local calendar date by whole days and send both `date` and `timezone` through the daily-matches API route. The browser timezone and Vercel server region timezone are not used implicitly.

## Explicit Overrides

API/read-model contracts remain backward-compatible:

```text
GET /world-cup-2026/daily-matches?date=2026-06-24&timezone=UTC
```

continues to filter using UTC. Invalid IANA timezone identifiers still return the existing validation-error shape.

## Scope Boundaries

This phase changes display-time defaults and daily-match grouping only.

It does not change:

- prediction formulas;
- Elo/xG or Poisson behavior;
- provider synchronization;
- snapshot or evaluation identities;
- database migrations;
- scheduled capture;
- automatic evaluation behavior.

## Future Work

Phase 12.18B9 can build on this corrected local-day boundary when adding automatic evaluation or operational checks. Any evaluation logic should continue to use canonical UTC instants for identity, cutoff, and persistence decisions while presenting match days in Colombia time.
