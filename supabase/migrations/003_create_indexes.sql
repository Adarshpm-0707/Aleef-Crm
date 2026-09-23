-- ============================================================
-- Migration 003: Create Indexes
-- Description : Performance indexes on foreign keys, status
--               columns, date columns, and frequently filtered
--               fields across all 15 tables.
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role        ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status      ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_email       ON public.users(email);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_user_id             ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id       ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager   ON public.employees(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status   ON public.employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_joining_date        ON public.employees(joining_date);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_assigned_manager_id   ON public.clients(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_clients_status                ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_industry              ON public.clients(industry);
CREATE INDEX IF NOT EXISTS idx_clients_source                ON public.clients(source);
CREATE INDEX IF NOT EXISTS idx_clients_created_at            ON public.clients(created_at);

-- ============================================================
-- LEADS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_client_id       ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id        ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status          ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date  ON public.leads(follow_up_date);

-- ============================================================
-- FOLLOW-UPS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_follow_ups_client_id   ON public.follow_ups(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date    ON public.follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_completed_at ON public.follow_ups(completed_at);

-- ============================================================
-- CLIENT ACTIVITIES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_activities_client_id  ON public.client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_created_by ON public.client_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_client_activities_type       ON public.client_activities(type);
CREATE INDEX IF NOT EXISTS idx_client_activities_created_at ON public.client_activities(created_at);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_client_id   ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_start_date  ON public.projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_end_date    ON public.projects(end_date);

-- ============================================================
-- TASKS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project_id   ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id    ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id  ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by   ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority     ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date   ON public.tasks(start_date);
-- Composite index for the most common dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks(assignee_id, status);

-- ============================================================
-- TASK COMMENTS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id   ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id   ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at);

-- ============================================================
-- TASK ATTACHMENTS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id     ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status      ON public.attendance(status);
-- Composite for report queries (employee's attendance range)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, date);

-- ============================================================
-- LEAVE REQUESTS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status      ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON public.leave_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date  ON public.leave_requests(start_date);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
-- Composite for "unread notifications for user" queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON public.audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id  ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
-- Composite for per-entity audit trails
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entity_id ON public.audit_logs(entity, entity_id);
