# Definition Of Done

This document defines what "done" means for project phases and major implementation work.

## General Definition Of Done

Every phase should be considered done only when:

- The work matches the current roadmap phase.
- Related documentation is created or updated.
- Relevant tests or validation checks are added or explicitly deferred.
- `CHANGELOG.md` is updated for notable changes.
- Git status is clean after commit.
- The branch is pushed to `origin` when a remote exists.
- Any skipped checks, known gaps, or follow-up risks are documented.

## Documentation Requirements

Documentation should:

- Explain decisions in beginner-friendly but professional language.
- Link to relevant strategy docs or ADRs.
- Capture assumptions, risks, and non-goals.
- Avoid claiming implementation exists before it does.
- Be updated when commands, structure, data, models, or workflows change.

## Testing Requirements

Testing should scale with the phase:

| Phase Type | Expected Checks |
| --- | --- |
| Documentation-only | `git diff --check` and content review. |
| Data pipeline | Unit tests, fixture-based integration tests, data validation checks. |
| Modeling | Unit tests, backtests, metric reports, calibration review. |
| Dashboard | Unit/component tests, accessibility checks, E2E tests where useful. |
| CI/CD | Workflow validation, required checks, failure-path review. |

## Changelog Requirements

Update `CHANGELOG.md` when work adds:

- New project phases.
- Architecture or technical decisions.
- Data/model validation capability.
- User-facing features.
- CI/CD or release process changes.
- Important documentation foundations.

## Git Requirements

- Start from the latest branch that contains required prior phase work.
- Check `git status` before editing.
- Use focused branches.
- Stage only files related to the task.
- Use clear conventional commits.
- Push completed branches.
- Do not overwrite unrelated local changes.

## Review Requirements

Before merge or release:

- Confirm the phase scope was respected.
- Confirm no unrelated files changed.
- Confirm docs match implementation reality.
- Confirm checks were run or explicitly explained.
- Confirm follow-up work is captured in roadmap, backlog, or docs.

## Phase-Specific Definition Of Done

### Data Pipeline

Done means:

- Source selection and license notes are documented.
- Raw, processed, and metadata strategy is implemented.
- Ingestion is repeatable with documented commands.
- Data dictionary fields are populated or intentionally deferred.
- Validation catches schema, type, duplicate, team mapping, and cutoff issues.
- Small fixtures exist for tests.
- No model uses unvalidated data.

### Elo Baseline

Done means:

- Elo parameters are documented.
- Rating updates are tested with deterministic examples.
- Match probabilities are valid and sum to approximately 1.
- Backtest report compares Elo against Baseline 0.
- Data cutoff and model version are recorded.
- Known limitations are documented.

### Poisson/Dixon-Coles Model

Done means:

- Expected goal assumptions are documented.
- Probability outputs are tested for valid ranges and normalization.
- Plain Poisson is compared against Elo.
- Dixon-Coles is compared against plain Poisson.
- Accuracy, Brier Score, log loss, and calibration notes are reported.
- The simpler model remains preferred if complexity does not improve results.

### Monte Carlo Simulation

Done means:

- Simulation inputs are versioned and traceable to a match model.
- Group and knockout rules are documented and tested.
- Random seed behavior is reproducible for tests.
- Simulation count and stability checks are reported.
- Stage and champion probabilities are validated for plausible ranges.
- Dashboard-facing outputs include model and data metadata.

### Dashboard

Done means:

- UI follows product vision, dashboard structure, and design system direction.
- React components do not contain business logic.
- Route handlers remain thin.
- Prediction displays include uncertainty and model/data context.
- Accessibility and responsive behavior are checked.
- E2E coverage exists for critical user flows when practical.

### QA Automation

Done means:

- Unit, integration, data validation, model validation, and E2E test plans are implemented where relevant.
- Test commands are documented.
- Failures are understandable.
- Critical checks can run locally.
- Automation protects the highest-risk paths first.

### CI/CD

Done means:

- GitHub Actions runs relevant checks on pull requests.
- CI uses pnpm and Python tooling consistently.
- Required checks are documented.
- Secrets are not exposed.
- Deployment or release workflows have a documented rollback or recovery path when applicable.
