#!/usr/bin/env bash

# config.sh

# ========= PATH CONFIG =========
: "${HOOKS_ROOT:=.hooks}"
: "${HOOKS_DIR:=$HOOKS_ROOT/git}"
: "${GIT_HOOKS_DIR:=.git/hooks}"

# ========= BEHAVIOR =========
: "${HOOKS_DRY_RUN:=false}"
: "${HOOKS_DEBUG:=true}"
: "${HOOKS_CLEAN_IGNORED_CACHE:=true}"

# ========= JIRA =========
: "${JIRA_URL:=https://atlassian.net}"
: "${JIRA_REGEX:=[A-Z]+-[0-9]+}"
