# Integration Guide for TypeScript + Nest Repository

This guide explains how to integrate the provided `AGENTS.md` and guide files into the repository.

## What You Are Installing

- one root `AGENTS.md` for always-on repository rules
- five narrow guide files under `openai/skills/`
- a compact structure that keeps persistent context short and loads detail only when needed

## Recommended Layout

```text
<repo-root>/
  AGENTS.md
  src/
    classes/
    helpers/
    logger/
    cli/
    nest/
  test/
  openai/
    skills/
      README.md
      typescript-style-and-typing-safety.md
      nest-and-cli-contract-safety.md
      logger-and-helper-safety.md
      test-placement-and-update-rules.md
      final-review-checklist.md
```

## Step 1 — Copy the Files

Copy these files into the repository root:

- `AGENTS.md`
- `openai/skills/README.md`
- all five guide files in `openai/skills/`

## Step 2 — Keep Root `AGENTS.md` Short

Do not move the detailed guide text into the root file.

The root file should stay focused on:

- global priorities
- repository conventions
- narrow change rules
- verification commands
- output expectations
- links to the detailed guide files

This keeps the persistent context efficient and reduces instruction noise.

## Step 3 — Use Real Commands As Written

This repository already has concrete commands. Keep them visible in the root `AGENTS.md`:

- `npm start`
- `npm run start:nest`
- `npm run build`
- `npm test`
- `npm run test:nest`
- `npm run lint`

If the repository later adds narrower commands, extend the verification section rather than replacing the current ones.

## Step 4 — Keep Style Rules Narrow and Enforceable

The root file already includes:

- TypeScript
- tabs
- single quotes
- trailing commas
- no `any`
- careful `Partial<T>` usage
- file naming conventions

Keep these in the root file because they are stable and always-on.

Put longer rationale or examples only in the guide files.

## Step 5 — Add Repo-Specific Details Where Needed

Update the guide files with concrete local knowledge if available.

Good additions:

- known CLI arguments that must remain stable
- Nest request or response shapes that are contract-sensitive
- logger output assumptions used by operations or tests
- shared helpers with high caller fan-out
- known DTO or config normalization patterns

Keep additions explicit and testable.

## Step 6 — Add Nested `AGENTS.md` Only If Needed

Start with only the root `AGENTS.md`.

Add nested files later only for high-risk subtrees such as:

- `src/cli/`
- `src/nest/`
- `src/logger/`
- especially sensitive helper areas

Add nested constraints only when repeated mistakes show a subtree needs stronger local guidance.

## Step 7 — Use the Guides by Task Type

Recommended mapping:

- typing or style-sensitive TypeScript work → `typescript-style-and-typing-safety.md`
- Nest handlers or CLI entrypoint → `nest-and-cli-contract-safety.md`
- shared helpers or logger behavior → `logger-and-helper-safety.md`
- test additions or updates → `test-placement-and-update-rules.md`
- final self-check → `final-review-checklist.md`

## Step 8 — Pilot Before Expanding

Roll this out in phases:

Phase 1:

- install the root `AGENTS.md`
- install the guide files
- do not add nested files yet

Phase 2:

- run several real tasks through the agent
- inspect the diffs and common mistakes

Phase 3:

- add only the repo-specific details and local nested files that proved necessary

## Step 9 — Maintenance Rule

Keep the split clean:

- always-on rules stay in root `AGENTS.md`
- longer task-specific instructions stay in `openai/skills/`
- subtree-specific rules go into nested `AGENTS.md` only when justified

This keeps the instruction system compact, composable, and maintainable.

```aiignore
    оформи папку openai как полноценные skill folders с SKILL.md и metadata.
```
