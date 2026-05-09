from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
import re

class UserCreate(BaseModel):
    phone: str = Field(..., pattern=r'^\d{10}$')
    full_name: str = Field(..., min_length=2, max_length=255)
    department: Optional[str] = None
    password: str = Field(..., min_length=6)
    password_confirm: str
    
    @validator('password_confirm')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Пароли не совпадают')
        return v

class UserLogin(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    phone: str
    full_name: str
    department: Optional[str]
    is_approved: bool
    is_blocked: bool
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True