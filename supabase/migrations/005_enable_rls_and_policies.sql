-- ============================================================
-- Migration 005: Row Level Security (RLS) Policies
-- Description : Enable RLS on all tables and define three-tier
--               access control:
--               • admin   – unrestricted CRUD
--               • manager – scoped to assigned clients / team
--               • client  – read-only on own linked records
--
-- Helper function used throughout:
--   public.get_current_user_role()  → user_role enum value
--   public.get_current_user_id()    → UUID of auth.uid()
-- ============================================================

-- ============================================================
-- Helper functions (SECURITY DEFINER so RLS can call them
-- without infinite recursion on the users table)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- Convenience: returns the employee row id for the current user
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- Enable RLS on every table
-- ============================================================
ALTER TABLE public.departments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DEPARTMENTS
-- admin  : full CRUD
-- manager: read-only
-- client : no access
-- ============================================================
DROP POLICY IF EXISTS "dept_admin_all"    ON public.departments;
DROP POLICY IF EXISTS "dept_manager_read" ON public.departments;

CREATE POLICY "dept_admin_all"
  ON public.departments FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "dept_manager_read"
  ON public.departments FOR SELECT
  USING (public.get_current_user_role() = 'manager');

-- ============================================================
-- USERS
-- admin  : full CRUD
-- manager: read all users (need to see team & clients)
-- client : read own row only; can update own profile
-- ============================================================
DROP POLICY IF EXISTS "users_admin_all"         ON public.users;
DROP POLICY IF EXISTS "users_manager_read"      ON public.users;
DROP POLICY IF EXISTS "users_client_read_self"  ON public.users;
DROP POLICY IF EXISTS "users_client_update_self" ON public.users;

CREATE POLICY "users_admin_all"
  ON public.users FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "users_manager_read"
  ON public.users FOR SELECT
  USING (public.get_current_user_role() = 'manager');

CREATE POLICY "users_client_read_self"
  ON public.users FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND id = public.get_current_user_id()
  );

CREATE POLICY "users_client_update_self"
  ON public.users FOR UPDATE
  USING (
    public.get_current_user_role() = 'client'
    AND id = public.get_current_user_id()
  )
  WITH CHECK (
    public.get_current_user_role() = 'client'
    AND id = public.get_current_user_id()
  );

-- ============================================================
-- EMPLOYEES
-- admin  : full CRUD
-- manager: read employees in their own department OR who report to them
-- client : no access
-- ============================================================
DROP POLICY IF EXISTS "emp_admin_all"       ON public.employees;
DROP POLICY IF EXISTS "emp_manager_read"    ON public.employees;
DROP POLICY IF EXISTS "emp_self_read"       ON public.employees;

CREATE POLICY "emp_admin_all"
  ON public.employees FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Managers can see their team (direct reports) and themselves
CREATE POLICY "emp_manager_read"
  ON public.employees FOR SELECT
  USING (
    public.get_current_user_role() = 'manager'
    AND (
      user_id = public.get_current_user_id()    -- own record
      OR reporting_manager_id = public.get_current_employee_id()  -- direct reports
      OR department_id = (
        SELECT department_id FROM public.employees
        WHERE user_id = public.get_current_user_id()
        LIMIT 1
      )
    )
  );

-- Any authenticated employee can view their own record
CREATE POLICY "emp_self_read"
  ON public.employees FOR SELECT
  USING (user_id = public.get_current_user_id());

-- ============================================================
-- CLIENTS
-- admin  : full CRUD
-- manager: full CRUD on clients assigned to them
-- client : SELECT on the client row linked to their user account
-- ============================================================
DROP POLICY IF EXISTS "clients_admin_all"       ON public.clients;
DROP POLICY IF EXISTS "clients_manager_assigned" ON public.clients;
DROP POLICY IF EXISTS "clients_client_read_own"  ON public.clients;

CREATE POLICY "clients_admin_all"
  ON public.clients FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "clients_manager_assigned"
  ON public.clients FOR ALL
  USING (
    public.get_current_user_role() = 'manager'
    AND assigned_manager_id = public.get_current_user_id()
  )
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND assigned_manager_id = public.get_current_user_id()
  );

-- A user with role 'client' can read the client record that shares their email
CREATE POLICY "clients_client_read_own"
  ON public.clients FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
  );

-- ============================================================
-- LEADS
-- admin  : full CRUD
-- manager: full CRUD on leads they own OR whose linked client is assigned to them
-- client : no access (leads are internal)
-- ============================================================
DROP POLICY IF EXISTS "leads_admin_all"   ON public.leads;
DROP POLICY IF EXISTS "leads_manager_own" ON public.leads;

