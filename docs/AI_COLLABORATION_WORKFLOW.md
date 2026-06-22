# AI Collaboration Workflow

This document defines how Codex CLI and Claude Code should collaborate in this repository to complete work efficiently and minimize token usage.

## Tool Roles

| Tool | Best For | Avoid Using For |
| --- | --- | --- |
| Claude Code | Structured docs, design reviews, multi-file edits, phase planning | Iterative shell tasks, running scripts, debugging REPL output |
| Codex CLI | Shell-first tasks, iterative code changes, script execution, test fixing | Large multi-file documentation rewrites, architecture planning |

When the task is unclear, Claude Code is the safer default because it reads the project context before acting.

## Required Reading

Shared repository startup rules live in `AGENTS.md`.
Claude-specific additions live in `CLAUDE.md`.
Task-scoped selective reading lives in `docs/ai/TASK_CONTEXT_MANIFEST.md`.

Use those files together instead of repeating reading rules in every prompt.

## Git Responsibilities

The user handles all git operations. AI tools do not run:

- `git checkout`
- `git pull`
- `git branch`
- `git merge`
- `git rebase`
- `git commit`
- `git push`

AI tools may run read-only git commands required by the current phase, including merge-verification checks defined in `AGENTS.md`.

## Checks

Run only the checks required by the current phase.

For documentation-only phases:

```bash
git diff --check
```

For implementation phases, follow the checks listed in `docs/GIT_WORKFLOW.md`. Do not run the full test suite unless the task requires it.

## Handoff Format

The required session handoff block is defined in `CLAUDE.md`.
This workflow document treats that format as the single source of truth.

## Scope Rules

- Do not refactor files outside the current task's scope.
- Do not fix unrelated style or formatting issues.
- Do not add features that belong to a future phase.
- If a related file needs a small update to stay consistent, document the intent in the handoff notes and let the user decide whether to include it.

## Token and Credit Efficiency

- Start from the required startup files in `AGENTS.md` and `CLAUDE.md`.
- Use `docs/ai/TASK_CONTEXT_MANIFEST.md` to keep task context minimal.
- Avoid uploading entire packages or test suites unless the task requires cross-file analysis.
- Reference file paths instead of quoting large blocks of existing code in prompts.
- See `docs/PROMPTING_GUIDELINES.md` for prompt patterns and examples.
