from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.metrics import AgentReport
from app.services.metrics_service import MetricsService
from app.api.deps import verify_agent
from datetime import datetime

router = APIRouter()

@router.post("/report")
async def receive_agent_report(
    report: AgentReport,
    agent_name: str = Depends(verify_agent),
    db: Session = Depends(get_db)
):
    try:
        metrics_service = MetricsService(db)
        metrics_service.process_agent_report(agent_name, report)
        return {
            "status": "ok",
            "message": f"Отчёт от {agent_name} принят",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обработки отчёта: {str(e)}"
        )

@router.get("/config")
async def get_agent_config(
    agent_name: str = Depends(verify_agent),
    db: Session = Depends(get_db)
):

    metrics_service = MetricsService(db)
    config_data = metrics_service.get_agent_config(agent_name)
    
    return {
        "agent_name": agent_name,
        "collect_interval": config_data.get("collect_interval", 10),
        "timestamp": datetime.utcnow().isoformat()
    }