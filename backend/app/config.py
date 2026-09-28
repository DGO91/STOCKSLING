"""
StockSling — Configuración central de la aplicación.
Usa pydantic-settings para validar y cargar variables de entorno.
Si falta alguna variable crítica, la aplicación no arranca.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Todas las variables de entorno necesarias para StockSling.
    En producción se cargan desde el entorno del contenedor Docker.
    En desarrollo local se leen desde el archivo .env.
    """

    # ── Inteligencia Artificial ──────────────────────────────────────
    anthropic_api_key: str                  # Claude API Key
    claude_model: str = "claude-sonnet-4-6" # Modelo principal default (Sonnet 4.6 en 2026)

    # ── Base de Datos ─────────────────────────────────────────────────
    database_url: str                       # postgresql+asyncpg://...

    # ── Cola de Tareas ────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Seguridad AES-256-GCM ─────────────────────────────────────────
    master_encryption_key: str              # 32 bytes en Base64

    # ── JWT ───────────────────────────────────────────────────────────
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 días

    # ── Almacenamiento Cloud (AWS S3 Presigned URLs) ──────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "stocksling-uploads"
    aws_region: str = "eu-west-1"

    # ── Agencias de Stock (cuentas de test para Canary) ───────────────
    test_adobe_user: str = ""
    test_adobe_pass: str = ""
    test_shutterstock_user: str = ""
    test_shutterstock_pass: str = ""

    # ── Stripe ────────────────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # ── Entorno ───────────────────────────────────────────────────────
    environment: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Instancia global — se importa en todo el backend como: from backend.app.config import settings
settings = Settings()
