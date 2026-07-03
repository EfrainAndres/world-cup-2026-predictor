# Portfolio Architecture And Technical-Debt Audit

Date: 2026-07-03

Scope: repository architecture, QA automation architecture, technical debt, and portfolio-readiness claims for the current World Cup 2026 Predictor repository. This was a read-only audit of implementation and documentation before this report was written.

## Executive Verdict

**Publication decision: ready after minor cleanup.**

The repository is strong enough to publish as a portfolio project if the public claims are precise: TypeScript monorepo, deterministic model/data/API tests, API contracts, regression snapshots, Playwright E2E, CI, transparent model caveats, immutable prediction history, and evidence-gated model work.

It should **not** be published as a pristine Clean Architecture implementation or as a project using custom Playwright fixtures, Page Object Model, meaningful OOP, Python/FastAPI runtime services, or complete production calibration. The main publication blockers are stale QA documentation and overbroad architecture claims, not broken implementation.

## Architecture Strengths

| Area | Evidence | Assessment |
| --- | --- | --- |
| Monorepo structure | `apps/web`, `packages/api`, `packages/model`, `packages/data`, `docs`, `turbo.json`, `pnpm-workspace.yaml` | Clear portfolio-scale workspace with predictable commands. |
| UI/API/model/data separation | `apps/web` depends on `@world-cup-2026-predictor/api`; API composes model helpers; model/data do not import React or Next.js | Directionally strong separation, especially from UI into API/model boundaries. |
| Deterministic modeling | Seeded simulation helpers in `packages/model/src/simulation.ts`; seeded API contract checks in `packages/api/tests/api-contracts.test.ts` | Strong SDET evidence for repeatability. |
| API contracts | `packages/api/tests/api-contracts.test.ts` validates response shapes, metadata, warnings, validation errors, runtime errors, and probability invariants | Good contract-first testing without requiring a network server. |
| Regression protection | `packages/api/tests/regression-snapshots.test.ts` uses explicit numeric assertions for critical model/API outputs | Stronger than broad snapshot files; changes are intentional and reviewable. |
| Error/fallback handling | Persistence errors are mapped to typed public codes in `packages/api/src/routes.ts`; capture/evaluation CLIs sanitize operational failures; dashboard has last-known-good sync fallback | Mature failure-path thinking for a portfolio project. |
| Runtime configuration | `PERSISTENCE_PROVIDER`, `DATABASE_URL`, `RESULTS_PROVIDER`, `FOOTBALL_DATA_API_TOKEN`, StatsBomb, and attack/defense flags are documented and included in `turbo.json` build env | Configuration is explicit, not hidden. |
| CI gates | `.github/workflows/ci.yml` runs install, tests, typecheck, build, and Playwright E2E | Solid portfolio quality gate. |

## Architecture Risks

| Risk | Evidence | Impact |
| --- | --- | --- |
| Clean Architecture is claimed more strongly than implemented | `docs/ARCHITECTURE.md` describes domain/application/infrastructure/shared packages; actual packages are `api`, `model`, `data`, and `web` | Recruiters/interviewers may challenge the gap between intended and actual package boundaries. |
| `packages/api` is a broad orchestration/infrastructure package | `packages/api/src/routes.ts` is 3,516 lines; API package also contains DB adapters, provider adapters, CLIs, persistence runtime, schemas, telemetry, snapshot/evaluation services | Cohesion risk and harder long-term test isolation. |
| Deep source imports bypass package public APIs | `apps/web/src/lib/server-runtime.ts` imports `@world-cup-2026-predictor/api/src/...`; `packages/api/src/*` imports `../../model/src/index.js` | Breaks encapsulation and makes package build/refactor boundaries fragile. |
| Cross-layer reverse dependency exists in a script | `packages/api/src/scripts/list-attack-defense-runtime-eligibility.ts` imports `../../../../apps/web/src/lib/attack-defense-embedded-artifact.server.js` | API tooling depends on web implementation details. |
| Large contracts and barrels | `packages/api/src/schemas.ts` is 2,253 lines; `packages/model/src/types.ts` is 1,128 lines; `packages/api/src/index.ts` is 624 lines | Discoverability and change-impact analysis are harder. |
| Dashboard server runtime is doing substantial orchestration | `apps/web/src/lib/server-runtime.ts` is 638 lines and handles sync fallback, persistence diagnostics, canonical fixture resolution, evidence loading, and production dependencies | Thin UI boundary is mostly preserved, but app runtime now owns notable orchestration. |
| Observability is limited | `createStructuredLogTelemetrySink()` exists for prediction pipeline events, but most operational paths use CLI `console.*` output and no request correlation/metrics/tracing | Good enough for portfolio/local operations, not production observability. |
| QA docs are stale | Current Playwright config has Chromium, Firefox, WebKit; `docs/qa/QA_AUTOMATION_FOUNDATION.md` says Chromium-only and one E2E spec; `docs/qa/E2E_MATCH_PREDICTION_COVERAGE.md` says 45 tests; portfolio QA doc says 52 | Public QA claims need correction before publication. |

