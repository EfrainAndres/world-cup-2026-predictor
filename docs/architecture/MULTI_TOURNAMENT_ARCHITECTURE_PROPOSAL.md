# Multi-Tournament Architecture Proposal (Post-Validation)

**Phase:** 12.17A — Multi-Tournament Architecture After Validation
**Status:** Proposal only. No implementation in this phase.
**Companion decision:** `ADR-0012-multi-tournament-architecture-after-validation.md`
**Date:** 2026-06-22

> This document proposes how the product *could* support multiple tournaments in the future. It changes no application code, schema, migration, route, provider, model, test, or UI. Per ADR 0012 and the Phase 12 roadmap, no generalization happens before the live World Cup 2026 workflow is validated end-to-end. Every file/line citation below describes the codebase **as it exists today**, captured to make the future plan concrete and reviewable.

---

## 1. Purpose and Non-Goals

### Purpose

- Audit, with citations, exactly how "World Cup 2026" is coupled into the codebase today.
- Classify each coupling so a future team knows what to keep specific, what to generalize, what needs an adapter, and what to defer.
- Propose future architectural boundaries without building them.
- Define a future database-migration strategy that protects immutable history.
- Define a staged, evidence-gated roadmap (12.17A–12.17D).

### Non-Goals (explicitly out of scope for this phase)

- Introducing any tournament abstraction, registry, adapter, or format layer in code.
- Adding any `tournament_id` column or migration.
- Changing any route, provider, model constant, version string, or UI label.
- Implementing any second tournament.

---

## 2. Coupling Inventory (Audit)

Each area is rated as currently **Hardcoded**, **Partially parameterized**, or **Generic**, with the controlling files.

### 2.1 Tournament identity

**Hardcoded.** No tournament concept exists; identity is embedded in string literals.

- `packages/api/src/snapshot-service.ts:6` — `WORLD_CUP_2026_PREDICTION_MODEL_VERSION = \`wc2026-prediction-${LIVE_ELO_PIPELINE_VERSION}\``. Stamped on every snapshot; feeds the content hash and idempotency key.
- `packages/api/src/prediction-evaluation-service.ts:27` — `WORLD_CUP_2026_EVALUATION_METRIC_VERSION = "wc2026-model-vs-reality-v1"`. Feeds the evaluation identity key.
- `packages/api/src/tournament-form.ts:12–20` — six `WORLD_CUP_2026_TOURNAMENT_FORM_*` constants, including a hardcoded reference date `2026-07-01T00:00:00Z`.
- `packages/api/src/async-projection-cache.ts:23` — cache key built as `` `wc2026:${group.toUpperCase()}:${timezone}` ``.
- `packages/model/src/elo-to-xg-calibration.ts:13` — `ELO_TO_XG_CALIBRATION_WC2026_HOLDOUT = "wc2026"`.

### 2.2 Fixtures and groups

**Hardcoded.**

- `packages/api/src/world-cup-2026-teams.ts:57–73` — `WORLD_CUP_2026_GROUPS`, the full 12 groups × 4 teams (48-team) roster as an `as const` array.
- `packages/api/src/world-cup-2026-teams.ts:117` — fixture IDs generated with the literal prefix `` `wc2026-group-${group}-md${matchday}-...` ``.
- `packages/api/src/world-cup-2026-teams.ts:81–88` — `WORLD_CUP_2026_GROUP_FIXTURE_PAIR_INDICES`, the fixed 3-matchday / 6-fixture-per-group schedule.
- `packages/api/src/world-cup-2026-teams.ts:136,140` — `WORLD_CUP_2026_GROUP_STAGE_FIXTURES` and `WORLD_CUP_2026_LOCAL_STATIC_RESULTS`.

### 2.3 Standings and qualification

**Hardcoded.**

