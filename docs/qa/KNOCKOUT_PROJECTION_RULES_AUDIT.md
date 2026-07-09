# Knockout Projection Rules Audit

Phase: pre-implementation audit for `feat/full-knockout-projection-path`
Date: 2026-07-09
Status: audit complete, implementation not started

## Purpose

This audit defines the invariants, edge cases, labeling rules, required tests, documented risks, and explicit non-goals for the full knockout projection path phase, before any implementation begins.

It is grounded in the current implementation:

- `packages/api/src/world-cup-2026-official-knockout.ts` — official topology (matches 73-104), provider reconciliation, official-result precedence, deterministic projected advancement, podium derivation (Phase 12.19G1).
- `packages/api/src/live-results-sync.ts` — normalized provider records including `decisionMethod`, `winner`, `regularTime`/`extraTime`/`penalty` score fields.
- `apps/web/app/tournament/page.tsx`, `apps/web/app/page.tsx`, `apps/web/src/lib/server-runtime.ts` — the two current consumers of the projection.
- `docs/data-quality/OFFICIAL_KNOCKOUT_BRACKET_AUDIT.md` and `docs/model-results/OFFICIAL_KNOCKOUT_BRACKET_INTEGRATION.md`.

## Scope Correction Before Implementation

Two scope statements need correction up front:

1. **The knockout path starts at the Round of 32, not the Round of 16.** The World Cup 2026 knockout stage is matches 73-104 (Round of 32: 73-88, Round of 16: 89-96, Quarterfinals: 97-100, Semifinals: 101-102, Third Place: 103, Final: 104). Any phase description that begins the path at the Round of 16 contradicts the fixed FIFA topology already encoded and validated in `WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY`.
2. **Most of the requested behavior already exists.** Phase 12.19G1 already combines official results with model projections through the fixed topology and derives champion, runner-up, third place, and fourth place. This phase is a hardening and completion pass, not a greenfield build. The single largest functional gap is official extra-time/penalty result consumption (see the primary defect below).

## Primary Known Gap (must be fixed in this phase)

The normalized provider record already carries winner-method metadata:

- `WorldCup2026ExternalFixtureRecord.decisionMethod` (`regular_time | extra_time | penalties`)
- `WorldCup2026ExternalFixtureRecord.winner` (provider-declared winning team name)
- `regularTimeHomeScore/AwayScore`, `extraTimeHomeScore/AwayScore`, `penaltyHomeScore/AwayScore`

But `selectOfficialWinner()` in the knockout service compares only the aggregate `homeScore`/`awayScore` and returns a warning with **no winner** when the score is tied:

> "Official completed knockout result is tied and the provider did not include extra-time or penalty winner metadata."

For a penalty-decided match, the normalized `homeScore`/`awayScore` is the extra-time-inclusive tied score, so **every real shootout result currently leaves that match unresolved and cascades `unresolved` through the rest of the bracket**. The 12.19G1 integration doc lists this as a deferred limitation; the provider contract now exposes the needed metadata, so this phase must consume it.

## 1. Critical Invariants (must never be violated)

