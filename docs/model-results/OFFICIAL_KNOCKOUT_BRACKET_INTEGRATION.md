# Official Knockout Bracket Integration

Phase: 12.19G1
Date: 2026-06-28

## Summary

Phase 12.19G1 replaces the tournament route's legacy foundation/projected knockout tree with a read-only official-plus-projected bracket service. The service preserves official fixture identity and completed results where available, then simulates only unresolved fixtures with the existing production Auto Predict path.

## Authoritative Fixture Source

The runtime source order is:

1. Normalized live-results provider records when they can be reconciled to official knockout identity.
2. Project-maintained canonical official Round-of-32 fixture data with official match numbers 73-88.
3. Structured fallback warnings when provider records are unavailable or ambiguous.

The local static provider currently returns group-stage fixtures only, so the canonical Round-of-32 fixture fallback is required until the external provider supplies knockout fixture records.

## Match-Number Topology

The central topology covers matches 73-104:

- Round of 32: 73-88.
- Round of 16: 89-96.
- Quarterfinals: 97-100.
- Semifinals: 101-102.
- Third Place Match: 103.
- Final: 104.

Every future participant is represented as a typed source, such as `winner_of` or `loser_of`, rather than a display string. The service validates unique match numbers, valid stage ranges, upstream references, downstream slots, Round-of-32 participant uniqueness, round participant uniqueness, and podium uniqueness.

## Provider Reconciliation

Provider records are matched in this order:

1. provider fixture ID, when a canonical provider ID is present;
2. official match number via normalized `matchday`;
3. canonical home/away teams;
4. reversed canonical team order with score orientation correction.

Ambiguous matches are rejected and surfaced as matching issues. Provider records are never mutated.

## Official-Result Precedence

Finished provider results override projections. The official winner and loser feed downstream fixtures through the fixed topology. Live, halftime, postponed, and cancelled fixtures are not treated as completed official results.

The service does not modify immutable prediction snapshots, evaluations, provider data, or persistence records.

## Projection Policy

Unresolved matches use `predictMatchFromLiveElo()` with the existing balanced preset and current Elo-to-xG V2 / Poisson behavior. No model constants, confidence logic, ratings, calibration, or presets changed.

Projected advancement is deterministic:

1. A non-tied modal scoreline advances the modal winner as `projected_regulation`.
2. A tied modal scoreline compares home and away win probabilities as `projected_extra_time`.
3. Equal win probabilities compare effective Elo as `projected_penalties`.
4. Equal Elo falls back to stable canonical team identity as `projected_penalties`.

The advancement method is a deterministic bracket-resolution label, not a claim about the exact real-life match mechanism.

## Output

The typed result contains all 32 knockout matches, source state per match, participant states, official or projected score, projected xG and 1X2 probabilities where available, winner and loser, advancement method and reason, downstream references, warnings, generation timestamp, synchronization timestamp, and model/formula versions.

The podium is derived from:

- champion: winner of Match 104;
- runner-up: loser of Match 104;
- third place: winner of Match 103;
- fourth place: loser of Match 103.

## Server Composition

`getOfficialWorldCup2026KnockoutProjection()` in the web server runtime performs one results synchronization and builds the bracket once. Child components receive the composed projection and do not call providers, databases, or prediction history stores.

Home reuses the already-synchronized Home `syncResult` to build its compact tournament summary. It does not render the full bracket.

## UI Integration

`/tournament` is now the official-plus-projected knockout experience. It shows:

- tournament status;
- official Round-of-32 fixture count;
- synchronization status;
- champion, runner-up, third place, and fourth place;
- one fixed bracket;
- all six stages;
- official fixture/result and projected result/participant labels;
- a collapsed technical/provenance disclosure.

Knockout match detail links are deferred because `/matches/[fixtureId]` currently resolves group-stage daily-match entries only.

## Tests

Focused API tests cover topology counts and mapping, official Round-of-32 uniqueness, official-result precedence, reversed provider orientation correction, unresolved-match prediction, deterministic tie policy, semifinal-loser routing into the Third Place Match, deterministic repeated output, and podium uniqueness.

Tournament Playwright coverage now checks official knockout status, one bracket, 16 Round-of-32 fixtures, official/projected labels, all stages, podium visibility, flags, collapsed disclosure, mobile overflow, mobile round navigation, and the Home tournament CTA.

## Operational Limitations

- The canonical Round-of-32 fallback data remains replaceable when provider knockout fixtures become available.
- Provider `matchday` is used as the official match-number field when applicable because the current normalized provider type has no explicit `matchNumber`.
- Official extra-time and penalty method preservation is deferred until the provider contract exposes winner-method metadata.
- Knockout detail pages are deferred until match detail can resolve knockout records.
- Monte Carlo probability distributions are deferred; this phase produces one deterministic traceable path.

## Rollback

Rollback is limited to returning `/tournament` and Home tournament summary to the legacy foundation projection helpers. The new service is additive, has no migrations, and performs no writes.

