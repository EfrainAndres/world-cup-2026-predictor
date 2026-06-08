# Release Strategy

This document defines how the project should name, prepare, and publish releases.

## Release Naming

Use simple release names tied to meaningful project outcomes:

| Release Type | Example | Meaning |
| --- | --- | --- |
| Foundation | `foundation-v0.1` | Documentation and planning foundation. |
| MVP milestone | `data-pipeline-mvp-v0.2` | A reviewable implementation milestone. |
| Portfolio release | `portfolio-v1.0` | Polished project release for sharing. |

Release names should be understandable without knowing internal branch names.

## Versioning Approach

Use lightweight semantic versioning once implementation begins:

- `0.x` for pre-MVP and milestone releases.
- `1.0` for the first polished portfolio release.
- Patch versions for fixes that do not change product scope.

Documentation-only foundations can be tagged when they represent a meaningful review point, but tagging every documentation branch is not required.

## Changelog Rules

`CHANGELOG.md` should:

- Keep notable changes under `[Unreleased]` until a release is tagged.
- Group changes by type when the project becomes larger.
- Mention new data/model/dashboard/QA capabilities.
- Avoid noisy entries for tiny typo fixes.
- Link releases to tags when release tagging begins.

## When To Tag Releases

Tag a release when:

- A milestone is complete.
- The repo is clean.
- Relevant checks pass.
- Documentation matches the implemented behavior.
- Release notes are ready.
- The release is useful for review, demo, or rollback.

Do not tag when:

- Work is only partially complete.
- Important validation is missing.
- The dashboard shows unsupported predictions.
- Known critical defects are unresolved.

## MVP Release Criteria

The first MVP release should include:

- Validated data pipeline.
- Elo baseline or documented model baseline.
- Backtest report.
- Data quality/status output.
- Dashboard view for match predictions.
- Clear uncertainty and model explanation.
- Repeatable local commands.
- Relevant automated checks.

## Pre-Release Checklist

Before tagging or announcing a release:

- `git status` is clean.
- Changelog is updated.
- README reflects current setup and usage.
- Relevant docs are current.
- Tests and validation checks pass.
- Model reports include data cutoff and version.
- No secrets or private data are committed.
- No unlicensed data is redistributed.
- Dashboard screenshots or demo notes are current for portfolio releases.

## Release Notes Expectations

Release notes should include:

- Short summary.
- Key features or docs added.
- Validation and checks run.
- Known limitations.
- Upgrade or setup notes when needed.
- Links to important docs, reports, or demo pages.

## What Should Not Be Released

Do not release:

- Predictions without model validation context.
- Data without confirmed usage rights.
- Code that requires undocumented setup.
- Broken or misleading dashboard views.
- Secrets, tokens, or private configuration.
- Placeholder code that will be deleted.
- Large raw data files unless storage and licensing are intentional.
