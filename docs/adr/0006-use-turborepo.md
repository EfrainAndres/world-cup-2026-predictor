# ADR 0006: Use Turborepo

## Status

Accepted

## Date

2026-06-08

## Context

The project will have multiple apps and packages over time: a Next.js dashboard, shared TypeScript code, domain/application/infrastructure packages, Python data and model packages, scripts, and tests. The repository needs a clear way to run repeated tasks across the monorepo.

## Decision

Use Turborepo for JavaScript and TypeScript monorepo task orchestration.

Turborepo will coordinate tasks such as build, lint, test, typecheck, and future package-level workflows where appropriate. It should complement, not replace, Python-specific tooling for data and model packages.

## Consequences

Benefits:

- Clear task orchestration across apps and packages.
- Caching can speed up repeated local and CI checks.
- Works naturally with pnpm workspaces.
- Common fit for Next.js monorepos.

Tradeoffs:

- Adds another tool to understand.
- Python workflows need explicit integration instead of assuming Turborepo solves everything.
- Task names and boundaries must be kept simple.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| No monorepo task runner | Simpler at first, but scales poorly once apps and packages appear. |
| Nx | Powerful, but heavier than the project needs at this stage. |
| Custom scripts only | Flexible, but easier to make inconsistent over time. |
