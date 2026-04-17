# Final Review Checklist

Use this as the final self-check before returning code.

## Review Questions

- Did the change stay local and narrow?
- Were defaults, fallbacks, side effects, and execution order preserved?
- Were Nest and CLI input/output contracts preserved?
- Were logger and helper behaviors preserved?
- Were file naming conventions and repository layout preserved?
- Were typing rules followed without using `any`?
- Was `Partial<T>` avoided unless it was clearly the right fit?
- Were tests added or updated only where needed?
- Were no unrelated test, formatting, or architecture changes introduced?

## Output Reminder

Return only changed code or a narrow diff.
Keep explanations short and focused on what changed, why it was needed, and what was preserved.
