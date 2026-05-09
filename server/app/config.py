from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):

    APP_NAME: str = "Network Monitor Server"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "False") == "True"
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/monitoring_db")
    AGENT_SECRET: str = os.getenv("AGENT_SECRET", "agent-secret")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else ["*"]
    if not DEBUG and SECRET_KEY == "dev-secret-key-change-in-production":
        raise ValueError("Измени SECRET_KEY для production!")
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"
settings = Settings()
