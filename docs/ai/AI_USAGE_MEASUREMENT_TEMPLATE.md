# AI Usage Measurement Template

Use this template to compare context usage before and after repository-native optimizations.

Do not assume Codex CLI usage percentages and Claude Code usage percentages are directly equivalent.

## Manual Session Log Template

| Field | Value |
| --- | --- |
| Date |  |
| Tool | Codex CLI / Claude Code CLI |
| Model |  |
| Reasoning level |  |
| Task type | API-only / web UI / docs-only / model-only / cross-package / other |
| Branch |  |
| Starting usage percentage or reported token usage |  |
| Ending usage percentage or reported token usage |  |
| Wall-clock duration |  |
| Completion quality | complete / partial / blocked |
| Output size category | small / medium / large |
| Retries or failed attempts |  |
| Notes |  |

## Files Read

```text
- PROJECT_BRIEF.md
- AGENTS.md
- ...
```

## Commands Executed

```text
- git status --short --branch
- scripts/ai/git-summary.sh
- ...
```

## Tests Executed

```text
- pnpm --filter @world-cup-2026-predictor/api test
- git diff --check
```

## Comparison Notes

Record:

- whether the context manifest was followed
- whether compact helper scripts were used
- whether large command output caused retries or rereads
- whether the result quality changed

## Optional CSV Header

```csv
date,tool,model,reasoning_level,task_type,branch,start_usage,end_usage,files_read_count,commands_executed_count,retries_failed_attempts,tests_executed,wall_clock_duration,output_size_category,completion_quality,notes
```
