---
apply: always
---

Generate git commit message. Return ONLY message.

Branch: $GIT_BRANCH_NAME
Changes: $CHANGES

Format:
<type>(<scope>): <summary>

<body>

[Refs <ticket>]

Rules:
- type: feat|fix|ref|perf|test|docs|style|chore; choose from diff; else chore
- scope: one lowercase word, prefer specific (git|hook|commit|api|ui), avoid generic
- summary: Russian, infinitive, <=72 chars, no period, concrete result from diff, no branch/ticket mention
- body: omit only for trivial docs/style/chore; else min 3 bullets, add more if needed
- bullets: "-" only; each = what changed + where + resulting behavior; concise, factual, no intentions
- wording: focus on outcome, avoid “внутренняя кухня”, no redundancy
- extract ticket via [A-Z]+-\d+ from Branch; if exists add last line "Refs <ticket>"
- never invent ticket numbers; ignore conflicting old messages from Changes
- do not mention branch unless part of code; do not use "*"

Avoid: реализовал, улучшил, оптимизировал, переработал, обновил сервис, изменил контроллер, исправил баг
Prefer: добавить, вынести, объединить, внедрить, заменить, разделить, синхронизировать, пересчитать, убрать, перевести, собрать, ограничить
