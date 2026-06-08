# Coding Standards

These standards define how future code should be written once implementation begins. Phase 0.2 does not create application code.

## General Principles

- Keep code small, readable, and testable.
- Follow the architecture boundaries in `docs/ARCHITECTURE.md`.
- Prefer explicit names over clever abbreviations.
- Keep business rules out of UI components and route handlers.
- Add tests near the behavior being changed.
- Document assumptions that affect data, modeling, or user trust.

## TypeScript Rules

- Use TypeScript for frontend, route handler, shared, application, domain, and infrastructure code in the web stack.
- Prefer strict types and explicit return types for exported functions.
- Keep React components focused on rendering and user interaction.
- Keep route handlers thin and delegate orchestration to application use cases.
- Avoid `any` unless there is a clear reason and a narrow boundary.
- Validate external inputs before using them.
- Prefer pure functions for domain behavior.
- Keep shared types and schemas stable and intentionally named.

## Python Rules

- Use Python for data ingestion, validation, modeling, backtesting, scoring, and simulation.
- Prefer small modules with clear responsibilities.
- Use type hints for public functions and important data structures.
- Keep data loading separate from transformation and modeling.
- Make random behavior reproducible with explicit seeds when possible.
- Avoid hidden global state in model logic.
- Keep notebooks, if introduced later, exploratory rather than the source of production logic.

## Testing Rules

- Use Vitest for TypeScript unit tests.
- Use Pytest for Python unit and integration tests.
- Use Playwright for future dashboard E2E tests.
- Test pure domain logic with deterministic fixtures.
- Test data validation with small representative datasets.
- Test model logic with probability bounds, reproducibility checks, and backtest metrics.
- Add regression tests for bugs that affect predictions, data quality, or user-facing results.

## Naming Conventions

| Item | Convention | Example |
| --- | --- | --- |
| Branches | `type/short-description` | `docs/technical-decisions-foundation` |
| ADRs | Numbered lowercase kebab-case | `0005-use-pnpm.md` |
| Markdown docs | Uppercase for major docs, kebab-case for ADRs | `TECH_STACK.md` |
| TypeScript files | Kebab-case or framework convention | `match-probability.ts` |
| React components | PascalCase | `MatchProbabilityCard` |
| Python modules | Lowercase snake_case | `elo_rating.py` |
| Tests | Match local ecosystem conventions | `elo_rating_test.py`, `match-card.test.tsx` |

## Documentation Expectations

Update documentation when a change:

- Alters architecture boundaries.
- Adds or changes a technical decision.
- Adds project commands.
- Changes data assumptions or model assumptions.
- Changes validation or QA expectations.
- Affects how future contributors should work.

## What Not To Do

- Do not install dependencies without a phase or task that requires them.
- Do not put prediction logic in React components.
- Do not put model training or data cleaning in API route handlers.
- Do not let `packages/shared/` become a collection of unrelated helpers.
- Do not bypass data validation to make a model work.
- Do not present model outputs without validation context.
- Do not create placeholder code that future phases will need to delete.
