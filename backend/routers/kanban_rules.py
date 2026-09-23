"""
Kanban Rules and Task Workflow Router for Aleef CRM.
Provides:
- Server-side validation for task moves (preventing skipping review step, requiring assignee)
- Atomic task status updates with audit logging
- Automated overdue task detection job with notification dispatch
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.core.config import settings
from backend.core.security import AuthenticatedUser, get_current_user, require_manager_or_admin
from backend.schemas.kanban import (
    KanbanMoveTaskRequest,
    KanbanMoveValidationRequest,
    KanbanMoveValidationResponse,
    KanbanRulesConfig,
    OverdueDetectionResult,
    OverdueTaskItem,
)
from backend.services.notification_service import notification_service
from backend.services.supabase_client import get_supabase_client

logger = logging.getLogger("backend.kanban")
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers & Rules Definition
# ---------------------------------------------------------------------------

def _is_live_db() -> bool:
    return bool(
        settings.SUPABASE_URL
        and settings.SUPABASE_SERVICE_ROLE_KEY
        and "placeholder" not in settings.SUPABASE_URL
    )


def validate_transition(
    current_status: str,
    target_status: str,
    assignee_id: Optional[str] = None,
    enforce_review: bool = True,
    require_assignee: bool = True,
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates a task status transition against business rules.
    Returns: (is_allowed: bool, reason: str, violation_code: str)
    """
    if current_status == target_status:
        return True, "No status change.", None

    # Rule 1: Enforce review step — can't jump to 'completed' without 'review'
    if enforce_review and target_status == "completed" and current_status != "review":
        return (
            False,
            "Cannot complete task directly. Task must pass through the 'review' stage before completion.",
            "SKIP_REVIEW_NOT_ALLOWED",
        )

    # Rule 2: Cannot skip from 'todo' directly to 'completed'
    if current_status == "todo" and target_status == "completed":
        return (
            False,
            "Cannot complete a task directly from 'todo'.",
            "INVALID_DIRECT_COMPLETION",
        )

    # Rule 3: Require assignee when moving from 'todo' to 'in_progress'
    if require_assignee and current_status == "todo" and target_status == "in_progress":
        if not assignee_id:
            return (
                False,
                "Cannot start task without an assignee designated.",
                "ASSIGNEE_REQUIRED",
            )

    # Rule 4: Standard valid transitions
    valid_transitions = {
        "todo": ["in_progress"],
        "in_progress": ["todo", "review"] + (["completed"] if not enforce_review else []),
        "review": ["in_progress", "completed"],
        "completed": ["in_progress", "todo"],
    }

    allowed_targets = valid_transitions.get(current_status, [])
    if target_status not in allowed_targets:
        return (
            False,
            f"Invalid transition from '{current_status}' to '{target_status}'. Allowed targets: {allowed_targets}",
            "INVALID_TRANSITION",
        )

    return True, "Transition allowed.", None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/rules", response_model=KanbanRulesConfig)
