---
apply: always
---

Generate git commit message from Branch and Changes.
Return only commit message. No explanation, markdown, or fences.

Input:
Branch: $GIT_BRANCH_NAME
Changes: $CHANGES

Format:
<ticket-or-branch>: <type>(<scope>) <summary>

- <what changed, where, how it works now>
- <what changed, where, how it works now>
- <what changed, where, how it works now>

Refs <issue-base-url>/browse/<ticket-key>

Rules:
- type: feat|fix|ref|perf|test|docs|style|chore; default feat
- scope: one lowercase latin word
- ticket-or-branch: first ticket key from Branch matching `[A-Za-z]+-\d+`, uppercased; otherwise Branch
- summary: Russian, imperative, <=72 chars, no period
- body: omit only for trivial docs/chore; otherwise write at least 3 concrete `-` bullets
- each bullet must say what changed, where, and how it works now
- write concretely

Refs rules:
- find first literal URL in Branch or Changes matching `https?://[^\s)]+`
- find first ticket key in Branch or Changes matching `[A-Za-z]+-\d+`, uppercased
- if both URL and ticket key exist, Refs is mandatory
- if URL is absent, omit Refs even if ticket key exists
- issue-base-url = scheme + host from the matched URL only
- always canonicalize Refs URL to `<issue-base-url>/browse/<ticket-key>`
- Refs must be the final line and must start on its own line
- never print literal escape sequences like `\n` or `\\n`
- never invent, remember, guess, hardcode, or use placeholder hosts

Avoid:
реализовал, добавил поддержку, улучшил, оптимизировал, переработал, обновил сервис, изменил контроллер, исправил баг

Prefer:
добавил, вынес, объединил, внедрил, заменил, разделил, синхронизировал, пересчитал, убрал, перевел, собрал, ограничил

If something does not fit, output the best valid commit anyway.
