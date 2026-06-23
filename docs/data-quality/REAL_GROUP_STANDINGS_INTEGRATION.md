# Real Group Standings Integration

Phase 12.18B2 makes normalized football-data.org match records the authoritative external input for World Cup 2026 grouped standings.

Production prediction formulas, Elo/xG constants, projections, snapshot identities, migrations, provider selection, and scheduled capture behavior are unchanged.

## Authoritative Pipeline

Grouped standings continue to use the existing engine:

```text
football-data.org matches endpoint
-> normalized fixture/result records
-> fixture identity and team-name resolution
-> buildWorldCup2026GroupStandings()
-> official grouped standings
```

`buildWorldCup2026GroupStandings()` remains the canonical calculation engine. The integration adds validation and adaptation around normalized external records before they are passed to that engine.

The football-data.org standings endpoint is not used as grouped truth while it returns global `TOTAL`, `HOME`, and `AWAY` tables with `group=null`.

## Official, Provisional, and Projected Separation

Official standings use only normalized `finished` fixtures with valid non-negative integer final scores.

Live provisional standings use:

- valid finished fixtures;
- valid current `live` fixture scores;
- valid current `halftime` fixture scores.

Finished fixtures take precedence over duplicate live records for the same internal fixture. A fixture contributes at most once to a standings calculation.

Projected standings remain separate and unchanged. Phase 12.18B2 does not change projection scoring, prediction generation, Auto Predict, Elo ingestion, tournament-form adjustment, or group-detail projection behavior.

## Group Labels

Provider group labels are normalized deterministically:

```text
GROUP_A -> A
GROUP_B -> B
...
GROUP_L -> L
```

Only canonical groups `A` through `L` are accepted.

Invalid group labels produce warnings and are skipped. Missing group labels produce warnings; a record may still contribute only when it resolves to a canonical World Cup 2026 fixture by fixture identity or official home/away team order.

No group membership is inferred from provider standings position.

## Team Names

External records are canonicalized with the existing team-alias layer before fixture matching. Phase 12.18B2 explicitly covers provider names observed in the real 48-team feed, including:

- `Bosnia-Herzegovina`
- `Cape Verde Islands` -> `Cape Verde`
- `Congo DR` -> `DR Congo`
- `Curaçao` -> `Curacao`
- `Ivory Coast`
- `South Korea`
- `United States`
- `Turkey`

Unresolved provider team names are rejected with typed standings issues rather than silently creating new teams.

## Cutoff and No-Look-Ahead

When a cutoff is supplied, records whose provider timestamp is after the cutoff are excluded from official and provisional calculations.

The cutoff uses provider `updatedAt` when present and falls back to `kickoffAt`. Future fixtures do not affect official standings.

Live provisional standings use only the current live/halftime score state supplied in normalized records. They do not infer live scores from kickoff time.

## Provider Global Standings

Provider standings remain available as provider metadata and cross-check evidence only.

When provider standings are ungrouped, the API surfaces typed issues and warnings:

- `provider_standings_not_grouped`
- `provider_global_standings_mismatch`

The grouped standings returned to consumers continue to be fixture-derived.

## Validation Issues and Warnings

The live standings response now exposes structured `standingsIssues` alongside existing warning strings.

Issue codes include:

- `invalid_group_label`
- `missing_group_label`
- `provider_group_mismatch`
- `unresolved_canonical_team`
- `provider_fixture_unresolved`
- `duplicate_fixture`
- `invalid_finished_score`
- `future_record_excluded`
- `provider_standings_not_grouped`
- `provider_global_standings_mismatch`

One invalid provider record must not corrupt valid groups. Invalid records are skipped when safe and surfaced as warnings.

## Fallback Behavior

The existing result-provider fallback chain remains unchanged:

```text
external provider
-> last valid in-memory cache
-> local static provider
```

Local static fallback remains deterministic and still produces the same local standings behavior when external data is disabled or unavailable.

## Compatibility

Existing UI contracts are preserved. `standingsIssues` is additive, and existing warning arrays continue to carry human-readable messages for UI and diagnostics.

Group detail data reuses the live standings pipeline and propagates grouped-standings warnings without recalculating standings in React.

## Limitations

- Provider global standings are not a grouped standings source.
- Tie-breakers still use the existing project engine: points, goal difference, goals for, then team name until full FIFA tie-break rules are modeled.
- Live provisional standings depend on provider-supplied live/halftime scores in normalized records.
- Provider records with missing live scores are excluded from standings contribution.
- No prediction model, calibration, projection, or snapshot behavior changed.

## Next Phase

Phase 12.18B3 should build the read-only match-context contract on top of this fixture-derived standings pipeline. It should expose group position, points, played, goal difference, recent tournament form, qualification state, fixture importance, provider freshness, and fallback state without changing prediction formulas.
