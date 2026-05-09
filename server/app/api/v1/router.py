from fastapi import APIRouter
from app.api.v1 import agent, auth, monitoring, users, audit, schema, roles, reports, settings

api_router = APIRouter()

api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(schema.router, prefix="/schema", tags=["schema"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])