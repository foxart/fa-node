#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/logger.sh"

HOOKS_NAME="$(loggerFormat "[HOOKS]")"
HOOKS_DIR=".git-hooks"

make_executable() {
  local file="$1"
  if [[ -x "$file" ]]; then
    return 0
  fi
  if ! chmod +x "$file" 2>/dev/null; then
    loggerWarn "$HOOKS_NAME chmod: $(loggerFormat "$file") failed"
    return 1
  fi
  loggerLog "$HOOKS_NAME chmod: $(loggerFormat "$file") finished"
}

shell_quote() {
  printf '%q' "$1"
}

create_shim() {
  local hook="$1"
  local target="$SCRIPT_DIR/$HOOKS_DIR/$hook"
  local quoted_target
  quoted_target="$(shell_quote "$target")"
  local shim="$PARENT_DIR/$GIT_HOOKS_DIR/$hook"
  if [[ ! -f "$target" ]]; then
    loggerInfo "$HOOKS_NAME install: $(loggerFormat "$hook") skipped"
    return 0
  fi
  if ! make_executable "$target"; then
    loggerWarn "$HOOKS_NAME install: $(loggerFormat "$hook") trying bash"
  fi
  if ! cat >"$shim" <<EOF; then
#!/usr/bin/env bash
if [ -x $quoted_target ]; then
  exec $quoted_target "\$@"
else
  exec bash $quoted_target "\$@"
fi
EOF
    loggerError "$HOOKS_NAME write: $(loggerFormat "$shim") failed"
    return 1
  fi
  if ! chmod +x "$shim"; then
    loggerError "$HOOKS_NAME chmod: $(loggerFormat "$shim") failed"
    return 1
  fi
  loggerLog "$HOOKS_NAME install: $(loggerFormat "$hook") finished"
}

main() {
  mkdir -p "$PARENT_DIR/$GIT_HOOKS_DIR"
  for hook_file in "$SCRIPT_DIR/$HOOKS_DIR"/*; do
    [[ -f "$hook_file" ]] || continue
    create_shim "$(basename "$hook_file")"
  done
}

main "$@"
