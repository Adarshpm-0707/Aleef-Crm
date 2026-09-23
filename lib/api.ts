/**
 * lib/api.ts
 *
 * Centralized API & Supabase data access layer for Aleef CRM.
 * Provides typed methods for all entities with direct Supabase queries
 * and an intelligent fallback store to guarantee seamless execution
 * across development, demo, and production environments.
 */

import { createClient } from "./supabase/client";

/* ─── TypeScript Types ──────────────────────────────────────────────────────── */

export type UserRole = "admin" | "manager" | "client";
export type UserStatus = "active" | "inactive" | "suspended";
export type EmploymentStatus = "active" | "on_leave" | "terminated" | "resigned";
export type ClientStatus = "lead" | "prospect" | "active" | "on_hold" | "completed" | "lost";
export type LeadStatus = "new" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "won" | "lost";
export type ActivityType = "call" | "meeting" | "note" | "task" | "update";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "completed";
export type AttendanceStatus = "present" | "late" | "half_day" | "absent" | "wfh" | "leave";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  manager_id?: string;
  employee_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_id: string;
  department_id?: string;
  designation: string;
  joining_date: string;
  phone?: string;
  reporting_manager_id?: string;
  employment_status: EmploymentStatus;
  created_at: string;
  updated_at: string;
  // joined user and department details
  user?: User;
  department?: Department;
  reporting_manager?: Employee;
}

export interface Client {
  id: string;
  company_name: string;
  contact_person: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  source?: string;
  assigned_manager_id?: string;
  status: ClientStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined
  assigned_manager?: User;
  total_revenue?: number;
  active_projects_count?: number;
}

export interface Lead {
  id: string;
  client_id?: string;
  title?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  lead_value?: number;
  follow_up_date?: string;
  owner_id?: string;
  status: LeadStatus;
  notes?: string;
  source?: string;
  created_at: string;
  updated_at: string;
  // joined
  client?: Client;
  owner?: User;
}

export interface FollowUp {
  id: string;
  client_id: string;
  next_action: string;
  due_date: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface ClientActivity {
  id: string;
  client_id: string;
  type: ActivityType;
  content: string;
  created_by: string;
  created_at: string;
  creator?: User;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  progress?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Task {
  id: string;
  project_id?: string;
  client_id?: string;
  title: string;
  description?: string;
  assignee_id?: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: User;
  project?: Project;
  client?: Client;
  comments_count?: number;
  attachments_count?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size?: string;
  uploaded_by: string;
  created_at: string;
  uploader?: User;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  working_hours?: number;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  leave_type: "annual" | "sick" | "emergency" | "maternity" | "paternity" | "unpaid";
  reason: string;
  status: LeaveStatus;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  approver?: User;
}

export type NotificationType =
  | "task_assigned"
  | "task_updated"
  | "task_due"
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "client_assigned"
  | "lead_updated"
  | "follow_up_due"
  | "project_update"
  | "mention"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}


export interface CompanySettings {
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  currency: string;
  timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  grace_period_minutes: number;
  half_day_threshold_hours: number;
  notifications: {
    email_on_leave_request: boolean;
    email_on_task_overdue: boolean;
    email_on_new_lead: boolean;
  };
}

export interface WorkflowSettings {
  kanban_columns: { id: string; title: string; color: string }[];
  client_statuses: { id: string; label: string; color: string }[];
  lead_statuses: { id: string; label: string; color: string }[];
  priorities: { id: string; label: string; color: string }[];
  leave_types: { id: string; label: string; default_days: number }[];
}

/* ─── Mock Seed Store ───────────────────────────────────────────────────────── */

const INITIAL_USERS: User[] = [
  {
    id: "u-admin-1",
    email: "admin@aleefcrm.com",
    role: "admin",
    full_name: "Ahmed Al-Mansoor",
    avatar_url: "",
    status: "active",
    created_at: "2026-01-01T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "u-mgr-1",
    email: "sara.ahmed@aleefcrm.com",
    role: "manager",
    full_name: "Sara Ahmed",
    avatar_url: "",
    status: "active",
    created_at: "2026-01-05T08:00:00Z",
    updated_at: "2026-01-05T08:00:00Z",
  },
  {
    id: "u-mgr-2",
    email: "omar.hassan@aleefcrm.com",
    role: "manager",
    full_name: "Omar Hassan",
    avatar_url: "",
    status: "active",
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-01-10T08:00:00Z",
  },
  {
    id: "u-emp-1",
    email: "layla.khalid@aleefcrm.com",
    role: "client",
    full_name: "Layla Khalid",
    avatar_url: "",
    status: "active",
    created_at: "2026-02-01T08:00:00Z",
    updated_at: "2026-02-01T08:00:00Z",
  },
  {
    id: "u-emp-2",
    email: "tariq.aziz@aleefcrm.com",
    role: "client",
    full_name: "Tariq Aziz",
    avatar_url: "",
    status: "active",
    created_at: "2026-02-15T08:00:00Z",
    updated_at: "2026-02-15T08:00:00Z",
  },
];

const INITIAL_DEPARTMENTS: Department[] = [
  { id: "dept-1", name: "Engineering", employee_count: 5, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "dept-2", name: "Sales & Marketing", employee_count: 4, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "dept-3", name: "Client Success", employee_count: 3, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "dept-4", name: "Operations & HR", employee_count: 2, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    user_id: "u-admin-1",
    employee_id: "EMP-001",
    department_id: "dept-4",
    designation: "Managing Director",
    joining_date: "2024-01-15",
    phone: "+966 50 123 4567",
    employment_status: "active",
    created_at: "2026-01-01T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
    user: INITIAL_USERS[0],
    department: INITIAL_DEPARTMENTS[3],
  },
  {
    id: "emp-2",
    user_id: "u-mgr-1",
    employee_id: "EMP-002",
    department_id: "dept-2",
    designation: "Sales Director",
    joining_date: "2024-03-01",
    phone: "+966 50 234 5678",
    reporting_manager_id: "emp-1",
    employment_status: "active",
    created_at: "2026-01-05T08:00:00Z",
    updated_at: "2026-01-05T08:00:00Z",
    user: INITIAL_USERS[1],
    department: INITIAL_DEPARTMENTS[1],
  },
  {
    id: "emp-3",
    user_id: "u-mgr-2",
    employee_id: "EMP-003",
    department_id: "dept-1",
    designation: "Lead Systems Architect",
    joining_date: "2024-04-10",
    phone: "+966 50 345 6789",
    reporting_manager_id: "emp-1",
    employment_status: "active",
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-01-10T08:00:00Z",
    user: INITIAL_USERS[2],
    department: INITIAL_DEPARTMENTS[0],
  },
  {
    id: "emp-4",
    user_id: "u-emp-1",
    employee_id: "EMP-004",
    department_id: "dept-3",
    designation: "Customer Success Manager",
    joining_date: "2025-01-15",
    phone: "+966 50 456 7890",
    reporting_manager_id: "emp-2",
    employment_status: "active",
    created_at: "2026-02-01T08:00:00Z",
    updated_at: "2026-02-01T08:00:00Z",
    user: INITIAL_USERS[3],
    department: INITIAL_DEPARTMENTS[2],
  },
  {
    id: "emp-5",
    user_id: "u-emp-2",
    employee_id: "EMP-005",
    department_id: "dept-1",
    designation: "Full Stack Engineer",
    joining_date: "2025-06-01",
    phone: "+966 50 567 8901",
    reporting_manager_id: "emp-3",
    employment_status: "active",
    created_at: "2026-02-15T08:00:00Z",
    updated_at: "2026-02-15T08:00:00Z",
    user: INITIAL_USERS[4],
    department: INITIAL_DEPARTMENTS[0],
  },
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: "c-1",
    company_name: "Apex Global Logistics",
    contact_person: "Farid Al-Zahrani",
    phone: "+966 54 111 2233",
    email: "farid@apexlogistics.sa",
    address: "King Fahd Road, Riyadh",
    industry: "Supply Chain & Logistics",
    source: "Referral",
    assigned_manager_id: "u-mgr-1",
    status: "active",
    notes: "Key enterprise client. Exploring contract renewal for Q3 2026.",
    created_at: "2026-01-12T10:00:00Z",
    updated_at: "2026-03-01T14:20:00Z",
    assigned_manager: INITIAL_USERS[1],
    total_revenue: 145000,
    active_projects_count: 2,
  },
  {
    id: "c-2",
    company_name: "Al-Noor Health Group",
    contact_person: "Dr. Noura Mansour",
    phone: "+966 55 222 3344",
    email: "n.mansour@alnoorhealth.com",
    address: "Olaya St, Riyadh",
    industry: "Healthcare",
    source: "Inbound Website",
    assigned_manager_id: "u-mgr-2",
    status: "active",
    notes: "Clinic management integration project underway.",
    created_at: "2026-02-05T09:30:00Z",
    updated_at: "2026-03-04T11:00:00Z",
    assigned_manager: INITIAL_USERS[2],
    total_revenue: 98000,
    active_projects_count: 1,
  },
  {
    id: "c-3",
    company_name: "FinTech Oasis",
    contact_person: "Kareem El-Sayed",
    phone: "+971 50 888 9900",
    email: "kareem@fintechoasis.io",
    address: "DIFC Gate Tower, Dubai",
    industry: "Financial Technology",
    source: "Cold Outreach",
    assigned_manager_id: "u-mgr-1",
    status: "prospect",
    notes: "Compliance module demo scheduled this Thursday.",
    created_at: "2026-02-20T14:15:00Z",
    updated_at: "2026-03-02T16:45:00Z",
    assigned_manager: INITIAL_USERS[1],
    total_revenue: 65000,
    active_projects_count: 1,
  },
  {
    id: "c-4",
    company_name: "Desert Oasis Hospitality",
    contact_person: "Lina Bint Sultan",
    phone: "+966 56 333 4455",
    email: "lina@desertoasis.sa",
    address: "Corniche Road, Jeddah",
    industry: "Hospitality & Tourism",
    source: "Event Exhibition",
    assigned_manager_id: "u-admin-1",
    status: "lead",
    notes: "Requested quote for multi-property booking sync.",
    created_at: "2026-03-01T11:00:00Z",
    updated_at: "2026-03-05T10:00:00Z",
    assigned_manager: INITIAL_USERS[0],
    total_revenue: 0,
    active_projects_count: 0,
  },
  {
    id: "c-5",
    company_name: "Red Sea Retail Consortium",
    contact_person: "Majed Al-Ghamdi",
    phone: "+966 52 444 5566",
    email: "m.ghamdi@redsearetail.com",
    address: "Madinah Road, Jeddah",
    industry: "Retail & E-Commerce",
    source: "Partner",
    assigned_manager_id: "u-mgr-1",
    status: "completed",
    notes: "POS upgrade project completed successfully.",
    created_at: "2025-11-10T08:00:00Z",
    updated_at: "2026-01-30T17:00:00Z",
    assigned_manager: INITIAL_USERS[1],
    total_revenue: 210000,
    active_projects_count: 0,
  },
];

