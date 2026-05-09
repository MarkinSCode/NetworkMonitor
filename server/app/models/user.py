from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    department = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    is_approved = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    audit_logs = relationship("AuditLog", back_populates="user")
    roles = relationship("UserRole", back_populates="user")