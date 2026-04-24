# TypeScript Repo Safety (Full)

Use when contracts, entrypoints, logger/helper behavior, tests, typing, or async behavior are involved.

---

## TypeScript Style and Typing

- no `any`
- prefer explicit types where behavior or contract matters
- use `Partial<T>` sparingly
- for config/DTO inputs, prefer explicit interfaces with optional fields
- keep normalized internal forms separate when needed
- preserve coercion, nullability, and normalization
- use tabs, single quotes, trailing commas
- avoid broad type churn

---

## Nest and CLI Contracts

- preserve Nest request/response shapes
- preserve CLI flags, argument parsing, exit semantics, output format
- preserve `npm start` and `npm run start:nest` startup behavior
- preserve error propagation and operational failures
- do not add async boundaries or reorder side effects unless required
- avoid adjacent cleanup in entrypoint-sensitive code

---

## Logger and Helper Safety

- preserve log timing, severity, message structure, and propagation
- preserve helper input/output behavior
- preserve side effects and error semantics
- avoid empty catches
- keep shared helper changes minimal
- do not generalize shared behavior unless required

---

## Test Placement and Updates

- unit tests live next to code as `*.spec.ts`
- e2e tests live in `test/` as `*.e2e-spec.ts`
- tests are required for new logic
- preserve fixture assumptions and test intent
- update only narrow relevant tests
- avoid broad test rewrites

---

## Repository and Command Safety

Do not change unless required:

- file naming conventions
- repository layout
- command behavior for `npm start`, `npm run start:nest`, `npm run build`, `npm test`, `npm run test:nest`, `npm run lint`
- Jest or ts-jest assumptions
- unit vs e2e placement conventions
- public class/service/helper/CLI behavior

---

## Invariants

Do not change unless required:

- defaults / fallbacks
- execution order / side effects
- async behavior
- Nest / CLI contracts
- logger behavior
- helper behavior
- test intent / fixtures
- naming / layout
- runtime coercion / nullability

---

## Final Check

- scope minimal
- behavior preserved
- contracts preserved
- async behavior preserved
- logger/helper behavior preserved
- tests added/updated only where needed
- no naming/layout drift
- no unnecessary type weakening
