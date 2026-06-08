# ADR 0005: Use pnpm

## Status

Accepted

## Date

2026-06-08

## Context

The project will use a JavaScript and TypeScript monorepo for the future dashboard, route handlers, shared packages, and orchestration tooling. It needs a package manager that handles workspaces well and helps avoid accidental dependency issues.

## Decision

Use pnpm as the JavaScript and TypeScript package manager.

pnpm will manage future workspace dependencies for apps and TypeScript packages. It will be introduced when the project reaches an implementation phase that needs JavaScript tooling.

## Consequences

Benefits:

- Fast installs and efficient disk usage.
- Strong workspace support for monorepos.
- Stricter dependency resolution than npm, which can expose undeclared dependency problems earlier.
- Works well with Turborepo.

Tradeoffs:

- Contributors need pnpm installed or enabled through the chosen Node.js workflow.
- Some examples online assume npm or yarn and may need translation.
- CI configuration must use pnpm explicitly.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| npm | Built in and familiar, but less strict and less optimized for monorepo workflows. |
| yarn | Strong workspace support, but pnpm is simpler for this project's expected setup. |
| bun | Promising, but less conservative for a portfolio project that should be easy to review. |
