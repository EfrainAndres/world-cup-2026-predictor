# Dashboard Foundation

Phase 6.0 creates the first dashboard foundation for World Cup 2026 Predictor.

## Purpose

The dashboard gives the project a minimal user-facing surface for model status, match simulation preview data, historical replay audit context, and curated historical tournament summaries. It is intentionally small so the UI can grow from the verified API and model foundations.

## Stack

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- Local `packages/api` pure handler calls through `apps/web/src/lib/api-client.ts`.

## Current Surface

The dashboard home page includes:

- Navigation/header.
- Model status card.
- Match simulation preview card.
- Historical replay audit preview card.
- Historical tournaments preview section for 2010, 2014, 2018, and 2022.

## Boundaries

This phase does not add:

- Authentication.
- Database storage.
- Payments.
- Real deployment.
- Chart libraries.
- shadcn/ui or another UI component library.
- Network calls to an API server.

## Accuracy Framing

The dashboard presents model and replay outputs as foundation evidence. It does not claim final predictive accuracy. The match preview uses caller-supplied expected goals and the historical audit remains readiness metadata with documented limitations.

## Next Steps

Future dashboard work can add:

- Dedicated match detail pages.
- Team explorer pages.
- Tournament simulation views.
- Data quality pages.
- Real chart components after the data contracts are stable.
- E2E and accessibility checks for the user-facing flows.