| # | Invariant | Enforcement |
| --- | --- | --- |
| I1 | Fixed FIFA topology: matches 73-104, unique match numbers, correct stage ranges, no forward or cyclic upstream references, every downstream slot fed by exactly one source. No reseeding of any kind. | `validateOfficialKnockoutTopology()` — keep and never relax. |
| I2 | Every non-Round-of-32 participant resolves only through `winner_of` / `loser_of` typed sources from the fixed topology. Participants are never chosen by strength, standings, or display strings. | Type system + topology validation. |
| I3 | Official completed results always override projections. A projection must never replace, contradict, or "improve" an official winner, score, or downstream consequence. | Resolution order in `buildOfficialWorldCup2026KnockoutProjection()`; regression tests. |
| I4 | An officially eliminated team never appears in any later round or podium slot, except the semifinal losers' one legitimate appearance in Match 103. | Per-stage participant uniqueness + podium uniqueness validation; add an explicit elimination regression test (official upset scenario). |
| I5 | Third Place Match participants are exactly `loser_of(101)` and `loser_of(102)`. Never semifinal winners, never quarterfinal losers. | Topology constant + existing routing test. |
| I6 | Podium derivation is fixed: champion = winner of 104, runner-up = loser of 104, third = winner of 103, fourth = loser of 103. All four concrete values must be distinct. | `buildPodium()` + `validatePodium()`. |
| I7 | A tied official score with no trustworthy decision metadata must never silently advance a team. It resolves via `decisionMethod`/`winner` when present and consistent; otherwise the match stays `unresolved` with a warning. | New official-winner resolution logic + tests. |
| I8 | Unresolved propagates as unresolved. The service never invents a participant; unresolved slots surface as typed `unresolved` states and podium entries as `Unavailable`. | Existing `resolveParticipant()` behavior; keep. |
| I9 | Ambiguous provider records are rejected and surfaced as matching issues, never attached to a similar-looking fixture. Provider records are never mutated. | `findProviderRecord()` rejection paths; keep. |
| I10 | Canonical official Round-of-32 teams are never replaced by standings-derived projections (the Phase 12.19G1 preview defect). | Existing exact-fixture regression tests; keep. |
| I11 | The projection build is strictly read-only: no snapshot, evaluation, projection-cache, or provider-state writes; no mutation of immutable prediction history. | No store dependencies in the module; add an explicit no-write test if stores become injectable. |
| I12 | Determinism: identical `syncResult` + `generatedAt` inputs produce a deep-equal full path, including every tie-break. | Existing deterministic tie policy (`projected_regulation` → `projected_extra_time` → `projected_penalties` by Elo → stable team identity); repeated-build test. |
| I13 | No look-ahead: unresolved matches are projected only from current synchronized state. A known official later-round result is never used to retro-fit an earlier projection, and the projection path never feeds prediction snapshots or evaluations. | Architecture boundary; documented in the phase doc. |
| I14 | Predictor usage is bounded: at most one `predictMatchFromLiveElo` call per unresolved match (≤ 32 per build), using the existing `balanced` preset with tournament adjustments off. No model constant, preset, or formula changes. | `predictorCallCount` metadata assertion in tests. |

## 2. Edge Cases We Might Forget

### Official-result semantics

- **Penalty-decided official result** (the primary gap): tied aggregate score, `decisionMethod: "penalties"`, `winner` set, penalty scores present → must advance the declared winner as `official_penalties`.
- **Extra-time-decided official result**: `decisionMethod: "extra_time"` with a non-tied extra-time-inclusive score → `official_extra_time`, not `official_regulation`.
- **Decision metadata conflicts with the score**: `winner` says away but `homeScore > awayScore`, or `decisionMethod: "penalties"` with a non-tied aggregate score. Policy: reject as a matching/data issue, leave unresolved with a warning — never trust either side silently.
- **Partial decision metadata**: `decisionMethod: "penalties"` but penalty scores or `winner` missing. Define the minimum sufficient evidence (a declared `winner` consistent with a tied score should be enough; penalty scores alone without `winner` need a defined rule).
- **Reversed provider orientation must swap every score pair.** `providerScore()` currently swaps only `homeScore`/`awayScore`. If penalty/extra-time/regular-time scores are consumed or displayed, they need the same orientation correction, and the `winner` team name must be canonicalized before comparison.

### Provider reconciliation

