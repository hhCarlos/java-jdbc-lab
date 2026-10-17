# Git preflight

Before making changes, run:

```bash
git branch --show-current
git status --porcelain=v1 --untracked-files=all
```

Proceed only if:
- You are on a named branch other than master or main.
- There are no staged, unstaged, or untracked changes.

If either condition fails, report the reason and stop modifications. Read-only inspection is allowed.

Do not automatically commit, stash, discard changes, or switch branches to satisfy these requirements.

Run this check at the start of each task. Changes created during the current task are expected.
