# API Limitations

Phase 5.0 is an API foundation only.

## No Server

There is no HTTP listener, routing framework, middleware, authentication, or deployment target.

## No External State

The API does not use:

- PostgreSQL.
- SQLite.
- External APIs.
- Network calls.
- Downloaded data.

## Model Limitations

`simulateMatch()` accepts caller-supplied expected goals. It does not estimate or calibrate expected goals from team strength.

Historical replay audit output is readiness metadata. It does not prove real predictive accuracy.

## Historical Data Limitations

Historical tournament summaries are local curated metadata for 2010, 2014, 2018, and 2022. They are not live data feeds.

## Future Transport

A future phase can wrap these handlers in HTTP routes. That transport layer should stay thin and preserve the validation metadata and limitations returned by the handlers.
