#!/usr/bin/env bash

log_msg() {
  local type="$1"
  shift
  local text="$*"
  local label color
  case "$type" in
  log)
    label="LOG"
    color="32"
    ;; # зелёный (успех)
  err)
    label="ERR"
    color="31"
    ;; # красный (ошибка)
  path)
    printf "\033[36m%s\033[0m" "$text" # циан (данные)
    return
    ;;
  meta)
    # прогресс (x/y)
    if [[ "$text" =~ ^([0-9]+)/([0-9]+)$ ]]; then
      local done="${BASH_REMATCH[1]}"
      local total="${BASH_REMATCH[2]}"
      if [[ "$done" -eq "$total" ]]; then
        # завершено
        printf "\033[32m(%s/%s)\033[0m" "$done" "$total"
      else
        # в процессе / частично
        printf "\033[33m(%s/%s)\033[0m" "$done" "$total"
      fi
    else
      # вторичная инфа
      printf "\033[90m(%s)\033[0m" "$text"
    fi
    return
    ;;
  esac
  printf "\033[%sm[%s]\033[0m %s\n" "$color" "$label" "$text"
}

copy_files() {
  local src="$1"
  local dst="$2"
  shift 2
  mkdir -p "$dst"
  # 👉 copy all
  if [[ $# -eq 0 ]]; then
    local total
    total=$(find "$src" -type f | wc -l | tr -d ' ')
    find "$dst" -type f -exec chmod +w {} + 2>/dev/null
    cp -r "$src"/. "$dst"/
    log_msg log "Copied: $(log_msg path "$src") → $(log_msg path "$dst") $(log_msg meta "$total files")"
    return 0
  fi
  local total=$#
  local count=0
  local errors=0
  for file in "$@"; do
    local s="$src/$file"
    local d="$dst/$file"
    if [[ ! -f "$s" ]]; then
      log_msg err "Missed: $(log_msg path "$s")"
      ((errors++))
      continue
    fi
    [[ -f "$d" ]] && chmod +w "$d"
    cp "$s" "$d"
    ((count++))
  done
  log_msg log "Copied: $(log_msg path "$src") → $(log_msg path "$dst") $(log_msg meta "$count/$total")"
  # вернуть ошибку, если были missing
  ((errors > 0)) && return 1
  return 0
}

SRC='../../pet/fa-node'
HOOKS_DST='./.hooks'
TOOLS_DST='./.tools'
SHARED_DST='./src/shared'

#copy_files "$SRC" './' \
#  init.sh

copy_files "$SRC/.hooks" $HOOKS_DST

copy_files "$SRC/.tools" $TOOLS_DST \
  contributors.sh

copy_files "$SRC/src/classes" "$SHARED_DST/classes" \
  configuration.class.ts \
  route.class.ts

copy_files "$SRC/src/helpers" "$SHARED_DST/helpers" \
  ansi.helper.ts \
  console.helper.ts \
  converter.helper.ts \
  exception.helper.ts \
  process.helper.ts \
  stack.helper.ts \
  string.helper.ts \
  symbol.helper.ts

copy_files "$SRC/src/logger" "$SHARED_DST/logger" \
  logger.class.ts \
  logger.map.ts \
  logger.nest.ts \
  logger.node.ts
