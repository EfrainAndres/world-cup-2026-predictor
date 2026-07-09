# Knockout Provider Topology Reconciliation

Date: 2026-07-09
Status: Provider-first graph policy

## Purpose

This document records the read-only reconciliation policy for the live World Cup 2026 knockout projection after QA found that later-round participants could be derived from the internal canonical topology even when the provider had already supplied real knockout fixtures.

The defect was topology precedence, not the Elo/xG model: the model could receive the wrong teams.

## Final Policy

The official knockout resolver now builds the live bracket in this order:

```txt
provider knockout records
-> canonical stage buckets
-> provider fixture graph
-> dependency validation for completed results
-> official/projected resolution
-> internal match 73-104 topology only for missing or unusable provider nodes
-> one Home and /tournament view model
```

Provider-backed fixture participants are authoritative whenever both provider teams canonicalize to known World Cup 2026 teams. Internal `winner_of` / `loser_of` topology is fallback topology, not a parallel source.

## Provider-First Graph Construction

For every normalized provider knockout record, the resolver:

- canonicalizes the stage/round into Round of 32, Round of 16, Quarterfinal, Semifinal, Final, or Third Place;
- canonicalizes both provider teams through the existing team alias pipeline;
- preserves provider home/away orientation, status, kickoff, fixture id, scores, winner, decision method, and penalty scores;
- deduplicates equal provider fixture ids by the existing authority ranking;
- assigns valid provider fixtures into their stage slots before deriving fallback participants from internal topology.

When a provider record has a verified internal match number, that exact slot is used. Otherwise, provider stage fixtures are assigned deterministically by matchday, kickoff, update timestamp, canonical team pair, and provider fixture id. This stage graph is built before the resolver asks internal topology for participants.

The older exact-team and round-participant-overlap matching paths remain only as a compatibility fallback when no valid provider stage graph exists for that stage. They are not used as a parallel source once provider fixtures for the stage are available.

## Participant Authority

If the provider supplies two canonicalizable teams for a fixture:

1. Those teams define the fixture participants.
2. Provider orientation is preserved in the view model.
3. The model predicts only the result when the fixture is unresolved/live.
4. Internally derived conflicting participants are replaced, and the resolver emits `provider_fixture_participants_override_internal_topology`.

This fixes the observed stale topology leak:

- Internal fallback could derive `Match 89: Canada vs Paraguay`.
- Provider stage graph supplies `Canada vs Morocco`.
- Final view model renders `Canada vs Morocco`.
- Internal fallback could derive `Match 97: Canada vs Norway`.
- Provider R16/QF graph and corrected winners prevent stale `Canada vs Norway` from surviving.

## Dependency Validation

Dependency validation controls result authority, not fixture authority.

If a provider fixture is completed but its upstream dependencies are not official and valid for that stage:

- the provider fixture participants remain visible and authoritative;
- the completed score/result is not promoted to `Official result`;
- the resolver emits `provider_ahead_unresolved_dependency`;
- the unresolved result is projected or kept pending from the provider-backed participants.

Stage gates:

- Round of 16 official results require upstream Round of 32 winners to be official winners.
- Quarterfinal official results require upstream Round of 16 winners to be official winners.
- Semifinal official results require upstream Quarterfinal winners to be official winners.
- Final official results require official Semifinal winners that match the provider Final participants.
- Third Place official results require official Semifinal losers that match the provider Third Place participants.

Provider-backed live/scheduled fixtures can define participants without defining official winners. A live Quarterfinal cannot coexist with an official champion unless the Final has a completed, dependency-valid provider result.

## Automatic Advancement

When a completed provider-backed result passes dependency validation:

- the official winner advances automatically to the next stage;
- the official loser is recorded for elimination integrity;
- Semifinal losers feed the Third Place Match automatically;
- downstream unresolved matches are recomputed from official winners, projected winners, or provider-backed fixtures as available.

No code changes, hardcoded team moves, DB writes, provider writes, persistence schema changes, or snapshot identity changes are required when a provider knockout match finishes.

## Fallback Cases

Internal topology is used only when:

- no provider fixture exists for that stage/slot;
- provider teams are missing, TBD, duplicated, or placeholders;
- provider teams cannot be canonicalized;
- duplicate provider records are equal-authority conflicts and are rejected as ambiguous;
- provider supplies more canonical stage fixtures than available fallback slots.

When provider participants cannot be used, the resolver emits `provider_fixture_participants_unresolved` or a provider stage conflict warning with provider fixture id, teams, stage, and reason.

## Provider Identity Policy

Identity preference is:

1. provider fixture id when an exact provider fixture id is available;
2. provider stage/round;
3. explicit provider match number only when it maps to an internal knockout slot;
4. kickoff/update chronology and canonical team pair within a stage;
5. legacy exact/reversed team or round-participant-overlap matching only if no valid provider stage graph exists for that stage.

The service does not rely only on football-data.org `matchday` as the official internal match number. Matchday remains a useful compatibility signal, not the primary topology source.

## Warnings

First-class warnings include:

- `provider_fixture_participants_override_internal_topology`
- `provider_fixture_participants_unresolved`
- `provider_ahead_unresolved_dependency`
- `provider_fixture_stage_conflict`

Warnings include enough metadata for debugging: match number or unassigned stage slot, round/stage, provider fixture id, provider teams, internally derived teams when relevant, and dependency details when relevant.

## Non-Goals

This policy does not change Elo/xG formulas, Poisson probabilities, scoreline selection, StatsBomb behavior, Attack/Defense behavior, persistence schema, snapshot/evaluation identity, group standings, team identity assets, official result parsing, provider sync writes, or database writes. The projection remains read-only.
