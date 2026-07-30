#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC2034
EMOJI_SEPARATOR="»"
EMOJI_START="🚀"
EMOJI_SUCCESS="✅"
EMOJI_FAILURE="🚨"
STATUS_START="Started"
STATUS_SUCCESS="Succeeded"
STATUS_FAILURE="Failed"
SLACK_RETRY_MAX="${SLACK_RETRY_MAX:-2}"
SLACK_RETRY_DELAY="${SLACK_RETRY_DELAY:-1}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-15}"
SLACK_API_BASE_URL="https://slack.com/api"

SLACK_KEYS=(
	SLACK_CHANNEL
	SLACK_TEXT
	THREAD_TS
	TARGET
	TARGET_IP
	TARGET_PUBLIC_IP
	TARGET_PRIVATE_IP
	REPO
	REPO_URL
	BRANCH
	BRANCH_URL
	RUN_NUMBER
	RUN_URL
	RUN_STARTED_AT
	TRIGGERED_BY
	COMMIT_URL
	SHA_SHORT
	MESSAGE_TS
	STATUS_LABEL
	COMMIT_SUBJECT
	COMMIT_AUTHOR
)

slack_payload_build() {
	local ts_line="$1"
	local thread_line="$2"
	local blocks="$3"
	local lines=(
		'{'
		'  "channel": "__SLACK_CHANNEL__",'
	)
	if [[ -n "$ts_line" ]]; then
		lines+=("$ts_line")
	fi
	if [[ -n "$thread_line" ]]; then
		lines+=("$thread_line")
	fi
	lines+=(
		'  "text": "__SLACK_TEXT__",'
		'  "blocks":'
		"$blocks"
		'}'
	)
	printf '%s\n' "${lines[@]}"
}

slack_blocks_join() {
	local left="$1"
	local right="$2"
	left="${left#[}"
	left="${left%]}"
	right="${right#[}"
	right="${right%]}"
	if [[ -n "$left" && -n "$right" ]]; then
		printf '[%s,%s]' "$left" "$right"
	elif [[ -n "$left" ]]; then
		printf '[%s]' "$left"
	else
		printf '[%s]' "$right"
	fi
}

slack_status_set() {
	local status="$1"
	case "$status" in
	start)
		# shellcheck disable=SC2034
		STATUS_LABEL="$STATUS_START"
		# shellcheck disable=SC2034
		EMOJI="$EMOJI_START"
		;;
	success)
		# shellcheck disable=SC2034
		STATUS_LABEL="$STATUS_SUCCESS"
		# shellcheck disable=SC2034
		EMOJI="$EMOJI_SUCCESS"
		;;
	failure)
		# shellcheck disable=SC2034
		STATUS_LABEL="$STATUS_FAILURE"
		# shellcheck disable=SC2034
		EMOJI="$EMOJI_FAILURE"
		;;
	esac
}

slack_status_from_env() {
	if [[ "${STATUS:-}" == "success" ]]; then
		printf '%s' "success"
	else
		printf '%s' "failure"
	fi
}

slack_require_env() {
	if [[ -z "${SLACK_TOKEN:-}" || -z "${SLACK_CHANNEL:-}" ]]; then
		echo "Slack vars not set, skipping" >&2
		return 1
	fi
	return 0
}

slack_set_env() {
	SLACK_TOKEN="${1:-${SLACK_TOKEN-}}"
	SLACK_CHANNEL="${2:-${SLACK_CHANNEL-}}"
	SLACK_MESSAGE="${3:-${SLACK_MESSAGE-}}"
	SLACK_THREAD="${4:-${SLACK_THREAD-}}"
	TARGET="${5:-${TARGET-}}"
	STATUS="${6:-${STATUS-}}"
}

slack_bootstrap() {
	local mode="${1:-}"
	local skip_thread="false"
	if [[ "$mode" == "skip-thread" ]]; then
		skip_thread="true"
		shift
	fi
	slack_set_env "$@"
	slack_require_env || return 1
	if [[ "$skip_thread" == "true" && -n "${SLACK_THREAD:-}" ]]; then
		return 2
	fi
	slack_init_context
}

slack_bootstrap_skip_thread() {
	slack_bootstrap skip-thread "$@"
}