## Measurements

| Metric | Current measurement |
| --- | ---: |
| Source files measured | 229 TypeScript/TSX source files under app/package source folders |
| Total measured lines in app/package/scripts files | 111,426 |
| Source lines, excluding tests and generated folders | 57,417 |
| Test lines | 46,641 |
| Test files | 142 |
| Test declarations counted by regex | 2,844 |
| API test declarations | 1,557 |
| Model test declarations | 543 |
| Data test declarations | 59 |
| Web unit/component/app test declarations | 432 |
| Playwright E2E test declarations | 253 |
| Playwright projects | Chromium, Firefox, WebKit |
| TODO/FIXME/HACK markers in application code | 0 found; one `mktemp` shell variable line matched `TMPDIR` in `scripts/ai/test-summary.sh` |

## Largest Source Files

| Lines | File | Notes |
| ---: | --- | --- |
| 3,516 | `packages/api/src/routes.ts` | Largest debt hotspot; many handlers and prediction orchestration paths. |
| 2,253 | `packages/api/src/schemas.ts` | Large public API type surface. |
| 1,571 | `packages/api/src/live-prediction-evidence-gate.ts` | Complex audit/gate logic. |
| 1,444 | `packages/api/src/prediction-usefulness-audit.ts` | Complex analysis service. |
| 1,191 | `packages/api/src/attack-defense-goal-model-recalibration.ts` | Offline calibration harness. |
| 1,128 | `packages/model/src/types.ts` | Broad model type hub. |
| 1,082 | `packages/api/src/world-cup-2026-official-knockout.ts` | Tournament topology/projection logic. |
| 909 | `packages/api/src/group-detail.ts` | Group detail read model and projection logic. |
| 858 | `packages/api/src/prematch-snapshot-capture.ts` | Scheduler/capture service. |
| 844 | `apps/web/src/components/MatchSimulationResults.tsx` | Presentation-heavy component with local formatting helpers. |

## Largest Test Files

| Lines | File | Notes |
| ---: | --- | --- |
| 2,471 | `packages/api/tests/api.test.ts` | Broad API behavior suite. |
| 1,319 | `apps/web/src/components/MatchSimulationResults.test.tsx` | Large component test surface. |
| 1,156 | `packages/api/tests/api-contracts.test.ts` | Contract coverage. |
| 1,085 | `apps/web/tests/e2e/match-simulation.spec.ts` | Main E2E concentration point. |
| 1,032 | `packages/api/tests/group-detail-refresh.test.ts` | Projection refresh workflow. |
| 1,020 | `packages/api/tests/statsbomb-backtesting.test.ts` | Backtesting harness. |
| 1,010 | `packages/api/tests/live-results-sync.test.ts` | Provider/sync behavior. |
| 992 | `packages/api/tests/live-prediction-evidence-gate.test.ts` | Evidence-gate behavior. |

## Package Dependency Graph

Declared package dependencies:

```text
apps/web -> @world-cup-2026-predictor/api, Next.js, React
packages/api -> postgres
packages/model -> no runtime workspace dependency
packages/data -> no runtime workspace dependency
```

Observed source-level dependencies:

```text
apps/web -> packages/api public exports
apps/web -> packages/api/src internals
apps/web -> docs/model-results/artifacts/*.json
packages/api -> packages/model/src internals
packages/api -> postgres and provider/database adapters
packages/api script -> apps/web/src/lib/attack-defense-embedded-artifact.server.js
packages/model -> framework-independent TypeScript helpers
packages/data -> framework-independent validation/normalization helpers
```

The direction is mostly acceptable for a portfolio monorepo, but the deep source imports and reverse script dependency should be cleaned before making strong boundary claims.

## QA Automation Audit

