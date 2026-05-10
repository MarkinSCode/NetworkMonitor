from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.core.audit import log_action
from app.models.metrics import NetworkSchema, SchemaNode, Client

router = APIRouter()

@router.get("/")
async def get_schema(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schema = db.query(NetworkSchema).first()
    if not schema:
        schema = NetworkSchema(name="Основная схема")
        db.add(schema)
        db.commit()
        db.refresh(schema)
    
    nodes = db.query(SchemaNode).filter(SchemaNode.schema_id == schema.id).all()
    
    user_roles = [ur.role.name for ur in current_user.roles] if current_user.roles else []
    is_admin = current_user.is_admin
    
    hidden_client_ids = set()

    for node in nodes:
        if node.type == 'area' and not is_admin:
            node_data = node.data or {}
            view_roles = node_data.get('viewRoles', [])
            if view_roles and not any(r in view_roles for r in user_roles):
                for other in nodes:
                    if other.type == 'computer' and other.client_id:
                        if other.client_id in node_data.get('memberClientIds', []):
                            hidden_client_ids.add(other.client_id)
    
    result = []
    for node in nodes:
        node_data = node.data or {}
        
        if node.type == 'computer' and node.client_id in hidden_client_ids:
            continue
        
        result.append({
            "id": str(node.id),
            "type": node.type,
            "position": {"x": node.x, "y": node.y},
            "data": {
                "label": node.label,
                "clientId": node.client_id,
                **(node.data or {})
            }
        })
    
    return {"id": schema.id, "name": schema.name, "nodes": result}

@router.put("/")
async def save_schema(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schema = db.query(NetworkSchema).first()
    if not schema:
        schema = NetworkSchema()
        db.add(schema)
        db.commit()
    
    db.query(SchemaNode).filter(SchemaNode.schema_id == schema.id).delete()
    
    for node in data.get("nodes", []):
        node_data = node.get("data", {})
        db.add(SchemaNode(
            schema_id=schema.id,
            client_id=node_data.get("clientId"),
            label=node_data.get("label", ""),
            type=node.get("type", "computer"),
            x=node.get("position", {}).get("x", 0),
            y=node.get("position", {}).get("y", 0),
            data=node_data  # ← весь data сохраняется в JSONB
        ))
    
    db.commit()
    return 0;
