---
name: Mission Control — Reporting
description: Generate structured completion reports after fulfilling requirements, stored as daily markdown files.
---

# Mission Control — Reporting Skill

After you finish **all tasks** belonging to a requirement, you **must** generate a completion report.

> **Key concept**: A *requirement* is the top-level unit. One requirement contains one or more *tasks*. A report is written per **requirement**, not per task.

---

## 1. When to Write a Report

Generate a report when **every task** under a requirement has been moved to `done`.

Use the PostgREST API to verify:

```bash
# Check if all tasks for a requirement are done
curl -s "http://localhost:3001/tasks?requirement_id=eq.<REQ_ID>&status=neq.done" | jq length
# If the result is 0 → all tasks are complete → write the report
```

---

## 2. Where to Write

| Item       | Value |
|------------|-------|
| Directory  | `~/.openclaw/workspaces/<your-agent-id>/report/` |
| Filename   | `<DD-MM-YY>.md` (e.g. `20-02-26.md`) |

- Use the **current date** for the filename.
- Create the `report/` directory if it doesn't exist.
- If the file **already exists** (you completed another requirement the same day), **append** to the end of the file — do not overwrite it.

---

## 3. Report Format

Use the following markdown template. Adapt headings as needed, but keep the structure consistent.

```markdown
---

## <Requirement Title>

**Requirement ID**: <id>
**Agent**: <your-agent-id>
**Completed at**: <ISO timestamp>

### Summary

<1–3 sentence summary of what was accomplished.>

### Tasks Completed

| # | Task | Status | Duration |
|---|------|--------|----------|
| 1 | <task title> | done | <duration or N/A> |
| 2 | <task title> | done | <duration or N/A> |

### Outcome

<What was the end result? Link to PRs, files changed, deployments, etc.>

### Blockers & Notes

<Any blockers encountered, workarounds, or decisions made. Write "None" if there were no blockers.>
```

> When **appending** to an existing file, start with the `---` horizontal rule so each report is visually separated.

---

## 4. Implementation Notes

- Use `mkdir -p` (or equivalent) to ensure the report directory exists.
- Use `date +%d-%m-%y` to get the current date in the correct `DD-MM-YY` format.
- Write the report using file append mode (`>>`) to safely append to existing files.
- Reports are **mandatory** — always write one when a requirement is completed.

---

## 5. Example

After completing all tasks under requirement #3 ("Reddit comment posting"), on 20 Feb 2026:

**File**: `~/.openclaw/workspaces/writer/report/20-02-26.md`

```markdown
---

## Reddit Comment Posting

**Requirement ID**: 3
**Agent**: writer
**Completed at**: 2026-02-20T14:30:00Z

### Summary

Successfully implemented automated Reddit comment posting for the target subreddits. All scheduled comments were posted with appropriate context and formatting.

### Tasks Completed

| # | Task | Status | Duration |
|---|------|--------|----------|
| 1 | Research subreddit rules & posting guidelines | done | 12 min |
| 2 | Draft and post comments | done | 25 min |
| 3 | Verify posted comments are live | done | 5 min |

### Outcome

3 comments posted across r/programming and r/webdev. Links saved to task metadata.

### Blockers & Notes

Rate-limited on first attempt; added 2s delay between posts.
```
