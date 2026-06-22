# Controlled Task Run B

Use this as the optimized-workflow comparison run.

```text
Implement the following documentation consistency check.

Task:
Verify that every AI workflow document references the current task-context manifest and that no broken relative links exist between the AI workflow documents.

Read:
- PROJECT_BRIEF.md
- AGENTS.md
- CLAUDE.md
- docs/ROADMAP.md
- docs/ai/TASK_CONTEXT_MANIFEST.md
- docs/ai/AI_USAGE_MEASUREMENT_TEMPLATE.md
- docs/ai/AI_TOKEN_EFFICIENCY_BASELINE.md
- docs/ai/AI_TOKEN_EFFICIENCY_COMPARISON_01.md
- docs/ai/IMPLEMENTATION_PROMPT_TEMPLATE.md

Use:
- targeted `rg` searches
- `scripts/ai/git-summary.sh`
- `scripts/ai/context-summary.sh`
- concise `[Unreleased]` extraction only

Scope:
- Correct only broken relative links, missing references to TASK_CONTEXT_MANIFEST.md, clearly duplicated one-line references, and formatting inconsistencies directly related to those references.

Out of scope:
- product code
- tests
- APIs
- models
- UI
- data
- infrastructure
- dependencies

Validation:
- use compact helper scripts where possible
- record any commands you run
- keep output small

Final report:
1. merge verification
2. files changed
3. commands executed
4. measurements available
5. measurements unavailable
6. limitations
7. whether native optimization appears sufficient
8. suggested commit message

Do not commit, push, merge, or create a pull request.
```
