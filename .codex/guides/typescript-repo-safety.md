# TypeScript Repo Safety (Compact)

## Goal

Preserve behavior, contracts, typing, repository conventions, and tests.

---

## Decision

- local change → use this guide
- Nest / CLI / logger / helper / tests / typing contracts → use full guide
- uncertain → use full guide

---

## Triggers (→ FULL)

- Nest request/response behavior
- CLI flags, args, exit, output
- logger/helper behavior
- async or execution order
- public class/service/helper contracts
- test placement or fixture assumptions
- config/DTO-like typing
- file naming or repo layout

---

## Invariants

Do not change unless required:

- defaults, fallbacks, side effects
- execution order and async behavior
- Nest/CLI input-output contracts
- logger messages, severity, propagation
- helper input/output behavior
- public entrypoint behavior
- file naming and layout
- test intent and fixtures

---

## Rules

### TypeScript

- no `any`
- prefer explicit types
- use `Partial<T>` sparingly
- preserve coercion/nullability/normalization
- tabs, single quotes, trailing commas

### Nest / CLI

- preserve request/response shapes
- preserve flags, args, exit semantics, output
- preserve startup/shutdown behavior
- no hidden error swallowing

### Logger / Helpers

- preserve log timing/severity/message structure
- preserve helper outputs and errors
- avoid broad shared refactors

### Tests

- unit tests next to code as `*.spec.ts`
- e2e tests in `test/*.e2e-spec.ts`
- test new logic
- update only narrow relevant tests

---

## Validation

- no contract drift
- no async drift
- no logger/helper drift
- no naming/layout drift
- tests updated only where needed
- no type weakening
