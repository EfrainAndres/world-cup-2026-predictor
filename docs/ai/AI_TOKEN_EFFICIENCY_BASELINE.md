# AI Token Efficiency Baseline

Phase 12.T1 establishes a low-risk baseline for reducing unnecessary context and command output in Codex CLI and Claude Code sessions.

This phase does not change:

- prediction logic
- data sources
- API behavior
- UI behavior
- test business expectations
- production functionality

## Current-State Audit

| Issue | Affected file | Context impact | Proposed correction | Risk |
| --- | --- | --- | --- | --- |
| Required-reading guidance is repeated in multiple places with slightly different wording | `AGENTS.md`, `CLAUDE.md`, `docs/AI_COLLABORATION_WORKFLOW.md` | High | Keep shared repository rules in `AGENTS.md`, Claude-specific additions in `CLAUDE.md`, and move selective file-loading guidance into `docs/ai/TASK_CONTEXT_MANIFEST.md` | Low |
| Git merge-verification workflow is duplicated across shared and Claude-specific docs | `AGENTS.md`, `CLAUDE.md` | Medium | Keep the canonical merge-verification rule in `AGENTS.md`; let `CLAUDE.md` reference it instead of restating it fully | Low |
| Handoff format is described in multiple places | `CLAUDE.md`, `docs/AI_COLLABORATION_WORKFLOW.md` | Medium | Keep the required output format in `CLAUDE.md`; let the workflow doc reference that format and focus on role boundaries | Low |
| Prompting guidance repeats workflow rules that belong in repository docs | `docs/PROMPTING_GUIDELINES.md` | Medium | Keep prompting patterns and examples only; reference `AGENTS.md`, workflow doc, and context manifest for operational rules | Low |
| Broad read directives encourage loading more docs than some tasks need | `AGENTS.md`, `docs/AI_COLLABORATION_WORKFLOW.md` | High | Add task-based context manifest with minimum required files, optional files, and files not read by default | Low |
| Current git/test commands often emit more output than needed for workflow checks | Ad hoc shell usage | High | Add compact `scripts/ai/git-summary.sh` and `scripts/ai/test-summary.sh` wrappers that preserve behavior while shrinking terminal output | Low |
| No shared deterministic context summary exists for cross-package handoff | Ad hoc shell usage | Medium | Add `scripts/ai/context-summary.sh` for branch, changed files, affected package boundaries, and suggested targeted checks | Low |
| Codex vs Claude responsibility split exists, but task-selection guidance is still spread across multiple docs | `CLAUDE.md`, `docs/AI_COLLABORATION_WORKFLOW.md`, `docs/PROMPTING_GUIDELINES.md` | Medium | Keep tool roles in the collaboration workflow, keep Claude-specific operating constraints in `CLAUDE.md`, and remove duplicate “which tool to use” notes elsewhere | Low |

## Baseline Measurement Boundary

Phase 12.T1 defines:

- the measurement method
- one reusable manual template
- repository-native instruction and output optimizations

Phase 12.T1 does not fabricate token counts or usage percentages.

When a session does not expose exact token usage, record:

- reported usage percentage before and after when available
- model
- task type
- files read
- commands executed
- retries
- validation scope
- limitations of the measurement

## Manually Recorded Baseline Example

Exact cross-tool token measurements were not reliably available during this phase.

Baseline comparison is therefore deferred to a controlled follow-up task using:

- the measurement template in `docs/ai/AI_USAGE_MEASUREMENT_TEMPLATE.md`
- the context manifest in `docs/ai/TASK_CONTEXT_MANIFEST.md`
- the compact command helpers in `scripts/ai/`

## Native Optimizations Implemented

1. Selective-reading manifest by task category
2. Reduced duplication across repository instructions
3. Compact git summary helper
4. Compact test-output wrapper with full-log retention
5. Compact deterministic context summary helper
6. Compact implementation prompt template

## Measurement Rules

- Compare sessions by task type, not across unrelated tasks.
- Do not treat Codex CLI usage percentages and Claude Code usage percentages as directly equivalent.
- Record output size and retry count because shell noise often drives unnecessary follow-up context.
- Prefer before/after comparisons on the same branch and phase type.

## Recommended Controlled Comparison Task

Use one small implementation task that is large enough to require:

- merge verification
- 4 to 8 file reads
- one focused edit
- one deterministic validation pass

Suggested candidate:

- documentation-only update with one helper script change and one changelog entry

That comparison should be run twice:

1. before using the new manifest and helper scripts
2. after using the new manifest and helper scripts

## External Tools

External tools are intentionally deferred in this order:

1. native repository optimizations
2. repeat measurement
3. evaluate one external tool
4. controlled `context-mode` pilot last

See `docs/ai/EXTERNAL_CONTEXT_TOOLS_EVALUATION.md`.
