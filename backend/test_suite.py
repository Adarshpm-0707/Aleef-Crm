"""
Automated Test Suite for Aleef CRM FastAPI Backend.
Tests all routers, reports, exports, notifications, Kanban rules, and RBAC security.
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

DEV_ADMIN_TOKEN = "dev-admin-token"
DEV_MANAGER_TOKEN = "dev-manager-token"
DEV_CLIENT_TOKEN = "dev-client-token"

admin_headers = {"Authorization": f"Bearer {DEV_ADMIN_TOKEN}"}
manager_headers = {"Authorization": f"Bearer {DEV_MANAGER_TOKEN}"}
client_headers = {"Authorization": f"Bearer {DEV_CLIENT_TOKEN}"}


def test_health():
    print("\n--- Testing Health & OpenAPI Endpoints ---")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data
    print("✓ Health check passed:", data)

    res_openapi = client.get("/api/openapi.json")
    assert res_openapi.status_code == 200
    schema = res_openapi.json()
    assert "/api/reports/crm" in schema["paths"]
    assert "/api/notifications/" in schema["paths"]
    assert "/api/kanban/validate-move" in schema["paths"]
    print(f"✓ OpenAPI schema verified ({len(schema['paths'])} endpoints documented)")


def test_reports_json():
    print("\n--- Testing Reports JSON Aggregation Endpoints with Filters ---")
    # 1. CRM report (unfiltered and filtered)
    crm_res = client.get("/api/reports/crm", headers=admin_headers)
    assert crm_res.status_code == 200, f"CRM report failed: {crm_res.text}"
    crm_data = crm_res.json()
    assert "total_deals" in crm_data
    assert "pipeline_value" in crm_data
    assert "stage_breakdown" in crm_data
    print("✓ CRM report JSON passed: Total Deals =", crm_data["total_deals"], "| Pipeline Value =", crm_data["pipeline_value"])

    # CRM report with status & date filters
    crm_filtered = client.get(
        "/api/reports/crm?status=won&start_date=2026-01-01&end_date=2026-03-31",
        headers=admin_headers,
    )
    assert crm_filtered.status_code == 200
    crm_filt_data = crm_filtered.json()
    assert crm_filt_data["total_deals"] >= 1
    for deal in crm_filt_data["items"]:
        assert deal["status"] == "won"
    print("✓ CRM report filtered by status=won passed: Deals =", crm_filt_data["total_deals"])

    # 2. Leads report (with employee_id filter)
    leads_res = client.get("/api/reports/leads", headers=admin_headers)
    assert leads_res.status_code == 200
    leads_data = leads_res.json()
    assert "funnel" in leads_data
    assert "conversion_rate" in leads_data
    print("✓ Lead report JSON passed: Total Leads =", leads_data["total_leads"], "| Conversion =", leads_data["conversion_rate"])

    leads_filtered = client.get(
        "/api/reports/leads?employee_id=00000000-0000-0000-0000-000000000011",
        headers=admin_headers,
    )
    assert leads_filtered.status_code == 200
    print("✓ Lead report filtered by employee_id passed: Leads =", leads_filtered.json()["total_leads"])

    # 3. Attendance report (with department and status filters)
    att_res = client.get("/api/reports/attendance", headers=admin_headers)
    assert att_res.status_code == 200
    att_data = att_res.json()
    assert "attendance_rate" in att_data
    assert "total_working_hours" in att_data
    print("✓ Attendance report JSON passed: Attendance Rate =", att_data["attendance_rate"], "%")

    att_filtered = client.get(
        "/api/reports/attendance?department_id=00000000-0000-0000-0000-000000000101&status=present",
        headers=admin_headers,
    )
    assert att_filtered.status_code == 200
    print("✓ Attendance report filtered by department & status passed: Records =", att_filtered.json()["total_records"])

    # 4. Tasks report (with priority and employee filters)
    task_res = client.get("/api/reports/tasks", headers=admin_headers)
    assert task_res.status_code == 200
    task_data = task_res.json()
    assert "completion_rate" in task_data
    assert "by_priority" in task_data
    print("✓ Task report JSON passed: Completion Rate =", task_data["completion_rate"], "%")

    task_filtered = client.get(
        "/api/reports/tasks?priority=urgent&client_id=00000000-0000-0000-0000-000000000203",
        headers=admin_headers,
    )
    assert task_filtered.status_code == 200
    print("✓ Task report filtered by priority & client passed: Tasks =", task_filtered.json()["total_tasks"])

    # 5. Performance report
    perf_res = client.get("/api/reports/performance", headers=admin_headers)
    assert perf_res.status_code == 200
    perf_data = perf_res.json()
    assert "employees" in perf_data
    assert "top_performers" in perf_data
    print("✓ Performance report JSON passed: Evaluated =", perf_data["total_evaluated"], "| Avg Score =", perf_data["avg_overall_score"])


def test_reports_export():
    print("\n--- Testing Report Export Endpoints (CSV / Excel / PDF) with Filters ---")
    for r_type in ["crm", "leads", "attendance", "tasks", "performance"]:
        # CSV export with date and status filters
        csv_res = client.get(
            f"/api/reports/{r_type}/export/csv?start_date=2026-01-01&end_date=2026-03-31",
            headers=admin_headers,
        )
        assert csv_res.status_code == 200, f"CSV export for {r_type} failed"
        assert csv_res.headers["content-type"].startswith("text/csv")
        assert len(csv_res.content) > 0

        # Excel export
        excel_res = client.get(
            f"/api/reports/{r_type}/export/excel?start_date=2026-01-01&end_date=2026-03-31",
            headers=admin_headers,
        )
        assert excel_res.status_code == 200, f"Excel export for {r_type} failed"
        assert "spreadsheetml" in excel_res.headers["content-type"]
        assert len(excel_res.content) > 1000

        # PDF export
        pdf_res = client.get(
            f"/api/reports/{r_type}/export/pdf?start_date=2026-01-01&end_date=2026-03-31",
            headers=admin_headers,
        )
        assert pdf_res.status_code == 200, f"PDF export for {r_type} failed"
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert pdf_res.content.startswith(b"%PDF")
        print(f"✓ {r_type.upper()} exports verified (CSV: {len(csv_res.content)} bytes, Excel: {len(excel_res.content)} bytes, PDF: {len(pdf_res.content)} bytes)")


def test_notifications():
    print("\n--- Testing Notification Endpoints & Workflow Triggers ---")
    # 1. Create notification
    create_res = client.post(
        "/api/notifications/",
        headers=admin_headers,
        json={
            "user_id": "00000000-0000-0000-0000-000000000001",
            "type": "system",
            "message": "Backend automated integration test running.",
        },
    )
    assert create_res.status_code == 201, f"Notification creation failed: {create_res.text}"
    notif_id = create_res.json()["id"]
    print("✓ Custom notification created with ID:", notif_id)

    # 2. List notifications
    list_res = client.get("/api/notifications/", headers=admin_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    print(f"✓ Listed notifications: Total = {list_data['total']}, Unread = {list_data['unread']}")

    # 3. Unread count
    count_res = client.get("/api/notifications/unread-count", headers=admin_headers)
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] >= 1
    print("✓ Unread count verified:", count_res.json()["unread_count"])

    # 4. Mark single read via PATCH
    read_patch = client.patch(f"/api/notifications/{notif_id}/read", headers=admin_headers)
    assert read_patch.status_code == 200
    print("✓ Single notification marked as read via PATCH")

    # 5. Workflow Triggers
    t1 = client.post(
        "/api/notifications/trigger/task-assignment",
        headers=admin_headers,
        json={
            "task_id": "00000000-0000-0000-0000-000000000010",
            "title": "Build Client Portal UI",
            "assignee_id": "00000000-0000-0000-0000-000000000001",
            "assigned_by_name": "Sarah Connor",
        },
    )
    assert t1.status_code == 201
    n1_id = t1.json()["id"]
    print("✓ Trigger task assignment passed:", t1.json()["message"])

    t2 = client.post(
        "/api/notifications/trigger/approaching-deadline",
        headers=admin_headers,
        json={
            "task_id": "00000000-0000-0000-0000-000000000010",
            "title": "Build Client Portal UI",
            "assignee_id": "00000000-0000-0000-0000-000000000001",
            "due_date": "2026-03-10",
            "hours_remaining": 12,
        },
    )
    assert t2.status_code == 201
    n2_id = t2.json()["id"]
    print("✓ Trigger approaching deadline passed")

    t3 = client.post(
        "/api/notifications/trigger/overdue-task",
        headers=admin_headers,
        json={
            "task_id": "00000000-0000-0000-0000-000000000010",
            "title": "Build Client Portal UI",
            "assignee_id": "00000000-0000-0000-0000-000000000001",
            "due_date": "2026-03-01",
            "days_overdue": 3,
        },
    )
    assert t3.status_code == 201
    print("✓ Trigger overdue task passed")

    t4 = client.post(
        "/api/notifications/trigger/leave-decision",
        headers=admin_headers,
        json={
            "employee_user_id": "00000000-0000-0000-0000-000000000001",
            "status": "approved",
            "approver_name": "Executive Management",
        },
    )
    assert t4.status_code == 201
    print("✓ Trigger leave decision passed:", t4.json()["message"])

    t5 = client.post(
        "/api/notifications/trigger/follow-up-due",
        headers=admin_headers,
        json={
            "client_id": "00000000-0000-0000-0000-000000000020",
            "client_name": "Apex Global",
            "owner_id": "00000000-0000-0000-0000-000000000001",
            "next_action": "Renew Annual Support Agreement",
            "due_date": "2026-03-15",
        },
    )
    assert t5.status_code == 201
    print("✓ Trigger follow-up due passed")

    # 6. Batch mark read via POST /mark-read
    batch_res = client.post(
        "/api/notifications/mark-read",
        headers=admin_headers,
        json={"notification_ids": [n1_id, n2_id]},
    )
    assert batch_res.status_code == 200
    assert batch_res.json()["marked_count"] >= 1
    print("✓ Batch mark read passed:", batch_res.json())

    # 7. Mark all as read
    mark_all = client.post("/api/notifications/mark-all-read", headers=admin_headers)
    assert mark_all.status_code == 200
    print("✓ Mark all notifications as read passed:", mark_all.json())


def test_kanban_rules():
    print("\n--- Testing Kanban Rules, Move Validation & Overdue Job ---")
    # 1. Get rules
    rules_res = client.get("/api/kanban/rules", headers=admin_headers)
    assert rules_res.status_code == 200
    rules = rules_res.json()
    assert rules["enforce_review_step"] is True
    print("✓ Kanban rules retrieved:", rules)

    # 2. Valid transition: todo -> in_progress (with assignee)
    valid_res = client.post(
        "/api/kanban/validate-move",
        headers=admin_headers,
        json={
            "task_id": "00000000-0000-0000-0000-000000000030",
            "current_status": "todo",
            "target_status": "in_progress",
            "assignee_id": "00000000-0000-0000-0000-000000000001",
        },
    )
    assert valid_res.status_code == 200
    assert valid_res.json()["allowed"] is True
    print("✓ Valid move (todo -> in_progress) allowed")

    # 3. Invalid transition: skipping review step (in_progress -> completed)
    blocked_skip = client.post(
        "/api/kanban/validate-move",
        headers=admin_headers,
        json={
            "task_id": "00000000-0000-0000-0000-000000000030",
            "current_status": "in_progress",
            "target_status": "completed",
        },
    )
    assert blocked_skip.status_code == 200
    res_data = blocked_skip.json()
    assert res_data["allowed"] is False
    assert res_data["violation_code"] == "SKIP_REVIEW_NOT_ALLOWED"
    print("✓ Blocked skipping review step (in_progress -> completed):", res_data["reason"])

    # 4. Invalid transition: missing assignee (todo -> in_progress with no assignee)
    blocked_assignee = client.post(
        "/api/kanban/validate-move",
        headers=admin_headers,
        json={
            "task_id": "00000000-0000-0000-0000-000000000030",
            "current_status": "todo",
            "target_status": "in_progress",
            "assignee_id": None,
        },
    )
    assert blocked_assignee.status_code == 200
    res_assignee = blocked_assignee.json()
    assert res_assignee["allowed"] is False
    assert res_assignee["violation_code"] == "ASSIGNEE_REQUIRED"
    print("✓ Blocked starting task without assignee:", res_assignee["reason"])

    # 5. Overdue detection job via POST
    job_post = client.post("/api/kanban/jobs/detect-overdue", headers=admin_headers)
    assert job_post.status_code == 200
    job_data = job_post.json()
    assert "tasks_scanned" in job_data
    assert "overdue_detected" in job_data
    print(f"✓ Overdue job (POST) executed: Scanned {job_data['tasks_scanned']} tasks, Detected {job_data['overdue_detected']} overdue")

    # 6. Overdue detection job via GET with dry_run
    job_get = client.get("/api/kanban/jobs/detect-overdue?dry_run=true", headers=admin_headers)
    assert job_get.status_code == 200
    assert job_get.json()["notifications_created"] == 0
    print("✓ Overdue job (GET dry_run) executed cleanly without sending notifications")


def test_rbac_security():
    print("\n--- Testing RBAC Security & Role Verification ---")
    # Client role should NOT have access to manager/admin reports
    res_forbidden = client.get("/api/reports/crm", headers=client_headers)
    assert res_forbidden.status_code == 403, f"Expected 403 Forbidden for client role on CRM report, got: {res_forbidden.status_code}"
    print("✓ Client role correctly blocked (403 Forbidden) from management reports")

    # Manager role CAN access reports
    res_mgr = client.get("/api/reports/crm", headers=manager_headers)
    assert res_mgr.status_code == 200
    print("✓ Manager role successfully authenticated and authorized (200 OK)")

    # Unauthenticated request should be 401 Unauthorized
    res_unauth = client.get("/api/reports/crm", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res_unauth.status_code == 401
    print("✓ Invalid token correctly rejected with 401 Unauthorized")


if __name__ == "__main__":
    try:
        test_health()
        test_reports_json()
        test_reports_export()
        test_notifications()
        test_kanban_rules()
        test_rbac_security()
        print("\n==========================================")
        print("ALL BACKEND TEST SUITES PASSED PERFECTLY!")
        print("==========================================")
    except AssertionError as err:
        print("\n❌ TEST FAILURE:", err)
        sys.exit(1)
    except Exception as exc:
        print("\n❌ UNEXPECTED ERROR:", exc)
        sys.exit(1)
