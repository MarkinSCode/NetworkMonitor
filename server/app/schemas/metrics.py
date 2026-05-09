from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime

class AgentReport(BaseModel):
    agent_name: str
    timestamp: datetime
    type: Optional[str] = None
    
    system: Optional[Dict[str, Any]] = None
    cpu: Optional[Dict[str, Any]] = None
    memory: Optional[Dict[str, Any]] = None
    disks: Optional[Dict[str, Any]] = None
    network: Optional[Dict[str, Any]] = None
    hardware: Optional[Dict[str, Any]] = None
    processes: Optional[Dict[str, Any]] = None
    collect_interval: Optional[int] = None

class ClientResponse(BaseModel):
    id: int
    mac_address: Optional[str] = None
    display_name: Optional[str] = None
    hostname: Optional[str]
    last_seen: Optional[datetime]
    is_active: bool
    os_info: Optional[str]
    latest_metrics: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class ClientDetailResponse(ClientResponse):
    latest_metrics: Optional[Dict[str, Any]] = None

class MetricsHistoryResponse(BaseModel):
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    disk_percent: float

class MonitorSummary(BaseModel):
    total_clients: int
    active_clients: int
    alerts: int
    average_cpu: float
    average_memory: float

class AlertResponse(BaseModel):
    id: int
    client_id: int
    type: str
    severity: str
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None
    is_active: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True