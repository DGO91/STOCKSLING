"""
StockSling — Procesador de colas asíncrono con Celery + Redis.
Gestiona el pipeline completo de procesamiento de cada archivo:
1. Generar miniatura (RAW → JPEG o frame de vídeo)
2. Enviar miniatura a Claude 3.5 Sonnet
3. Inyectar metadatos IPTC/XMP en el archivo original
4. Subir a las agencias por FTP en paralelo
5. Actualizar estado en PostgreSQL y notificar via WebSocket
"""
import asyncio
import logging
import os
import json
import tempfile
from pathlib import Path

from celery import Celery
from celery.schedules import crontab

from backend.app.config import settings

logger = logging.getLogger("stocksling.worker")

def download_from_s3_or_local(s3_client, bucket, key, local_path):
    local_storage_file = os.path.join("local_storage", key)
    if settings.aws_access_key_id == "your_aws_key" or not settings.aws_access_key_id or os.path.exists(local_storage_file):
        import shutil
        logger.info(f"Modo Dev: Copiando desde local_storage/{key} a {local_path}")
        shutil.copyfile(local_storage_file, local_path)
    else:
        s3_client.download_file(bucket, key, local_path)

def upload_to_s3_or_local(s3_client, local_path, bucket, key, ExtraArgs=None):
    local_storage_file = os.path.join("local_storage", key)
    if settings.aws_access_key_id == "your_aws_key" or not settings.aws_access_key_id:
        import shutil
        os.makedirs(os.path.dirname(local_storage_file), exist_ok=True)
        logger.info(f"Modo Dev: Copiando {local_path} a local_storage/{key}")
        shutil.copyfile(local_path, local_storage_file)
    else:
        s3_client.upload_file(local_path, bucket, key, ExtraArgs=ExtraArgs)

