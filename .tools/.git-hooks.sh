#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=.tools/config.sh
source "$SCRIPT_DIR/config.sh"
# shellcheck source=.tools/logger.sh
source "$SCRIPT_DIR/logger.sh"

HOOKS_NAME="$(loggerFormat "[HOOKS]")"
HOOKS_DIR=".git-hooks"

write_shim() {
  local shim="$1"
  cat >"$shim" <<EOF
#!/usr/bin/env bash
ROOT_DIR="\$(git rev-parse --show-toplevel)"
HOOK_NAME="\$(basename "\$0")"
TARGET="\$ROOT_DIR/.tools/.git-hooks/\$HOOK_NAME"
if [ -x "\$TARGET" ]; then
  exec "\$TARGET" "\$@"
else
  exec bash "\$TARGET" "\$@"
fi
EOF
}

main() {
  local hook hook_file shim
  mkdir -p "$PARENT_DIR/$GIT_HOOKS_DIR"
  for hook_file in "$SCRIPT_DIR/$HOOKS_DIR"/*; do
    [[ -f "$hook_file" ]] || continue
    hook="$(basename "$hook_file")"
    shim="$PARENT_DIR/$GIT_HOOKS_DIR/$hook"
    if ! write_shim "$shim"; then
      loggerError "$HOOKS_NAME write: $(loggerFormat "$shim") failed"
      return 1
    fi
    if ! chmod +x "$shim"; then
      loggerError "$HOOKS_NAME chmod: $(loggerFormat "$shim") failed"
      return 1
    fi
    loggerLog "$HOOKS_NAME shim: $(loggerFormat "$hook") installed"
  done
}

main "$@"
