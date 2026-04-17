# TypeScript Style and Typing Safety

Use this guide for `.ts` code, DTO-like inputs, config objects, and exported types.

## Goal

Preserve runtime behavior while maintaining repository typing and style conventions.

## Rules

- Do not use `any`.
- Prefer explicit types where behavior or contract matters.
- Use `Partial<T>` sparingly.
- For input configs and DTO-like shapes, prefer one explicit interface with optional fields.
- Keep the required normalized internal form as a separate internal type alias when needed.
- Preserve existing runtime coercion, nullability, and normalization behavior unless task-required.
- Follow repository style: tabs, single quotes, trailing commas.

## Safe Pattern

1. Keep typing local to the changed code.
2. Preserve current runtime behavior first.
3. Introduce explicit interfaces when they clarify input shape.
4. Keep normalized internal state separate from input shape when needed.
5. Avoid broad type churn outside the touched area.

## Avoid

- using `any` or weakening types to bypass issues
- replacing explicit input shape modeling with wide `Partial<T>` use
- broad formatting-only edits
- type changes that alter runtime behavior incidentally