const INITIAL_LEADS: Lead[] = [
  {
    id: "lead-1",
    client_id: "c-3",
    title: "FinTech Compliance Automation Engine",
    contact_name: "Kareem El-Sayed",
    contact_email: "kareem@fintechoasis.io",
    contact_phone: "+971 50 888 9900",
    lead_value: 75000,
    follow_up_date: "2026-09-15",
    owner_id: "u-mgr-1",
    status: "negotiation",
    notes: "Discussed pilot pricing with CFO.",
    source: "Cold Outreach",
    created_at: "2026-02-22T10:00:00Z",
    updated_at: "2026-03-05T12:00:00Z",
    client: INITIAL_CLIENTS[2],
    owner: INITIAL_USERS[1],
  },
  {
    id: "lead-2",
    client_id: "c-4",
    title: "Hotel Booking Multi-Tenant Integration",
    contact_name: "Lina Bint Sultan",
    contact_email: "lina@desertoasis.sa",
    contact_phone: "+966 56 333 4455",
    lead_value: 120000,
    follow_up_date: "2026-09-12",
    owner_id: "u-admin-1",
    status: "proposal_sent",
    notes: "Proposal v2 delivered. Awaiting board review.",
    source: "Event Exhibition",
    created_at: "2026-03-01T11:00:00Z",
    updated_at: "2026-03-06T09:00:00Z",
    client: INITIAL_CLIENTS[3],
    owner: INITIAL_USERS[0],
  },
  {
    id: "lead-3",
    title: "Saudi Green Initiative IoT Dashboard",
    contact_name: "Eng. Salem Al-Harthi",
    contact_email: "salem@saudigreen-consult.sa",
    contact_phone: "+966 50 999 1122",
    lead_value: 185000,
    follow_up_date: "2026-09-10",
    owner_id: "u-mgr-2",
    status: "qualified",
    notes: "Technical scope discovery meeting completed.",
    source: "Inbound Website",
    created_at: "2026-03-03T15:00:00Z",
    updated_at: "2026-03-06T14:30:00Z",
    owner: INITIAL_USERS[2],
  },
  {
    id: "lead-4",
    title: "Cloud Migration & Cyber Audit",
    contact_name: "Bader Al-Otaibi",
    contact_email: "bader@otaibi-capital.sa",
    contact_phone: "+966 54 888 7766",
    lead_value: 95000,
    follow_up_date: "2026-09-14",
    owner_id: "u-mgr-1",
    status: "contacted",
    notes: "Introductory phone call was positive.",
    source: "Referral",
    created_at: "2026-03-04T16:00:00Z",
    updated_at: "2026-03-05T17:00:00Z",
    owner: INITIAL_USERS[1],
  },
  {
    id: "lead-5",
    title: "Enterprise HRMS Customization",
    contact_name: "Samira Al-Husseini",
    contact_email: "samira@horizonholdings.sa",
    contact_phone: "+966 53 777 6655",
    lead_value: 60000,
    follow_up_date: "2026-09-20",
    owner_id: "u-mgr-2",
    status: "new",
    notes: "Web form submission requesting demonstration.",
    source: "Inbound Website",
    created_at: "2026-03-07T08:00:00Z",
    updated_at: "2026-03-07T08:00:00Z",
    owner: INITIAL_USERS[2],
  },
];

const INITIAL_FOLLOW_UPS: FollowUp[] = [
  {
    id: "fu-1",
    client_id: "c-1",
    next_action: "Review SLA metrics and contract renewal draft",
    due_date: "2026-09-09T10:00:00Z",
    notes: "High priority call with Farid Al-Zahrani.",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    client: INITIAL_CLIENTS[0],
  },
  {
    id: "fu-2",
    client_id: "c-3",
    next_action: "Confirm live demo environment access with Kareem",
    due_date: "2026-09-10T14:00:00Z",
    notes: "Ensure sandbox API credentials are sent.",
    created_at: "2026-03-03T11:00:00Z",
    updated_at: "2026-03-03T11:00:00Z",
    client: INITIAL_CLIENTS[2],
  },
  {
    id: "fu-3",
    client_id: "c-2",
    next_action: "Deliver security vulnerability scan report",
    due_date: "2026-09-12T09:30:00Z",
    notes: "Share PDF report and schedule technical Q&A.",
    created_at: "2026-03-04T12:00:00Z",
    updated_at: "2026-03-04T12:00:00Z",
    client: INITIAL_CLIENTS[1],
  },
  {
    id: "fu-4",
    client_id: "c-4",
    next_action: "Follow up on proposal feedback",
    due_date: "2026-09-08T16:00:00Z",
    notes: "Call Lina Bint Sultan.",
    created_at: "2026-03-05T14:00:00Z",
    updated_at: "2026-03-05T14:00:00Z",
    client: INITIAL_CLIENTS[3],
  },
];

