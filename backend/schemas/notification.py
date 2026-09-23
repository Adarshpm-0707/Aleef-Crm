"""
Pydantic schemas for Notifications and Event Triggers.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    user_id: UUID
    type: str = Field(
        ...,
        pattern="^(task_assigned|task_updated|task_due|leave_request|leave_approved|leave_rejected|client_assigned|lead_updated|follow_up_due|project_update|mention|system)$",
        description="Must match Postgres notification_type enum values",
    )
    message: str = Field(..., min_length=1, max_length=1000)


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    total: int
    unread: int
    items: List[NotificationResponse]


class NotificationMarkReadRequest(BaseModel):
    notification_ids: Optional[List[UUID]] = None
    mark_all: bool = False


# ---------------------------------------------------------------------------
# Workflow Trigger Schemas
# ---------------------------------------------------------------------------

class TaskAssignmentTrigger(BaseModel):
    task_id: UUID
    title: str
    assignee_id: UUID
    assigned_by_id: Optional[UUID] = None
    assigned_by_name: Optional[str] = "Project Manager"


class ApproachingDeadlineTrigger(BaseModel):
    task_id: UUID
    title: str
    assignee_id: UUID
    due_date: str
    hours_remaining: Optional[int] = 24


class OverdueTaskTrigger(BaseModel):
    task_id: UUID
    title: str
    assignee_id: UUID
    due_date: str
    days_overdue: Optional[int] = 1


class LeaveDecisionTrigger(BaseModel):
    employee_user_id: UUID
    status: str = Field(..., pattern="^(approved|rejected)$")
    leave_id: Optional[UUID] = None
    reason: Optional[str] = None
    approver_name: Optional[str] = "Admin / Manager"


class FollowUpDueTrigger(BaseModel):
    client_id: UUID
    client_name: str
    owner_id: UUID
    next_action: str
    due_date: str
