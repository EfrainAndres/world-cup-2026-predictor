# Knockout Provider Resolver Deep Review

Date: 2026-07-09
Status: Rebuild plan

## 1. Executive Summary

The current live knockout resolver is still topology-first. It starts every match from `WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY`, derives participants through internal `winner_of` / `loser_of` edges, and then tries to attach one provider record to that internally derived slot. That is the opposite of the product requirement.

The provider must define the actual live bracket whenever it has real knockout fixtures with canonical teams. Internal match 73-104 topology should only fill gaps where provider fixtures are missing or unusable.

Latest QA evidence fits this failure mode:

- Home receives a current live provider fixture (`France vs Morocco`, 1-0) and still shows a fully projected podium.
- `/tournament` still renders stale internally derived `Match 89: Canada vs Paraguay`.
- `/tournament` still renders stale internally derived `Match 97: Canada vs Norway`.
- Other provider-backed fixtures exist, but they are being opportunistically attached, ignored, or consumed according to internal topology rather than used as the source graph.

The recommended fix is not another loose-matching patch. Replace the current mixed resolver with a provider-first knockout graph:

```txt
provider knockout records
-> canonical provider fixture graph by stage
-> provider-backed official/live fixture nodes
-> dependency validation
-> official or projected resolution per node
-> internal topology fallback only for missing/TBD/unusable provider nodes
-> one final view model for Home and /tournament
```

## 2. Current Architecture / Data Flow

### Live Provider Flow

`apps/web/app/page.tsx`:

- Calls `getDashboardLiveSyncResult()`.
- Builds `tournamentProjection` through `buildOfficialWorldCup2026KnockoutProjectionWithProductionStatsBomb(syncResult)`.
- Passes that projection to `HomeTournamentOutlook`.

`apps/web/app/tournament/page.tsx`:

- Calls `getOfficialWorldCup2026KnockoutProjection()`.
- That function calls `getDashboardLiveSyncResult()`.
- It then calls `buildOfficialWorldCup2026KnockoutProjection()`.
- The result is rendered by `OfficialKnockoutTournament`.

`apps/web/src/lib/server-runtime.ts`:

- `getDashboardLiveSyncResult()` wraps `synchronizeWorldCup2026Results()` with process-level and optional durable last-known-good caching.
- `getOfficialWorldCup2026KnockoutProjection()` and `buildOfficialWorldCup2026KnockoutProjectionWithProductionStatsBomb()` both call the same API resolver.

`packages/api/src/live-results-sync.ts`:

- Fetches all football-data.org matches.
- Filters out records whose teams are missing/blank.
- Normalizes records into `WorldCup2026ExternalFixtureRecord`.
- Populates `fixtures` with all normalized records.
- Populates `liveMatches` with `live` / `halftime`.
- Populates `completedResults` with `finished`.
- Preserves provider fixture id, stage, matchday, kickoff, teams, status, score, winner, and decision method.

### Knockout Projection Flow

`packages/api/src/world-cup-2026-official-knockout.ts`:

- Builds `providerRecords` from `completedResults + liveMatches + fixtures`.
- Loops through `WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY` in internal match-number order.
- Resolves `home` and `away` from internal topology first.
- Calls `findProviderRecord()` for that one internal topology match.
- If a provider record is found and both participants canonicalize, it replaces the internally derived pair for that match.
- If no provider record is found, the internally derived pair remains.
- If the provider result is completed and accepted, it advances official winner/loser.
- Otherwise, the model projects a winner from the currently resolved pair.
- `buildPodium()` reads match 104 and match 103 winners/losers from the same internal records map.

### Legacy Knockout Modules

The user-listed files:

- `world-cup-2026-knockout-bracket-foundation.ts`
- `world-cup-2026-knockout-fixtures-simulation.ts`
- `world-cup-2026-knockout-winners-foundation.ts`
- `world-cup-2026-quarterfinal-foundation.ts`
- `world-cup-2026-semifinal-foundation.ts`
- `world-cup-2026-final-foundation.ts`
- `world-cup-2026-third-place-match-foundation.ts`

do not exist as standalone files in this branch. Their logic lives in `packages/api/src/routes.ts` as Phase 10/11 foundation functions:

