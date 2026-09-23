"""
Aleef CRM — FastAPI Backend
Entry point: uvicorn backend.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.routers import auth, kanban_rules, notifications, reports, users

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup -> yield -> shutdown."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]")
    # Verify Supabase service client initialization on startup
    try:
        from backend.services.supabase_client import get_supabase_client
        get_supabase_client()
        logger.info("Supabase client initialized.")
    except Exception as exc:
        logger.warning(f"Supabase client initialization warning: {exc}")

    yield

    logger.info(f"Shutting down {settings.APP_NAME}.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production REST API for Aleef CRM & Workforce Management Platform. "
        "Provides server-side aggregations, multi-format reporting exports, "
        "event-driven notification triggers, and Kanban state machine enforcement."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Configuration for Next.js Frontend
# ---------------------------------------------------------------------------
origins = list(set(settings.CORS_ORIGINS + [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(kanban_rules.router, prefix="/api/kanban", tags=["kanban"])


# ---------------------------------------------------------------------------
# Root & Health Check
# ---------------------------------------------------------------------------
@app.get("/", tags=["health"])
@app.get("/api/health", tags=["health"])
async def health_check() -> dict:
    """Service health and version probe."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "cors_origins": origins,
    }
