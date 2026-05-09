import socket
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db, engine
from app.models.metrics import ProjectSettings
from app.models.user import User
from app.api.deps import get_admin_user
from app.core.audit import log_action

router = APIRouter()

class SettingsUpdate(BaseModel):
    agent_secret: str | None = None
    is_open: bool | None = None

def get_or_create_settings(db: Session) -> ProjectSettings:
    settings = db.query(ProjectSettings).first()
    if not settings:
        settings = ProjectSettings(agent_secret="agent-secret", is_open=True)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def get_server_info():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('host.docker.internal', 80))
        ip = s.getsockname()[0]
        s.close()
    except:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
        except:
            ip = socket.gethostbyname(socket.gethostname())
    
    return {"ip": ip, "port": 8000, "ws_port": 8000}


@router.get("/")
async def get_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    settings = get_or_create_settings(db)
    
    return {
        "agent_secret": settings.agent_secret,
        "is_open": settings.is_open,
    }

@router.put("/")
async def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    settings = get_or_create_settings(db)
    
    if data.agent_secret is not None:
        settings.agent_secret = data.agent_secret
    if data.is_open is not None:
        settings.is_open = data.is_open
    
    db.commit()
    log_action(db, admin.id, "SETTINGS_UPDATED", "Настройки проекта обновлены")
    return {
        "message": "Настройки обновлены",
        "agent_secret": settings.agent_secret,
        "is_open": settings.is_open,
    }
