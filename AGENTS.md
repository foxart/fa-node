## Purpose

Safe changes in a TypeScript repository with NestJS, CLI, Jest, and e2e tests.  
Goal: preserve behavior, contracts, repository conventions, and test expectations.

## Scope

Applies to:

- `src/` application code
- Nest entrypoints
- CLI entrypoints
- logger / helpers
- colocated `*.spec.ts`
- `test/*.e2e-spec.ts`

Do not:

- modify generated outputs (`dist/`, `coverage/`, `tmp/`)
- expand scope beyond task

## Source Scope (CRITICAL)

Primary code:

- `src/`
- `test/`

Rules:

- operate only within these directories unless required
- treat everything else as out of scope
- do not explore outside minimal relevant path

## Safety System

Follow:

- `.codex/guides/typescript-repo-safety.md`

Escalate to:

- `.codex/guides/typescript-repo-safety.full.md` when required

## Priorities

1. correctness
2. production safety
3. contract and test stability
4. repository consistency
5. minimal diff

## Invariants (CRITICAL)

Do not change unless required:

- public contracts and API behavior
- test expectations and assertions
- async behavior and execution order
- repository structure and conventions
- naming patterns and file layout

## Edit Permission (CRITICAL)

Do not change files without explicit user approval for the exact action.

Forbidden without explicit approval:

- direct code edits
- config edits
- dependency or lockfile changes
- formatting commands
- lint/test/build commands with auto-fix, update, write, cache, snapshot, install, generate, migrate, or other side effects
- package-manager commands that can modify `package.json`, lockfiles, `node_modules`, or generated files
- any command that can indirectly modify source, tests, config, generated outputs, cache files, or dependencies

Allowed without approval:

- read-only inspection commands
- read-only lint/test/build commands only when they are known not to write files or caches

If unsure whether a command can write files, ask the user first.

## Change Rules

- smallest local change
- no refactors or rewrites
- no scope expansion
- preserve behavior
- keep changes targeted and reversible

## Domain Rules

- preserve async behavior
- follow existing naming and layout
- add or update tests only when required

## Execution

- keep changes local
- do not mix refactor with behavior change

## Output

- minimal diff
- changed code only
- short explanation if needed
