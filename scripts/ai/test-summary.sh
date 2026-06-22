#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  printf 'Usage: %s <command> [args...]\n' "$(basename "$0")" >&2
  exit 64
fi

log_file="$(mktemp "${TMPDIR:-/tmp}/ai-test-summary.XXXXXX")"

set +e
"$@" >"$log_file" 2>&1
exit_code=$?
set -e

line_count="$(wc -l <"$log_file" | tr -d ' ')"
tail_lines=40
if [[ "$line_count" -lt "$tail_lines" ]]; then
  tail_lines="$line_count"
fi

printf 'Command:'
for arg in "$@"; do
  printf ' %q' "$arg"
done
printf '\n'
printf 'Log: %s\n' "$log_file"
printf 'Exit code: %s\n' "$exit_code"
printf 'Output lines: %s\n' "$line_count"
printf '%s\n' '--- tail ---'
if [[ "$tail_lines" -gt 0 ]]; then
  tail -n "$tail_lines" "$log_file"
else
  printf '(no output)\n'
fi
printf '%s\n' '--- end tail ---'

if [[ "$exit_code" -eq 0 ]]; then
  printf 'Summary: PASS\n'
else
  printf 'Summary: FAIL\n'
fi

exit "$exit_code"
