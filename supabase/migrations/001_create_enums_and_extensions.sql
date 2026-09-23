-- ============================================================
-- Migration 001: Create ENUM Types & Enable Extensions
-- Description : Foundational enumerations and Postgres extensions
--               required by all subsequent migrations.
-- ============================================================

-- ------------------------------------
-- Extensions
-- ------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid() fallback

-- ------------------------------------
-- ENUM: User role
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: User / Employee status
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated', 'resigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Client pipeline status
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE client_status AS ENUM (
    'lead', 'prospect', 'active', 'on_hold', 'completed', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Lead status
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new', 'contacted', 'qualified', 'proposal_sent',
    'negotiation', 'won', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Activity type
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('call', 'meeting', 'note', 'task', 'update');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Project status
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'planning', 'active', 'on_hold', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Task priority
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Task status
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Attendance status
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM (
    'present', 'late', 'half_day', 'absent', 'wfh', 'leave'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Leave request status
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Notification type
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'task_assigned', 'task_updated', 'task_due',
    'leave_request', 'leave_approved', 'leave_rejected',
    'client_assigned', 'lead_updated', 'follow_up_due',
    'project_update', 'mention', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------
-- ENUM: Audit log action
-- ------------------------------------
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
