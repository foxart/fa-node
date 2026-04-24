#!/usr/bin/env bash

# init.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

make_executable() {
  local file="$1"
  if [ -x "$file" ]; then
    return 0
  fi
  if ! chmod +x "$file" 2>/dev/null; then
    warn "failed to chmod +x $(path "$file")"
    return 1
  fi
  log "chmod +x $(path "$file")"
}

create_shim() {
  local hook="$1"
  local target="$ROOT_DIR/$HOOKS_DIR/$hook"
  local shim="$ROOT_DIR/$GIT_HOOKS_DIR/$hook"
  if [ ! -f "$target" ]; then
    log "skip $(path "$hook") (not found)"
    return 0
  fi
  if ! make_executable "$target"; then
    warn "fallback to bash for $(path "$hook")"
  fi
  cat > "$shim" <<EOF
#!/usr/bin/env bash
if [ -x "$target" ]; then
  exec "$target" "\$@"
else
  exec bash "$target" "\$@"
fi
EOF
  chmod +x "$shim"
  log "installed $(path "$hook")"
}

install_all() {
  mkdir -p "$ROOT_DIR/$GIT_HOOKS_DIR"
  for hook_file in "$ROOT_DIR/$HOOKS_DIR"/*; do
    create_shim "$(basename "$hook_file")"
  done
}

cleanup_cache() {
  if [ "${HOOKS_CLEAN_IGNORED_CACHE:-false}" != "true" ]; then
    return
  fi
  log "clean ignored cache"
  local tmp
  tmp="$(mktemp)"
  git ls-files --ignored --exclude-standard --cached -z > "$tmp"
  while IFS= read -r -d '' f; do
    [ -z "$f" ] && continue
    run git update-index --force-remove -- "$f"
  done < "$tmp"
  rm -f "$tmp"
}

main() {
  install_all
  cleanup_cache
  log "done"
}

main "$@"
