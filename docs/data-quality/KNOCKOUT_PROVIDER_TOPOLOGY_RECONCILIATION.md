# Knockout Provider Topology Reconciliation

Date: 2026-07-09
Status: Hotfix policy

## Purpose

This document records the read-only reconciliation policy for the live World Cup 2026 knockout projection after QA found that later-round participants could be derived from the internal canonical topology even when the provider had already supplied official fixture participants.

The defect was topology precedence, not the Elo/xG model: the model could receive the wrong teams.

## Policy

For each knockout match:

1. Provider official fixture participants are authoritative when both provider team names can be canonicalized to known World Cup 2026 teams.
2. Provider orientation is preserved for provider-backed fixtures.
3. Completed provider results, when internally consistent, advance the official winner.
4. The internal fixed topology for matches 73-104 is fallback topology only.
5. Model projections run only after participants are resolved, using the resolved home and away teams.

## Fallback Cases

The internal topology remains the fallback when:

- no provider record is available for the match;
- provider teams are missing, TBD, duplicated, or placeholders;
- provider teams cannot be canonicalized through the existing alias/identity pipeline;
- duplicate provider records are equal-authority conflicts and are rejected as ambiguous.

When provider participants cannot be used, the service emits:

- `provider_fixture_participants_unresolved`

When provider participants differ from internally derived participants and are used, the service emits:

- `provider_fixture_participants_override_internal_topology`

Warnings include match number, round, provider fixture id, provider teams, and internally derived teams.

## Provider Identity Policy

Provider fixture id is preferred when canonical static fixture metadata has one. Current static knockout fallback data does not yet include provider fixture ids for matches 73-104.

Until that metadata is available, provider records are matched by guarded knockout records using provider `matchday` when it maps to the internal match number, then by exact/reversed team identity where possible. This is a pragmatic compatibility policy, not a claim that `football-data.org` matchday is a universal official match-number field.

Future provider integrations should add an explicit official match number or advancement edge when available. If a provider exposes only generic round/stage data without a trustworthy match number, the service should not infer bracket slot from round alone.

## Example

If internal topology derives:

- Match 89: Canada vs Paraguay
- Match 90: Brazil vs Norway
- Match 97: Canada vs Norway

But provider fixtures supply:

- Match 89: Canada vs Morocco
- Match 90: Brazil vs Norway
- Match 97: Canada vs Morocco

The provider pairings are used. The model predicts Canada vs Morocco for Match 89 and Match 97, and Canada vs Norway is not produced as a stale quarterfinal from the old internal path.

## Non-Goals

This hotfix does not change Elo/xG formulas, Poisson probabilities, scoreline selection, StatsBomb behavior, Attack/Defense behavior, persistence schema, snapshot/evaluation identity, group standings, or provider sync writes. The projection remains read-only.
