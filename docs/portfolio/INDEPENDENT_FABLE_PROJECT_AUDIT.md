# Independent Project Audit — Claude Fable 5

- **Date:** 2026-07-02
- **Auditor:** Claude Fable 5 (independent pass; prior audit documents in `docs/portfolio/` were deliberately not read before this report was written)
- **Scope:** Architecture, code quality, QA/SDET automation, model and data quality, security and operations, documentation, portfolio readiness
- **Method:** Direct inspection of source, tests, workflows, migrations, configuration, Git/CI history; non-destructive validation runs (`pnpm typecheck`, `pnpm test`, `pnpm build`, `git diff --check`)

---

## 1. Executive Summary

This is a genuinely strong portfolio repository with an unusually disciplined engineering process: 2,803 passing unit/integration tests across four packages, real dependency injection at persistence/provider/telemetry boundaries, strict no-look-ahead protections enforced in code *and* database CHECK constraints, conservative model-promotion gates with committed evidence artifacts, and documentation that mostly under-claims rather than over-claims (the README explicitly discloses the absence of POM and custom Playwright fixtures).

Two problems dominate the risk picture:

1. **The `main` branch CI is currently red.** The most recent completed CI run on `main` (run 28621186180, merge of PR #166) failed in the Playwright E2E step for two independent reasons: (a) CI installs only Chromium while `playwright.config.ts` declares chromium + firefox + webkit projects, so every firefox/webkit test dies with `browserType.launch: Executable doesn't exist`; and (b) a real chromium assertion failure in `match-simulation.spec.ts:1003` — the test asserts the Attack/Defense disclosure section is absent in `off` mode, but PR #166's observability change makes the API include AD metadata (and the UI render the section) even when the mode is off. A recruiter who clicks the Actions tab sees a failing default branch.
2. **Package boundaries are declared but not enforced.** `packages/api` imports the model package via relative paths (`../../model/src/index.js`) with no declared workspace dependency, and `apps/web` deep-imports `@world-cup-2026-predictor/api/src/...` internals. A custom webpack `NormalModuleReplacementPlugin` that rewrites `.js` → `.ts` exists solely to make this source-level coupling build. It works, but it undermines the "modular monorepo boundaries" story and makes the build fragile.

Beyond those, the largest debt is concentrated where the project's own README already admits it: `packages/api/src/routes.ts` is a 3,516-line module whose central function `predictMatchFromLiveElo` spans ~755 lines (lines 1129–1884), and the knockout-round flow is implemented as near-identical copy-pasted function/component families per round.

**Verdict: `ready_after_targeted_remediation`** — the remediation is narrow (restore green CI; decide the multi-browser policy; fix the env-coupled E2E assertion), but a red default branch is a hard publication blocker for a QA-positioned portfolio.

---

## 2. Publication-Readiness Verdict

**`ready_after_targeted_remediation`**

Blocking items (all in section 15):

- B1. `main` CI must be green (browser install/config mismatch + stale AD off-mode E2E expectation).
- B2. The multi-browser claim must match reality (either install firefox/webkit in CI or scope the config to chromium and say so).

Everything else in this report is non-blocking debt or presentation risk.

---

## 3. Architecture Strengths

Evidence-based strengths, verified in source:

1. **Correct dependency direction.** `data` → `model` → `api` → `web`. No reverse imports were found (`grep` for model→api or api→web imports returns nothing). The model package has zero runtime dependencies and no Node built-ins in its core paths.
2. **Real ports-and-adapters at the persistence boundary.** `AsyncPredictionSnapshotStore` / `AsyncPredictionEvaluationStore` / `GroupProjectionCacheStore` / `PredictionHistoryReadStore` interfaces each have an in-memory adapter and a PostgreSQL adapter (`persistence-runtime.ts`, `postgres-*.ts`, `async-*.ts`). The SQL client is injectable (`sqlFactory`) for tests.
3. **Real ports at the provider boundary.** Results providers (`createFootballDataOrgResultsProvider`, `createLocalStaticResultsProvider`, `createCachedResultsProvider`) and StatsBomb/Attack-Defense profile sources (artifact, in-memory, null implementations in `statsbomb-artifact-profile-source.ts`) are swappable via injected dependencies.
4. **Telemetry as an injected sink.** `PredictionTelemetrySink` with `nullTelemetrySink`, `createMemoryTelemetrySink` (tests), and `createStructuredLogTelemetrySink` (server-only stdout JSON). Telemetry failures can never fail a prediction (guarded emit).
5. **Dependency injection without a framework.** `predictMatchFromLiveElo(request, deps?)` accepts profile sources, rollout modes, readiness/activation decisions, and a telemetry sink; clocks and RNG are injectable in capture/audit/simulation paths (`generatedAt` injected; `createSeededRandom` in `packages/model/src/simulation.ts`).
6. **Framework independence of the domain.** All prediction logic lives in framework-free TypeScript. Next.js appears only in `apps/web`; React appears nowhere in `packages/*`.
7. **Deliberate client/server bundle safety.** `next.config.ts` marks `postgres` as a server external; `.server.ts` naming convention for server-only modules; and a dedicated test (`attack-defense-bundle-boundary.test.ts`) statically asserts that bundle-safe modules never import `node:fs`/`node:path` or the Node-only profile builder. Testing the bundle boundary is a genuinely uncommon, credible practice.
8. **Explicit fallback hierarchy.** External provider → cached → last-known-good (documented process-level cache in `server-runtime.ts` with staleness warning) → local static; enrichment stages fall back Attack/Defense → Elo V2 with guardrail-mediated `fallbackSource` reporting.
9. **Persistence identity design.** Append-only snapshot table with idempotency-key uniqueness, content hashing, schema-versioned JSONB payloads, and a documented decision *against* content-hash uniqueness (migration 0001 comment). Pre-match timing enforced by a CHECK constraint, not just application code.
10. **Operational controls.** Scheduled workflows use concurrency groups, `permissions: contents: read`, 15-minute timeouts, and preflight/dry-run/capture modes; snapshot capture takes a `pg_try_advisory_lock` to prevent concurrent writers.

### Which architecture labels are supportable?

| Claim | Verdict | Evidence |
|---|---|---|
| Layered architecture | **Yes** | Clean one-way layering data→model→api→web; verified no reverse imports |
| Modular architecture | **Partial** | Modules exist with clear responsibilities, but boundaries are bypassed by relative `../../model/src` imports and `api/src/*` deep imports (see finding H1) |
| Clean Architecture | **No (as a formal claim)** | Dependency rule mostly holds and frameworks are at the edges, but there is no systematic use-case/entity separation; `routes.ts` mixes orchestration, validation, presentation-shaping, and domain composition. "Clean-architecture-influenced" is defensible; the capitalized label is not |
| Hexagonal architecture | **Partial** | Persistence, providers, and telemetry are true ports with multiple adapters; the rest of the system (routes, UI composition) is not organized around ports. Claim "ports and adapters for persistence and provider integration," not "hexagonal architecture" |
| Dependency inversion | **Yes (scoped)** | Store/provider/sink interfaces consumed by orchestration; concrete adapters injected at composition points (`server-runtime.ts`, `*-server-composition.ts`) |
| Functional architecture | **Yes** | Pure functions with injected effects, no classes except two Error subclasses; README states this style explicitly |
| Domain-driven design | **No** | Rich types, but no bounded contexts, aggregates, or ubiquitous-language modeling; claiming DDD would invite losing an interview exchange |
| Service-oriented architecture | **No** | Single deployable; `packages/api` is an in-process handler library, not a service. No network boundary between "API" and "web" beyond Next.js route handlers |

---

## 4. Architecture Concerns

### H1 — Package boundaries bypassed by source-level imports (High)

- `packages/api/src/routes.ts:15` and `:83` import `"../../model/src/index.js"`; `attack-defense-production-config.ts:1` and `model-info.ts:1` do the same. `packages/api/package.json` does not declare `@world-cup-2026-predictor/model` as a dependency at all.
- `apps/web/src/lib/server-runtime.ts:33-39` deep-imports `@world-cup-2026-predictor/api/src/statsbomb-server-composition`, `.../src/attack-defense-server-composition`, `.../src/prediction-telemetry-sink`, `.../src/statsbomb-production-config` — bypassing the package's public `index.ts`.
- `apps/web/next.config.ts` contains a webpack `NormalModuleReplacementPlugin` that rewrites `./*.js` requests to `.ts` inside `packages/api/src` and `packages/model/src` so Next can compile the raw sources. `packages/api`'s `main` points at `src/index.ts` (TypeScript source as the package entry).

**Consequence:** the workspace graph lies about dependencies (Turborepo can't order or cache `api` against `model` changes via `^build`), `model`'s `dist` build output is dead weight for the web app, any file move in `model/src` breaks `api` silently until typecheck, and the webpack rewrite is a bespoke mechanism a future maintainer will not expect. **Defect probability:** medium (it works today and CI typechecks catch breakage) — the cost is fragility and explainability, not current breakage. **Action:** declare `model` as a workspace dependency of `api`, import via package name, re-export the four deep-imported server modules from a `@world-cup-2026-predictor/api/server` subpath export, and delete the webpack rewrite once imports resolve normally. **Blocks publication:** No, but expect interviewers to find it — it is visible in the first file most reviewers open (`next.config.ts`).

### H2 — `routes.ts` god module and a ~755-line orchestration function (High)

- `packages/api/src/routes.ts` is 3,516 lines. `predictMatchFromLiveElo` runs from line 1129 to ~1884 and sequentially handles: request validation, team alias resolution, Elo pipeline execution, Elo→xG, Attack/Defense stage (mode gating, eligibility, guardrails, shadow accounting), StatsBomb stage (same), guardrail fallbacks, Poisson matrix, scoreline presentation, confidence assessment, telemetry payload, and response assembly.
- `schemas.ts` (2,253 lines, 233 type/interface declarations) is a second aggregation point.

**Consequence:** the single most defect-prone edit surface in the repo; any pipeline change touches a function larger than most files. Tests mitigate (1,706 API tests, including stage-interaction matrices), but reviewability suffers. **Defect probability:** high for future changes. **Action:** extract a `prediction-pipeline/` module with one file per stage and a thin composition function; the stage seams (baseline → AD → SB → guardrail → presentation) are already visible in the code. **Blocks publication:** No — and the README already names orchestration files as "known extraction candidates," which is the right disclosure.

### M1 — Copy-pasted per-round knockout families (Medium)

- `routes.ts` contains near-identical `deriveProjectedQualifier` / `deriveQuarterfinalQualifier` / `deriveSemifinalQualifier` / `deriveFinalQualifier` functions and eleven `simulateWorldCup2026*Foundation` variants; `apps/web/src/components/` mirrors this with ~14 per-round `WorldCup*Section` components (`RoundOf16`, `Quarterfinal`, `Semifinal`, `Final`, `ThirdPlace` × simulation/match-simulation variants).
- **Consequence:** a rule change (e.g., tie-break policy) must be applied 4–5 times; drift between rounds would be silent. **Probability:** medium. **Action:** parameterize by round descriptor. **Blocks:** No.

### M2 — Module-level mutable caches (Medium, mostly well-managed)

- `server-runtime.ts:122` last-known-good sync cache; `persistence-runtime.ts:90-92` resolution caches; process-level artifact caches in the StatsBomb/AD composition modules.
- Each has a reset/shutdown hook for tests, and the LKG cache is documented. Residual risks: the memory persistence cache is never invalidated when `env` input changes between calls, and warm serverless instances can serve stale LKG data with only a warning string as signal. **Probability:** low. **Action:** document per-cache invalidation rules in one place. **Blocks:** No.

### M3 — Runtime request validation is handwritten and uneven (Medium)

- No schema library (no zod/ajv anywhere). `validateSimulateMatchRequest` / `validatePredictMatchFromLiveEloRequest` are thorough for their routes, but `runtime.ts:153` casts the parsed body `as unknown as SimulateMatchRequest` before handing it to the handler; contract safety rests on the handler's field-by-field checks staying in sync with 2,253 lines of hand-maintained types.
- **Probability:** medium over time. **Action:** either adopt schema-derived validation for the externally reachable routes or add contract tests that feed malformed payloads through `handleApiRuntimeRequest` (some exist in `endpoint-validation.test.ts` — extend to every route). **Blocks:** No.

---

## 5. Code-Quality Findings

Validation runs: `pnpm typecheck` ✅, `pnpm test` ✅ (2,803 passed, 32 skipped), `pnpm build` ✅, `git diff --check` ✅. TypeScript is `strict` with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — a genuinely hard configuration, and the code passes it.

| # | Finding | Severity | Evidence | Consequence / action |
|---|---|---|---|---|
| Q1 | 3,516-line `routes.ts`, ~755-line function | High | See H2 | Extract pipeline stages |
| Q2 | Relative/deep cross-package imports + webpack `.js`→`.ts` rewrite | High | See H1 | Declare deps, subpath exports |
| Q3 | Per-round duplication (API + UI) | Medium | See M1 | Parameterize rounds |
| Q4 | 32 bare `catch {` blocks swallow error causes | Medium | `server-runtime.ts:228,551,561,589,615`; `statsbomb-server-composition.ts:97,158`; `daily-matches.ts:61`; `live-results-sync.ts:285`; etc. | Warnings like "could not be accessed" carry no cause; production debugging degraded. Log `error.message` through the telemetry sink (already sanitized) before returning fallbacks |
| Q5 | 10 `as unknown as` casts | Low | `postgres-*.ts` payload parsers (partially validated first), `runtime.ts:153`, `prematch-snapshot-capture.ts:760` | Payload parsers validate `schemaVersion` before casting — acceptable; `runtime.ts:153` relies on downstream validation |
| Q6 | Zero TODO/FIXME/HACK markers | Informational | Repo-wide grep | Unusual and consistent with the phase-gated process |
| Q7 | Provider fixture alias data hardcoded in UI layer | Low | `server-runtime.ts:306-308` (`"537417"` → canonical ID) | Provider data belongs in `api`; move next to `world-cup-2026-teams.ts` |
| Q8 | `getModelInfo` modelScope is ~30 prose strings restating behavior | Low | `model-info.ts` | Drift risk between prose and code; consider generating from route registry |
| Q9 | Env-var surface: 21 distinct variables, parsed per-module | Low–Medium | grep across packages; `turbo.json` env list maintained by hand | A new env var that misses `turbo.json` silently poisons build caching. Centralize an env manifest |
| Q10 | Console logging without levels/correlation | Low | 21 `console.*` in non-CLI server code | Fine for Vercel stdout; note as known limitation |
| Q11 | No circular dependencies detected | Informational | Import graph inspection within/between packages | — |
| Q12 | Dead weight: `packages/model` `dist/` build output unused by the only consumer (web transpiles source) | Low | `model/package.json` main=dist; web webpack rewrite | Resolves itself if H1 is fixed |

---

## 6. QA / SDET Findings

**Test inventory (from the passing run):** api 1,706 passed + 32 skipped (63 files); model 595 (34 files); data 63 (3 files); web unit/component 439 (32 files); Playwright: 10 spec files, ~1,900 lines, 3 browser projects × 6 viewport responsive matrices, accessibility checks (skip-link focus test, `getByRole` locators throughout), and a credential-leak E2E assertion (`prediction-history.spec.ts:66`).

Direct answers to the audit questions:

1. **Data fixtures?** Yes — `packages/data/fixtures/{international,world-cup}`, synthetic StatsBomb event fixtures for provider tests, committed runtime artifacts (`attack-defense-runtime-profiles.json`, calibration artifacts under `docs/model-results/artifacts/`).
2. **Custom Playwright fixtures (`test.extend`)?** No. None found; README says so explicitly.
3. **Page Object Model?** No. Specs use accessible-role locators directly; README explicitly discloses this and argues shared helpers are the next step, not POM. Given ~10 specs against a small page set, that judgment is defensible — POM is **not** recommended here.
4. **Reusable workflow helpers?** Barely. One local overflow-diagnostic helper in `navigation.spec.ts`; the "Auto Predict From Elo → click → wait for region" sequence is repeated verbatim dozens of times across `match-simulation.spec.ts` (1,085 lines). One `predictions.helpers.ts` with 3–4 functions would remove hundreds of duplicated lines. This *is* recommended — the benefit is visible in the diff, not pattern cargo-culting.
5. **Test isolation reliable?** Mostly. Vitest per-file processes isolate module state; mutable caches have explicit resets (`resetSyncResultCache`, `shutdownPredictionHistoryPersistenceForTests`); Postgres suites use `TEST_DATABASE_URL` and never fall back to `DATABASE_URL` (asserted in test docs). E2E runs single-worker in CI against one shared dev server; tests that write history state could interact, but current specs are read-mostly.
6. **Deterministic simulations?** Yes. `createSeededRandom` (LCG) in the model; sample tournament pinned to seed 2026; API caps `simulationCount` at 10,000 (model hard cap 1,000,000); regression tests pin champion order for the seed. `Math.random` is only the documented default when no seed is provided.
7. **Flaky-test risk?** Moderate and **currently realized**: the E2E job on `main` is failing (see Critical finding). Structural risks: E2E runs against `pnpm dev` (dev server, dev React builds) rather than the production build even in CI; multi-browser matrix without installed browsers; CI retries=2 masks marginal flake.
8. **Overly coupled to implementation?** Two deliberate couplings: regression snapshots pin data-derived outputs (top-15 Elo ranks, `matchesProcessed=312`, `latestMatchDate=2024-07-14`, champion Netherlands@seed-2026) — any data refresh breaks ~30 assertions at once (intentional tripwire, but high-churn); the AD off-mode E2E coupled to an env default broke on `main` when PR #166 changed payload metadata. Contract tests assert exact key sets — appropriate for their purpose.
9. **Snapshots useful or overused?** Useful. They are hand-rolled explicit assertions (not `toMatchSnapshot` blobs), so every pinned value was chosen. The cost is churn on data refresh, which the suite signals loudly rather than silently absorbing.
10. **Negative/fallback paths covered?** Yes, unusually well: validation-error contracts per route, provider rate-limit/error/fallback tests (`live-results-sync.test.ts`, 1,010 lines), guardrail violation and fallback-source tests, AD × StatsBomb 9-combination interaction matrix (`ad-statsbomb-pipeline-matrix.test.ts`), persistence config errors, capture preflight failures.
11. **Contract tests protecting the API?** Yes, with a caveat: `api-contracts.test.ts` (1,156 lines) locks response shapes, metadata contracts, and key sets — but these are in-process function-call contracts, not HTTP-level or consumer-driven contracts. Say "API contract tests," not "contract testing with consumers."
12. **Postgres tests optional or mandatory in CI?** **Optional and skipped in CI.** All four `postgres-*.test.ts` suites self-skip without `TEST_DATABASE_URL`; CI does not provide it. The 32 skipped tests in every CI run are exactly these. The production persistence adapters are never exercised in CI — only in documented manual runs (`docs/qa/REAL_POSTGRESQL_ENVIRONMENT_VALIDATION.md`).
13. **Provider failures adequately tested?** Yes — rate limit, malformed payload, empty results, fallback chain, LKG cache behavior (5 dedicated tests), stale-warning propagation.
14. **Coverage balanced across layers?** Heavily weighted toward api (1,706), which mirrors where the logic is. Genuine gaps: HTTP boundary (Next.js route handlers and server actions are thin but nearly untested as HTTP), production-build E2E, Postgres-in-CI.
15. **Important untested risks?** (a) Production bundle behavior — E2E exercises the dev server; the webpack rewrite machinery differs between dev and prod builds; (b) Postgres adapters under CI; (c) scheduled workflow CLIs against a real database (preflight/dry-run modes mitigate); (d) firefox/webkit rendering (configured but never actually run successfully in CI).

**CI/CD:** One `ci.yml` (install → chromium install → test → typecheck → build → E2E) with 30-min timeout on PRs and `main`; three operational workflows (snapshot capture every 30 min, evaluation every 30 min, manual evidence audit) with concurrency groups and minimal permissions. No coverage reporting, no artifact upload from CI test runs, no caching of Playwright browsers. `setup-node@v4`/Node 20 deprecation warnings are already appearing in logs.

---

## 7. Model and Data-Quality Findings

**Strengths (verified):**

- **No-look-ahead is enforced in three places:** snapshot service derives `pre_match_locked` only when `capturedAt < kickoffAt`; migration 0001 enforces the same via CHECK constraint; backtests require `profile.cutoffAt <= fixture.kickoffAt` and the AD profile builder uses strict `matchDate < cutoffAt`. Historical validation reports 0 look-ahead violations.
- **Conservative promotion gates with committed evidence.** The AD candidate was blocked twice (`insufficient_profile_coverage` at 62.5% fallback; `goal_calibration_blocked`) before data expansion (184→312 fixtures, fallback 62.5%→20.3%) allowed `promote_recalibrated_candidate` — the full chain is reproducible from committed JSON artifacts with fingerprints, and the runtime validates artifact fingerprint + expected candidate ID (`ATTACK_DEFENSE_EXPECTED_CANDIDATE_ID`) at composition time via guardrails.
- **Runtime guardrails are real:** xG bounds (individual 6.0 / total 9.0 / stage delta 3.0), probability-sum tolerance, artifact fingerprint and candidate-ID mismatch codes, sample-size checks, explicit fallback to previous stage or Elo V2 with `fallbackSource` recorded and telemetered.
- **Determinism and reproducibility:** seeded Monte Carlo, pinned calibration artifacts, `formula_version`/`model_version`/`snapshot_schema_version` persisted per snapshot, content hashing for identity.
- **Honest uncertainty presentation:** confidence levels with coverage types (`fallback_only`/`fallback`/`partial`/`full`), fallback-seed warnings, recommended-vs-modal scoreline with explicit reason codes rendered in the UI.

**Risks:**

| # | Finding | Severity | Evidence |
|---|---|---|---|
| MD1 | **Small evaluation samples.** Backtests rest on 128 WC2018+WC2022 fixtures; the promoted AD candidate's holdout improvement is Brier −0.0117 / LogLoss −0.0446 on ~64 holdout fixtures. That is directionally positive but statistically fragile; a recruiter with a stats background can challenge it | Medium | `CHANGELOG.md` Phase 12.21A3; artifacts in `docs/model-results/artifacts/` |
| MD2 | **Thin Elo foundation.** The live Elo pipeline processes 312 matches covering 60 teams, latest pre-tournament match 2024-07-14; teams outside coverage get a fallback seed rating (with warnings). "Live Elo ratings" is accurate as implemented but rests on ~2.4% of the international match universe most Elo systems ingest | Medium | `regression-snapshots.test.ts` pins 312/60/2024-07-14; `WORLD_CUP_2026_FALLBACK_SEED_RATING` |
| MD3 | **1-1 modal concentration is reduced, not solved.** The promoted candidate cut modal 1-1 frequency from 100% to 70.3%; scoreline diversity remains a known weakness and is (correctly) documented | Low | recalibration artifact + `statsbomb-scoreline-diversity.ts` |
| MD4 | **Calibration claims must stay scoped to backtests.** Live evidence gate requires ≥20 evaluated fixtures before any recalibration verdict, and that threshold has not been met (evidence-audit workflow is manual-only for this reason). No live calibration claim is currently supportable | Medium | `live-prediction-evidence-audit.yml` comments; `live-prediction-evidence-gate.ts` |
| MD5 | **UI/model explanation match.** Checked pipeline labeling (`Elo V2 → Attack/Defense → StatsBomb`), shadow-mode wording, and reason codes against route logic — they agree. One residual mismatch is the E2E *expectation* (off-mode section absence), not the UI itself | Low | `MatchSimulationResults.tsx` vs `routes.ts` stage flags |
| MD6 | Overfitting risk on the 200-configuration grid search tuned on WC2018 with WC2022 holdout — one holdout, small n; mitigated by damping and conservative gates but real | Medium | `attack-defense-recalibration.ts`, recalibration CLI |

No leakage paths were found. Provenance is strong (artifact fingerprints, source fixture counts, cutoffs in payloads).

---

## 8. Security and Operational Findings

- **SQL injection: no findings.** All queries use `postgres` tagged-template parameterization (`sql\`... ${value}\``); no string-concatenated SQL anywhere; JSONB via `sql.json`.
- **Secrets:** provider token read server-side only (`FOOTBALL_DATA_API_TOKEN` → `X-Auth-Token` header); DB URL never enters client bundles (`postgres` is a server external; `.server.ts` convention; bundle-boundary test). An E2E test explicitly asserts the history page output contains no credentials or raw database URLs. CI maps secrets via `${{ secrets.* }}` with `permissions: contents: read`.
- **Error sanitization:** history persistence errors map to stable codes/messages (`mapPredictionHistoryErrorCode/Message`); guardrail violations expose sanitized `primaryViolationCode`. One nit: `getModelInfo` embeds the raw config-error message in its response — currently only ever "PERSISTENCE_PROVIDER must be…" strings, no secret material, but it's a channel to watch.
- **Input validation:** externally reachable prediction routes validate field-by-field with typed issue lists; the runtime cast noted in M3 is the weak point.
- **DoS surface:** `simulationCount` capped at 10,000 API-side; group projections cached (`projection_cache` table + refresh policy); the heaviest work (tournament projection) runs server-side per request with caching. Residual risk is CPU-bound serverless invocations under abuse — no rate limiting exists in-repo (acceptable for a portfolio; note it as a limitation).
- **Migrations:** plain SQL, `IF NOT EXISTS`, append-only tables, CHECK constraints; runner is a small CLI (`db-migrate.ts`). No down-migrations (fine at this scale; document it).
- **Concurrency:** GitHub concurrency groups on all scheduled workflows; `pg_try_advisory_lock` around snapshot capture; idempotency keys make double-capture safe anyway.
- **Scheduled workflows** run every 30 minutes against the production DB with 15-minute timeouts — bounded and reasonable; failure alerting relies on GitHub's default email only (informational gap).
- **Dependencies:** small production surface (`postgres`, `next`, `react`); no lockfile audit wired into CI (informational).
- **Deployment assumptions:** Vercel-specific tracing config (`outputFileTracingIncludes` for artifacts) is documented in `docs/operations/VERCEL_LIVE_RUNTIME_DEPLOYMENT.md`; repo evidence cannot confirm a live deployment, so public claims should link the actual URL or say "deployable to Vercel."

---

## 9. Documentation Findings

- **README is unusually honest.** It explicitly states there is *no* POM and *no* custom Playwright fixture architecture (`README.md:192`), names orchestration files as extraction candidates, and frames the project as a portfolio case study, not betting software. This is the strongest documentation asset in the repo.
- **CHANGELOG is exceptional** — per-phase entries record what changed, what was deliberately *not* changed, metrics, and decision outcomes (including negative ones like `attack_defense_data_blocked`). Recruiters can audit the engineering process from it.
- **Docs are extensive and current** (~40 top-level docs + adr/architecture/qa/operations/model-results trees). Spot-checks found no stale test counts in README (it avoids hard numbers — wise).
- **Gaps/risks:**
  - The **CI badge/Actions tab contradicts the QA story** while `main` is red (blocker B1).
  - The docs claim "Playwright E2E coverage" and CI E2E validation; with firefox/webkit never successfully running in CI, "cross-browser E2E" would be an unsupported claim (currently the README doesn't make it — keep it that way or fix CI).
  - `docs/qa/*` includes phase-named files (`PHASE_12_19_*`) that read as process artifacts; fine, but an index distinguishing living docs from phase records would help outside readers.
  - Vercel deployment is documented but not evidenced in-repo; avoid "deployed in production" unless the URL is public.

### Claim safety table

| Claim | Safe? | Qualifier |
|---|---|---|
| Production-ready | **No** | Red main CI; Postgres untested in CI; no rate limiting. Say "production-shaped" / "operationally hardened for a portfolio" |
| Production-calibrated | **No** | Live evidence gate needs ≥20 evaluated fixtures and hasn't met it; calibration evidence is backtest-only (128 fixtures) |
| Clean Architecture | **No** | Use "layered, functionally composed, with ports/adapters at persistence and provider boundaries" |
| OOP | **No** | Codebase is deliberately functional; two Error classes total |
| SOLID | **Avoid the acronym** | DIP and SRP-at-package-level are demonstrable; `routes.ts` visibly violates SRP at module level |
| POM | **No** | Correctly disclaimed in README already |
| Custom fixtures | **No** (Playwright) / **Yes** (data fixtures) | Be precise about which kind |
| Deterministic testing | **Yes** | Seeded RNG, injected clocks, pinned artifacts — strong evidence |
| Contract testing | **Yes, qualified** | "API contract tests locking response shapes" — not consumer-driven, not HTTP-level |
| Resilience | **Yes, qualified** | Provider fallback chain, LKG cache, guardrail fallbacks — all tested |
| Observability | **Yes, qualified** | Structured `prediction_pipeline_completed` telemetry + runtime diagnostics; no metrics/tracing/alerting stack |
| CI/CD | **Yes once green** | CI is real; there is no CD pipeline in-repo (Vercel implied). Say "CI with E2E gate" |
| PostgreSQL persistence | **Yes** | Adapters, migrations, contract-parity tests exist; note CI-optional integration tests if pressed |
| Vercel deployment | **Only with a live URL** | Config and runbook exist; repo can't prove deployment |
| Model transparency | **Yes** | Strongest claim available: reason codes, confidence coverage, artifacts, gates, UI disclosure |

---

## 10. Technical-Debt Register

| ID | Category | Finding | Evidence | Severity | Probability | Impact | Recommended action | Blocker |
|---|---|---|---|---|---|---|---|---|
| TD-01 | CI/QA | `main` CI red: E2E fails — firefox/webkit not installed but configured; chromium AD off-mode assertion stale after PR #166 metadata change | Run 28621186180; `ci.yml` (chromium-only install); `playwright.config.ts` (3 projects); `match-simulation.spec.ts:1003` | **Critical** | Certain (occurring) | Portfolio credibility; blocks all merges' signal | Install `--with-deps` for all three browsers **or** scope config to chromium; update off-mode expectations to match always-present AD metadata | **Yes** |
| TD-02 | Architecture | Cross-package boundaries bypassed: api→model relative src imports; web→api deep src imports; webpack `.js`→`.ts` rewrite | `routes.ts:15,83`; `server-runtime.ts:33-39`; `next.config.ts` | High | Medium | Build fragility, misleading dependency graph, Turborepo cache correctness | Declare workspace deps; subpath exports for server modules; remove rewrite plugin | No |
| TD-03 | Code quality | 3,516-line `routes.ts`; ~755-line `predictMatchFromLiveElo` | `routes.ts:1129-1884` | High | High (for future edits) | Defect-prone core edit surface | Extract per-stage pipeline modules | No |
| TD-04 | Code quality | Per-round duplicated qualifier/simulation functions and UI sections | `routes.ts:794,2041,2225,2421`; 14 `WorldCup*Section` components | Medium | Medium | Silent inter-round drift | Parameterize by round descriptor | No |
| TD-05 | QA | Postgres integration suites skip in CI (`TEST_DATABASE_URL` unset) — 32 perpetually skipped tests | `postgres-*.test.ts:16-20`; CI env | Medium | Medium | Production adapters unverified per-commit | Add a CI job with a `postgres` service container | No |
| TD-06 | QA | E2E runs against dev server (`pnpm dev`), not production build, in CI | `playwright.config.ts` webServer | Medium | Medium | Prod-bundle regressions invisible to E2E | `next build && next start` in CI webServer | No |
| TD-07 | QA | No shared E2E helpers; prediction flow repeated ~dozens of times | `match-simulation.spec.ts` (1,085 lines) | Medium | Medium | Locator churn multiplies maintenance | Extract 3–4 helper functions (not POM) | No |
| TD-08 | Observability | 32 bare `catch {}` blocks discard error causes | grep list in §5 Q4 | Medium | Medium | Undiagnosable production fallbacks | Route causes through telemetry sink | No |
| TD-09 | Contracts | Handwritten runtime validation; `as unknown as` body cast at the runtime boundary | `runtime.ts:153`; `schemas.ts` (2,253 lines) | Medium | Medium | Type/validator drift over time | Schema-derived validation or exhaustive malformed-payload contract tests | No |
| TD-10 | Model | Backtest sample 128 fixtures; promotion deltas within statistical noise range | recalibration artifacts | Medium | Medium | Challengeable calibration claims | Keep claims scoped; widen historical set when feasible | No |
| TD-11 | Model/data | Elo foundation 312 matches/60 teams; fallback seeds for the rest | regression snapshot pins | Medium | Low | Prediction quality ceiling; claim risk | Documented; expand ingestion post-portfolio | No |
| TD-12 | QA | Regression snapshots pin data-derived values (312 matches, 2024-07-14, champion order) | `regression-snapshots.test.ts` | Low | High on data refresh | ~30 assertions break on any data update | Accept (tripwire) but centralize pinned constants | No |
| TD-13 | Config | 21 env vars, per-module parsing, manual `turbo.json` env sync | grep; `turbo.json` | Low | Low | Cache poisoning on missed var | Central env manifest | No |
| TD-14 | Security | No rate limiting on CPU-heavy prediction/projection paths | routes; server actions | Low | Low (portfolio traffic) | Cost/DoS under abuse | Document limitation; Vercel-level protection if published | No |
| TD-15 | Ops | CI actions on Node 20 deprecation path; no browser cache; no coverage artifact | CI logs | Low | Medium (will break eventually) | Future CI breakage | Bump to Node 22/24; cache Playwright | No |
| TD-16 | Docs | Vercel deployment documented but unverifiable from repo | `docs/operations/VERCEL_LIVE_RUNTIME_DEPLOYMENT.md` | Informational | — | Claim risk | Link live URL or phrase as "deployable" | No |

---

## 11. Portfolio Claims That Are Safe

Backed by direct evidence:

1. TypeScript monorepo with layered package boundaries and one-way dependency flow (data→model→api→web).
2. 2,800+ deterministic unit/integration tests plus a 10-spec Playwright E2E suite with accessibility and responsive coverage, run in CI on every PR *(after CI is green)*.
3. Dependency injection at persistence, provider, telemetry, clock, and RNG boundaries — no mocking framework needed.
4. API contract tests that lock response shapes and metadata invariants.
5. Seeded, reproducible Monte Carlo simulation with hard caps and validated probability matrices.
6. PostgreSQL persistence with append-only snapshot/evaluation tables, idempotency keys, content hashing, schema versioning, and DB-level pre-match CHECK constraints.
7. No-look-ahead protection enforced in application logic, backtests, and database constraints (0 violations in validation runs).
8. Controlled model rollout: off/shadow/on modes, artifact fingerprint verification, activation gates tied to committed backtest evidence, runtime guardrails with explicit fallback hierarchy.
9. Structured prediction telemetry and runtime diagnostics with sanitized violation codes.
10. Scheduled GitHub Actions operations (snapshot capture, evaluation) with concurrency control, advisory locking, dry-run/preflight modes, and minimal permissions.
11. Client/server bundle-boundary tests preventing Node-only code from reaching the browser bundle.
12. Model transparency: confidence levels, coverage classification, recommended-vs-modal scoreline reasoning, and documented limitations in the UI.

## 12. Claims That Should Be Avoided

- "Production-ready" / "production-calibrated" / "battle-tested" (see §9 table).
- "Clean Architecture", "hexagonal architecture", "DDD", "SOA", "microservices" as labels.
- "OOP design" / "SOLID principles" as headline claims (the codebase is proudly functional).
- "Page Object Model" or "custom Playwright fixture framework" (README already correctly disclaims).
- "Cross-browser tested" (until firefox/webkit actually run green in CI).
- "Live-calibrated model" or accuracy claims beyond the documented backtests.
- Any specific accuracy percentage without citing the 128-fixture sample and its caveats.

## 13. Likely Interview Challenges

1. "Why is `routes.ts` 3,500 lines? Walk me through that 755-line function."
2. "Your CI is red / why do you configure three browsers but install one?"
3. "Why relative imports across packages and a webpack extension-rewrite hack instead of workspace dependencies?"
4. "Why no zod/schema validation on a typed API with 2,000+ lines of handwritten types?"
5. "Your E2E suite tests the dev server — how do you know the production bundle works?"
6. "128 backtest fixtures and a −0.0117 Brier delta — is that significant?"
7. "312 matches for an Elo system? Real Elo systems use tens of thousands."
8. "Why in-process 'API' handlers instead of real HTTP contract tests?"
9. "How do the Postgres adapters get tested if CI skips them?"
10. "Why hand-rolled regression snapshots that break on every data refresh?"

## 14. Recommended Responses

1. *Routes:* "Known debt, documented in the README as an extraction candidate; the pipeline stages are already seam-separated and guardrail-tested, so extraction is mechanical. I chose shipping evidence-gated model stages over refactoring first." Then describe the extraction plan.
2. *CI red:* only answerable by fixing it — do that before publishing.
3. *Imports:* "Deliberate source-transpilation choice to keep one TypeScript compilation surface and hot-reload across packages; the cost is a webpack rewrite I'd replace with declared workspace deps and subpath exports at the next boundary hardening." (Then do TD-02 and the question disappears.)
4. *Validation:* "Handwritten validators keep zero runtime deps and full control of error codes; contract tests lock shapes. At the next stage of external exposure I'd generate validators from the types." 
5. *Dev-server E2E:* acknowledge; point to the build step running in the same CI job; commit to `next start` (TD-06).
6. *Sample size:* "That's exactly why the decision gate labeled it `promote_recalibrated_candidate` for a controlled off/shadow/on rollout rather than a default flip, and why the live evidence gate requires 20 evaluated fixtures before recalibration verdicts." This is the strongest answer in the repo — the gates were built for this question.
7. *Elo data:* own it — curated, validated, look-ahead-free data over bulk scraped data; expansion is roadmapped and the confidence system communicates coverage per team.
8. *In-process API:* "The handlers are pure by design so contracts are testable without network flake; the HTTP layer is a thin adapter with its own validation tests." 
9. *Postgres in CI:* point to opt-in suites + parity tests + manual validation doc; commit to a service-container job (TD-05).
10. *Snapshots:* "They're tripwires: a data refresh *should* break them loudly so the diff is reviewed; blob snapshots would absorb the change silently."

## 15. Publication Blockers

1. **B1 (TD-01): `main` CI must be green.** Fix both causes: (a) either `playwright install --with-deps` for all configured browsers in CI or reduce `projects` to chromium (and adjust any cross-browser language); (b) update the three AD off-mode E2E assertions in `match-simulation.spec.ts` (~lines 1003–1025) to match the post-PR-#166 behavior where AD metadata/section is present with a "Disabled" state in off mode.
2. **B2: Multi-browser story must match reality** (subsumed by B1's choice — decide, then align config, CI, and docs).

Nothing else blocks publication. TD-02/TD-03 are the items most likely to come up in interviews and are worth doing next, but they are debt, not blockers.

## 16. Recommended Remediation Roadmap

**Stage 0 — before publishing (hours):**
- Fix TD-01 (CI green): browser policy + AD off-mode expectations.
- Re-run full CI on `main`; verify Actions tab is green.

**Stage 1 — first week after publishing (1–2 days):**
- TD-02: declare `model` as workspace dep of `api`; add `./server` subpath export to `api`; delete webpack rewrite.
- TD-07: extract shared E2E prediction-flow helpers.
- TD-15: bump CI Node version; cache Playwright browsers.

**Stage 2 — boundary hardening (2–4 days):**
- TD-03: extract `prediction-pipeline/` stage modules from `routes.ts` (behavior-frozen by the existing 1,706 tests).
- TD-05: Postgres service container in CI; unskip integration suites.
- TD-06: E2E against `next start`.
- TD-08: log swallowed error causes through the telemetry sink.

**Stage 3 — opportunistic:**
- TD-04 (round parameterization), TD-09 (schema-derived validation), TD-13 (env manifest), TD-12 (centralize pinned regression constants).

---

*Validation executed for this audit: `pnpm typecheck` (pass), `pnpm test` (2,803 passed / 32 skipped), `pnpm build` (pass), `git diff --check` (clean). No production code was modified.*
