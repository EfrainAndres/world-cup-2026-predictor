# Git Workflow

This document defines the expected Git workflow for the project.

## Branch Naming

Use focused branches with a short prefix:

| Prefix | Use |
| --- | --- |
| `docs/` | Documentation changes. |
| `app/` | Dashboard, API route handler, or frontend work. |
| `data/` | Data ingestion, cleaning, validation, or datasets. |
| `model/` | Prediction, backtesting, scoring, or simulation work. |
| `test/` | Test-only changes. |
| `ci/` | CI/CD workflow changes. |
| `chore/` | Maintenance that does not change behavior. |

Examples:

- `docs/technical-decisions-foundation`
- `model/elo-baseline`
- `data/results-ingestion`
- `app/dashboard-shell`

## Commit Message Format

Use clear conventional commit messages:

```txt
type: short imperative summary
```

Examples:

- `docs: add technical decisions foundation`
- `model: add elo rating update`
- `data: validate match result schema`
- `test: add simulation edge cases`

Prefer one focused commit per task unless the work is large enough to justify separate reviewable commits.

## Pull Request Expectations

Pull requests should include:

- What changed.
- Why it changed.
- Tests or checks run.
- Screenshots for future UI changes.
- Data or model validation notes when relevant.
- Links to ADRs when architecture or technical decisions change.

Keep pull requests focused. Avoid mixing unrelated docs, app, data, model, and CI changes.

## Changelog Update Rules

Update `CHANGELOG.md` when a change is notable for future readers.

Good changelog entries include:

- New project phases.
- New architecture or technical decisions.
- New user-facing features.
- New data/model validation capabilities.
- Important workflow changes.

Small typo fixes do not need changelog entries unless they clarify an important project rule.

## When to Create ADRs

Create or update an ADR when a decision:

- Changes architecture boundaries.
- Selects a major tool or framework.
- Introduces a database, service, deployment target, or CI approach.
- Changes the relationship between TypeScript and Python.
- Affects how data, models, or validation are designed.
- Would be expensive or confusing to reverse later.

## Required Checks Before Merging

Until automated CI exists, run available local checks manually.

Current documentation-only checks:

```bash
git status --short
git diff --check
```

Future implementation checks should include:

- Formatting.
- Linting.
- Type checking.
- Unit tests.
- Data validation.
- Model validation.
- E2E tests for dashboard changes.

Only merge when the branch is clean, reviewed, and the relevant checks have passed or any skipped checks are clearly explained.
