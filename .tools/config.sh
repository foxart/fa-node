#!/usr/bin/env bash

# SSH
: "${SSH_DIR:=$HOME/.ssh}"

# GIT
: "${GIT_HOOKS_DIR:=.git/hooks}"
: "${GIT_HOOKS_SKIP:=false}"
: "${GIT_HOOKS_PRUNE:=true}"

# JIRA
: "${JIRA_URL:=https://atlassian.net}"
: "${JIRA_REGEX:=[A-Z]+-[0-9]+}"

# CONTRIBUTORS
: "${CONTRIB_SUBJ_W:=200}"
: "${CONTRIB_BRANCH_W:=100}"
: "${CONTRIB_LIMIT:=5}"
: "${CONTRIB_EMPTY:=-}"
: "${CONTRIB_OUT:=./docs/contributors.md}"
: "${CONTRIB_HEADER:=# Contributors}"
: "${CONTRIB_SUMMARY:=## Summary}"
: "${CONTRIB_DETAILS:=## Commits}"
: "${CONTRIB_SUM_SORT:=lines}"
: "${CONTRIB_SUM_ORDER:=desc}"
: "${CONTRIB_COMMIT_SORT:=last_ts}"
: "${CONTRIB_COMMIT_ORDER:=desc}"
