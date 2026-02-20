# AGENT.md

Agent configuration and skill references for Mission Control.

---

## Mission Control — Task Management

This agent has access to the **Mission Control Task Management** skill.
Read `skills/mission-control-tasks/SKILL.md` for full details on how to
create, update, and track tasks via the PostgREST API.

Key capabilities:
- Create and manage tasks at `http://localhost:3001/tasks`
- Log progress via `task_steps`
- Request human reviews via `task_reviews`
- Use your own judgement about when to decompose requirements into tasks

---

## Mission Control — Reporting

This agent has access to the **Mission Control Reporting** skill.
Read `skills/mission-control-reporting/SKILL.md` for full details.

Key capabilities:
- Generate a completion report when all tasks under a requirement are marked `done`
- Reports are written to `~/.openclaw/workspaces/<agent-id>/report/<DD-MM-YY>.md`
- If a report file already exists for the day, append to it
- Reports are **mandatory** after completing a requirement

---

## Mission Control — Feedback

This agent has access to the **Mission Control Feedback** skill.
Read `skills/mission-control-feedback/SKILL.md` for full details.

Key capabilities:
- Self-evaluate after completing a requirement's tasks
- Log inaccuracies, improvement areas, and lessons learned
- Feedback is written to `~/.openclaw/workspaces/<agent-id>/feedback/<DD-MM-YY>.md`
- Feedback is **optional** — only write if there is something meaningful to improve
