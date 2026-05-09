from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from typing import Optional

def log_action(
    db: Session,
    user_id: Optional[int],
    action: str,
    description: str = None,
    ip_address: str = None
):
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        description=description,
        ip_address=ip_address
    )
    db.add(audit_log)
    db.commit()