- `packages/api/src/world-cup-2026-teams.ts:347` — `buildWorldCup2026BestThirdPlaceRanking`.
- `packages/api/src/world-cup-2026-teams.ts:369,383` — `buildWorldCup2026QualifiedTeams`: top two per group plus `bestThirdPlaceRanking.slice(0, 8)`.
- `packages/api/src/world-cup-2026-teams.ts:398–399` — R32 seeding split at `groupRunnersUp.slice(0, 4)` / `slice(4)`.
- `packages/model/src/fifa-2026-format.ts:120–141` — `selectFIFA2026BestThirdPlaceTeams` / `selectFIFA2026QualifiedTeams`, with a 32-team knockout guard.
- `packages/model/src/group-stage.ts:63+` — `simulateGroup` accepts a `qualifiersCount` (default 2); the only genuinely parameterized advancement piece, but WC2026 callers pass the hardcoded value.

### 2.4 Format configuration

**Partially parameterized but inert.**

- `packages/model/src/types.ts:269–277` — `FIFA2026TournamentFormat` interface (`totalTeams`, `groupCount`, `teamsPerGroup`, `topTeamsPerGroup`, `bestThirdPlaceTeams`, `knockoutTeams`, `groupIds`).
- `packages/model/src/fifa-2026-format.ts:9–25` — `FIFA_2026_TOURNAMENT_FORMAT` object populated, **but never accepted as a parameter by any function**; validators import the named constants directly.
- `packages/model/src/tournament.ts:120–126` — generic `simulateTournament` uses a power-of-two bracket and explicitly notes "This is not the full FIFA World Cup 2026 format."

### 2.5 Result providers and ingestion

**Hardcoded interface; one configurable adapter underneath.**

- `packages/api/src/results-provider-foundation.ts:39–45` — `WorldCup2026FootballResultsProvider` interface (`getFixtures`, `getLiveMatches`, `getCompletedResults`, `getStandings`); resolver `resolveWorldCup2026ResultsProviderFoundation` at line 492.
- `packages/api/src/results-provider-foundation.ts:301–318` — local static provider stamps `competition: "FIFA World Cup"`, `season: "2026"`, `syncedAt: "2026-06-14"`.
- `packages/api/src/live-results-sync.ts:229–298,384–390` — football-data.org adapter; defaults `competitionCode = "WC"`, `season = "2026"`, **configurable** via `FOOTBALL_DATA_COMPETITION_CODE` / `FOOTBALL_DATA_SEASON`. The wrapping `synchronizeWorldCup2026Results` (line 346) is WC2026-named with no multi-tournament routing.
- `packages/api/src/elo-ingestion.ts:67,185–186` — fallback date `2026-06-11`; every ingested match stamped `competition: "FIFA World Cup"` and `neutralSite: true`.
- `packages/api/src/international-elo-adapter.ts:51` — `mergeEloMatchSources` is fully generic (dedup by `match_id`); `EloCompatibleMatch` has no WC2026 fields.

### 2.6 Snapshots and evaluations

**Hardcoded by naming/convention; no tournament discriminator field.**

- `packages/api/src/schemas.ts:1582–1600` — `WorldCup2026PredictionSnapshot` (no literal `tournamentId`; tournament implied by `fixtureId` and `modelVersion`).
- `packages/api/src/schemas.ts:1693+` — `WorldCup2026PredictionEvaluation` (tournament implied by `fixtureId` and `metricVersion`).
- `packages/api/src/prediction-evaluation-service.ts:572,582` — eligibility check: snapshot `fixtureId` must exist in `WORLD_CUP_2026_GROUP_STAGE_FIXTURES`, else `not_eligible` / `invalid_fixture_identity`.

Hash composition (critical; see §6):

- `packages/api/src/snapshot-service.ts:102–111` — **content hash** source: `fixtureId`, `homeTeam`, `awayTeam`, `cutoffAt`, `modelVersion`, `modelConfiguration`, `inputs`, `prediction`. `capturedAt` is intentionally excluded.
- `packages/api/src/snapshot-service.ts:26–36` — **idempotency key** source: `fixtureId`, `cutoffAt`, `modelVersion`, `eloPreset`, `maxGoals`, `tournamentResultsAdjustmentEnabled`; `snapshotId = snap-${idempotencyKey.slice(0,16)}`.
- `packages/api/src/prediction-evaluation-service.ts:263–275` — **evaluation identity key** source: `snapshotId`, `fixtureId`, `providerFixtureId?`, `homeGoals`, `awayGoals`, `resultStatus`, `metricVersion`; `evaluationId = eval-${identityKey.slice(0,16)}`.

