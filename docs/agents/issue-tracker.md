# Issue tracker

GitHub Issues in [`Maseeek/do-it`](https://github.com/Maseeek/do-it/issues) is the source of truth for work on this product. Use `gh -R Maseeek/do-it` when reading or changing issues so commands work from any checkout.

## Working with issues

- Find work: `gh issue list -R Maseeek/do-it --state open --limit 100 --json number,title,labels,assignees,url`.
- Read the full request and discussion: `gh issue view <number> -R Maseeek/do-it --comments`.
- Create an issue: `gh issue create -R Maseeek/do-it --title "..." --body-file <path>`. Write multiline Markdown to a file before passing it to `gh`.
- Update labels or assignment: `gh issue edit <number> -R Maseeek/do-it --add-label <label>` or `--add-assignee '@me'`.
- Leave a progress note: `gh issue comment <number> -R Maseeek/do-it --body-file <path>`.
- Close completed work: `gh issue close <number> -R Maseeek/do-it --comment "..."`.

Read [triage-labels.md](triage-labels.md) before applying a state label. Select an unassigned `ready-for-agent` issue, read its entire thread, then claim it before editing code. Recheck the issue after claiming and coordinate ownership through the parent agent when agents share one GitHub account. Link the issue in the PR and close it only when its acceptance criteria are met.

## Planning and dependencies

Use one issue per independently verifiable slice of work. Keep scope, acceptance criteria, and blockers in its body. Link a planning issue to its children with GitHub sub-issues where available. If the repository does not support sub-issues or issue dependencies, use `Part of #<number>` and `Blocked by: #<number>` at the top of each child issue. Confirm every blocker is closed before starting.

For `/wayfinder`, a planning map is an issue labelled `wayfinder:map`; child issues use `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task` as appropriate. Prefer native GitHub sub-issues and dependencies when they are available.

## Pull requests as a triage surface

**PRs as a request surface: no.** Review PRs normally; `/triage` works from issues unless this flag is changed.

When a skill says to publish a ticket or fetch the relevant request, create or read a GitHub issue in this repository.
