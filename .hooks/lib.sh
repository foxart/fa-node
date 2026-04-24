#!/usr/bin/env bash

# lib.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/config.sh"

# ========= COLORS =========
color() {
  local code="$1"
  shift
  printf "\033[%sm%s\033[0m" "$code" "$*"
}

# ========= LOG =========
log_msg() {
  local type="$1"
  shift
  local text="$*"
  local label color_code
  case "$type" in
  log)
    label="LOG"
    color_code="32"
    ;; # зелёный
  err)
    label="ERR"
    color_code="31"
    ;; # красный
  warn)
    label="WARN"
    color_code="33"
    ;; # жёлтый
  dbg)
    label="DBG"
    color_code="90"
    ;; # серый
  path)
    color 36 "$text"
    return
    ;;
  meta)
    if [[ "$text" =~ ^([0-9]+)/([0-9]+)$ ]]; then
      local done="${BASH_REMATCH[1]}"
      local total="${BASH_REMATCH[2]}"
      if [[ "$done" -eq "$total" ]]; then
        color 32 "($done/$total)"
      else
        color 33 "($done/$total)"
      fi
    else
      color 90 "($text)"
    fi
    return
    ;;
  esac
  printf "%s %s\n" "$(color "$color_code" "[$label]")" "$text"
}

# ========= SHORTCUTS =========
log() { log_msg log "$*"; }
err() { log_msg err "$*"; }
warn() { log_msg warn "$*"; }
debug() {
  if [ "$HOOKS_DEBUG" = "true" ]; then
    log_msg dbg "$*"
  fi
}
path() { log_msg path "$*"; }
meta() { log_msg meta "$*"; }

# ========= EXEC =========
run() {
  if [ "$HOOKS_DRY_RUN" = "true" ]; then
    log "dry-run: $(path "$1") ${*:2}"
    return 0
  fi
  debug "run: $(path "$1") ${*:2}"
  "$@"
}

# ========= GIT HELPERS =========
staged_files() {
  git diff --cached --name-only --diff-filter=ACM
}
filter_files() {
  local pattern="$1"
  grep -E "$pattern" || true
}
should_skip() {
  [ "${SKIP_HOOKS:-}" = "true" ]
}
skip_if_requested() {
  if should_skip; then
    log "skipped (SKIP_HOOKS=true)"
    exit 0
  fi
}
