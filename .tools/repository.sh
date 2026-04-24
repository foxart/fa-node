#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/logger.sh"
source "$SCRIPT_DIR/prompt.sh"

selectSshKey() {
  local keys=() options=() f
  for f in "$GIT_SSH_DIR"/*; do
    [[ ! -f "$f" || "$f" == *.pub ]] && continue
    grep -q "PRIVATE KEY" "$f" 2>/dev/null && keys+=("$f")
  done
  ((${#keys[@]} == 0)) && return 1

  local i choice
  for i in "${!keys[@]}"; do
    options+=("$((i + 1))" "$(basename "${keys[i]}")")
  done

  choice=$(promptInteractive "Pick ssh key: " "${options[@]}") || return $?
  echo "${keys[choice - 1]}"
}

isRepositoryArg() {
  local value="$1"
  [[ "$value" == git@*:* || "$value" == ssh://* || "$value" == http://* || "$value" == https://* ]]
}

repositoryClone() {
  local NAME
  NAME=$(loggerFormat "[REPOSITORY]")
  local args=("$@") i repo dst target
  for ((i = 0; i < ${#args[@]}; )); do
    repo="${args[i]}"
    dst=""
    if [[ -n "${args[i + 1]:-}" ]] && ! isRepositoryArg "${args[i + 1]}"; then
      dst="${args[i + 1]}"
      ((i += 2))
    else
      ((i += 1))
    fi
    target="${dst:-$(basename "$repo" .git)}"
    local repoLabel targetLabel
    repoLabel="$(loggerFormat "$repo")"
    targetLabel="$(loggerFormat "$target")"
    if [[ -e "$target" ]]; then
      loggerInfo "$NAME clone: $repoLabel → $targetLabel skipped"
      continue
    fi
    loggerLog "$NAME clone: $repoLabel → $targetLabel started"
    local output cmd=(git clone "$repo")
    [[ -n "$dst" ]] && cmd+=("$dst")
    if output=$("${cmd[@]}" 2>&1); then
      loggerLog "$NAME clone finished: $repoLabel → $targetLabel"
      continue
    fi
    if [[ "$output" != *"Could not read from remote repository"* && "$output" != *"Repository not found"* ]]; then
      loggerError "$NAME clone: $repoLabel → $targetLabel failed"
      continue
    fi
    loggerWarn "$NAME clone: $repoLabel → $targetLabel trying $(loggerFormat "$GIT_SSH_DIR")"
    local key rc
    key=$(selectSshKey)
    rc=$?
    if ((rc == 2)); then
      loggerWarn "$NAME clone: $repoLabel → $targetLabel cancelled"
      continue
    fi
    if ((rc == 1)); then
      loggerError "$NAME clone: $repoLabel → $targetLabel trying $(loggerFormat "$GIT_SSH_DIR") failed"
      continue
    fi
    loggerWarn "$NAME clone: $repoLabel → $targetLabel trying $(loggerFormat "$key")"
    local cmd2=(git -c core.sshCommand="ssh -i $key" clone "$repo")
    [[ -n "$dst" ]] && cmd2+=("$dst")
    if "${cmd2[@]}" >/dev/null 2>&1; then
      loggerLog "$NAME clone: $repoLabel → $targetLabel finished"
    else
      loggerError "$NAME clone: $repoLabel → $targetLabel failed"
    fi
  done
}
