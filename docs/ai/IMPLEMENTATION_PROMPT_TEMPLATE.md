# Implementation Prompt Template

Use this template as a starting point. Adapt the reading list, scope, and checks to the exact task instead of pasting a universal prompt unchanged.

```text
Implement <phase name and number> — <task name>.

Before changing files:

1. Follow the merge-verification workflow in AGENTS.md and CLAUDE.md.
2. Confirm <previous phase> is merged into origin/main.
3. Stop if the previous phase is not merged.
4. Confirm:
   - current branch is <expected branch name>
   - working tree is clean before edits
   - branch started from the latest origin/main

Read only:

- AGENTS.md
- CLAUDE.md
- PROJECT_BRIEF.md
- docs/ROADMAP.md
- <minimum task-specific files only>

Objective:

<one concise paragraph>

Acceptance criteria:

- <criterion 1>
- <criterion 2>
- <criterion 3>

Out of scope:

- <explicit exclusion 1>
- <explicit exclusion 2>
- <explicit exclusion 3>

Validation:

Run targeted checks first, then only:

- <command 1>
- <command 2>
- git diff --check

Final report:

1. merge verification
2. files changed
3. behavior implemented
4. validation results
5. limitations
6. next phase
7. suggested conventional commit message

Do not commit, push, merge, or create a pull request.
```

## Use Notes

- Keep the read list minimal and task-specific.
- Name the exact branch expected for the phase.
- Specify only the required validation commands.
- Add one or two explicit scope exclusions that block common drift.