slack_collect_ipv4() {
	if command -v ip >/dev/null 2>&1; then
		ip -4 addr show 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 || true
		return 0
	fi
	if command -v hostname >/dev/null 2>&1; then
		hostname -I 2>/dev/null || true
		return 0
	fi
	if command -v ifconfig >/dev/null 2>&1; then
		ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2}' || true
	fi
}

slack_first_ipv4() {
	local ip
	for ip in $(slack_collect_ipv4); do
		printf '%s' "$ip"
		return 0
	done
	return 1
}

slack_detect_public_ip() {
	local ip=""
	if command -v ip >/dev/null 2>&1; then
		ip="$(
			ip -4 route get 1.1.1.1 2>/dev/null |
				awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}' ||
				true
		)"
	fi
	if [[ -z "$ip" ]]; then
		ip="$(slack_first_ipv4 || true)"
	fi
	printf '%s' "$ip"
}

slack_detect_private_ip() {
	local -a ips=()
	local ip
	while IFS= read -r ip; do
		if [[ -n "$ip" ]]; then
			ips+=("$ip")
		fi
	done < <(slack_collect_ipv4 | tr '[:space:]' '\n')
	slack_pick_private_ip "${ips[@]}"
}

slack_pick_private_ip() {
	local ip
	for ip in "$@"; do
		if slack_is_private_ipv4 "$ip"; then
			printf '%s' "$ip"
			return 0
		fi
	done
	return 1
}

slack_is_private_ipv4() {
	local ip="${1:-}"
	case "$ip" in
	10.* | 192.168.* | 172.1[6-9].* | 172.2[0-9].* | 172.3[01].* | 100.6[4-9].* | 100.[7-9][0-9].*)
		return 0
		;;
	100.1[01][0-9].* | 100.12[0-7].*)
		return 0
		;;
	esac
	return 1
}

slack_ip_unknown() {
	local ip="${1:-}"
	ip="$(printf '%s' "$ip" | tr '[:upper:]' '[:lower:]')"
	[[ "$ip" == "n/a" || "$ip" == "unknown" ]]
}

slack_init_target() {
	TARGET="${TARGET:-ALL}"
}

slack_init_target_ips() {
	if [[ "$TARGET" == "ALL" ]]; then
		TARGET_PUBLIC_IP="N/A"
		TARGET_PRIVATE_IP="N/A"
		return 0
	fi
	if [[ -z "${TARGET_PUBLIC_IP:-}" ]]; then
		TARGET_PUBLIC_IP="$(slack_detect_public_ip)"
	fi
	if [[ -z "${TARGET_PRIVATE_IP:-}" ]]; then
		TARGET_PRIVATE_IP="$(slack_detect_private_ip || true)"
	fi
	TARGET_PUBLIC_IP="${TARGET_PUBLIC_IP:-UNKNOWN}"
	TARGET_PRIVATE_IP="${TARGET_PRIVATE_IP:-UNKNOWN}"
}

slack_build_target_ip() {
	if [[ "$TARGET" == "ALL" ]]; then
		# shellcheck disable=SC2016
		TARGET_IP='`N/A`'
	elif slack_ip_unknown "$TARGET_PUBLIC_IP" && slack_ip_unknown "$TARGET_PRIVATE_IP"; then
		# shellcheck disable=SC2016
		TARGET_IP='`N/A`'
	else
		# shellcheck disable=SC2016,SC2034
		TARGET_IP='`'"$TARGET_PUBLIC_IP"'` / `'"$TARGET_PRIVATE_IP"'`'
	fi
}

slack_init_context() {
	# shellcheck disable=SC2034
	REPO_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}"
	# shellcheck disable=SC2034
	BRANCH_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/tree/${GITHUB_REF_NAME}"
	# shellcheck disable=SC2034
	RUN_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
	# shellcheck disable=SC2034
	COMMIT_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/commit/${GITHUB_SHA}"
	# shellcheck disable=SC2034
	COMMIT_SUBJECT="$(git log -1 --pretty=%s 2>/dev/null || echo "")"
	# shellcheck disable=SC2034
	COMMIT_AUTHOR="$(git log -1 --pretty=%an 2>/dev/null || echo "")"
	# shellcheck disable=SC2034
	SHA_SHORT="${GITHUB_SHA:0:7}"
	# shellcheck disable=SC2034
	REPO="${GITHUB_REPOSITORY##*/}"
	# shellcheck disable=SC2034
	WORKFLOW="${GITHUB_WORKFLOW:-}"
	# shellcheck disable=SC2034
	BRANCH="${GITHUB_REF_NAME:-}"
	# shellcheck disable=SC2034
	RUN_NUMBER="${GITHUB_RUN_NUMBER:-}"
	# shellcheck disable=SC2034
	RUN_STARTED_AT="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
	TRIGGERED_BY="${TRIGGERED_BY:-${GITHUB_ACTOR:-unknown}}"
	slack_init_target
	slack_init_target_ips
	slack_build_target_ip
}

