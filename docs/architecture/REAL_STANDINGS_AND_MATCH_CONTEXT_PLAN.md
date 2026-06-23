# Real Standings and Match Context Plan

## Purpose

This plan defines how Phase 12.18B should turn real synchronized World Cup 2026 fixture data into reliable grouped standings and match context without changing the prediction model.

Production prediction formulas remain unchanged.

## Architecture Recommendation

Use one authoritative grouped-standings pipeline:

```text
Synchronized normalized fixtures/results
  -> canonical fixture resolver
  -> fixture-derived official standings
  -> fixture-derived provisional live standings
  -> match-context read model
  -> prediction and dashboard consumers
```

Do not use the football-data.org standings endpoint as the grouped-standings source while it returns global TOTAL/HOME/AWAY tables with `group=null`.

## Source Responsibilities

| Source | Responsibility |
| --- | --- |
| `WORLD_CUP_2026_GROUPS` | Canonical group membership and team list. |
| `WORLD_CUP_2026_GROUP_STAGE_FIXTURES` | Canonical fixture identity, group, matchday, and home/away order. |
| football-data.org matches endpoint | Live external fixture status, kickoff, score, venue, provider fixture ID, provider group label. |
| football-data.org standings endpoint | Provider metadata and optional cross-check only. |
| `buildWorldCup2026GroupStandings()` | Standings math. |
| `getWorldCup2026LiveGroupStandings()` | Official and provisional grouped standings composition. |

## Proposed Match Context Contract

The match context read model should be derived at request time from synchronized fixture records, fixture-derived standings, tournament form, and provider metadata.

Suggested shape:

```ts
interface WorldCup2026MatchContext {
  fixtureId: string;
  providerFixtureId?: string;
  group: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";
  matchday?: number;
  kickoffAt?: string;
  homeTeam: string;
  awayTeam: string;

  standingsContext: {
    mode: "official" | "live_provisional";
    home: TeamStandingContext;
    away: TeamStandingContext;
    groupComplete: boolean;
  };

  tournamentForm?: {
    homeMatchesPlayed: number;
    awayMatchesPlayed: number;
    homeFormScore: number;
    awayFormScore: number;
    formulaVersion: string;
  };

  qualificationState: {
    firstPlace?: string;
    secondPlace?: string;
    thirdPlace?: string;
    thirdPlaceCurrentlyQualifying?: boolean;
    status: "official" | "provisional" | "foundation_only";
  };

  fixtureImportance: {
    level: "unknown" | "low" | "medium" | "high";
    reasons: readonly string[];
  };

  providerFreshness: {
    activeProvider: string;
    cacheUsed: boolean;
    localFallbackUsed: boolean;
    stale: boolean;
    lastSuccessfulSync?: string;
  };

  fallbackState: {
    externalProviderEnabled: boolean;
    localFallbackUsed: boolean;
    unresolvedFixture: boolean;
    warnings: readonly string[];
  };
}

interface TeamStandingContext {
  team: string;
  groupPosition: number | null;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}
```

This contract is a read model. It must not mutate standings, snapshots, evaluations, Elo ratings, or provider data.

## Real Standings Modes

| Mode | Meaning | Prediction use |
| --- | --- | --- |
| Official completed-match standings | Finished matches only, valid final scores required. | Safe before a future fixture only if every included result completed before the prediction cutoff. |
| Provisional live standings | Finished matches plus live/halftime scores. | Display context only unless an explicit future model phase decides otherwise. |
| Projected standings | Completed matches plus model-projected remaining fixtures. | Presentation/context only in current product. |
| Provider global table | football-data.org 48-team TOTAL/HOME/AWAY table. | Cross-check only. Not a grouped source. |

## No-Look-Ahead Rules

Match context must respect the prediction cutoff:

- include only completed results with `updatedAt` or kickoff/result time before the cutoff when used for pre-match context;
- exclude live and halftime state from immutable pre-match snapshots unless the snapshot is explicitly for an in-progress context, which does not exist today;
- exclude Model-vs-Reality evaluation metrics from model inputs;
- exclude provider global standings as a direct prediction input;
- never use final group standings for a snapshot captured before those standings existed.

## What Can Be Implemented Without Model Changes

These additions are compatible with current prediction formulas:

- provider-name coverage validation;
- provider group-label validation;
- fixture-derived real standings warnings;
- match-context read model;
- dashboard display of standings context;
- snapshot provenance fields describing available context;
- preflight warnings when provider fixtures cannot resolve to canonical teams or groups.

These additions should not change prediction probabilities until a later explicit model phase:

- adding group position to model inputs;
- changing Elo based on standings;
- changing xG from fixture importance;
- using provisional live standings as model signal;
- using Model-vs-Reality metrics as model signal.

## Fallback Behavior

| Condition | Behavior |
| --- | --- |
| football-data.org matches available | Use normalized fixture-derived grouped standings. |
| provider cache used | Use cached fixture-derived standings with stale/cache warning. |
| local fallback used | Use local static fixture-derived standings with local fallback warning. |
| provider standings ungrouped | Ignore for grouped standings; emit `provider_standings_not_grouped` metadata warning. |
| unresolved provider fixture | Exclude from standings; include warning if relevant to requested group/context. |
| unresolved provider team | Exclude from standings and match context; warn with sanitized team value or provider fixture ID. |
| conflicting duplicate | Prefer valid finished record over live record; otherwise skip duplicate and warn. |

## Validation Rules

Add validation before exposing real match context:

1. Every resolved provider team name must canonicalize to one of the 48 World Cup 2026 teams.
2. Every provider group label must normalize to `A` through `L`.
3. Resolved fixture group must match provider group when both are available.
4. Finished fixtures must include non-negative integer scores.
5. A provider record must resolve by provider fixture ID or canonical home/away team pair.
6. A fixture may contribute once to a standings mode.
7. Provider global standings must not replace fixture-derived grouped standings.

## Schema and API Compatibility Risks

| Risk | Mitigation |
| --- | --- |
| Existing `WorldCup2026SyncResult.standings` implies grouped standings when provider returns global rows. | Add metadata/warnings before any consumer treats it as grouped. Consider renaming or scoping in a future additive contract. |
| `WorldCup2026ExternalStandingRecord.group` is optional. | Keep optional, but require grouped consumers to reject records without groups. |
| Team aliases may not cover all provider spellings. | Add a captured provider-name test fixture in 12.18B2. |
| Fixture resolution by home/away pair assumes official order. | Keep home/away order strict and warn on reversed pairs rather than silently swapping for standings. |
| Provider fixture IDs are numeric and internal fixture IDs are semantic strings. | Preserve both IDs and resolve to internal IDs before standings contribution. |
| Additional match-context fields could be mistaken for model inputs. | Mark context as read-only/provenance until a future model phase explicitly opts in. |

## Implementation Split

### Phase 12.18B2 - Real Standings Normalization Guardrails

Recommended scope:

- add a provider-standings classification helper;
- detect ungrouped global standings blocks;
- add provider team-name coverage tests from a captured real or injected 48-team payload;
- validate `GROUP_A` through `GROUP_L` mapping;
- add typed warnings for grouped-standings incompatibility;
- keep official standings fixture-derived and numerically unchanged.

Validation focus:

- live-results sync tests;
- live group standings tests;
- group detail tests;
- API typecheck;
- no prediction regression.

### Phase 12.18B3 - Match Context Read Model

Recommended scope:

- add a pure `buildWorldCup2026MatchContext` read model;
- include group position, points, played, goal difference, tournament form summary, qualification state, fixture importance placeholder, provider freshness, and fallback state;
- enforce cutoff-aware no-look-ahead rules;
- expose context through server-side API handlers only;
- do not feed context into the prediction formula.

Validation focus:

- no-look-ahead tests;
- fallback/cache metadata tests;
- unresolved fixture/team tests;
- snapshot provenance compatibility tests.

### Phase 12.18B4 - UI and Snapshot Provenance Presentation

Recommended scope:

- show match context in prediction, group detail, and history views;
- label official vs provisional vs projected context clearly;
- add snapshot provenance for context available at capture time;
- show mismatch/fallback warnings without blocking valid predictions;
- do not regenerate snapshots or evaluations.

Validation focus:

- web unit tests;
- Playwright context visibility tests;
- no secrets in client output;
- no snapshot identity/hash changes.

## Open Questions

- Should provider global standings be persisted as a separate diagnostic artifact or only surfaced in sync metadata?
- Which exact provider-name payload should become the canonical regression fixture for all 48 names?
- Should reversed home/away provider records ever be matched for diagnostics, or only reported as mismatches?
- What minimum provider freshness should be required before showing fixture importance?
- Should fixture importance remain a display-only heuristic until sufficient Model-vs-Reality evidence exists?

## Required Conclusion

The project should continue to compute real grouped standings from normalized completed and live fixture records, not from football-data.org's current standings endpoint. The provider standings endpoint should be ignored for grouped standings, exposed only as safe metadata where useful, and used for cross-check warnings after a validation helper exists.

Production prediction formulas remain unchanged.

