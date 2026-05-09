import asyncio
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.metrics import Client, MetricSnapshot, Alert
from app.core.audit import log_action
from app.schemas.metrics import AlertResponse
from app.database import get_db
from app.schemas.metrics import (
    ClientResponse, 
    ClientDetailResponse,
    MetricsHistoryResponse,
    MonitorSummary
)
from app.services.metrics_service import MetricsService
from app.api.deps import get_current_user, get_admin_user
from app.models.user import User

class IntervalUpdate(BaseModel):
    interval: int = Field(..., ge=1, le=60)

class DisplayNameUpdate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255)

class ScreenshotRequest(BaseModel):
    client_id: int

class ProblemReportCreate(BaseModel):
    client_id: Optional[int] = None
    node_id: Optional[str] = None
    node_label: Optional[str] = None
    description: str

class DeleteMetricsRequest(BaseModel):
    client_ids: Optional[List[int]] = None
    from_time: Optional[datetime] = None
    to_time: Optional[datetime] = None

router = APIRouter()

@router.get("/settings")
async def get_monitor_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    metrics_service = MetricsService(db)
    interval = metrics_service.get_monitor_interval()
    return {"collect_interval": interval}

@router.put("/settings/interval")
async def update_monitor_interval(
    interval_data: IntervalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    metrics_service = MetricsService(db)
    new_interval = metrics_service.update_monitor_interval(interval_data.interval)
    
    from app.services.ws_manager import ws_manager
    for agent_name in list(ws_manager.agents.keys()):
        await ws_manager.update_interval(agent_name, new_interval)
    
    return {
        "message": f"Интервал изменён на {new_interval} сек",
        "collect_interval": new_interval
    }

@router.get("/clients", response_model=List[ClientResponse])
async def get_clients(
    department: Optional[str] = Query(None, description="Фильтр по отделу"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    metrics_service = MetricsService(db)
    metrics_service.update_clients_status()
    clients = metrics_service.get_clients(department=department)
    if current_user.is_admin:
        return clients
    user_roles = [ur.role.name for ur in current_user.roles] if current_user.roles else []
    hidden_client_ids = metrics_service.get_hidden_client_ids(user_roles)
    return [c for c in clients if c.id not in hidden_client_ids]

@router.get("/summary", response_model=MonitorSummary)
async def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    metrics_service = MetricsService(db)
    metrics_service.update_clients_status() 
    return metrics_service.get_summary()

@router.get("/clients/{client_id}", response_model=ClientDetailResponse)
async def get_client_detail(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    metrics_service = MetricsService(db)
    client = metrics_service.get_client_detail(client_id)
    
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Клиент не найден"
        )
    
    return client

@router.get("/clients/{client_id}/history", response_model=List[MetricsHistoryResponse])
async def get_client_history(
    client_id: int,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if not from_time:
        from_time = datetime.utcnow() - timedelta(hours=24)
    if not to_time:
        to_time = datetime.utcnow()
    
    metrics_service = MetricsService(db)
    return metrics_service.get_client_history(client_id, from_time, to_time)

@router.put("/clients/{client_id}/name")
async def update_client_name(
    client_id: int,
    name_data: DisplayNameUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    metrics_service = MetricsService(db)
    success = metrics_service.update_client_display_name(client_id, name_data.display_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    log_action(db, current_user.id, "CLIENT_RENAMED", f"Клиент {client_id} переименован")
    return {"message": "Имя обновлено", "display_name": name_data.display_name}

@router.get("/alerts")
async def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alerts = db.query(Alert).filter(Alert.is_active == True)\
        .order_by(Alert.created_at.desc()).all()
    
    result = []
    for alert in alerts:
        client = db.query(Client).filter(Client.id == alert.client_id).first()
        result.append({
            'id': alert.id,
            'client_id': alert.client_id,
            'client_name': client.display_name or client.hostname or client.mac_address or 'Неизвестный',
            'mac_address': client.mac_address or '',
            'type': alert.type,
            'severity': alert.severity,
            'message': alert.message,
            'value': alert.value,
            'threshold': alert.threshold,
            'created_at': alert.created_at.isoformat(),
            'is_active': alert.is_active,
        })
    
    return result

@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.is_active = False
        alert.resolved_at = datetime.utcnow()
        db.commit()
        return {"message": "Предупреждение закрыто"}
    raise HTTPException(status_code=404, detail="Не найдено")

@router.post("/screenshot")
async def request_screenshot(
    req: ScreenshotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log_action(db, current_user.id, "SCREENSHOT_REQUESTED", f"Запрошен скриншот клиента {req.client_id}")
    client = db.query(Client).filter(Client.id == req.client_id).first()
    if not client:
        raise HTTPException(404, "Клиент не найден")
    
    from app.services.ws_manager import ws_manager
    
    if client.mac_address not in ws_manager.agents:
        raise HTTPException(400, "Клиент не в сети")
    
    ws = ws_manager.agents[client.mac_address]['websocket']
    
    await ws.send_json({'type': 'screenshot'})
    
    try:
        response = await asyncio.wait_for(ws.receive_json(), timeout=15)
        if response.get('type') == 'screenshot' and response.get('data'):
            return {"image": response['data'], "client_name": client.display_name or client.hostname}
    except asyncio.TimeoutError:
        pass
    
    raise HTTPException(408, "Таймаут скриншота")

@router.post("/problem-report")
async def create_problem_report(
    data: ProblemReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.metrics import ProblemReport
    
    report = ProblemReport(
        client_id=data.client_id,
        node_id=data.node_id,
        node_label=data.node_label,
        user_id=current_user.id,
        description=data.description,
    )
    db.add(report)
    db.commit()
    log_action(db, current_user.id, "PROBLEM_REPORTED", f"Отчёт о проблеме: {data.node_label}")
    return {"message": "Отчёт создан", "id": report.id}

@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Удаление клиента и всех его метрик"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Клиент не найден")
    db.delete(client)
    db.commit()
    return {"message": f"Клиент удалён"}

@router.delete("/metrics")
async def delete_metrics(
     data: DeleteMetricsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MetricSnapshot)
    
    if data.client_ids:
        query = query.filter(MetricSnapshot.client_id.in_(data.client_ids))
    if data.from_time:
        query = query.filter(MetricSnapshot.timestamp >= data.from_time)
    if data.to_time:
        query = query.filter(MetricSnapshot.timestamp <= data.to_time)
    
    deleted = query.delete(synchronize_session=False)
    db.commit()
    log_action(db, current_user.id, "METRICS_DELETED", f"Удалено {deleted} записей мониторинга")
    return {"message": f"Удалено записей: {deleted}", "deleted": deleted}