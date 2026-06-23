# Real Standings Source Audit

## Purpose

Phase 12.18B1 audits the current World Cup 2026 standings sources before any production behavior changes. It answers one operational question:

> Which data should be trusted for grouped World Cup 2026 standings and match context when football-data.org is the live provider?

This phase is analysis only. It does not change prediction formulas, model constants, provider selection, migrations, snapshot identities, runtime behavior, or UI behavior.

## Preconditions Verified

- `origin/main` contains Phase 12.18A2 scheduled snapshot capture.
- `origin/main` contains the TypeScript CLI runtime fix that runs TypeScript CLIs through `tsx`.
- `origin/main` contains the unresolved football-data.org fixture filtering fix.
- Current branch: `analysis/phase-12-18b1-real-standings-audit`.

## Files Inspected

| Area | Files |
| --- | --- |
| Provider sync | `packages/api/src/live-results-sync.ts`, `packages/api/src/results-provider-foundation.ts` |
| Group and team foundation | `packages/api/src/world-cup-2026-teams.ts`, `packages/api/src/team-aliases.ts` |
| Standings consumers | `packages/api/src/live-group-standings.ts`, `packages/api/src/group-detail.ts` |
| Contracts | `packages/api/src/schemas.ts` |
| Tests | `packages/api/tests/live-results-sync.test.ts`, `packages/api/tests/live-group-standings.test.ts`, `packages/api/tests/group-detail.test.ts`, `packages/api/tests/results-provider-foundation.test.ts` |
| Documentation | `docs/data-quality/LIVE_RESULTS_SYNCHRONIZATION.md`, `docs/dashboard/LIVE_GROUP_STANDINGS.md`, `docs/model-results/TOURNAMENT_FORM_CALCULATION_FOUNDATION.md` |

## Current Standings Data Flow

```text
synchronizeWorldCup2026Results()
  -> football-data.org matches endpoint
  -> normalize fixture records
  -> filter unresolved fixtures
  -> split fixtures into all / live / completed
  -> fallback chain: external -> cache -> local static
  -> WorldCup2026SyncResult

getWorldCup2026LiveGroupStandings(input)
  -> completedResults only for official standings
  -> completedResults + liveMatches for provisional standings
  -> resolve external records to internal group fixtures
  -> buildWorldCup2026GroupStandings(...)

buildWorldCup2026GroupStandings(...)
  -> canonical World Cup 2026 group fixtures
  -> normalized fixture results
  -> grouped standings A-L
```

The provider standings endpoint currently passes through `WorldCup2026SyncResult.standings`, but grouped standings consumers do not use it as the authoritative table.

## Current Sources and Consumers

| Source or function | What it owns today | Consumers | Audit result |
| --- | --- | --- | --- |
| `WORLD_CUP_2026_GROUPS` | Canonical 12 groups and 48 team names | fixture foundation, standings, group detail, prediction flows | Remains canonical team/group source. |
| `WORLD_CUP_2026_GROUP_STAGE_FIXTURES` | 72 internal group-stage fixtures with stable IDs and official home/away order | live standings, group detail, snapshots, projections | Remains fixture identity source of truth. |
| `createFootballDataOrgResultsProvider()` | Fetches football-data.org matches and standings, filters unresolved matches, normalizes statuses and groups | `synchronizeWorldCup2026Results()` | Keep as provider adapter. Do not trust its standings payload for grouped standings. |
| `normalizeExternalFixtureRecords()` | Canonicalizes team names, validates scores, rejects duplicate provider fixture IDs inside one operation | provider foundation | Keep as provider-record validation. Add stronger group and team coverage diagnostics in 12.18B2. |
| `getWorldCup2026LiveGroupStandings()` | Computes official and provisional grouped standings from normalized fixture records | dashboard, group detail | Recommended grouped-standings source of truth. |
| `buildWorldCup2026GroupStandings()` | Applies standings math to canonical fixtures and result records | live standings, local fallback, projected standings | Recommended standings math source of truth. |
| `buildWorldCup2026GroupDetail()` | Composes standings, categorized fixtures, qualification, projections, and prediction-history summaries | group detail pages | Keep as consumer. It should receive real standings context from the live-standings pipeline. |
| football-data.org standings endpoint | Provider-reported global TOTAL/HOME/AWAY tables with `group=null` | currently exposed in sync result only | Not suitable for grouped standings. Use only as metadata/cross-check. |

