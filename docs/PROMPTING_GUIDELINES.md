# Prompting Guidelines

This document defines how to write efficient prompts for Codex CLI and Claude Code sessions in this repository. The goal is to get accurate, focused results while minimizing token usage and credit cost.

Operational rules such as required startup files, merge verification, and session handoff format live in `AGENTS.md`, `CLAUDE.md`, and `docs/AI_COLLABORATION_WORKFLOW.md`. This document focuses on prompt construction only.

## Core Principles

- **Phase-scope every prompt.** State the phase name and number at the start.
- **Reference files, do not paste them.** Say "read `docs/ROADMAP.md`" rather than quoting its content.
- **State what is out of scope.** Explicitly naming what not to do prevents drift.
- **One task per session.** Mixing tasks inflates context and produces unfocused output.
- **Keep prompts under 200 words** for single-file or single-concept tasks.

## Prompt Structure

Use this structure for any session:

```
Phase: <phase name and number>
Task: <one-sentence description of what to do>

Read: <comma-separated list of files to read first>
Scope: <what is in scope>
Out of scope: <what to leave untouched>
Output: <what to produce or return>
```

Prefer the smallest task-specific file list that satisfies `docs/ai/TASK_CONTEXT_MANIFEST.md`.

## Low-Token Prompt Examples

### Documentation task

```
Phase: 0.8 AI Collaboration Workflow
Task: Create docs/PROMPTING_GUIDELINES.md with low-token prompt patterns and examples.

Read: PROJECT_BRIEF.md, AGENTS.md, CLAUDE.md, docs/ROADMAP.md
Scope: docs/PROMPTING_GUIDELINES.md only
Out of scope: application code, tests, other docs
Output: the new file and a session handoff block
```

### Single-file implementation task

```
Phase: 5.4 API Server Adapter
Task: Add a thin Fastify adapter in packages/api/src/server.ts that delegates all routes
to the existing runtime adapter.

Read: PROJECT_BRIEF.md, AGENTS.md, CLAUDE.md, docs/ROADMAP.md,
      packages/api/src/runtime.ts, packages/api/src/routes.ts
Scope: packages/api/src/server.ts and its test file
Out of scope: runtime adapter, pure handlers, dashboard, model logic
Output: server.ts, server.test.ts, session handoff block
```

### Bug fix task

```
Phase: 5.1 API Integration Validation
Task: Fix the failing test in packages/api/src/handlers/match-simulation.test.ts.
      The test at line 42 expects status 422 but gets 200.

Read: PROJECT_BRIEF.md, AGENTS.md, CLAUDE.md, docs/ROADMAP.md,
      packages/api/src/handlers/match-simulation.ts,
      packages/api/src/handlers/match-simulation.test.ts
Scope: the handler and its test only
Out of scope: other handlers, dashboard, model logic
Output: corrected files, check result, session handoff block
```

### Documentation update task

```
Phase: ongoing
Task: Update docs/ROADMAP.md to mark Phase 4.0P as Done.

Read: PROJECT_BRIEF.md, AGENTS.md, CLAUDE.md, docs/ROADMAP.md
Scope: the status column for Phase 4.0P only
Out of scope: all other phases, application code
Output: updated file, session handoff block
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Wastes Tokens | Better Approach |
| --- | --- | --- |
| "Read the whole repo first" | Loads thousands of lines of irrelevant context | List only the files needed for this task |
| Pasting file contents into the prompt | Duplicates context already in the file | Reference the path and say "read it" |
| "Also clean up the formatting" | Expands scope unexpectedly | Separate cleanup into its own session |
| "Fix anything else you see" | Invites unbounded refactoring | Be explicit about out-of-scope files |
| Asking for explanations and changes in one prompt | Forces a long reasoning pass before acting | Ask for explanation first, then act in a follow-up |
| "Update all related docs" | Unclear scope, triggers wide reads | Name the specific docs to update |

## Checks Reminder

Include the check command in the prompt when the task requires verification:

```
After editing, run: git diff --check
Return: files changed and the check result
```

For implementation phases, specify only the required check:

```
After editing, run: pnpm test --filter api
Return: files changed and test result
```

Do not ask the tool to run the full test suite unless the task explicitly needs it.

## Keeping Context Small Between Sessions

- Use the session handoff block from `docs/AI_COLLABORATION_WORKFLOW.md` to carry state.
- Paste only the handoff block into the next session prompt, not the full previous conversation.
- If a session grows long, end it, commit the work, and start a fresh session with the handoff block.
