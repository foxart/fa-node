#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/environment.sh"
source "$SCRIPT_DIR/application.sh"

validate_required() {
  : "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
}

synchronize_code() {
  local -a preserved_dirs=(
    ".git"
    "node_modules"
  )
  local -a rsync_exclude_args=()
  local dir
  for dir in "${preserved_dirs[@]}"; do
    rsync_exclude_args+=(--exclude="/${dir%/}/")
  done
  sudo rsync -a --delete \
    "${rsync_exclude_args[@]}" \
    "$GITHUB_WORKSPACE/" \
    "$APP_DIR/"
}

fix_permissions() {
  sudo chown -R "$(id -un)":"$(id -gn)" "$APP_DIR"
  sudo chmod -R u+rwX "$APP_DIR"
}

restore_permissions() {
  sudo chown -R www-data:www-data "$APP_DIR"
  sudo chmod -R a+rX "$APP_DIR/node_modules"
}

main() {
  validate_required
  synchronize_code
  fix_permissions
  application_install
  application_build
  restore_permissions
  application_update
  application_logrotate
  application_verify
  application_restart
  application_status
}

main "$@"