| Topic | Finding |
| --- | --- |
| Unit tests | Strong across model, data, API, and web helpers/components. |
| Integration tests | Strong in API composition, persistence contracts, live sync, group detail, prediction evaluation, StatsBomb, attack/defense paths. |
| API contract tests | Present in `packages/api/tests/api-contracts.test.ts`; good coverage of shape, validation, metadata, probability invariants, and runtime errors. |
| Regression tests | Present in `packages/api/tests/regression-snapshots.test.ts`; explicit assertions are preferable to brittle full snapshots. |
| Snapshot usage | Snapshot-style regression is implemented through named assertions, not broad snapshot files. |
| Deterministic seeds | Used in model simulations and API contract tests; dashboard default API client uses seed `2026` for optional Monte Carlo. |
| Data fixtures | Strong local fixture strategy in `packages/data/fixtures` and API/model synthetic fixtures. |
| Playwright fixtures | No custom Playwright fixtures were found. Tests import `test` directly from `@playwright/test`. |
| Reusable helpers | Some local helpers exist, such as `selectTeamOption()` inside `match-simulation.spec.ts`, but no shared E2E helper layer. |
| Page Object Model | Not used. No Page Object classes or POM docs were found. |
| Locator strategy | Mostly strong accessible locators: roles, labels, regions, headings. Some text and class assertions remain. |
| Test isolation | Mostly good due pure functions and local fixtures; PostgreSQL tests skip without `TEST_DATABASE_URL`; API Vitest uses `singleFork` to avoid TRUNCATE deadlocks. |
| Parallel execution | Playwright `fullyParallel: true`; CI uses one worker with retries. API tests run single fork due DB contract constraints. |
| Flaky-test risk | Medium in E2E due 253 declarations across three browsers, long specs, `next dev`, and broad UI assertions. CI one-worker mode reduces concurrency flake but increases duration. |
| CI quality gates | Good baseline: install, test, typecheck, build, E2E. Missing lint, accessibility automation, coverage thresholds, and database service-container gates. |

## Fixtures, POM, OOP, FP, SOLID

| Question | Answer |
| --- | --- |
| Does the project actually use custom fixtures? | **No for Playwright/custom test fixtures.** It uses data/test fixtures, fixture JSON, and helper factories, but no `test.extend()` or shared custom Playwright fixture architecture. |
| Does it use Page Object Model? | **No.** E2E tests interact directly with `page` and locators. |
| Does it use OOP meaningfully? | **No, not as a primary design style.** Classes are limited to custom error types such as `SnapshotStorageError`, `PredictionHistoryPersistenceConfigError`, and config errors. |
| Where are functional programming and composition preferred? | Pure model/data/API helpers, dependency injection through function parameters, immutable-style response construction, typed result objects, validation functions, and composable provider/store interfaces. |
| Are SOLID principles visible? | Partially. Single-responsibility is strong in model/data pure helpers but weaker in `routes.ts`, `schemas.ts`, and some large UI/runtime files. Dependency inversion is visible in injectable stores/providers/telemetry. Interface segregation is partial; API schemas and barrels are broad. |
| Are patterns claimed but not implemented? | Yes. Clean/Hexagonal Architecture is documented as an intended principle, but the actual repo does not have separate domain/application/infrastructure/shared packages. Older docs also imply Chromium-only E2E and lower E2E counts that are now stale. |

## Duplicated Code Candidates

These are candidates for cleanup, not confirmed copy/paste defects:

| Candidate | Evidence | Recommended action |
| --- | --- | --- |
| Knockout round simulation response construction | Repeated fallback-rating, xG, score matrix, probability, scoreline, and warning assembly in `packages/api/src/routes.ts` around knockout round handlers | Extract a round/fixture simulation builder in API application logic. |
| Prediction pipeline metadata/warnings | `predictMatchFromLiveElo()` assembles Elo, tournament form, attack/defense, StatsBomb, guardrail, confidence, warnings, metadata, and telemetry in one function | Split into staged pipeline functions with typed stage outputs. |
| E2E direct interaction helpers | `apps/web/tests/e2e/match-simulation.spec.ts` has local helper only; other specs repeat navigation and assertion patterns | Add shared E2E helper functions before considering POM. |
| Canonical fixture matching | Similar canonical fixture/pair matching appears in dashboard runtime, matches experience helpers, and API tournament form paths | Move stable canonical match identity helpers into an API/public utility boundary. |
| Formatting helpers in UI components | `MatchSimulationResults.tsx` contains many local formatting functions for confidence, StatsBomb, attack/defense, scoreline labels | Move durable presentation mappers to `apps/web/src/lib` when reused or tested separately. |

