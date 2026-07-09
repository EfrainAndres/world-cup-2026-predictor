# Knockout Provider Topology Reconciliation

Date: 2026-07-09
Status: Hotfix policy (extended)

## Purpose

This document records the read-only reconciliation policy for the live World Cup 2026 knockout projection after QA found that later-round participants could be derived from the internal canonical topology even when the provider had already supplied official fixture participants.

The defect was topology precedence, not the Elo/xG model: the model could receive the wrong teams.

## 2026-07-09 Follow-Up: Round-Participant-Overlap Fallback

The first hotfix (matchday-then-exact-team provider matching) left a gap: a real provider knockout fixture whose `matchday` does not equal our assumed official match number, and whose team pair does not exactly equal the internally derived pair, was never attached anywhere. QA reproduced this concretely — Round of 16 Match 89 kept rendering the stale internally derived "Canada vs Paraguay" instead of the real provider-backed "Canada vs Morocco" fixture, and downstream Quarterfinal Match 97 kept showing the resulting stale "Canada vs Norway".

The service now adds one more fallback step, tried only after provider fixture id, official match number, and exact/reversed team-pair matching all fail for a match:

- **Round-participant overlap.** Among provider knockout records not yet consumed by an earlier match in this build, find one whose team pair shares **exactly one** team with the match's already-resolved home/away identity. That record's own team pair becomes authoritative for this match, replacing the stale internally derived opponent. If more than one non-identical candidate overlaps, the match is rejected as ambiguous and the internal topology remains the fallback for that slot (fail-safe, not fail-open).
- **Round of 32 is excluded from this fallback.** Round of 32 identity is a static, project-maintained guess rather than a derived winner, so a single-team overlap there is far more likely to attach the wrong provider fixture to the wrong slot. Round of 32 already resolves correctly via provider fixture id / official match number / exact team matching; this fallback only applies to Round of 16 and later, where the anchor team is always an already-resolved (official or projected) winner.
- **Provider records are consumed at most once per build.** Once a provider record is selected for a match by any method, it is excluded from consideration for every other match in the same build, preventing the same real fixture from being attached to two different official match numbers.

Because this fallback replaces participants (not just scores), the corrected participants propagate automatically through the existing `winner_of`/`loser_of` topology to every downstream round — no separate downstream-specific logic was needed to fix the Quarterfinal symptom.

## 2026-07-09 Follow-Up: Provider-Driven Advancement Dependency Gate

The provider is authoritative for real fixtures, participants, live statuses, scores, and winners, but a completed provider record is not promoted to an `Official result` until the match's feeder dependencies are officially resolved.

The resolver now applies this gate before selecting an official winner:

- Round of 16 official results require the upstream Round of 32 winners referenced by the topology to be official winners.
- Quarterfinal official results require the upstream Round of 16 winners to be official winners.
- Semifinal official results require the upstream Quarterfinal winners to be official winners.
- Final official results require both Semifinal winners to be official winners, and the provider Final participants must match those resolved winners.
- Third Place official results require both Semifinal losers to be official losers, and the provider Third Place participants must match those resolved losers.

If a provider record is completed but its dependency gate fails, the resolver consumes and defers that provider record for the current build, emits `provider_ahead_unresolved_dependency`, and falls back to the latest internally resolved official/projected state for that match. This prevents impossible states such as a live Quarterfinal coexisting with an official champion, runner-up, or third-place result.

Provider-backed live or scheduled fixtures still display as authoritative fixtures. For example, a live provider Quarterfinal can render as `Official fixture` + `Live`; only the result and downstream podium entries remain projected until the official dependency chain catches up.

## Policy

For each knockout match:

1. Provider official fixture participants are authoritative when both provider team names can be canonicalized to known World Cup 2026 teams.
2. Provider orientation is preserved for provider-backed fixtures.
3. Completed provider results, when internally consistent and dependency-valid, advance the official winner.
4. The internal fixed topology for matches 73-104 is fallback topology only.
5. Model projections run only after participants are resolved, using the resolved home and away teams.
6. Provider records are matched to a match by, in order: provider fixture id; official match number (via matchday); exact team pair; reversed team pair; round-participant overlap (Round of 16 and later only).
7. Loose exact/reversed team matching and round-participant overlap do not attach a provider record with a known knockout match number to any different topology match.

## Fallback Cases

The internal topology remains the fallback when:

- no provider record is available for the match;
- provider teams are missing, TBD, duplicated, or placeholders;
- provider teams cannot be canonicalized through the existing alias/identity pipeline;
- duplicate provider records are equal-authority conflicts and are rejected as ambiguous;
- a completed provider result appears ahead of unresolved or non-official feeder dependencies;
- more than one round-participant-overlap candidate exists for the same match and no single candidate can be chosen without guessing;
- the match is in the Round of 32 and no provider record matches by fixture id, match number, or exact/reversed team pair.

When provider participants cannot be used, the service emits:

- `provider_fixture_participants_unresolved`

When provider participants differ from internally derived participants and are used, the service emits:

- `provider_fixture_participants_override_internal_topology`

When completed provider results appear ahead of official feeder dependencies, the service emits:

- `provider_ahead_unresolved_dependency`

Warnings include match number, round, provider fixture id, provider teams, internally derived teams where relevant, and dependency details where relevant.

## Provider Identity Policy

Provider fixture id is preferred when canonical static fixture metadata has one. Current static knockout fallback data does not yet include provider fixture ids for matches 73-104.

Until that metadata is available, provider records are matched by guarded knockout records using provider `matchday` when it maps to the internal match number, then by exact/reversed team identity where possible, then by round-participant overlap for Round of 16 and later. This is a pragmatic compatibility policy, not a claim that `football-data.org` matchday is a universal official match-number field.

If a provider record's `matchday` already maps to a known knockout match number (73-104), that record is not eligible for loose team-pair or round-overlap matching against a different internal match number. This preserves provider chronology when available and prevents a later provider fixture (for example, a Quarterfinal with `matchday=97`) from being consumed by an earlier matching team pair.

Future provider integrations should add an explicit official match number or advancement edge when available. If a provider exposes only generic round/stage data without a trustworthy match number, the service should not infer bracket slot from round alone.

## Example

If internal topology derives:

- Match 89: Canada vs Paraguay
- Match 90: Brazil vs Norway
- Match 97: Canada vs Norway

But provider fixtures supply:

- Match 89: Canada vs Morocco
- Match 90: Brazil vs Norway

The provider pairings are used at Match 89 (via round-participant overlap, since "Canada" is shared with the internally derived pair) and Match 90 (via exact team match, since both teams already agree). The corrected Match 89 winner then feeds Match 97 through the existing topology, so Match 97 reflects the real bracket path (for example, Morocco vs Norway) instead of the stale Canada vs Norway pairing produced by the old internal-only derivation.

## Non-Goals

This hotfix does not change Elo/xG formulas, Poisson probabilities, scoreline selection, StatsBomb behavior, Attack/Defense behavior, persistence schema, snapshot/evaluation identity, group standings, official bracket topology, or provider sync writes. The projection remains read-only.
