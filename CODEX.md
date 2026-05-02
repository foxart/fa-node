Оцени и оптимизируй Codex-инструкции в этой монорепе.

Контекст:

- Это монорепа с root `AGENTS.md`, shared guides в `.codex/guides/`, service-level `AGENTS.md`, service-level `change-safety-*.md`, а также отдельными skills.
- Нужно довести инструкции до “10/10 для Codex”: точные scope boundaries, понятный owner/service routing, analysis-only vs code-change режим, contract safety, минимальный diff, правильные checks.
- Нужно максимально ужать текст и снизить token cost, не теряя функционал, safety-инварианты и service-specific правила.
- Не надо переписывать смысл, менять архитектуру правил или удалять защитные ограничения.

Задача:

1. Найди все релевантные instruction-файлы:

- `AGENTS.md`
- `.codex/guides/*.md`
- `*/AGENTS.md`
- `*/.codex/guides/*.md`
- `*/.codex/skills/*/SKILL.md`
- файлы вида `base*.md`, `change*.md`, `data*.md`, `skill*.md`
- исключи `node_modules/`, `vendor/`, generated/build/cache/output директории.

2. Сначала только проанализируй:

- какие правила дублируются между root/base/service guides;
- какие правила противоречат друг другу или создают ambiguity;
- где scope слишком широкий/узкий;
- где отсутствуют важные config/check files;
- где Codex может потратить лишние токены из-за повторов;
- где service-specific safety нельзя сжимать без потери смысла.

3. Затем предложи compact target structure:

- root `AGENTS.md`: только routing, monorepo boundaries, cross-service rules;
- `.codex/guides/base-agent.md`: общие agent behavior правила;
- `.codex/guides/base-change-safety.md`: общие invariants/change safety;
- `.codex/guides/data-access.md`: MCP/data rules;
- service `AGENTS.md`: только scope, owner domains, service-specific preserve/checks;
- service `change-safety-*.md`: только уникальные high-risk triggers/invariants/rules;
- skills: только workflow-specific trigger/scope/execution/output, без дублей base rules.

4. После анализа внеси правки в файлы, но:

- не меняй runtime code;
- не трогай generated outputs;
- не сканируй нерелевантные директории;
- не удаляй service-specific invariants;
- не расширяй scope без причины;
- не меняй язык вывода, если инструкция требует Russian by default.

5. Сохрани функциональность правил:

- analysis-only вопросы не должны запускать edits/write-capable commands;
- code changes только по explicit implement/fix/update/refactor/change;
- single-service tasks должны уходить в service `AGENTS.md`;
- cross-service/root work остается в root `AGENTS.md`;
- public/API/data/query/finance/cron/async/logger/MCP/RTB contracts должны быть защищены;
- MCP-first data access должен остаться;
- narrow checks должны остаться.

6. В конце дай отчет:

- какие файлы изменены;
- сколько слов/примерно токенов было и стало по каждому измененному файлу и суммарно;
- какой процент token reduction;
- какие safety rules сохранены;
- какие проверки запускались или почему не нужны.

Ограничения:

- Используй `rg`/`find` точечно, без полного обхода тяжелых директорий.
- Для анализа сначала читай только instruction-файлы.
- Для правок используй минимальные diff.
- Не запускай тесты: это docs/instruction-only change, если не менялся код.
- Если обнаружишь конфликт между инструкциями, не угадывай: зафиксируй его в отчете и предложи минимальную правку.
