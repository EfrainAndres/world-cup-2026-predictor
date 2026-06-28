# Official Knockout Bracket Audit

Phase: 12.19G1
Date: 2026-06-28

## Purpose

This audit records the current knockout bracket behavior before integrating the official World Cup 2026 knockout topology. It identifies the smallest safe implementation boundary for replacing foundation/projected bracket data with a read-only official-plus-projected tournament path.

## Current Round-of-32 Source

The current Round-of-32 source is `getWorldCup2026RoundOf32Foundation()` in the API package. It returns `WORLD_CUP_2026_ROUND_OF_32_FIXTURES`, which is built from `buildWorldCup2026QualifiedTeams()` and `buildWorldCup2026RoundOf32Fixtures()`.

The source is explicitly classified as `current_local_standings_foundation`. The current response warning says the Round of 32 foundation is projected from current local standings and requires replacement once official fixtures are confirmed.

## Participant Status

Current participants are not official knockout fixtures.

They are derived from local standings and third-place qualification logic, then paired into a foundation Round of 32. They should be treated as projected/foundation participants, not confirmed FIFA fixtures.

## Current Fixture IDs and Match Numbers

Current fixture IDs are generated as local foundation IDs such as:

| Slot | Fixture ID | Home | Away |
| --- | --- | --- | --- |
| 1 | `wc2026-r32-01-mexico-vs-portugal` | Mexico | Portugal |
| 2 | `wc2026-r32-02-bosnia-herzegovina-vs-norway` | Bosnia-Herzegovina | Norway |
| 3 | `wc2026-r32-03-scotland-vs-iran` | Scotland | Iran |
| 4 | `wc2026-r32-04-united-states-vs-ghana` | United States | Ghana |
| 5 | `wc2026-r32-05-curacao-vs-germany` | Curacao | Germany |
| 6 | `wc2026-r32-06-japan-vs-austria` | Japan | Austria |
| 7 | `wc2026-r32-07-belgium-vs-qatar` | Belgium | Qatar |
| 8 | `wc2026-r32-08-cape-verde-vs-morocco` | Cape Verde | Morocco |
| 9 | `wc2026-r32-09-france-vs-ecuador` | France | Ecuador |
| 10 | `wc2026-r32-10-algeria-vs-netherlands` | Algeria | Netherlands |
| 11 | `wc2026-r32-11-colombia-vs-egypt` | Colombia | Egypt |
| 12 | `wc2026-r32-12-croatia-vs-saudi-arabia` | Croatia | Saudi Arabia |
| 13 | `wc2026-r32-13-south-korea-vs-iraq` | South Korea | Iraq |
| 14 | `wc2026-r32-14-canada-vs-argentina` | Canada | Argentina |
| 15 | `wc2026-r32-15-brazil-vs-dr-congo` | Brazil | DR Congo |
| 16 | `wc2026-r32-16-australia-vs-england` | Australia | England |

The legacy foundation does not preserve official match numbers 73-88 as first-class identifiers.

## Defect Found During G1 Preview

The initial Phase 12.19G1 implementation incorrectly copied the legacy foundation/projected Round-of-32 participants above into `WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES` and mapped them through `official_team` participant sources.

That promoted projected standings-derived teams to `Official fixture` and `Official participant` labels on `/tournament`. The defect was fixed before merge by replacing the fallback source with the confirmed official Round-of-32 fixtures and adding exact regression coverage that rejects legacy teams such as Iran, Curacao, Iraq, Saudi Arabia, Qatar, and Scotland.

## Corrected Canonical Round-of-32 Fixtures

The corrected canonical data-layer fallback for matches 73-88 is:

