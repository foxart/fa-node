#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/logger.sh"

testSection() {
  printf "\n"
  printf "============================================================\n"
  printf "%s\n" "$1"
  printf "============================================================\n"
}

testFormatCase() {
  local title="$1"
  local input="$2"
  local note="$3"

  printf "\n"
  printf "[case] %s\n" "$title"
  printf "input : %s\n" "$input"
  [[ -n "$note" ]] && printf "notes : %s\n" "$note"
  printf "output: %s\n" "$(loggerFormat "$input")"
}

testLogCase() {
  local title="$1"
  local message="$2"

  printf "\n"
  printf "[case] %s\n" "$title"
  loggerLog "LOG message: $message"
  loggerInfo "INF message: $message"
  loggerWarn "WRN message: $message"
  loggerError "ERR message: $message"
  loggerDebug "DBG message: $message"
}

loggerTest() {
  testSection "loggerFormat: meta text"
  testFormatCase "plain text" \
    "Lorem Ipsum Dolor Sit Amet" \
    "letters, spaces, and punctuation use meta coloring"
  testFormatCase "status with counters" \
    "[COPY] processed=5/10, skipped=2" \
    "brackets, numbers, equals, slash, and comma are visible"
  testFormatCase "key value metadata" \
    "event=copy status=ok dryRun=false path=\"src/app\" empty=null" \
    "keys, values, boolean, null, equals, and quoted strings"
  testFormatCase "nested labels" \
    "[HOOKS] run(pre-commit): files=12, changed=true, reason='lint passed'" \
    "labels, parentheses, colon, comma, single quotes, and boolean"
  testFormatCase "file-like path without leading slash" \
    "src/app/logger.test.sh:42" \
    "colon with a number is still readable as meta text"

  testSection "loggerFormat: JSON"
  testFormatCase "json object" \
    '{"id":1,"name":"Ivan","ok":true,"deleted":false,"empty":null,"tags":["cli","logger"]}' \
    "keys, strings, numbers, booleans, null, arrays, and punctuation"
  testFormatCase "json numbers and escapes" \
    '{"negative":-17,"float":3.14,"scientific":2.5e-10,"text":"quote: \"ok\""}' \
    "minus, dot, exponent, and escaped quotes"
  testFormatCase "json array" \
    '[{"type":"copy","done":5},{"type":"skip","done":2}]' \
    "top-level arrays are formatted as JSON too"

  testSection "loggerFormat: URI and path"
  testFormatCase "absolute path with port and query" \
    "/src/app:8080?a=1&b=two" \
    "path parts, port, query keys, and query values"
  testFormatCase "full https URL" \
    "https://example.com:8080/api/v1/users?id=1&active=true" \
    "protocol, domain, port, path, and query"
  testFormatCase "encoded query values" \
    "https://example.com/search?q=hello%20world&page=2&empty=null&draft=false" \
    "percent encoding, numbers, null, and booleans in query values"
  testFormatCase "localhost URL" \
    "http://localhost:3000/health?ready=1" \
    "localhost with protocol is treated as URI"
  testFormatCase "path tokens and filters" \
    "/api/v2/users_legacy/{id}/orders[0]?sort=-created_at&include=items+totals" \
    "underscores, braces, brackets, minus, plus, and path numbers"
  testFormatCase "domain-like path" \
    "api.local/v1/report?date=2026-05-01" \
    "domain without protocol plus path and query"

  testSection "logger levels"
  testLogCase "all badges with formatted URI" \
    "Copied $(loggerFormat "https://example.com/api/items?id=42") $(_meta "[5/10]")"
  testLogCase "all badges with formatted JSON" \
    "Payload $(loggerFormat '{"id":42,"name":"Ivan","ok":true,"deleted":false,"empty":null}')"
}

loggerTest "$@"
