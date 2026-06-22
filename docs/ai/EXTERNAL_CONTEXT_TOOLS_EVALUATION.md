# External Context Tools Evaluation

Phase 12.T1 does not install any external context-optimization tool.

The evaluation order is fixed:

1. native repository optimizations
2. measure again
3. evaluate one external tool
4. controlled `context-mode` pilot last

## Evaluation Backlog

| Tool | Intended benefit | Integration surface | Security / privacy concerns | Maintenance risk | Compatibility questions | Measurement required | Pilot acceptance criteria | Rollback approach |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tokscale` | Reduce unnecessary prompt size through context budgeting or summarization support | local developer workflow, prompt construction, possibly wrapper scripts | may process repository text outside current native workflow expectations; review data-handling model first | medium; extra toolchain to maintain | works on macOS, shell-first workflow, and both Codex/Claude prompts without changing production repo behavior? | compare same task before/after with unchanged acceptance criteria | lower output/context overhead without harming completion quality or adding hidden prompt mutation risk | remove tool from workflow docs and revert any helper references |
| `agents-md` | Generate or enforce agent instruction structure more systematically | repository instruction files such as `AGENTS.md` or generated overlays | could normalize instructions in a way that obscures repository-specific constraints | medium | does it preserve local wording, merge-verification rules, and Claude/Codex boundary docs cleanly? | compare instruction-maintenance effort and session clarity, not only token use | demonstrably reduces duplication without weakening safety or scope controls | keep handwritten docs as source of truth and drop generated flow |
| `context-mode` | Dynamically constrain context or file-loading based on task | session startup workflow, task routing, possibly editor/CLI integration | highest risk of hidden context omission or overly aggressive filtering | high | does it work predictably with this repository’s phase-based workflow, shell-driven tasks, and App/API split? | must be tested only after native baseline and one-tool external pilot | pilot must show lower context load with no missed required files and no increase in failed iterations | disable pilot immediately and revert to manifest-based manual selection |

## Pilot Rules

- evaluate one external tool at a time
- do not combine multiple optimization systems in one comparison
- keep the same task, branch type, and validation scope when measuring
- prefer documentation or workflow-only pilot tasks first

## Deferred Until After Native Re-Measurement

No external tool should be piloted until:

1. the native scripts and manifest are in normal use
2. at least one controlled before/after comparison has been recorded
3. the remaining pain point is still clear