### 2.7 Projection cache

**Hardcoded.**

- `packages/api/src/async-projection-cache.ts:23` — key prefix `wc2026:` (see §2.1).
- Persistence: see §2.9 for the `projection_cache` schema and its `UNIQUE (group_code, timezone)` natural key.

### 2.8 Runtime (API) routes

**Hardcoded literal path segment.**

- `apps/web/app/api/world-cup-2026/groups/[group]/route.ts` — GET group detail.
- `apps/web/app/api/world-cup-2026/daily-matches/route.ts` — GET daily matches; `route.ts:5` also builds an internal runtime URL `/world-cup-2026/daily-matches`.
- No `/api/tournaments/[id]/...` namespace exists.

### 2.9 Dashboard routes, navigation, and persistence constraints

**Web routes — tournament-implicit (Hardcoded branding, no tournament segment).**

- Page routes: `/` (`apps/web/app/page.tsx`), `/groups/[group]` (`apps/web/app/groups/[group]/page.tsx`), `/prediction-history` (`apps/web/app/prediction-history/page.tsx`). No `/tournament/[id]` segment anywhere.
- Branding hardcoded in: `apps/web/app/layout.tsx:6–7`, `apps/web/src/components/AppHeader.tsx:22`, `apps/web/src/components/GroupNav.tsx:11`, `apps/web/app/page.tsx:48,161`, `apps/web/app/groups/[group]/page.tsx:44`, `apps/web/app/prediction-history/page.tsx:8`.
- `apps/web/src/components/TodaysMatchesSection.tsx:24` — hardcoded `DAILY_MATCHES_API_PATH = "/api/world-cup-2026/daily-matches"`.

**Persistence constraints — no tournament scoping today.**

- `packages/api/migrations/0001_prediction_snapshots.sql` — PK `snapshot_id`; `UNIQUE (idempotency_key)`; `CHECK (group_code IN ('A'..'L'))`; no tournament column.
- `packages/api/migrations/0002_prediction_evaluations.sql` — PK `evaluation_id`; `UNIQUE (snapshot_id, result_identity, metric_version)`; FK `snapshot_id → prediction_snapshots(snapshot_id) ON DELETE/UPDATE RESTRICT`; no tournament column.
- `packages/api/migrations/0003_projection_cache.sql` — PK `cache_key`; `UNIQUE (group_code, timezone)`; `CHECK (group_code IN ('A'..'L'))`; no tournament column.

---

## 3. Coupling Classification

Classification legend: **keep_specific** (intentionally World Cup 2026; do not generalize), **generalize_later** (refactor into a tournament-parameterized form when validated), **adapter_required** (needs a tournament-specific implementation behind a shared contract), **defer** (no decision now; revisit with evidence).