- `getWorldCup2026KnockoutBracketFoundation()`
- `simulateWorldCup2026KnockoutFixturesFoundation()`
- `simulateWorldCup2026RoundOf16Foundation()`
- `simulateWorldCup2026QuarterfinalFoundation()`
- `simulateWorldCup2026SemifinalFoundation()`
- `simulateWorldCup2026FinalFoundation()`
- `resolveWorldCup2026KnockoutWinnersFoundation()`
- `getWorldCup2026ThirdPlaceMatchFoundation()`

Those functions are deterministic local projection foundations. They do not consume live provider data. They still appear in `getDashboardSnapshot()` but the current Home route does not use `getDashboardSnapshot()` for the tournament outlook. They should nevertheless be explicitly treated as legacy/fallback/demo modules and not reused for live knockout rendering.

## 3. Exact Root Cause Hypothesis

### Root Cause A: The Resolver Is Topology-First

`buildOfficialWorldCup2026KnockoutProjection()` loops over `WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY` and resolves internal participants before provider lookup.

That means provider data is not the graph. Provider records are only overlays on pre-existing internal slots.

Failure mode:

- Internal topology derives `Match 89: Canada vs Paraguay`.
- Provider has a real knockout fixture somewhere else in the provider stage data.
- The resolver asks: "Does any provider record match this Canada/Paraguay slot?"
- If not, Canada/Paraguay survives.

The correct question is: "Which real provider fixtures exist for this knockout stage, and which internal fallback slots are still missing?"

### Root Cause B: Provider Matching Is Slot-Local, Not Stage-Global

`findProviderRecord()` only receives one internal `officialMatchNumber`, optional provider fixture id, and the current internally derived teams.

It tries:

1. provider fixture id;
2. matchday as official match number;
3. exact team pair;
4. reversed team pair;
5. one-team round overlap.

This never constructs a provider stage inventory. If provider returns a set of Quarterfinal fixtures, the resolver does not first reserve all Quarterfinal fixtures as authoritative QF nodes. It tests each QF provider fixture against whichever internal QF slot is currently being processed.

Failure mode:

- Provider has real QF fixtures such as `France vs Morocco`, `Brazil vs Norway`, `Spain vs Belgium`, `Norway vs England`, `Argentina vs Switzerland`.
- Internal QF slot 97 is `Canada vs Norway`.
- A provider QF without Canada may not match slot 97 by exact or overlap.
- Slot 97 remains `Canada vs Norway` even though real provider QF fixtures exist.

### Root Cause C: Matchday Is Overloaded

`findProviderRecord()` treats `record.matchday === identity.officialMatchNumber` plus knockout stage signal as an official match-number match.

The current docs already say this is only a compatibility bridge, not a verified football-data.org guarantee. The QA evidence suggests the provider’s `matchday` is not sufficient as the sole slot identity. A provider record may have:

- a real provider fixture id;
- a round/stage;
- canonical teams;
- kickoff chronology;
- status freshness;
- possibly a provider matchday that is not the internal official match number.

The resolver still gives internal match number too much control over provider placement.

### Root Cause D: Provider Participants Lose Graph Lineage

`resolveProviderFixtureParticipants()` converts provider teams into participants with:

```txt
source = official_team(providerTeam)
state = official_participant
path = []
```

This makes provider-backed later-round participants look like root official teams, not teams that arrived via a provider fixture graph. Dependency validation then checks the old static topology sources instead of a provider advancement edge.

Failure mode:

- A provider-backed QF participant may be valid because the provider fixture exists.
- The resolver cannot express "this team is here because provider fixture X says so."
- It can only express "this team is an official participant with no path."
- Elimination and dependency rules become approximate and exception-heavy.

### Root Cause E: Completed Provider Records Can Be Discarded Back to Stale Internal State

The current dependency gate checks completed provider records against internal topology dependencies. If dependency validation fails, the resolver sets `providerMatch = null` and restores `home = internalHome`, `away = internalAway`.

That avoids false official results, but it also discards the real provider fixture participants for completed records that are ahead of the internal graph. For live/scheduled provider records this discard does not happen, but for completed records it can put stale topology back on screen.

