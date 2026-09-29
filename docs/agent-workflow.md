# Agent workflow

GitHub Issues in [`Maseeek/do-it`](https://github.com/Maseeek/do-it/issues) holds the work queue. An issue is the smallest independently verifiable change. Its body states the outcome, scope, and acceptance criteria; comments hold discoveries and decisions. Keep the repository's Markdown files as the durable product and engineering context.

## Start a task

1. Read the open issues and choose one marked `ready-for-agent` with no assignee. Read its body and comments, linked issues, and blockers. The repository-specific commands are in [agents/issue-tracker.md](agents/issue-tracker.md). If the GitHub CLI is unavailable, use the connected GitHub app or browser.
2. Claim it by assigning yourself and leaving a short progress comment. Recheck assignment before editing: another agent may have claimed it at the same time.
3. For parallel agents, give each one a distinct file or directory ownership area and a checkable output. Share findings through the parent agent. Use separate worktrees for independent branches; agents in one checkout share a working tree, so concurrent edits to the same file need explicit coordination.
4. Read `CONTEXT.md`, relevant ADRs, and the relevant guide in `node_modules/next/dist/docs/` before editing Next.js code. Preserve existing uncommitted changes.

## Complete a task

1. Implement the smallest change that satisfies the issue. Update its acceptance criteria or post a comment if the work reveals a material scope change or blocker.
2. Run focused checks for the changed area, then `npm run check` for a code change. Report checks that could not run and why. For UI changes, inspect the running app in a browser.
3. Open a PR with a short explanation, evidence of verification, and `Closes #<issue-number>` when the issue is fully resolved. The [PR template](../.github/pull_request_template.md) provides the fields. Wait for review and CI before merging; the linked issue closes when the PR merges to the default branch.
4. If unfinished, leave the issue open with a concise progress comment, exact blocker, and next action so another agent can resume without rediscovering the work.

## Create and triage work

Use the [agent task template](../.github/ISSUE_TEMPLATE/agent-task.md) for an implementation slice and the [bug template](../.github/ISSUE_TEMPLATE/bug-report.md) for a reproduction. Apply exactly one state label from [agents/triage-labels.md](agents/triage-labels.md). Prefer `ready-for-agent` only when an agent can check success without guessing. Use native sub-issues and dependency links for larger plans when available. Keep Linear projects for other products untouched; this repository uses GitHub Issues.
