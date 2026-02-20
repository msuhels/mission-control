---
name: Mission Control — Task Management
description: Interact with the Mission Control PostgREST API to manage tasks, log progress, and request reviews.
---

# Mission Control — Task Management Skill

You have access to a **Mission Control** system backed by PostgreSQL + PostgREST.
Use it to organise your work, track progress, and communicate status to your team and human operators.

> **Philosophy**: You are trusted to use your own judgement about _when_ and _how_ to create, decompose, and update tasks. The guidance below is a reference — not a rigid playbook. Adapt it to the situation.

---

## 1. Connection Details

| Variable        | Value                         | Notes                          |
|-----------------|-------------------------------|--------------------------------|
| `POSTGREST_URL` | `http://localhost:3001`       | Default dev port               |
| Auth            | None required for `web_anon`  | No JWT needed in dev           |
| Content-Type    | `application/json`            | Required for POST/PATCH        |

All endpoints are under the PostgREST API schema. Tables are prefixed with nothing — just use the table name directly (e.g. `/tasks`, `/task_steps`).

---

## 2. Database Schema

### `tasks` — The main work items

| Column           | Type                                          | Default    | Notes                              |
|------------------|-----------------------------------------------|------------|------------------------------------|
| `id`             | `bigserial` (PK)                              | auto       |                                    |
| `requirement_id` | `bigint` (FK → requirements)                  | null       | Link to a recurring requirement    |
| `title`          | `text`                                        | —          | **Required**                       |
| `description`    | `text`                                        | null       | Rich detail about the task         |
| `status`         | enum: `inbox` `in_progress` `review` `done`   | `inbox`    |                                    |
| `priority`       | enum: `low` `medium` `high` `critical`        | `medium`   |                                    |
| `agent_id`       | `text`                                        | null       | Your agent name/ID                 |
| `session_key`    | `text`                                        | null       | Links to the OpenClaw session      |
| `due_at`         | `timestamptz`                                 | null       |                                    |
| `started_at`     | `timestamptz`                                 | null       | Set when moving to `in_progress`   |
| `completed_at`   | `timestamptz`                                 | null       | Set when moving to `done`          |
| `tags`           | `jsonb`                                       | `[]`       | Array of string labels             |
| `metadata`       | `jsonb`                                       | `{}`       | Any extra structured data          |
| `created_at`     | `timestamptz`                                 | `now()`    |                                    |
| `updated_at`     | `timestamptz`                                 | `now()`    | Auto-updated via trigger           |

### `task_steps` — Execution log / progress tracking

| Column        | Type                                                      | Default   |
|---------------|-----------------------------------------------------------|-----------|
| `id`          | `bigserial` (PK)                                          | auto      |
| `task_id`     | `bigint` (FK → tasks, CASCADE)                            | —         |
| `title`       | `text`                                                    | —         |
| `description` | `text`                                                    | null      |
| `status`      | enum: `pending` `in_progress` `completed` `failed` `skipped` | `pending` |
| `agent_note`  | `text`                                                    | null      |
| `duration_ms` | `integer`                                                 | null      |
| `sort_order`  | `integer`                                                 | `0`       |
| `created_at`  | `timestamptz`                                             | `now()`   |

### `task_reviews` — Review / approval requests

| Column             | Type                                        | Default    |
|--------------------|---------------------------------------------|------------|
| `id`               | `bigserial` (PK)                            | auto       |
| `task_id`          | `bigint` (FK → tasks, CASCADE)              | —          |
| `reason`           | `text`                                      | —          |
| `confidence`       | `integer` (0–100)                           | null       |
| `status`           | enum: `pending` `approved` `rejected`       | `pending`  |
| `reviewer_comment` | `text`                                      | null       |
| `created_at`       | `timestamptz`                               | `now()`    |
| `resolved_at`      | `timestamptz`                               | null       |

### `requirements` — Recurring templates / goals

| Column        | Type           | Default  | Notes                            |
|---------------|----------------|----------|----------------------------------|
| `id`          | `bigserial`    | auto     |                                  |
| `title`       | `text`         | —        | **Required**                     |
| `description` | `text`         | null     |                                  |
| `cron_job_id` | `text` (unique)| null     | Links to OpenClaw cron job       |
| `cron_expr`   | `text`         | null     | For display (e.g. `0 9 * * 1`)  |
| `agent_id`    | `text`         | null     |                                  |
| `is_active`   | `boolean`      | `true`   |                                  |
| `tags`        | `jsonb`        | `[]`     |                                  |

---

## 3. API Reference (curl)

PostgREST exposes a RESTful API. Below are the key operations.

### 3.1 Tasks

#### List all tasks
```bash
curl -s http://localhost:3001/tasks | jq .
```

