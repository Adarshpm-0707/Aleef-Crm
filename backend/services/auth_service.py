"""
Auth service — wraps Supabase Auth operations.
"""

from supabase import AsyncClient, acreate_client

from backend.core.config import settings
from backend.schemas.user import AuthResponse, SignInRequest, SignUpRequest


class AuthService:
    async def _client(self) -> AsyncClient:
        return await acreate_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
        )

    async def sign_up(self, payload: SignUpRequest) -> AuthResponse:
        client = await self._client()
        response = await client.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": {
                        "full_name": payload.full_name,
                        "role": payload.role,
                    }
                },
            }
        )
        session = response.session
        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in,
            user_id=response.user.id,
        )

    async def sign_in(self, payload: SignInRequest) -> AuthResponse:
        client = await self._client()
        response = await client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
        session = response.session
        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            expires_in=session.expires_in,
            user_id=response.user.id,
        )

    async def sign_out(self, access_token: str) -> None:
        client = await self._client()
        await client.auth.sign_out()

    async def reset_password(self, email: str) -> None:
        client = await self._client()
        await client.auth.reset_password_email(email)
