# Technical Decisions

This document summarizes current technical decisions and links to the ADRs that explain the tradeoffs.

## Phase 0.1 Architecture Decisions

| Decision | Status | ADR |
| --- | --- | --- |
| Use a monorepo | Accepted | [ADR 0001](adr/0001-use-monorepo.md) |
| Use Clean Architecture / Hexagonal Architecture | Accepted | [ADR 0002](adr/0002-use-clean-architecture.md) |
| Use Next.js App Router for the dashboard | Accepted | [ADR 0003](adr/0003-use-nextjs-app-router.md) |
| Use Python for modeling and data work | Accepted | [ADR 0004](adr/0004-use-python-for-modeling.md) |

## Phase 0.2 Technical Decisions

| Decision | Status | ADR |
| --- | --- | --- |
| Use pnpm as the JavaScript package manager | Accepted | [ADR 0005](adr/0005-use-pnpm.md) |
| Use Turborepo for monorepo task orchestration | Accepted | [ADR 0006](adr/0006-use-turborepo.md) |
| Use FastAPI for a future model service | Accepted | [ADR 0007](adr/0007-use-fastapi-for-model-service.md) |
| Use PostgreSQL as the primary database | Accepted | [ADR 0008](adr/0008-use-postgresql-as-primary-database.md) |
| Use GitHub Actions for CI/CD | Accepted | [ADR 0009](adr/0009-use-github-actions-for-ci.md) |

## Supporting Decisions

| Area | Current Direction | Status |
| --- | --- | --- |
| Frontend language | TypeScript | Accepted |
| Styling | Tailwind CSS | Accepted |
| UI system | shadcn/ui optional | Accepted as optional |
| Python test runner | Pytest | Accepted |
| TypeScript test runner | Vitest | Accepted |
| E2E test runner | Playwright | Accepted |

## Decision Status Meaning

| Status | Meaning |
| --- | --- |
| Proposed | A likely direction that still needs review. |
| Accepted | The current project decision. |
| Superseded | Replaced by a newer decision. |
| Deferred | Intentionally postponed. |

## How to Change a Decision

Major technical changes should:

1. Update or add an ADR.
2. Update this decision index.
3. Update affected strategy or standards docs.
4. Include the reason for the change in the pull request.
