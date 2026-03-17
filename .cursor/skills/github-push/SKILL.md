---
name: github-push
description: Push local git changes to a GitHub remote with safe defaults. Use when the user asks to push, upload, or sync code to a GitHub branch from the current workspace.
---

# GitHub Push

## Purpose

This skill helps the agent safely push local git changes from the current workspace to a GitHub repository using standard git commands and conservative safety rules.

Use this skill when:
- The user asks to **push** or **upload** code to GitHub
- The user wants to **sync a branch** with its remote
- The user mentions **`git push`**, **publishing changes**, or **opening a PR** and the branch is not yet pushed

## Preconditions

- Git is installed and available in the PATH.
- The repository is already initialized (`.git` exists).
- The user has push access to the remote and authentication (SSH key or token) is configured.
- The agent must **not** change git config or use destructive commands (no `push --force`, no `reset --hard`) unless the user explicitly and clearly requests it.

## Inputs

These are conceptual inputs; in Cursor they usually come from context and/or user instructions:

- **`repo_path`** (required): Local path of the git repository.
  - In Cursor, prefer the workspace root (e.g. `/home/.../project`).
- **`branch`** (required): Target branch name to push changes to.
  - If omitted by the user, infer from `git status` (current branch).
- **`commit_message`** (required): Commit message for the changes.
  - Prefer meaningful messages; follow any project conventions if known.
- **`remote`** (optional): Remote name. Default is `origin`.

## High-Level Workflow

1. Navigate to `repo_path`.
2. Verify repository and current branch.
3. Ensure on the correct target branch (create it if needed).
4. Pull latest changes from the remote branch (if it exists).
5. Stage relevant changes.
6. Commit with the provided message (if there is anything to commit).
7. Push to the remote branch.
8. Return a structured summary of what happened.

## Detailed Steps for the Agent

When using this skill in Cursor:

1. **Validate repo path**
   - Run `git status` via the shell tool in `repo_path`.
   - If it fails with “not a git repository”, stop and report an error.

2. **Determine current and target branch**
   - Run `git rev-parse --abbrev-ref HEAD` to get the current branch.
   - If the user did not specify a `branch`, use the current branch.
   - If the user specified a different `branch`:
     - Try `git checkout <branch>`.
     - If the branch does not exist, create it with `git checkout -b <branch>`.

3. **Pull latest changes**
   - Default `remote` to `origin` if not specified.
   - Run `git pull <remote> <branch>` to update the local branch.
   - If the pull fails due to merge conflicts, stop and report the error rather than attempting to auto-resolve.

4. **Stage changes**
   - Typically run `git add .` to stage all changes, **unless** the user requested a narrower scope.
   - Respect `.gitignore` and do not attempt to override it.

5. **Commit changes**
   - Before committing, check for staged changes:
     - Use `git diff --cached --quiet || echo "has_changes"` or `git status --porcelain`.
   - If there are **no staged changes**, skip the commit step and notify the user that nothing needed committing.
   - Otherwise run:
     - `git commit -m "<commit_message>"`
   - If commit fails (e.g. due to pre-commit hooks), surface the error output to the user so they can fix issues and retry.

6. **Push to remote**
   - Run `git push <remote> <branch>`.
   - Do **not** use `--force` or `--force-with-lease` unless the user explicitly requests a force push, and clearly understands the implications.
   - If the branch has never been pushed before, use:
     - `git push -u <remote> <branch>`

7. **Return structured result**

   Structure responses conceptually as:

   ```json
   {
     "status": "success | failed",
     "message": "Detailed execution result",
     "branch": "<branch_name>",
     "commit": "<commit_hash_if_successful>"
   }
   ```

   Implementation detail in Cursor: you may not literally return JSON, but your natural language response should convey the same fields.

## Reference Command Sequence

This is the typical command sequence this skill represents, using a templated form:

```bash
cd {{repo_path}}

git checkout {{branch}}  # or: git checkout -b {{branch}} if it doesn't exist

git pull {{remote || 'origin'}} {{branch}}

git add .

git commit -m "{{commit_message}}"   # only if there are staged changes

git push {{remote || 'origin'}} {{branch}}
```

## Error Handling Guidelines

When applying this skill:

- **Invalid repo path**
  - If commands fail with “not a git repository” or path errors, clearly state that the path is invalid or not a git repo and stop.

- **Branch does not exist**
  - Attempt `git checkout -b <branch>` to create it.
  - If creation fails, report the git error output.

- **No changes to commit**
  - If there are no staged changes, skip the commit step.
  - Inform the user that there were no new changes to commit, but you can still push if the branch is behind its remote.

- **Pull conflicts or push failures**
  - If `git pull` or `git push` fails, capture and report the git error output.
  - Do not attempt automatic conflict resolution or history rewriting.

## Examples

### Example 1: Push current branch

User intent:
- "Push my latest changes to GitHub with message `feat: add dashboard UI`."

Agent behavior:
- Use current workspace root as `repo_path`.
- Detect current branch (e.g. `feature/dashboard-ui`).
- Run the workflow above with:
  - `branch = "feature/dashboard-ui"`
  - `commit_message = "feat: add dashboard UI"`
  - `remote = "origin"`

### Example 2: Push to a specific branch

User intent:
- "Push everything here to the `main` branch."

Agent behavior:
- Use workspace root as `repo_path`.
- Checkout or create `main`.
- Pull from `origin main`.
- Stage, commit, and push as described above, summarizing results to the user.