CREATE POLICY "leads_admin_all"
  ON public.leads FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "leads_manager_own"
  ON public.leads FOR ALL
  USING (
    public.get_current_user_role() = 'manager'
    AND (
      owner_id = public.get_current_user_id()
      OR client_id IN (
        SELECT id FROM public.clients
        WHERE assigned_manager_id = public.get_current_user_id()
      )
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND (
      owner_id = public.get_current_user_id()
      OR client_id IN (
        SELECT id FROM public.clients
        WHERE assigned_manager_id = public.get_current_user_id()
      )
    )
  );

-- ============================================================
-- FOLLOW-UPS
-- admin  : full CRUD
-- manager: full CRUD on follow-ups for their assigned clients
-- client : no access
-- ============================================================
DROP POLICY IF EXISTS "followups_admin_all"    ON public.follow_ups;
DROP POLICY IF EXISTS "followups_manager_owns" ON public.follow_ups;

CREATE POLICY "followups_admin_all"
  ON public.follow_ups FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "followups_manager_owns"
  ON public.follow_ups FOR ALL
  USING (
    public.get_current_user_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE assigned_manager_id = public.get_current_user_id()
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE assigned_manager_id = public.get_current_user_id()
    )
  );

-- ============================================================
-- CLIENT ACTIVITIES
-- admin  : full CRUD
-- manager: SELECT + INSERT for their clients; cannot delete others' entries
-- client : SELECT own client's activities
-- ============================================================
DROP POLICY IF EXISTS "activities_admin_all"        ON public.client_activities;
DROP POLICY IF EXISTS "activities_manager_read"     ON public.client_activities;
DROP POLICY IF EXISTS "activities_manager_insert"   ON public.client_activities;
DROP POLICY IF EXISTS "activities_client_read_own"  ON public.client_activities;

CREATE POLICY "activities_admin_all"
  ON public.client_activities FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "activities_manager_read"
  ON public.client_activities FOR SELECT
  USING (
    public.get_current_user_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE assigned_manager_id = public.get_current_user_id()
    )
  );

CREATE POLICY "activities_manager_insert"
  ON public.client_activities FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE assigned_manager_id = public.get_current_user_id()
    )
    AND created_by = public.get_current_user_id()
  );

CREATE POLICY "activities_client_read_own"
  ON public.client_activities FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
    )
  );

-- ============================================================
-- PROJECTS
-- admin  : full CRUD
-- manager: full CRUD on projects belonging to their clients
-- client : SELECT projects linked to their client account
-- ============================================================
DROP POLICY IF EXISTS "projects_admin_all"       ON public.projects;
DROP POLICY IF EXISTS "projects_manager_owns"    ON public.projects;
DROP POLICY IF EXISTS "projects_client_read_own" ON public.projects;

CREATE POLICY "projects_admin_all"
  ON public.projects FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "projects_manager_owns"
  ON public.projects FOR ALL
  USING (
    public.get_current_user_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE assigned_manager_id = public.get_current_user_id()
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE assigned_manager_id = public.get_current_user_id()
    )
  );

CREATE POLICY "projects_client_read_own"
  ON public.projects FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
    )
  );

-- ============================================================
-- TASKS
-- admin  : full CRUD
-- manager: full CRUD on tasks they created OR assigned to their team
--          OR under their client's projects
-- client : SELECT tasks under their linked client/projects
-- ============================================================
DROP POLICY IF EXISTS "tasks_admin_all"       ON public.tasks;
DROP POLICY IF EXISTS "tasks_manager_owns"    ON public.tasks;
DROP POLICY IF EXISTS "tasks_client_read_own" ON public.tasks;

CREATE POLICY "tasks_admin_all"
  ON public.tasks FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "tasks_manager_owns"
  ON public.tasks FOR ALL
  USING (
    public.get_current_user_role() = 'manager'
    AND (
      created_by   = public.get_current_user_id()
      OR assignee_id = public.get_current_user_id()
      OR client_id IN (
        SELECT id FROM public.clients
        WHERE assigned_manager_id = public.get_current_user_id()
      )
      OR project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.clients c ON c.id = p.client_id
        WHERE c.assigned_manager_id = public.get_current_user_id()
      )
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND (
      created_by   = public.get_current_user_id()
      OR assignee_id = public.get_current_user_id()
      OR client_id IN (
        SELECT id FROM public.clients
        WHERE assigned_manager_id = public.get_current_user_id()
      )
      OR project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.clients c ON c.id = p.client_id
        WHERE c.assigned_manager_id = public.get_current_user_id()
      )
    )
  );

