"""
Core application configuration.
All secrets come from environment variables or .env files.
"""

from typing import List, Optional
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env.local", "../.env", ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # App metadata
    # ------------------------------------------------------------------
    APP_NAME: str = "Aleef CRM API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development | staging | production

    # ------------------------------------------------------------------
    # Supabase configuration
    # Supports both SUPABASE_* and NEXT_PUBLIC_SUPABASE_* variable names
    # ------------------------------------------------------------------
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Aliases populated if NEXT_PUBLIC_* are present
    NEXT_PUBLIC_SUPABASE_URL: Optional[str] = None
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Optional[str] = None

    # ------------------------------------------------------------------
    # JWT (for verification and fallback)
    # ------------------------------------------------------------------
    SECRET_KEY: str = "super-secret-key-aleef-crm-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ------------------------------------------------------------------
    # Kanban business rules
    # ------------------------------------------------------------------
    KANBAN_ENFORCE_REVIEW_STEP: bool = True
    KANBAN_REQUIRE_ASSIGNEE_ON_START: bool = True
    OVERDUE_TASK_LOOKAHEAD_HOURS: int = 24

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    def model_post_init(self, __context) -> None:
        """Resolve Supabase URL & keys from NEXT_PUBLIC_* if main keys are empty."""
        if not self.SUPABASE_URL and self.NEXT_PUBLIC_SUPABASE_URL:
            self.SUPABASE_URL = self.NEXT_PUBLIC_SUPABASE_URL
        if not self.SUPABASE_ANON_KEY and self.NEXT_PUBLIC_SUPABASE_ANON_KEY:
            self.SUPABASE_ANON_KEY = self.NEXT_PUBLIC_SUPABASE_ANON_KEY


settings = Settings()
