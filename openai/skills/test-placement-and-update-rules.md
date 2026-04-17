# Test Placement and Update Rules

Use this guide when adding or updating tests.

## Goal

Preserve repository test conventions and add only the narrowest tests needed.

## Rules

- Unit tests live next to code as `*.spec.ts`.
- e2e tests live in `test/` as `*.e2e-spec.ts`.
- Tests are required for new logic.
- Do not refactor unrelated tests.
- Preserve existing fixture assumptions and test intent unless the task requires change.
- Prefer the smallest test that protects the changed behavior.

## Safe Pattern

1. Determine whether the change is best covered by unit or e2e scope.
2. Add or update only the narrowest relevant test.
3. Keep existing naming and placement conventions.
4. Avoid expanding fixture scope without need.
5. Run the narrowest relevant validation command.

## Avoid

- moving tests between unit and e2e layers without need
- broad test rewrites
- changing assertions unrelated to the task
- adding redundant coverage for unchanged behavior
