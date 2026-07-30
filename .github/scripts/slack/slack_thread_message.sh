#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THREAD_BLOCKS="$(cat "$SCRIPT_DIR/slack_thread_message.json")"
THREAD_HEADER_BLOCKS="$(cat "$SCRIPT_DIR/slack_thread_header.json")"

slack_thread_heading() {
	printf '%s' "${EMOJI} ${WORKFLOW} ${EMOJI_SEPARATOR} ${TARGET} ${EMOJI_SEPARATOR} ${STATUS_LABEL}"
}

slack_thread_header() {
	local status="$1"
	local payload
	slack_status_set "$status"
	# shellcheck disable=SC2034
	SLACK_TEXT="$(slack_thread_heading)"
	payload="$(slack_payload_build "" "" "$THREAD_HEADER_BLOCKS")"
	slack_render_payload "$payload"
}

slack_thread_reply() {
	local status="$1"
	local payload
	slack_status_set "$status"
	# shellcheck disable=SC2034
	SLACK_TEXT="*$(slack_thread_heading)*"
	payload="$(slack_payload_build "" '  "thread_ts": "__THREAD_TS__",' "$THREAD_BLOCKS")"
	slack_render_payload "$payload"
}