async def get_kanban_rules(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve current active Kanban board rules and transition constraints."""
    enforce_review = settings.KANBAN_ENFORCE_REVIEW_STEP
    allowed_transitions = {
        "todo": ["in_progress"],
        "in_progress": ["todo", "review"] + (["completed"] if not enforce_review else []),
        "review": ["in_progress", "completed"],
        "completed": ["in_progress", "todo"],
    }
    return KanbanRulesConfig(
        enforce_review_step=enforce_review,
        require_assignee_on_start=settings.KANBAN_REQUIRE_ASSIGNEE_ON_START,
        allowed_transitions=allowed_transitions,
    )


@router.post("/validate-move", response_model=KanbanMoveValidationResponse)
async def validate_task_move(
    payload: KanbanMoveValidationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Dry-run validation endpoint for frontend drag-and-drop operations.
    Validates if a task status move violates workflow constraints (such as review step).
    """
    assignee_id_str = str(payload.assignee_id) if payload.assignee_id else None

    # If Supabase is connected, optionally verify current status and assignee in DB
    if _is_live_db():
        try:
            client = get_supabase_client()
            res = client.table("tasks").select("status, assignee_id").eq("id", str(payload.task_id)).execute()
            if res.data and len(res.data) > 0:
                db_task = res.data[0]
                # If payload has different current_status, db_task is authoritative
                current_status = db_task.get("status", payload.current_status)
                assignee_id_str = db_task.get("assignee_id") or assignee_id_str
            else:
                current_status = payload.current_status
        except Exception as exc:
            logger.warning(f"Failed to fetch task from DB during validation: {exc}")
            current_status = payload.current_status
    else:
        current_status = payload.current_status

    allowed, reason, violation_code = validate_transition(
        current_status=current_status,
        target_status=payload.target_status,
        assignee_id=assignee_id_str,
        enforce_review=settings.KANBAN_ENFORCE_REVIEW_STEP,
        require_assignee=settings.KANBAN_REQUIRE_ASSIGNEE_ON_START,
    )

    return KanbanMoveValidationResponse(
        allowed=allowed,
        reason=reason,
        violation_code=violation_code,
    )


@router.post("/move-task")
async def move_task(
    payload: KanbanMoveTaskRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Server-side authoritative task transition:
    - Validates transition constraints
    - Updates task status in Supabase
    - Records audit log entry
    - Dispatches notifications on review or completion
    """
    current_status = "todo"
    assignee_id = None
    title = "CRM Task"

    # Fetch task state from DB if live
    if _is_live_db():
        client = get_supabase_client()
        res = client.table("tasks").select("*").eq("id", str(payload.task_id)).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {payload.task_id} not found.",
            )
        task_record = res.data[0]
        current_status = task_record.get("status", "todo")
        assignee_id = task_record.get("assignee_id")
        title = task_record.get("title", title)
    else:
        current_status = "in_progress" if payload.target_status == "review" else "todo"

    # Validate move
    allowed, reason, violation_code = validate_transition(
        current_status=current_status,
        target_status=payload.target_status,
        assignee_id=assignee_id,
        enforce_review=settings.KANBAN_ENFORCE_REVIEW_STEP,
        require_assignee=settings.KANBAN_REQUIRE_ASSIGNEE_ON_START,
    )

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": reason, "violation_code": violation_code},
        )

    # Apply update in DB
    if _is_live_db():
        try:
            client = get_supabase_client()
            update_data = {
                "status": payload.target_status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            client.table("tasks").update(update_data).eq("id", str(payload.task_id)).execute()

            # Record audit log
            audit_entry = {
                "user_id": str(current_user.user_id),
                "action": "UPDATE",
                "entity": "tasks",
                "entity_id": str(payload.task_id),
                "metadata": {
                    "field": "status",
                    "from": current_status,
                    "to": payload.target_status,
                    "comment": payload.comment,
                },
            }
            client.table("audit_logs").insert(audit_entry).execute()

            # Add comment if provided
            if payload.comment:
                comment_data = {
                    "task_id": str(payload.task_id),
                    "user_id": str(current_user.user_id),
                    "content": f"[Status -> {payload.target_status.upper()}] {payload.comment}",
                }
                client.table("task_comments").insert(comment_data).execute()
        except Exception as exc:
            logger.error(f"Error committing task move to Supabase: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist task transition: {str(exc)}",
            )

    # Notify assignee if changed by someone else
    if assignee_id and str(assignee_id) != str(current_user.user_id):
        notification_service.create_notification(
            user_id=UUID(str(assignee_id)),
            notif_type="task_updated",
            message=f'Task "{title}" status updated to {payload.target_status.upper()} by {current_user.full_name}.',
        )

    return {
        "success": True,
        "task_id": payload.task_id,
        "previous_status": current_status,
        "new_status": payload.target_status,
        "updated_by": str(current_user.user_id),
    }


# ---------------------------------------------------------------------------
# Overdue Detection Job
# ---------------------------------------------------------------------------

@router.get("/jobs/detect-overdue", response_model=OverdueDetectionResult)
@router.post("/jobs/detect-overdue", response_model=OverdueDetectionResult)
async def run_overdue_detection_job(
    dry_run: bool = Query(False, description="Detect overdue tasks without dispatching notifications"),
    notify: bool = Query(True, description="Whether to dispatch notifications for detected overdue tasks"),
    current_user: AuthenticatedUser = Depends(require_manager_or_admin),
):
    """
    Automated or scheduled job:
    1. Scans all incomplete tasks ('todo', 'in_progress', 'review').
    2. Identifies tasks past their due date.
    3. Emits urgent overdue notifications to assignees.
    4. Returns audit summary report.
    """
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.date().isoformat()
    overdue_items: List[OverdueTaskItem] = []
    notifs_sent = 0
    scanned = 0

    if _is_live_db():
        try:
            client = get_supabase_client()
            res = (
                client.table("tasks")
                .select("id, title, assignee_id, due_date, status")
                .neq("status", "completed")
                .not_.is_("due_date", "null")
                .lt("due_date", today_str)
                .execute()
            )
            tasks = res.data or []
            scanned = len(tasks)

            for t in tasks:
                due_d = datetime.strptime(t["due_date"], "%Y-%m-%d").date()
                days_diff = (now_utc.date() - due_d).days
                item = OverdueTaskItem(
                    task_id=t["id"],
                    title=t["title"],
                    assignee_id=t.get("assignee_id"),
                    due_date=t["due_date"],
                    days_overdue=max(days_diff, 1),
                )
                overdue_items.append(item)

                # Send notification if task has an assignee and notifications enabled
                if notify and not dry_run and t.get("assignee_id"):
                    try:
                        notification_service.notify_overdue_task(
                            task_id=UUID(t["id"]),
                            title=t["title"],
                            assignee_id=UUID(t["assignee_id"]),
                            due_date=t["due_date"],
                            days_overdue=item.days_overdue,
                        )
                        notifs_sent += 1
                    except Exception as err:
                        logger.error(f"Failed to dispatch overdue notification for task {t['id']}: {err}")
        except Exception as exc:
            logger.error(f"Overdue task detection job failed on Supabase: {exc}")
    else:
        # Development fallback sample
        scanned = 6
        item = OverdueTaskItem(
            task_id="00000000-0000-0000-0000-000000000099",
            title="Resolve Webhook Timeout Issue",
            assignee_id="00000000-0000-0000-0000-000000000013",
            due_date="2026-03-01",
            days_overdue=7,
        )
        overdue_items.append(item)
        if notify and not dry_run:
            notification_service.notify_overdue_task(
                task_id=UUID(item.task_id),
                title=item.title,
                assignee_id=UUID(item.assignee_id),
                due_date=item.due_date,
                days_overdue=item.days_overdue,
            )
            notifs_sent = 1

    return OverdueDetectionResult(
        timestamp=now_utc,
        tasks_scanned=scanned,
        overdue_detected=len(overdue_items),
        notifications_created=notifs_sent,
        overdue_tasks=overdue_items,
    )
