#!/usr/bin/env bash
set -Eeuo pipefail

echo "DEPLOY_SCRIPT_VERSION=2026-07-30-01"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/environment.sh"

validate_required() {
  : "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
  : "${PM2_HOME:?PM2_HOME is required}"
  : "${PM2_SCRIPT:?PM2_SCRIPT is required}"
  : "${PM2_NAME:?PM2_NAME is required}"
  : "${APP_DIR:?APP_DIR is required}"
}

synchronize_code() {
  local -a preserved_dirs=(
    ".git"
    "node_modules"
    "storage"
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
  sudo rm -rf "$APP_DIR/dist"
  sudo chown -R "$(id -un)":"$(id -gn)" "$APP_DIR"
  sudo chmod -R u+rwX "$APP_DIR"
}

install_dependencies() {
  cd "$APP_DIR"
  sudo -E env NPM_CONFIG_PRODUCTION=false npm ci --include=dev
}

build_application() {
  cd "$APP_DIR"
  sudo -E npm run build
  test -f "$APP_DIR/dist/index.js"
}

restore_permissions() {
  sudo chown -R www-data:www-data "$APP_DIR"
  sudo chmod -R a+rX "$APP_DIR/node_modules"
  sudo chmod -R a+rX "$APP_DIR/storage"
}

pm2_update() {
  local current
  local latest
  current="$(sudo env PM2_HOME="$PM2_HOME" pm2 -v 2>/dev/null | head -n1 || echo '')"
  latest="$(npm view pm2 version 2>/dev/null || echo '')"
  if [[ -n "$latest" && "$current" != "$latest" ]]; then
    sudo npm i -g "pm2@$latest"
    sudo env PM2_HOME="$PM2_HOME" pm2 update
  else
    echo "PM2 up-to-date"
  fi
}

pm2_logrotate() {
  if ! sudo env PM2_HOME="$PM2_HOME" pm2 describe pm2-logrotate >/dev/null 2>&1; then
    sudo env PM2_HOME="$PM2_HOME" pm2 install pm2-logrotate
    sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:max_size 50M
    sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:retain 10
    sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:compress true
    sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:dateFormat YYYY-MM-DD
    sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:workerInterval 3600
  else
    echo "PM2-logrotate up-to-date"
  fi
}

pm2_verify() {
  APP_DIR="$APP_DIR" PM2_SCRIPT="$PM2_SCRIPT" node -e "
    const path = require('path');
    const pkg = require(path.join(process.env.APP_DIR, 'package.json'));
    const script = process.env.PM2_SCRIPT;
    if (!pkg.scripts || !pkg.scripts[script]) {
      console.error('Missing npm script:', script);
      process.exit(1);
    }
  "
}

pm2_restart() {
  local -a pm2_env_args=()
  local var
  sudo env PM2_HOME="$PM2_HOME" pm2 delete all || true
  # shellcheck disable=SC2154
  for var in "${environment_variables[@]}"; do
    pm2_env_args+=("$var=${!var-}")
  done
  sudo -E env PM2_HOME="$PM2_HOME" "${pm2_env_args[@]}" pm2 start npm \
    --name "$PM2_NAME" \
    --cwd "$APP_DIR" \
    --update-env \
    -- run "$PM2_SCRIPT"
  sudo env PM2_HOME="$PM2_HOME" pm2 save --force
}

pm2_status() {
  sudo env PM2_HOME="$PM2_HOME" pm2 list | grep "$PM2_NAME" || true
}

main() {
  validate_required
  synchronize_code
  fix_permissions
  install_dependencies
  build_application
  restore_permissions
  pm2_update
  pm2_logrotate
  pm2_verify
  pm2_restart
  pm2_status
}

main "$@"
