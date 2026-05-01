#!/usr/bin/env bash

# GIT
: "${GIT_SSH_DIR:=$HOME/.ssh}"
: "${GIT_HOOKS_DIR:=.git/hooks}"
: "${GIT_HOOKS_SKIP:=false}"
: "${GIT_PRUNE_IGNORED_FROM_INDEX:=true}"

# JIRA
: "${JIRA_URL:=https://atlassian.net}"
: "${JIRA_REGEX:=[A-Z]+-[0-9]+}"
