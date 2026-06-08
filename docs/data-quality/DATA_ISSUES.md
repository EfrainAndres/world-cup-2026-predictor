# Data Issues

This document tracks known data-quality issues and risks.

## Current Issues

| Issue | Status | Notes |
| --- | --- | --- |
| No external dataset selected in code yet | Open | Candidate sources are documented in `docs/DATA_SOURCES.md`. |
| Dataset license not verified in code | Open | Must be checked before committing or redistributing raw data. |
| No canonical team ID mapping yet | Open | Current validation only trims names and checks non-empty distinct teams. |
| No duplicate detection yet | Open | Requires dataset-level validation after ingestion exists. |
| No data freshness metadata yet | Open | Requires source metadata files or generated reports. |

## Risk Handling

- Do not publish predictions from unvalidated data.
- Do not commit large raw datasets without a storage and licensing decision.
- Do not use scraped data unless source terms allow it.
- Document manual data corrections when they begin.
