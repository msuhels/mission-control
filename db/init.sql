-- Mission Control — Task Management Schema
-- PostgREST serves the "api" schema; internal logic stays in "public".

-- ============================================================
-- Roles for PostgREST
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'changeme';
  END IF;
END $$;

GRANT web_anon TO authenticator;

-- ============================================================
-- API schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS api;
GRANT USAGE ON SCHEMA api TO web_anon;

-- ============================================================
-- ENUM types
-- ============================================================
CREATE TYPE api.task_status AS ENUM ('inbox', 'in_progress', 'review', 'done');
CREATE TYPE api.task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE api.step_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped');
CREATE TYPE api.review_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- Requirements — recurring task templates / one-off goals
-- ============================================================
CREATE TABLE api.requirements (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  cron_job_id   TEXT UNIQUE,             -- links to OpenClaw cron jobId
  cron_expr     TEXT,                    -- cron expression for display
  agent_id      TEXT,                    -- which agent owns this
  is_active     BOOLEAN NOT NULL DEFAULT true,
  tags          JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Tasks — individual execution instances
-- ============================================================
CREATE TABLE api.tasks (
  id              BIGSERIAL PRIMARY KEY,
  requirement_id  BIGINT REFERENCES api.requirements(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          api.task_status NOT NULL DEFAULT 'inbox',
  priority        api.task_priority NOT NULL DEFAULT 'medium',
  agent_id        TEXT,                  -- which agent worked on it
  session_key     TEXT,                  -- links to OpenClaw session
  due_at          TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  tags            JSONB NOT NULL DEFAULT '[]',
  metadata        JSONB NOT NULL DEFAULT '{}',  -- flexible extra data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_status ON api.tasks(status);
CREATE INDEX idx_tasks_requirement ON api.tasks(requirement_id);
CREATE INDEX idx_tasks_agent ON api.tasks(agent_id);
CREATE INDEX idx_tasks_created ON api.tasks(created_at DESC);

-- ============================================================
-- Task Steps — execution log / journey of each task
-- ============================================================
CREATE TABLE api.task_steps (
  id          BIGSERIAL PRIMARY KEY,
  task_id     BIGINT NOT NULL REFERENCES api.tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      api.step_status NOT NULL DEFAULT 'pending',
  agent_note  TEXT,                      -- agent's commentary
  duration_ms INTEGER,                   -- how long this step took
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_steps_task ON api.task_steps(task_id);

-- ============================================================
-- Task Reviews — review / approval requests
-- ============================================================
CREATE TABLE api.task_reviews (
  id               BIGSERIAL PRIMARY KEY,
  task_id          BIGINT NOT NULL REFERENCES api.tasks(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,         -- why flagged for review
  confidence       INTEGER,              -- agent's confidence 0-100
  status           api.review_status NOT NULL DEFAULT 'pending',
  reviewer_comment TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX idx_reviews_task ON api.task_reviews(task_id);
CREATE INDEX idx_reviews_status ON api.task_reviews(status);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION api.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_requirements_updated
  BEFORE UPDATE ON api.requirements
  FOR EACH ROW EXECUTE FUNCTION api.set_updated_at();

CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON api.tasks
  FOR EACH ROW EXECUTE FUNCTION api.set_updated_at();

-- ============================================================
-- Grants — PostgREST needs SELECT/INSERT/UPDATE/DELETE on api.*
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO web_anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA api TO web_anon;

-- Future tables auto-grant
ALTER DEFAULT PRIVILEGES IN SCHEMA api
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA api
  GRANT USAGE, SELECT ON SEQUENCES TO web_anon;
