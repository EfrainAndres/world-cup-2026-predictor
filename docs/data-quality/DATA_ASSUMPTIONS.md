# Data Assumptions

This document records assumptions used by the Phase 1.0 data pipeline foundation.

## Current Assumptions

| Assumption | Reason |
| --- | --- |
| Match dates can be represented as ISO-compatible strings. | The data dictionary uses date fields and future outputs should be serializable. |
| Team names are strings and can be trimmed safely. | Initial validation starts before canonical team IDs exist. |
| Completed-match scores are non-negative integers. | Football scores should not be negative or fractional. |
| `neutral_site` is a required boolean. | Home advantage depends on whether the match is neutral. |
| Result values use `home_win`, `draw`, or `away_win`. | This matches `docs/DATA_DICTIONARY.md`. |
| A missing result can be derived when both scores are present. | Completed matches should not require duplicate manual result entry. |

## Assumptions To Revisit

- Whether home/away labels are meaningful for all international matches.
- Whether neutral-site handling needs venue or host-country context.
- Whether result values should distinguish regulation, extra time, and penalties.
- Whether team names should be replaced by canonical team IDs in all processed outputs.
- Whether timestamp fields should require UTC input only.