slack_escape() {
	local value="${1:-}"
	value="${value//\\/\\\\}"
	value="${value//\"/\\\"}"
	value="${value//$'\n'/\\n}"
	value="${value//$'\r'/\\r}"
	value="${value//$'\t'/\\t}"
	printf '%s' "$value"
}

slack_render_payload() {
	local payload="$1"
	# shellcheck disable=SC2034
	local THREAD_TS="${SLACK_THREAD:-}"
	# shellcheck disable=SC2034
	local MESSAGE_TS="${SLACK_MESSAGE:-}"
	local key value
	for key in "${SLACK_KEYS[@]}"; do
		value="$(slack_escape "${!key:-}")"
		payload="${payload//__${key}__/$value}"
	done
	printf '%s' "$payload"
}

slack_extract_ts() {
	local body="${1:-$SLACK_RESPONSE_BODY}"
	printf '%s' "$body" | sed -n 's/.*"ts"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1
}

slack_update_url() {
	if [[ -n "${SLACK_UPDATE_URL:-}" ]]; then
		printf '%s' "$SLACK_UPDATE_URL"
		return 0
	fi
	printf '%s/chat.update' "$SLACK_API_BASE_URL"
}

slack_post_url() {
	printf '%s/chat.postMessage' "$SLACK_API_BASE_URL"
}

slack_post() {
	local payload="$1"
	local url="${2:-$(slack_post_url)}"
	local headers_file body_file curl_exit http_status body retry_after attempt
	SLACK_RESPONSE_BODY=""
	headers_file="$(mktemp)"
	body_file="$(mktemp)"
	attempt=0
	while true; do
		attempt=$((attempt + 1))
		set +e
		http_status="$(curl -sS -w "%{http_code}" -X POST "$url" \
			-H "Authorization: Bearer $SLACK_TOKEN" \
			-H "Content-type: application/json; charset=utf-8" \
			--connect-timeout "$CURL_CONNECT_TIMEOUT" \
			--max-time "$CURL_MAX_TIME" \
			-D "$headers_file" \
			-o "$body_file" \
			--data "$payload")"
		curl_exit=$?
		set -e
		if [[ $curl_exit -ne 0 ]]; then
			echo "Slack error: curl failed with code $curl_exit" >&2
			rm -f "$headers_file" "$body_file"
			return 1
		fi
		body="$(cat "$body_file")"
		if [[ "$http_status" == "429" && "$attempt" -le "$SLACK_RETRY_MAX" ]]; then
			retry_after="$(awk -F': *' \
				'tolower($1)=="retry-after" {print $2; exit}' "$headers_file" | tr -d "\r")"
			retry_after="${retry_after:-$SLACK_RETRY_DELAY}"
			sleep "$retry_after"
			continue
		fi
		break
	done
	if [[ -z "$http_status" || "$http_status" -lt 200 || "$http_status" -ge 300 ]]; then
		echo "Slack error: HTTP $http_status" >&2
		echo "Slack response: $body" >&2
		rm -f "$headers_file" "$body_file"
		return 1
	fi
	if [[ "$body" != *"\"ok\":true"* ]]; then
		echo "Slack error: non-ok response" >&2
		echo "Slack response: $body" >&2
		rm -f "$headers_file" "$body_file"
		return 1
	fi
	SLACK_RESPONSE_BODY="$body"
	rm -f "$headers_file" "$body_file"
	return 0
}

slack_update() {
	local payload="$1"
	local url
	url="$(slack_update_url)"
	slack_post "$payload" "$url"
}
