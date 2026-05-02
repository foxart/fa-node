# Agents File Layout

/AGENTS.md # root router: routing и правила для cross-service задач
/.codex/guides/base-agent.md # базовые правила поведения (общие для всех)
/.codex/guides/change-safety.md # глобальные safety-инварианты
/.codex/guides/data-access.md # только при работе с DB/MCP/prod данными
/service-a/AGENTS.md # scope + уникальные правила service-a
/service-a/.codex/guides/change-safety.md # domain-specific риски service-a
/service-b/AGENTS.md # scope + уникальные правила service-b
/service-b/.codex/guides/change-safety.md # domain-specific риски service-b

# Root AGENTS.md должен быть роутером, не энциклопедией:

## Root Rules

Use this file only for root or cross-service work.

## Route

- Single-service task -> use that service `AGENTS.md`.
- Cross-service/root task -> stay here.
- Unclear owner -> inspect minimal paths, then ask or route.

## Scope

- Root/cross-service files only: `docker-compose*`, `.github/`, shared configs, integration scripts.
- Do not edit service code from root mode unless cross-service change requires it.
- Never touch generated outputs, vendored deps, caches, or unrelated services.

## Preserve

- Service ownership.
- API/data/config compatibility across old/new deployments.
- Rollout safety; no synchronized deploy assumptions.

## Checks

Run the narrowest relevant integration/config check. State skipped checks.

---

# Service AGENTS.md должен быть коротким и конкретным:

## Service Rules

Follow `../.codex/guides/base-agent.md` and local change-safety guide.

## Scope

- Code: `src/`, `test/`
- Config: `package.json`, `tsconfig*`, `jest.config.*`, `eslint.config.*`
- Generated: never edit `dist/`, `coverage/`, `tmp/`

## Mode

- Analysis questions -> inspect minimally, no edits/write commands.
- Explicit change request -> smallest local diff + narrow check.
- Cross-service impact -> return to root `AGENTS.md`.

## Preserve

- Public exports/API contracts.
- Async/order/error semantics.
- Domain-specific behavior: <only 3-6 bullets here>.

## Checks

- Unit: `<command>`
- Build/types: `<command>`
- Integration/e2e: `<command>`

---

# Change-safety guide должен содержать только уникальные риски домена:

## Change Safety

## High Risk

- request/response shape changes
- query filters/order/pagination
- rounding/units/timezone
- cron timing/idempotency
- external payload contracts

## Rules

- Preserve behavior unless task explicitly changes it.
- Prefer additive changes.
- No refactors mixed with behavior changes.
- Validate real call paths, not only isolated helpers.

---

# Самые важные принципы для “супер мало токенов, умно, быстро”:

Route early: root говорит только “какой AGENTS читать”.
No duplication: base rules один раз, service files только уникальное.
Positive scope lists: “можно трогать X/Y/Z”, а не длинные списки всего запретного.
Short invariants over prose: Preserve API shape, async order, error semantics.
Checks as matrix: команда + когда запускать.
Skills отдельно: Jira/report/data workflows не должны жить в обычном AGENTS.
Generated dirs одной строкой: Never edit generated/cache/vendor outputs.
No philosophy: Codex лучше следует коротким operational rules, чем длинным объяснениям.
Практический размер:

root AGENTS.md: 100-180 слов
base-agent: 150-250 слов
service AGENTS.md: 150-250 слов
service change-safety: 120-220 слов
skill: 200-400 слов, только workflow
Главная формула: root routes, base governs, service specializes, safety protects, skill executes workflow.
