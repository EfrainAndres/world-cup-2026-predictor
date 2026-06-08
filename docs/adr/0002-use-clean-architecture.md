# ADR 0002: Use Clean Architecture / Hexagonal Architecture

## Status

Accepted

## Date

2026-06-08

## Context

This project needs to grow from documentation into data processing, prediction models, simulation, API endpoints, and a dashboard. Without clear boundaries, prediction logic could drift into UI components, data cleaning could appear in route handlers, or framework details could leak into core rules.

The project also needs to show testability, maintainability, framework independence, and separation of concerns.

## Decision

Use Clean Architecture / Hexagonal Architecture as the guiding architecture style.

Core domain rules should remain independent from frameworks. Application use cases should orchestrate behavior. Infrastructure should handle files, APIs, databases, model artifacts, and other external integrations. UI and route handlers should adapt user requests into application calls.

## Consequences

Benefits:

- Domain rules can be tested without web framework or data source setup.
- UI changes do not require rewriting model or domain logic.
- Route handlers stay thin and easier to reason about.
- Model, data, and infrastructure code have clear ownership.
- Future architecture decisions can be documented with ADRs.

Tradeoffs:

- More structure than a small prototype would need.
- Requires discipline to avoid bypassing layers.
- Some decisions may feel abstract until implementation begins.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| UI-first architecture | Fast for demos, but encourages business logic in React components. |
| API-first without explicit layers | Better than UI-first, but still risks mixing orchestration, domain rules, and infrastructure. |
| Data science notebook architecture | Good for exploration, but not enough for a maintainable full-stack portfolio project. |
| Microservices | Too much operational complexity for the current project scope. |
