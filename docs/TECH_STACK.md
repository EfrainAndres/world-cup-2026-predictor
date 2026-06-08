# Technical Stack

Phase 0.2 selects the intended technologies for the project before implementation begins. These decisions give future phases a clear direction while keeping this phase documentation-only.

## Selected Technologies

| Area | Technology | Responsibility | Why Selected |
| --- | --- | --- | --- |
| Package manager | pnpm | Manage JavaScript and TypeScript dependencies and workspaces. | Fast installs, strict dependency behavior, strong monorepo support. |
| Monorepo orchestration | Turborepo | Coordinate builds, tests, linting, and caching across apps and packages. | Works well with pnpm and keeps multi-package workflows understandable. |
| Frontend | Next.js + TypeScript | Build the future dashboard and thin route handlers. | Supports polished React UI, server-side capabilities, API routes, and typed contracts. |
| Styling | Tailwind CSS | Provide utility-first styling for the dashboard. | Helps build consistent, responsive UI quickly without inventing a custom CSS system too early. |
| UI system | shadcn/ui, optional | Provide accessible, customizable UI primitives when useful. | Gives a strong starting point while allowing the dashboard to keep its own visual identity. |
| Model service | FastAPI | Serve model outputs or prediction use cases when a Python service boundary is needed. | Modern Python API framework with strong typing, documentation support, and good fit for model-serving workflows. |
| Modeling language | Python | Build data validation, modeling, backtesting, scoring, and simulation workflows. | Best fit for pandas, NumPy, statistical modeling, validation, and reproducible analysis. |
| Database | PostgreSQL | Store structured application data, model metadata, prediction runs, and future dashboard state. | Reliable relational database with strong querying, indexing, constraints, and deployment support. |
| Frontend/shared unit tests | Vitest | Test TypeScript packages, React utilities, and shared logic. | Fast, modern test runner that fits TypeScript and frontend workflows. |
| Python tests | Pytest | Test data, modeling, simulation, and validation logic. | Standard Python testing tool with excellent fixture and plugin support. |
| E2E tests | Playwright | Test future dashboard workflows across browser contexts. | Strong browser automation, reliable selectors, screenshots, and trace tooling. |
| CI/CD | GitHub Actions | Run checks, tests, builds, and future deployment workflows. | Native to GitHub, flexible, familiar, and appropriate for portfolio review. |

## Responsibility Boundaries

| Technology | Owns | Does Not Own |
| --- | --- | --- |
| Next.js | Dashboard routes, rendering, route handlers. | Prediction formulas, data cleaning, model training. |
| TypeScript | UI contracts, app orchestration glue, shared schemas. | Statistical modeling internals. |
| Python | Data pipelines, model training, backtesting, simulation. | Dashboard components or UI rendering. |
| FastAPI | Python model service boundary when needed. | Core domain rules that should be framework-independent. |
| PostgreSQL | Persistent structured data. | Raw dataset versioning by itself. |
| Turborepo | Workspace task orchestration. | Replacing tests, lint rules, or architecture boundaries. |

## What Is Intentionally Not Included Yet

This phase does not include:

- Dependency installation.
- `pnpm` workspace initialization.
- Turborepo configuration.
- Next.js app scaffolding.
- Tailwind or shadcn/ui setup.
- Python package initialization.
- FastAPI app creation.
- PostgreSQL schema or migrations.
- GitHub Actions workflow files.
- Prediction models or data pipelines.

Those items should be introduced in later roadmap phases when they are needed and can be tested.

## Future Decision Areas

Future ADRs may be needed for:

- TypeScript schema validation library.
- Python data validation library.
- ORM or database migration tool.
- Python packaging and environment strategy.
- Model artifact storage and versioning.
- Deployment target for the dashboard and model service.