#### List tasks with filters
```bash
# By status
curl -s "http://localhost:3001/tasks?status=eq.inbox" | jq .

# By agent
curl -s "http://localhost:3001/tasks?agent_id=eq.writer" | jq .

# By priority, ordered by creation date
curl -s "http://localhost:3001/tasks?priority=eq.high&order=created_at.desc" | jq .

# Multiple statuses (OR)
curl -s "http://localhost:3001/tasks?status=in.(inbox,in_progress)" | jq .

# Search title (case-insensitive)
curl -s "http://localhost:3001/tasks?title=ilike.*deploy*" | jq .
```

#### Create a task
```bash
curl -s -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based auth flow with login/logout",
    "priority": "high",
    "agent_id": "YOUR_AGENT_ID",
    "tags": ["backend", "security"]
  }' | jq .
```

#### Update a task
```bash
# Move to in_progress
curl -s -X PATCH "http://localhost:3001/tasks?id=eq.1" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "status": "in_progress",
    "started_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }' | jq .

# Mark as done
curl -s -X PATCH "http://localhost:3001/tasks?id=eq.1" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "status": "done",
    "completed_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }' | jq .

# Update priority
curl -s -X PATCH "http://localhost:3001/tasks?id=eq.1" \
  -H "Content-Type: application/json" \
  -d '{"priority": "critical"}'
```

#### Delete a task
```bash
curl -s -X DELETE "http://localhost:3001/tasks?id=eq.1"
```

### 3.2 Task Steps (Progress Log)

#### Add a step to a task
```bash
curl -s -X POST http://localhost:3001/task_steps \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "task_id": 1,
    "title": "Analyzed existing codebase",
    "description": "Reviewed auth patterns in the project, identified integration points",
    "status": "completed",
    "agent_note": "Found existing session middleware that can be extended",
    "duration_ms": 45000,
    "sort_order": 1
  }' | jq .
```

#### List steps for a task
```bash
curl -s "http://localhost:3001/task_steps?task_id=eq.1&order=sort_order.asc" | jq .
```

#### Update step status
```bash
curl -s -X PATCH "http://localhost:3001/task_steps?id=eq.5" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "duration_ms": 30000}'
```

### 3.3 Task Reviews

#### Request a review
```bash
curl -s -X POST http://localhost:3001/task_reviews \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "task_id": 1,
    "reason": "Architecture decision: chose JWT over session cookies. Need human approval before proceeding.",
    "confidence": 75
  }' | jq .
```

#### List reviews for a task
```bash
curl -s "http://localhost:3001/task_reviews?task_id=eq.1&order=created_at.desc" | jq .
```

#### Check for pending reviews (across all tasks)
```bash
curl -s "http://localhost:3001/task_reviews?status=eq.pending" | jq .
```

### 3.4 Requirements

#### Create a requirement
```bash
curl -s -X POST http://localhost:3001/requirements \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Weekly code quality report",
    "description": "Run linting, test coverage, and dependency audit every Monday",
    "agent_id": "tester",
    "cron_expr": "0 9 * * 1",
    "tags": ["quality", "automated"]
  }' | jq .
```

#### List active requirements
```bash
curl -s "http://localhost:3001/requirements?is_active=eq.true" | jq .
```

---

## 4. PostgREST Query Cheatsheet

| Operation                    | Syntax                                  |
|------------------------------|-----------------------------------------|
| Equals                       | `?column=eq.value`                      |
| Not equals                   | `?column=neq.value`                     |
| Greater than                 | `?column=gt.value`                      |
| Less than                    | `?column=lt.value`                      |
| In list                      | `?column=in.(a,b,c)`                    |
| Pattern match (case-insens.) | `?column=ilike.*pattern*`               |
| Is null                      | `?column=is.null`                       |
| Is not null                  | `?column=not.is.null`                   |
| Order ascending              | `?order=column.asc`                     |
| Order descending             | `?order=column.desc`                    |
| Limit results                | `?limit=10`                             |
| Offset (pagination)          | `?offset=20`                            |
| Select specific columns      | `?select=id,title,status`              |
| Return created/updated row   | `-H "Prefer: return=representation"`    |
| Count only                   | `-H "Prefer: count=exact"` + check `Content-Range` header |

---

## 5. Workflow Guidance

### Task Decomposition — MANDATORY

**You MUST always decompose a user request into multiple, granular tasks.** Never create a single task for an entire request. Each task should represent one distinct, actionable step.

Think of it like this: if a human manager gave you the request, what would your to-do list look like? Each item on that list is a separate task.

```
User request: "Search top post in AGI subreddit, find the top comment, and comment on it"

✅ CORRECT decomposition:
  Requirement → Task 1: Open Reddit and navigate to r/AGI subreddit
              → Task 2: Find the top post in the subreddit
              → Task 3: Identify the top comment on that post
              → Task 4: Compose and post a reply to the top comment

❌ WRONG — single monolithic task:
  Requirement → Task 1: Search top post in AGI subreddit and comment on it
```

**Rules for decomposition:**