## Provider Response Limitations

Known real-provider behavior:

- The matches endpoint returns 104 World Cup 2026 matches.
- 72 currently have resolved participants.
- Unresolved knockout fixtures are filtered upstream.
- Group-stage fixtures contain kickoff timestamps and group information.
- The standings endpoint currently returns 3 standing blocks:
  - `TOTAL`
  - `HOME`
  - `AWAY`
- Each standings block has `group=null`.
- Each table contains 48 teams.

Conclusion: the provider standings response cannot currently be treated as 12 grouped standings tables. Position in the global table must not be used to infer group membership.

## Recommended Source of Truth

Use this pipeline for authoritative grouped standings:

```text
normalized synchronized fixtures/results
  -> resolve against canonical World Cup 2026 group fixtures
  -> buildWorldCup2026GroupStandings()
  -> getWorldCup2026LiveGroupStandings()
```

Reasons:

- It preserves official group membership from `WORLD_CUP_2026_GROUPS`.
- It preserves official fixture identity and home/away order from `WORLD_CUP_2026_GROUP_STAGE_FIXTURES`.
- It supports football-data.org numeric provider IDs through team-pair fallback resolution.
- It already separates official standings from live provisional standings.
- It already deduplicates finished and live records by internal fixture ID.
- It does not depend on the provider's currently ungrouped standings endpoint.

## Real Standings Definitions

| Term | Definition | Source |
| --- | --- | --- |
| Official completed-match standings | Group standings calculated from normalized `finished` records with valid final scores only. | `getWorldCup2026LiveGroupStandings().officialGroups` |
| Provisional live standings | Group standings calculated from completed records plus active `live` or `halftime` records that include valid current scores. | `getWorldCup2026LiveGroupStandings().provisionalGroups` |
| Projected standings | Group standings calculated from completed records plus model projections for unplayed fixtures. | Group detail projection foundation, not official standings |
| Provider-reported global table | football-data.org standings endpoint rows where the provider currently returns 48-team TOTAL/HOME/AWAY tables with `group=null`. | Provider metadata / cross-check only |

## Live and Halftime Behavior

Current behavior:

- `finished` records affect official standings.
- `live` and `halftime` records affect provisional standings only when they include scores.
- Scheduled, postponed, cancelled, and unknown statuses do not affect official standings.
- A fixture already counted as finished is not counted again from live records.

This behavior should remain unchanged in 12.18B2. Live and halftime scores are provisional context, not official results.

## Team-Name Normalization Audit

Canonical World Cup 2026 names live in `WORLD_CUP_2026_GROUPS`. The current alias map covers known provider or user-facing variants:

| Canonical name | Known aliases currently covered |
| --- | --- |
| Bosnia-Herzegovina | `bosnia and herzegovina`, `bosnia herzegovina`, `bosnia` |
| Cape Verde | `cape verde islands` |
| Czechia | `czech republic` |
| DR Congo | `congo dr`, `democratic republic of the congo`, `dr congo`, `drc` |
| Iran | `ir iran` |
| Ivory Coast | `cote d'ivoire`, `ivory coast` |
| Netherlands | `holland`, `netherlands` |
| Saudi Arabia | `ksa` |
| South Korea | `korea republic`, `south korea` |
| Turkey | `turkiye` |
| United States | `u.s.`, `u.s.a.`, `us`, `usa`, `usmnt` |

Current normalizer behavior:

- trims whitespace;
- removes diacritics;
- normalizes apostrophes;
- lowercases;
- canonicalizes through `TEAM_ALIASES`;
- leaves unknown names unchanged.