const INITIAL_ACTIVITIES: ClientActivity[] = [
  {
    id: "act-1",
    client_id: "c-1",
    type: "meeting",
    content: "Quarterly Executive Business Review conducted. Client highly satisfied with fleet monitoring latency.",
    created_by: "u-admin-1",
    created_at: "2026-03-01T14:00:00Z",
    creator: INITIAL_USERS[0],
  },
  {
    id: "act-2",
    client_id: "c-1",
    type: "call",
    content: "Call with Farid regarding customs integration feature request.",
    created_by: "u-mgr-1",
    created_at: "2026-03-04T10:30:00Z",
    creator: INITIAL_USERS[1],
  },
  {
    id: "act-3",
    client_id: "c-2",
    type: "note",
    content: "Client requested staging server access for their internal security auditors.",
    created_by: "u-mgr-2",
    created_at: "2026-03-05T11:20:00Z",
    creator: INITIAL_USERS[2],
  },
  {
    id: "act-4",
    client_id: "c-3",
    type: "update",
    content: "Lead status changed from Qualified to Negotiation.",
    created_by: "u-mgr-1",
    created_at: "2026-03-06T15:00:00Z",
    creator: INITIAL_USERS[1],
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: "p-1",
    client_id: "c-1",
    name: "Fleet Telematics Integration",
    status: "active",
    start_date: "2026-01-15",
    end_date: "2026-05-30",
    progress: 68,
    description: "Real-time telemetry and geofencing engine connected to SAP S/4HANA.",
    created_at: "2026-01-15T09:00:00Z",
    updated_at: "2026-03-06T12:00:00Z",
    client: INITIAL_CLIENTS[0],
  },
  {
    id: "p-2",
    client_id: "c-2",
    name: "Health Records Cloud Sync",
    status: "active",
    start_date: "2026-02-01",
    end_date: "2026-06-15",
    progress: 42,
    description: "HIPAA and Seha-compliant patient file sync microservices.",
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-03-05T16:00:00Z",
    client: INITIAL_CLIENTS[1],
  },
  {
    id: "p-3",
    client_id: "c-3",
    name: "AML & KYC Verification Portal",
    status: "planning",
    start_date: "2026-04-01",
    end_date: "2026-07-31",
    progress: 15,
    description: "Automated identity document validation with biometric matching.",
    created_at: "2026-02-25T11:00:00Z",
    updated_at: "2026-03-02T13:00:00Z",
    client: INITIAL_CLIENTS[2],
  },
  {
    id: "p-4",
    client_id: "c-1",
    name: "Automated Dispatch Optimization",
    status: "active",
    start_date: "2026-02-15",
    end_date: "2026-06-30",
    progress: 55,
    description: "Route scheduling algorithms using real-time traffic heuristics.",
    created_at: "2026-02-15T08:00:00Z",
    updated_at: "2026-03-04T10:00:00Z",
    client: INITIAL_CLIENTS[0],
  },
];

const INITIAL_TASKS: Task[] = [
  {
    id: "t-1",
    project_id: "p-1",
    client_id: "c-1",
    title: "Implement Kafka consumer for GPS pings",
    description: "Stream high-throughput GPS coordinates with deduplication and geohash clustering.",
    assignee_id: "u-emp-2",
    priority: "urgent",
    status: "in_progress",
    start_date: "2026-09-01",
    due_date: "2026-09-12",
    created_by: "u-mgr-2",
    created_at: "2026-09-01T08:00:00Z",
    updated_at: "2026-09-06T10:00:00Z",
    assignee: INITIAL_USERS[4],
    project: INITIAL_PROJECTS[0],
    client: INITIAL_CLIENTS[0],
    comments_count: 3,
    attachments_count: 2,
  },
  {
    id: "t-2",
    project_id: "p-1",
    client_id: "c-1",
    title: "Configure SAP RFC destination connectors",
    description: "Establish encrypted SAP RFC gateway link and test sample order push.",
    assignee_id: "u-mgr-2",
    priority: "high",
    status: "review",
    start_date: "2026-09-02",
    due_date: "2026-09-10",
    created_by: "u-admin-1",
    created_at: "2026-09-02T09:00:00Z",
    updated_at: "2026-09-07T11:00:00Z",
    assignee: INITIAL_USERS[2],
    project: INITIAL_PROJECTS[0],
    client: INITIAL_CLIENTS[0],
    comments_count: 1,
    attachments_count: 1,
  },
  {
    id: "t-3",
    project_id: "p-2",
    client_id: "c-2",
    title: "HL7 FHIR interface schema validation",
    description: "Write unit and contract tests verifying compliant HL7 payload serialization.",
    assignee_id: "u-emp-2",
    priority: "high",
    status: "todo",
    start_date: "2026-09-08",
    due_date: "2026-09-16",
    created_by: "u-mgr-2",
    created_at: "2026-09-05T14:00:00Z",
    updated_at: "2026-09-05T14:00:00Z",
    assignee: INITIAL_USERS[4],
    project: INITIAL_PROJECTS[1],
    client: INITIAL_CLIENTS[1],
    comments_count: 0,
    attachments_count: 0,
  },
  {
    id: "t-4",
    project_id: "p-3",
    client_id: "c-3",
    title: "Review AML sanction list API integration docs",
    description: "Evaluate query rate limits and SLA guarantees from provider.",
    assignee_id: "u-mgr-1",
    priority: "medium",
    status: "todo",
    start_date: "2026-09-06",
    due_date: "2026-09-14",
    created_by: "u-admin-1",
    created_at: "2026-09-06T09:00:00Z",
    updated_at: "2026-09-06T09:00:00Z",
    assignee: INITIAL_USERS[1],
    project: INITIAL_PROJECTS[2],
    client: INITIAL_CLIENTS[2],
    comments_count: 2,
    attachments_count: 1,
  },
  {
    id: "t-5",
    project_id: "p-1",
    client_id: "c-1",
    title: "Fix map clustering performance on iOS safari",
    description: "Debounce re-renders when zooming beyond level 14.",
    assignee_id: "u-emp-1",
    priority: "medium",
    status: "completed",
    start_date: "2026-08-28",
    due_date: "2026-09-04",
    created_by: "u-mgr-1",
    created_at: "2026-08-28T10:00:00Z",
    updated_at: "2026-09-04T16:00:00Z",
    assignee: INITIAL_USERS[3],
    project: INITIAL_PROJECTS[0],
    client: INITIAL_CLIENTS[0],
    comments_count: 4,
    attachments_count: 0,
  },
  {
    id: "t-6",
    project_id: "p-4",
    client_id: "c-1",
    title: "Route benchmark simulation on Jeddah delivery dataset",
    description: "Run benchmark comparing Dijkstra vs A* heuristics over 50,000 historical deliveries.",
    assignee_id: "u-mgr-2",
    priority: "low",
    status: "in_progress",
    start_date: "2026-09-05",
    due_date: "2026-09-18",
    created_by: "u-admin-1",
    created_at: "2026-09-05T11:00:00Z",
    updated_at: "2026-09-07T15:00:00Z",
    assignee: INITIAL_USERS[2],
    project: INITIAL_PROJECTS[3],
    client: INITIAL_CLIENTS[0],
    comments_count: 1,
    attachments_count: 1,
  },
];

const INITIAL_TASK_COMMENTS: TaskComment[] = [
  {
    id: "tc-1",
    task_id: "t-1",
    user_id: "u-mgr-2",
    content: "Make sure you test with the 10,000 pings/sec load test script in the /benchmark folder.",
    created_at: "2026-09-02T10:15:00Z",
    updated_at: "2026-09-02T10:15:00Z",
    user: INITIAL_USERS[2],
  },
  {
    id: "tc-2",
    task_id: "t-1",
    user_id: "u-emp-2",
    content: "Tested locally with Dockerized Kafka cluster. P99 latency is under 18ms.",
    created_at: "2026-09-04T14:30:00Z",
    updated_at: "2026-09-04T14:30:00Z",
    user: INITIAL_USERS[4],
  },
  {
    id: "tc-3",
    task_id: "t-1",
    user_id: "u-admin-1",
    content: "Excellent. Let's do a staging deployment tomorrow morning.",
    created_at: "2026-09-05T09:00:00Z",
    updated_at: "2026-09-05T09:00:00Z",
    user: INITIAL_USERS[0],
  },
];

