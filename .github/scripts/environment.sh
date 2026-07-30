#!/usr/bin/env bash
set -euo pipefail

environment_required=(
  NODE_ENV
  APP_DEBUG
  APP_NAME
  APP_PROTOCOL
  APP_HOST
  APP_PORT
  APP_PASSWORD
  PLATFORM
  SCHAIN_DOMAIN
  REGION
  CONTROL_HOST
  CLICKHOUSE_HOST
  CLICKHOUSE_PORT
  CLICKHOUSE_DATABASE
  CLICKHOUSE_USER
  CLICKHOUSE_PASSWORD
  MONGO_HOST
  MONGO_PORT
  MONGO_DATABASE
  MONGO_USER
  MONGO_PASSWORD
)

environment_optional=(
  COMPANY_SUFFIX
  MONGO_REPLICA_SET
  REDIS_URL
)

# shellcheck disable=SC2034
environment_variables=(
  "${environment_required[@]}"
  "${environment_optional[@]}"
)

environment_validate() {
  local -a missing=()
  local variable
  for variable in "${environment_required[@]}"; do
    if [[ -z "${!variable:-}" ]]; then
      missing+=("$variable")
    fi
  done
  if [[ "${#missing[@]}" -gt 0 ]]; then
    echo "Missing required env vars: ${missing[*]}" >&2
    return 1
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  environment_validate
fi
