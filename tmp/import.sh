#!/usr/bin/env bash

syncFiles() {
  local src="$1"
  local dst="$2"
  shift 2
  if [[ ! -d "$src" ]]; then
    echo "Missed: $src"
    return 1
  fi
  mkdir -p "$dst"
  if [[ $# -eq 0 ]]; then
    local total
    total=$(find "$src" -type f | wc -l | tr -d ' ')
    find "$dst" -type f -exec chmod +w {} + 2>/dev/null || true
    cp -R "$src"/. "$dst"/ || {
      echo "Failed: $src → $dst"
      return 1
    }
    echo "Copied: $src → $dst ($total/$total)"
    return 0
  fi
  local total=$# count=0 errors=0
  local file s d
  for file in "$@"; do
    s="$src/$file"
    d="$dst/$file"
    if [[ ! -f "$s" && ! -d "$s" ]]; then
      echo "Missed: $s"
      ((errors += 1))
      continue
    fi
    mkdir -p "$(dirname "$d")"
    [[ -f "$d" ]] && chmod +w "$d" 2>/dev/null || true
    if [[ -d "$s" ]]; then
      if ! cp -R "$s"/. "$d"/; then
        echo "Failed: $s → $d"
        ((errors += 1))
        continue
      fi
      ((count += 1))
      continue
    fi
    if ! cp "$s" "$d"; then
      echo "Failed: $s → $d"
      ((errors += 1))
      continue
    fi
    ((count += 1))
  done
  echo "Copied: $src → $dst ($count/$total)"
  ((errors == 0))
}

SRC_PATH='../../pet/fa-node'

syncFiles "$SRC_PATH/.tools" './.tools' \
  .git-hooks \
  config.sh \
  contributors.sh \
  logger.sh \
  prompt.sh \
  repository.sh

syncFiles "$SRC_PATH/src/classes" "./src/classes" \
  configuration.class.ts \
  route.class.ts

syncFiles "$SRC_PATH/src/helpers" "./src/helpers" \
  ansi.helper.ts \
  console.helper.ts \
  converter.helper.ts \
  exception.helper.ts \
  process.helper.ts \
  stack.helper.ts \
  string.helper.ts \
  symbol.helper.ts

syncFiles "$SRC_PATH/src/logger" "./src/logger" \
  logger.class.ts \
  logger.map.ts \
  logger.nest.ts \
  logger.node.ts
