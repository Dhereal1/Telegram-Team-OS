## Setup

| Command | Args | Role required | Description |
|---|---|---|---|
| `/start` | `ws_<inviteToken>` (group only) | None | Link a Telegram group to a workspace using an invite deep link. Example: `/start ws_abcd1234` |
| `/help` | (none) | Member | Show available commands (role-aware). Example: `/help` |

## Tasks

| Command | Args | Role required | Description |
|---|---|---|---|
| `/assign` | `@user task title [due:YYYY-MM-DD]` | Admin/Founder | Assign a task to a member. Example: `/assign @john Fix login due:2026-06-01` |
| `/tasks` | (none) | Member | List open tasks for the team (up to 10). Example: `/tasks` |
| `/mytasks` | (none) | Member | List your open tasks (up to 10). Example: `/mytasks` |
| `/done` | `taskIdPrefix` | Assignee or Admin/Founder | Mark a task as done. Example: `/done ckx1ab` |
| `/overdue` | (none) | Admin/Founder | List overdue tasks (up to 15). Example: `/overdue` |

## Reporting

| Command | Args | Role required | Description |
|---|---|---|---|
| `/report` | `text...` | Member | Submit (or update) today’s daily report. Example: `/report Shipped feature X; blocked by Y; next: Z` |
| `/status` | `text...` | Member | Post a lightweight status update (ActivityLog only). Example: `/status On calls until 3pm` |

## Team Management

| Command | Args | Role required | Description |
|---|---|---|---|
| `/approve` | `@user` | Admin/Founder | Approve a pending member. Example: `/approve @sarah` |
| `/remove` | `@user` | Admin/Founder | Remove (suspend) an active member. Example: `/remove @sarah` |
| `/setrole` | `@user admin\|member` | Founder only | Change a member’s role. Example: `/setrole @sarah admin` |

## Utility

| Command | Args | Role required | Description |
|---|---|---|---|
| `/summary` | (none) | Admin/Founder | Team performance summary + today’s health snapshot. Example: `/summary` |