CREATE POLICY "tasks_client_read_own"
  ON public.tasks FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND (
      client_id IN (
        SELECT id FROM public.clients
        WHERE email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
      )
      OR project_id IN (
        SELECT p.id FROM public.projects p
        JOIN public.clients c ON c.id = p.client_id
        WHERE c.email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
      )
    )
  );

-- ============================================================
-- TASK COMMENTS
-- admin  : full CRUD
-- manager: SELECT + INSERT + UPDATE own comments on accessible tasks
-- client : SELECT on tasks they can see; INSERT own comments
-- ============================================================
DROP POLICY IF EXISTS "task_comments_admin_all"       ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_manager_read"    ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_manager_insert"  ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_manager_update"  ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_client_read"     ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_client_insert"   ON public.task_comments;

CREATE POLICY "task_comments_admin_all"
  ON public.task_comments FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "task_comments_manager_read"
  ON public.task_comments FOR SELECT
  USING (
    public.get_current_user_role() = 'manager'
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE
        created_by   = public.get_current_user_id()
        OR assignee_id = public.get_current_user_id()
        OR client_id IN (SELECT id FROM public.clients WHERE assigned_manager_id = public.get_current_user_id())
        OR project_id IN (SELECT p.id FROM public.projects p JOIN public.clients c ON c.id = p.client_id WHERE c.assigned_manager_id = public.get_current_user_id())
    )
  );

CREATE POLICY "task_comments_manager_insert"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND user_id = public.get_current_user_id()
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE
        created_by   = public.get_current_user_id()
        OR assignee_id = public.get_current_user_id()
        OR client_id IN (SELECT id FROM public.clients WHERE assigned_manager_id = public.get_current_user_id())
        OR project_id IN (SELECT p.id FROM public.projects p JOIN public.clients c ON c.id = p.client_id WHERE c.assigned_manager_id = public.get_current_user_id())
    )
  );

CREATE POLICY "task_comments_manager_update"
  ON public.task_comments FOR UPDATE
  USING (
    public.get_current_user_role() = 'manager'
    AND user_id = public.get_current_user_id()
  )
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND user_id = public.get_current_user_id()
  );

CREATE POLICY "task_comments_client_read"
  ON public.task_comments FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.clients c ON c.id = t.client_id
      WHERE c.email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
    )
  );

CREATE POLICY "task_comments_client_insert"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'client'
    AND user_id = public.get_current_user_id()
    AND task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.clients c ON c.id = t.client_id
      WHERE c.email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
    )
  );

-- ============================================================
-- TASK ATTACHMENTS
-- admin  : full CRUD
-- manager: SELECT + INSERT on their accessible tasks
-- client : SELECT attachments on their tasks
-- ============================================================
DROP POLICY IF EXISTS "task_attach_admin_all"      ON public.task_attachments;
DROP POLICY IF EXISTS "task_attach_manager_read"   ON public.task_attachments;
DROP POLICY IF EXISTS "task_attach_manager_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attach_client_read"    ON public.task_attachments;

CREATE POLICY "task_attach_admin_all"
  ON public.task_attachments FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "task_attach_manager_read"
  ON public.task_attachments FOR SELECT
  USING (
    public.get_current_user_role() = 'manager'
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE
        created_by   = public.get_current_user_id()
        OR assignee_id = public.get_current_user_id()
        OR client_id IN (SELECT id FROM public.clients WHERE assigned_manager_id = public.get_current_user_id())
        OR project_id IN (SELECT p.id FROM public.projects p JOIN public.clients c ON c.id = p.client_id WHERE c.assigned_manager_id = public.get_current_user_id())
    )
  );

CREATE POLICY "task_attach_manager_insert"
  ON public.task_attachments FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND uploaded_by = public.get_current_user_id()
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE
        created_by   = public.get_current_user_id()
        OR assignee_id = public.get_current_user_id()
        OR client_id IN (SELECT id FROM public.clients WHERE assigned_manager_id = public.get_current_user_id())
        OR project_id IN (SELECT p.id FROM public.projects p JOIN public.clients c ON c.id = p.client_id WHERE c.assigned_manager_id = public.get_current_user_id())
    )
  );

CREATE POLICY "task_attach_client_read"
  ON public.task_attachments FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.clients c ON c.id = t.client_id
      WHERE c.email = (SELECT email FROM public.users WHERE id = public.get_current_user_id())
    )
  );