The final design should separate:

- official result validity;
- official fixture participant authority.

A completed provider record can be invalid as an official result because dependencies are unresolved, while still being authoritative as a fixture identity with real teams. The view model should not silently revert to a stale internal pair unless the provider fixture itself is unusable or conflicting.

### Root Cause F: Provider Records Can Be Consumed by the Wrong Match

`consumedProviderFixtureIds` is global and the resolver processes internal topology order. Once a provider record is selected for a slot, no later slot can use it.

The recent guard prevents loose matching from using a provider record with known matchday 73-104 against a different match number. However, real provider records with untrusted matchday, missing matchday, generic matchday, or stage-only identity can still be consumed by the first internal slot that happens to match or overlap.

The provider-first graph should reserve provider fixtures by provider fixture id and stage before fallback topology consumes anything.

### Root Cause G: Validation Warnings Do Not Prevent Stale UI

`matchingIssues` and `validationWarnings` can contain hints, but `OfficialKnockoutTournament` renders the produced `matches` array. If stale teams are in `matches`, warnings do not fix the user-visible bracket.

The final resolver must produce a correct single view model, not only diagnostics.

## 4. Why Prior Fixes Failed

Prior fixes tried to harden a topology-first resolver:

- provider participant override;
- duplicate provider record selection;
- provider-ahead warnings;
- round-overlap matching;
- dependency gates.

Those are local patches around the same core flaw: provider fixtures are attached after internal topology derives a slot. The internal graph remains the primary skeleton and the provider is used only as a best-effort overlay.

Round-overlap was particularly fragile. It assumes one internally derived team can anchor the real provider fixture. QA now shows provider fixtures for the real current round that may not share the stale internal slot’s anchor, or may overlap multiple slots, or may be consumed elsewhere.

The product requirement is stage-level provider authority, not clever slot-level matching.

## 5. Why Current Tests Gave False Confidence

The tests are useful, but they do not prove the route-level production problem.

### Helper-Level Assertions

`packages/api/tests/world-cup-2026-official-knockout.test.ts` calls `buildOfficialWorldCup2026KnockoutProjection()` directly with synthetic records. That is necessary but not sufficient.

The tests assert the helper output under carefully shaped records, not the final Home or `/tournament` route view model with a realistic provider bundle.

### Synthetic Matchday Assumptions

Several tests use `matchday: 89`, `matchday: 97`, etc. That makes provider records map neatly onto internal match numbers. Real football-data.org data may not behave that way.

Other tests use artificial `matchday: 5001` to force round-overlap fallback. That proves one fallback path, not provider-first stage reconciliation.

### E2E Uses Default Local Data

`apps/web/tests/e2e/tournament.spec.ts` loads `/tournament` with default environment data. In the default local/static path, no live provider knockout bundle exists. The tests therefore assert that a projected local bracket renders, not that live provider fixtures override stale topology.

### Component Tests Stub the Projection

`OfficialKnockoutTournament.test.tsx` constructs a fake `OfficialKnockoutProjectionResult`. It validates labels, but it cannot catch resolver or provider matching bugs.

### Missing Test Category

The missing tests are route/view-model integration tests that inject a realistic `WorldCup2026SyncResult` containing:

- live provider QF fixture `France vs Morocco`, score 1-0;
- real provider R16/QF/SF fixtures that conflict with internal topology;
- stale internal paths that would otherwise derive Canada/Paraguay and Canada/Norway;
- later completed records that must be deferred.

The assertion target should be the final projection consumed by Home and `/tournament`, not only an internal matching helper.

## 6. Final Architecture Recommendation

Replace the current mixed resolver with a provider-first graph resolver inside the official knockout projection path.

Do not generalize fully for every tournament yet, but introduce clean internal boundaries:

- `ProviderKnockoutFixtureNode`: canonicalized provider fixture, independent of internal match number.
- `KnockoutStageDefinition`: stage order, expected count, display labels, fallback topology sources.
- `KnockoutGraphNode`: final resolved match node used by UI.
- `KnockoutResolverAdapter`: World Cup 2026 adapter with stage definitions and fallback topology.

