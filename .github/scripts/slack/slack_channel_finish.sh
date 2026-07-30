#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../slack.sh"
source "$SCRIPT_DIR/slack_channel_message.sh"
slack_bootstrap "$@" || exit 0
status="$(slack_status_from_env)"
[[ -n "${SLACK_THREAD:-}" && -z "${SLACK_MESSAGE:-}" ]] && exit 0
if [[ -n "${SLACK_MESSAGE:-}" ]]; then
	payload="$(slack_channel_message "$status" true)"
	slack_update "$payload"
	exit 0
fi
payload="$(slack_channel_message "$status" false)"
slack_post "$payload"
