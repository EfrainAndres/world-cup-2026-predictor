# ADR 0009: Use GitHub Actions for CI/CD

## Status

Accepted

## Date

2026-06-08

## Context

The project needs repeatable checks for documentation, TypeScript code, Python data/model code, dashboard behavior, and future deployment. The repository is hosted on GitHub, so the CI/CD tool should integrate naturally with pull requests.

## Decision

Use GitHub Actions for CI/CD.

GitHub Actions will eventually run formatting, linting, type checks, unit tests, Python tests, data validation, model validation, E2E tests, builds, and deployment workflows as those phases are implemented.

## Consequences

Benefits:

- Native GitHub pull request integration.
- Flexible workflows for JavaScript, TypeScript, Python, databases, and browser tests.
- Good portfolio visibility because checks are visible to reviewers.
- Supports future deployment automation.

Tradeoffs:

- Workflow files must be maintained as the project grows.
- CI time can increase as data, model, and E2E checks expand.
- Secrets and environment configuration need careful handling.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| Manual local checks only | Not reliable enough once implementation begins. |
| Third-party CI service | Could work, but adds another platform before it is needed. |
| Deployment platform checks only | Useful later, but not enough for full data, model, and code validation. |