| Match | Home | Away |
| --- | --- | --- |
| 73 | South Africa | Canada |
| 74 | Brazil | Japan |
| 75 | Germany | Paraguay |
| 76 | Netherlands | Morocco |
| 77 | Ivory Coast | Norway |
| 78 | France | Sweden |
| 79 | Mexico | Ecuador |
| 80 | England | DR Congo |
| 81 | Belgium | Senegal |
| 82 | United States | Bosnia-Herzegovina |
| 83 | Spain | Austria |
| 84 | Portugal | Croatia |
| 85 | Switzerland | Algeria |
| 86 | Australia | Egypt |
| 87 | Argentina | Cape Verde |
| 88 | Colombia | Ghana |

Each entry carries `participantSource: canonical_official_fixture`, a source name, and an `asOf` timestamp. Kickoff timestamps, venues, and provider fixture IDs are omitted until confirmed by normalized provider data.

## Current Advancement Mapping

The current Round-of-16 simulation pairs projected Round-of-32 winners sequentially:

- fixture 1 winner vs fixture 2 winner;
- fixture 3 winner vs fixture 4 winner;
- and so on.

This is not the fixed FIFA match-number topology required for Phase 12.19G1.

## Re-Seeding Behavior

The current API route helpers do not re-seed by Elo, group position, FIFA ranking, or projected strength. They advance winners by array order and pair the next round sequentially.

The problem is not active re-seeding. The problem is that the current sequential pairing is not the official fixed bracket topology.

## Finished Knockout Results

The legacy tournament projection tree does not reconcile completed knockout results. It simulates projected knockout fixtures from the foundation bracket and uses projected winners for downstream rounds.

Completed official knockout results currently do not override projections in the tournament page.

## Live Provider Coverage

The normalized live-results provider supports:

- provider fixture ID;
- stage;
- group;
- matchday;
- kickoff timestamp;
- teams;
- status;
- score fields;
- venue;
- update timestamp.

It does not expose an explicit official match-number field. Provider `matchday` may carry official match-number-like values in knockout phases for some providers, but this is not guaranteed by the current type.

The local static provider currently returns group-stage fixtures only.

## Team Orientation Risk

Provider fixture orientation can differ from canonical bracket orientation. The existing group-result code already treats team orientation as a reconciliation concern. The knockout integration must match by provider fixture ID, then official match number, then exact canonical home/away teams, then reversed team order with score orientation correction.

Ambiguous provider records must be rejected instead of attached to a similar-looking fixture.

## Kickoff and Venue Availability

The normalized provider record type supports kickoff timestamps and venue values. Current foundation Round-of-32 fixtures do not include official kickoff timestamps or venues.

If canonical static fixture data is needed as a fallback, it must include provenance, an `asOf` timestamp, official match numbers, and only confirmed kickoff or venue metadata. The corrected G1 fallback intentionally omits kickoff and venue fields because they are not available in the current normalized source.

## Component Assumptions

The following current tournament components assume foundation or projected participants:

- `WorldCupRoundOf32Section`;
- `WorldCupKnockoutBracketSection`;
- `TournamentChampionOutlook`;
- legacy round detail sections for Round of 16, quarterfinals, semifinals, third place, and final.

They use copy such as "Projected", "foundation", and "current local standings", and should not be reused as the primary official bracket experience without changing their data contract and labels.

## Smallest Safe Integration Boundary

The safest boundary is a new read-only official knockout projection service in the API/domain layer that:

1. Encodes the immutable official match-number topology for matches 73-104.
2. Stores canonical Round-of-32 fixture fallback data with provenance and `asOf`.
3. Reconciles normalized provider records into canonical fixture orientation.
4. Preserves official completed results when present.
5. Simulates only unresolved matches with the existing production predictor.
6. Advances winners through the fixed topology without re-seeding.
7. Returns a typed tournament result for `/tournament`.

The web app should then compose this service once per tournament render through a server-side orchestration function. Child React components must receive the composed result and must not call providers or persistence directly.

## Non-Goals Confirmed

This phase should not change:

- Elo ratings;
- Elo-to-xG conversion;
- Poisson configuration;
- confidence calculations;
- group standings;
- third-place qualification rules;
- snapshots;
- evaluations;
- database schema;
- provider behavior.
