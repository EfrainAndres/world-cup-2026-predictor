# Claude Code Instructions

These instructions apply to Claude Code sessions working in this repository.

## Required Reading

Before making any changes, always read these files in order:

1. `PROJECT_BRIEF.md`
2. `AGENTS.md`
3. `CLAUDE.md` (this file)
4. `docs/ROADMAP.md`

Then read **only** the documents relevant to the current phase or task. Do not scan the full repository.
Use `docs/ai/TASK_CONTEXT_MANIFEST.md` to keep the read set minimal. For phase-specific work, also read the files listed in the relevant section of `AGENTS.md`.

## Working Rules

- Do not change application code, install dependencies, or create UI, API, or model logic unless the task explicitly requires it.
- Do not refactor files unrelated to the current task.
- Before starting a new phase, follow the merge-verification workflow defined in `AGENTS.md`.
- Do not run `git checkout`, `git pull`, `git commit`, `git push`, `git branch`, or `git merge` — the user handles all git operations.
- Keep each change focused on the requested phase or task.
- Run only the checks required by the current phase.
- Do not touch files outside the scope of the current task.

## Git Responsibility Split

| Action | Responsible Party |
| --- | --- |
| `git checkout` / `git pull` / branch creation | User |
| `git add` / `git commit` / `git push` | User |
| Pull request creation | User |
| Editing files within scope | Claude Code |
| Running phase-required checks | Claude Code |
| Reviewing output and merging | User |

## Checks

For documentation-only phases, run:

```bash
git diff --check
```

For implementation phases, run only the checks defined for that phase in `docs/GIT_WORKFLOW.md`. Do not run the full test suite unless the task explicitly requires it.

## Session Handoff Format

At the end of every session, output a handoff block:

```
## Session Handoff

Phase: <phase name and number>
Status: <in progress | complete | blocked>

Files changed:
- <relative/path/to/file>: <one-line summary of what changed>

Checks run:
- <command>: <result>

Notes for next session:
- <anything the next session must know before starting>
```

This handoff is required before closing a session so that Codex or another Claude Code session can continue without rereading the full conversation.

## Collaboration with Codex

- Codex CLI handles shell-first, iterative implementation tasks.
- Claude Code handles structured documentation, planning, design reviews, and multi-file changes.
- Both tools read the same required startup files and then narrow context using `docs/ai/TASK_CONTEXT_MANIFEST.md`.

See `docs/AI_COLLABORATION_WORKFLOW.md` for the full handoff protocol.
See `docs/PROMPTING_GUIDELINES.md` for token-efficient prompt patterns and examples.
