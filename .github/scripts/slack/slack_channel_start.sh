#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../slack.sh"
source "$SCRIPT_DIR/slack_channel_message.sh"
slack_bootstrap_skip_thread "$@"
payload="$(slack_channel_message start false)"
slack_post "$payload"
message_ts="$(slack_extract_ts)"
if [[ -n "$message_ts" && -n "${GITHUB_ENV:-}" ]]; then
	echo "SLACK_MESSAGE=$message_ts" >>"$GITHUB_ENV"
fi
