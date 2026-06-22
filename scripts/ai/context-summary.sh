#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

branch="$(git branch --show-current 2>/dev/null || printf 'unknown')"
phase="unmapped"
if [[ "$branch" == *"phase-"* ]]; then
  phase="${branch#*phase-}"
fi

status_output="$(git status --short 2>/dev/null || true)"
changed_paths="$(printf '%s\n' "$status_output" | awk 'NF {print $2}')"

printf 'Branch: %s\n' "$branch"
printf 'Phase hint: %s\n' "$phase"

printf 'Changed files:\n'
if [[ -z "$changed_paths" ]]; then
  printf '(none)\n'
else
  printf '%s\n' "$changed_paths"
fi

printf 'Relevant docs:\n'
printf '%s\n' \
  "PROJECT_BRIEF.md" \
  "AGENTS.md" \
  "CLAUDE.md" \
  "docs/ROADMAP.md" \
  "docs/AI_COLLABORATION_WORKFLOW.md" \
  "docs/PROMPTING_GUIDELINES.md" \
  "docs/ai/TASK_CONTEXT_MANIFEST.md"

boundaries=""
add_boundary() {
  local value="$1"
  case " $boundaries " in
    *" $value "*) ;;
    *)
      if [[ -z "$boundaries" ]]; then
        boundaries="$value"
      else
        boundaries="$boundaries"$'\n'"$value"
      fi
      ;;
  esac
}

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  case "$path" in
    apps/web/*) add_boundary "apps/web" ;;
    packages/api/*) add_boundary "packages/api" ;;
    packages/model/*) add_boundary "packages/model" ;;
    packages/data/*) add_boundary "packages/data" ;;
    docs/*|AGENTS.md|CLAUDE.md|PROJECT_BRIEF.md|CHANGELOG.md) add_boundary "docs/workflow" ;;
    scripts/*) add_boundary "scripts" ;;
    *) add_boundary "root/other" ;;
  esac
done <<< "$changed_paths"

printf 'Affected boundaries:\n'
if [[ -z "$boundaries" ]]; then
  printf '(none)\n'
else
  printf '%s\n' "$boundaries" | sort
fi

printf 'Suggested targeted checks:\n'
if [[ -z "$boundaries" ]]; then
  printf 'git diff --check\n'
else
  if printf '%s\n' "$boundaries" | grep -qx 'docs/workflow' || printf '%s\n' "$boundaries" | grep -qx 'scripts'; then
    printf 'git diff --check\n'
  fi
  if printf '%s\n' "$boundaries" | grep -qx 'packages/api'; then
    printf 'pnpm --filter @world-cup-2026-predictor/api test\n'
    printf 'pnpm --filter @world-cup-2026-predictor/api typecheck\n'
  fi
  if printf '%s\n' "$boundaries" | grep -qx 'packages/model'; then
    printf 'pnpm --filter @world-cup-2026-predictor/model test\n'
  fi
  if printf '%s\n' "$boundaries" | grep -qx 'packages/data'; then
    printf 'pnpm --filter @world-cup-2026-predictor/data test\n'
  fi
  if printf '%s\n' "$boundaries" | grep -qx 'apps/web'; then
    printf 'pnpm --filter @world-cup-2026-predictor/web test\n'
    printf 'pnpm --filter @world-cup-2026-predictor/web typecheck\n'
  fi
fi
