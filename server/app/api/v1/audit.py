from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()

@router.get("/")
async def get_audit_logs(
    user_id: Optional[int] = Query(None),
    user_name: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    from_time: Optional[datetime] = Query(None),
    to_time: Optional[datetime] = Query(None),
    limit: int = Query(50, le=1000),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    query = db.query(AuditLog)
    
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if description:
        query = query.filter(AuditLog.description.ilike(f"%{description}%"))
    if from_time:
        query = query.filter(AuditLog.timestamp >= from_time)
    if to_time:
        query = query.filter(AuditLog.timestamp <= to_time)
    
    if user_name:
        query = query.join(User, AuditLog.user_id == User.id, isouter=True)\
            .filter(User.full_name.ilike(f"%{user_name}%"))
    
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    result = []
    for log in logs:
        result.append({
            'id': log.id,
            'user_id': log.user_id,
            'user_name': log.user.full_name if log.user else 'Система',
            'action': log.action,
            'description': log.description,
            'ip_address': log.ip_address,
            'timestamp': log.timestamp.isoformat(),
        })
    
    return {
        'total': total,
        'logs': result
    }