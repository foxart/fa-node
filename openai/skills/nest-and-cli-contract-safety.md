# Nest and CLI Contract Safety

Use this guide for changes in `src/nest/`, `src/cli/`, or any public entrypoint behavior.

## Goal

Preserve request, response, argument, startup, and exit behavior while making the smallest safe patch.

## Rules

- Preserve request and response shapes used by Nest handlers unless task-required.
- Preserve CLI flag names, argument parsing, exit semantics, and output format unless required.
- Preserve startup behavior for `npm start` and `npm run start:nest` unless required.
- Preserve error propagation and operationally relied-on failures unless the task explicitly changes them.
- Do not add new async boundaries or reorder side effects without a need.

## Safe Pattern

1. Identify the current entrypoint contract.
2. Change only the minimum local logic required.
3. Preserve visible input and output behavior.
4. Preserve startup and shutdown expectations.
5. Avoid adjacent cleanup in entrypoint-sensitive code.

## Avoid

- changing CLI help or output incidentally
- changing Nest handler shapes accidentally
- hiding errors behind generic catches
- mixing refactoring with contract-sensitive entrypoint edits