Audit limitation: the repository does not currently persist a real 48-name football-data.org fixture-name artifact. This phase did not call the external API. Therefore 12.18B2 should add a captured provider-name fixture or injectable test payload proving every real provider name maps to the canonical 48-name set.

## Group Normalization Audit

Current football-data.org group normalization:

```text
GROUP_A -> A
GROUP_B -> B
...
GROUP_L -> L
```

Implementation detail:

- `normalizeGroupLabel()` strips a leading `GROUP_` prefix.
- Group detail and daily-match consumers preserve `record.group` when present.
- Live standings primarily resolve group from the internal fixture after matching by fixture ID or home/away team pair.

Required 12.18B2 validation:

- accept only `A` through `L` after normalization;
- warn on unknown group labels;
- do not infer group membership from provider standings position;
- prefer internal fixture group after resolution;
- use provider group as a cross-check, not as the sole authority.

## Completed-Result Deduplication

Current deduplication layers:

| Layer | Deduplication rule |
| --- | --- |
| Provider normalization | duplicate `providerFixtureId` inside one provider operation is rejected. |
| Live standings | completed records are adapted first; live/halftime records share the same `seenInternalIds` set, so finished records win. |
| Group detail | one match per internal fixture ID, falling back to provider fixture ID only when unresolved. |
| Tournament form | duplicate fixture contributions are skipped. |

Recommended 12.18B2 behavior:

- keep internal fixture ID as the primary dedupe key after resolution;
- use provider fixture ID as a fallback and trace field;
- warn on conflicting duplicates with different score/status/team data;
- prefer `finished` over `live` or `halftime` for the same internal fixture;
- never merge records with unresolved team identity into standings.

## No-Look-Ahead Boundaries

Current safe boundaries:

- Official standings use completed matches only.
- Provisional standings may include current live/halftime scores, but must be labeled as provisional.
- Prediction snapshots are immutable and captured before kickoff.
- Scheduled snapshot capture enforces `capturedAt < kickoffAt`.
- Model-vs-Reality evaluates stored snapshots against completed results without rerunning the model.
- Tournament form accepts `cutoffAt` and excludes future records.

Match context for future predictions must use only data available at the prediction cutoff. Completed results after `cutoffAt`, live states after `cutoffAt`, final standings, and post-match evaluation metrics must not feed pre-match prediction context.

## Recommended Use of Provider Standings Endpoint

Decision for current provider behavior:

- Do not use the football-data.org standings endpoint as grouped standings source.
- Do not expose it as official grouped standings.
- Do not infer group membership from global position.
- Preserve it only as provider metadata and optional cross-check evidence.

Potential cross-checks:

- total teams in provider global table equals 48;
- provider team names normalize into the canonical 48-team set;
- provider global played/points totals are broadly consistent with completed fixture-derived totals;
- mismatches produce warnings only, not grouped-standings replacement.

## Validation and Mismatch Warnings to Add Later

Recommended typed warning categories:

| Warning | Trigger |
| --- | --- |
| `provider_standings_not_grouped` | provider standings blocks have `group=null` or do not cover A-L |
| `provider_group_mismatch` | fixture group label disagrees with resolved internal fixture group |
| `provider_team_unresolved` | provider team name cannot be canonicalized to one of the 48 teams |
| `provider_fixture_unresolved` | record cannot resolve by providerFixtureId or canonical home/away team pair |
| `duplicate_fixture_conflict` | same internal fixture appears more than once with conflicting status or score |
| `invalid_finished_score` | finished record lacks non-negative integer scores |
| `provider_global_standings_mismatch` | provider global standings totals disagree with fixture-derived totals |

Warnings should not break valid groups when safe to continue.

## Required Conclusion

The authoritative grouped-standings pipeline should remain fixture-derived:

```text
football-data.org matches endpoint
  -> normalized fixture records
  -> canonical fixture resolution
  -> completed/live status split
  -> buildWorldCup2026GroupStandings()
  -> live group standings and group detail consumers
```

The football-data.org standings endpoint should be ignored for grouped standings, retained as provider metadata, and optionally used for cross-check warnings once a validation layer exists.

