-- ============================================================
-- Migration 002: Create All Core Tables
-- Description : All 16 entities for the CRM & Employee
--               Management System, in dependency order.
-- ============================================================

-- ============================================================
-- 1. DEPARTMENTS  (no FK dependencies)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. USERS  (linked to auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL UNIQUE,
  role        user_role   NOT NULL DEFAULT 'client',
  full_name   TEXT        NOT NULL,
  avatar_url  TEXT,
  status      user_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. EMPLOYEES  (references users & departments; self-referential manager)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id                  UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID              NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id         TEXT              NOT NULL UNIQUE,          -- human-readable ID e.g. EMP-001
  department_id       UUID              REFERENCES public.departments(id) ON DELETE SET NULL,
  designation         TEXT              NOT NULL,
  joining_date        DATE              NOT NULL,
  phone               TEXT,
  reporting_manager_id UUID             REFERENCES public.employees(id) ON DELETE SET NULL,
  employment_status   employment_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name        TEXT          NOT NULL,
  contact_person      TEXT          NOT NULL,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  industry            TEXT,
  source              TEXT,                                        -- e.g. referral, ads, cold outreach
  assigned_manager_id UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  status              client_status NOT NULL DEFAULT 'lead',
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID        REFERENCES public.clients(id) ON DELETE SET NULL,  -- nullable: lead may not yet be a client
  lead_value      NUMERIC(15, 2),
  follow_up_date  DATE,
  owner_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  status          lead_status NOT NULL DEFAULT 'new',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. FOLLOW-UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  next_action  TEXT        NOT NULL,
  due_date     TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. CLIENT ACTIVITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_activities (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID          NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type        activity_type NOT NULL,
  content     TEXT          NOT NULL,
  created_by  UUID          NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
  -- No updated_at: activity log entries are immutable
);

-- ============================================================
-- 8. PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID           NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name        TEXT           NOT NULL,
  status      project_status NOT NULL DEFAULT 'planning',
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID          REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id    UUID          REFERENCES public.clients(id)  ON DELETE SET NULL,  -- direct client link (optional)
  title        TEXT          NOT NULL,
  description  TEXT,
  assignee_id  UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  priority     task_priority NOT NULL DEFAULT 'medium',
  status       task_status   NOT NULL DEFAULT 'todo',
  start_date   DATE,
  due_date     DATE,
  created_by   UUID          NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. TASK COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. TASK ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url    TEXT        NOT NULL,
  uploaded_by UUID        NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id            UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID              NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date          DATE              NOT NULL,
  check_in      TIMESTAMPTZ,
  check_out     TIMESTAMPTZ,
  status        attendance_status NOT NULL DEFAULT 'present',
  working_hours NUMERIC(5, 2),                                    -- hours as decimal (e.g. 8.5)
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
  CONSTRAINT attendance_employee_date_unique UNIQUE (employee_id, date)
);

-- ============================================================
-- 13. LEAVE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID         NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  reason      TEXT         NOT NULL,
  status      leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT leave_date_order CHECK (end_date >= start_date)
);

-- ============================================================
-- 14. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  message    TEXT              NOT NULL,
  is_read    BOOLEAN           NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ============================================================
-- 15. AUDIT LOGS  (append-only; no updated_at)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  action    audit_action NOT NULL,
  entity    TEXT         NOT NULL,   -- table name
  entity_id UUID,                    -- PK of affected row (nullable for LOGIN/LOGOUT)
  metadata  JSONB,                   -- extra context (diff snapshots, IP, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
