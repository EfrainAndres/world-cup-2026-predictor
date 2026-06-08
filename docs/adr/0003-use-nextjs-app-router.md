# ADR 0003: Use Next.js App Router for the Dashboard

## Status

Accepted

## Date

2026-06-08

## Context

The project plans to include a polished web dashboard that presents match predictions, team views, tournament simulations, uncertainty, and model explanations. The dashboard will likely need UI routes, server-side capabilities, and route handlers for reading prediction outputs or calling application use cases.

The project should remain deployable as a portfolio artifact.

## Decision

Plan to use Next.js App Router for the future dashboard and route handlers.

Next.js App Router is a good fit for:

- Modern React UI.
- File-based routing.
- Server-side rendering or static generation where useful.
- API route handlers for thin request/response boundaries.
- Future deployment to platforms that support Next.js well.

The route handlers must remain thin. They should not contain prediction logic, data cleaning, model training, or tournament simulation rules.

## Consequences

Benefits:

- Supports both dashboard UI and route handlers in one app.
- Provides a clear path for server-side and static rendering decisions.
- Fits common portfolio deployment workflows.
- Works well with modern React patterns.

Tradeoffs:

- Adds framework-specific conventions that must stay out of domain code.
- TypeScript/Python boundaries will need explicit contracts.
- The team must avoid putting too much logic inside route handlers or React components.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| Static HTML only | Too limited for future interactive prediction and simulation views. |
| Vite React app only | Strong client app option, but would need a separate API strategy. |
| Python dashboard framework | Useful for data apps, but less aligned with the desired polished web UI/UX portfolio goal. |
| Separate backend service first | May be useful later, but adds deployment complexity before the API boundary is proven. |