- **Duplicate records for one fixture with different statuses**: the dedup key in `uniqueRecords()` includes `status`, so a stale `live` record plus a fresh `finished` record for the same fixture both survive, `findProviderRecord()` sees two match-number candidates, returns `null`, and the official result is silently dropped. Define precedence (e.g., prefer `finished`, then latest `updatedAt`) or dedupe by fixture identity.
- **Provider ahead of local resolution**: the provider publishes a finished Round-of-16 record while one of its feeding Round-of-32 records is missing or unmatched. Team-based matching fails (local participants are projected or unresolved) and match-number matching rejects on team conflict, so a real official result is dropped. Decide and document: either adopt the provider participants for that match with a typed provenance, or keep rejecting but surface a first-class warning. Never let a projection contradict a dropped-but-real official result without a visible warning.
- **Official result contradicts the projected upstream winner**: model projected team A from match 73, but the provider's match 89 record shows team B. Resolution is in ascending match-number order, so this only works if match 73's official result is present; otherwise it is the "provider ahead" case above.
- **Live or halftime knockout fixture**: must never be treated as completed. Participants are known, so the match is still projected pre-match style — but the in-progress provider score must not be displayed as an official final score.
- **Postponed/cancelled knockout fixture**: stays unresolved and cascades. Document that FIFA reschedules knockout matches, so `postponed` is temporary and the path will re-fill on a later sync; `cancelled` at knockout stage has no defined FIFA outcome and must stay unresolved.
- **Team-name normalization**: provider names with accents and variants (Côte d'Ivoire / Ivory Coast, DR Congo / Congo DR, Bosnia and Herzegovina / Bosnia-Herzegovina) must canonicalize before any identity comparison, including the `winner` field.
- **`matchday` as official match number is an assumption**, not a provider guarantee. If real knockout payloads carry `matchday` values that are not 73-104, match-number reconciliation silently never fires and everything degrades to team matching.

### Projection mechanics

- **Prediction failure mid-path** (missing Elo coverage, unrecognized name): that match becomes unresolved and its subtree cascades. The rest of the bracket must still resolve, and the failure must be visible, not just a dropped card.
- **Modal-scoreline tie chain**: tied modal score → win-probability comparison → Elo comparison → stable team identity. Each step is deterministic; regression-test each fallback tier, including the epsilon boundaries (`PROJECTION_TIE_EPSILON`).
- **Third Place Match with both semifinals projected, one projected, or both official** — the mixed states matter because the third-place result can become official while the final is still projected (they are independent matches).
- **`syncResult.status === "error"` or empty provider data**: entire bracket runs on canonical fixtures + projections; `providerFallbackUsed` must be true and surfaced.
- **Champion path length**: a champion's `path` should contain exactly 5 match numbers (R32→R16→QF→SF→Final); the fourth-place path routes through match 103. Path arrays feed the Home outlook display — verify them, don't just render them.

## 3. UX Labeling Rules (official vs projected)

| Rule | Detail |
| --- | --- |
| Every card states its source state in text | Map the six `OfficialKnockoutSourceState` values to distinct, visible, non-color-only labels (Phase 12.19H accessibility standard). `mixed_official_projected` needs per-slot labels, not one blended badge. |
| Podium entries are labeled individually | "Projected champion" until match 104 is official; third/fourth can be official while champion is still projected. Never one global "Projected" banner covering four differently-sourced values. |
| Penalty results display both scores | Official shootout result renders as regulation/aggregate plus shootout, e.g. "1-1 (4-2 pens)". Never render the penalty score as goals, and never render a shootout winner as a regulation win. |
| Advancement method is a resolution label, not a match forecast | `projected_penalties` means "the tie-break chain reached the penalties tier", not "this match will go to penalties". Keep the existing disclosure copy that states this. |
| Live scores are never final | A live/halftime provider score on a knockout card must be labeled live and must not use official-result styling. |
| Unresolved slots name their source | "Winner of Match 89", never a blank, a dash, or a guessed team. |
| Provenance stays visible but collapsed | Canonical fixture `asOf`, sync timestamp, provider fallback state, and matching issues stay in the technical disclosure; the fallback warning is promoted out of the disclosure when `providerFallbackUsed` is true. |
| Home outlook and /tournament must agree | Both consume the same projection build with the same labels. A champion name or label that differs between Home and /tournament destroys trust; add a consistency test. |
| Timestamps use the established timezone rules | Kickoff displays follow the Colombia display-timezone behavior (Phase 12.18B8); UTC instants stay canonical. |

## 4. Test Cases Required Before Merge

### API unit/integration (knockout service)

1. **Full official path**: all 32 matches finished via provider records (including at least one extra-time and one penalty decision) → all-official podium, `predictorCallCount === 0`, no warnings beyond orientation notes.
2. **Fully projected path**: no provider records → canonical R32, 32 predictor calls, complete podium, `providerFallbackUsed: true`.
3. **Penalty decision advances the declared winner**: tied aggregate, `decisionMethod: "penalties"`, `winner` set → `official_penalties`, correct downstream feed; plus the reversed-orientation variant with penalty scores swapped.
4. **Extra-time decision** → `official_extra_time` with the extra-time-inclusive score.
5. **Winner/score conflict rejected**: `winner` contradicts a decisive score → unresolved + warning, downstream unresolved.
6. **Tied score with no metadata** → unresolved + warning (regression of current behavior).
7. **Official upset eliminates the model favorite**: assert the favorite appears in no later round and no podium slot (invariant I4 as a direct test, not only via uniqueness validation).
8. **Duplicate provider records (live + finished for the same fixture)** → deterministic resolution per the chosen precedence rule, official result not dropped.
9. **Provider-ahead scenario**: finished R16 record with missing upstream R32 records → the documented policy holds and a visible warning is produced.
10. **Postponed and cancelled knockout fixtures** → unresolved + cascade + warnings.
11. **Prediction failure for one subtree** → rest of bracket intact, failure surfaced.
12. **Tie-break chain**: one test per tier (modal tie → win-prob; win-prob tie → Elo; Elo tie → stable identity), including epsilon boundary values.
13. **Determinism**: two builds with identical input are deep-equal.
14. **Topology and R32 regression suite** (exists — keep): 32 matches, exact official R32 fixtures, legacy projected-team rejection, third-place routing, podium uniqueness.
15. **Read-only guarantee**: the build performs no persistence writes.
16. **Bounded predictor usage**: `predictorCallCount` never exceeds the unresolved-match count.

### Web unit + E2E (Playwright)

17. `/tournament` renders distinct official vs projected labels for a mixed bracket fixture set.
18. Penalty result display format (aggregate + shootout) and no penalty-score-as-goals regression.
19. Podium labels are per-entry (projected champion + official third place simultaneously).
20. Home tournament outlook matches `/tournament` podium and labels for the same sync state.
21. Unresolved slot copy ("Winner of Match N") when a subtree fails.
22. Accessibility: statuses distinguishable without color; existing final-UX-QA checks stay green on the changed components.
23. Mobile: bracket overflow stays inside its scroll container (existing check re-run).

## 5. Risks to Document

| Risk | Why it matters |
| --- | --- |
| `matchday` = official match number is unverified against real football-data.org knockout payloads | If false, match-number reconciliation never fires and reconciliation quality silently degrades to team matching. Verify with the first real knockout sync and record the finding. |
| Canonical R32 fixture list is project-maintained static data | A wrong team or match number poisons all 32 matches. Provenance (`asOf`) exists; the update procedure when FIFA/provider data changes must be documented. |
| Provider score-field semantics for ET/pens | The sync layer picks the extra-time-inclusive score for penalty decisions; football-data.org `fullTime` historically includes extra time. Any misunderstanding here flips official winners. Document the mapping table with a real payload example. |
| One deterministic path is not a probability statement | Recruiters and users may read "Projected champion: X" as high confidence. The path is a single modal traversal; Monte Carlo distributions are explicitly deferred. Keep the disclosure. |
| Whole-path volatility | Any Elo update or new official result can flip the entire downstream path in one sync. Expected behavior, but jarring; the generated/sync timestamps are the mitigation. |
| Recompute-per-render cost | Up to 32 predictor calls per uncached render on Home + /tournament. Acceptable now; note the projection-cache option as a future step, not this phase. |
| Stale last-valid-cache statuses | The sync cache can serve records that disagree with fresh ones, feeding the duplicate-status ambiguity edge case above. |

## 6. Explicitly NOT Changed in This Phase

- Elo ratings, Elo-to-xG V2 constants, Poisson configuration, presets, confidence calculation, scoreline-presentation logic, attack/defense rollout flags.
- Group standings engine, third-place qualification rules, group-to-R32 seeding: the canonical official R32 fixture list remains the authoritative entry point.
- The official topology constants for matches 73-104 and their validators.
- Prediction snapshot identity/hash, capture workflow, automatic evaluation workflow, persistence schema, migrations.
- Provider selection and the sync layer's normalization semantics (`decisionMethod`, score-field selection) — this phase consumes those fields; it does not redefine them.
- Colombia display-timezone behavior; UTC canonical instants.
- No reseeding features, no Monte Carlo distributions, no knockout match-detail pages (deferred in 12.19G1), no new dependencies.

## Definition of Done for the Phase

- Invariants I1-I14 hold with regression coverage.
- Official extra-time and penalty results resolve winners and advance them (the primary gap is closed).
- The duplicate-record and provider-ahead policies are decided, implemented, and tested.
- All test cases in section 4 pass; existing knockout, tournament, and final-UX-QA suites stay green.
- UX labels follow section 3 on `/tournament` and Home.
- Risks in section 5 are recorded in the phase documentation.
