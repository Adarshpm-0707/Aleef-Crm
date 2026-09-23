"""Routers package for Aleef CRM FastAPI backend."""

from backend.routers import auth, kanban_rules, notifications, reports, users

__all__ = ["auth", "users", "reports", "notifications", "kanban_rules"]
