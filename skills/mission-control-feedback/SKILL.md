---
name: Mission Control — Feedback
description: Self-evaluate after completing requirements. Log inaccuracies, improvement areas, and lessons learned to become a better agent over time.
---

# Mission Control — Feedback Skill

After completing all tasks under a requirement, you **may** write a self-evaluation feedback entry — but **only if you have something meaningful to say**.

> **This is not compulsory.** If the requirement was straightforward and you have no improvement notes, skip this step entirely. Do not write "No feedback" entries.

---

## 1. When to Write Feedback

Consider writing feedback when, after completing a requirement, you notice any of:

- **Inaccuracies** — You produced incorrect output that needed correction
- **Missed steps** — You skipped something that caused rework
- **Inefficiency** — You took a roundabout approach where a better one existed
- **Edge cases** — You hit unexpected scenarios not covered by the initial plan
- **Tool issues** — A tool or API behaved differently than expected
- **Knowledge gaps** — You lacked context that a human or past experience could have provided

If **none** of these apply, do **not** write feedback. A clean execution needs no feedback file entry.

---

## 2. Where to Write

| Item       | Value |
|------------|-------|
| Directory  | `~/.openclaw/workspaces/<your-agent-id>/feedback/` |
| Filename   | `<DD-MM-YY>.md` (e.g. `20-02-26.md`) |

- Use the **current date** for the filename.
- Create the `feedback/` directory if it doesn't exist.
- If the file **already exists**, **append** — do not overwrite.

---

## 3. Feedback Format

```markdown
---

## Feedback: <Requirement Title>

**Requirement ID**: <id>
**Agent**: <your-agent-id>
**Date**: <ISO timestamp>

### What went wrong

<Describe any inaccuracies, errors, or incorrect output you produced.>

### What could be improved

<Describe inefficiencies, suboptimal decisions, or missed opportunities.>

### Lessons for next time

<Concrete, actionable takeaways. What would you do differently?>
```

> When **appending** to an existing file, start with the `---` horizontal rule to separate entries.

> **Omit sections** that don't apply. If only "Lessons for next time" is relevant, just write that section.

---

## 4. Implementation Notes

- Use `mkdir -p` (or equivalent) to ensure the feedback directory exists.
- Use `date +%d-%m-%y` to get the current date in `DD-MM-YY` format.
- Write using file append mode (`>>`).
- **Do not insert placeholder entries.** If you have no feedback, write nothing.

---

## 5. Example

After completing requirement #3 ("Reddit comment posting"), the agent noticed it was rate-limited and had to retry:

**File**: `~/.openclaw/workspaces/writer/feedback/20-02-26.md`

```markdown
---

## Feedback: Reddit Comment Posting

**Requirement ID**: 3
**Agent**: writer
**Date**: 2026-02-20T14:35:00Z

### What went wrong

First comment post attempt hit Reddit's rate limiter (HTTP 429). I hadn't checked the subreddit's rate-limit headers before posting.

### Lessons for next time

Always check `X-Ratelimit-Remaining` and `X-Ratelimit-Reset` headers before making sequential API calls. Add a configurable delay between posts (minimum 2 seconds for Reddit).
```