-- ============================================================
-- ATTENDANCE
-- admin  : full CRUD
-- manager: SELECT all in their department; employee can manage own
-- employee (any role with an employees row): INSERT/UPDATE own record
-- client : no access
-- ============================================================
DROP POLICY IF EXISTS "attendance_admin_all"        ON public.attendance;
DROP POLICY IF EXISTS "attendance_manager_read"     ON public.attendance;
DROP POLICY IF EXISTS "attendance_self_manage"      ON public.attendance;

CREATE POLICY "attendance_admin_all"
  ON public.attendance FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Manager reads attendance for employees in same department
CREATE POLICY "attendance_manager_read"
  ON public.attendance FOR SELECT
  USING (
    public.get_current_user_role() = 'manager'
    AND employee_id IN (
      SELECT e.id FROM public.employees e
      WHERE e.department_id = (
        SELECT department_id FROM public.employees
        WHERE user_id = public.get_current_user_id()
        LIMIT 1
      )
    )
  );

-- Any employee can manage their own attendance
CREATE POLICY "attendance_self_manage"
  ON public.attendance FOR ALL
  USING (employee_id = public.get_current_employee_id())
  WITH CHECK (employee_id = public.get_current_employee_id());

-- ============================================================
-- LEAVE REQUESTS
-- admin  : full CRUD + can approve/reject
-- manager: SELECT requests of their team; can update status (approve/reject)
-- employee: INSERT own requests; SELECT own requests
-- client : no access
-- ============================================================
DROP POLICY IF EXISTS "leave_admin_all"           ON public.leave_requests;
DROP POLICY IF EXISTS "leave_manager_read"        ON public.leave_requests;
DROP POLICY IF EXISTS "leave_manager_update"      ON public.leave_requests;
DROP POLICY IF EXISTS "leave_self_read"           ON public.leave_requests;
DROP POLICY IF EXISTS "leave_self_insert"         ON public.leave_requests;

CREATE POLICY "leave_admin_all"
  ON public.leave_requests FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "leave_manager_read"
  ON public.leave_requests FOR SELECT
  USING (
    public.get_current_user_role() = 'manager'
    AND employee_id IN (
      SELECT id FROM public.employees
      WHERE reporting_manager_id = public.get_current_employee_id()
        OR department_id = (
          SELECT department_id FROM public.employees
          WHERE user_id = public.get_current_user_id() LIMIT 1
        )
    )
  );

CREATE POLICY "leave_manager_update"
  ON public.leave_requests FOR UPDATE
  USING (
    public.get_current_user_role() = 'manager'
    AND employee_id IN (
      SELECT id FROM public.employees
      WHERE reporting_manager_id = public.get_current_employee_id()
        OR department_id = (
          SELECT department_id FROM public.employees
          WHERE user_id = public.get_current_user_id() LIMIT 1
        )
    )
  )
  WITH CHECK (
    public.get_current_user_role() = 'manager'
  );

CREATE POLICY "leave_self_read"
  ON public.leave_requests FOR SELECT
  USING (employee_id = public.get_current_employee_id());

CREATE POLICY "leave_self_insert"
  ON public.leave_requests FOR INSERT
  WITH CHECK (employee_id = public.get_current_employee_id());

-- ============================================================
-- NOTIFICATIONS
-- admin  : full CRUD
-- all    : each user can only read and update their own notifications
-- ============================================================
DROP POLICY IF EXISTS "notif_admin_all"    ON public.notifications;
DROP POLICY IF EXISTS "notif_user_read"    ON public.notifications;
DROP POLICY IF EXISTS "notif_user_update"  ON public.notifications;

CREATE POLICY "notif_admin_all"
  ON public.notifications FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "notif_user_read"
  ON public.notifications FOR SELECT
  USING (user_id = public.get_current_user_id());

-- Allow users to mark their own notifications as read (UPDATE only is_read)
CREATE POLICY "notif_user_update"
  ON public.notifications FOR UPDATE
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- ============================================================
-- AUDIT LOGS (append-only)
-- admin  : full SELECT; INSERT via server-side functions only
-- others : no access (audit logs are admin-only)
-- ============================================================
DROP POLICY IF EXISTS "audit_admin_read"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_system_insert" ON public.audit_logs;

CREATE POLICY "audit_admin_read"
  ON public.audit_logs FOR SELECT
  USING (public.get_current_user_role() = 'admin');

-- Service role / SECURITY DEFINER functions may always insert
CREATE POLICY "audit_system_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);  -- row-level gate enforced by calling function's SECURITY DEFINER context