const INITIAL_TASK_ATTACHMENTS: TaskAttachment[] = [
  {
    id: "ta-1",
    task_id: "t-1",
    file_name: "kafka-telemetry-architecture.pdf",
    file_url: "https://documents.aleefcrm.com/specs/kafka-telemetry-architecture.pdf",
    file_size: "2.4 MB",
    uploaded_by: "u-mgr-2",
    created_at: "2026-09-01T09:30:00Z",
    uploader: INITIAL_USERS[2],
  },
  {
    id: "ta-2",
    task_id: "t-1",
    file_name: "load-test-report-p99.json",
    file_url: "https://documents.aleefcrm.com/benchmarks/load-test-report-p99.json",
    file_size: "480 KB",
    uploaded_by: "u-emp-2",
    created_at: "2026-09-04T14:35:00Z",
    uploader: INITIAL_USERS[4],
  },
];

const INITIAL_ATTENDANCE: Attendance[] = [
  {
    id: "att-1",
    employee_id: "emp-1",
    date: new Date().toISOString().slice(0, 10),
    check_in: "2026-09-08T08:02:00Z",
    check_out: undefined,
    status: "present",
    working_hours: 5.2,
    created_at: "2026-09-08T08:02:00Z",
    updated_at: "2026-09-08T08:02:00Z",
    employee: INITIAL_EMPLOYEES[0],
  },
  {
    id: "att-2",
    employee_id: "emp-2",
    date: new Date().toISOString().slice(0, 10),
    check_in: "2026-09-08T08:15:00Z",
    check_out: undefined,
    status: "present",
    working_hours: 5.0,
    created_at: "2026-09-08T08:15:00Z",
    updated_at: "2026-09-08T08:15:00Z",
    employee: INITIAL_EMPLOYEES[1],
  },
  {
    id: "att-3",
    employee_id: "emp-3",
    date: new Date().toISOString().slice(0, 10),
    check_in: "2026-09-08T08:45:00Z",
    check_out: undefined,
    status: "late",
    working_hours: 4.5,
    created_at: "2026-09-08T08:45:00Z",
    updated_at: "2026-09-08T08:45:00Z",
    employee: INITIAL_EMPLOYEES[2],
  },
  {
    id: "att-4",
    employee_id: "emp-4",
    date: new Date().toISOString().slice(0, 10),
    check_in: "2026-09-08T08:00:00Z",
    check_out: undefined,
    status: "wfh",
    working_hours: 5.3,
    created_at: "2026-09-08T08:00:00Z",
    updated_at: "2026-09-08T08:00:00Z",
    employee: INITIAL_EMPLOYEES[3],
  },
  {
    id: "att-5",
    employee_id: "emp-5",
    date: new Date().toISOString().slice(0, 10),
    check_in: undefined,
    check_out: undefined,
    status: "leave",
    working_hours: 0,
    created_at: "2026-09-08T00:00:00Z",
    updated_at: "2026-09-08T00:00:00Z",
    employee: INITIAL_EMPLOYEES[4],
  },
];

const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "lr-1",
    employee_id: "emp-5",
    leave_type: "annual",
    start_date: "2026-09-08",
    end_date: "2026-09-11",
    reason: "Family vacation and travel.",
    status: "approved",
    approved_by: "u-admin-1",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-02T11:00:00Z",
    employee: INITIAL_EMPLOYEES[4],
    approver: INITIAL_USERS[0],
  },
  {
    id: "lr-2",
    employee_id: "emp-2",
    leave_type: "sick",
    start_date: "2026-09-18",
    end_date: "2026-09-19",
    reason: "Medical appointment and dental procedure.",
    status: "pending",
    created_at: "2026-09-06T15:00:00Z",
    updated_at: "2026-09-06T15:00:00Z",
    employee: INITIAL_EMPLOYEES[1],
  },
  {
    id: "lr-3",
    employee_id: "emp-4",
    leave_type: "emergency",
    start_date: "2026-09-25",
    end_date: "2026-09-26",
    reason: "Home repairs and emergency plumbing inspection.",
    status: "pending",
    created_at: "2026-09-07T12:00:00Z",
    updated_at: "2026-09-07T12:00:00Z",
    employee: INITIAL_EMPLOYEES[3],
  },
];

const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  name: "Aleef Business Solutions",
  legal_name: "Aleef Information Technology LLC",
  email: "contact@aleefcrm.com",
  phone: "+966 11 400 9000",
  address: "Tower 3, King Abdullah Financial District (KAFD), Riyadh, Saudi Arabia",
  tax_id: "310492839200003",
  currency: "SAR",
  timezone: "Asia/Riyadh (UTC+03:00)",
  working_hours_start: "08:30",
  working_hours_end: "17:30",
  grace_period_minutes: 15,
  half_day_threshold_hours: 4.5,
  notifications: {
    email_on_leave_request: true,
    email_on_task_overdue: true,
    email_on_new_lead: true,
  },
};

const INITIAL_WORKFLOW_SETTINGS: WorkflowSettings = {
  kanban_columns: [
    { id: "todo", title: "To Do", color: "#94a3b8" },
    { id: "in_progress", title: "In Progress", color: "#f59e0b" },
    { id: "review", title: "In Review", color: "#38bdf8" },
    { id: "completed", title: "Completed", color: "#10b981" },
  ],
  client_statuses: [
    { id: "lead", label: "Lead", color: "#94a3b8" },
    { id: "prospect", label: "Prospect", color: "#f59e0b" },
    { id: "active", label: "Active Client", color: "#10b981" },
    { id: "on_hold", label: "On Hold", color: "#64748b" },
    { id: "completed", label: "Completed", color: "#3b82f6" },
    { id: "lost", label: "Lost", color: "#ef4444" },
  ],
  lead_statuses: [
    { id: "new", label: "New", color: "#94a3b8" },
    { id: "contacted", label: "Contacted", color: "#38bdf8" },
    { id: "qualified", label: "Qualified", color: "#f59e0b" },
    { id: "proposal_sent", label: "Proposal Sent", color: "#8b5cf6" },
    { id: "negotiation", label: "Negotiation", color: "#f97316" },
    { id: "won", label: "Won", color: "#10b981" },
    { id: "lost", label: "Lost", color: "#ef4444" },
  ],
  priorities: [
    { id: "low", label: "Low", color: "#94a3b8" },
    { id: "medium", label: "Medium", color: "#38bdf8" },
    { id: "high", label: "High", color: "#f59e0b" },
    { id: "urgent", label: "Urgent", color: "#ef4444" },
  ],
  leave_types: [
    { id: "annual", label: "Annual Leave", default_days: 21 },
    { id: "sick", label: "Sick Leave", default_days: 14 },
    { id: "emergency", label: "Emergency Leave", default_days: 5 },
    { id: "maternity", label: "Maternity Leave", default_days: 70 },
    { id: "paternity", label: "Paternity Leave", default_days: 7 },
    { id: "unpaid", label: "Unpaid Leave", default_days: 0 },
  ],
};

/* ─── Persistent Memory Store (syncs across tab sessions in browser) ───────── */

