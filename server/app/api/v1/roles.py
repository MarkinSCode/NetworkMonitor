from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.core.audit import log_action
from app.models.role import Role, UserRole
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()

class RoleCreate(BaseModel):
    name: str
    description: str = ""

class RoleResponse(BaseModel):
    id: int
    name: str
    description: str | None
    user_count: int = 0
    
    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    user_id: int

@router.get("/", response_model=List[RoleResponse])
async def get_roles(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    roles = db.query(Role).all()
    result = []
    for role in roles:
        count = db.query(UserRole).filter(UserRole.role_id == role.id).count()
        result.append({
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'user_count': count,
        })
    return result

@router.post("/")
async def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    existing = db.query(Role).filter(Role.name == data.name).first()
    if existing:
        raise HTTPException(400, "Роль с таким именем уже существует")
    
    role = Role(name=data.name, description=data.description)
    db.add(role)
    db.commit()
    log_action(db, admin.id, "ROLE_CREATED", f"Роль '{data.name}' создана")
    return {"message": "Роль создана", "id": role.id}

@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Роль не найдена")
    db.delete(role)
    db.commit()
    log_action(db, admin.id, "ROLE_DELETED", f"Роль удалена")
    return {"message": "Роль удалена"}

@router.get("/{role_id}/users")
async def get_role_users(
    role_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    users = db.query(User).join(UserRole).filter(UserRole.role_id == role_id).all()
    return [
        {"id": u.id, "full_name": u.full_name, "phone": u.phone, "department": u.department}
        for u in users
    ]

@router.post("/{role_id}/users")
async def add_user_to_role(
    role_id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    exists = db.query(UserRole).filter(
        UserRole.role_id == role_id,
        UserRole.user_id == data.user_id
    ).first()
    if exists:
        raise HTTPException(400, "Пользователь уже в этой роли")
    
    ur = UserRole(role_id=role_id, user_id=data.user_id)
    db.add(ur)
    db.commit()
    log_action(db, admin.id, "USER_ADDED_TO_ROLE", f"Пользователь {data.user_id} добавлен в роль {role_id}")
    return {"message": "Пользователь добавлен"}

@router.delete("/{role_id}/users/{user_id}")
async def remove_user_from_role(
    role_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    db.query(UserRole).filter(
        UserRole.role_id == role_id,
        UserRole.user_id == user_id
    ).delete()
    db.commit()
    log_action(db, admin.id, "USER_REMOVED_FROM_ROLE", f"Пользователь {user_id} удалён из роли {role_id}")
    return {"message": "Пользователь удалён из роли"}