| # | Coupling area | Controlling evidence | Classification | Rationale |
|---|---|---|---|---|
| 1 | Tournament identity (version strings, cache prefix, calibration split) | `snapshot-service.ts:6`, `prediction-evaluation-service.ts:27`, `tournament-form.ts:12–20`, `async-projection-cache.ts:23`, `elo-to-xg-calibration.ts:13` | generalize_later | Identity should become a first-class `tournamentId`, but only when a second tournament exists. Version strings are append-only. |
| 2 | Fixtures and groups | `world-cup-2026-teams.ts:57–140` | adapter_required | Each tournament supplies its own roster/fixtures/schedule behind a shared fixture/group contract. |
| 3 | Standings and qualification rules | `world-cup-2026-teams.ts:347–399`, `fifa-2026-format.ts:120–141` | adapter_required | "Top two + best eight thirds" and R32 seeding are tournament-format strategies; need a strategy interface. |
| 4 | Format configuration | `types.ts:269–277`, `fifa-2026-format.ts:9–25` | generalize_later | The inert `FIFA2026TournamentFormat` type is the seed of a generic format config; wire it in only when used by ≥2 tournaments. |
| 5 | Result providers and ingestion | `results-provider-foundation.ts:39–45`, `live-results-sync.ts:229–298`, `elo-ingestion.ts:185–186` | adapter_required | Generalize the provider interface to `TournamentFootballResultsProvider`; ingestion stamps (`neutralSite`, `competition`) become per-tournament config. |
| 6 | Snapshots and evaluations (domain + hashes) | `schemas.ts:1582–1600,1693+`, `snapshot-service.ts:26–111`, `prediction-evaluation-service.ts:263–275` | generalize_later | Add an explicit tournament scope while preserving existing hashes (§6). Hash composition is append-only and additive. |
| 7 | Projection cache | `async-projection-cache.ts:23`, `0003_projection_cache.sql` | generalize_later | Tournament-scope the cache key and natural key; cache is regenerable, so lowest-risk to change. |
| 8 | Runtime (API) routes | `apps/web/app/api/world-cup-2026/...` | adapter_required | Introduce a `/api/tournaments/[id]/...` namespace; keep WC2026 routes as aliases (§5, §7). |
| 9 | Dashboard routes and navigation | `apps/web/app/...`, `AppHeader.tsx`, `GroupNav.tsx` | defer | UI tournament selection is the last stage and only after backend validation; branding strings are trivial to parameterize later. |
| 10 | Model assumptions | `elo.ts`, `live-elo-pipeline.ts`, `elo-to-xg.ts`, `dixon-coles.ts` (generic); `elo-ingestion.ts:185–186`, `world-cup-2026-teams.ts:52` (specific) | keep_specific (core stays generic) | The Elo/Poisson/Dixon-Coles/xG core is already tournament-agnostic; only blanket assumptions (`neutralSite: true`, fallback seed/date) are WC2026-specific and become per-tournament config. |

---

## 4. Proposed Future Boundaries (Design Sketch — Not Implemented)

Each boundary is a target shape for a later stage. None of these types or modules exist today; they must not be created in this phase.

1. **Tournament identity and registry.** A `TournamentId` value (for example the opaque string `"wc2026"`) and a small read-only registry mapping a tournament id to its descriptor (display name, format, group ids, provider binding). World Cup 2026 is the first and, initially, only registered entry.
2. **Tournament adapter.** A `TournamentAdapter` contract that bundles a tournament's fixtures, groups, qualification strategy, provider binding, and ingestion stamps. The current `world-cup-2026-teams.ts` becomes one concrete adapter (`wc2026`).
3. **Format configuration.** Promote the existing inert `FIFA2026TournamentFormat` (`types.ts:269–277`) into a `TournamentFormatConfig` that selectors and validators actually read, instead of importing named constants.
4. **Fixture and group references.** A fixture/group reference contract so `fixtureId`/`group` are interpreted per tournament. Fixture-ID *format* stays per-adapter (WC2026 keeps `wc2026-group-...`); no historical ID is recomputed.
5. **Standings / qualification strategies.** A `QualificationStrategy` interface; WC2026's "top two + best eight thirds + R32 seeding split" becomes one strategy implementation.
6. **Results-provider ownership.** Generalize `WorldCup2026FootballResultsProvider` into `TournamentFootballResultsProvider<T>`; the football-data.org adapter (already `competitionCode`/`season`-configurable) is bound per tournament by the registry.
7. **Prediction-history ownership.** Snapshots and evaluations gain an explicit tournament scope (column + domain field) while their hash composition stays backward compatible (§6). Stores expose tournament-scoped queries instead of relying on `fixtureId`/`modelVersion` substring filtering.
8. **Persistence tournament scoping.** Additive `tournament_id` columns and tournament-scoped unique constraints (§6), backfilled to `wc2026` for existing rows.
9. **API and web route compatibility.** A generic `/api/tournaments/[tournamentId]/...` namespace and (last) optional web tournament selection; existing routes remain valid aliases resolving to `wc2026`.

---

## 5. Compatibility Requirements

(Binds every later stage; mirrors ADR 0012.)

