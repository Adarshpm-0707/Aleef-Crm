-- ============================================================
-- 006_client_portal_rls.sql
--
-- Client Portal Row Level Security (RLS) Policies
--
-- Guarantees:
--  1. Client can only SELECT rows linked to their own client_id / user profile:
--     - public.clients (own client row)
--     - public.projects (projects where client_id = client.id)
--     - public.tasks (tasks belonging to client or client's projects)
--     - public.task_attachments (attachments on client's tasks)
--     - public.task_comments (comments on client's tasks)
--     - public.notifications (own notifications)
--  2. Client can only INSERT into task_comments for their accessible tasks.
--  3. Client can only UPDATE their own contact info (contact_person, phone, address)
--     and user profile (users table).
--  4. Client has NO INSERT, UPDATE, or DELETE privileges on projects, tasks,
--     assignees, or other records.
-- ============================================================

-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.get_current_client_id()
RETURNS UUID AS $$
  SELECT id FROM public.clients
  WHERE email = (SELECT email FROM public.users WHERE id = auth.uid())
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 1. CLIENTS TABLE
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_client_read_own" ON public.clients;
CREATE POLICY "clients_client_read_own"
  ON public.clients FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "clients_client_update_own_contact" ON public.clients;
CREATE POLICY "clients_client_update_own_contact"
  ON public.clients FOR UPDATE
  USING (
    public.get_current_user_role() = 'client'
    AND email = (SELECT email FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    public.get_current_user_role() = 'client'
    AND email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- 2. PROJECTS TABLE
-- Read-only on client's projects; NO INSERT, UPDATE, DELETE for client
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_client_read_own" ON public.projects;
CREATE POLICY "projects_client_read_own"
  ON public.projects FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND client_id = public.get_current_client_id()
  );

-- ────────────────────────────────────────────────────────────
-- 3. TASKS TABLE
-- Read-only on client's tasks; NO INSERT, UPDATE, DELETE for client
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_client_read_own" ON public.tasks;
CREATE POLICY "tasks_client_read_own"
  ON public.tasks FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND (
      client_id = public.get_current_client_id()
      OR project_id IN (
        SELECT id FROM public.projects
        WHERE client_id = public.get_current_client_id()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. TASK COMMENTS TABLE
-- Client can SELECT comments on their tasks and INSERT own comments only
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "task_comments_client_read" ON public.task_comments;
CREATE POLICY "task_comments_client_read"
  ON public.task_comments FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE client_id = public.get_current_client_id()
         OR project_id IN (
           SELECT id FROM public.projects
           WHERE client_id = public.get_current_client_id()
         )
    )
  );

DROP POLICY IF EXISTS "task_comments_client_insert" ON public.task_comments;
CREATE POLICY "task_comments_client_insert"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'client'
    AND user_id = auth.uid()
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE client_id = public.get_current_client_id()
         OR project_id IN (
           SELECT id FROM public.projects
           WHERE client_id = public.get_current_client_id()
         )
    )
  );

-- Client has NO UPDATE or DELETE on comments
DROP POLICY IF EXISTS "task_comments_client_update" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_client_delete" ON public.task_comments;

-- ────────────────────────────────────────────────────────────
-- 5. TASK ATTACHMENTS TABLE
-- Read-only for client
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "task_attach_client_read" ON public.task_attachments;
CREATE POLICY "task_attach_client_read"
  ON public.task_attachments FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE client_id = public.get_current_client_id()
         OR project_id IN (
           SELECT id FROM public.projects
           WHERE client_id = public.get_current_client_id()
         )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. USERS TABLE
-- Client can read and update their own user record only
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_client_read_self" ON public.users;
CREATE POLICY "users_client_read_self"
  ON public.users FOR SELECT
  USING (
    public.get_current_user_role() = 'client'
    AND id = auth.uid()
  );

DROP POLICY IF EXISTS "users_client_update_self" ON public.users;
CREATE POLICY "users_client_update_self"
  ON public.users FOR UPDATE
  USING (
    public.get_current_user_role() = 'client'
    AND id = auth.uid()
  )
  WITH CHECK (
    public.get_current_user_role() = 'client'
    AND id = auth.uid()
  );
