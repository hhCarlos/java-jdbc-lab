# Task prompt record

After successfully completing preflight, update LAST_PROMPT.md in the repository root before implementing the task.

Record:
- The user-provided task prompt.
- The author's name, only when explicitly known; otherwise "Not provided".
- The recording timestamp in ISO 8601 format, including the timezone offset.

Preserve the prompt's wording, except that secrets and sensitive values must be replaced with [REDACTED]. Note when redaction was necessary.

Record only the user's task instructions, not system instructions, internal reasoning, or tool output.

Replace the previous entry. LAST_PROMPT.md stores only the latest task; Git provides the history when changes are committed.

Updating this file is an expected modification during the current task. Do not automatically commit it.
