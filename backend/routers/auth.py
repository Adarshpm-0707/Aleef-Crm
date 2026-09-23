"""
Authentication router.
Wraps Supabase Auth — sign-up, sign-in, sign-out, password reset.
"""

from fastapi import APIRouter, HTTPException, status

from backend.schemas.user import (
    SignInRequest,
    SignUpRequest,
    AuthResponse,
    MessageResponse,
)
from backend.services.auth_service import AuthService

router = APIRouter()
_svc = AuthService()


@router.post("/sign-up", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def sign_up(payload: SignUpRequest):
    """Register a new user via Supabase Auth."""
    try:
        return await _svc.sign_up(payload)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/sign-in", response_model=AuthResponse)
async def sign_in(payload: SignInRequest):
    """Sign in with email + password."""
    try:
        return await _svc.sign_in(payload)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@router.post("/sign-out", response_model=MessageResponse)
async def sign_out(access_token: str):
    """Invalidate a Supabase session."""
    try:
        await _svc.sign_out(access_token)
        return {"message": "Signed out successfully."}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(email: str):
    """Send a password-reset email via Supabase Auth."""
    try:
        await _svc.reset_password(email)
        return {"message": "Password reset email sent."}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
