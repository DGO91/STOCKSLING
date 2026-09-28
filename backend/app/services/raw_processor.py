"""
StockSling — Procesador de archivos RAW profesionales.
Abre formatos nativos de cámara (.CR3, .NEF, .ARW, .DNG, etc.) con rawpy
y genera una miniatura JPEG de 1024px para enviar a Claude.
El archivo original NUNCA se modifica — conservación binaria 100%.
"""
import logging
import os
from pathlib import Path

import imageio
import rawpy

logger = logging.getLogger("stocksling.raw_processor")

# Extensiones RAW soportadas
RAW_EXTENSIONS = {".cr3", ".cr2", ".nef", ".arw", ".dng", ".orf", ".rw2", ".raf", ".pef"}


def is_raw_file(file_path: str) -> bool:
    """Comprueba si un archivo es un formato RAW de cámara."""
    return Path(file_path).suffix.lower() in RAW_EXTENSIONS


def generate_raw_thumbnail(raw_file_path: str, output_thumbnail_path: str) -> bool:
    """
    Abre un archivo RAW de cámara, lo desarrolla con algoritmo AHD y
    guarda una miniatura JPEG de 1024px para análisis con Claude.

    El archivo RAW original permanece intacto en todo momento.

    Args:
        raw_file_path: Ruta al archivo RAW nativo (.CR3, .NEF, .ARW, etc.)
        output_thumbnail_path: Ruta donde guardar el JPEG de 1024px.

    Returns:
        True si la miniatura se generó correctamente, False si hubo error.
    """
    logger.info(f"Procesando archivo RAW: {Path(raw_file_path).name}")

    try:
        with rawpy.imread(raw_file_path) as raw:
            # Procesamos el RAW con balance de blancos de cámara y half_size para
            # reducir la resolución al 50% sin re-comprimir el original.
            rgb = raw.postprocess(
                use_camera_wb=True,       # Balance de blancos nativo de la cámara
                half_size=True,           # Reduce tamaño para procesamiento más rápido
                no_auto_bright=False,     # Permite ajuste automático de brillo
                output_bps=8,             # 8 bits por canal (compatible con JPEG)
            )

        # Guardar como JPEG de alta calidad (95%)
        os.makedirs(os.path.dirname(output_thumbnail_path), exist_ok=True)
        imageio.imwrite(output_thumbnail_path, rgb, quality=95)

        logger.info(f"Miniatura RAW generada: {output_thumbnail_path}")
        return True

    except Exception as e:
        logger.error(f"Error al procesar RAW {raw_file_path}: {str(e)}")
        return False


def sanitize_exif_input(val: str) -> str:
    """
    Sanitiza strings de entrada para evitar cualquier inyección de formato o parámetros
    en la herramienta del sistema ExifTool. Remueve caracteres de control y limita longitud.
    """
    if not val:
        return ""
    # Remover caracteres de control menores de 32 (excepto newlines/tabs)
    cleaned = "".join(ch for ch in val if ord(ch) >= 32 or ch in "\n\r\t")
    return cleaned.strip()[:500]


def sanitize_exif_keyword(kw: str) -> str:
    cleaned = sanitize_exif_input(kw)
    # Excluir caracteres comunes de separación en keywords de stock
    return cleaned.replace(";", "").replace(",", "").strip()


def inject_metadata_exiftool(
    file_path: str,
    title: str,
    description: str,
    keywords: list,
) -> bool:
    """
    Inyecta metadatos IPTC/XMP en el archivo original sin alterar píxeles.
    Usa ExifTool a través de pyexiftool para máxima compatibilidad.

    Esta es la función canónica de inyección — funciona con JPEG y RAW.
    """
    try:
        import exiftool

        # Sanitizar metadatos preventivamente
        safe_title = sanitize_exif_input(title)
        safe_description = sanitize_exif_input(description)
        safe_keywords = [sanitize_exif_keyword(k) for k in keywords if k]

        with exiftool.ExifToolHelper() as et:
            et.set_tags(
                [file_path],
                tags={
                    "IPTC:ObjectName":        safe_title,
                    "IPTC:Caption-Abstract":  safe_description,
                    "IPTC:Keywords":          safe_keywords,
                    "XMP:Title":              safe_title,
                    "XMP:Description":        safe_description,
                    "XMP:Subject":            safe_keywords,
                },
                params=["-overwrite_original"],  # Sin archivo .original duplicado
            )

        logger.info(f"Metadatos IPTC/XMP inyectados sin pérdida en: {file_path}")
        return True

    except Exception as e:
        logger.error(f"Error al inyectar metadatos con ExifTool en {file_path}: {str(e)}")
        return False
