# Historical Validation Dashboard

Phase 6.2 adds the historical validation section to the dashboard.

## Purpose

The historical validation section makes the existing historical replay and audit work visible in the UI. It connects the model validation evidence — built across Phases 4.0F through 4.0P — to a human-readable dashboard surface.

The section is intentionally a summary view. It shows validation status and known limitations without presenting results as final predictive accuracy.

## Current UI

The dashboard now includes a dedicated historical validation section with:

- Section header and description explaining the audit-only scope.
- Aggregate audit status card showing:
  - Number of years in replay scope.
  - API readiness status (`ready with warnings`).
  - Component availability for dataset completeness, bracket reconstruction, Elo snapshot replay, Monte Carlo replay, and replay validation.
  - Audit disclaimer: "Historical validation is used for model auditing, not a public accuracy guarantee."
- Per-year tournament cards for 2010, 2014, 2018, and 2022, each showing:
  - Year and tournament name.
  - Replay-supported status.
  - Champion and runner-up.
  - Match count against expected match count.
  - Dataset status label.
  - Foundation-only warning when present.

## Components

| Component | Purpose |
| --- | --- |
| `HistoricalValidationSection` | Section wrapper with aggregate audit status and per-year card grid. |
| `HistoricalTournamentCard` | Individual year card with tournament result and validation metadata. |

Both components receive data from the `DashboardSnapshot` already fetched by `getDashboardSnapshot()` in `apps/web/src/lib/api-client.ts`. No new API calls or direct model package imports are added.

## Data Sources

| Prop | Source |
| --- | --- |
| `tournaments` | `snapshot.historicalTournaments` — `HistoricalTournamentSummary[]` from `getHistoricalTournamentSummary` per supported year |
| `audit` | `snapshot.historicalReplayAudit` — `HistoricalReplayAuditResponse` from `getHistoricalReplayAudit` |

## Boundaries

This phase does not add:

- Charts or visualizations.
- Authentication.
- Database storage.
- Server deployment.
- External UI libraries.
- New API package handlers or model package behavior.
- Per-year metric scores (Brier Score, Log Loss) — these are aggregate in the API response and not broken down per year.

## Accuracy Framing

The section clearly states that historical validation is used for model auditing, not a public accuracy guarantee. The foundation-only warnings from each tournament's `HistoricalTournamentSummary.warnings` are shown directly on each card.

## Next Steps

Future dashboard work can add:

- Per-year metric cards (Brier Score, Log Loss, Top-N hits) once the API exposes per-year breakdown.
- A dedicated historical validation page with deeper drill-down.
- Probability calibration charts after a chart library is introduced.
- Focused accessibility and routing checks as part of Phase 6.2 Dashboard Validation work.
