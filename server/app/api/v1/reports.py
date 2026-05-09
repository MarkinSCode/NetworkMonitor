from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.metrics import ProblemReport
from app.models.user import User
from app.api.deps import get_admin_user
from app.core.audit import log_action

router = APIRouter()

@router.get("/")
async def get_reports(
    user_id: Optional[int] = Query(None),
    node_label: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    client_name: Optional[str] = Query(None),
    from_time: Optional[datetime] = Query(None),
    to_time: Optional[datetime] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):

    from app.models.metrics import Client
    
    query = db.query(ProblemReport)
    
    if user_id:
        query = query.filter(ProblemReport.user_id == user_id)
    if node_label:
        query = query.filter(ProblemReport.node_label.ilike(f"%{node_label}%"))
    if client_id:
        query = query.filter(ProblemReport.client_id == client_id)
    if from_time:
        query = query.filter(ProblemReport.created_at >= from_time)
    if to_time:
        query = query.filter(ProblemReport.created_at <= to_time)
    
    # Фильтр по имени клиента
    if client_name:
        query = query.join(Client, ProblemReport.client_id == Client.id, isouter=True)\
            .filter(Client.display_name.ilike(f"%{client_name}%"))
    
    total = query.count()
    reports = query.order_by(ProblemReport.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for r in reports:
        user = db.query(User).filter(User.id == r.user_id).first()
        client = db.query(Client).filter(Client.id == r.client_id).first() if r.client_id else None
        
        result.append({
            'id': r.id,
            'client_id': r.client_id,
            'client_name': client.display_name or client.hostname or client.mac_address if client else 'Не привязан',
            'client_mac': client.mac_address if client else '',
            'node_id': r.node_id,
            'node_label': r.node_label,
            'user_id': r.user_id,
            'user_name': user.full_name if user else 'Неизвестный',
            'description': r.description,
            'created_at': r.created_at.isoformat(),
        })
    
    return {'total': total, 'reports': result}

@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    report = db.query(ProblemReport).filter(ProblemReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Отчёт не найден")
    db.delete(report)
    db.commit()
    log_action(db, admin.id, "REPORT_CLOSED", f"Отчёт о проблеме #{report_id} закрыт")
    return {"message": "Отчёт удалён"}