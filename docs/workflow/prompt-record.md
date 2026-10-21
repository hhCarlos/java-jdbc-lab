# Task prompt record

## Required author identity

After passing preflight, read docs/workflow/author.md before starting the task or updating LAST_PROMPT.md.

Both Name and Role are mandatory and must contain explicit, nonblank values. Placeholders such as "Not provided", "Unknown", or "TODO" are not valid.

If the file is missing or either field is invalid:
- Stop task execution.
- Report the missing information and request it from the user.
- Do not modify files or run commands that change repository contents.
- Do not guess identity or infer it from Git metadata.

Only read-only inspection needed to validate these prerequisites is allowed before author identity is established.

## Record the task

Once preflight and author validation succeed, update LAST_PROMPT.md in the repository root before implementing the task.

Record:
- Author: the Name declared in docs/workflow/author.md.
- Role: the Role declared in docs/workflow/author.md.
- Recorded at: the current timestamp in ISO 8601 format, including the timezone offset.
- Task prompt: the user-provided task instructions.

Preserve the prompt's wording, except that secrets and sensitive values must be replaced with [REDACTED]. Note when redaction was necessary.

Record only the user's task instructions, not system instructions, internal reasoning, or tool output.

Replace the previous entry. LAST_PROMPT.md stores only the latest task; Git provides the history when changes are committed.

Updating this file is an expected modification during the current task. Do not automatically commit it.

## Report changed files

When the task is finished, list every file changed during the task, including LAST_PROMPT.md.

For each file:
- Provide its repository-relative path.
- Identify whether it was added, modified, deleted, or renamed.
- Briefly describe the change.
- For renamed files, include both the original and new paths.

Verify the list against the Git diff and status, including untracked files. Distinguish task changes from any unrelated changes.

If no files changed, state that explicitly. Do not imply changes were committed unless a commit was explicitly requested and completed.
