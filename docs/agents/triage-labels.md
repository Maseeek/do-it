# Triage labels

The five state roles used by the installed engineering skills map directly to GitHub issue labels:

| Skill role | GitHub label | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Needs maintainer review |
| `needs-info` | `needs-info` | Waiting for more detail |
| `ready-for-agent` | `ready-for-agent` | Specified well enough for an agent to claim |
| `ready-for-human` | `ready-for-human` | Needs a human decision or implementation |
| `wontfix` | `wontfix` | Rejected or already implemented |

Each triaged issue should have exactly one state label. Use GitHub's `bug` or `enhancement` category label as appropriate. Remove the prior state label when moving an issue to another state. Read [issue-tracker.md](issue-tracker.md) for the repository and claim workflow.
