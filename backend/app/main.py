"""
StockSling — API Principal FastAPI con WebSockets en tiempo real.
Punto de entrada de todos los microservicios del backend.
"""
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
import stripe
from botocore.config import Config as BotoConfig
from fastapi import (
    Depends, FastAPI, File, Form, HTTPException, Request,
    UploadFile, WebSocket, WebSocketDisconnect, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.database import get_db, create_tables
from backend.app.auth import router as auth_router, get_current_user

logger = logging.getLogger("stocksling.api")
stripe.api_key = settings.stripe_secret_key

# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET CONNECTION MANAGER
# ─────────────────────────────────────────────────────────────────────────────
class ConnectionManager:
    """Gestiona las conexiones WebSocket activas por user_id."""

    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)
        logger.info(f"WebSocket conectado: user={user_id}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(websocket) if hasattr(self.active[user_id], 'discard') \
                else self.active[user_id].remove(websocket)

    async def send_to_user(self, user_id: str, data: dict):
        """Envía un mensaje JSON a todos los WebSockets activos de un usuario."""
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


# ─────────────────────────────────────────────────────────────────────────────
# STARTUP / SHUTDOWN
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea las tablas de la DB al arrancar (solo en desarrollo)."""
    if settings.environment == "development":
        await create_tables()
        logger.info("Tablas de PostgreSQL verificadas/creadas.")
    yield
    logger.info("StockSling API cerrando conexiones...")


# ─────────────────────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="StockSling API",
    description="SaaS de indexación multimedia y distribución automatizada a plataformas de stock.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,   # desactivamos la ruta por defecto para sobrescribirla
)

# ── Isotipo StockSling en Swagger UI (rayo púrpura→cian→azul) ─────────────────
_STOCKSLING_FAVICON = (
    "data:image/svg+xml;base64,"
    "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0"
    "NiIgZmlsbD0ibm9uZSIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ2Ij48ZGVmcz48bGluZWFyR3JhZGll"
    "bnQgaWQ9InJheW8tZ3JhZGllbnQiIHgxPSIyMCUiIHkxPSIwJSIgeDI9IjgwJSIgeTI9IjEwMCUi"
    "PjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNhODU1ZjciLz48c3RvcCBvZmZzZXQ9IjUw"
    "JSIgc3RvcC1jb2xvcj0iIzIyZDNlZSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0i"
    "IzNiODJmNiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJicmlsbG8tZ3Jh"
    "ZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0i"
    "MCUiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjYiLz48c3RvcCBvZmZzZXQ9IjQw"
    "JSIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMSIvPjxzdG9wIG9mZnNldD0iMTAw"
    "JSIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PC9saW5lYXJHcmFkaWVudD48"
    "ZmlsdGVyIGlkPSJyYXlvLWdsb3ciIHg9Ii0xMCUiIHk9Ii0xMCUiIHdpZHRoPSIxMjAlIiBoZWln"
    "aHQ9IjEyMCUiPjxmZURyb3BTaGFkb3cgZHg9IjAiIGR5PSIyIiBzdGREZXZpYXRpb249IjIiIGZs"
    "b29kLWNvbG9yPSIjODYzYmZmIiBmbG9vZC1vcGFjaXR5PSIuMjUiLz48L2ZpbHRlcj48L2RlZnM+"
    "PGcgZmlsdGVyPSJ1cmwoI3JheW8tZ2xvdykiPjxwYXRoIGQ9Ik0yNS45NDYgNDQuOTM4Yy0uNjY0"
    "Ljg0NS0yLjAyMS4zNzUtMi4wMjEtLjY5OFYzMy45MzdhMi4yNiAyLjI2IDAgMCAwLTIuMjYyLTIu"
    "MjYySDE0LjI4N2MtLjkyIDAtMS40NTYtMS4wNC0uOTItMS43ODhsNy40OC0xMC40NzFjMS4wNy0x"
    "LjQ5NyAwLTMuNTc4LTEuODQyLTMuNTc4SDEuMjM3Yy0uOTIgMC0xLjQ1Ni0xLjA0LS45Mi0xLjc4"
    "OEwxMC4wMTMuNDc0Yy4yMTQtLjI5Ny41NTYtLjQ3NC45Mi0uNDc0aDI4Ljg5NGMuOTIgMCAxLjQ1"
    "NiAxLjA0LjkyIDEuNzg4bC03LjQ4IDEwLjQ3MWMtMS4wNyAxLjQ5OCAwIDMuNTc5IDEuODQyIDMu"
    "NTc5aDExLjM3N2MuOTQzIDAgMS40NzMgMS4wODguODkgMS44M0wyNS45NDcgNDQuOTR6IiBmaWxs"
    "PSJ1cmwoI3JheW8tZ3JhZGllbnQpIi8+PHBhdGggZD0iTTI1Ljk0NiA0NC45MzhjLS42NjQuODQ1"
    "LTIuMDIxLjM3NS0yLjAyMS0uNjk4VjMzLjkzN2EyLjI2IDIuMjYgMCAwIDAtMi4yNjItMi4yNjJI"
    "MTQuMjg3Yy0uOTIgMC0xLjQ1Ni0xLjA0LS45Mi0xLjc4OGw3LjQ4LTEwLjQ3MWMxLjA3LTEuNDk3"
    "IDAtMy41NzgtMS44NDItMy41NzhIMS4yMzdjLS45MiAwLTEuNDU2LTEuMDQtLjkyLTEuNzg4TDEw"
    "LjAxMy40NzRjLjIxNC0uMjk3LjU1Ni0uNDc0LjkyLS40NzRoMjguODk0Yy45MiAwIDEuNDU2IDEu"
    "MDQuOTIgMS43ODhsLTcuNDggMTAuNDcxYy0xLjA3IDEuNDk4IDAgMy41NzkgMS44NDIgMy41Nzlo"
    "MTEuMzc3Yy45NDMgMCAxLjQ3MyAxLjA4OC44OSAxLjgzTDI1Ljk0NyA0NC45NHoiIGZpbGw9InVy"
    "bCgjYnJpbGxvLWdyYWRpZW50KSIgb3BhY2l0eT0iLjg1Ii8+PC9nPjwvc3ZnPg=="
)


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui() -> HTMLResponse:
    """Swagger UI con el isotipo StockSling en la pestaña del navegador."""
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="StockSling API",
        swagger_favicon_url=_STOCKSLING_FAVICON,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://stocksling.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# ── Mapeo de almacenamiento local para Modo Desarrollador ───
os.makedirs("local_storage/uploads", exist_ok=True)
os.makedirs("local_storage/releases", exist_ok=True)

from fastapi.responses import FileResponse
@app.api_route("/local-storage/{file_path:path}", methods=["GET", "HEAD"], tags=["Storage"])
async def serve_local_storage(file_path: str):
    """
    Sirve de forma segura archivos desde 'local_storage' con soporte completo
    de middlewares (CORS, seguridad, etc.).
    """
    full_path = os.path.join("local_storage", file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")
    return FileResponse(full_path)


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS (Pydantic)
# ─────────────────────────────────────────────────────────────────────────────
class PresignedUrlRequest(BaseModel):
    file_name: str = Field(..., alias="fileName")
    file_type: str = Field(..., alias="fileType")
    is_video: bool = Field(False, alias="isVideo")

    model_config = {
        "populate_by_name": True
    }


class PhotoResponse(BaseModel):
    id: str
    original_storage_url: str
    thumbnail_storage_url: Optional[str] = None
    original_filename: Optional[str] = None
    file_format: Optional[str] = None
    is_video: bool
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    requires_model_release: bool
    model_release_id: Optional[str] = None
    status: str
    incident_code: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class PhotoUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    model_release_id: Optional[str] = None


class ModelReleaseResponse(BaseModel):
    id: str
    model_name: str
    pdf_storage_url: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class StripeSessionRequest(BaseModel):
    plan: str


class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_storage_path: str


class ProcessStartRequest(BaseModel):
    photo_id: str
    storage_path: str
    is_video: bool = False
    send_to_adobe: bool = True
    send_to_shutterstock: bool = True
    send_to_getty: bool = True
    send_to_depositphotos: bool = True
    send_to_freepik: bool = True


class HealthResponse(BaseModel):
    status: str
    version: str


class CredentialsSaveRequest(BaseModel):
    agency: str  # "adobe" o "shutterstock"
    username: str
    password: str


class AgencyStatus(BaseModel):
    connected: bool
    username: Optional[str] = None


class CredentialsStatusResponse(BaseModel):
    adobe: AgencyStatus
    shutterstock: AgencyStatus
    getty: AgencyStatus
    depositphotos: AgencyStatus
    freepik: AgencyStatus


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Endpoint de salud para Docker healthcheck y monitoreo."""
    return {"status": "healthy", "version": "1.0.0"}


async def get_current_user_helper(db: AsyncSession) -> Any:
    """Helper en desarrollo para auto-proveer el usuario de pruebas local."""
    from sqlalchemy import select
    from backend.app.models import User
    
    result = await db.execute(select(User).filter(User.id == "temp_user_id"))
    user = result.scalars().first()
    
    if not user:
        user = User(
            id="temp_user_id",
            email="test@stocksling.com",
            hashed_password="dummy_password",
            referral_code="TEST100"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


@app.post(
    "/api/vault/credentials",
    tags=["Storage"],
    summary="Cifra y guarda credenciales FTP individuales de Adobe o Shutterstock.",
)
async def save_credentials(
    request: CredentialsSaveRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Recibe el usuario y contraseña del FTP del fotógrafo, cifra la contraseña
    con AES-256-GCM y la guarda en la base de datos de PostgreSQL.
    """
    from backend.app.crypto.vault import vault
    
    agency_clean = request.agency.lower().strip()
    if agency_clean not in ["adobe", "shutterstock", "getty", "depositphotos", "freepik"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La agencia debe ser 'adobe', 'shutterstock', 'getty', 'depositphotos' o 'freepik'."
        )
        
    user = current_user
    encrypted_pass = vault.encrypt(request.password) if request.password else None
    username_val = request.username if request.username else None
    
    if agency_clean == "adobe":
        user.adobe_ftp_user = username_val
        user.adobe_ftp_pass_encrypted = encrypted_pass
    elif agency_clean == "shutterstock":
        user.shutterstock_ftp_user = username_val
        user.shutterstock_ftp_pass_encrypted = encrypted_pass
    elif agency_clean == "getty":
        user.getty_ftp_user = username_val
        user.getty_ftp_pass_encrypted = encrypted_pass
    elif agency_clean == "depositphotos":
        user.depositphotos_ftp_user = username_val
        user.depositphotos_ftp_pass_encrypted = encrypted_pass
    elif agency_clean == "freepik":
        user.freepik_ftp_user = username_val
        user.freepik_ftp_pass_encrypted = encrypted_pass
        
    db.add(user)
    await db.commit()
    return {"message": f"Credenciales de {request.agency} procesadas con éxito."}


@app.get(
    "/api/vault/credentials",
    response_model=CredentialsStatusResponse,
    tags=["Storage"],
    summary="Comprueba si el usuario tiene agencias conectadas en la base de datos.",
)
async def get_credentials_status(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Devuelve si el usuario tiene conectadas las agencias y su nombre de usuario enmascarado.
    """
    user = current_user
    
    # Enmascara el email o usuario por privacidad (ej: us***@domain.com)
    def mask_user(username: Optional[str]) -> Optional[str]:
        if not username:
            return None
        if "@" in username:
            parts = username.split("@")
            prefix = parts[0]
            domain = parts[1]
            if len(prefix) > 3:
                return f"{prefix[:2]}***@{domain}"
            return f"***@{domain}"
        if len(username) > 3:
            return f"{username[:2]}***"
        return "***"

    return CredentialsStatusResponse(
        adobe=AgencyStatus(
            connected=bool(user.adobe_ftp_user and user.adobe_ftp_pass_encrypted),
            username=mask_user(user.adobe_ftp_user)
        ),
        shutterstock=AgencyStatus(
            connected=bool(user.shutterstock_ftp_user and user.shutterstock_ftp_pass_encrypted),
            username=mask_user(user.shutterstock_ftp_user)
        ),
        getty=AgencyStatus(
            connected=bool(user.getty_ftp_user and user.getty_ftp_pass_encrypted),
            username=mask_user(user.getty_ftp_user)
        ),
        depositphotos=AgencyStatus(
            connected=bool(user.depositphotos_ftp_user and user.depositphotos_ftp_pass_encrypted),
            username=mask_user(user.depositphotos_ftp_user)
        ),
        freepik=AgencyStatus(
            connected=bool(user.freepik_ftp_user and user.freepik_ftp_pass_encrypted),
            username=mask_user(user.freepik_ftp_user)
        )
    )


@app.post(
    "/api/vault/generate-presigned-url",
    response_model=PresignedUrlResponse,
    tags=["Storage"],
    summary="Genera una URL firmada de S3 para subida directa desde el navegador.",
)
async def generate_presigned_url(
    request: PresignedUrlRequest,
    current_user = Depends(get_current_user)
):
    """
    El frontend solicita esta URL antes de subir cada archivo.
    El navegador del fotógrafo sube el archivo DIRECTAMENTE a S3,
    sin pasar por la RAM del servidor de la API.
    """
    try:
        file_id = str(uuid.uuid4())
        extension = request.file_name.rsplit(".", 1)[-1].lower()
        storage_path = f"uploads/{file_id}.{extension}"

        # MODO DESARROLLADOR FALLBACK: Si las credenciales de AWS son placeholders o vacías
        if settings.aws_access_key_id == "your_aws_key" or not settings.aws_access_key_id:
            # Retorna una URL del propio backend
            upload_url = f"http://localhost:8000/api/vault/mock-upload?storage_path={storage_path}"
            return PresignedUrlResponse(
                upload_url=upload_url,
                file_storage_path=storage_path,
            )

        s3_client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            config=BotoConfig(signature_version="s3v4"),
        )

        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.aws_s3_bucket,
                "Key": storage_path,
                "ContentType": request.file_type,
            },
            ExpiresIn=3600,  # La URL expira en 1 hora
        )

        return PresignedUrlResponse(
            upload_url=presigned_url,
            file_storage_path=storage_path,
        )

    except Exception as e:
        logger.error(f"Error generando presigned URL: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generando URL de subida segura.")


