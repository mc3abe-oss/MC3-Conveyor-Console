---
description: Commit, merge to main, push, and clean up branch
allowed-tools: Bash(git *)
---

Ship the current branch: commit any changes, merge to main, push, and clean up.

## Steps

1. **Check current branch** - Get the current branch name. If already on `main`, stop and inform the user.

2. **Commit if needed** - Run `git status`. If there are uncommitted changes:
   - Stage all changes with `git add -A`
   - Ask the user for a commit message (or use a sensible default based on recent work)
   - Commit with the message

3. **Push the feature branch** - Push the current branch to origin to ensure it's backed up:
   ```
   git push -u origin <branch-name>
   ```

4. **Switch to main and pull** - Checkout main and pull latest:
   ```
   git checkout main
   git pull origin main
   ```

5. **Merge the feature branch** - Merge the feature branch into main:
   ```
   git merge <branch-name>
   ```
   If there are merge conflicts, STOP and report them to the user. Do not continue.

6. **Push main** - Push the merged main to origin:
   ```
   git push origin main
   ```

7. **Clean up** - Delete the local and remote feature branch:
   ```
   git branch -d <branch-name>
   git push origin --delete <branch-name>
   ```

8. **Report success** - Summarize what was done:
   - Commits made (if any)
   - Branch merged
   - Branches deleted

## Important

- NEVER force push
- STOP immediately if there are merge conflicts
- Ask for commit message if committing changes
- Store the branch name at the start since we'll need it after switching to main