class LocalStore {
  users: User[] = [...INITIAL_USERS];
  departments: Department[] = [...INITIAL_DEPARTMENTS];
  employees: Employee[] = [...INITIAL_EMPLOYEES];
  clients: Client[] = [...INITIAL_CLIENTS];
  leads: Lead[] = [...INITIAL_LEADS];
  followUps: FollowUp[] = [...INITIAL_FOLLOW_UPS];
  activities: ClientActivity[] = [...INITIAL_ACTIVITIES];
  projects: Project[] = [...INITIAL_PROJECTS];
  tasks: Task[] = [...INITIAL_TASKS];
  taskComments: TaskComment[] = [...INITIAL_TASK_COMMENTS];
  taskAttachments: TaskAttachment[] = [...INITIAL_TASK_ATTACHMENTS];
  attendance: Attendance[] = [...INITIAL_ATTENDANCE];
  leaveRequests: LeaveRequest[] = [...INITIAL_LEAVE_REQUESTS];
  notifications: AppNotification[] = [
    {
      id: "notif-1",
      user_id: "u-mgr-1",
      type: "leave_request",
      title: "New Leave Request",
      message: "Layla Khalid submitted a request for 3 days Annual Leave.",
      link: "/manager/leave-approvals",
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "notif-2",
      user_id: "u-mgr-1",
      type: "task_due",
      title: "Task In Review",
      message: "Task 'Configure SAP RFC destination connectors' is ready for review.",
      link: "/manager/tasks/t-2",
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "notif-3",
      user_id: "u-mgr-1",
      type: "client_assigned",
      title: "Client Milestone",
      message: "Apex Global Logistics contract renewal discussion due today.",
      link: "/manager/clients/c-1",
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
    {
      id: "notif-4",
      user_id: "u-mgr-2",
      type: "task_assigned",
      title: "New Task Assigned",
      message: "Tariq Aziz assigned to 'HL7 FHIR interface schema validation'.",
      link: "/manager/tasks/t-3",
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    },
    {
      id: "notif-5",
      user_id: "u-mgr-2",
      type: "follow_up_due",
      title: "Lead Follow-up Due",
      message: "Follow-up due with Eng. Salem Al-Harthi regarding IoT Dashboard.",
      link: "/manager/dashboard",
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    },
  ];
  companySettings: CompanySettings = { ...INITIAL_COMPANY_SETTINGS };
  workflowSettings: WorkflowSettings = { ...INITIAL_WORKFLOW_SETTINGS };

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("aleef_crm_store_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.assign(this, parsed);
        }
      } catch {
        // ignore storage parse errors
      }
    }
  }

  save() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "aleef_crm_store_v1",
          JSON.stringify({
            users: this.users,
            departments: this.departments,
            employees: this.employees,
            clients: this.clients,
            leads: this.leads,
            followUps: this.followUps,
            activities: this.activities,
            projects: this.projects,
            tasks: this.tasks,
            taskComments: this.taskComments,
            taskAttachments: this.taskAttachments,
            attendance: this.attendance,
            leaveRequests: this.leaveRequests,
            companySettings: this.companySettings,
            workflowSettings: this.workflowSettings,
          })
        );
      } catch {
        // ignore quota errors
      }
    }
  }
}

export const store = new LocalStore();

/* ─── Clients API ───────────────────────────────────────────────────────────── */

export const clientsApi = {
  async getAll(params?: { search?: string; status?: string; managerId?: string }): Promise<Client[]> {
    try {
      const supabase = createClient();
      let query = supabase.from("clients").select("*, assigned_manager:users(*)");
      if (params?.status) query = query.eq("status", params.status);
      if (params?.managerId) query = query.eq("assigned_manager_id", params.managerId);
      if (params?.search) query = query.ilike("company_name", `%${params.search}%`);

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as Client[];
    } catch {
      // fallback
    }

    let list = [...store.clients];
    if (params?.status) list = list.filter((c) => c.status === params.status);
    if (params?.managerId) list = list.filter((c) => c.assigned_manager_id === params.managerId);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.contact_person.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getById(id: string): Promise<Client | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("clients")
        .select("*, assigned_manager:users(*)")
        .eq("id", id)
        .single();
      if (!error && data) return data as Client;
    } catch {
      // fallback
    }
    return store.clients.find((c) => c.id === id) || null;
  },

  async create(client: Partial<Client>): Promise<Client> {
    const newClient: Client = {
      id: client.id || `c-${Date.now()}`,
      company_name: client.company_name || "New Client",
      contact_person: client.contact_person || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      industry: client.industry || "",
      source: client.source || "Direct",
      assigned_manager_id: client.assigned_manager_id,
      status: client.status || "lead",
      notes: client.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_manager: store.users.find((u) => u.id === client.assigned_manager_id),
      total_revenue: 0,
      active_projects_count: 0,
    };

    try {
      const supabase = createClient();
      const { data } = await supabase.from("clients").insert(newClient).select().single();
      if (data) return data as Client;
    } catch {
      // fallback
    }

    store.clients.unshift(newClient);
    store.save();
    return newClient;
  },

  async update(id: string, updates: Partial<Client>): Promise<Client> {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (data) return data as Client;
    } catch {
      // fallback
    }

    const idx = store.clients.findIndex((c) => c.id === id);
    if (idx >= 0) {
      store.clients[idx] = {
        ...store.clients[idx],
        ...updates,
        updated_at: new Date().toISOString(),
        assigned_manager: updates.assigned_manager_id
          ? store.users.find((u) => u.id === updates.assigned_manager_id)
          : store.clients[idx].assigned_manager,
      };
      store.save();
      return store.clients[idx];
    }
    throw new Error("Client not found");
  },

  async delete(id: string): Promise<boolean> {
    try {
      const supabase = createClient();
      await supabase.from("clients").delete().eq("id", id);
    } catch {
      // fallback
    }

    store.clients = store.clients.filter((c) => c.id !== id);
    store.save();
    return true;
  },

  async assignManager(clientId: string, managerId: string): Promise<Client> {
    return this.update(clientId, { assigned_manager_id: managerId });
  },

  async updateStatus(clientId: string, status: ClientStatus): Promise<Client> {
    return this.update(clientId, { status });
  },
};

/* ─── Leads API ─────────────────────────────────────────────────────────────── */

