"""
StockSling — Modelos de base de datos (SQLAlchemy 2.0).
Define el esquema completo: usuarios, fotos, créditos, referidos e incidencias.
"""
from datetime import datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text, Float,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship

from backend.app.database import Base


# ─────────────────────────────────────────────────────────────────────────────
# ENUMERACIONES
# ─────────────────────────────────────────────────────────────────────────────

class UploadStatus(str, Enum):
    PENDING    = "pending"      # En cola esperando procesamiento
    PROCESSING = "processing"   # Claude está analizando los metadatos
    READY      = "ready"        # Metadatos listos, esperando revisión del usuario
    UPLOADING  = "uploading"    # Transfiriendo a las agencias por FTP
    COMPLETED  = "completed"    # Subida exitosa confirmada
    FAILED     = "failed"       # Error en el proceso (ver incident_code)


class UserPlan(str, Enum):
    FREE    = "free"       # 25 créditos de bienvenida
    CASUAL  = "casual"     # $14.99 / 150 créditos
    PRO     = "pro"        # $49.99 / 600 créditos + FFmpeg
    AGENCY  = "agency"     # $129.99 / 2000 créditos + prioridad


class UserRank(str, Enum):
    COLLABORATOR = "collaborator"   # 0–4 referidos activos
    PRODUCER     = "producer"       # 5–14 referidos activos (10% descuento)
    AMBASSADOR   = "ambassador"     # 15+ referidos (20% comisión recurrente)


# ─────────────────────────────────────────────────────────────────────────────
# TABLAS
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email      = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active  = Column(Boolean, default=True)
    plan       = Column(SQLEnum(UserPlan), default=UserPlan.FREE)
    rank       = Column(SQLEnum(UserRank), default=UserRank.COLLABORATOR)
    credits    = Column(Integer, default=25)             # Créditos disponibles
    created_at = Column(DateTime, default=datetime.utcnow)

    # Credenciales FTP cifradas con AES-256-GCM (vault.py)
    adobe_ftp_user              = Column(String(255), nullable=True)
    adobe_ftp_pass_encrypted    = Column(Text, nullable=True)
    shutterstock_ftp_user       = Column(String(255), nullable=True)
    shutterstock_ftp_pass_encrypted = Column(Text, nullable=True)
    getty_ftp_user              = Column(String(255), nullable=True)
    getty_ftp_pass_encrypted    = Column(Text, nullable=True)
    depositphotos_ftp_user       = Column(String(255), nullable=True)
    depositphotos_ftp_pass_encrypted = Column(Text, nullable=True)
    freepik_ftp_user            = Column(String(255), nullable=True)
    freepik_ftp_pass_encrypted  = Column(Text, nullable=True)

    # Gamificación — referidos
    referral_code    = Column(String(16), unique=True, nullable=True)
    referred_by_id   = Column(String(36), ForeignKey("users.id"), nullable=True)
    active_referrals = Column(Integer, default=0)

    # Stripe
    stripe_customer_id    = Column(String(100), nullable=True)
    stripe_subscription_id = Column(String(100), nullable=True)

    # Relaciones
    photos    = relationship("Photo",    back_populates="user", cascade="all, delete-orphan")
    contracts = relationship("ModelRelease", back_populates="user", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id      = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Rutas en la nube (S3/GCS)
    original_storage_url  = Column(Text, nullable=False)
    thumbnail_storage_url = Column(Text, nullable=True)   # Versión ligera para Claude
    original_filename     = Column(String(255), nullable=True)
    file_format           = Column(String(10), nullable=True)   # jpg, cr3, nef, mp4...
    is_video              = Column(Boolean, default=False)
    video_duration        = Column(Float, nullable=True)         # segundos

    # Metadatos SEO — generados por Claude
    title                  = Column(String(255), nullable=True)
    description            = Column(Text, nullable=True)
    keywords               = Column(Text, nullable=True)         # JSON array string
    requires_model_release = Column(Boolean, default=False)
    model_release_id       = Column(String(36), ForeignKey("model_releases.id"), nullable=True)

    # Destinos de distribución
    send_to_adobe         = Column(Boolean, default=True)
    send_to_shutterstock  = Column(Boolean, default=True)
    send_to_getty         = Column(Boolean, default=True)
    send_to_depositphotos = Column(Boolean, default=True)
    send_to_freepik       = Column(Boolean, default=True)

    # Estado del proceso
    status         = Column(SQLEnum(UploadStatus), default=UploadStatus.PENDING, index=True)
    credits_used   = Column(Integer, default=0)      # 1 foto = 1 crédito, 1 vídeo = 5 créditos
    incident_code  = Column(String(50), nullable=True)   # Código ERR-XXXX para soporte
    error_log      = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    user     = relationship("User", back_populates="photos")
    contract = relationship("ModelRelease", foreign_keys=[model_release_id])


class ModelRelease(Base):
    """Contratos de autorización de modelo PDF almacenados por el fotógrafo."""
    __tablename__ = "model_releases"

    id      = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    model_name     = Column(String(255), nullable=False)
    pdf_storage_url = Column(Text, nullable=False)      # URL S3 del PDF firmado
    created_at     = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    user = relationship("User", back_populates="contracts")


class CreditTransaction(Base):
    """Historial de consumo y recarga de créditos (auditoría financiera)."""
    __tablename__ = "credit_transactions"

    id          = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id     = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount      = Column(Integer, nullable=False)   # positivo=recarga, negativo=consumo
    description = Column(String(255), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
