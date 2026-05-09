from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.user import UserResponse
from app.services.user_service import UserService
from app.api.deps import get_current_user, get_admin_user
from app.models.user import User
from app.core.audit import log_action

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    user_service = UserService(db)
    return user_service.get_all_users()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    return user

@router.put("/{user_id}/approve")
async def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    user_service = UserService(db)
    try:
        user_service.approve_user(user_id, admin_user)
        return {"message": "Пользователь подтверждён"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{user_id}/block")
async def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    user_service = UserService(db)
    try:
        user_service.block_user(user_id, admin_user)
        return {"message": "Пользователь заблокирован"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    user_service = UserService(db)
    try:
        user_service.unblock_user(user_id, admin_user)
        return {"message": "Пользователь разблокирован"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    user_service = UserService(db)
    try:
        user_service.delete_user(user_id, admin_user)
        return {"message": "Пользователь удалён"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/me/password")
async def change_password(
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_service = UserService(db)
    try:
        user_service.change_password(current_user.id, old_password, new_password)
        return {"message": "Пароль изменён"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{user_id}/toggle-admin")
async def toggle_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.is_admin = not user.is_admin
    db.commit()
    log_action(db, user.id, "ADMIN_TOGGLED", f"Админ права {'выданы' if user.is_admin else 'отозваны'} для {user.phone}")
    return {"message": f"Права администратора {'выданы' if user.is_admin else 'отозваны'}", "is_admin": user.is_admin}