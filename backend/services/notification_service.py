"""
Notification service for Aleef CRM.
Handles notification persistence in Supabase `notifications` table,
unread counts, mark-read operations, and automated workflow triggers.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from backend.core.config import settings
from backend.services.supabase_client import get_supabase_client

logger = logging.getLogger("backend.notifications")

# In-memory store fallback for development/testing when Supabase credentials are empty
_memory_notifications: List[Dict[str, Any]] = []


class NotificationService:
    """Manages notifications and automated trigger generation."""

    def __init__(self):
        self._supabase = None

    def _client(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    def _is_live_db(self) -> bool:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        return bool(url and key and "placeholder" not in url and "<your" not in url)

    def create_notification(self, user_id: UUID, notif_type: str, message: str) -> Dict[str, Any]:
        """
        Inserts a new notification into the database or dev memory store.
        """
        record = {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "type": notif_type,
            "message": message,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if self._is_live_db():
            try:
                client = self._client()
                res = client.table("notifications").insert(record).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as exc:
                logger.error(f"Failed to insert notification in Supabase: {exc}. Falling back to local store.")

        # Dev / fallback store
        _memory_notifications.insert(0, record)
        return record

    def list_notifications(
        self,
        user_id: Optional[UUID] = None,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Retrieves paginated notifications for a user.
        """
        if self._is_live_db():
            try:
                client = self._client()
                query = client.table("notifications").select("*", count="exact")
                if user_id:
                    query = query.eq("user_id", str(user_id))
                if unread_only:
                    query = query.eq("is_read", False)

                res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
                items = res.data or []
                total = res.count if res.count is not None else len(items)

                # Get unread count
                unread_query = client.table("notifications").select("id", count="exact").eq("is_read", False)
                if user_id:
                    unread_query = unread_query.eq("user_id", str(user_id))
                unread_res = unread_query.execute()
                unread_count = unread_res.count if unread_res.count is not None else 0

                return {
                    "total": total,
                    "unread": unread_count,
                    "items": items,
                }
            except Exception as exc:
                logger.error(f"Error querying notifications from Supabase: {exc}")

        # Fallback in-memory query
        filtered = _memory_notifications
        if user_id:
            filtered = [n for n in filtered if n["user_id"] == str(user_id)]

        unread_count = sum(1 for n in filtered if not n["is_read"])

        if unread_only:
            filtered = [n for n in filtered if not n["is_read"]]

        total = len(filtered)
        paginated = filtered[offset: offset + limit]

        return {
            "total": total,
            "unread": unread_count,
            "items": paginated,
        }

    def mark_as_read(self, notification_id: UUID, user_id: Optional[UUID] = None) -> bool:
        """
        Marks a specific notification as read.
        """
        if self._is_live_db():
            try:
                client = self._client()
                query = client.table("notifications").update({"is_read": True}).eq("id", str(notification_id))
                if user_id:
                    query = query.eq("user_id", str(user_id))
                res = query.execute()
                return bool(res.data)
            except Exception as exc:
                logger.error(f"Failed to mark notification read in Supabase: {exc}")

        # Fallback store
        for n in _memory_notifications:
            if n["id"] == str(notification_id):
                if user_id is None or n["user_id"] == str(user_id):
                    n["is_read"] = True
                    return True
        return False

    def mark_batch_as_read(self, notification_ids: List[UUID], user_id: Optional[UUID] = None) -> int:
        """
        Marks multiple notifications as read in a single batch.
        """
        if not notification_ids:
            return 0

        id_strs = [str(nid) for nid in notification_ids]

        if self._is_live_db():
            try:
                client = self._client()
                query = client.table("notifications").update({"is_read": True}).in_("id", id_strs)
                if user_id:
                    query = query.eq("user_id", str(user_id))
                res = query.execute()
                return len(res.data) if res.data else 0
            except Exception as exc:
                logger.error(f"Failed to batch mark notifications read: {exc}")

        # Fallback store
        updated_count = 0
        for n in _memory_notifications:
            if n["id"] in id_strs and not n["is_read"]:
                if user_id is None or n["user_id"] == str(user_id):
                    n["is_read"] = True
                    updated_count += 1
        return updated_count

    def mark_all_as_read(self, user_id: UUID) -> int:
        """
        Marks all notifications for a specific user as read.
        """
        if self._is_live_db():
            try:
                client = self._client()
                res = (
                    client.table("notifications")
                    .update({"is_read": True})
                    .eq("user_id", str(user_id))
                    .eq("is_read", False)
                    .execute()
                )
                return len(res.data) if res.data else 0
            except Exception as exc:
                logger.error(f"Failed to mark all notifications read: {exc}")

        # Fallback store
        updated_count = 0
        for n in _memory_notifications:
            if n["user_id"] == str(user_id) and not n["is_read"]:
                n["is_read"] = True
                updated_count += 1
        return updated_count

    def get_unread_count(self, user_id: UUID) -> int:
        """
        Returns the number of unread notifications for a user.
        """
        if self._is_live_db():
            try:
                client = self._client()
                res = (
                    client.table("notifications")
                    .select("id", count="exact")
                    .eq("user_id", str(user_id))
                    .eq("is_read", False)
                    .execute()
                )
                return res.count or 0
            except Exception as exc:
                logger.error(f"Failed to count unread notifications: {exc}")

        return sum(1 for n in _memory_notifications if n["user_id"] == str(user_id) and not n["is_read"])

    # -----------------------------------------------------------------------
    # Automated Triggers
    # -----------------------------------------------------------------------

    def notify_task_assigned(
        self,
        task_id: UUID,
        title: str,
        assignee_id: UUID,
        assigned_by_name: Optional[str] = "A manager",
    ) -> Dict[str, Any]:
        message = f'You have been assigned to task "{title}" by {assigned_by_name}.'
        return self.create_notification(
            user_id=assignee_id,
            notif_type="task_assigned",
            message=message,
        )

    def notify_approaching_deadline(
        self,
        task_id: UUID,
        title: str,
        assignee_id: UUID,
        due_date: str,
        hours_remaining: int = 24,
    ) -> Dict[str, Any]:
        message = (
            f'Approaching Deadline: Task "{title}" is due on {due_date} '
            f'(approx {hours_remaining} hours remaining).'
        )
        return self.create_notification(
            user_id=assignee_id,
            notif_type="task_due",
            message=message,
        )

    def notify_overdue_task(
        self,
        task_id: UUID,
        title: str,
        assignee_id: UUID,
        due_date: str,
        days_overdue: int = 1,
    ) -> Dict[str, Any]:
        message = (
            f'OVERDUE NOTICE: Task "{title}" is overdue by {days_overdue} day(s) '
            f'(was due on {due_date}). Please update its status or request an extension.'
        )
        return self.create_notification(
            user_id=assignee_id,
            notif_type="task_due",
            message=message,
        )

    def notify_leave_decision(
        self,
        employee_user_id: UUID,
        status: str,
        approver_name: Optional[str] = "Administration",
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        decision_type = "leave_approved" if status.lower() == "approved" else "leave_rejected"
        extra = f" Reason: {reason}" if reason else ""
        message = f"Your leave request has been {status.upper()} by {approver_name}.{extra}"
        return self.create_notification(
            user_id=employee_user_id,
            notif_type=decision_type,
            message=message,
        )

    def notify_follow_up_due(
        self,
        client_id: UUID,
        client_name: str,
        owner_id: UUID,
        next_action: str,
        due_date: str,
    ) -> Dict[str, Any]:
        message = f'Follow-up due for {client_name}: Action "{next_action}" is scheduled for {due_date}.'
        return self.create_notification(
            user_id=owner_id,
            notif_type="follow_up_due",
            message=message,
        )


notification_service = NotificationService()
