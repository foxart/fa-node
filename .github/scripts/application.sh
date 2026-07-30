#!/usr/bin/env bash

APP_DIR="/var/www/rtb"
PM2_HOME="/root/.pm2"
PM2_START="start:prod"
PM2_BUILD="build:prod"
PM2_NAME="${APP_NAME}-rtb"

application_install() {
  cd "$APP_DIR" || return
  sudo -E env NPM_CONFIG_PRODUCTION=false npm ci --omit=dev
}

application_build() {
  cd "$APP_DIR" || return
  sudo -E npm run $PM2_BUILD
  test -f "$APP_DIR/dist/index.js"
}

application_update() {
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

application_logrotate() {
  if ! sudo env PM2_HOME="$PM2_HOME" pm2 describe pm2-logrotate >/dev/null 2>&1; then
    sudo env PM2_HOME="$PM2_HOME" pm2 install pm2-logrotate
  else
    echo "PM2-logrotate up-to-date"
  fi
  sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:max_size 1G
  sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:retain 5
  sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:compress true
  sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
  sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:workerInterval 60
  sudo env PM2_HOME="$PM2_HOME" pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
}

application_verify() {
  APP_DIR="$APP_DIR" PM2_START="$PM2_START" node -e "
    const path = require('path');
    const pkg = require(path.join(process.env.APP_DIR, 'package.json'));
    const script = process.env.PM2_START;
    if (!pkg.scripts || !pkg.scripts[script]) {
      console.error('Missing npm script:', script);
      process.exit(1);
    }
  "
}

application_restart() {
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
    -- run "$PM2_START"
  sudo env PM2_HOME="$PM2_HOME" pm2 save --force
}

application_status() {
  sudo env PM2_HOME="$PM2_HOME" pm2 list | grep "$PM2_NAME" || true
}
