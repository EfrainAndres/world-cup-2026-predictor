# Agent Instructions

These instructions apply to future Codex sessions working in this repository.

## Required Reading

Before making changes, always read:

1. `PROJECT_BRIEF.md`
2. `AGENTS.md`
3. Any relevant document under `docs/`
4. Existing code and tests related to the requested change, when code exists

Use those files as the project context before planning or editing.

## Working Rules

- Check `git status` before editing.
- Confirm the current branch before editing.
- Do not overwrite unrelated local changes.
- Keep each change focused on the requested task.
- Do not install dependencies unless the task explicitly requires it.
- Do not create application logic during documentation-only phases.
- Prefer simple, explainable architecture over premature complexity.
- Update documentation when decisions, commands, assumptions, or workflows change.

## Documentation Standards

- Keep documents beginner-friendly but professional.
- Explain why decisions matter, not only what they are.
- Prefer small focused files over one large document.
- Use Markdown tables where they improve scanning.
- Use Mermaid diagrams only when they clarify architecture or flow.

## Modeling Standards

When modeling work begins:

- Start with a transparent baseline before advanced models.
- Track assumptions, feature definitions, and data cutoffs.
- Evaluate models with backtests and proper scoring metrics.
- Report uncertainty and limitations clearly.
- Never present predictions as guarantees.

## QA Standards

Future changes should consider:

- Unit tests for deterministic logic.
- Integration tests for data and modeling pipelines.
- Data validation checks for schema, freshness, duplicates, and ranges.
- Model validation checks for backtesting, calibration, and scoring.
- E2E tests for future dashboard workflows.

## Git Standards

- Use focused branches after the initial repository foundation commit.
- Stage only files related to the current task.
- Use descriptive conventional commits, such as `docs: add project foundation`.
- Push completed branches to `origin` when a remote exists.

## Phase Discipline

Respect the roadmap in `docs/ROADMAP.md`.

Do not jump ahead by creating app scaffolding, installing dependencies, or implementing models during phases that are meant to define foundation, architecture, or research.
