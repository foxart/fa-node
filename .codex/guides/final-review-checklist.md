# Final Review Checklist

Use this as the final self-check before returning code.

## Review Questions

- Keep the change local and narrow
- Preserve defaults, fallbacks, side effects, and execution order
- Preserve Nest and CLI input/output contracts
- Preserve logger and helper behaviors
- Preserve file naming conventions and repository layout
- Follow typing rules without using `any`
- Avoid `Partial<T>` unless it is the right fit
- Add or update tests only where needed
- Avoid unrelated test, formatting, or architecture changes

## Output Reminder

Return only changed code or a narrow diff.
Keep explanations short and focused on what changed, why it was necessary, and what was preserved.
