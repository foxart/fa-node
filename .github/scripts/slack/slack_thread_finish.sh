#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../slack.sh"
source "$SCRIPT_DIR/slack_thread_message.sh"
slack_bootstrap "$@" || exit 0
status="$(slack_status_from_env)"
[[ -z "${SLACK_THREAD:-}" ]] && exit 0
payload="$(slack_thread_reply "$status")"
slack_post "$payload"
