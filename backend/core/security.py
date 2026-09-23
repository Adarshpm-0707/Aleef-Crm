"""
Security and authentication module for Aleef CRM backend.
Verifies Supabase JWTs on incoming requests, extracts role/user_id,
and enforces Role-Based Access Control (RBAC).
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from backend.core.config import settings

logger = logging.getLogger("backend.security")

# HTTPBearer security scheme
security_bearer = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """Represents an authenticated user extracted from Supabase JWT and DB profile."""
    user_id: UUID
    email: EmailStr
    role: str = "client"  # admin | manager | client
    full_name: Optional[str] = None
    is_active: bool = True
    metadata: Dict[str, Any] = {}

    model_config = {"from_attributes": True}


def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decode and verify a Supabase-issued JWT token.
    Uses SUPABASE_JWT_SECRET if provided, otherwise decodes payload.
    """
    # Development bypass token for local development and testing
    if settings.ENVIRONMENT == "development":
        if token in ("dev-admin-token", "test-token-admin"):
            return {
                "sub": "00000000-0000-0000-0000-000000000001",
                "email": "admin@aleef.com",
                "role": "admin",
                "user_metadata": {"full_name": "Development Administrator", "role": "admin"},
                "app_metadata": {"role": "admin"},
            }
        if token in ("dev-manager-token", "test-token-manager"):
            return {
                "sub": "00000000-0000-0000-0000-000000000002",
                "email": "manager@aleef.com",
                "role": "manager",
                "user_metadata": {"full_name": "Development Manager", "role": "manager"},
                "app_metadata": {"role": "manager"},
            }
        if token in ("dev-client-token", "test-token-client"):
            return {
                "sub": "00000000-0000-0000-0000-000000000003",
                "email": "client@aleef.com",
                "role": "client",
                "user_metadata": {"full_name": "Development Client", "role": "client"},
                "app_metadata": {"role": "client"},
            }

    # If SUPABASE_JWT_SECRET is configured, strictly verify cryptographic signature
    if settings.SUPABASE_JWT_SECRET:
        try:
            # Supabase tokens usually have audience 'authenticated'
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256", settings.ALGORITHM],
                options={"verify_aud": False},
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWTError as err:
            logger.warning(f"JWT signature verification failed: {err}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(err)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # In development or if SUPABASE_JWT_SECRET is not yet set in environment,
    # inspect the claims with signature verification disabled
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False, "verify_aud": False},
        )
        return payload
    except Exception as err:
        logger.error(f"Failed to parse JWT claims: {err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed or unparseable authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts and validates the Supabase JWT from
    the Authorization header and resolves the user ID and role.
    """
    if not credentials or not credentials.credentials:
        # In development mode, if no header is supplied, provide a fallback admin for local browser testing
        if settings.ENVIRONMENT == "development" and not settings.SUPABASE_SERVICE_ROLE_KEY:
            return AuthenticatedUser(
                user_id=UUID("00000000-0000-0000-0000-000000000001"),
                email="admin@aleef.com",
                role="admin",
                full_name="Local Admin (Dev Fallback)",
                is_active=True,
                metadata={"dev_mode": True},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_supabase_jwt(token)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject (user_id).",
        )

    try:
        user_uuid = UUID(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject UUID format in token.",
        )

    email = payload.get("email", "")
    user_metadata = payload.get("user_metadata") or {}
    app_metadata = payload.get("app_metadata") or {}

    # Extract role from user_metadata or app_metadata or fallback to client
    role = (
        user_metadata.get("role")
        or app_metadata.get("role")
        or payload.get("role")
        or "client"
    )
    if role == "authenticated":  # Generic Supabase role
        role = user_metadata.get("role", "client")

    full_name = user_metadata.get("full_name") or email.split("@")[0] if email else "Aleef User"

    # In production with active Supabase, optionally query public.users table for synced role
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            from backend.services.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            res = (
                supabase.table("users")
                .select("id, email, role, full_name, status")
                .eq("id", str(user_uuid))
                .execute()
            )
            if res.data and len(res.data) > 0:
                row = res.data[0]
                role = row.get("role", role)
                full_name = row.get("full_name", full_name)
                user_status = row.get("status", "active")
                if user_status != "active":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="User account is inactive or suspended.",
                    )
        except HTTPException:
            raise
        except Exception as exc:
            logger.debug(f"Could not fetch user record from DB, using JWT claims: {exc}")

    return AuthenticatedUser(
        user_id=user_uuid,
        email=email or "user@aleef.com",
        role=role,
        full_name=full_name,
        is_active=True,
        metadata={"raw_payload": payload},
    )


def require_role(allowed_roles: List[str]):
    """
    Dependency factory to enforce specific roles (RBAC).
    Usage: Depends(require_role(["admin", "manager"]))
    """
    def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {allowed_roles}. Current role: {current_user.role}",
            )
        return current_user

    return role_checker


# Role helper dependencies
require_admin = require_role(["admin"])
require_manager_or_admin = require_role(["admin", "manager"])
require_any_authenticated = get_current_user
