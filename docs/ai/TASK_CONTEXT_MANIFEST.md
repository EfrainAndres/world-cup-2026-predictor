# Task Context Manifest

This manifest defines the minimum files normally required for common task categories.

Agents may expand context only when they explain why an additional dependency is necessary.

## General Rules

- Always start with:
  - `PROJECT_BRIEF.md`
  - `AGENTS.md`
  - `CLAUDE.md` for Claude Code sessions
  - `docs/ROADMAP.md`
- Then read only the files required for the current task category.
- Do not scan unrelated packages or the full repository by default.
- Prefer the smallest validation scope that still proves the requested change.

## Task Categories

| Task category | Required files | Optional files | Do not read by default | Recommended validation scope |
| --- | --- | --- | --- | --- |
| API-only change | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, directly related API source files, directly related API tests | relevant docs under `docs/data-quality/` or `docs/model-results/` | web app files, E2E tests, unrelated package code | affected API tests, package typecheck, `git diff --check` |
| Model-only change | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, directly related model source files, directly related model tests | `docs/MODEL_ROADMAP.md`, `docs/MODEL_VALIDATION.md`, `docs/BACKTESTING_STRATEGY.md` | web app files, unrelated API handlers | affected model tests, model package typecheck, `git diff --check` |
| Web UI change | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, directly related web components/pages/helpers/tests | relevant dashboard docs, related API-client helpers | unrelated API internals, model package files | targeted web tests, relevant E2E, web typecheck/build when phase requires |
| E2E-only change | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, target E2E spec, directly related UI/API contract files | dashboard docs for the affected workflow | unrelated implementation files | targeted E2E, `git diff --check` |
| Documentation-only change | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, only the docs being updated | adjacent docs linked by the same workflow | application source, package tests, unrelated docs | doc/script syntax checks only, `git diff --check` |
| Architecture decision | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, relevant ADRs, directly affected package boundaries | `docs/DECISIONS.md`, `docs/REPOSITORY_STRUCTURE.md` | full implementation files unless a concrete change is requested | docs consistency checks, targeted validation if code changes are included |
| Data-provider change | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, relevant provider contracts, sync/normalization code, related tests | `docs/DATA_SOURCES.md`, `docs/data-quality/` files | web UI files unless the task explicitly includes UI | targeted API/data tests, package typecheck, `git diff --check` |
| Cross-package change | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, the directly touched files in each affected package, the shared contract files, directly related tests | architecture or workflow docs when boundaries change | unrelated package directories | targeted package tests per affected boundary, root typecheck/build only when phase requires |
| Prediction usefulness / model audit | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, `packages/api/src/prediction-usefulness-audit.ts` (+ its CLI and tests), `docs/model-results/PREDICTION_USEFULNESS_AUDIT.md`, snapshot/evaluation contracts | `docs/model-results/MODEL_VS_REALITY_TRACKER.md`, Elo-to-xG decision/integration docs, the audit artifact under `docs/model-results/artifacts/` | production formula/preset/provider/standings code (audit is read-only), web UI, unrelated package code | targeted audit tests, API typecheck, `git diff --check` |
| Pre-match snapshot capture | project brief, `AGENTS.md`, `CLAUDE.md` when applicable, `docs/ROADMAP.md`, `packages/api/src/prematch-snapshot-capture.ts` (+ its CLI and tests), `docs/model-results/AUTOMATED_PREMATCH_SNAPSHOT_CAPTURE.md`, `snapshot-service.ts`, `persistence-runtime.ts`, `async-snapshot-store.ts` | `docs/model-results/PREDICTION_SNAPSHOT_STORAGE.md`, `live-results-sync.ts`, `routes.ts` `predictMatchFromLiveElo` | production prediction formula/Elo/xG constants, standings, providers, migrations, web UI | targeted capture tests (+ opt-in PostgreSQL via `TEST_DATABASE_URL`), API typecheck/build, `git diff --check` |

## File Expansion Rule

Expand beyond the minimum set only when one of these is true:

1. a directly imported dependency controls the behavior being changed
2. a shared type or contract must be updated consistently
3. a validation failure points to a required adjacent file
4. a roadmap or scope doc explicitly requires another file

When expanding context, note the reason in the session update or final handoff.

## Validation Scope Rule

- Prefer package-local checks before monorepo-wide checks.
- Do not run build, E2E, or full test suites unless the phase explicitly requires them.
- When a helper script can summarize output without changing behavior, use it.
