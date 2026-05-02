# Codex Agents System Setup

Use this file as a meta-instruction for Codex.
Goal: reorganize existing agent instructions or create a new AGENTS system from scratch using a minimal, modular, token-efficient layout.

# 1. Target File Layout

Create or normalize the project to this structure:

```text
/AGENTS.md
/.codex/guides/base-agent.md
/.codex/guides/change-safety.md
/.codex/guides/data-access.md              # optional; only for DB/MCP/prod data work

/<service-a>/AGENTS.md
/<service-a>/.codex/guides/change-safety.md

/<service-b>/AGENTS.md
/<service-b>/.codex/guides/change-safety.md
```

Optional workflow/skill files may exist separately, for example:

```text
/.codex/skills/jira.md
/.codex/skills/reports.md
/.codex/skills/data-workflows.md
```

Do not put long workflows inside AGENTS files.

# 2. Core Principles

Follow these principles when creating or rewriting files:

- Route early: root tells Codex which AGENTS file to read.
- No duplication: base rules live once; service files contain only service-specific rules.
- Positive scope lists: define what may be touched, not long lists of everything forbidden.
- Short invariants over prose: preserve API shape, async order, error semantics.
- Checks as matrix: command + when to run it.
- Skills separately: Jira/report/data workflows do not belong in normal AGENTS files.
- Generated dirs in one line: never edit generated/cache/vendor outputs.
- No philosophy: short operational rules beat long explanations.
- Prefer minimal reads and minimal diffs.
- State skipped checks.

Target sizes:

```text
root AGENTS.md:                  100–180 words
base-agent.md:                   150–250 words
root change-safety.md:           120–220 words
service AGENTS.md:               150–250 words
service change-safety.md:        120–220 words
skill/workflow files:            200–400 words
```

Main formula:

```text
root routes, base governs, service specializes, safety protects, skill executes workflow
```

# 3. Reorganization Rules

If AGENTS or guide files already exist:

1. Preserve useful project-specific information.
2. Move shared behavior rules to `/.codex/guides/base-agent.md`.
3. Move global regression risks to `/.codex/guides/change-safety.md`.
4. Move service-specific scope and invariants to that service's `AGENTS.md`.
5. Move service-specific risks to that service's `.codex/guides/change-safety.md`.
6. Move long workflows to `.codex/skills/*.md`.
7. Remove duplication.
8. Shorten prose into operational rules.
9. Keep root as a router, not an encyclopedia.
10. Do not invent commands if unknown; use `<command>` placeholders and mark them TODO.

If no AGENTS system exists, create the files from the templates below.

# 4. Root AGENTS.md

Create or rewrite `/AGENTS.md`.

Root must be a router, not an encyclopedia.

## Template

```md
# Root AGENTS

## Root Rules

Use this file only for root or cross-service work.

## Route

- Single-service task -> use that service `AGENTS.md`.
- Cross-service/root task -> stay here.
- Unclear owner -> inspect minimal paths, then ask or route.

## Scope

Root/cross-service files only:

- `docker-compose*`
- `.github/`
- shared configs
- integration scripts
- repo-level tooling

Do not edit service code from root mode unless cross-service change requires it.

Never touch generated outputs, vendored deps, caches, or unrelated services.

## Preserve

- Service ownership.
- API/data/config compatibility across old/new deployments.
- Rollout safety; no synchronized deploy assumptions.

## Checks

Run the narrowest relevant integration/config check.

State skipped checks.
```

# 5. Base Agent Guide

Create or rewrite `/.codex/guides/base-agent.md`.

This file contains common behavior used by every agent.

## Template

```md
# Base Agent Rules

## Decision Model

1. Identify scope: root, service, or workflow.
2. Load only the relevant AGENTS and guides.
3. Inspect minimal files before deciding.
4. Prefer the smallest safe change.
5. Stop and escalate when scope expands.

## Modes

### Analysis Mode

- Read-only.
- No file writes.
- No state-changing commands.
- Inspect minimally and answer directly.

### Change Mode

- Only after explicit change request.
- Apply the smallest local diff.
- Do not mix refactors with behavior changes.
- Run narrow checks when practical.

## Read Strategy

- Prefer targeted reads over repo-wide scans.
- Read nearby tests before changing behavior.
- Avoid loading generated/vendor/cache outputs.

## Write Permissions

- Modify only files inside the active scope.
- Do not create files unless required.
- Do not rename/move files unless required.
- Never edit generated/cache/vendor outputs.

## Output Style

- Be concise and operational.
- State changed files.
- State checks run and skipped.
- Mention risk when touching high-risk areas.
```

# 6. Global Change Safety Guide

Create or rewrite `/.codex/guides/change-safety.md`.

This file contains global safety invariants only.

## Template

```md
# Global Change Safety

## High Risk

- Request/response shape changes
  - controllers, DTOs, serializers, schemas

- Query filters/order/pagination
  - WHERE, ORDER BY, LIMIT, cursor logic

- Rounding/units/timezone
  - timestamps, currency, units, conversions

- Async/order/error semantics
  - retries, race conditions, cancellation, backoff

- Cron timing/idempotency
  - schedule changes, duplicate processing, replay safety

- External payload contracts
  - webhooks, third-party APIs, headers, signatures

## Rules

- Preserve behavior unless task explicitly changes it.
- Prefer additive changes.
- No refactors mixed with behavior changes.
- Validate real call paths, not only isolated helpers.
- Keep old/new deployment compatibility in mind.
- Avoid synchronized deploy assumptions.
```

