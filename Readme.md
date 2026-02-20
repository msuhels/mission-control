# 🦅 OpenClaw Mission Control

Mission Control is the central orchestration and monitoring dashboard for **OpenClaw** agents. It provides a premium "Human-in-the-Loop" interface to manage agent tasks, monitor execution logs in real-time, and handle manual review requests.

## 🚀 Key Features

-   **🎯 Task Board (Kanban)**: Track tasks through their lifecycle: `Inbox` → `In Progress` → `Review` → `Done`.
-   **📈 Agent Action Log**: Detailed, step-by-step visibility into what an agent is doing, including duration and agent notes.
-   **🛡️ Human Review System**: Flag high-stakes actions for manual approval. Agents can pause execution until a human provides feedback.
-   **📅 Requirements & Scheduling**: Define long-term goals and link them to cron jobs for automated agent execution.
-   **🧩 Skill Management**: Central repository for agent skills and capabilities.

## 🛠️ Skill Installation

Mission Control includes a built-in skill installer that bridges the gap between the dashboard and your OpenClaw agents.
-   **Auto-Discovery**: Scans your `openclaw.json` configuration to find all available agents and their workspaces.
-   **Seamless Setup**: Automatically deploys the `mission-control-tasks` skill to agent workspaces and updates their `AGENTS.md` with relevant instructions.
-   **Agent Awareness**: Once installed, agents become aware of the Task Management API and can autonomously create steps and request reviews.

## 🏗️ Architecture

-   **Frontend**: Next.js 16 (React 19) with Tailwind CSS 4, Framer Motion, and Lucide Icons.
-   **API Layer**: [PostgREST](https://postgrest.org/) provides a high-performance RESTful API directly over the database schema.
-   **Database**: PostgreSQL with custom schemas for `api` and internal logic.
-   **Orchestration**: Docker Compose for seamless environment management.

## 📁 Project Structure

```bash
.
├── db/                 # Database initialization and schema definitions
├── frontend/           # Next.js web application
├── skills/             # Agent skills and tool definitions
├── docker-compose.yml  # Container orchestration
└── .env.local          # Environment configuration
```

## 🛠️ Getting Started

### Prerequisites

-   Docker and Docker Compose installed.
-   `.env.local` file configured in the root (automatically created by the installer).

### 🚀 One-Click Installation

Run this command to clone, setup environment variables, and start Mission Control in one go:

```bash
curl -sSL https://raw.githubusercontent.com/msuhels/mission-control/refs/heads/main/install.sh | bash
```

---

### Running the Application (If already cloned)

For the easiest setup, use the included setup script which automatically extracts your OpenClaw token:

```bash
# Default (Dev mode)
./run.sh

# Production mode
./run.sh --prod
```

#### Manual Mode (Alternative)
If you prefer running docker commands directly:

##### Development Mode
Hot-reloading enabled for frontend development.
```bash
docker compose -f docker-compose.dev.yml --env-file .env.local up -d --build
```

##### Production Mode
Optimized build for stability and performance.
```bash
docker compose -f docker-compose.prod.yml --env-file .env.local up -d --build
```

## 🔌 API Endpoints (via PostgREST)

The API is served via PostgREST and is accessible through the frontend proxy:
-   `GET /api/tasks`: List all tasks.
-   `GET /api/task_steps?task_id=eq.{id}`: Get action logs for a task.
-   `GET /api/task_reviews`: View pending review requests.

---

Built with ❤️ for the OpenClaw Ecosystem.