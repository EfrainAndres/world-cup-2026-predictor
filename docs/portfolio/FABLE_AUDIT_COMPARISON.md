# Fable Audit Comparison

- **Date:** 2026-07-02
- **Compared documents:**
  - Independent audit: `docs/portfolio/INDEPENDENT_FABLE_PROJECT_AUDIT.md` (Claude Fable 5, written before reading the prior audit)
  - Prior audit set: `docs/portfolio/ARCHITECTURE_AND_TECH_DEBT_AUDIT.md`, `docs/portfolio/SDET_CONTRIBUTION_SUMMARY.md`, `docs/portfolio/LINKEDIN_TECHNICAL_CLAIMS.md` (dated 2026-07-03)
- **Ground rule:** every disagreement below was re-verified against the repository before being recorded. Neither audit document was altered.

---

## 1. Findings Both Audits Agree On

The two audits were produced independently and converge on most of the substance, which raises confidence in both:

| Shared finding | Prior audit | Fable audit |
|---|---|---|
| `routes.ts` (3,516 lines) is the top debt hotspot; `predictMatchFromLiveElo` should be split into pipeline stages | P1, High | TD-03, High |
| Deep source imports bypass package public APIs (web → `api/src/*`, api → `../../model/src/*`) | P1, Medium | TD-02, High |
| `schemas.ts` (2,253) and `model/types.ts` (1,128) are oversized type hubs | P1, Medium | §5 Q1/M3, Medium |
| No POM, no custom Playwright fixtures — and neither should be claimed | Explicit | Explicit (Phase-4 Q2/Q3) |
| E2E suite lacks shared helpers; `match-simulation.spec.ts` (1,085 lines) repeats flows | P1, Medium | TD-07, Medium |
| Duplicated knockout-round response construction in `routes.ts` | Duplication candidate | TD-04, Medium |
| `server-runtime.ts` concentrates dashboard orchestration; `MatchSimulationResults.tsx` is presentation-heavy | Multiple-responsibility table | §4 M2 / hotspot review |
| Determinism (seeded simulation, injected clocks) is a headline strength | Yes | Yes |
| API contract tests and explicit-assertion regression snapshots are strong, deliberate SDET evidence | Yes | Yes |
| Observability is log-based and limited; fine for portfolio, not production | P2, Medium | §5 Q10 / claim table |
| Env configuration is explicit but scattered across modules | P2, Medium | TD-13, Low |
| LKG/fallback caching can mask provider degradation behind a warning string | P2, Medium | §4 M2 |
| "Clean Architecture" must not be claimed; layered-with-influences wording is the ceiling | P0 blocker | Claim table: No |
| "Production-ready" / "fully calibrated" must not be claimed | Blocker wording | Claim table: No |
| CI lacks lint, accessibility automation, coverage gates, and a database service container | CI gaps row | TD-05 / §6 CI notes |
| Functional composition, not OOP/SOLID, is the honest architecture story | Explicit | Explicit |

On portfolio claims, the three prior documents and the Fable audit give **materially identical guidance** (avoid POM/fixtures/Clean-Architecture/OOP/production-calibrated; lead with determinism, contracts, transparency). The prior docs' interview sound bites remain usable as-is.

## 2. Findings Unique to the Fable Audit

These do not appear in any of the three prior documents:

