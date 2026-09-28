"""
StockSling — Procesador y validador de archivos de vídeo con FFmpeg.
Valida duración (5–60 segundos), extrae un fotograma limpio para Claude
y verifica códecs compatibles con las agencias de stock.
"""
import logging
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger("stocksling.video_processor")

# Extensiones de vídeo soportadas
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mxf"}

# Duración requerida por Adobe Stock y Shutterstock
VIDEO_MIN_DURATION = 5.0   # segundos
VIDEO_MAX_DURATION = 60.0  # segundos


@dataclass
class VideoValidation:
    is_valid: bool
    duration: float
    codec: Optional[str] = None
    error_message: Optional[str] = None


def is_video_file(file_path: str) -> bool:
    """Comprueba si un archivo es un formato de vídeo soportado."""
    return Path(file_path).suffix.lower() in VIDEO_EXTENSIONS


def validate_and_extract_frame(
    video_path: str,
    output_frame_path: str,
    frame_time: str = "00:00:02",
) -> VideoValidation:
    """
    Usa FFprobe + FFmpeg para:
    1. Extraer la duración y el códec del vídeo.
    2. Validar que cumple los requisitos de stock (5–60 segundos).
    3. Extraer un fotograma limpio en el segundo 2 para enviarlo a Claude.

    El vídeo original NO se modifica en ningún momento.

    Args:
        video_path: Ruta al archivo de vídeo.
        output_frame_path: Ruta donde guardar el fotograma JPEG extraído.
        frame_time: Marca de tiempo del fotograma a extraer (por defecto 00:00:02).

    Returns:
        VideoValidation con is_valid, duration, codec y error_message si aplica.
    """
    logger.info(f"Validando vídeo: {Path(video_path).name}")

    try:
        # ── 1. Obtener metadatos con FFprobe ────────────────────────────────
        probe_cmd = [
            "ffprobe",
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=duration,codec_name",
            "-of", "default=noprint_wrappers=1",
            video_path,
        ]
        probe = subprocess.run(
            probe_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # Parsear duración y códec de la salida de ffprobe
        duration = 0.0
        codec = None
        for line in probe.stdout.strip().splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                if key == "duration":
                    duration = float(value)
                elif key == "codec_name":
                    codec = value

        # ── 2. Validar duración ─────────────────────────────────────────────
        if duration < VIDEO_MIN_DURATION or duration > VIDEO_MAX_DURATION:
            msg = (
                f"Duración {duration:.1f}s fuera del rango permitido "
                f"({VIDEO_MIN_DURATION}–{VIDEO_MAX_DURATION} segundos)."
            )
            logger.warning(msg)
            return VideoValidation(is_valid=False, duration=duration, codec=codec, error_message=msg)

        # ── 3. Extraer fotograma clave para Claude ──────────────────────────
        os.makedirs(os.path.dirname(output_frame_path), exist_ok=True)
        frame_cmd = [
            "ffmpeg",
            "-y",                        # Sobreescribir sin confirmar
            "-ss", frame_time,
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",                 # Calidad JPEG alta (1=máxima, 31=mínima)
            output_frame_path,
        ]
        subprocess.run(frame_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        logger.info(f"Fotograma extraído en: {output_frame_path} (duración: {duration:.1f}s, códec: {codec})")
        return VideoValidation(is_valid=True, duration=duration, codec=codec)

    except subprocess.CalledProcessError as e:
        msg = f"FFmpeg falló al extraer el fotograma: {str(e)}"
        logger.error(msg)
        return VideoValidation(is_valid=False, duration=0.0, error_message=msg)
    except Exception as e:
        msg = f"Error inesperado al procesar vídeo: {str(e)}"
        logger.error(msg)
        return VideoValidation(is_valid=False, duration=0.0, error_message=msg)
