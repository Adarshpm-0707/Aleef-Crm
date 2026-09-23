"""
Notifications Router for Aleef CRM.
Provides CRUD and automated event triggers:
- List notifications for authenticated user
- Mark individual or all notifications as read
- Workflow event triggers (task assignment, approaching deadline,
  overdue task, leave decisions, follow-up due)
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from backend.core.security import AuthenticatedUser, get_current_user, require_manager_or_admin
from backend.schemas.notification import (
    ApproachingDeadlineTrigger,
    FollowUpDueTrigger,
    LeaveDecisionTrigger,
    NotificationCreate,
    NotificationListResponse,
    NotificationMarkReadRequest,
    NotificationResponse,
    OverdueTaskTrigger,
    TaskAssignmentTrigger,
)
from backend.services.notification_service import notification_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Notification CRUD & Queries
# ---------------------------------------------------------------------------

@router.get("/", response_model=NotificationListResponse)
async def list_user_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: Optional[UUID] = Query(None, description="Admin/Manager query for a specific user"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve paginated notifications.
    Clients receive their own notifications; Admins/Managers can query another user's.
    """
    target_user_id = current_user.user_id
    if user_id and current_user.role in ("admin", "manager"):
        target_user_id = user_id

    result = notification_service.list_notifications(
        user_id=target_user_id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return result


@router.get("/unread-count")
async def get_unread_count(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get the unread notification badge count for the current user."""
    count = notification_service.get_unread_count(current_user.user_id)
    return {"user_id": current_user.user_id, "unread_count": count}


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_notification(
    payload: NotificationCreate,
    current_user: AuthenticatedUser = Depends(require_manager_or_admin),
):
    """Create a notification (Admin / Manager privilege)."""
    try:
        created = notification_service.create_notification(
            user_id=payload.user_id,
            notif_type=payload.type,
            message=payload.message,
        )
        return created
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create notification: {str(exc)}",
        )


@router.patch("/{notification_id}/read")
@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: UUID = Path(..., description="UUID of notification to mark read"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Mark a single notification as read for the current user."""
    # Admins can mark any notification read; clients can only mark their own
    user_filter = None if current_user.role == "admin" else current_user.user_id
    success = notification_service.mark_as_read(notification_id, user_filter)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or already marked as read.",
        )
    return {"message": "Notification marked as read.", "id": notification_id}


@router.post("/mark-read")
async def mark_batch_or_all_read(
    payload: NotificationMarkReadRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Batch mark specific notifications as read, or mark all as read."""
    if payload.mark_all:
        count = notification_service.mark_all_as_read(current_user.user_id)
        return {"message": f"Marked {count} notifications as read.", "marked_count": count}

    if payload.notification_ids:
        user_filter = None if current_user.role == "admin" else current_user.user_id
        count = notification_service.mark_batch_as_read(payload.notification_ids, user_filter)
        return {"message": f"Marked {count} notifications as read.", "marked_count": count}

    return {"message": "No notifications specified to mark as read.", "marked_count": 0}


@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Mark all unread notifications for current user as read."""
    count = notification_service.mark_all_as_read(current_user.user_id)
    return {"message": f"Marked {count} notifications as read.", "marked_count": count}


# ---------------------------------------------------------------------------
# Automated Workflow Triggers
# ---------------------------------------------------------------------------

@router.post("/trigger/task-assignment", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_task_assignment(
    payload: TaskAssignmentTrigger,
    current_user: AuthenticatedUser = Depends(require_manager_or_admin),
):
    """
    Trigger notification when a task is assigned to a team member.
    """
    assigner_name = payload.assigned_by_name or current_user.full_name or "A manager"
    notif = notification_service.notify_task_assigned(
        task_id=payload.task_id,
        title=payload.title,
        assignee_id=payload.assignee_id,
        assigned_by_name=assigner_name,
    )
    return notif


@router.post("/trigger/approaching-deadline", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_approaching_deadline(
    payload: ApproachingDeadlineTrigger,
    current_user: AuthenticatedUser = Depends(require_manager_or_admin),
):
    """
    Trigger notification when a task's due date is approaching (e.g. 24 hours).
    """
    notif = notification_service.notify_approaching_deadline(
        task_id=payload.task_id,
        title=payload.title,
        assignee_id=payload.assignee_id,
        due_date=payload.due_date,
        hours_remaining=payload.hours_remaining or 24,
    )
    return notif


@router.post("/trigger/overdue-task", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_overdue_task(
    payload: OverdueTaskTrigger,
    current_user: AuthenticatedUser = Depends(require_manager_or_admin),
):
    """
    Trigger urgent notification when a task has passed its due date without completion.
    """
    notif = notification_service.notify_overdue_task(
        task_id=payload.task_id,
        title=payload.title,
        assignee_id=payload.assignee_id,
        due_date=payload.due_date,
        days_overdue=payload.days_overdue or 1,
    )
    return notif


@router.post("/trigger/leave-decision", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_leave_decision(
    payload: LeaveDecisionTrigger,
    current_user: AuthenticatedUser = Depends(require_manager_or_admin),
):
    """
    Trigger notification to employee when their leave request is approved or rejected.
    """
    approver = payload.approver_name or current_user.full_name or "Administration"
    notif = notification_service.notify_leave_decision(
        employee_user_id=payload.employee_user_id,
        status=payload.status,
        approver_name=approver,
        reason=payload.reason,
    )
    return notif


@router.post("/trigger/follow-up-due", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_follow_up_due(
    payload: FollowUpDueTrigger,
    current_user: AuthenticatedUser = Depends(require_manager_or_admin),
):
    """
    Trigger notification when a client follow-up action reaches its due date.
    """
    notif = notification_service.notify_follow_up_due(
        client_id=payload.client_id,
        client_name=payload.client_name,
        owner_id=payload.owner_id,
        next_action=payload.next_action,
        due_date=payload.due_date,
    )
    return notif
