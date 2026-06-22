#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

branch="$(git branch --show-current 2>/dev/null || printf 'unknown')"
status_output="$(git status --short 2>/dev/null || true)"

printf 'Branch: %s\n' "$branch"

if [[ -z "$status_output" ]]; then
  printf 'Status: clean\n'
else
  changed_count="$(printf '%s\n' "$status_output" | sed '/^$/d' | wc -l | tr -d ' ')"
  printf 'Status: %s changed path(s)\n' "$changed_count"
  printf '%s\n' "$status_output"
fi

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  divergence="$(git rev-list --left-right --count origin/main...HEAD 2>/dev/null || printf 'unknown\tunknown')"
  ahead="$(printf '%s' "$divergence" | awk '{print $2}')"
  behind="$(printf '%s' "$divergence" | awk '{print $1}')"
  printf 'Divergence vs origin/main: ahead=%s behind=%s\n' "$ahead" "$behind"
else
  printf 'Divergence vs origin/main: unavailable (origin/main not present locally)\n'
fi

printf 'Latest commits:\n'
git log --oneline --decorate -5 2>/dev/null || true

printf 'Changed-file summary:\n'
if [[ -z "$status_output" ]]; then
  printf '(none)\n'
else
  printf '%s\n' "$status_output" | awk '{print $2}'
fi
