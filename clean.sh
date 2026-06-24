#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/.tools/logger.sh"

NAME="$(loggerFormat "[CLEAN]")"
PROTECTED_BRANCHES="${CLEAN_PROTECTED_BRANCHES:-main master develop dev}"

tmp_files=()

cleanup() {
  local f
  for f in "${tmp_files[@]}"; do
    [[ -n "$f" ]] && rm -f "$f"
  done
}
trap cleanup EXIT

require_git_repository() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    loggerError "$NAME git: not inside work tree"
    exit 1
  fi
}

is_protected_branch() {
  local branch="$1"
  local protected
  for protected in $PROTECTED_BRANCHES; do
    [[ "$branch" == "$protected" ]] && return 0
  done
  return 1
}

prune_ignored_cached_files() {
  local tmp f count
  tmp="$(mktemp)"
  tmp_files+=("$tmp")

  git ls-files --ignored --exclude-standard --cached -z >"$tmp"

  count=0
  while IFS= read -r -d '' f; do
    [[ -z "$f" ]] && continue
    loggerInfo "$NAME ignored: $(loggerFormat "$f") pruned"
    git update-index --force-remove -- "$f"
    count=$((count + 1))
  done <"$tmp"

  if ((count == 0)); then
    loggerInfo "$NAME ignored: skipped"
  else
    loggerLog "$NAME ignored: pruned $(loggerFormat "$count") files"
  fi
}

delete_local_branches_without_origin() {
  local current branch deleted skipped protected

  current="$(git rev-parse --abbrev-ref HEAD)"
  deleted=0
  skipped=0
  protected=0

  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue

    if [[ "$branch" == "$current" ]]; then
      loggerInfo "$NAME branch: current $(loggerFormat "$branch") skipped"
      protected=$((protected + 1))
      continue
    fi

    if is_protected_branch "$branch"; then
      loggerInfo "$NAME branch: protected $(loggerFormat "$branch") skipped"
      protected=$((protected + 1))
      continue
    fi

    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
      continue
    fi

    if git branch -d -- "$branch" >/dev/null 2>&1; then
      loggerInfo "$NAME branch: $(loggerFormat "$branch") deleted"
      deleted=$((deleted + 1))
    else
      loggerWarn "$NAME branch: $(loggerFormat "$branch") skipped, not fully merged"
      skipped=$((skipped + 1))
    fi
  done < <(git for-each-ref --format='%(refname:short)' refs/heads)

  loggerLog "$NAME branches: deleted=$(loggerFormat "$deleted") skipped=$(loggerFormat "$skipped") protected=$(loggerFormat "$protected")"
}

main() {
  require_git_repository
  prune_ignored_cached_files
  delete_local_branches_without_origin
}

main "$@"