The resolver should build a provider fixture graph before any internal topology derivation. Internal topology should fill only missing provider nodes.

## 7. Provider-First Precedence Policy

For each stage:

1. If provider records have canonical teams for that stage, those records define the real fixtures for that stage.
2. Provider fixture id is the primary identity.
3. Provider stage/round is the primary stage bucket.
4. Kickoff chronology and provider fixture id provide deterministic ordering inside a stage when official match number is unavailable.
5. Provider matchday is a secondary identity hint only when verified for that provider record.
6. Internal match 73-104 topology is fallback only for missing/TBD/uncanonicalizable provider fixtures.
7. A provider fixture with two known canonical teams must never be replaced by internally derived participants.
8. A provider-backed live fixture can define participants and status but not an official result.
9. A completed provider fixture can define participants even if its result is deferred.
10. If provider and internal derived participants conflict, warn and prefer provider fixture participants.

## 8. Dependency Validation Policy

Dependency validation should validate result authority, not fixture participant authority.

### Official Fixture Authority

A provider fixture is authoritative as a fixture when:

- stage can be identified;
- both teams canonicalize;
- teams are distinct;
- provider record is not rejected as duplicate/ambiguous;
- status is scheduled/live/halftime/finished/postponed/cancelled/unknown.

### Official Result Authority

A provider fixture is authoritative as a result only when:

- provider status is `finished`;
- both participants canonicalize;
- score and winner metadata are internally consistent;
- the winner is one of the participants;
- dependencies required for that stage are valid.

### Stage Dependency Rules

- Round of 16: accept provider fixture participants by provider authority. Promote a completed R16 result when the provider result is valid. If R32 official dependency data exists and contradicts the fixture, warn but do not replace provider participants.
- Quarterfinal: provider fixture participants are authoritative. Promote completed QF result when R16 feeder results are official or when the provider QF fixture has reliable provider identity and no contradictory official feeder result.
- Semifinal: provider fixture participants are authoritative. Promote completed SF result only when QF feeders are official or provider identity is reliable and no contradictory official QF result exists.
- Final: promote completed Final result only when Semifinal winners are official and match the provider Final participants.
- Third Place: promote completed Third Place result only when Semifinal losers are official and match the provider Third Place participants.

This keeps live/current stages usable while preventing impossible official podium states.

## 9. Automatic Advancement Policy

The resolver should evaluate stages in order:

1. Use provider fixtures for the current stage when present.
2. Resolve each fixture as official result, live fixture, scheduled fixture, projected result, or unresolved.
3. Official completed result advances official winner and loser.
4. Live or scheduled provider fixture runs projection against provider teams.
5. Missing provider fixture uses fallback topology and projects from upstream state.
6. Semifinal losers feed Third Place.
7. Final winner/loser and Third Place winner/loser build podium.

No hardcoded team movement should be added. Team movement is a consequence of official/provider fixture nodes and stage definitions.

## 10. Proposed Resolver Algorithm

```txt
function resolveKnockout(syncResult, predictMatch):
  providerRecords = normalizeAndDedupe(syncResult.completed + syncResult.live + syncResult.fixtures)
  providerNodes = []
  warnings = []

  for record in providerRecords:
    if not isKnockout(record):
      continue
    stage = classifyProviderStage(record.stage, record.matchday, record.kickoffAt)
    teams = canonicalizeProviderTeams(record.homeTeam, record.awayTeam)
    if stage missing or teams invalid:
      warnings.add(provider_fixture_participants_unresolved)
      continue
    providerNodes.add({
      providerFixtureId,
      stage,
      kickoffAt,
      providerMatchday,
      homeTeam,
      awayTeam,
      status,
      score,
      winner,
      decisionMethod,
      identityConfidence
    })

  providerByStage = group providerNodes by stage
  sort each stage by:
    reliable official match number if verified,
    kickoffAt,
    providerFixtureId

  resolvedStages = empty map

  for stage in [R32, R16, QF, SF, Final, ThirdPlace]:
    providerFixtures = providerByStage[stage]
    fallbackSlots = adapter.fallbackSlots(stage)
    stageMatches = []

    if providerFixtures has usable fixtures:
      stageMatches.add(provider fixtures as authoritative nodes)
      for remaining missing slots:
        stageMatches.add(fallbackFromTopology(stage, resolvedStages))
    else:
      stageMatches = fallbackFromTopology(stage, resolvedStages)

    for match in stageMatches:
      if match.providerFixture exists:
        participants = provider participants
        status = provider status
        if provider status finished:
          resultValidation = validateOfficialResult(match, resolvedStages)
          if resultValidation.valid:
            winner, loser = official result
          else:
            warnings.add(provider_ahead_unresolved_dependency)
            winner, loser = project(participants)
        else if status live or halftime or scheduled:
          winner, loser = project(participants)
        else:
          unresolved
      else:
        participants = fallback topology participants
        winner, loser = project(participants)

    resolvedStages[stage] = stageMatches

  validate eliminated teams do not reappear except SF losers in Third Place
  return view model from resolvedStages
```