# 7. Optional Data Access Guide

Create `/.codex/guides/data-access.md` only if the repo uses DB, MCP, analytics, production data, or customer data.

## Template

```md
# Data Access Rules

Use this guide only when working with DB, MCP, analytics, production data, or customer data.

## Default

- Prefer read-only access.
- Use the narrowest query.
- Avoid full-table scans unless explicitly needed.
- Do not expose secrets or personal data.

## Production Safety

- Never run destructive commands without explicit user request.
- Never modify production data while investigating.
- Confirm environment before any write.
- Prefer test/staging examples over production examples.

## Queries

- Limit result size.
- Select only needed columns.
- Avoid dumping raw customer data.
- Redact sensitive values in outputs.

## MCP / External Data

- Treat external data as live and sensitive.
- Do not assume schemas are stable.
- Validate tool output before acting on it.
```

# 8. Service AGENTS.md

For each service, create or rewrite:

```text
/<service>/AGENTS.md
```

Service AGENTS must be short and concrete.

## Template

```md
# Service AGENTS

## Service Rules

Follow:

- `../.codex/guides/base-agent.md`
- `../.codex/guides/change-safety.md`
- local `.codex/guides/change-safety.md`

## Scope

Allowed:

- Code: `src/`, `test/`
- Config: `package.json`, `tsconfig*`, `jest.config.*`, `eslint.config.*`
- Docs directly related to this service

Generated:

- Never edit `dist/`, `coverage/`, `tmp/`, cache, vendor, or generated outputs.

## Mode

- Analysis questions -> inspect minimally, no edits/write commands.
- Explicit change request -> smallest local diff + narrow check.
- Cross-service impact -> return to root `AGENTS.md`.

## Escalation

Return to root if:

- Another service is affected.
- Shared API/schema/config is modified.
- Infra/config outside this service is touched.
- A coordinated rollout may be required.

## Preserve

- Public exports/API contracts.
- Async/order/error semantics.
- Domain-specific behavior:
  - <3–6 bullets only>
  - <keep these unique to this service>
  - <avoid generic rules already in base>

## Checks

| Check | Command | When |
||||
| Unit | `<command>` | local logic/test changes |
| Build/types | `<command>` | exported types/config changes |
| Integration/e2e | `<command>` | API, DB, or cross-boundary changes |
```

# 9. Service Change Safety Guide

For each service, create or rewrite:

```text
/<service>/.codex/guides/change-safety.md
```

This file must contain only unique domain risks for that service.

## Template

```md
# Service Change Safety

## High Risk

- <domain-specific request/response shape>
- <domain-specific query filters/order/pagination>
- <domain-specific rounding/units/timezone>
- <domain-specific cron timing/idempotency>
- <domain-specific external payload contracts>
- <domain-specific critical flows: auth, billing, permissions, etc.>

## Detection Hints

Treat these as high-risk signals:

- Editing DTOs, serializers, schemas, or public exports.
- Changing WHERE, ORDER BY, LIMIT, cursors, or pagination.
- Touching timestamps, timezones, currency, rounding, or units.
- Changing retries, queue processing, cron jobs, or idempotency keys.
- Modifying webhook payloads, headers, signatures, or third-party calls.

## Rules

- Preserve behavior unless task explicitly changes it.
- Prefer additive changes.
- No refactors mixed with behavior changes.
- Validate real call paths, not only isolated helpers.
- Update or add narrow tests when behavior is intentionally changed.
```

# 10. Optional Skills / Workflows

Create skill files only for repeatable workflows that are not normal coding rules.

Examples:

```text
/.codex/skills/jira.md
/.codex/skills/reporting.md
/.codex/skills/data-investigation.md
/.codex/skills/release-checklist.md
```

## Skill File Rules

- 200–400 words.
- One workflow per file.
- Include trigger, inputs, steps, output format.
- Do not duplicate base/service rules.
- Do not include broad philosophy.

## Template

```md
# <Workflow Name>

## Trigger

Use this skill when:

- <specific trigger>
- <specific trigger>

## Inputs

Required:

- <input>

Optional:

- <input>

## Steps

1. <step>
2. <step>
3. <step>

## Output

Return:

- <artifact or answer format>
- checks performed
- assumptions or skipped steps
```

# 11. Final Validation Checklist

After creating or reorganizing files, verify:

- `/AGENTS.md` is routing-only.
- Base rules appear only in `base-agent.md`.
- Global risks appear only in root `change-safety.md`.
- Service AGENTS contain only scope, preserve rules, escalation, and checks.
- Service safety files contain only domain-specific risks.
- Long workflows are moved to `.codex/skills/*.md`.
- Generated/cache/vendor directories are forbidden in one short rule.
- Files are within target size ranges.
- Check commands are real when discoverable; otherwise left as `<command>` TODO.
- No duplicated generic rules across service files.
- No service-specific logic in root.

# 12. Final Response Format For Codex

After completing the work, respond with:

```text
Done.

Created/updated:
- <file>
- <file>

Moved/normalized:
- <what moved where>

Checks:
- <command> — passed/skipped + reason

Notes:
- <important assumptions>
- <remaining TODO placeholders>
```
