# AI Token Efficiency Comparison 02

## Experiment Objective

Define a repeated-task measurement that compares a traditional workflow with the optimized native workflow introduced in Phases 12.T1 and 12.T2.

This document sets up the comparison. It does not fabricate token counts or claim a measured reduction without two independent executions.

## Controlled Task

Verify that every AI workflow document references the current task-context manifest and that no broken relative links exist between the AI workflow documents.

Only small documentation reference fixes are allowed:

- broken relative links
- missing references to `TASK_CONTEXT_MANIFEST.md`
- clearly duplicated one-line references
- formatting inconsistencies directly related to those references

## Variables Held Constant

- same controlled task
- same branch type
- same repository state before each run
- same model and reasoning level when compared in a single tool
- same validation scope
- same acceptance criteria

## Run A Workflow

Traditional workflow:

- broader reading list
- normal git output
- direct validation output
- no context-summary helper
- no selective manifest guidance

## Run B Workflow

Optimized workflow:

- `docs/ai/TASK_CONTEXT_MANIFEST.md`
- targeted `rg` searches
- `scripts/ai/git-summary.sh`
- `scripts/ai/context-summary.sh`
- concise `[Unreleased]` extraction
- limited final reporting

## Measurement Table

| Field | Run A | Run B |
| --- | --- | --- |
| Tool | not available in this session | not available in this session |
| Model | not available in this session | not available in this session |
| Reasoning level | not available in this session | not available in this session |
| Starting usage | not available in this session | not available in this session |
| Ending usage | not available in this session | not available in this session |
| Files opened | not available in this session | not available in this session |
| Searches executed | not available in this session | not available in this session |
| Commands executed | not available in this session | not available in this session |
| Output size category | not available in this session | not available in this session |
| Retries | not available in this session | not available in this session |
| Failed commands | not available in this session | not available in this session |
| Duration | not available in this session | not available in this session |
| Changes made | not available in this session | not available in this session |
| Validation result | not available in this session | not available in this session |
| Completion quality | not available in this session | not available in this session |

## Result Interpretation Rules

- Compare only runs that use the same tool, model, reasoning level, and controlled task.
- Treat percentages and token counts as tool-specific, not cross-tool equivalent.
- Prefer output reductions that still preserve correctness and validation clarity.
- Do not claim a win from one run alone.

## Quality Checks

- verify manifest references exist
- verify workflow docs do not duplicate full merge-verification text
- verify scripts exist and are executable
- verify `git diff --check` stays clean

## Limitations

- no exact token telemetry was available here
- the comparison must be repeated in separate sessions for a real before/after result
- the controlled task is documentation-only, so it measures workflow overhead rather than product code complexity

## External-Tool Decision Gate

Recommend an external-tool pilot only when at least one of these is true:

1. the optimized workflow still consumes excessive context
2. agents repeatedly ignore selective-reading rules
3. exact token telemetry is needed and an evaluated tool can supply it
4. native scripts do not control output sufficiently
5. the expected benefit exceeds installation, privacy, and maintenance risk

Otherwise continue with native optimization.