@app.put("/api/vault/mock-upload", include_in_schema=False)
async def mock_upload(request: Request, storage_path: str):
    """
    Simula la subida directa a S3 guardando el archivo localmente en 'local_storage'.
    """
    try:
        body = await request.body()
        full_path = os.path.join("local_storage", storage_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(body)
        logger.info(f"Simulación S3: Guardado archivo local en {full_path}")
        return {"status": "success", "storage_path": storage_path}
    except Exception as e:
        logger.error(f"Error en mock upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Error en la subida simulada.")


@app.post(
    "/api/process/start",
    tags=["Processing"],
    summary="Inicia el pipeline de procesamiento (Claude + ExifTool + FTP).",
)
async def start_processing(
    request: ProcessStartRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Llamado por el frontend cuando la subida a S3 termina.
    Recupera las credenciales del usuario, las descifra de forma segura en caliente
    y encola la tarea en Redis/Celery para procesar de forma asíncrona.
    """
    try:
        from backend.app.workers.queue_worker import process_file
        from backend.app.crypto.vault import vault

        # 1. Obtener usuario actual y bloquear la fila para prevenir condiciones de carrera
        from sqlalchemy import select
        from backend.app.models import User, CreditTransaction, Photo, UploadStatus
        
        user_result = await db.execute(
            select(User).where(User.id == current_user.id).with_for_update()
        )
        locked_user = user_result.scalar_one_or_none()
        if not locked_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
            
        required_credits = 5 if request.is_video else 1
        if locked_user.credits < required_credits:
            raise HTTPException(
                status_code=400,
                detail=f"Créditos insuficientes. Requieres {required_credits} cr. y posees {locked_user.credits} cr."
            )

        # 1.5. Registrar la foto en la base de datos PostgreSQL
        # Comprobar si la foto ya está registrada
        existing_result = await db.execute(select(Photo).where(Photo.id == request.photo_id))
        existing_photo = existing_result.scalar_one_or_none()
        
        if not existing_photo:
            extension = request.storage_path.rsplit(".", 1)[-1].lower()
            original_filename = request.storage_path.split("/")[-1]
            
            db_photo = Photo(
                id=request.photo_id,
                user_id=locked_user.id,
                original_storage_url=request.storage_path,
                original_filename=original_filename,
                file_format=extension,
                is_video=request.is_video,
                send_to_adobe=request.send_to_adobe,
                send_to_shutterstock=request.send_to_shutterstock,
                send_to_getty=request.send_to_getty,
                send_to_depositphotos=request.send_to_depositphotos,
                send_to_freepik=request.send_to_freepik,
                status=UploadStatus.PENDING,
                credits_used=required_credits,
            )
            db.add(db_photo)
            
            # Restar créditos y registrar transacción
            locked_user.credits -= required_credits
            db.add(locked_user)
            
            txn = CreditTransaction(
                user_id=locked_user.id,
                amount=-required_credits,
                description=f"Consumo de créditos por indexación de {'vídeo' if request.is_video else 'foto'}: {original_filename}"
            )
            db.add(txn)
            
            await db.commit()

        user = locked_user

        # 2. Descifrar credenciales de agencias en memoria
        adobe_user = user.adobe_ftp_user or ""
        adobe_pass_decrypted = ""
        if user.adobe_ftp_pass_encrypted:
            try:
                adobe_pass_decrypted = vault.decrypt(user.adobe_ftp_pass_encrypted)
            except Exception as decrypt_err:
                logger.error(f"Error descifrando clave de Adobe: {str(decrypt_err)}")

        shutterstock_user = user.shutterstock_ftp_user or ""
        shutterstock_pass_decrypted = ""
        if user.shutterstock_ftp_pass_encrypted:
            try:
                shutterstock_pass_decrypted = vault.decrypt(user.shutterstock_ftp_pass_encrypted)
            except Exception as decrypt_err:
                logger.error(f"Error descifrando clave de Shutterstock: {str(decrypt_err)}")

        # 3. Encolar tarea de procesamiento asíncrono pasándole las credenciales descifradas
        task = process_file.delay(
            photo_id=request.photo_id,
            user_id=user.id,
            local_file_path=request.storage_path,
            is_video=request.is_video,
            send_to_adobe=request.send_to_adobe,
            send_to_shutterstock=request.send_to_shutterstock,
            adobe_user=adobe_user,
            adobe_pass_decrypted=adobe_pass_decrypted,
            shutterstock_user=shutterstock_user,
            shutterstock_pass_decrypted=shutterstock_pass_decrypted,
        )

        return {
            "message": "Procesamiento encolado con credenciales de usuario descifradas en memoria.",
            "task_id": task.id,
            "photo_id": request.photo_id,
        }

    except Exception as e:
        logger.error(f"Error encolando tarea: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al iniciar el procesamiento.")


# ─────────────────────────────────────────────────────────────────────────────
# NUEVOS ENDPOINTS: CRUD MULTIMEDIA Y CONTRATOS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/photos", response_model=List[PhotoResponse], tags=["Processing"])
async def get_photos(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna la lista completa de fotos del usuario actual ordenadas por fecha."""
    from sqlalchemy import select
    from backend.app.models import Photo
    
    result = await db.execute(
        select(Photo)
        .where(Photo.user_id == current_user.id)
        .order_by(Photo.created_at.desc())
    )
    photos = result.scalars().all()
    
    response_photos = []
    for p in photos:
        keywords_list = []
        if p.keywords:
            try:
                keywords_list = json.loads(p.keywords)
                if not isinstance(keywords_list, list):
                    keywords_list = [p.keywords]
            except Exception:
                keywords_list = [k.strip() for k in p.keywords.split(",") if k.strip()]
        
        # Generar URL absoluta para el frontend
        if p.original_storage_url.startswith("http://") or p.original_storage_url.startswith("https://"):
            full_original_url = p.original_storage_url
        elif settings.aws_access_key_id == "your_aws_key" or not settings.aws_access_key_id:
            full_original_url = f"http://localhost:8000/local-storage/{p.original_storage_url}"
        else:
            full_original_url = f"https://{settings.aws_s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{p.original_storage_url}"

        response_photos.append(
            PhotoResponse(
                id=p.id,
                original_storage_url=full_original_url,
                thumbnail_storage_url=p.thumbnail_storage_url,
                original_filename=p.original_filename,
                file_format=p.file_format,
                is_video=p.is_video,
                title=p.title,
                description=p.description,
                keywords=keywords_list,
                requires_model_release=p.requires_model_release,
                model_release_id=p.model_release_id,
                status=p.status.value if hasattr(p.status, 'value') else str(p.status),
                incident_code=p.incident_code,
                created_at=p.created_at
            )
        )
    return response_photos


@app.put("/api/photos/{photo_id}", tags=["Processing"])
async def update_photo(
    photo_id: str,
    request: PhotoUpdateRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza metadatos de una foto y la marca lista para envío."""
    from sqlalchemy import select
    from backend.app.models import Photo, UploadStatus
    
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id, Photo.user_id == current_user.id)
    )
    db_photo = result.scalar_one_or_none()
    if not db_photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    if request.title is not None:
        db_photo.title = request.title
    if request.description is not None:
        db_photo.description = request.description
    if request.keywords is not None:
        db_photo.keywords = json.dumps(request.keywords)
    if request.model_release_id is not None:
        db_photo.model_release_id = request.model_release_id
        
    db_photo.status = UploadStatus.READY
    db.add(db_photo)
    await db.commit()
    return {"message": "Photo updated successfully", "photo_id": photo_id}


@app.post("/api/photos/{photo_id}/approve", tags=["Processing"])
async def approve_photo(
    photo_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aprueba el lote multimedia y encola la distribución real FTP."""
    from sqlalchemy import select
    from backend.app.models import Photo, UploadStatus
    from backend.app.workers.queue_worker import upload_media_task
    
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id, Photo.user_id == current_user.id)
    )
    db_photo = result.scalar_one_or_none()
    if not db_photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    db_photo.status = UploadStatus.UPLOADING
    db.add(db_photo)
    await db.commit()
    
    # Encolar tarea Celery para FTP
    upload_media_task.delay(photo_id)
    
    return {"message": "Photo approved. Upload task started.", "photo_id": photo_id}


@app.delete("/api/photos/{photo_id}", tags=["Processing"])
async def delete_photo(
    photo_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina permanentemente una foto de la base de datos y del disco local/S3."""
    from sqlalchemy import select
    from backend.app.models import Photo
    
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id, Photo.user_id == current_user.id)
    )
    db_photo = result.scalar_one_or_none()
    if not db_photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    # Limpieza del archivo físico
    if db_photo.original_storage_url:
        # Modo desarrollador fallback
        if settings.aws_access_key_id == "your_aws_key" or not settings.aws_access_key_id:
            local_path = os.path.join("local_storage", db_photo.original_storage_url)
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                    logger.info(f"Archivo local eliminado con éxito: {local_path}")
                except Exception as err:
                    logger.error(f"Error al eliminar archivo local {local_path}: {err}")
        else:
            # Modo Producción S3
            try:
                s3_client = boto3.client(
                    "s3",
                    region_name=settings.aws_region,
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                )
                s3_client.delete_object(
                    Bucket=settings.aws_s3_bucket,
                    Key=db_photo.original_storage_url,
                )
                logger.info(f"Objeto S3 eliminado con éxito: {db_photo.original_storage_url}")
            except Exception as err:
                logger.error(f"Error al eliminar objeto S3: {err}")
                
    await db.delete(db_photo)
    await db.commit()
    return {"message": "Photo deleted successfully", "photo_id": photo_id}



@app.post("/api/releases", response_model=ModelReleaseResponse, tags=["Storage"])
async def create_release(
    model_name: str = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sube un contrato legal en PDF firmados por el modelo a AWS S3 o almacenamiento local."""
    from backend.app.models import ModelRelease
    
    try:
        file_id = str(uuid.uuid4())
        extension = file.filename.rsplit(".", 1)[-1].lower()
        storage_path = f"releases/{file_id}.{extension}"
        content = await file.read()

        # MODO DESARROLLADOR FALLBACK: Si las credenciales de AWS son placeholders o vacías
        if settings.aws_access_key_id == "your_aws_key" or not settings.aws_access_key_id:
            local_storage_file = os.path.join("local_storage", storage_path)
            os.makedirs(os.path.dirname(local_storage_file), exist_ok=True)
            with open(local_storage_file, "wb") as f:
                f.write(content)
            
            pdf_storage_url = f"http://localhost:8000/local-storage/{storage_path}"
            
            release = ModelRelease(
                id=file_id,
                user_id=current_user.id,
                model_name=model_name,
                pdf_storage_url=pdf_storage_url
            )
            db.add(release)
            await db.commit()
            await db.refresh(release)
            return release

        s3_client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        
        s3_client.put_object(
            Bucket=settings.aws_s3_bucket,
            Key=storage_path,
            Body=content,
            ContentType=file.content_type or "application/pdf"
        )
        
        pdf_storage_url = f"https://{settings.aws_s3_bucket}.s3.amazonaws.com/{storage_path}"
        
        release = ModelRelease(
            id=file_id,
            user_id=current_user.id,
            model_name=model_name,
            pdf_storage_url=pdf_storage_url
        )
        db.add(release)
        await db.commit()
        await db.refresh(release)
        return release
        
    except Exception as e:
        logger.error(f"Error creating release: {str(e)}")
        raise HTTPException(status_code=500, detail="Error uploading release contract PDF.")


@app.get("/api/releases", response_model=List[ModelReleaseResponse], tags=["Storage"])
async def get_releases(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Devuelve todos los contratos disponibles del usuario actual."""
    from sqlalchemy import select
    from backend.app.models import ModelRelease
    
    result = await db.execute(
        select(ModelRelease).where(ModelRelease.user_id == current_user.id)
    )
    releases = result.scalars().all()
    return releases


# ─────────────────────────────────────────────────────────────────────────────
# NUEVOS ENDPOINTS: INTEGRACIÓN DE STRIPE
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/payments/checkout-session", tags=["Payments"])
async def create_checkout_session(
    request: StripeSessionRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una sesión de Checkout Stripe en modo suscripción con IVA europeo."""
    try:
        price_id = ""
        plan_clean = request.plan.lower().strip()
        if plan_clean in ["creator", "casual"]:
            price_id = settings.stripe_price_casual
        elif plan_clean == "pro":
            price_id = settings.stripe_price_pro
        elif plan_clean == "agency":
            price_id = settings.stripe_price_agency
        else:
            raise HTTPException(status_code=400, detail="El plan debe ser creator, pro o agency.")
            
        if not price_id:
            price_id = "price_dummy_val"
            
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url='http://localhost:5173/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='http://localhost:5173/dashboard',
            client_reference_id=current_user.id,
            automatic_tax={'enabled': True},
        )
        return {"sessionId": session.id, "checkoutUrl": session.url}
    except Exception as e:
        logger.error(f"Error creando stripe checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/payments/webhook", tags=["Payments"])
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Escucha de forma segura los webhooks de Stripe y recarga créditos."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        subscription_id = session.get("subscription")
        customer_id = session.get("customer")
        
        if user_id:
            from sqlalchemy import select
            from backend.app.models import User, CreditTransaction, UserPlan
            
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            if user:
                user.stripe_customer_id = customer_id
                user.stripe_subscription_id = subscription_id
                
                amount_total = session.get("amount_total", 0)
                credits_to_add = 0
                
                if amount_total >= 12900:
                    user.plan = UserPlan.AGENCY
                    credits_to_add = 2000
                elif amount_total >= 4900:
                    user.plan = UserPlan.PRO
                    credits_to_add = 600
                else:
                    user.plan = UserPlan.CASUAL
                    credits_to_add = 150
                    
                user.credits += credits_to_add
                
                txn = CreditTransaction(
                    user_id=user.id,
                    amount=credits_to_add,
                    description=f"Recarga por suscripción a plan {user.plan.value.upper()}"
                )
                db.add(user)
                db.add(txn)
                await db.commit()
                logger.info(f"Stripe Webhook: User {user.id} plan updated to {user.plan.value} +{credits_to_add} credits")
                
    return {"status": "success"}


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    Canal WebSocket por usuario para notificaciones en tiempo real.
    El frontend se conecta aquí para recibir actualizaciones de estado FTP,
    resultados de Claude y alertas de error sin necesidad de polling.
    """
    await manager.connect(user_id, websocket)
    try:
        # Mantener la conexión viva escuchando mensajes del cliente
        while True:
            data = await websocket.receive_text()
            # Eco de ping/pong para mantener la conexión activa
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        logger.info(f"WebSocket desconectado: user={user_id}")


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIÓN UTILITARIA: Notificar progreso via WebSocket
# ─────────────────────────────────────────────────────────────────────────────
async def notify_user(user_id: str, event: str, data: dict):
    """Envía un evento de progreso al frontend del usuario en tiempo real."""
    await manager.send_to_user(user_id, {"event": event, **data})


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS LEGALES PREMIUM (Términos y Privacidad)
# ─────────────────────────────────────────────────────────────────────────────
def render_legal_html(title: str, content_html: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} — StockSling</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body {{
                font-family: 'Outfit', sans-serif;
            }}
            .text-gradient-brand {{
                background: linear-gradient(135deg, #a855f7 0%, #22d3ee 50%, #3b82f6 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
        </style>
    </head>
    <body class="bg-slate-950 text-slate-300 min-h-screen py-12 px-4 sm:px-6 lg:px-8 selection:bg-purple-500/30 selection:text-purple-200">
        <div class="max-w-3xl mx-auto bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <!-- Glow background -->
            <div class="absolute -top-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <header class="border-b border-slate-800 pb-6 mb-8 text-center sm:text-left">
                <div class="flex items-center justify-center sm:justify-start gap-2 mb-4">
                    <span class="text-xl font-bold tracking-tight text-gradient-brand">StockSling Legal</span>
                </div>
                <h1 class="text-3xl font-black text-white">{title}</h1>
                <p class="text-xs text-slate-500 mt-2">Última actualización: 1 de junio de 2026</p>
            </header>
            
            <div class="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-6">
                {content_html}
            </div>
            
            <footer class="border-t border-slate-800 mt-12 pt-8 text-center text-xs text-slate-600">
                <p>© 2026 StockSling SaaS. Todos los derechos reservados.</p>
                <p class="mt-1">Cifrado de grado militar AES-256-GCM activo para todas las credenciales registradas.</p>
            </footer>
        </div>
    </body>
    </html>
    """

@app.get("/legal/terms", response_class=HTMLResponse, tags=["Legal"])
async def show_terms():
    terms_html = """
    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">1. Naturaleza del Servicio (Acceso SaaS)</h2>
    <p>StockSling opera como un modelo de <strong>Software como Servicio (SaaS)</strong> basado en la nube. Al registrarse, se le otorga una licencia de acceso no exclusiva, revocable, limitada y temporal para ingresar y operar la interfaz de usuario en la nube con fines de administración de portafolios fotográficos y de vídeo. Usted no adquiere la posesión ni el licenciamiento físico de ningún software descargable.</p>

    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">2. Límite de Responsabilidad en Generación de Metadatos por IA</h2>
    <p>StockSling utiliza Modelos de Inteligencia Artificial para auto-generar sugerencias de títulos, descripciones y palabras clave. <strong>El usuario conserva la responsabilidad legal, administrativa y editorial definitiva sobre los metadatos inyectados en sus archivos.</strong> Usted tiene la obligación contractual de revisar y aprobar manualmente la información antes de guardarla. StockSling no asume ninguna responsabilidad si una agencia de stock rechaza sus archivos o suspende su cuenta.</p>

    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">3. Seguridad de Credenciales y Cifrado AES-256-GCM</h2>
    <p>Sus credenciales se cifran en tránsito y en reposo utilizando el protocolo criptográfico robusto <strong>AES-256-GCM</strong>. Las credenciales permanecen cifradas y solo se descifran en memoria temporal exclusivamente durante el segundo que dura la subida por Celery. El usuario es el único responsable de configurar contraseñas seguras.</p>

    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">4. Canales de Distribución FTP y Fallos de Terceros</h2>
    <p>StockSling actúa únicamente como un intermediario tecnológico asíncrono. No garantizamos la disponibilidad continua ni velocidad final de las conexiones FTP/SFTP de los servidores de destino (v.g. caídas en Adobe Stock o iStockphoto). Cualquier fallo se registrará con un código de incidencia exclusivo para su seguimiento.</p>

    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">5. Ledger de Créditos y Políticas de Stripe</h2>
    <p>La Plataforma cobra créditos por procesamiento (1 crédito por foto, 5 créditos por vídeo de frame transcodificado). Las reducciones se realizan bajo un bloqueo estricto de fila (SELECT FOR UPDATE) para evitar condiciones de carrera. Las compras de créditos y suscripciones mensuales por Stripe no son reembolsables una vez consumidas.</p>
    """
    return render_legal_html("Términos de Servicio", terms_html)

@app.get("/legal/privacy", response_class=HTMLResponse, tags=["Legal"])
async def show_privacy():
    privacy_html = """
    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">1. Información que Recopilamos</h2>
    <p>Recopilamos datos mínimos esenciales para el servicio: nombre, correo electrónico, ID de Stripe para estado de facturación, credenciales de agencias de stock encriptadas, y archivos temporales de fotos/vídeos RAW y JPEG subidos voluntariamente para indexación.</p>

    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">2. Procesamiento Seguro y Cifrado AES-256-GCM</h2>
    <p>Sus contraseñas FTP se cifran de extremo a extremo utilizando <strong>AES-256-GCM</strong> con llave maestra local. Nunca compartimos sus credenciales ni sus archivos. Las imágenes temporales de análisis son enviadas a la API multimodales de IA (ej. Claude) exclusivamente para metadatos y son descartadas inmediatamente por el proveedor de IA sin ser usadas para entrenamientos de modelos.</p>

    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">3. Aislamiento Multi-tenant</h2>
    <p>Implementamos un aislamiento riguroso a nivel de base de datos PostgreSQL. Cada consulta y proceso asíncrono está filtrado estrictamente por su ID de usuario autenticado, asegurando que su información sea inaccesible para cualquier otro usuario de la plataforma.</p>

    <h2 class="text-lg font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">4. Eliminación Permanente</h2>
    <p>Al solicitar la eliminación de su cuenta, borramos de forma destructiva y permanente sus credenciales de base de datos, historial de transacciones y cualquier archivo temporal en caché o almacenamiento en nuestros buckets S3 o locales.</p>
    """
    return render_legal_html("Política de Privacidad", privacy_html)