## 11. Code Areas To Change

Primary implementation target:

- `packages/api/src/world-cup-2026-official-knockout.ts`

Recommended internal extraction inside that file or nearby module:

- provider stage classifier;
- provider fixture graph builder;
- stage definitions / WC2026 adapter;
- dependency validator;
- fallback topology adapter;
- final projection assembler.

Route/view-model tests should use:

- `apps/web/src/lib/server-runtime.ts` with injectable `getDashboardLiveSyncResult()` dependencies where possible;
- `/tournament` route tests or E2E test mode that can inject a deterministic provider bundle;
- Home route/view-model tests that render `HomeDashboard` with the resolver output from the same bundle.

Docs to update during implementation:

- `docs/data-quality/KNOCKOUT_PROVIDER_TOPOLOGY_RECONCILIATION.md`
- `CHANGELOG.md`

## 12. Code Areas Not To Change

Do not change:

- Elo/xG formulas;
- Poisson matrix;
- scoreline recommendation;
- StatsBomb behavior;
- Attack/Defense behavior;
- persistence schema;
- snapshot/evaluation identity;
- group standings;
- provider writes;
- immutable history behavior;
- React display semantics except labels required by the final view model.

Demote or avoid for live knockout rendering:

- `getWorldCup2026KnockoutBracketFoundation()`
- `simulateWorldCup2026KnockoutFixturesFoundation()`
- `simulateWorldCup2026RoundOf16Foundation()`
- `simulateWorldCup2026QuarterfinalFoundation()`
- `simulateWorldCup2026SemifinalFoundation()`
- `simulateWorldCup2026FinalFoundation()`
- `resolveWorldCup2026KnockoutWinnersFoundation()`
- `getWorldCup2026ThirdPlaceMatchFoundation()`

Those are legacy deterministic projection foundations and should not feed provider-backed Home or `/tournament`.

## 13. Required Integration Tests Against Final View Model

Add tests that call the real resolver and assert the final `OfficialKnockoutProjectionResult` consumed by Home and `/tournament`.

Required scenarios:

- Provider R16 stage includes `Canada vs Morocco`; final result must not contain `Canada vs Paraguay`.
- Provider path includes `Brazil vs Norway`; final QF view must not contain stale `Canada vs Norway`.
- Provider QF stage includes live `France vs Morocco`, score 1-0; fixture renders as provider-backed live and runs projection only for unresolved result.
- Live QF plus provider-ahead completed Final/Third Place does not produce official champion, runner-up, third, or fourth.
- Completed R16 result advances winner to provider/fallback QF.
- Completed QF result advances winner to provider/fallback SF.
- Completed SF result advances winner to Final and loser to Third Place.
- Completed Final produces official champion/runner-up only when SF dependencies are official and matching.
- Completed Third Place produces official third/fourth only when SF loser dependencies are official and matching.
- Provider stage with multiple fixtures is assigned deterministically by stage/kickoff/provider id, not by stale internal team overlap.
- Provider record with untrusted matchday still appears in correct stage based on provider stage.
- Same provider input produces byte-equivalent projection output.
- Eliminated provider loser does not reappear downstream except Semifinal loser in Third Place.

Do not assert only helper functions. Assert the returned `matches`, `rounds`, `podium`, `warnings`, and UI-facing labels.