1. **`main` branch CI is red (Critical — the decisive new finding).** CI run 28621186180 (merge of PR #166, 2026-07-02) failed in the Playwright step for two verified reasons:
   - `ci.yml` installs **only Chromium**, while `playwright.config.ts` declares chromium + firefox + webkit. Every firefox/webkit test fails with `browserType.launch: Executable doesn't exist at .../firefox-1522/...`.
   - A genuine chromium assertion failure: `match-simulation.spec.ts:1003` asserts the Attack/Defense section is absent in `off` mode, but PR #166's observability change makes AD metadata (and therefore the section) render even when the mode is off.
   The prior audit recorded "Playwright projects: Chromium, Firefox, WebKit" as a capability and recommended updating stale docs *upward* to claim three browsers — without discovering that CI has never successfully run the other two. This finding flips the publication verdict (see §4).
2. **`packages/api` has no declared dependency on `packages/model` at all** — beyond the deep-import style issue both audits saw, the workspace graph itself is wrong: Turborepo's `^build`/`^typecheck` ordering and cache keys cannot see api→model edges, and `model`'s `dist` output is dead weight.
3. **The webpack `NormalModuleReplacementPlugin` `.js`→`.ts` rewrite in `next.config.ts`** as the load-bearing mechanism that makes the boundary violations build — the concrete artifact an interviewer will find first.
4. **E2E runs against `pnpm dev`, not the production build, including in CI** (`playwright.config.ts` webServer) — the built bundle is never exercised by any test.
5. **32 bare `catch {}` blocks** that convert failures into cause-less warnings (`server-runtime.ts` ×5, `statsbomb-server-composition.ts`, `daily-matches.ts`, `live-results-sync.ts`, …).
6. **`runtime.ts:153` casts the unvalidated request body** `as unknown as SimulateMatchRequest` before handler-level validation — the one soft spot in an otherwise strict typing story.
7. **Model-quality risk quantification:** 128-fixture backtest sample with a −0.0117 Brier holdout delta is within statistical noise; 312-match/60-team Elo foundation with `latestMatchDate=2024-07-14` pinned in regression tests; grid-search (200 configs) overfitting exposure with a single holdout; 1-1 modal concentration reduced to 70.3%, not solved; live evidence gate requires ≥20 evaluated fixtures and has not met it, so **no live-calibration claim is currently supportable**. The prior audit said "don't claim full calibration" but did not ground it in the sample-size arithmetic.
8. **Security review results (positive):** parameterized SQL throughout (no injection surface found), `pg_try_advisory_lock` for capture concurrency, DB CHECK constraint enforcing pre-match timing, minimal workflow permissions with concurrency groups, an E2E test asserting no credential/DB-URL leakage, `simulationCount` capped at 10,000. Also the negatives: no rate limiting on CPU-heavy paths, `getModelInfo` echoes raw config-error text.
9. **Actions runner Node 20 deprecation warnings** already appearing in CI logs — a scheduled future breakage.
10. **Provider fixture alias data (`"537417"`) hardcoded in the web layer** (`server-runtime.ts:306`).
11. **Regression snapshots as data-refresh churn:** ~30 assertions pin data-derived values (312/60/2024-07-14/champion order) and will all break on any data update — defensible as a tripwire, but worth centralizing.

## 3. Findings Unique to the Prior Audit

All three were re-verified for this comparison and are **correct** — the Fable audit missed them:

1. **Reverse dependency api→web:** `packages/api/src/scripts/list-attack-defense-runtime-eligibility.ts:7` imports `../../../../apps/web/src/lib/attack-defense-embedded-artifact.server.js`. Verified present. This is the only place the dependency direction actually inverts, and it strengthens the boundary-hardening case (fold into Fable TD-02 remediation).
2. **Stale QA documentation with specific wrong numbers:** `docs/qa/E2E_MATCH_PREDICTION_COVERAGE.md` says "45 tests" and "Chromium only. Firefox and WebKit deferred."; `docs/qa/QA_AUTOMATION_FOUNDATION.md` says Chromium-only/single-spec; `docs/portfolio/FINAL_PORTFOLIO_QA_REVIEW.md` says 52 checks. Current reality: 10 specs, ~253 declarations, 3 configured projects. Verified. (Note the correction direction, though — see §5.)
3. **Planned-vs-actual architecture docs:** `docs/ARCHITECTURE.md` / `docs/REPOSITORY_STRUCTURE.md` still describe `domain/application/infrastructure/shared` packages that were never created, and `docs/TECH_STACK.md` still lists Python/FastAPI/Pytest as selected stack. Verified. This materially raises the "Clean Architecture overclaim" risk beyond what the Fable audit (which spot-checked README/CHANGELOG and found them honest) reported.
4. **Quantified repo metrics** (57,417 source lines vs 46,641 test lines; 2,844 test declarations; 253 E2E declarations) — useful portfolio talking points the Fable audit did not compute.
5. **Stale package-scoped command examples** in StatsBomb docs (`pnpm statsbomb:*` vs `pnpm --filter ... statsbomb:*`). Not re-verified line-by-line but consistent with package.json layout.
6. **Tooling suggestion** (`ts-prune`/`knip`) to settle the dead-export question rather than speculate.

## 4. Severity Disagreements

| Topic | Prior audit | Fable audit | Resolution |
|---|---|---|---|
| **Overall verdict** | Ready after **minor cleanup** (blockers are documentation wording only) | **Ready after targeted remediation** (blocker is a red `main` CI) | The disagreement is entirely explained by the CI discovery. The prior audit examined the working tree but not Actions run outcomes; the failing run (2026-07-02 20:59 UTC) is the merge of PR #166. Fable's verdict stands: **a red default branch is a hard blocker for a QA-positioned portfolio**, and it is not fixable by editing docs. Once CI is green, the two verdicts converge — the remaining blockers really are wording-level. |
| Deep source imports | Medium (fragile refactors) | High (missing declared workspace dep, Turbo graph/cache correctness, webpack rewrite machinery) | Keep **High** until the dependency is declared; the prior audit under-weighted it because it didn't connect the import style to the build system's dependency graph. |
| Three-browser E2E | Neutral fact; docs should be updated to reflect 3 browsers | Liability: configured but never run successfully in CI | See §5 — updating docs to claim three browsers would have converted a config artifact into a false public claim. |
| E2E flake risk | Medium (spec length, dev server, breadth) | Moderate **and currently realized** (suite is failing on main) | Same underlying assessment; Fable has the newer evidence. |
| Env-var sprawl | P2 Medium | TD-13 Low | Minor; either is defensible. Prior audit's "single configuration inventory doc" action is the better concrete step. |

## 5. Claims That Need Correction (in the prior audit set)

1. **"Update QA docs to reflect Chromium, Firefox, WebKit projects" (ARCHITECTURE_AND_TECH_DEBT_AUDIT P0, and SDET summary "Browsers" row).** As written, this would make public claims *worse*: firefox/webkit have never passed (or even launched) in CI. The correction must be paired with a decision — either install all three browsers in CI and get them green, or scope `playwright.config.ts` back to chromium and keep the docs' existing "Chromium only, others deferred" language, which is currently the *accurate* statement. The stale docs' test counts (45/52) still need updating either way.
2. **SDET summary: "Integrated quality gates into CI … CI runs install, tests, typecheck, build, and E2E"** and LinkedIn claim "Integrated GitHub Actions quality gates … and browser E2E." True as descriptions of the pipeline definition, but unsafe to publish while the pipeline is red on `main`. Add a pre-publication checklist item: *verify the latest `main` run is green on the day of posting.*
3. **LinkedIn "Documented the Vercel runtime path…"** is correctly hedged in the prior docs and should stay that way — Fable's audit confirms the repo cannot evidence a live deployment.
4. No other prior claims required correction: the prior audit's negative findings all re-verified, and its "claims to avoid" list is consistent with Fable's claim-safety table.

## 6. Missed Risks (by each side)

- **Missed by the prior audit:** red `main` CI; browser install/config mismatch; env-coupled AD off-mode E2E assertions (the PR #166 breakage); undeclared api→model workspace dependency and its Turborepo implications; dev-server E2E; error-cause swallowing; body-cast at the runtime boundary; model sample-size fragility; Node 20 runner deprecation.
- **Missed by the Fable audit:** the api-script→web reverse dependency; the specific stale QA-doc numbers (45/52) and the `domain/application/infrastructure` planned-architecture text in `docs/ARCHITECTURE.md`/`REPOSITORY_STRUCTURE.md`; the Python/FastAPI residue in `TECH_STACK.md`. These are accepted as additions to the Fable technical-debt register (fold into TD-02 and a new docs-staleness item at Medium severity, publication-relevant because interviewers read `docs/ARCHITECTURE.md`).

## 7. Possible False Positives

- **In the prior audit:** none found. Every checked claim re-verified against source. The only correction is directional (the three-browser doc update, §5.1), not factual.
- **In the Fable audit:** none identified during this comparison; its Critical finding is backed by the CI run log and reproducible from `ci.yml` + `playwright.config.ts`. One caveat: the chromium assertion-failure diagnosis (AD metadata now always present) is inferred from PR #166's changes and the component's render condition (`MatchSimulationResults.tsx:249`); confirm by running the single spec locally before treating the proposed test fix as final.

## 8. Final Combined Recommendation

**Publication verdict: `ready_after_targeted_remediation`** — the stricter of the two verdicts, because the CI evidence postdates and supersedes the prior audit's assumption of a passing pipeline.

Combined pre-publication checklist (union of both audits, deduplicated, in order):

1. **Restore green `main` CI** *(Fable B1)*: choose the browser policy (install firefox+webkit with `--with-deps` in CI, or reduce Playwright projects to chromium), and fix the three AD off-mode assertions in `match-simulation.spec.ts` to match post-PR-#166 metadata behavior. Verify the Actions tab is green.
2. **Fix stale QA and architecture docs** *(prior P0)*: correct E2E counts (45/52 → current), align browser-scope statements with the decision from step 1, and rewrite `docs/ARCHITECTURE.md` / `docs/REPOSITORY_STRUCTURE.md` to describe the real `api/model/data/web` layout (move `domain/application/infrastructure` text to a "future direction" note). Mark Python/FastAPI in `TECH_STACK.md` as not implemented.
3. **Keep the claim discipline both audits agree on**: no Clean Architecture, no POM, no custom Playwright fixtures, no OOP/SOLID headline, no production-ready/production-calibrated, no cross-browser claim until step 1 makes it true.
4. **First post-publication debt sprint** (order agreed by both audits): declare api→model workspace dependency + subpath exports + remove the webpack rewrite + move the api-script's embedded-artifact import out of `apps/web` *(merges Fable TD-02 with prior P1 reverse-dependency)*; extract shared E2E helpers; then begin the `routes.ts` pipeline extraction.
5. **CI hardening next**: Postgres service container (unskip the 32 integration tests), E2E against `next start`, Node version bump, Playwright browser caching.

The two audits disagree on almost nothing substantive. The prior audit is stronger on documentation staleness and repo metrics; the Fable audit is stronger on CI/runtime evidence, build-system consequences, model-statistics grounding, and security verification. Together they form a consistent remediation plan with one non-negotiable gate: **do not publish while `main` is red.**