1. **Each task = one action.** If a task title contains "and", it's probably two tasks.
2. **Tasks should be sequential or parallel.** Order them logically via `sort_order` or creation order.
3. **Be specific.** "Research the topic" is too vague. "Find top 5 posts in r/AGI sorted by upvotes" is good.
4. **Keep tasks small.** A task that takes more than a few minutes of focused work should be split further.

### Tasks vs. Implicit Actions

Some actions are part of your workflow but should **NOT** be created as tasks:

| Action | Create a task? | Why |
|--------|---------------|-----|
| Navigating to a website | ✅ Yes | Distinct action step |
| Writing code | ✅ Yes | Core work |
| Generating a **report** | ❌ No | Implicit — handled by the Reporting skill |
| Writing **feedback** | ❌ No | Implicit — handled by the Feedback skill |
| Updating task status | ❌ No | Meta-action, not real work |

> **Reporting and feedback are automatic responsibilities.** You do them after completing a requirement, but you never create tasks for them. They are part of your operating protocol, not the user's request.

### Typical task lifecycle

```
inbox → in_progress → review → done
         ↑                |
         └── rejected ────┘
```

1. **inbox**: Task is created but not started
2. **in_progress**: Actively being worked on — set `started_at` and `agent_id`
3. **review**: Work is done, awaiting human review — create a `task_review`
4. **done**: Approved and complete — set `completed_at`

### Logging your progress

As you work, consider adding `task_steps` to create an audit trail.
This helps humans understand what you did and why.

Good step titles are action-oriented:
- ✅ "Analyzed database schema for migration paths"
- ✅ "Implemented rate limiting middleware"
- ✅ "Fixed failing test in auth module"
- ❌ "Step 1" / "Did stuff"

### When to request a review

Use your judgement. Some situations where a review is valuable:
- You made a significant architectural decision
- You're uncertain about a trade-off (use `confidence` to express this)
- The work has security, data, or cost implications
- You hit a blocker and need human input

### Using metadata

The `metadata` JSONB field on tasks is yours to use freely.
Store anything that helps you or other agents:

```json
{
  "source_file": "src/auth/jwt.ts",
  "related_prs": [42, 45],
  "estimated_effort": "2h",
  "blockers": ["waiting for API key"],
  "context": "User asked for this in session abc-123"
}
```

### Tags

Tags are useful for categorisation and filtering.
Some suggested conventions (adapt as needed):

| Tag           | Meaning                          |
|---------------|----------------------------------|
| `backend`     | Backend/server work              |
| `frontend`    | Frontend/UI work                 |
| `bug`         | Bug fix                          |
| `feature`     | New feature                      |
| `refactor`    | Code improvement                 |
| `docs`        | Documentation                    |
| `security`    | Security-related                 |
| `blocked`     | Waiting on external input        |
| `automated`   | Generated by cron/automation     |

---

## 6. Identifying Yourself

When creating or updating tasks, set `agent_id` to your agent name so the team knows who's working on what. This also lets you filter for your own tasks:

```bash
# Find my open tasks
curl -s "http://localhost:3001/tasks?agent_id=eq.MY_AGENT_ID&status=in.(inbox,in_progress,review)&order=priority.desc,created_at.asc" | jq .
```

---

## 7. Error Handling

PostgREST returns standard HTTP codes:

| Code | Meaning                                                |
|------|--------------------------------------------------------|
| 200  | Success (GET, PATCH)                                   |
| 201  | Created (POST with `Prefer: return=representation`)    |
| 204  | Success, no content (DELETE, PATCH without Prefer)     |
| 400  | Bad request (invalid JSON, constraint violation)       |
| 404  | Table/endpoint not found                               |
| 409  | Conflict (unique constraint violation)                 |

If a request fails, read the response body — PostgREST provides descriptive error messages including the constraint name and details.

---

## 8. Quick Start Recipes

### "I just got a new requirement — set everything up"
```bash
# 1. Create the parent task
TASK_ID=$(curl -s -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Implement feature X",
    "description": "Full description here",
    "priority": "high",
    "agent_id": "MY_AGENT_ID",
    "status": "in_progress",
    "started_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "tags": ["feature", "backend"]
  }' | jq -r '.[0].id')

echo "Created task: $TASK_ID"

# 2. Log your first step
curl -s -X POST http://localhost:3001/task_steps \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": '"$TASK_ID"',
    "title": "Analyzing requirements and existing code",
    "status": "in_progress",
    "sort_order": 1
  }'
```

### "I finished — move to review"
```bash
TASK_ID=1

# Update task status
curl -s -X PATCH "http://localhost:3001/tasks?id=eq.$TASK_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "review"}'

# Create review request
curl -s -X POST http://localhost:3001/task_reviews \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": '"$TASK_ID"',
    "reason": "Implementation complete. Please review the changes.",
    "confidence": 85
  }'
```

### "Check if I have any tasks waiting"
```bash
curl -s "http://localhost:3001/tasks?agent_id=eq.MY_AGENT_ID&status=eq.inbox&order=priority.desc" | jq '.[] | {id, title, priority}'
```