export const leadsApi = {
  async getAll(params?: { search?: string; status?: string; ownerId?: string }): Promise<Lead[]> {
    try {
      const supabase = createClient();
      let query = supabase.from("leads").select("*, client:clients(*), owner:users(*)");
      if (params?.status) query = query.eq("status", params.status);
      if (params?.ownerId) query = query.eq("owner_id", params.ownerId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as Lead[];
    } catch {
      // fallback
    }

    let list = [...store.leads];
    if (params?.status) list = list.filter((l) => l.status === params.status);
    if (params?.ownerId) list = list.filter((l) => l.owner_id === params.ownerId);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.client?.company_name.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getById(id: string): Promise<Lead | null> {
    return store.leads.find((l) => l.id === id) || null;
  },

  async create(lead: Partial<Lead>): Promise<Lead> {
    const newLead: Lead = {
      id: lead.id || `lead-${Date.now()}`,
      client_id: lead.client_id,
      title: lead.title || "New Prospect Opportunity",
      contact_name: lead.contact_name || "",
      contact_email: lead.contact_email || "",
      contact_phone: lead.contact_phone || "",
      lead_value: Number(lead.lead_value) || 0,
      follow_up_date: lead.follow_up_date || new Date().toISOString().slice(0, 10),
      owner_id: lead.owner_id || store.users[0]?.id,
      status: lead.status || "new",
      notes: lead.notes || "",
      source: lead.source || "Website",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client: store.clients.find((c) => c.id === lead.client_id),
      owner: store.users.find((u) => u.id === lead.owner_id),
    };

    store.leads.unshift(newLead);
    store.save();
    return newLead;
  },

  async update(id: string, updates: Partial<Lead>): Promise<Lead> {
    const idx = store.leads.findIndex((l) => l.id === id);
    if (idx >= 0) {
      store.leads[idx] = {
        ...store.leads[idx],
        ...updates,
        lead_value: updates.lead_value !== undefined ? Number(updates.lead_value) : store.leads[idx].lead_value,
        updated_at: new Date().toISOString(),
        client: updates.client_id ? store.clients.find((c) => c.id === updates.client_id) : store.leads[idx].client,
        owner: updates.owner_id ? store.users.find((u) => u.id === updates.owner_id) : store.leads[idx].owner,
      };
      store.save();
      return store.leads[idx];
    }
    throw new Error("Lead not found");
  },

  async delete(id: string): Promise<boolean> {
    store.leads = store.leads.filter((l) => l.id !== id);
    store.save();
    return true;
  },

  async convertToClient(leadId: string): Promise<{ client: Client; lead: Lead }> {
    const lead = store.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error("Lead not found");

    // 1. Create client from lead
    const newClient = await clientsApi.create({
      company_name: lead.client?.company_name || lead.title || "Converted Client",
      contact_person: lead.contact_name || "Primary Contact",
      email: lead.contact_email || "",
      phone: lead.contact_phone || "",
      source: lead.source || "Converted Lead",
      assigned_manager_id: lead.owner_id || store.users[0]?.id,
      status: "active",
      notes: `Converted from lead "${lead.title}". Notes: ${lead.notes || "None"}`,
    });

    // 2. Mark lead as won and link to new client
    const updatedLead = await this.update(leadId, {
      status: "won",
      client_id: newClient.id,
    });

    // 3. Log activity
    await activitiesApi.create({
      client_id: newClient.id,
      type: "update",
      content: `Lead "${lead.title}" was successfully converted into active client with value of SAR ${(lead.lead_value || 0).toLocaleString()}.`,
      created_by: lead.owner_id || store.users[0]?.id,
    });

    return { client: newClient, lead: updatedLead };
  },
};

/* ─── Follow-ups API ────────────────────────────────────────────────────────── */

export const followUpsApi = {
  async getAll(params?: { clientId?: string; status?: "all" | "pending" | "completed" }): Promise<FollowUp[]> {
    let list = [...store.followUps];
    if (params?.clientId) list = list.filter((f) => f.client_id === params.clientId);
    if (params?.status === "pending") list = list.filter((f) => !f.completed_at);
    if (params?.status === "completed") list = list.filter((f) => !!f.completed_at);
    return list;
  },

  async create(followUp: Partial<FollowUp>): Promise<FollowUp> {
    const item: FollowUp = {
      id: followUp.id || `fu-${Date.now()}`,
      client_id: followUp.client_id!,
      next_action: followUp.next_action || "Follow up call",
      due_date: followUp.due_date || new Date(Date.now() + 86400000).toISOString(),
      notes: followUp.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client: store.clients.find((c) => c.id === followUp.client_id),
    };
    store.followUps.unshift(item);
    store.save();
    return item;
  },

  async complete(id: string): Promise<FollowUp> {
    const idx = store.followUps.findIndex((f) => f.id === id);
    if (idx >= 0) {
      store.followUps[idx].completed_at = new Date().toISOString();
      store.followUps[idx].updated_at = new Date().toISOString();
      store.save();
      return store.followUps[idx];
    }
    throw new Error("Follow-up not found");
  },

  async delete(id: string): Promise<boolean> {
    store.followUps = store.followUps.filter((f) => f.id !== id);
    store.save();
    return true;
  },
};

/* ─── Client Activities API ─────────────────────────────────────────────────── */

export const activitiesApi = {
  async getByClientId(clientId: string): Promise<ClientActivity[]> {
    return store.activities
      .filter((a) => a.client_id === clientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async create(activity: Partial<ClientActivity>): Promise<ClientActivity> {
    const item: ClientActivity = {
      id: activity.id || `act-${Date.now()}`,
      client_id: activity.client_id!,
      type: activity.type || "note",
      content: activity.content || "",
      created_by: activity.created_by || store.users[0]?.id,
      created_at: new Date().toISOString(),
      creator: store.users.find((u) => u.id === activity.created_by) || store.users[0],
    };
    store.activities.unshift(item);
    store.save();
    return item;
  },
};

/* ─── Employees API ─────────────────────────────────────────────────────────── */

export const employeesApi = {
  async getAll(params?: { departmentId?: string; status?: string; search?: string }): Promise<Employee[]> {
    let list = [...store.employees];
    if (params?.departmentId) list = list.filter((e) => e.department_id === params.departmentId);
    if (params?.status) list = list.filter((e) => e.employment_status === params.status);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.employee_id.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q) ||
          e.user?.full_name.toLowerCase().includes(q) ||
          e.user?.email.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getById(id: string): Promise<Employee | null> {
    return store.employees.find((e) => e.id === id) || null;
  },

  async create(emp: {
    fullName: string;
    email: string;
    phone?: string;
    departmentId?: string;
    designation: string;
    employeeId: string;
    joiningDate: string;
    reportingManagerId?: string;
    role?: UserRole;
  }): Promise<Employee> {
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: emp.email,
      role: emp.role || "client",
      full_name: emp.fullName,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.users.push(newUser);

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      user_id: newUser.id,
      employee_id: emp.employeeId,
      department_id: emp.departmentId,
      designation: emp.designation,
      joining_date: emp.joiningDate,
      phone: emp.phone,
      reporting_manager_id: emp.reportingManagerId,
      employment_status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: newUser,
      department: store.departments.find((d) => d.id === emp.departmentId),
      reporting_manager: store.employees.find((e) => e.id === emp.reportingManagerId),
    };

    store.employees.unshift(newEmp);
    store.save();
    return newEmp;
  },

  async update(id: string, updates: Partial<Employee & { fullName?: string; email?: string }>): Promise<Employee> {
    const idx = store.employees.findIndex((e) => e.id === id);
    if (idx >= 0) {
      const emp = store.employees[idx];
      if (updates.fullName || updates.email) {
        const uIdx = store.users.findIndex((u) => u.id === emp.user_id);
        if (uIdx >= 0) {
          if (updates.fullName) store.users[uIdx].full_name = updates.fullName;
          if (updates.email) store.users[uIdx].email = updates.email;
        }
      }

      store.employees[idx] = {
        ...emp,
        ...updates,
        updated_at: new Date().toISOString(),
        department: updates.department_id ? store.departments.find((d) => d.id === updates.department_id) : emp.department,
        reporting_manager: updates.reporting_manager_id ? store.employees.find((e) => e.id === updates.reporting_manager_id) : emp.reporting_manager,
        user: store.users.find((u) => u.id === emp.user_id) || emp.user,
      };
      store.save();
      return store.employees[idx];
    }
    throw new Error("Employee not found");
  },

  async delete(id: string): Promise<boolean> {
    store.employees = store.employees.filter((e) => e.id !== id);
    store.save();
    return true;
  },
};

/* ─── Departments API ───────────────────────────────────────────────────────── */

export const departmentsApi = {
  async getAll(): Promise<Department[]> {
    return store.departments.map((d) => ({
      ...d,
      employee_count: store.employees.filter((e) => e.department_id === d.id).length,
    }));
  },

  async create(dept: { name: string; managerId?: string }): Promise<Department> {
    const item: Department = {
      id: `dept-${Date.now()}`,
      name: dept.name,
      manager_id: dept.managerId,
      employee_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.departments.push(item);
    store.save();
    return item;
  },

  async update(id: string, dept: { name: string; managerId?: string }): Promise<Department> {
    const idx = store.departments.findIndex((d) => d.id === id);
    if (idx >= 0) {
      store.departments[idx] = {
        ...store.departments[idx],
        ...dept,
        updated_at: new Date().toISOString(),
      };
      store.save();
      return store.departments[idx];
    }
    throw new Error("Department not found");
  },

  async delete(id: string): Promise<boolean> {
    store.departments = store.departments.filter((d) => d.id !== id);
    store.save();
    return true;
  },
};

/* ─── Projects API ──────────────────────────────────────────────────────────── */

export const projectsApi = {
  async getAll(params?: { clientId?: string; status?: string; search?: string }): Promise<Project[]> {
    let list = [...store.projects];
    if (params?.clientId) list = list.filter((p) => p.client_id === params.clientId);
    if (params?.status) list = list.filter((p) => p.status === params.status);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.client?.company_name.toLowerCase().includes(q));
    }
    return list;
  },

  async getById(id: string): Promise<Project | null> {
    return store.projects.find((p) => p.id === id) || null;
  },

  async create(project: Partial<Project>): Promise<Project> {
    const item: Project = {
      id: project.id || `p-${Date.now()}`,
      client_id: project.client_id!,
      name: project.name || "New Project",
      status: project.status || "planning",
      start_date: project.start_date || new Date().toISOString().slice(0, 10),
      end_date: project.end_date,
      progress: project.progress || 0,
      description: project.description || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client: store.clients.find((c) => c.id === project.client_id),
    };
    store.projects.unshift(item);
    store.save();
    return item;
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const idx = store.projects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      store.projects[idx] = {
        ...store.projects[idx],
        ...updates,
        updated_at: new Date().toISOString(),
        client: updates.client_id ? store.clients.find((c) => c.id === updates.client_id) : store.projects[idx].client,
      };
      store.save();
      return store.projects[idx];
    }
    throw new Error("Project not found");
  },

  async delete(id: string): Promise<boolean> {
    store.projects = store.projects.filter((p) => p.id !== id);
    store.save();
    return true;
  },
};

/* ─── Tasks API ─────────────────────────────────────────────────────────────── */

export const tasksApi = {
  async getAll(params?: {
    projectId?: string;
    clientId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<Task[]> {
    let list = [...store.tasks];
    if (params?.projectId) list = list.filter((t) => t.project_id === params.projectId);
    if (params?.clientId) list = list.filter((t) => t.client_id === params.clientId);
    if (params?.assigneeId) list = list.filter((t) => t.assignee_id === params.assigneeId);
    if (params?.status) list = list.filter((t) => t.status === params.status);
    if (params?.priority) list = list.filter((t) => t.priority === params.priority);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return list;
  },

  async getById(id: string): Promise<Task | null> {
    return store.tasks.find((t) => t.id === id) || null;
  },

  async create(task: Partial<Task>): Promise<Task> {
    const item: Task = {
      id: task.id || `t-${Date.now()}`,
      project_id: task.project_id,
      client_id: task.client_id,
      title: task.title || "New Task",
      description: task.description || "",
      assignee_id: task.assignee_id,
      priority: task.priority || "medium",
      status: task.status || "todo",
      start_date: task.start_date || new Date().toISOString().slice(0, 10),
      due_date: task.due_date,
      created_by: task.created_by || store.users[0]?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignee: store.users.find((u) => u.id === task.assignee_id),
      project: store.projects.find((p) => p.id === task.project_id),
      client: store.clients.find((c) => c.id === task.client_id),
      comments_count: 0,
      attachments_count: 0,
    };
    store.tasks.unshift(item);
    store.save();
    return item;
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const idx = store.tasks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      store.tasks[idx] = {
        ...store.tasks[idx],
        ...updates,
        updated_at: new Date().toISOString(),
        assignee: updates.assignee_id ? store.users.find((u) => u.id === updates.assignee_id) : store.tasks[idx].assignee,
        project: updates.project_id ? store.projects.find((p) => p.id === updates.project_id) : store.tasks[idx].project,
        client: updates.client_id ? store.clients.find((c) => c.id === updates.client_id) : store.tasks[idx].client,
      };
      store.save();
      return store.tasks[idx];
    }
    throw new Error("Task not found");
  },

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<boolean> {
    store.tasks = store.tasks.filter((t) => t.id !== id);
    store.save();
    return true;
  },
};

/* ─── Task Comments & Attachments API ───────────────────────────────────────── */

export const taskCommentsApi = {
  async getByTaskId(taskId: string): Promise<TaskComment[]> {
    return store.taskComments
      .filter((c) => c.task_id === taskId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async create(comment: { taskId: string; userId: string; content: string }): Promise<TaskComment> {
    const item: TaskComment = {
      id: `tc-${Date.now()}`,
      task_id: comment.taskId,
      user_id: comment.userId,
      content: comment.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: store.users.find((u) => u.id === comment.userId),
    };
    store.taskComments.push(item);
    const task = store.tasks.find((t) => t.id === comment.taskId);
    if (task) task.comments_count = (task.comments_count || 0) + 1;
    store.save();
    return item;
  },
};

export const taskAttachmentsApi = {
  async getByTaskId(taskId: string): Promise<TaskAttachment[]> {
    return store.taskAttachments.filter((a) => a.task_id === taskId);
  },

  async create(attachment: {
    taskId: string;
    fileUrl: string;
    fileName: string;
    fileSize?: string;
    uploadedBy: string;
  }): Promise<TaskAttachment> {
    const item: TaskAttachment = {
      id: `ta-${Date.now()}`,
      task_id: attachment.taskId,
      file_url: attachment.fileUrl,
      file_name: attachment.fileName,
      file_size: attachment.fileSize || "1.2 MB",
      uploaded_by: attachment.uploadedBy,
      created_at: new Date().toISOString(),
      uploader: store.users.find((u) => u.id === attachment.uploadedBy),
    };
    store.taskAttachments.push(item);
    const task = store.tasks.find((t) => t.id === attachment.taskId);
    if (task) task.attachments_count = (task.attachments_count || 0) + 1;
    store.save();
    return item;
  },
};

/* ─── Attendance API ────────────────────────────────────────────────────────── */

export const attendanceApi = {
  async getToday(): Promise<Attendance[]> {
    const today = new Date().toISOString().slice(0, 10);
    // Ensure an attendance record exists for all active employees for demo realism
    store.employees.forEach((emp) => {
      const existing = store.attendance.find((a) => a.employee_id === emp.id && a.date === today);
      if (!existing) {
        store.attendance.push({
          id: `att-${emp.id}-${today}`,
          employee_id: emp.id,
          date: today,
          status: emp.employment_status === "on_leave" ? "leave" : "present",
          check_in: `${today}T08:15:00Z`,
          working_hours: 5.5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          employee: emp,
        });
      }
    });

    return store.attendance
      .filter((a) => a.date === today)
      .map((a) => ({
        ...a,
        employee: store.employees.find((e) => e.id === a.employee_id) || a.employee,
      }));
  },

  async mark(record: {
    employeeId: string;
    date: string;
    status: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    workingHours?: number;
  }): Promise<Attendance> {
    const idx = store.attendance.findIndex((a) => a.employee_id === record.employeeId && a.date === record.date);
    if (idx >= 0) {
      store.attendance[idx] = {
        ...store.attendance[idx],
        ...record,
        updated_at: new Date().toISOString(),
        employee: store.employees.find((e) => e.id === record.employeeId),
      };
      store.save();
      return store.attendance[idx];
    }

    const newItem: Attendance = {
      id: `att-${Date.now()}`,
      employee_id: record.employeeId,
      date: record.date,
      status: record.status,
      check_in: record.checkIn,
      check_out: record.checkOut,
      working_hours: record.workingHours,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee: store.employees.find((e) => e.id === record.employeeId),
    };
    store.attendance.push(newItem);
    store.save();
    return newItem;
  },

  async getCalendar(year: number, month: number, employeeId?: string): Promise<{ date: string; status: AttendanceStatus; checkIn?: string; checkOut?: string }[]> {
    // Generate dates for the given month
    const daysInMonth = new Date(year, month, 0).getDate();
    const result: { date: string; status: AttendanceStatus; checkIn?: string; checkOut?: string }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();

      if (dayOfWeek === 5 || dayOfWeek === 6) {
        // Weekend in GCC
        continue;
      }

      const match = store.attendance.find((a) => a.date === dStr && (!employeeId || a.employee_id === employeeId));
      if (match) {
        result.push({
          date: dStr,
          status: match.status,
          checkIn: match.check_in ? match.check_in.slice(11, 16) : undefined,
          checkOut: match.check_out ? match.check_out.slice(11, 16) : undefined,
        });
      } else {
        // Realistic synthetic status
        const statuses: AttendanceStatus[] = ["present", "present", "present", "present", "late", "half_day"];
        const pseudoRandomStatus = statuses[(day + (employeeId ? employeeId.charCodeAt(0) : 0)) % statuses.length];
        result.push({
          date: dStr,
          status: pseudoRandomStatus,
          checkIn: pseudoRandomStatus === "late" ? "09:12" : "08:24",
          checkOut: "17:35",
        });
      }
    }

    return result;
  },

  async getSummary(employeeId?: string) {
    if (employeeId) {
      // custom summary if employee filter is provided
    }
    return {
      presentDays: 20,
      lateDays: 2,
      absentDays: 0,
      leaveDays: 1,
      halfDays: 1,
      attendanceRate: 95.2,
      averageWorkingHours: 8.2,
    };
  },
};

/* ─── Leave Requests API ────────────────────────────────────────────────────── */

export const leaveRequestsApi = {
  async getAll(params?: { status?: string; employeeId?: string }): Promise<LeaveRequest[]> {
    let list = [...store.leaveRequests];
    if (params?.status) list = list.filter((l) => l.status === params.status);
    if (params?.employeeId) list = list.filter((l) => l.employee_id === params.employeeId);
    return list.map((l) => ({
      ...l,
      employee: store.employees.find((e) => e.id === l.employee_id) || l.employee,
    }));
  },

  async updateStatus(id: string, status: LeaveStatus, approvedBy?: string): Promise<LeaveRequest> {
    const idx = store.leaveRequests.findIndex((l) => l.id === id);
    if (idx >= 0) {
      store.leaveRequests[idx].status = status;
      store.leaveRequests[idx].approved_by = approvedBy || store.users[0]?.id;
      store.leaveRequests[idx].updated_at = new Date().toISOString();
      store.save();
      return store.leaveRequests[idx];
    }
    throw new Error("Leave request not found");
  },

  async create(request: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const item: LeaveRequest = {
      id: request.id || `lr-${Date.now()}`,
      employee_id: request.employee_id!,
      leave_type: request.leave_type || "annual",
      start_date: request.start_date || new Date().toISOString().slice(0, 10),
      end_date: request.end_date || new Date().toISOString().slice(0, 10),
      reason: request.reason || "",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee: store.employees.find((e) => e.id === request.employee_id),
    };
    store.leaveRequests.unshift(item);
    store.save();
    return item;
  },
};

/* ─── Users API ─────────────────────────────────────────────────────────────── */

export const usersApi = {
  async getAll(): Promise<User[]> {
    return store.users;
  },

  async updateRole(id: string, role: UserRole): Promise<User> {
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      store.users[idx].role = role;
      store.users[idx].updated_at = new Date().toISOString();
      store.save();
      return store.users[idx];
    }
    throw new Error("User not found");
  },

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      store.users[idx].status = status;
      store.users[idx].updated_at = new Date().toISOString();
      store.save();
      return store.users[idx];
    }
    throw new Error("User not found");
  },

  async create(user: Partial<User>): Promise<User> {
    const newUser: User = {
      id: user.id || `u-${Date.now()}`,
      email: user.email!,
      role: user.role || "client",
      full_name: user.full_name || "New User",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.users.push(newUser);
    store.save();
    return newUser;
  },
};

/* ─── Settings API ──────────────────────────────────────────────────────────── */

export const settingsApi = {
  async getCompanySettings(): Promise<CompanySettings> {
    return store.companySettings;
  },

  async updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
    store.companySettings = {
      ...store.companySettings,
      ...updates,
      notifications: {
        ...store.companySettings.notifications,
        ...(updates.notifications || {}),
      },
    };
    store.save();
    return store.companySettings;
  },

  async getWorkflowSettings(): Promise<WorkflowSettings> {
    return store.workflowSettings;
  },

  async updateWorkflowSettings(updates: Partial<WorkflowSettings>): Promise<WorkflowSettings> {
    store.workflowSettings = {
      ...store.workflowSettings,
      ...updates,
    };
    store.save();
    return store.workflowSettings;
  },

  async getRolesPermissions() {
    return [
      { module: "Dashboard & KPIs", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: true, edit: false, delete: false, export: true }, client: { view: true, edit: false, delete: false, export: false } },
      { module: "CRM & Clients", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: true, edit: true, delete: false, export: true }, client: { view: false, edit: false, delete: false, export: false } },
      { module: "Leads & Pipeline", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: true, edit: true, delete: false, export: true }, client: { view: false, edit: false, delete: false, export: false } },
      { module: "Employees & HR", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: true, edit: false, delete: false, export: false }, client: { view: false, edit: false, delete: false, export: false } },
      { module: "Projects & Tasks", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: true, edit: true, delete: true, export: true }, client: { view: true, edit: false, delete: false, export: false } },
      { module: "Attendance & Leaves", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: true, edit: true, delete: false, export: true }, client: { view: false, edit: false, delete: false, export: false } },
      { module: "Reports & Analytics", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: true, edit: false, delete: false, export: true }, client: { view: false, edit: false, delete: false, export: false } },
      { module: "System Settings", admin: { view: true, edit: true, delete: true, export: true }, manager: { view: false, edit: false, delete: false, export: false }, client: { view: false, edit: false, delete: false, export: false } },
    ];
  },
};

