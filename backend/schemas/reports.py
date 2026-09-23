"""
Pydantic schemas for Reports endpoints.
"""

from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ReportFilterParams(BaseModel):
    """Universal filter parameters for reports endpoints."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    employee_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None


# ---------------------------------------------------------------------------
# CRM Report
# ---------------------------------------------------------------------------

class CrmStageMetric(BaseModel):
    stage: str
    count: int
    value: float


class CrmReportResponse(BaseModel):
    total_clients: int
    active_clients: int
    pipeline_value: float
    won_value: float
    total_deals: int
    won_deals: int
    win_rate: float
    avg_deal_size: float
    stage_breakdown: List[CrmStageMetric]
    items: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Lead Report
# ---------------------------------------------------------------------------

class LeadFunnelStage(BaseModel):
    stage: str
    count: int
    value: float
    conversion_from_previous: float


class LeadReportResponse(BaseModel):
    total_leads: int
    new_leads: int
    qualified_leads: int
    won_leads: int
    lost_leads: int
    conversion_rate: float
    total_pipeline_value: float
    funnel: List[LeadFunnelStage]
    items: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Attendance Report
# ---------------------------------------------------------------------------

class AttendanceDepartmentSummary(BaseModel):
    department_name: str
    total_records: int
    present_count: int
    attendance_rate: float
    avg_hours: float


class AttendanceReportResponse(BaseModel):
    total_records: int
    present_count: int
    late_count: int
    half_day_count: int
    absent_count: int
    wfh_count: int
    leave_count: int
    attendance_rate: float
    total_working_hours: float
    avg_working_hours: float
    department_summary: List[AttendanceDepartmentSummary]
    items: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Task Report
# ---------------------------------------------------------------------------

class TaskReportResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    review_tasks: int
    todo_tasks: int
    overdue_tasks: int
    completion_rate: float
    by_priority: Dict[str, int]
    by_status: Dict[str, int]
    items: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Employee Performance Report
# ---------------------------------------------------------------------------

class EmployeePerformanceMetric(BaseModel):
    employee_id: str
    user_id: str
    name: str
    department: str
    designation: str
    tasks_assigned: int
    tasks_completed: int
    task_completion_rate: float
    attendance_rate: float
    avg_daily_hours: float
    overall_score: float  # Composite score 0 - 100


class PerformanceReportResponse(BaseModel):
    total_evaluated: int
    avg_overall_score: float
    top_performers: List[EmployeePerformanceMetric]
    employees: List[EmployeePerformanceMetric]