## 14. Required E2E Tests

Add a deterministic E2E provider fixture mode for `/` and `/tournament`. The current E2E default local provider cannot exercise the bug.

Required E2E assertions:

- `/tournament` does not render `Canada vs Paraguay` when provider R16 has `Canada vs Morocco`.
- `/tournament` does not render `Canada vs Norway` when that pair exists only from stale internal topology.
- `/tournament` renders `France vs Morocco` as `Official fixture` + `Live`, not `Official result`.
- `/tournament` does not show official Final/Third Place results when dependencies are unresolved.
- Home does not show `Official champion`, `Official runner-up`, or `Official third place` while a current knockout match is live and Final/Third Place dependencies are invalid.
- Home podium derives from the same provider-first projection as `/tournament`.
- No `Unknown`, `Unavailable`, or `???`.
- Mobile overflow still passes for `/tournament`.

## 15. Acceptance Checklist

- Provider-backed fixtures by stage are indexed before fallback topology runs.
- Internal topology never replaces canonical provider fixture participants.
- Provider fixture id is the primary identity.
- Provider stage/round and kickoff chronology are used before loose team overlap.
- Matchday is not treated as the sole official identity unless verified.
- Live/scheduled provider fixtures define participants and status.
- Completed provider fixtures define participants even if result is deferred.
- Completed provider results become official only after result and dependency validation.
- Final official podium requires official, matching Semifinal winners.
- Third Place official podium requires official, matching Semifinal losers.
- Provider-ahead records emit `provider_ahead_unresolved_dependency`.
- Provider/internal participant conflicts emit `provider_fixture_participants_override_internal_topology`.
- Canada/Paraguay and Canada/Norway stale pairs do not survive provider-backed scenarios.
- Eliminated teams do not reappear downstream.
- Home and `/tournament` consume the same final projection model.
- Tests cover route/view-model behavior, not only helper-level behavior.
- No runtime writes are introduced.

## 16. Implementation Prompt For Next Phase

Implement the provider-first knockout graph resolver described in `docs/data-quality/KNOCKOUT_PROVIDER_RESOLVER_DEEP_REVIEW.md`.

Branch:

```txt
fix/provider-first-knockout-graph-resolver
```

Primary implementation constraints:

- Keep runtime read-only.
- Do not change Elo/xG, Poisson, StatsBomb, Attack/Defense, persistence schema, snapshot/evaluation identity, or group standings.
- Keep Home and `/tournament` on one shared final projection contract.
- Demote internal match 73-104 topology to fallback only.
- Do not add hardcoded team movement.
- Do not add provider-specific team mappings.

Core implementation:

1. In `packages/api/src/world-cup-2026-official-knockout.ts`, build provider knockout fixture nodes by provider fixture id and provider stage before topology resolution.
2. Canonicalize provider participants through the existing alias pipeline.
3. Build stage buckets for R32, R16, QF, SF, Final, and Third Place.
4. Use provider fixtures as authoritative stage nodes when canonical teams exist.
5. Use internal topology only for missing/TBD/unusable provider nodes.
6. Resolve official results only when provider result and dependency validation pass.
7. Project unresolved provider-backed fixtures using provider participants.
8. Recompute downstream stages from official/projected winners and SF losers.
9. Produce a single `OfficialKnockoutProjectionResult`.

Required QA scenario:

```txt
Provider:
- QF live: France vs Morocco, score 1-0
- provider-backed fixtures include Brazil vs Norway, Spain vs Belgium, Norway vs England, Argentina vs Switzerland
- later provider records may appear completed before dependencies are valid

Expected:
- no Canada vs Paraguay
- no Canada vs Norway from stale topology
- France vs Morocco is Official fixture + Live
- no Official champion/runner-up/third place while dependencies are unresolved
- Home and /tournament agree
```

Required validation:

```bash
pnpm --filter @world-cup-2026-predictor/web test
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @world-cup-2026-predictor/web test:e2e:ci
git diff --check
```

Final implementation status should be:

```txt
ready_for_provider_first_knockout_graph_qa
```

or:

```txt
blocked_with_reason
```
