from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    mac_address = Column(String(17), unique=True, index=True, nullable=False)
    display_name = Column(String(255))
    hostname = Column(String(255))
    
    os_info = Column(String(255))
    cpu_model = Column(String(255))
    cpu_physical_cores = Column(Integer)
    cpu_logical_cores = Column(Integer)
    ram_total_gb = Column(Float)
    
    last_seen = Column(DateTime(timezone=True))
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    metrics = relationship("MetricSnapshot", back_populates="client", cascade="all, delete-orphan")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    message = Column(String(255), nullable=False)
    value = Column(Float)
    threshold = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    client = relationship("Client", backref="alerts")
    
class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    
    cpu_percent = Column(Float)
    cpu_cores = Column(JSONB)
    memory_percent = Column(Float)
    memory_used_gb = Column(Float)
    disk_percent = Column(Float)
    disk_used_gb = Column(Float)
    uptime_seconds = Column(Integer)
    
    network_bytes_sent = Column(Integer, default=0)
    network_bytes_recv = Column(Integer, default=0)
    
    processes = Column(JSONB)
    processes_total = Column(Integer)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    client = relationship("Client", back_populates="metrics")


class MonitorSettings(Base):
    __tablename__ = "monitor_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    collect_interval = Column(Integer, default=60)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class NetworkSchema(Base):
    __tablename__ = "network_schemas"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), default="Основная схема")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    nodes = relationship("SchemaNode", back_populates="schema", cascade="all, delete-orphan")

class SchemaNode(Base):
    __tablename__ = "schema_nodes"
    
    id = Column(Integer, primary_key=True, index=True)
    schema_id = Column(Integer, ForeignKey("network_schemas.id", ondelete="CASCADE"))
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    label = Column(String(255))
    type = Column(String(50), default="computer")
    x = Column(Float, default=0)
    y = Column(Float, default=0)
    data = Column(JSONB, default={})
    
    schema = relationship("NetworkSchema", back_populates="nodes")

class ProblemReport(Base):
    __tablename__ = "problem_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)
    node_id = Column(String(100))
    node_label = Column(String(255))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProjectSettings(Base):
    __tablename__ = "project_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_secret = Column(String(255), default="agent-secret")
    is_open = Column(Boolean, default=True)  # Доступ не-админам
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())