## Technical-Debt Register

| Priority | Issue | Evidence | Affected files | Impact | Probability | Severity | Recommended action | Blocks portfolio publication? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Stale public QA counts and browser-scope docs | Docs say 45/52 E2E and Chromium-only; current config has 253 E2E declarations and 3 browser projects | `docs/qa/QA_AUTOMATION_FOUNDATION.md`, `docs/qa/E2E_MATCH_PREDICTION_COVERAGE.md`, `docs/portfolio/FINAL_PORTFOLIO_QA_REVIEW.md`, `apps/web/playwright.config.ts` | Undermines portfolio credibility | High | High | Update QA docs with current counts, browser projects, and limitations | **Yes, for publication copy** |
| P0 | Overclaim risk around Clean Architecture | Docs describe domain/application/infrastructure/shared package layout that does not exist | `docs/ARCHITECTURE.md`, `docs/REPOSITORY_STRUCTURE.md`, `docs/architecture/ARCHITECTURE_DIAGRAMS.md`, README | Interview challenge risk | High | High | Rephrase as "layered monorepo with Clean Architecture influences"; document actual boundaries | **Yes, if claiming full Clean Architecture** |
| P1 | Oversized API route module | `packages/api/src/routes.ts` is 3,516 lines and owns validation, orchestration, prediction pipeline, persistence endpoints, tournament foundations | `packages/api/src/routes.ts` | High change blast radius | High | High | Split by route/use-case family and move shared builders out | No |
| P1 | Deep source imports bypass public package APIs | Web imports `@world-cup-2026-predictor/api/src/*`; API imports `../../model/src/*` | `apps/web/src/lib/server-runtime.ts`, many `packages/api/src/*` files | Fragile refactors/build boundaries | High | Medium | Export needed server-only APIs from package entrypoints or create explicit internal package boundary | No |
| P1 | Reverse dependency from API script to web implementation | API script imports `apps/web/src/lib/attack-defense-embedded-artifact.server.js` | `packages/api/src/scripts/list-attack-defense-runtime-eligibility.ts` | Boundary inversion | Medium | Medium | Move embedded artifact helper to API or a shared artifact module | No |
| P1 | API schemas and model types are large hubs | `schemas.ts` 2,253 lines; `types.ts` 1,128 lines | `packages/api/src/schemas.ts`, `packages/model/src/types.ts` | Harder reviews and accidental coupling | High | Medium | Partition by domain area: prediction, history, tournament, providers, persistence | No |
| P1 | E2E suite lacks shared fixture/helper architecture | No `test.extend()`; no shared E2E helper folder; largest E2E spec 1,085 lines | `apps/web/tests/e2e/*.spec.ts` | Maintainability and flake triage risk | High | Medium | Add shared helpers/fixtures for navigation, match selection, seeded data, and common assertions | No |
| P2 | No Page Object Model despite broad UI coverage | No POM classes or docs found | `apps/web/tests/e2e` | POM should not be claimed; direct locators are acceptable today | High | Low | Do not claim POM; consider component/task helpers before full POM | No |
| P2 | Observability remains local/log-based | Prediction telemetry sink exists; most operations use CLI console output; no request IDs/metrics/tracing | `packages/api/src/prediction-telemetry-sink.ts`, CLIs, workflows | Production diagnostics would be limited | Medium | Medium | Add request correlation and structured operational event schema before deployment claims | No |
| P2 | Runtime config is explicit but scattered | Env parsing across persistence runtime, live sync, server runtime, CLIs, StatsBomb, attack/defense | `packages/api/src/*cli.ts`, `persistence-runtime.ts`, `live-results-sync.ts`, `apps/web/src/lib/server-runtime.ts` | Misconfiguration risk | Medium | Medium | Add a single configuration inventory doc and optional central parser per runtime | No |
| P2 | Failover can mask external-provider degradation | Dashboard last-known-good cache serves stale data with warning; local fallback exists | `apps/web/src/lib/server-runtime.ts`, `packages/api/src/live-results-sync.ts` | Users may miss stale-data context if UI does not surface it strongly | Medium | Medium | Audit UI prominence for fallback/stale warnings | No |
| P2 | CI lacks lint/a11y/coverage gates | CI runs tests/typecheck/build/E2E only | `.github/workflows/ci.yml` | Gaps for frontend quality and style drift | Medium | Medium | Add lint, axe smoke tests, and optional coverage reporting | No |
| P3 | Dead/unused exports not proven | Large barrels export many APIs; no static unused-export tool configured | `packages/api/src/index.ts`, `packages/model/src/index.ts`, `packages/data/src/index.ts` | Possible API surface bloat | Medium | Low | Add `ts-prune` or `knip` style audit later; do not speculate in portfolio | No |
| P3 | Some docs contain stale root commands | Some StatsBomb docs mention `pnpm statsbomb:*`, while scripts are package-scoped under `packages/api/package.json` | `docs/data-quality/STATSBOMB_PREDICTION_SIGNAL_POLICY.md`, `docs/model-results/STATSBOMB_PREDICTION_SIGNAL_INTEGRATION.md` | Developer friction | Medium | Low | Normalize command examples to `pnpm --filter @world-cup-2026-predictor/api ...` | No |

