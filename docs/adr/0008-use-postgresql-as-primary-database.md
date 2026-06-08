# ADR 0008: Use PostgreSQL as the Primary Database

## Status

Accepted

## Date

2026-06-08

## Context

The project may eventually store teams, matches, competitions, model runs, prediction snapshots, simulation outputs, validation summaries, and dashboard metadata. A reliable relational database will help preserve data integrity and support future queries.

## Decision

Use PostgreSQL as the primary database when persistent structured storage is needed.

PostgreSQL should support application data, model metadata, prediction records, and future dashboard-facing queries. Raw source datasets and large model artifacts may still require separate storage or versioning strategies.

## Consequences

Benefits:

- Strong relational modeling, constraints, indexing, and query support.
- Widely supported by hosting platforms.
- Good fit for structured football, prediction, and validation metadata.
- Better long-term portfolio signal than relying only on local files.

Tradeoffs:

- Requires migrations, local setup, and CI service configuration later.
- Adds operational complexity compared with local files or SQLite.
- Large raw datasets and artifacts may not belong directly in the database.

## Alternatives Considered

| Alternative | Reason Not Chosen |
| --- | --- |
| Local files only | Useful early, but weaker for relational queries and integrity constraints. |
| SQLite | Excellent for simple local workflows, but less representative of production-style deployment. |
| DuckDB | Strong for analytical workflows, but not the primary application database choice. |
| Managed document database | Less natural for relational football match and prediction data. |
