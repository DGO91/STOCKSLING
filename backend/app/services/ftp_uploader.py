"""
StockSling — Conector FTP asíncrono de alta velocidad con aioftp.
Transfiere archivos originales a Adobe Stock y Shutterstock sin bloquear
el servidor web. Soporta buffers optimizados para archivos ProRes/4K de +1GB.
"""
import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Optional

import aioftp
import aiofiles

logger = logging.getLogger("stocksling.ftp_uploader")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN DE SERVIDORES FTP
# ─────────────────────────────────────────────────────────────────────────────
AGENCY_FTP_HOSTS = {
    "adobe":        "ftp.contributor.adobestock.com",
    "shutterstock": "ftp.shutterstock.com",
    "getty":        "ftp.istockphoto.com",
    "depositphotos":"ftp.depositphotos.com",
    "freepik":      "ftp.freepik.com",
}

# Buffer de lectura: 64KB para fotos, 256KB para vídeos
PHOTO_CHUNK_SIZE = 65_536       # 64 KB
VIDEO_CHUNK_SIZE = 262_144      # 256 KB


@dataclass
class FTPUploadResult:
    success: bool
    agency: str
    file_name: str
    error: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIÓN PRINCIPAL DE SUBIDA
# ─────────────────────────────────────────────────────────────────────────────
async def upload_file_to_agency(
    local_file_path: str,
    agency_name: str,
    ftp_user: str,
    ftp_password: str,
    is_video: bool = False,
) -> FTPUploadResult:
    """
    Sube un archivo al servidor FTP de una agencia de stock de forma asíncrona.
    No bloquea el hilo del servidor principal gracias a async/await.

    Args:
        local_file_path: Ruta local al archivo original (foto o vídeo).
        agency_name: "adobe" o "shutterstock".
        ftp_user: ID de colaborador de la agencia.
        ftp_password: Contraseña FTP ya descifrada por el vault.
        is_video: True para usar buffers más grandes (256KB chunks).

    Returns:
        FTPUploadResult con success, agency, file_name y error si aplica.
    """
    host = AGENCY_FTP_HOSTS.get(agency_name.lower())
    if not host:
        return FTPUploadResult(
            success=False,
            agency=agency_name,
            file_name=os.path.basename(local_file_path),
            error=f"Agencia '{agency_name}' no configurada en AGENCY_FTP_HOSTS.",
        )

    file_name = os.path.basename(local_file_path)
    chunk_size = VIDEO_CHUNK_SIZE if is_video else PHOTO_CHUNK_SIZE

    logger.info(f"Iniciando subida FTP: {file_name} → {agency_name.upper()} ({host})")

    try:
        async with aioftp.Client.context(host, user=ftp_user, password=ftp_password) as client:
            async with aiofiles.open(local_file_path, mode="rb") as f:
                async with client.upload_stream(file_name) as stream:
                    while True:
                        chunk = await f.read(chunk_size)
                        if not chunk:
                            break
                        await stream.write(chunk)

        logger.info(f"✅ Subida completada: {file_name} → {agency_name.upper()}")
        return FTPUploadResult(success=True, agency=agency_name, file_name=file_name)

    except aioftp.StatusCodeError as ftp_err:
        error_msg = f"FTP error code {ftp_err}: {str(ftp_err)}"
        logger.error(f"🚨 FTP crítico ({agency_name}): {error_msg}")
        return FTPUploadResult(success=False, agency=agency_name, file_name=file_name, error=error_msg)

    except Exception as e:
        error_msg = str(e)
        logger.error(f"🚨 Error inesperado en FTP ({agency_name}): {error_msg}")
        return FTPUploadResult(success=False, agency=agency_name, file_name=file_name, error=error_msg)


async def upload_to_all_agencies(
    local_file_path: str,
    agencies: list,
    ftp_credentials: dict,
    is_video: bool = False,
) -> list:
    """
    Sube el mismo archivo a múltiples agencias en PARALELO.

    Args:
        local_file_path: Archivo a subir.
        agencies: Lista de agencias (["adobe", "shutterstock"]).
        ftp_credentials: Dict con {agency: {user, password}} ya descifradas.
        is_video: Flag para buffers de vídeo.

    Returns:
        Lista de FTPUploadResult para cada agencia.
    """
    tasks = []
    for agency in agencies:
        creds = ftp_credentials.get(agency, {})
        if creds:
            tasks.append(
                upload_file_to_agency(
                    local_file_path=local_file_path,
                    agency_name=agency,
                    ftp_user=creds["user"],
                    ftp_password=creds["password"],
                    is_video=is_video,
                )
            )

    if not tasks:
        logger.warning("No hay credenciales configuradas para ninguna agencia.")
        return []

    results = await asyncio.gather(*tasks, return_exceptions=False)
    return list(results)
