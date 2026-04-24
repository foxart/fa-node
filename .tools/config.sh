#!/usr/bin/env bash

# GIT
: "${GIT_SSH_DIR:=$HOME/.ssh}"
: "${GIT_HOOKS_DIR:=.git/hooks}"
: "${GIT_PRUNE_IGNORED_FROM_INDEX:=true}"

# HOOKS BEHAVIOR
: "${HOOKS_DRY_RUN:=false}"

# JIRA
: "${JIRA_URL:=https://atlassian.net}"
: "${JIRA_REGEX:=[A-Z]+-[0-9]+}"