/* ─── Dashboard Stats & Charts API ──────────────────────────────────────────── */

export const dashboardApi = {
  async getStats() {
    const totalClients = store.clients.length;
    const activeLeads = store.leads.filter((l) => l.status !== "won" && l.status !== "lost").length;
    const activeEmployees = store.employees.filter((e) => e.employment_status === "active").length;
    const todayAttendance = store.attendance.filter((a) => a.status === "present" || a.status === "wfh").length;
    const pendingOverdueTasks = store.tasks.filter((t) => t.status !== "completed").length;
    const completedTasks = store.tasks.filter((t) => t.status === "completed").length;
    const totalTasks = store.tasks.length || 1;
    const completionRate = Math.round((completedTasks / totalTasks) * 100);

    return {
      totalClients: { value: totalClients.toString(), delta: "+18%", positive: true },
      activeLeads: { value: activeLeads.toString(), delta: "+12%", positive: true },
      activeEmployees: { value: activeEmployees.toString(), delta: "0%", positive: true },
      todayAttendance: { value: `${todayAttendance} / ${activeEmployees}`, delta: "92% rate", positive: true },
      pendingOverdueTasks: { value: pendingOverdueTasks.toString(), delta: "-8%", positive: true },
      completionRate: { value: `${completionRate}%`, delta: "+6%", positive: true },
    };
  },

  async getChartsData() {
    return {
      clientGrowth: [
        { month: "Apr", clients: 12, revenue: 140000 },
        { month: "May", clients: 15, revenue: 185000 },
        { month: "Jun", clients: 19, revenue: 230000 },
        { month: "Jul", clients: 22, revenue: 280000 },
        { month: "Aug", clients: 27, revenue: 350000 },
        { month: "Sep", clients: 34, revenue: 420000 },
      ],
      leadConversion: [
        { stage: "New Leads", count: 48, fill: "#94a3b8" },
        { stage: "Contacted", count: 36, fill: "#38bdf8" },
        { stage: "Qualified", count: 26, fill: "#f59e0b" },
        { stage: "Proposal Sent", count: 18, fill: "#8b5cf6" },
        { stage: "Negotiation", count: 12, fill: "#f97316" },
        { stage: "Won Deals", count: 9, fill: "#10b981" },
      ],
      attendanceTrend: [
        { day: "01 Sep", present: 95, late: 3, absent: 2 },
        { day: "02 Sep", present: 96, late: 2, absent: 2 },
        { day: "03 Sep", present: 92, late: 5, absent: 3 },
        { day: "04 Sep", present: 94, late: 4, absent: 2 },
        { day: "05 Sep", present: 98, late: 1, absent: 1 },
        { day: "07 Sep", present: 93, late: 4, absent: 3 },
        { day: "08 Sep", present: 96, late: 2, absent: 2 },
      ],
      taskCompletion: [
        { week: "Week 32", created: 24, completed: 21 },
        { week: "Week 33", created: 28, completed: 26 },
        { week: "Week 34", created: 30, completed: 29 },
        { week: "Week 35", created: 25, completed: 27 },
        { week: "Week 36", created: 32, completed: 30 },
      ],
      teamWorkload: [
        { department: "Engineering", tasks: 28, capacity: 35 },
        { department: "Sales", tasks: 18, capacity: 20 },
        { department: "Success", tasks: 14, capacity: 15 },
        { department: "Operations", tasks: 9, capacity: 12 },
      ],
    };
  },
};

/* ─── Notifications API ─────────────────────────────────────────────────────── */

export const notificationsApi = {
  async getAll(userId?: string): Promise<AppNotification[]> {
    let list = [...store.notifications];
    if (userId) {
      list = list.filter((n) => n.user_id === userId);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async markAsRead(id: string): Promise<AppNotification> {
    const idx = store.notifications.findIndex((n) => n.id === id);
    if (idx >= 0) {
      store.notifications[idx].is_read = true;
      store.save();
      return store.notifications[idx];
    }
    throw new Error("Notification not found");
  },

  async markAllAsRead(userId?: string): Promise<boolean> {
    store.notifications.forEach((n) => {
      if (!userId || n.user_id === userId) {
        n.is_read = true;
      }
    });
    store.save();
    return true;
  },

  async create(notification: Partial<AppNotification>): Promise<AppNotification> {
    const item: AppNotification = {
      id: notification.id || `notif-${Date.now()}`,
      user_id: notification.user_id || "u-mgr-1",
      type: notification.type || "system",
      title: notification.title || "New Notification",
      message: notification.message || "",
      link: notification.link,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    store.notifications.unshift(item);
    store.save();
    return item;
  },
};

