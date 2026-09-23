"""
Supabase service-role client module.
Provides singleton clients for backend server-side operations that require
bypassing Row Level Security (RLS) to perform aggregations, notifications,
and background maintenance.
"""

import logging
from typing import Optional
from supabase import Client, create_client, AsyncClient, acreate_client
from backend.core.config import settings

logger = logging.getLogger("backend.supabase")

_sync_client: Optional[Client] = None
_async_client: Optional[AsyncClient] = None


def get_supabase_client() -> Client:
    """
    Returns a cached synchronous Supabase Client initialized with the
    service role key for high-privilege server operations.
    """
    global _sync_client
    if _sync_client is not None:
        return _sync_client

    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY

    if not url or not key or "placeholder" in url or "<your" in url:
        logger.warning(
            "Supabase credentials not configured or using placeholders. "
            "Backend will operate in development fallback mode."
        )
        # Initialize with dummy values for development/testing if empty
        url = url or "https://placeholder.supabase.co"
        key = key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy"

    try:
        _sync_client = create_client(url, key)
        return _sync_client
    except Exception as exc:
        logger.error(f"Failed to initialize Supabase client: {exc}")
        raise


async def get_async_supabase_client() -> AsyncClient:
    """
    Returns a cached asynchronous Supabase AsyncClient.
    """
    global _async_client
    if _async_client is not None:
        return _async_client

    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY

    if not url or not key or "placeholder" in url or "<your" in url:
        url = url or "https://placeholder.supabase.co"
        key = key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy"

    try:
        _async_client = await acreate_client(url, key)
        return _async_client
    except Exception as exc:
        logger.error(f"Failed to initialize Supabase async client: {exc}")
        raise
