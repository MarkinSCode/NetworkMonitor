from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.schemas.user import UserCreate, Token
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.audit import log_action
from typing import Optional
from datetime import timedelta

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def register_user(self, user_data: UserCreate):
        existing_user = self.db.query(User).filter(
            User.phone == user_data.phone
        ).first()
        
        if existing_user:
            raise ValueError("Пользователь с таким телефоном уже существует")
        
        users_count = self.db.query(User).count()
        is_first_user = (users_count == 0)
        
        user = User(
            phone=user_data.phone,
            full_name=user_data.full_name,
            department=user_data.department,
            hashed_password=get_password_hash(user_data.password),
            is_approved=is_first_user,
            is_blocked=False,
            is_admin=is_first_user,
        )
        
        self.db.add(user)
        self.db.commit()
        
        log_action(
            self.db,
            user_id=user.id,
            action="REGISTRATION",
            description=f"Пользователь {user_data.phone} зарегистрировался{' (первый пользователь, админ)' if is_first_user else ''}"
        )
        
        return user
    
    def login_user(self, phone: str, password: str) -> Optional[Token]:
        user = self.db.query(User).filter(User.phone == phone).first()
        
        if not user:
            log_action(
                self.db,
                user_id=None,
                action="LOGIN_FAILED",
                description=f"Попытка входа с несуществующим телефоном: {phone}"
            )
            return None
        
        if not user.is_approved:
            log_action(
                self.db,
                user_id=user.id,
                action="LOGIN_DENIED",
                description="Попытка входа неподтверждённого пользователя"
            )
            raise ValueError("Учётная запись не подтверждена администратором")
        
        if user.is_blocked:
            log_action(
                self.db,
                user_id=user.id,
                action="LOGIN_BLOCKED",
                description="Попытка входа заблокированного пользователя"
            )
            raise ValueError("Учётная запись заблокирована")
        
        if not verify_password(password, user.hashed_password):
            log_action(
                self.db,
                user_id=user.id,
                action="LOGIN_FAILED",
                description="Неверный пароль"
            )
            return None
        
        access_token = create_access_token(
            data={"sub": str(user.id), "phone": user.phone}
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        log_action(
            self.db,
            user_id=user.id,
            action="LOGIN_SUCCESS",
            description="Успешный вход"
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token
        )
    
    def refresh_tokens(self, refresh_token: str) -> Optional[Token]:
        payload = decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            return None
        
        user_id = payload.get("sub")
        user = self.db.query(User).filter(User.id == int(user_id)).first()
        
        if not user or user.is_blocked:
            return None
        
        new_access_token = create_access_token(
            data={"sub": str(user.id), "phone": user.phone}
        )
        new_refresh_token = create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token
        )