- **Routes:** `/api/world-cup-2026/...` and `/`, `/groups/[group]`, `/prediction-history` must keep working. New generic routes are additive; WC2026 routes may become aliases but must not break or redirect-loop.
- **Identifiers:** existing `fixtureId`, `snapshotId`, `evaluationId`, `idempotency_key`, `content_hash`, `result_identity` values are never recomputed. Fixture-ID format stays per-adapter.
- **Version strings:** `modelVersion`, `metricVersion`, `formula_version`, and schema versions are append-only. A second tournament adds new strings; it never edits existing ones.
- **Persistence:** new scoping columns are nullable-or-backfilled additive migrations; no destructive rewrite of immutable history.
- **Default tournament:** in the absence of an explicit tournament, the system resolves to `wc2026`, preserving today's behavior exactly.

---

## 6. Future Database-Migration Strategy and Hash/Idempotency Impact

### 6.1 Tables and the changes they would need

| Table | Add `tournament_id`? | Unique-constraint change | Backward-compat note |
|---|---|---|---|
| `prediction_snapshots` | Yes (denormalized scope) | `UNIQUE (idempotency_key)` may stay if the app-layer key already encodes tournament; otherwise rebuild as `UNIQUE (tournament_id, idempotency_key)` | Add column `NOT NULL DEFAULT 'wc2026'` (backfill existing rows), then optionally tighten the constraint. |
| `prediction_evaluations` | Optional (query convenience) | **No change required** — identity is `(snapshot_id, result_identity, metric_version)` and `snapshot_id` is already globally unique, so tournament scope is transitive via the FK chain. | Safe nullable add for denormalized querying. |
| `projection_cache` | **Yes (required)** | Replace `UNIQUE (group_code, timezone)` with `UNIQUE (tournament_id, group_code, timezone)`; generalize/replace `CHECK (group_code IN ('A'..'L'))` | Cache is regenerable, so lowest-risk. Add `tournament_id NOT NULL DEFAULT 'wc2026'`, then drop/recreate the natural key. |

The `CHECK (group_code IN ('A'..'L'))` constraint is hardcoded to WC2026 in all three tables and must be generalized (or made per-tournament) before any tournament with different group identifiers is stored.

### 6.2 Impact on immutable snapshot hashes and idempotency keys

This is the highest-risk area and the reason ADR 0012 gates 12.17B before any code generalization.

- **Snapshot content hash** (`snapshot-service.ts:102–111`) and **idempotency key** (`snapshot-service.ts:26–36`) both include `modelVersion`, which today is `wc2026-prediction-...`. **Distinct tournaments already produce distinct hashes** because their `modelVersion`/`fixtureId` strings differ — so a second tournament does **not** collide with WC2026 records even without a `tournament_id` column.
- Therefore the migration strategy must be **additive only**: a `tournament_id` column is for *querying and constraint scoping*, never an input that would change the hash of already-stored rows. Existing rows keep their exact hashes; they are merely tagged `wc2026`.
- **Evaluation identity key** (`prediction-evaluation-service.ts:263–275`) includes `metricVersion` (`wc2026-model-vs-reality-v1`) and `fixtureId`, so it is likewise tournament-distinct by construction.
- **Rule for 12.17B/C:** if tournament identity is ever folded into hash composition, it must be introduced under a **new** `snapshot_schema_version` / `metricVersion` for new records only; historical records are never rehashed.

### 6.3 Migration sequencing (future)

1. Add nullable `tournament_id`, backfill existing rows to `wc2026`, then set `NOT NULL DEFAULT 'wc2026'`.
2. Generalize the `group_code` check constraint (or move group validation to the application/adapter layer).
3. Rebuild `projection_cache` natural key to include `tournament_id`.
4. Only if required by evidence: rebuild `prediction_snapshots` idempotency uniqueness as tournament-scoped.
5. Leave `prediction_evaluations` identity untouched (transitively scoped).

---

## 7. Route Compatibility Policy (API + Web)

