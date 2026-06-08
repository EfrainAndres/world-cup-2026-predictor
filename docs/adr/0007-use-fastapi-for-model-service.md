# ADR 0007: Use FastAPI for the Model Service

## Status

Accepted

## Date

2026-06-08

## Context

The project may need a Python service boundary for serving prediction outputs, model metadata, simulation results, or validation summaries to the web dashboard. The service should fit Python modeling workflows and remain separate from frontend rendering.

## Decision

Use FastAPI for the future Python model service if a live service boundary is needed.

FastAPI should expose clear endpoints around model outputs or application use cases. It should not become a place for UI logic, ad hoc data cleaning, or untested model experimentation.

## Consequences

Benefits:

- Good fit for typed Python APIs.
- Works well with Pydantic-style validation.
- Generates useful API documentation.
- Keeps model-serving concerns close to Python modeling code.

Tradeoffs:

- Adds a second runtime alongside Next.js.
- Deployment will be more complex than a purely static dashboard.
- The project must define clear contracts between TypeScript and Python.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| Next.js route handlers only | Good for thin routes, but not ideal for Python model-serving internals. |
| Flask | Simple and mature, but FastAPI has stronger typing and API documentation defaults. |
| No service, static exports only | May be enough early, but a service decision gives a path for interactive prediction workflows. |
| External managed ML service | Too much complexity before the model boundary is proven. |
