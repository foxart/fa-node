# CODEX AGENTS SETUP USAGE GUIDE

## How to provide CODEX-AGENTS-SETUP.md to Codex

### Option 1 — Upload file (recommended)

1. Open Codex / ChatGPT with repo access
2. Upload CODEX-AGENTS-SETUP.md
3. Then say:

Use the uploaded CODEX-AGENTS-SETUP.md as the meta-instruction.

### Option 2 — Paste manually

Here is the setup instruction:

<paste file content>

Now apply it to the repository.

### Option 3 — If file is already in repo

Use CODEX-AGENTS-SETUP.md from the repository as the meta-instruction.

## If AGENTS do NOT exist use this prompt:

```text
Use CODEX-AGENTS-SETUP.md as the meta-instruction.
Create a minimal AGENTS system from scratch for this repository.
Tasks:
- Detect logical services from the repo structure.
- Create:
  /AGENTS.md
  /.codex/guides/base-agent.md
  /.codex/guides/change-safety.md
  /.codex/guides/data-access.md (if needed)
  /<service>/AGENTS.md
  /<service>/.codex/guides/change-safety.md
Rules:
- Follow templates from setup file
- Keep files small
- Use <command> TODO if unknown
After:
- Run validation checklist
- Return final response format
```

## If AGENTS already exist use this prompt:

```text
Use CODEX-AGENTS-SETUP.md as the meta-instruction.
Reorganize existing AGENTS system.
Tasks:
- Move shared rules → base-agent.md
- Move global risks → change-safety.md
- Move service rules → service AGENTS.md
- Move workflows → /.codex/skills/
- Remove duplication
- Shorten rules
Constraints:
- Root = router only
- No duplication
- No workflows in AGENTS
After:
- Run validation checklist
- Return final response format
```

## Final structure

/AGENTS.md
/.codex/guides/base-agent.md
/.codex/guides/change-safety.md
/<service>/AGENTS.md
/<service>/.codex/guides/change-safety.md

## Notes

- Do NOT store setup file in repo permanently
- Use it as a one-time instruction
- Keep AGENTS minimal