- **API:** introduce `/api/tournaments/[tournamentId]/groups/[group]` and `/api/tournaments/[tournamentId]/daily-matches`. Keep `/api/world-cup-2026/...` as permanent aliases that resolve `tournamentId = wc2026`. The internal runtime URL construction (`daily-matches/route.ts:5`) is updated to be tournament-parameterized without changing the external WC2026 path.
- **Web:** keep flat routes (`/`, `/groups/[group]`, `/prediction-history`) resolving to `wc2026`. Optional future tournament selection (a `/tournaments/[id]/...` tree or a tournament context switch) is the **last** stage and only after backend validation. Branding strings move into a per-tournament descriptor read by the shell.

---

## 8. Staged Implementation Roadmap (Defined, Not Implemented)

Each stage is gated on the prior stage and on live-tournament validation evidence (§9).

| Stage | Name | Scope | Gate to start |
|---|---|---|---|
| **12.17A** | Architecture proposal | This document + ADR 0012. Documentation only. | — (current) |
| **12.17B** | Tournament-aware persistence migration plan | Detailed, reviewed SQL migration plan (not applied) for additive `tournament_id`, constraint changes, and backfill, honoring §6. Still no code generalization. | Live WC2026 workflow validated end-to-end; validation metrics agreed. |
| **12.17C** | Generic tournament identity and adapter contracts | Introduce `TournamentId`, registry, `TournamentAdapter`, `QualificationStrategy`, generic provider interface, and format config — with WC2026 as the sole concrete adapter. Apply the 12.17B migrations additively. Backward compatible per §5. | 12.17B plan reviewed and approved. |
| **12.17D** | First additional tournament proof of concept | Register one second tournament behind the contracts to prove the abstraction; backend only. | 12.17C merged and stable; second-tournament data available. |
| **later** | UI tournament selection | Web tournament switching/branding. | Backend multi-tournament validated in 12.17D. |

---

## 9. Evidence Required Before Implementation

12.17B may not begin until there is documented evidence that:

- The live World Cup 2026 prediction workflow (snapshot → live result ingestion → Model-vs-Reality evaluation → dashboard) has run end-to-end against real fixtures.
- Prediction-history persistence has operated against a real PostgreSQL instance in a non-production environment (already achieved in Phase 12.15E; see `docs/qa/REAL_POSTGRESQL_ENVIRONMENT_VALIDATION.md`).
- The product value of the live World Cup experience is confirmed (usage and evaluation signals over an agreed window — exact metrics to be defined as a 12.17B precondition).
- A concrete second tournament is actually wanted, with available fixtures/results data.

Absent this evidence, the correct state is "remain World Cup 2026-specific."

---

## 10. Risks of Premature Abstraction

| Risk | Why it matters | Mitigation in this plan |
|---|---|---|
| Immutable-history churn | Folding tournament identity into hashes could invalidate or duplicate stored snapshots/evaluations. | §6: scoping is additive and never rehashes historical rows; new identity only under new version strings. |
| Inert abstractions | `FIFA2026TournamentFormat` already shows speculative types accrue unused (it is never passed anywhere). | Generalize a layer only when ≥2 tournaments use it (12.17C/D gates). |
| UX dilution | A generic shell can weaken the focused WC2026 experience. | UI generalization is the last stage, after backend validation (§8). |
| Constraint regressions | The `group_code IN ('A'..'L')` checks and `projection_cache` natural key are easy to break. | §6 sequences constraint changes explicitly and keeps the cache (regenerable) as the lowest-risk first target. |
| Maintenance burden with one tournament | Abstraction cost without user value. | Defer until a second tournament is actually wanted (§9). |
| Route breakage | Existing public URLs and stored API paths could change. | §5/§7: additive routes with permanent WC2026 aliases and a `wc2026` default. |

---

## 11. Summary

The codebase is World Cup 2026-specific across identity, fixtures, qualification, providers, snapshots/evaluations, cache, routes, and branding, while the underlying Elo/Poisson/Dixon-Coles/xG model core is already generic. The cleanest future path is an additive, evidence-gated generalization: a tournament registry and adapter contracts, additive persistence scoping that preserves all existing hashes and identifiers, and UI tournament selection only at the end. Until the live World Cup 2026 workflow is validated and a second tournament is actually wanted, the product remains intentionally World Cup 2026-specific. **No part of this proposal is implemented in Phase 12.17A.**
