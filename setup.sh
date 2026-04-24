#!/usr/bin/env bash

set -Eeuo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/.hooks/init.sh" "$@"
