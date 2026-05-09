from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from .config import settings
import logging

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            columns = [c['name'] for c in inspector.get_columns('clients')]
            
            for col in ['os_version', 'architecture', 'cpu_max_frequency', 'agent_name']:
                if col in columns:
                    conn.execute(text(f"ALTER TABLE clients DROP COLUMN {col}"))
                    conn.commit()
            
            if 'mac_address' not in columns:
                conn.execute(text("ALTER TABLE clients ADD COLUMN mac_address VARCHAR(17)"))
                conn.commit()
            
            if 'display_name' not in columns:
                conn.execute(text("ALTER TABLE clients ADD COLUMN display_name VARCHAR(255)"))
                conn.commit()
    except Exception as e:
        logger.warning(f"Ошибка миграции: {e}")