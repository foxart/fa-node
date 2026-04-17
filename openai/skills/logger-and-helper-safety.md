# Logger and Helper Safety

Use this guide for `src/logger/`, `src/helpers/`, and shared utility paths.

## Goal

Preserve shared behavior and operational assumptions in logging and helper code.

## Rules

- Preserve log message timing, severity, and propagation unless task-required.
- Preserve helper input and output behavior relied on by callers.
- Keep shared helper changes minimal because blast radius is high.
- Preserve existing error semantics and avoid empty catches.
- Do not generalize or centralize behavior unless the task explicitly requires it.

## Safe Pattern

1. Identify all direct callers in the touched area.
2. Change the smallest local shared behavior possible.
3. Preserve output shape, side effects, and error semantics.
4. Keep logger behavior stable unless the task targets it.
5. Avoid unrelated helper cleanup in the same patch.

## Avoid

- broad helper refactors
- changing log text or structure incidentally
- making shared helpers more permissive without need
- hiding exceptions or changing failure timing