## Multiple-Responsibility Files

| File | Responsibilities observed | Risk |
| --- | --- | --- |
| `packages/api/src/routes.ts` | API handlers, validation, model orchestration, tournament projections, snapshot/evaluation endpoints, metadata/warnings, telemetry | Highest refactor target. |
| `packages/api/src/schemas.ts` | API response contracts for many unrelated areas | Type changes are noisy and hard to review. |
| `apps/web/src/lib/server-runtime.ts` | live sync cache, production dependencies, persistence diagnostics, match detail resolution, evidence summaries | Server-side dashboard orchestration is concentrated. |
| `apps/web/src/components/MatchSimulationForm.tsx` | form state, validation, scheduled fixture selection, custom team selection, request building, submit handling | Acceptable now, but near split threshold. |
| `apps/web/src/components/MatchSimulationResults.tsx` | formatting, pipeline/status presentation, scoreline display, StatsBomb/attack-defense sections, warnings | Presentation-heavy but large. |

## Stale Documentation

| Document | Stale or risky claim |
| --- | --- |
| `docs/qa/QA_AUTOMATION_FOUNDATION.md` | Says all E2E tests live in one spec and Chromium-only. Current E2E has 10 specs and three browser projects. |
| `docs/qa/E2E_MATCH_PREDICTION_COVERAGE.md` | Says 45 tests. Current E2E declarations counted: 253. |
| `docs/portfolio/FINAL_PORTFOLIO_QA_REVIEW.md` | Says 52 Playwright E2E checks. Current E2E declarations counted: 253. |
| `docs/ARCHITECTURE.md` and `docs/REPOSITORY_STRUCTURE.md` | Planned package structure still lists `domain`, `application`, `infrastructure`, `shared`; current repo uses `api`, `model`, `data`, `web`. |
| `docs/TECH_STACK.md` | Lists Python/Pytest/FastAPI as selected/planned, but current implementation is TypeScript-only for model/data/API. This is acceptable if called "planned", not implemented. |

## Publication Blockers

| Blocker | Required before publishing |
| --- | --- |
| Stale QA claims | Update E2E counts, browser scope, spec structure, and limitations. |
| Overbroad Clean Architecture wording | Reframe as "layered monorepo with Clean/Hexagonal influences" unless package remediation is done. |
| POM/custom fixture claims | Do not claim them. Say accessible Playwright locators and direct workflow specs instead. |
| Production-readiness wording | Keep "portfolio-ready" separate from "production-deployed" or "fully calibrated." |

## Recommended Cleanup Phases

| Phase | Scope | Outcome |
| --- | --- | --- |
| Cleanup 1: Publication claims | Update stale QA docs, README wording, architecture diagrams, and LinkedIn claims | Removes publication blockers without production refactor. |
| Cleanup 2: E2E maintainability | Add shared E2E helper modules or custom fixtures for navigation, match selection, and common assertions | Reduces long-spec maintenance risk. |
| Cleanup 3: API boundary hardening | Export server composition dependencies through explicit API entrypoints; remove web imports from API scripts | Reduces package-boundary drift. |
| Cleanup 4: Route/module partition | Split `routes.ts` and `schemas.ts` by feature area | Improves cohesion and interview defensibility. |
| Cleanup 5: Observability | Add request/event IDs, structured operational logs, and documented telemetry fields | Makes production-readiness claims stronger later. |

## Final Readiness Verdict

**Ready after minor cleanup.** The project is already defensible as a serious SDET/QA automation and TypeScript architecture portfolio if it is presented honestly. The strongest story is deterministic quality engineering around a transparent prediction system. The weakest story is claiming fully realized Clean Architecture or advanced E2E framework patterns that the repository does not actually implement.
