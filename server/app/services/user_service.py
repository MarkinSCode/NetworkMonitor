from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.user import User
from app.core.security import get_password_hash
from app.core.audit import log_action

class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_all_users(self) -> List[User]:
        return self.db.query(User).order_by(User.created_at.desc()).all()
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()
    
    def approve_user(self, user_id: int, admin_user: User) -> User:
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Пользователь не найден")
        
        user.is_approved = True
        
        log_action(
            self.db,
            user_id=admin_user.id,
            action="USER_APPROVED",
            description=f"Администратор подтвердил регистрацию пользователя {user.phone}"
        )
        
        self.db.commit()
        return user
    
    def block_user(self, user_id: int, admin_user: User) -> User:
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Пользователь не найден")
        
        user.is_blocked = True
        
        log_action(
            self.db,
            user_id=admin_user.id,
            action="USER_BLOCKED",
            description=f"Администратор заблокировал пользователя {user.phone}"
        )
        
        self.db.commit()
        return user
    
    def unblock_user(self, user_id: int, admin_user: User) -> User:
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Пользователь не найден")
        
        user.is_blocked = False
        
        log_action(
            self.db,
            user_id=admin_user.id,
            action="USER_UNBLOCKED",
            description=f"Администратор разблокировал пользователя {user.phone}"
        )
        
        self.db.commit()
        return user
    
    def delete_user(self, user_id: int, admin_user: User) -> bool:
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Пользователь не найден")
        
        self.db.delete(user)
        
        log_action(
            self.db,
            user_id=admin_user.id,
            action="USER_DELETED",
            description=f"Администратор удалил пользователя {user.phone}"
        )
        
        self.db.commit()
        return True
    
    def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Пользователь не найден")
        
        from app.core.security import verify_password
        
        if not verify_password(old_password, user.hashed_password):
            raise ValueError("Неверный старый пароль")
        
        user.hashed_password = get_password_hash(new_password)
        
        log_action(
            self.db,
            user_id=user_id,
            action="PASSWORD_CHANGED",
            description="Пользователь изменил пароль"
        )
        
        self.db.commit()
        return True