# ─────────────────────────────────────────────────────────────────────────────
# INSTANCIA CELERY
# ─────────────────────────────────────────────────────────────────────────────
celery_app = Celery(
    "stocksling",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Madrid",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,          # Confirma la tarea solo tras completarla (evita pérdidas)
    worker_prefetch_multiplier=1, # Un worker procesa una tarea a la vez (evita sobrecarga RAM)
    # Programación del Canary Test (self-healing check)
    beat_schedule={
        "canary-check-every-6h": {
            "task": "backend.app.workers.queue_worker.run_canary_check",
            "schedule": crontab(minute=0, hour="*/6"),  # Cada 6 horas
        },
    },
)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: ejecutar corrutinas async desde Celery (que es síncrono)
# ─────────────────────────────────────────────────────────────────────────────
def run_async(coro):
    """Ejecuta una corrutina async desde el contexto síncrono de Celery."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ─────────────────────────────────────────────────────────────────────────────
# TAREA PRINCIPAL: Pipeline completo de procesamiento de un archivo
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(
    bind=True,
    name="backend.app.workers.queue_worker.process_file",
    max_retries=3,
    default_retry_delay=60,  # segundos entre reintentos
)
def process_file(
    self,
    photo_id: str,
    user_id: str,
    local_file_path: str, # Este es el Storage Path de S3, ej: uploads/uuid.ext
    is_video: bool,
    send_to_adobe: bool,
    send_to_shutterstock: bool,
    adobe_user: str,
    adobe_pass_decrypted: str,
    shutterstock_user: str,
    shutterstock_pass_decrypted: str,
):
    """
    Paso 1 del pipeline: S3 download -> miniatura -> Claude -> ExifTool -> S3 upload -> DB READY -> WS notify.
    Se ejecuta en el contenedor worker de Celery, fuera del servidor web.
    """
    import boto3
    from backend.app.services.raw_processor import (
        is_raw_file, generate_raw_thumbnail, inject_metadata_exiftool
    )
    from backend.app.services.video_processor import validate_and_extract_frame
    from backend.app.services.claude_vision import analyze_image_with_claude
    from backend.app.services.ai_support_agent import generate_incident_diagnostic

    logger.info(f"[{photo_id}] Iniciando pipeline de análisis IA de S3...")

    s3_client = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )

    # Directorio temporal para procesar archivos localmente
    with tempfile.TemporaryDirectory() as tmp_dir:
        extension = local_file_path.rsplit(".", 1)[-1].lower()
        original_temp_path = os.path.join(tmp_dir, f"original.{extension}")
        
        try:
            logger.info(f"[{photo_id}] Descargando de S3: {local_file_path} -> {original_temp_path}")
            download_from_s3_or_local(
                s3_client,
                settings.aws_s3_bucket,
                local_file_path,
                original_temp_path
            )
        except Exception as download_err:
            logger.error(f"[{photo_id}] Error descargando original de S3: {str(download_err)}")
            return {"status": "failed", "error": f"Error descargando original de S3: {str(download_err)}"}

        thumbnail_path = os.path.join(tmp_dir, f"{photo_id}_thumb.jpg")

        try:
            # ── PASO 1: Generar miniatura para Claude ───────────────────────
            if is_video:
                result = validate_and_extract_frame(original_temp_path, thumbnail_path)
                if not result.is_valid:
                    logger.error(f"[{photo_id}] Vídeo inválido: {result.error_message}")
                    return {"status": "failed", "error": result.error_message}
            elif is_raw_file(original_temp_path):
                success = generate_raw_thumbnail(original_temp_path, thumbnail_path)
                if not success:
                    raise RuntimeError("No se pudo generar miniatura del archivo RAW.")
            else:
                # JPEG estándar — usar directamente (o redimensionar si pesa mucho)
                from PIL import Image
                img = Image.open(original_temp_path)
                img.thumbnail((1024, 1024))
                img.save(thumbnail_path, "JPEG", quality=90)

            # ── PASO 2: Analizar con Claude 3.5 Sonnet ──────────────────────
            metadata = run_async(analyze_image_with_claude(thumbnail_path))
            logger.info(f"[{photo_id}] Claude completó análisis: {metadata.title[:50]}...")

            # ── PASO 3: Inyectar metadatos IPTC/XMP en el original ──────────
            if not is_video:
                inject_metadata_exiftool(
                    file_path=original_temp_path,
                    title=metadata.title,
                    description=metadata.description,
                    keywords=metadata.keywords,
                )
                
                # Subir de nuevo a S3 con los metadatos incrustados
                logger.info(f"[{photo_id}] Subiendo original indexado de vuelta a S3...")
                upload_to_s3_or_local(
                    s3_client,
                    original_temp_path,
                    settings.aws_s3_bucket,
                    local_file_path,
                    ExtraArgs={"ContentType": "image/jpeg" if extension in ["jpg", "jpeg"] else "application/octet-stream"}
                )

            # ── PASO 4: Actualizar en Base de Datos PostgreSQL a estado READY ──
            async def db_ready():
                from backend.app.database import AsyncSessionLocal
                from backend.app.models import Photo, UploadStatus
                from sqlalchemy import select
                
                async with AsyncSessionLocal() as db:
                    res = await db.execute(select(Photo).where(Photo.id == photo_id))
                    p = res.scalar_one_or_none()
                    if p:
                        p.title = metadata.title
                        p.description = metadata.description
                        p.keywords = json.dumps(metadata.keywords)
                        p.requires_model_release = metadata.requires_model_release
                        p.status = UploadStatus.READY
                        db.add(p)
                        await db.commit()

            run_async(db_ready())

            # ── PASO 5: Notificar progreso vía WebSocket ───────────────────
            async def ws_notify():
                from backend.app.main import notify_user
                await notify_user(
                    user_id=user_id,
                    event="analysis_completed",
                    data={
                        "photo_id": photo_id,
                        "status": "ready",
                        "title": metadata.title,
                        "requires_model_release": metadata.requires_model_release
                    }
                )
            
            try:
                run_async(ws_notify())
            except Exception as ws_err:
                logger.warning(f"No se pudo notificar WebSocket: {str(ws_err)}")

            return {
                "status": "completed",
                "photo_id": photo_id,
                "title": metadata.title,
                "keywords_count": len(metadata.keywords),
                "requires_model_release": metadata.requires_model_release,
            }

        except Exception as exc:
            report = generate_incident_diagnostic(
                user_id=user_id,
                file_id=photo_id,
                raw_error=str(exc),
            )
            logger.error(f"[{photo_id}] INCIDENCIA {report.incident_code}: {exc}")

            async def db_failed():
                from backend.app.database import AsyncSessionLocal
                from backend.app.models import Photo, UploadStatus
                from sqlalchemy import select
                async with AsyncSessionLocal() as db:
                    res = await db.execute(select(Photo).where(Photo.id == photo_id))
                    p = res.scalar_one_or_none()
                    if p:
                        p.status = UploadStatus.FAILED
                        p.incident_code = report.incident_code
                        p.error_log = str(exc)
                        db.add(p)
                        await db.commit()
            
            run_async(db_failed())

            async def ws_notify_failed():
                from backend.app.main import notify_user
                await notify_user(
                    user_id=user_id,
                    event="analysis_failed",
                    data={
                        "photo_id": photo_id,
                        "status": "failed",
                        "incident_code": report.incident_code,
                        "error": str(exc)
                    }
                )
            try:
                run_async(ws_notify_failed())
            except Exception:
                pass

            if report.should_retry and self.request.retries < self.max_retries:
                raise self.retry(exc=exc)

            return {"status": "failed", "incident_code": report.incident_code, "error": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# NUEVA TAREA: Distribución y subida real por FTP
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(
    bind=True,
    name="backend.app.workers.queue_worker.upload_media_task",
    max_retries=3,
    default_retry_delay=60,
)
def upload_media_task(self, photo_id: str):
    """
    Paso 2 del pipeline: Descargar de S3 -> descifrar creds del vault ->
    inyectar metadatos editados -> subir por FTP en paralelo -> DB COMPLETED -> WS notify.
    """
    import boto3
    from backend.app.services.raw_processor import inject_metadata_exiftool
    from backend.app.services.ftp_uploader import upload_to_all_agencies
    from backend.app.services.ai_support_agent import generate_incident_diagnostic
    from backend.app.crypto.vault import vault

    logger.info(f"[{photo_id}] Iniciando tarea asíncrona de subida FTP...")

    # 1. Recuperar foto y credenciales del usuario de la DB
    async def db_load_photo_and_user():
        from backend.app.database import AsyncSessionLocal
        from backend.app.models import Photo, User
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            p_res = await db.execute(select(Photo).where(Photo.id == photo_id))
            photo = p_res.scalar_one_or_none()
            if not photo:
                return None, None
                
            u_res = await db.execute(select(User).where(User.id == photo.user_id))
            user = u_res.scalar_one_or_none()
            return photo, user

    photo, user = run_async(db_load_photo_and_user())
    if not photo or not user:
        logger.error(f"[{photo_id}] Foto o usuario no encontrado en la base de datos.")
        return {"status": "failed", "error": "Foto o usuario no encontrado."}

    user_id = user.id
    local_file_path = photo.original_storage_url
    is_video = photo.is_video

    # Notificar inicio de subida FTP
    async def ws_notify_uploading():
        from backend.app.main import notify_user
        await notify_user(
            user_id=user_id,
            event="upload_started",
            data={"photo_id": photo_id, "status": "uploading"}
        )
    try:
        run_async(ws_notify_uploading())
    except Exception:
        pass

    s3_client = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )

    with tempfile.TemporaryDirectory() as tmp_dir:
        extension = local_file_path.rsplit(".", 1)[-1].lower()
        original_temp_path = os.path.join(tmp_dir, f"original.{extension}")
        
        try:
            logger.info(f"[{photo_id}] Descargando de S3 para FTP: {local_file_path} -> {original_temp_path}")
            download_from_s3_or_local(
                s3_client,
                settings.aws_s3_bucket,
                local_file_path,
                original_temp_path
            )
        except Exception as download_err:
            logger.error(f"[{photo_id}] Error descargando original de S3 para FTP: {str(download_err)}")
            return {"status": "failed", "error": f"Error descargando original de S3: {str(download_err)}"}

        try:
            # ── PASO 1: Descifrar credenciales de agencias en memoria ──────────
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

            getty_user = user.getty_ftp_user or ""
            getty_pass_decrypted = ""
            if user.getty_ftp_pass_encrypted:
                try:
                    getty_pass_decrypted = vault.decrypt(user.getty_ftp_pass_encrypted)
                except Exception as decrypt_err:
                    logger.error(f"Error descifrando clave de Getty: {str(decrypt_err)}")

            depositphotos_user = user.depositphotos_ftp_user or ""
            depositphotos_pass_decrypted = ""
            if user.depositphotos_ftp_pass_encrypted:
                try:
                    depositphotos_pass_decrypted = vault.decrypt(user.depositphotos_ftp_pass_encrypted)
                except Exception as decrypt_err:
                    logger.error(f"Error descifrando clave de Depositphotos: {str(decrypt_err)}")

            freepik_user = user.freepik_ftp_user or ""
            freepik_pass_decrypted = ""
            if user.freepik_ftp_pass_encrypted:
                try:
                    freepik_pass_decrypted = vault.decrypt(user.freepik_ftp_pass_encrypted)
                except Exception as decrypt_err:
                    logger.error(f"Error descifrando clave de Freepik: {str(decrypt_err)}")

            # ── PASO 2: Inyectar metadatos finales por si el usuario editó ──────
            keywords_list = []
            if photo.keywords:
                try:
                    keywords_list = json.loads(photo.keywords)
                except Exception:
                    keywords_list = [k.strip() for k in photo.keywords.split(",") if k.strip()]

            if not is_video:
                inject_metadata_exiftool(
                    file_path=original_temp_path,
                    title=photo.title or "",
                    description=photo.description or "",
                    keywords=keywords_list,
                )

            # ── PASO 3: Subir a las agencias en paralelo por FTP ──────────────
            agencies = []
            credentials = {}

            if photo.send_to_adobe and adobe_user:
                agencies.append("adobe")
                credentials["adobe"] = {"user": adobe_user, "password": adobe_pass_decrypted}

            if photo.send_to_shutterstock and shutterstock_user:
                agencies.append("shutterstock")
                credentials["shutterstock"] = {"user": shutterstock_user, "password": shutterstock_pass_decrypted}

            if getattr(photo, "send_to_getty", False) and getty_user:
                agencies.append("getty")
                credentials["getty"] = {"user": getty_user, "password": getty_pass_decrypted}

            if getattr(photo, "send_to_depositphotos", False) and depositphotos_user:
                agencies.append("depositphotos")
                credentials["depositphotos"] = {"user": depositphotos_user, "password": depositphotos_pass_decrypted}

            if getattr(photo, "send_to_freepik", False) and freepik_user:
                agencies.append("freepik")
                credentials["freepik"] = {"user": freepik_user, "password": freepik_pass_decrypted}

            results = []
            if agencies:
                results = run_async(
                    upload_to_all_agencies(
                        local_file_path=original_temp_path,
                        agencies=agencies,
                        ftp_credentials=credentials,
                        is_video=is_video,
                    )
                )
                logger.info(f"[{photo_id}] Resultados FTP: {[(r.agency, r.success) for r in results]}")

            # Verificar si hubo algún error en los envíos FTP
            failed_uploads = [r for r in results if not r.success]
            
            if failed_uploads:
                # Si falló alguna de las subidas FTP obligatorias
                first_failed = failed_uploads[0]
                error_msg = first_failed.error or "Error desconocido de transferencia FTP."
                raise RuntimeError(f"Fallo en FTP ({first_failed.agency}): {error_msg}")

            # ── PASO 4: Actualizar Base de Datos a COMPLETED ─────────────────
            async def db_completed():
                from backend.app.database import AsyncSessionLocal
                from backend.app.models import Photo, UploadStatus
                from sqlalchemy import select
                async with AsyncSessionLocal() as db:
                    res = await db.execute(select(Photo).where(Photo.id == photo_id))
                    p = res.scalar_one_or_none()
                    if p:
                        p.status = UploadStatus.COMPLETED
                        db.add(p)
                        await db.commit()

            run_async(db_completed())

            # ── PASO 5: Notificar progreso por WebSocket ─────────────────────
            async def ws_notify_completed():
                from backend.app.main import notify_user
                await notify_user(
                    user_id=user_id,
                    event="upload_completed",
                    data={"photo_id": photo_id, "status": "completed"}
                )
            try:
                run_async(ws_notify_completed())
            except Exception:
                pass

            return {"status": "completed", "photo_id": photo_id}

        except Exception as exc:
            report = generate_incident_diagnostic(
                user_id=user_id,
                file_id=photo_id,
                raw_error=str(exc),
            )
            logger.error(f"[{photo_id}] FTP UPLOAD INCIDENCIA {report.incident_code}: {exc}")

            async def db_failed():
                from backend.app.database import AsyncSessionLocal
                from backend.app.models import Photo, UploadStatus
                from sqlalchemy import select
                async with AsyncSessionLocal() as db:
                    res = await db.execute(select(Photo).where(Photo.id == photo_id))
                    p = res.scalar_one_or_none()
                    if p:
                        p.status = UploadStatus.FAILED
                        p.incident_code = report.incident_code
                        p.error_log = str(exc)
                        db.add(p)
                        await db.commit()
            
            run_async(db_failed())

            async def ws_notify_failed():
                from backend.app.main import notify_user
                await notify_user(
                    user_id=user_id,
                    event="upload_failed",
                    data={
                        "photo_id": photo_id,
                        "status": "failed",
                        "incident_code": report.incident_code,
                        "error": str(exc)
                    }
                )
            try:
                run_async(ws_notify_failed())
            except Exception:
                pass

            if report.should_retry and self.request.retries < self.max_retries:
                raise self.retry(exc=exc)

            return {"status": "failed", "incident_code": report.incident_code, "error": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# TAREA CANARY: Disparada por Celery Beat cada 6 horas
# ─────────────────────────────────────────────────────────────────────────────
@celery_app.task(name="backend.app.workers.queue_worker.run_canary_check")
def run_canary_check():
    """Ejecuta el test canary de conectividad. Delegado al cron_guardian."""
    from backend.app.workers.cron_guardian import perform_canary_check
    perform_canary_check()

