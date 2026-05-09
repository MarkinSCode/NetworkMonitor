from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    password: Optional[str] = None
    password_confirm: Optional[str] = None
    
    @validator('password_confirm')
    def passwords_match(cls, v, values):
        if 'password' in values and values['password']:
            if not v:
                raise ValueError('Подтверждение пароля обязательно')
            if v != values['password']:
                raise ValueError('Пароли не совпадают')
        return v

class ProjectResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int

class ProjectJoinRequest(BaseModel):
    project_name: str
    password: Optional[str] = None

class ProjectSettingsUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None