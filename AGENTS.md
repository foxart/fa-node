## Codex Rules

Safe, minimal changes in the single-package `fa-node` TypeScript project.

## Scope

- Work only in `src/`, `test/`, and root package/config files needed for build, test, lint, or package behavior: `package.json`, `tsconfig*`, `jest.config.*`, `eslint.config.*`.
- Special build asset: `src/cli/migration-mongo.template.ts` is copied by `npm run build`.
- Do not scan or edit unrelated repo paths.
- Do not touch `playground/` or `nest/` unless the task explicitly requires it.
- Never modify generated outputs: `dist/`, `coverage/`, `tmp/`, `.packages/`.

## Mode

- Analysis-only prompts (`why`, `how`, `what does this do`, `should we`) mean: inspect minimally, do not edit, do not run write-capable commands, explain current behavior, tradeoffs, and risk.
- Change prompts (`implement`, `fix`, `update`, `refactor`, `change`) mean: make the smallest local change, then run the narrowest useful check.
- If scope or intent is unclear, ask before changing files.

## Preserve

- Public exports and names in `src/index.ts`.
- Package entrypoints/contracts: `main`, `types`, `exports`, emitted declarations.
- NestJS helper/integration contracts.
- Logger browser/node/Nest behavior and environment-specific branches.
- CLI arguments, output, generated layout, build asset copying, and filesystem side effects.
- Async behavior, execution order, file layout, and naming patterns.

## Areas

- `classes`: NestJS-oriented classes, decorators, validation, transform, middleware, routes.
- `helpers`: utilities; preserve tested edge cases.
- `logger`: browser/node/Nest implementations; keep runtime branches isolated.
- `cli`: Mongo migration CLI and template; generated output must stay build-compatible.
- `utils`: small shared utilities; avoid broad abstractions.
- `test`: Jest specs and Nest e2e coverage.

## Change Rules

1. Prefer correctness, package safety, contract stability, test stability, minimal diff, then code quality.
2. No unrelated refactors, rewrites, metadata churn, broad formatting, dependency changes, lockfile changes, or generated-output edits unless explicitly requested.
3. Ask before leaving allowed scope, adding dependencies, changing lockfiles, touching generated outputs, or changing unrelated package metadata.
4. Treat any public export or package entrypoint change as a contract change; verify `src/index.ts`, `package.json`, imports, and declarations.
5. For behavior changes, validate real call paths and update/run the closest relevant test; do not rely on TypeScript compilation alone.
6. For CLI/template changes, verify generated file layout and `npm run build` asset copying.
7. For logger/Nest changes, verify the runtime branch and integration path.

## Checks

- Targeted unit: `npm test -- <target>`
- All unit: `npm test`
- Nest/e2e: `npm run test:nest`
- Build/types/package surface: `npm run build`
- Lint/style-sensitive changes: `npm run lint`

Run the narrowest useful check and state any skipped check with the reason.
