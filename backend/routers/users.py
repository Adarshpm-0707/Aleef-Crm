"""
Users router.
CRUD operations for CRM user/profile management.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, status

from backend.schemas.user import UserCreate, UserRead, UserUpdate
from backend.services.user_service import UserService

router = APIRouter()
_svc = UserService()


@router.get("/", response_model=List[UserRead])
async def list_users(skip: int = 0, limit: int = 50):
    """Return a paginated list of CRM users."""
    return await _svc.list_users(skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: UUID = Path(...)):
    """Fetch a single user by UUID."""
    user = await _svc.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate):
    """Create a new CRM user profile."""
    try:
        return await _svc.create_user(payload)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(payload: UserUpdate, user_id: UUID = Path(...)):
    """Partial update of a user profile."""
    user = await _svc.update_user(user_id, payload)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: UUID = Path(...)):
    """Soft-delete a user profile."""
    deleted = await _svc.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
