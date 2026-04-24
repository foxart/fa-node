#!/usr/bin/env bash

promptInteractive() {
  local prompt="$1"
  shift
  local options=("$@")
  ((${#options[@]} > 0 && ${#options[@]} % 2 == 0)) || return 1
  local i key label
  for ((i = 0; i < ${#options[@]}; i += 2)); do
    key="${options[i]}"
    label="${options[i + 1]}"
    printf "%s. %s\n" "$key" "$label" >&2
  done
  local choice=""
  printf "%s" "$prompt" >&2
  while true; do
    IFS= read -r choice
    [[ "$choice" == "q" || "$choice" == "Q" ]] && return 2
    for ((i = 0; i < ${#options[@]}; i += 2)); do
      key="${options[i]}"
      if [[ "$choice" == "$key" ]]; then
        echo "$choice"
        return 0
      fi
    done
    printf "\033[1A\r\033[K%s" "$prompt" >&2
  done
}
