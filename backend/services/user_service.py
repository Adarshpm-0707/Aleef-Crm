"""
User service — business logic for user CRUD.
Connects to Supabase via the service-role client.
"""

from typing import Any, Dict, List, Optional, cast
from uuid import UUID

from supabase import AsyncClient

from backend.services.supabase_client import get_async_supabase_client
from backend.schemas.user import UserCreate, UserRead, UserUpdate


class UserService:
    """Encapsulates all user data operations against Supabase."""

    TABLE = "users"

    async def _client(self) -> AsyncClient:
        return await get_async_supabase_client()

    async def list_users(self, skip: int = 0, limit: int = 50) -> List[UserRead]:
        client = await self._client()
        response = (
            await client.table(self.TABLE)
            .select("*")
            .range(skip, skip + limit - 1)
            .execute()
        )
        data = response.data or []
        if isinstance(data, list):
            return [
                UserRead.model_validate(row)
                for row in data
                if isinstance(row, dict)
            ]
        return []

    async def get_user(self, user_id: UUID) -> Optional[UserRead]:
        client = await self._client()
        response = (
            await client.table(self.TABLE)
            .select("*")
            .eq("id", str(user_id))
            .single()
            .execute()
        )
        if not response.data or not isinstance(response.data, dict):
            return None
        return UserRead.model_validate(response.data)

    async def create_user(self, payload: UserCreate) -> UserRead:
        client = await self._client()
        # Create auth user first
        auth_response = await client.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
            }
        )
        user_id = auth_response.user.id

        # Upsert profile to public.users
        profile_data = {
            "id": user_id,
            "email": payload.email,
            "full_name": payload.full_name,
            "role": payload.role,
            "status": "active" if payload.is_active else "inactive",
        }
        profile_response = (
            await client.table(self.TABLE).insert(profile_data).execute()
        )
        if not profile_response.data or not isinstance(profile_response.data, list):
            raise ValueError("Failed to create user profile")
        row = profile_response.data[0]
        if not isinstance(row, dict):
            raise ValueError("Invalid profile response format")
        return UserRead.model_validate(row)

    async def update_user(self, user_id: UUID, payload: UserUpdate) -> Optional[UserRead]:
        client = await self._client()
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            return await self.get_user(user_id)
        if "is_active" in updates:
            updates["status"] = "active" if updates.pop("is_active") else "inactive"
        response = (
            await client.table(self.TABLE)
            .update(updates)
            .eq("id", str(user_id))
            .execute()
        )
        if not response.data or not isinstance(response.data, list):
            return None
        row = response.data[0]
        if not isinstance(row, dict):
            return None
        return UserRead.model_validate(row)

    async def delete_user(self, user_id: UUID) -> bool:
        client = await self._client()
        response = (
            await client.table(self.TABLE)
            .update({"status": "inactive"})
            .eq("id", str(user_id))
            .execute()
        )
        return bool(response.data)
