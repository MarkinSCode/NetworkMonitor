import logging
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from app.models.metrics import Client, MetricSnapshot, MonitorSettings
from app.schemas.metrics import AgentReport
from app.models.metrics import Alert
import json

logger = logging.getLogger(__name__)

class MetricsService:
    def __init__(self, db: Session):
        self.db = db
    
    def process_agent_report(self, agent_name: str, report: AgentReport):
        system = report.system or {}
        mac = system.get('mac_address') or getattr(report, 'agent_id', None)
        hostname = system.get('hostname')
        
        client = self._get_or_create_client(agent_name, mac, hostname)
        
        if not client.os_info or client.os_info == 'Unknown':
            self._update_static_info(client, report)
        
        client.last_seen = datetime.utcnow()
        client.is_active = True
        
        self._save_metrics(client, report)
        self.db.commit()
    
    def _get_or_create_client(self, agent_name, mac, hostname):
        if not mac:
            mac = agent_name
        
        client = self.db.query(Client).filter(Client.mac_address == mac).first()
        
        if not client:
            display_name = hostname if hostname and not self._looks_like_mac(hostname) else f"Компьютер-{mac[-5:]}"
            client = Client(
                mac_address=mac,
                hostname=hostname,
                display_name=display_name
            )
            self.db.add(client)
            self.db.flush()
        else:
            if hostname and not self._looks_like_mac(hostname):
                client.hostname = hostname
        return client

    
    def _update_static_info(self, client, report):
        system = report.system or {}
        cpu = report.cpu or {}
        memory = report.memory or {}
        
        cpu_model = cpu.get('model') or system.get('cpu_model') or ''
        physical = cpu.get('physical_cores') or system.get('cpu_physical_cores') or 0
        logical = cpu.get('logical_cores') or system.get('cpu_logical_cores') or 0
        ram_total = memory.get('ram', {}).get('total_gb') or system.get('memory', {}).get('ram_total_gb') or 0
        
        if cpu_model and client.cpu_model != cpu_model:
            client.cpu_model = cpu_model
        if physical and client.cpu_physical_cores != physical:
            client.cpu_physical_cores = physical
        if logical and client.cpu_logical_cores != logical:
            client.cpu_logical_cores = logical
        if ram_total and client.ram_total_gb != ram_total:
            client.ram_total_gb = ram_total
        
        os_info = system.get('os') or client.os_info or 'Unknown'
        if os_info:
            client.os_info = os_info

    def _save_metrics(self, client, report):
        system = report.system or {}
        cpu = report.cpu or {}
        memory = report.memory or {}
        disks = report.disks or {}
        network = report.network or {}
        processes = report.processes or {}
        
        proc_list = processes.get('top10', processes.get('top_cpu_consumers', []))
        proc_data = [
            {
                'pid': p.get('pid', 0),
                'name': p.get('name', ''),
                'cpu': p.get('cpu', p.get('cpu_percent', 0)),
                'memory': p.get('memory', p.get('memory_percent', 0))
            }
            for p in proc_list[:10]
        ]
        
        partitions = disks.get('partitions', system.get('disks', []))
        disk_percent = max((p.get('percent', 0) for p in partitions), default=0)
        disk_used = sum((p.get('used_gb', 0) for p in partitions))
        
        ram_total = memory.get('ram', {}).get('total_gb') or system.get('memory', {}).get('ram_total_gb') or 0
        ram_used = memory.get('ram', {}).get('used_gb') or system.get('memory', {}).get('ram_used_gb') or 0
        ram_percent = memory.get('ram', {}).get('percent') or system.get('memory', {}).get('ram_percent') or 0
        
        if ram_total and not client.ram_total_gb:
            client.ram_total_gb = ram_total
        
        snapshot = MetricSnapshot(
            client=client,
            timestamp=report.timestamp,
            cpu_percent=cpu.get('usage_percent', system.get('cpu_usage_percent', 0)),
            cpu_cores=cpu.get('usage_per_core', system.get('cpu_usage_per_core', [])),
            memory_percent=ram_percent,
            memory_used_gb=ram_used,
            disk_percent=disk_percent,
            disk_used_gb=disk_used,
            uptime_seconds=system.get('uptime_seconds', 0),
            network_bytes_sent=network.get('bytes_sent', 0),
            network_bytes_recv=network.get('bytes_recv', 0),
            processes=proc_data,
            processes_total=processes.get('total', processes.get('total_count', 0)),
        )
        self.db.add(snapshot)
        self.db.flush()
        self.check_alerts(client.id, snapshot)

    def process_raw_metrics(self, agent_name: str, data: dict):
        agent_id = data.get('agent_id', agent_name)
        hostname = data.get('hostname') or data.get('system', {}).get('hostname')
        
        converted = self._convert_new_format(agent_name, data)
        converted['agent_id'] = agent_id
        converted['system']['hostname'] = hostname or agent_name
        
        report = AgentReport(**converted)
        self.process_agent_report(agent_name, report)

    def _convert_new_format(self, agent_name: str, data: dict) -> dict:
        system = data.get('system', {})
        processes_data = data.get('processes', {})
        
        return {
            'agent_name': agent_name,
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
            'system': {
                'hostname': system.get('hostname', ''),
                'os': system.get('os', ''),
                'architecture': system.get('architecture', ''),
                'uptime_seconds': system.get('uptime_seconds', 0),
                'boot_time': ''
            },
            'cpu': {
                'model': system.get('cpu_model', ''),
                'physical_cores': system.get('cpu_physical_cores', 0),
                'logical_cores': system.get('cpu_logical_cores', 0),
                'usage_percent': system.get('cpu_usage_percent', 0),
                'usage_per_core': system.get('cpu_usage_per_core', [])
            },
            'memory': {
                'ram': {
                    'total_gb': system.get('memory', {}).get('ram_total_gb', 0),
                    'available_gb': 0,
                    'used_gb': system.get('memory', {}).get('ram_used_gb', 0),
                    'percent': system.get('memory', {}).get('ram_percent', 0)
                },
                'swap': {
                    'total_gb': 0,
                    'used_gb': system.get('memory', {}).get('swap_used_gb', 0),
                    'percent': system.get('memory', {}).get('swap_percent', 0)
                }
            },
            'disks': {
                'partitions': system.get('disks', [])
            },
            'network': {
                'interfaces': []
            },
            'hardware': None,
            'processes': {
                'total_count': processes_data.get('total', 0),
                'top_cpu_consumers': [
                    {
                        'pid': p.get('pid', 0),
                        'name': p.get('name', ''),
                        'cpu_percent': p.get('cpu', 0),
                        'memory_percent': p.get('memory', 0),
                        'status': ''
                    }
                    for p in processes_data.get('top10', [])
                ]
            }
        }

    def get_clients(self, department: Optional[str] = None) -> List[Client]:
        clients = self.db.query(Client).order_by(Client.last_seen.desc()).all()
        
        for client in clients:
            latest = self.db.query(MetricSnapshot)\
                .filter(MetricSnapshot.client_id == client.id)\
                .order_by(MetricSnapshot.timestamp.desc())\
                .first()
            
            if latest:
                client.latest_metrics = {
                    'cpu_percent': latest.cpu_percent or 0,
                    'memory_percent': latest.memory_percent or 0,
                    'disk_percent': latest.disk_percent or 0,
                    'timestamp': latest.timestamp.isoformat() if latest.timestamp else '',
                }
        
        return clients
    
    def get_client_detail(self, client_id: int) -> Optional[Client]:
        self.update_clients_status()
        client = self.db.query(Client).filter(Client.id == client_id).first()
        
        if client:
            latest_snapshot = self.db.query(MetricSnapshot)\
                .filter(MetricSnapshot.client_id == client_id)\
                .order_by(MetricSnapshot.timestamp.desc())\
                .first()
            
            if latest_snapshot:
                client.latest_metrics = {
                    'cpu_percent': latest_snapshot.cpu_percent or 0,
                    'memory_percent': latest_snapshot.memory_percent or 0,
                    'disk_percent': latest_snapshot.disk_percent or 0,
                    'timestamp': latest_snapshot.timestamp.isoformat(),
                    'cpu_cores': latest_snapshot.cpu_cores or [],
                    'cpu_model': client.cpu_model or '',
                    'cpu_frequency': 0,
                    'processes': latest_snapshot.processes or [],
                    'total_processes': latest_snapshot.processes_total or 0,
                }
        
        return client
    
    def update_client_display_name(self, client_id: int, display_name: str) -> bool:
        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            return False
        client.display_name = display_name
        self.db.commit()
        return True
    
    def get_client_history(self, client_id: int, from_time: datetime, to_time: datetime):
        return self.db.query(
            MetricSnapshot.timestamp,
            MetricSnapshot.cpu_percent,
            MetricSnapshot.memory_percent,
            MetricSnapshot.disk_percent
        ).filter(
            and_(
                MetricSnapshot.client_id == client_id,
                MetricSnapshot.timestamp >= from_time,
                MetricSnapshot.timestamp <= to_time
            )
        ).order_by(MetricSnapshot.timestamp).all()

    def get_client_by_id(self, client_id: int) -> Optional[Client]:
        return self.db.query(Client).filter(Client.id == client_id).first()

    def get_monitor_interval(self) -> int:
        settings = self.db.query(MonitorSettings).filter(MonitorSettings.id == 1).first()
        return settings.collect_interval if settings else 60

    def update_monitor_interval(self, interval: int) -> int:
        settings = self.db.query(MonitorSettings).filter(MonitorSettings.id == 1).first()
        if not settings:
            settings = MonitorSettings(id=1, collect_interval=interval)
            self.db.add(settings)
        else:
            settings.collect_interval = interval
        self.db.commit()
        return interval

    def get_agent_config(self, agent_name: str) -> Dict[str, Any]:
        interval = self.get_monitor_interval()
        return {"collect_interval": interval}

    def get_summary(self) -> Dict[str, Any]:
        total_clients = self.db.query(Client).count()
        
        interval = self.get_monitor_interval()
        threshold = datetime.utcnow() - timedelta(seconds=interval * 2)
        
        active_clients = self.db.query(Client)\
            .filter(Client.last_seen >= threshold)\
            .count()
        
        active_ids = self.db.query(Client.id)\
            .filter(Client.last_seen >= threshold)\
            .all()
        active_ids = [id[0] for id in active_ids]
        
        avg_cpu = 0
        avg_memory = 0
        
        if active_ids:
            latest_timestamps = self.db.query(
                MetricSnapshot.client_id,
                func.max(MetricSnapshot.timestamp).label('max_ts')
            ).filter(
                MetricSnapshot.client_id.in_(active_ids)
            ).group_by(MetricSnapshot.client_id).subquery()
            
            latest_snapshots = self.db.query(
                func.avg(MetricSnapshot.cpu_percent).label('avg_cpu'),
                func.avg(MetricSnapshot.memory_percent).label('avg_memory')
            ).join(
                latest_timestamps,
                and_(
                    MetricSnapshot.client_id == latest_timestamps.c.client_id,
                    MetricSnapshot.timestamp == latest_timestamps.c.max_ts
                )
            ).first()
            
            avg_cpu = round(latest_snapshots.avg_cpu or 0, 2)
            avg_memory = round(latest_snapshots.avg_memory or 0, 2)
        
        alerts_count = self.get_alerts_count()
        
        return {
            'total_clients': total_clients,
            'active_clients': active_clients,
            'alerts': alerts_count,
            'average_cpu': avg_cpu,
            'average_memory': avg_memory
        }
        
    def update_clients_status(self):
        interval = self.get_monitor_interval()
        threshold = datetime.utcnow() - timedelta(seconds=interval * 2)
        
        self.db.query(Client)\
            .filter(Client.last_seen < threshold, Client.is_active == True)\
            .update({Client.is_active: False})
        
        self.db.commit()

    def _looks_like_mac(self, value: str) -> bool:
        if not value:
            return False
        import re
        return bool(re.match(r'^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$', value))
    
    def check_alerts(self, client_id: int, snapshot: MetricSnapshot):
        current_alerts = []
        
        if snapshot.cpu_percent and snapshot.cpu_percent > 90:
            current_alerts.append({
                'type': 'cpu',
                'severity': 'critical' if snapshot.cpu_percent > 95 else 'warning',
                'message': f"Загрузка CPU: {snapshot.cpu_percent}%",
                'value': snapshot.cpu_percent,
                'threshold': 90
            })
        
        if snapshot.memory_percent and snapshot.memory_percent > 85:
            current_alerts.append({
                'type': 'memory',
                'severity': 'critical' if snapshot.memory_percent > 95 else 'warning',
                'message': f"Использование памяти: {snapshot.memory_percent}%",
                'value': snapshot.memory_percent,
                'threshold': 85
            })
        
        if snapshot.disk_percent and snapshot.disk_percent > 90:
            current_alerts.append({
                'type': 'disk',
                'severity': 'critical' if snapshot.disk_percent > 95 else 'warning',
                'message': f"Заполнение диска: {snapshot.disk_percent}%",
                'value': snapshot.disk_percent,
                'threshold': 90
            })
        
        current_types = [a['type'] for a in current_alerts]
        
        self.db.query(Alert).filter(
            and_(
                Alert.client_id == client_id,
                Alert.is_active == True,
                ~Alert.type.in_(current_types) if current_types else True
            )
        ).delete(synchronize_session=False)
        
        for alert_data in current_alerts:
            existing = self.db.query(Alert).filter(
                and_(
                    Alert.client_id == client_id,
                    Alert.type == alert_data['type'],
                    Alert.is_active == True
                )
            ).first()
            
            if existing:
                existing.value = alert_data['value']
                existing.severity = alert_data['severity']
                existing.message = alert_data['message']
            else:
                alert = Alert(client_id=client_id, **alert_data)
                self.db.add(alert)
        
        self.db.flush()

    def get_active_alerts(self):
        return self.db.query(Alert).filter(Alert.is_active == True)\
            .order_by(Alert.created_at.desc()).all()

    def get_alerts_count(self):
        return self.db.query(Alert).filter(Alert.is_active == True).count()
    
    def get_hidden_client_ids(self, user_roles: list) -> set:
        from app.models.metrics import NetworkSchema, SchemaNode
        
        schema = self.db.query(NetworkSchema).first()
        if not schema:
            return set()
        
        hidden_ids = set()
        area_nodes = self.db.query(SchemaNode).filter(
            SchemaNode.schema_id == schema.id,
            SchemaNode.type == 'area'
        ).all()
        
        for area in area_nodes:
            area_data = area.data or {}
            view_roles = area_data.get('viewRoles', [])
            
            # Если у пользователя нет нужной роли — скрываем ПК внутри
            if view_roles and not any(r in view_roles for r in user_roles):
                # Извлекаем memberClientIds из data
                member_client_ids = area_data.get('memberClientIds', [])
                for cid in member_client_ids:
                    if cid:
                        hidden_ids.add(cid)
        
        return hidden_ids
