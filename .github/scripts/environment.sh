#!/usr/bin/env bash
set -euo pipefail

environment_required=(
  NODE_ENV
  APP_DEBUG
  APP_NAME
  APP_PROTOCOL
  APP_HOST
  APP_PORT
)

environment_optional=(
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
