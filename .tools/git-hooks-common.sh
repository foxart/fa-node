#!/usr/bin/env bash

readonly STAGED_CODE_DIFF_FILTER="ACM"
readonly -a STAGED_CODE_FILE_PATTERNS=("*.ts" "*.js")
readonly PUSHED_CODE_DIFF_FILTER="ADM"

skip_git_hook_if_requested() {
  local name="$1"
  if [[ "${GIT_HOOKS_SKIP:-}" == "true" ]]; then
    loggerWarn "$name skip: $(loggerFormat "$GIT_HOOKS_SKIP")"
    exit 0
  fi
}

get_staged_code_files() {
  git diff --cached --name-only --diff-filter="$STAGED_CODE_DIFF_FILTER" -- "${STAGED_CODE_FILE_PATTERNS[@]}"
}

get_changed_code_files() {
  git log --format= --name-only --diff-filter="$PUSHED_CODE_DIFF_FILTER" "$@" -- "${STAGED_CODE_FILE_PATTERNS[@]}"
}
