#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHANNEL_HEADER_BLOCKS="$(cat "$SCRIPT_DIR/slack_channel_header.json")"
CHANNEL_BLOCKS="$(cat "$SCRIPT_DIR/slack_channel_message.json")"

slack_channel_heading() {
	printf '%s' "${EMOJI} ${WORKFLOW} ${EMOJI_SEPARATOR} ${TARGET} ${EMOJI_SEPARATOR} ${STATUS_LABEL}"
}

slack_channel_message() {
	local status="$1"
	local update="${2:-false}" header payload ts_line
	slack_status_set "$status"
	header="$(slack_channel_heading)"
	# shellcheck disable=SC2034
	SLACK_TEXT="$header"
	ts_line=""
	[[ "$update" == "true" ]] && ts_line='  "ts": "__MESSAGE_TS__",'
	payload="$(slack_payload_build "$ts_line" "" "$(slack_blocks_join "$CHANNEL_HEADER_BLOCKS" "$CHANNEL_BLOCKS")")"
	slack_render_payload "$payload"
}
