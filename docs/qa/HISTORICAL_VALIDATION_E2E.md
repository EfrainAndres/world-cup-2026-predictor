# Historical Validation E2E

Phase 8.2 adds Playwright coverage for the Historical Validation dashboard section.

## Test Count

29 E2E tests total:

- 22 existing match prediction tests from Phase 8.1
- 7 historical validation tests added in Phase 8.2

## Test List

| # | Test name | Area |
| --- | --- | --- |
| 1 | Dashboard loads historical validation section and disclaimer | Section render |
| 2 | Aggregate replay audit status renders | Audit summary |
| 3 | Aggregate component availability renders | Audit components |
| 4 | Supported historical years render | Year coverage |
| 5 | Each historical tournament card shows champion and runner-up | Tournament facts |
| 6 | Each historical tournament card shows dataset and replay status | Dataset/replay status |
| 7 | Foundation-only tournament notes render | Accuracy framing |

## Coverage

The new spec verifies that the dashboard renders:

- Historical validation section heading.
- Aggregate replay audit status.
- Component availability labels.
- Supported years: 2010, 2014, 2018, and 2022.
- Champion and runner-up for each supported year.
- Dataset status for each card.
- Replay support status for each card.
- Foundation-only fixture metadata note.
- Required disclaimer: "Historical validation is used for model auditing, not a public accuracy guarantee."

## Selectors

The tests prefer accessible selectors:

- `getByRole("heading", { level, name })` for section and card headings.
- `getByRole("article").filter({ hasText })` for tournament-card scoping.
- `getByText(...)` for visible labels, statuses, warnings, and disclaimers.

No brittle CSS selectors or pixel-perfect visual assertions are used.

## Boundaries

This phase does not add new dependencies, browser targets, screenshot tests, visual regression tests, API changes, or component refactors.

The tests verify stable dashboard content and model-audit framing, not predictive accuracy.
