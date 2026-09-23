"""
Pydantic schemas for Kanban validation rules and Overdue detection jobs.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class KanbanRulesConfig(BaseModel):
    enforce_review_step: bool = True
    require_assignee_on_start: bool = True
    allowed_transitions: Dict[str, List[str]] = {
        "todo": ["in_progress"],
        "in_progress": ["todo", "review"],
        "review": ["in_progress", "completed"],
        "completed": ["in_progress", "todo"],
    }


class KanbanMoveValidationRequest(BaseModel):
    task_id: UUID
    current_status: str = Field(..., pattern="^(todo|in_progress|review|completed)$")
    target_status: str = Field(..., pattern="^(todo|in_progress|review|completed)$")
    user_id: Optional[UUID] = None
    assignee_id: Optional[UUID] = None
    user_role: Optional[str] = None


class KanbanMoveValidationResponse(BaseModel):
    allowed: bool
    reason: Optional[str] = None
    violation_code: Optional[str] = None  # e.g. SKIP_REVIEW_NOT_ALLOWED, ASSIGNEE_REQUIRED


class KanbanMoveTaskRequest(BaseModel):
    task_id: UUID
    target_status: str = Field(..., pattern="^(todo|in_progress|review|completed)$")
    comment: Optional[str] = None


class OverdueTaskItem(BaseModel):
    task_id: str
    title: str
    assignee_id: Optional[str] = None
    due_date: str
    days_overdue: int


class OverdueDetectionResult(BaseModel):
    timestamp: datetime
    tasks_scanned: int
    overdue_detected: int
    notifications_created: int
    overdue_tasks: List[OverdueTaskItem]
