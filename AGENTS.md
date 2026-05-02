## Purpose

Safe changes in the `fa-node` TypeScript package. Preserve public exports, NestJS helper behavior, CLI behavior, logger behavior, repository conventions, and Jest/e2e test expectations.

## Scope

- Primary source: `src/`
- Tests: colocated `src/**/*.spec.ts`, `test/*.e2e-spec.ts`
- Package surface: `src/index.ts`, `package.json` exports/build/test scripts
- Build assets: `src/cli/migration-mongo.template.ts`
- Disallow: generated outputs (`dist/`, `coverage/`, `tmp/`, `.packages/`), unrelated package metadata churn, rewrites

## Source Scope (CRITICAL)

- Operate in `src/` and `test/` by default.
- Touch root config only when required for build, lint, test, package exports, or task requirements.
- Treat `playground/`, `nest/`, generated outputs, and local artifacts as out of scope unless the task explicitly targets them.
- Keep exploration to the minimal relevant path.

## Interaction Mode

- If the user asks a question, requests an explanation, asks "why", "how", "what does this do", or "should we", answer with analysis only.
- Do not edit files, run write-capable commands, or start implementation for explanation/analysis questions.
- Suggest code changes only after explaining the current behavior, tradeoffs, and risk.
- Make changes only when the user explicitly asks to implement, fix, update, refactor, or change files.

## Decision

1. determine whether the user asks for explanation/analysis or for code changes
2. if explanation/analysis only, inspect minimally and answer without edits
3. identify the affected module: `classes`, `helpers`, `logger`, `cli`, `utils`, package entrypoint, or e2e test
4. verify whether the change affects exported API through `src/index.ts`
5. if behavior changes, update or add the closest relevant test
6. if package/build behavior changes, verify `package.json`, `tsconfig*`, and build assets compatibility
7. if unclear, ask before expanding scope

## Safety System

- Preserve public contracts and exported names.
- Preserve async behavior and execution order.
- Preserve NestJS integration contracts and logger interfaces.
- Preserve CLI arguments, generated template behavior, and filesystem side effects unless explicitly required.
- Prefer the smallest local change over refactors.

## Priorities

1. correctness
2. production/package safety
3. public contract and test stability
4. repository consistency
5. minimal diff

## Invariants (CRITICAL)

Do not change unless required:

- public exports from `src/index.ts`
- package entrypoints, `main`, `types`, and `exports`
- test expectations and assertions
- async behavior and execution order
- CLI command names, arguments, output, and generated file layout
- logger levels, formats, targets, and Nest logger compatibility
- helper/class naming patterns and file layout

## Domain Rules

- `src/classes/`: reusable classes, decorators, validation/transform/middleware/route helpers; maintain NestJS and validation contracts.
- `src/helpers/`: pure or low-level utility functions; preserve edge-case behavior covered by specs.
- `src/logger/`: browser/node/Nest logger implementations and maps; keep environment-specific behavior isolated.
- `src/cli/`: Mongo migration CLI and template asset; keep generated output and template copying compatible with `npm run build`.
- `src/utils/`: small shared utilities; avoid promoting broad abstractions without need.
- `test/`: e2e coverage for Nest/package integration; update only for real behavior changes.

## Checks

- Run the narrowest relevant Jest spec for touched code.
- Run `npm test` when shared helpers, exports, logger behavior, or broad contracts change.
- Run `npm run test:nest` when Nest integration or e2e behavior changes.
- Run `npm run build` when exports, CLI assets, types, or package surface change.
- Run `npm run lint` when edits are broad or style-sensitive.

## Change Rules

- smallest local change
- no refactors or rewrites mixed with behavior changes
- no scope expansion
- preserve behavior by default
- keep changes targeted and reversible
- add or update tests only when required

## Output

- minimal diff
- changed code only
- short explanation if needed
