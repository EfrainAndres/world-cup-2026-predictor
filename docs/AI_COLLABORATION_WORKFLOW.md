# AI Collaboration Workflow

This document defines how Codex CLI and Claude Code should collaborate in this repository to complete work efficiently and minimize token usage.

## Tool Roles

| Tool | Best For | Avoid Using For |
| --- | --- | --- |
| Claude Code | Structured docs, design reviews, multi-file edits, phase planning | Iterative shell tasks, running scripts, debugging REPL output |
| Codex CLI | Shell-first tasks, iterative code changes, script execution, test fixing | Large multi-file documentation rewrites, architecture planning |

When the task is unclear, Claude Code is the safer default because it reads the project context before acting.

## Required Reading (Both Tools)

Every session, regardless of tool, must start by reading:

1. `PROJECT_BRIEF.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `docs/ROADMAP.md`

After reading these four files, read only the documents relevant to the current phase. Do not scan the full repository unless the task explicitly requires it.

## Phase-Scoped Reading

Use the following guide to limit reads to what the current task needs:

| Task Type | Additional Files to Read |
| --- | --- |
| Architecture or structure changes | `docs/ARCHITECTURE.md`, relevant `docs/adr/` files |
| Implementation or standards | `docs/TECH_STACK.md`, `docs/CODING_STANDARDS.md` |
| Dashboard or UI work | `docs/PRODUCT_VISION.md`, `docs/DASHBOARD_STRUCTURE.md` |
| Data or modeling work | `docs/DATA_SOURCES.md`, `docs/MODEL_ROADMAP.md`, `docs/MODEL_VALIDATION.md` |
| Delivery or milestone work | `docs/DEFINITION_OF_DONE.md`, `docs/MILESTONES.md`, `docs/RELEASE_STRATEGY.md` |

Do not read files from other categories unless the task spans multiple domains.

## Git Responsibilities

The user handles all git operations. AI tools do not run:

- `git checkout`
- `git pull`
- `git branch`
- `git merge`
- `git rebase`
- `git commit`
- `git push`

AI tools may run read-only git commands such as `git status --short` and `git diff --check` when required by the current phase.

## Checks

Run only the checks required by the current phase.

For documentation-only phases:

```bash
git diff --check
```

For implementation phases, follow the checks listed in `docs/GIT_WORKFLOW.md`. Do not run the full test suite unless the task requires it.

## Handoff Format

Use the following block at the end of every session. Paste it into the next session prompt or into the PR description.

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

### Handoff Example (Documentation Phase)

```
## Session Handoff

Phase: 0.8 AI Collaboration Workflow
Status: complete

Files changed:
- CLAUDE.md: added Claude Code instructions and handoff format
- docs/AI_COLLABORATION_WORKFLOW.md: defined tool roles, handoff protocol, checks
- docs/PROMPTING_GUIDELINES.md: added low-token prompt patterns and examples
- AGENTS.md: added Claude Code collaboration section
- CHANGELOG.md: added AI collaboration workflow entry
- docs/ROADMAP.md: added Phase 0.8 AI Collaboration Workflow

Checks run:
- git diff --check: clean

Notes for next session:
- No application code changed. Commit all six files together.
```

### Handoff Example (Implementation Phase)

```
## Session Handoff

Phase: 5.4 API Server Adapter
Status: in progress

Files changed:
- packages/api/src/server.ts: added thin Fastify adapter delegating to runtime
- packages/api/src/server.test.ts: added adapter smoke tests

Checks run:
- pnpm test --filter api: 12 passed, 0 failed
- git diff --check: clean

Notes for next session:
- Error mapping for 422 responses is not yet implemented.
- Do not add prediction logic to the server adapter.
```

## Scope Rules

- Do not refactor files outside the current task's scope.
- Do not fix unrelated style or formatting issues.
- Do not add features that belong to a future phase.
- If a related file needs a small update to stay consistent, document the intent in the handoff notes and let the user decide whether to include it.

## Token and Credit Efficiency

- Start from the four required files and stop reading when the task is understood.
- Use phase-scoped prompts with the smallest context that answers the question.
- Avoid uploading entire packages or test suites unless the task requires cross-file analysis.
- Reference file paths instead of quoting large blocks of existing code in prompts.
- See `docs/PROMPTING_GUIDELINES.md` for prompt patterns and examples.
