"""
StockSling — Conexión asíncrona a PostgreSQL con SQLAlchemy 2.0.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from backend.app.config import settings

# Motor asíncrono — pool de conexiones listo para FastAPI + Celery
engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

# Fábrica de sesiones asíncronas
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base para todos los modelos SQLAlchemy de StockSling."""
    pass


async def get_db():
    """Dependencia FastAPI: inyecta una sesión de base de datos por request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Crea todas las tablas en la base de datos (para desarrollo/tests)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
