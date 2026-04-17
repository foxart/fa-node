## Purpose

Safe changes in a TypeScript repository with NestJS components, local Jest tests, and e2e coverage.

Goal: preserve current behavior, repository conventions, and test expectations.

## Scope

Applies to:

- `src/` application code
  - `classes/`
  - `helpers/`
  - `logger/`
  - `cli/`
  - `nest/`
- colocated unit tests (`*.spec.ts`)
- e2e tests in `test/*.e2e-spec.ts`

Ignore generated outputs such as `dist/`, `coverage/`, and `temp/`.

## Core Rules

- Treat the codebase as contract-, behavior-, and test-sensitive.
- Preserve current behavior. Make the smallest local and reversible patch.
- If priorities conflict, use this order:

1. correctness
2. production safety
3. contract and test stability
4. repository consistency
5. minimal diff

Unless explicitly required by the task, do not change:

- defaults, fallbacks, and side effects
- execution order and async behavior
- request or response shapes used by Nest or CLI entry points
- logger behavior, emitted messages, or error propagation relied on by tests or operations
- CLI flags, argument parsing, exit semantics, or output format
- file naming conventions or repository layout
- test intent, fixture assumptions, or coverage target of existing tests

## Repository Conventions

- Use TypeScript.
- Use tabs, single quotes, and trailing commas.
- Do not use `any`.
- Prefer explicit types.
- Use `Partial<T>` sparingly.
- For config inputs and DTO-like shapes, prefer one explicit interface with optional fields.
- Keep the required normalized internal form as a separate internal type alias when needed.
- Follow existing file naming conventions:
  - `*.class.ts`
  - `*.helper.ts`
  - `*.service.ts`

## Change Rules

- Keep the scope narrow: no unrelated refactors, renames, formatting-only edits, or architecture rewrites.
- Follow existing local patterns in the touched area.
- Preserve current Nest, CLI, logger, helper, and class boundaries unless the task requires change.
- Add tests for new logic.
- Update only the narrowest tests needed for changed behavior.

Unless explicitly required, do not change:

- command behavior for `npm start`, `npm run start:nest`, `npm run build`, `npm test`, `npm run test:nest`, or `npm run lint`
- jest or ts-jest assumptions
- unit versus e2e test placement conventions
- public class, service, helper, or CLI entrypoint behavior
- async boundaries or loop behavior
- lint-driven style beyond the touched code

## Verification Commands

Use the narrowest relevant checks available:

- dev start: `npm start`
- nest start: `npm run start:nest`
- build: `npm run build`
- unit tests: `npm test`
- e2e tests: `npm run test:nest`
- lint: `npm run lint`

Prefer targeted validation when possible. Do not run the broader commands than necessary unless the task requires it.

## Checks

Before finishing, verify:

- no out-of-scope changes
- no unintended behavior or contract changes
- no file naming or repository layout drift
- no hidden async or CLI behavior changes
- no logger or error-handling drift unless task-required
- the new logic has appropriate tests
- no unnecessary weakening of types

## Output Format

- Return only changed code or a narrow diff.
- Do not rewrite broadly without a direct need.
- Keep explanations short.
- If explanation is included, state:
  - what changed
  - why it was necessary
  - what behavior or conventions were preserved

## Related Guides

Read these only when relevant to the task:

- `openai/skills/typescript-style-and-typing-safety.md`
- `openai/skills/nest-and-cli-contract-safety.md`
- `openai/skills/logger-and-helper-safety.md`
- `openai/skills/test-placement-and-update-rules.md`
- `openai/skills/final-review-checklist.md`
