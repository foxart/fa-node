#!/usr/bin/env bash

# Foreground colors
COLOR_BLACK="30"
COLOR_RED="31"
COLOR_GREEN="32"
COLOR_YELLOW="33"
COLOR_BLUE="34"
COLOR_MAGENTA="35"
COLOR_CYAN="36"
COLOR_WHITE="37"
COLOR_GRAY="90"

# Background colors
BG_BLACK="40"
BG_RED="41"
BG_GREEN="42"
BG_YELLOW="43"
BG_BLUE="44"
BG_MAGENTA="45"
BG_CYAN="46"
BG_WHITE="47"
BG_GRAY="100"

# Styles
WHITE="97"
RESET="0"
BOLD="1"
DIM="2"
ITALIC="3"
UNDERLINE="4"
BLINK="5"
REVERSE="7"
HIDDEN="8"
STRIKE="9"

_color() {
  local code="$1"
  shift
  printf "\033[%sm%s\033[%sm" "$code" "$*" "$RESET"
}

_symbol() {
  _color "$COLOR_WHITE" "$1"
}

_number() {
  local input="$1"
  local out=""
  local i char
  for ((i = 0; i < ${#input}; i++)); do
    char="${input:$i:1}"
    case "$char" in
    [0-9eE])
      out+="$(_color "$COLOR_CYAN" "$char")"
      ;;
    *)
      out+="$(_symbol "$char")"
      ;;
    esac
  done
  printf "%s" "$out"
}

_meta() {
  local input="$1"
  local out=""
  local i char len token j k escaped next content_color
  len="${#input}"
  for ((i = 0; i < ${#input}; i++)); do
    char="${input:$i:1}"

    if [[ "$char" == '"' || "$char" == "'" ]]; then
      local quote="$char"
      token=""
      escaped=0
      for ((j = i + 1; j < len; j++)); do
        char="${input:$j:1}"
        if ((escaped == 1)); then
          token+="$char"
          escaped=0
          continue
        fi
        if [[ "$char" == '\' ]]; then
          token+="$char"
          escaped=1
          continue
        fi
        [[ "$char" == "$quote" ]] && break
        token+="$char"
      done

      out+="$(_color "$COLOR_WHITE" "$quote")"
      escaped=0
      for ((k = 0; k < ${#token}; k++)); do
        char="${token:$k:1}"
        if ((escaped == 1)); then
          out+="$(_color "$COLOR_YELLOW" "$char")"
          escaped=0
          continue
        fi
        if [[ "$char" == '\' ]]; then
          out+="$(_color "$COLOR_YELLOW" "$char")"
          escaped=1
          continue
        fi
        out+="$(_color "$COLOR_GREEN" "$char")"
      done
      out+="$(_color "$COLOR_WHITE" "$quote")"
      i="$j"
      continue
    fi

    if [[ "$char" =~ [a-zA-Z_] ]]; then
      token="$char"
      for ((j = i + 1; j < len; j++)); do
        next="${input:$j:1}"
        [[ "$next" =~ [a-zA-Z0-9_-] ]] || break
        token+="$next"
      done

      k="$j"
      while ((k < len)); do
        next="${input:$k:1}"
        [[ "$next" != " " && "$next" != $'\t' && "$next" != $'\n' && "$next" != $'\r' ]] && break
        ((k++))
      done

      content_color="$COLOR_GREEN"
      [[ "${input:$k:1}" == "=" || "${input:$k:1}" == ":" ]] && content_color="$COLOR_GRAY"
      [[ "$token" == "true" || "$token" == "false" ]] && content_color="$COLOR_YELLOW"
      [[ "$token" == "null" || "$token" == "nil" || "$token" == "none" ]] && content_color="$COLOR_RED"

      out+="$(_color "$content_color" "$token")"
      i=$((j - 1))
      continue
    fi

    case "$char" in
    [-0-9])
      if [[ "$char" == "-" && ! "${input:$((i + 1)):1}" =~ [0-9] ]]; then
        out+="$(_symbol "$char")"
        continue
      fi
      token="$char"
      for ((j = i + 1; j < len; j++)); do
        next="${input:$j:1}"
        [[ "$next" =~ [0-9.] ]] || break
        token+="$next"
      done
      out+="$(_number "$token")"
      i=$((j - 1))
      ;;
    [\(\)\[\]\{\}])
      out+="$(_color "$COLOR_MAGENTA" "$char")"
      ;;
    [:=])
      out+="$(_symbol "$char")"
      ;;
    [/.\-_,])
      out+="$(_symbol "$char")"
      ;;
    *)
      out+="$(_color "$COLOR_GRAY" "$char")"
      ;;
    esac
  done
  printf "%s" "$out"
}

_json() {
  local input="$1"
  local out=""
  local i char len token content_color j k escaped next
  len="${#input}"
  for ((i = 0; i < ${#input}; i++)); do
    char="${input:$i:1}"

    if [[ "$char" == '"' ]]; then
      token=""
      escaped=0
      for ((j = i + 1; j < len; j++)); do
        char="${input:$j:1}"
        if ((escaped == 1)); then
          token+="$char"
          escaped=0
          continue
        fi
        if [[ "$char" == '\' ]]; then
          token+="$char"
          escaped=1
          continue
        fi
        [[ "$char" == '"' ]] && break
        token+="$char"
      done

      k=$((j + 1))
      while ((k < len)); do
        next="${input:$k:1}"
        [[ "$next" != " " && "$next" != $'\t' && "$next" != $'\n' && "$next" != $'\r' ]] && break
        ((k++))
      done

      content_color="$COLOR_GREEN"
      [[ "${input:$k:1}" == ":" ]] && content_color="$COLOR_GRAY"

      out+="$(_color "$COLOR_WHITE" '"')"
      escaped=0
      for ((k = 0; k < ${#token}; k++)); do
        char="${token:$k:1}"
        if ((escaped == 1)); then
          out+="$(_color "$COLOR_YELLOW" "$char")"
          escaped=0
          continue
        fi
        if [[ "$char" == '\' ]]; then
          out+="$(_color "$COLOR_YELLOW" "$char")"
          escaped=1
          continue
        fi
        out+="$(_color "$content_color" "$char")"
      done
      out+="$(_color "$COLOR_WHITE" '"')"
      i="$j"
      continue
    fi

    if [[ "${input:$i:4}" == "true" ]]; then
      out+="$(_color "$COLOR_YELLOW" "true")"
      ((i += 3))
      continue
    fi
    if [[ "${input:$i:5}" == "false" ]]; then
      out+="$(_color "$COLOR_YELLOW" "false")"
      ((i += 4))
      continue
    fi
    if [[ "${input:$i:4}" == "null" ]]; then
      out+="$(_color "$COLOR_RED" "null")"
      ((i += 3))
      continue
    fi

    case "$char" in
    [-0-9])
      if [[ "$char" == "-" && ! "${input:$((i + 1)):1}" =~ [0-9] ]]; then
        out+="$(_symbol "$char")"
        continue
      fi
      token="$char"
      for ((j = i + 1; j < len; j++)); do
        next="${input:$j:1}"
        [[ "$next" =~ [0-9.eE+-] ]] || break
        token+="$next"
      done
      out+="$(_number "$token")"
      i=$((j - 1))
      ;;
    [\{\}\[\]\(\)])
      out+="$(_color "$COLOR_MAGENTA" "$char")"
      ;;
    [:,])
      out+="$(_symbol "$char")"
      ;;
    [\ ])
      out+="$char"
      ;;
    [[:space:]])
      out+="$char"
      ;;
    *)
      out+="$(_color "$COLOR_GRAY" "$char")"
      ;;
    esac
  done
  printf "%s" "$out"
}

_uriToken() {
  local input="$1"
  local mode="${2:-value}"
  local out=""
  local i char len token j next
  len="${#input}"

  if [[ "$input" == "true" || "$input" == "false" ]]; then
    _color "$COLOR_YELLOW" "$input"
    return
  fi
  if [[ "$input" == "null" || "$input" == "nil" || "$input" == "none" ]]; then
    _color "$COLOR_RED" "$input"
    return
  fi

  for ((i = 0; i < len; i++)); do
    char="${input:$i:1}"
    case "$char" in
    [0-9])
      token="$char"
      for ((j = i + 1; j < len; j++)); do
        next="${input:$j:1}"
        [[ "$next" =~ [0-9.] ]] || break
        token+="$next"
      done
      out+="$(_number "$token")"
      i=$((j - 1))
      ;;
    [a-zA-Z_])
      token="$char"
      for ((j = i + 1; j < len; j++)); do
        next="${input:$j:1}"
        [[ "$next" =~ [a-zA-Z0-9_-] ]] || break
        token+="$next"
      done
      if [[ "$mode" == "key" ]]; then
        out+="$(_color "$COLOR_GREEN" "$token")"
      else
        out+="$(_color "$COLOR_BLUE" "$token")"
      fi
      i=$((j - 1))
      ;;
    [\(\)\[\]\{\}])
      out+="$(_color "$COLOR_MAGENTA" "$char")"
      ;;
    [%+])
      out+="$(_symbol "$char")"
      ;;
    [.\-_,~])
      out+="$(_symbol "$char")"
      ;;
    *)
      out+="$(_color "$COLOR_GRAY" "$char")"
      ;;
    esac
  done
  printf "%s" "$out"
}

_uri() {
  local input="$1"
  local protocol=""
  local rest=""
  local domain=""
  local port=""
  local path=""
  local query=""
  local out=""
  local part pair key val name p
  local idx
  if [[ "$input" =~ ^([a-zA-Z][a-zA-Z0-9+.-]*)://(.*)$ ]]; then
    protocol="${BASH_REMATCH[1]}"
    rest="${BASH_REMATCH[2]}"
  else
    rest="$input"
  fi
  # Path-only input
  if [[ "$rest" == /* ]]; then
    path="$rest"
  else
    # Domain-like input:
    # example.com, localhost:3000, 127.0.0.1:8080, api.local/test
    if [[ "$rest" =~ ^([^/?:]+)(:([0-9]+))?(/.*|\?.*)?$ ]]; then
      domain="${BASH_REMATCH[1]}"
      port="${BASH_REMATCH[3]}"
      rest="${BASH_REMATCH[4]}"
      # If there is no protocol and no obvious host marker,
      # treat plain words like "src/app" as path, not domain.
      if [[ -z "$protocol" && "$input" != *.* && "$input" != *:* && "$input" != localhost* ]]; then
        domain=""
        port=""
        rest="$input"
      fi
    fi
    if [[ -z "$domain" ]]; then
      rest="$input"
    fi
  fi
  if [[ -z "$path" ]]; then
    if [[ "$rest" =~ ^([^?]*)(\?(.*))?$ ]]; then
      path="${BASH_REMATCH[1]}"
      query="${BASH_REMATCH[3]}"
    fi
  else
    if [[ "$path" =~ ^([^?]*)(\?(.*))?$ ]]; then
      path="${BASH_REMATCH[1]}"
      query="${BASH_REMATCH[3]}"
    fi
  fi
  if [[ -n "$protocol" ]]; then
    out+="$(_color "$COLOR_GRAY" "$protocol")"
    out+="$(_symbol "://")"
  fi
  if [[ -n "$domain" ]]; then
    out+="$(_color "$COLOR_CYAN" "$domain")"
  fi
  if [[ -n "$port" ]]; then
    out+="$(_symbol ":")"
    out+="$(_number "$port")"
  fi
  if [[ -n "$path" ]]; then
    if [[ "$path" == /* ]]; then
      out+="$(_symbol "/")"
      path="${path:1}"
    fi
    IFS='/' read -ra parts <<<"$path"
    for idx in "${!parts[@]}"; do
      part="${parts[$idx]}"
      if [[ -n "$part" ]]; then
        if [[ "$part" =~ ^([^:]+):([0-9]+)$ ]]; then
          name="${BASH_REMATCH[1]}"
          p="${BASH_REMATCH[2]}"
          out+="$(_uriToken "$name" "path")"
          out+="$(_symbol ":")"
          out+="$(_number "$p")"
        else
          out+="$(_uriToken "$part" "path")"
        fi
      fi
      [[ $idx -lt $((${#parts[@]} - 1)) ]] && out+="$(_symbol "/")"
    done
  fi
  if [[ -n "$query" ]]; then
    out+="$(_symbol "?")"
    IFS='&' read -ra pairs <<<"$query"
    for idx in "${!pairs[@]}"; do
      pair="${pairs[$idx]}"
      if [[ "$pair" =~ ^([^=]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        val="${BASH_REMATCH[2]}"
        out+="$(_uriToken "$key" "key")"
        out+="$(_symbol "=")"
        out+="$(_uriToken "$val" "value")"
      else
        out+="$(_uriToken "$pair" "key")"
      fi
      [[ $idx -lt $((${#pairs[@]} - 1)) ]] && out+="$(_symbol "&")"
    done
  fi
  printf "%s" "$out"
}

_print() {
  local label="$1"
  local bg="$2"
  shift 2
  local text="$*"
  local badge
  badge="\033[${bg}m\033[${WHITE}m ${label} \033[${RESET}m"
  printf "%b %s\n" "$badge" "$text"
}

loggerFormat() {
  local input="$1"
  if [[ "$input" =~ ^[[:space:]]*[\{\[] ]]; then
    _json "$input"
  elif [[ "$input" =~ ^[a-zA-Z][a-zA-Z0-9+.-]*:// || "$input" == /* || "$input" == *\?* || "$input" == *:*/* ]]; then
    _uri "$input"
  else
    _meta "$input"
  fi
}

loggerLog() {
  _print "LOG" "$BG_GREEN" "$*"
}

loggerInfo() {
  _print "INF" "$BG_BLUE" "$*"
}

loggerWarn() {
  _print "WRN" "$BG_YELLOW" "$*"
}

loggerError() {
  _print "ERR" "$BG_RED" "$*"
}

loggerDebug() {
  _print "DBG" "$BG_MAGENTA" "$*"
}
