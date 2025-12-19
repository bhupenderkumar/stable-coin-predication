"""
Database configuration and session management.

Supports both SQLite (development) and PostgreSQL (production).
Use DATABASE_URL environment variable to configure.

SQLite: sqlite:///./data/trading.db
PostgreSQL: postgresql://user:password@localhost:5432/trading_bot
"""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool, QueuePool

from app.config import settings


def get_engine():
    """Create database engine based on configuration."""
    database_url = settings.database_url
    
    if database_url.startswith("sqlite"):
        # SQLite configuration (development)
        engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,  # Better for testing
            echo=settings.debug,
        )
        
        # Enable foreign keys for SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
            
    elif database_url.startswith("postgresql"):
        # PostgreSQL configuration (production)
        engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,  # Verify connection before use
            pool_recycle=3600,  # Recycle connections after 1 hour
            echo=settings.debug,
        )
    else:
        # Generic configuration
        engine = create_engine(
            database_url,
            echo=settings.debug,
        )
    
    return engine


# Create engine
engine = get_engine()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.
    
    Usage in FastAPI:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database session.
    
    Usage:
        with get_db_context() as db:
            db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    from app.models import token, trade, analysis  # noqa: F401
    Base.metadata.create_all(bind=engine)


def check_db_connection() -> bool:
    """Check if database connection is working."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False


def get_db_info() -> dict:
    """Get database connection information."""
    return {
        "url": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url,
        "type": "postgresql" if settings.database_url.startswith("postgresql") else "sqlite",
        "connected": check_db_connection(),
    }
