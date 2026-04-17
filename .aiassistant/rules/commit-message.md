---
apply: always
---

Generate git commit message from Branch and Changes.

Return only commit message.
No explanation, markdown, or fences.

Input:
Branch: $GIT_BRANCH_NAME
Changes: $CHANGES

Format:
<type>(<scope>) <ticket-or-branch>: <summary>

<body>

Rules:

- type: feat|fix|ref|perf|test|docs|style|chore; default feat
- scope: one lowercase latin word
- ticket-or-branch: first match in Branch for [A-Z]+-\d+; else [A-Za-z]+-\d+; uppercase it; else use Branch
- summary: Russian, imperative, <=50 chars, no period
- body: omit only for trivial docs/chore; else min 3 `-` bullets
- each bullet: what changed, where, how it works now
- write concretely

Avoid:
реализовал, добавил поддержку, улучшил, оптимизировал, переработал, обновил сервис, изменил контроллер, исправил баг

Prefer:
добавил, вынес, объединил, внедрил, заменил, разделил, синхронизировал, пересчитал, убрал, перевел, собрал, ограничил

If something does not fit, output the best valid commit anyway.
