"""
StockSling — Script Guardián (Canary Test + Self-Healing).
Se ejecuta cada 6 horas via Celery Beat.
Detecta cambios o fallos en los servidores FTP de las agencias y
registra el estado para que el agente de auto-reparación actúe.
"""
import asyncio
import logging
import os
from pathlib import Path

logger = logging.getLogger("stocksling.guardian")

# Imagen canary: 1x1px JPEG guardada en assets/
CANARY_IMAGE_PATH = Path(__file__).parent.parent.parent.parent / "assets" / "canary_pixel.jpg"


def perform_canary_check():
    """
    Orquesta el test de conectividad a todas las agencias de stock.
    Llamada desde queue_worker.run_canary_check() por Celery Beat.
    """
    logger.info("🔍 Iniciando Canary Test global de agencias de stock...")

    if not CANARY_IMAGE_PATH.exists():
        logger.warning(f"Imagen canary no encontrada en {CANARY_IMAGE_PATH}. Saltando test.")
        return

    from backend.app.config import settings

    # Cuentas de prueba propias (NO de clientes)
    test_accounts = {}
    if settings.test_adobe_user:
        test_accounts["adobe"] = {
            "user": settings.test_adobe_user,
            "password": settings.test_adobe_pass,
        }
    if settings.test_shutterstock_user:
        test_accounts["shutterstock"] = {
            "user": settings.test_shutterstock_user,
            "password": settings.test_shutterstock_pass,
        }

    if not test_accounts:
        logger.info("Sin cuentas de test configuradas. Canary Test omitido.")
        return

    results = asyncio.get_event_loop().run_until_complete(
        _run_canary_for_all(test_accounts)
    )

    failed_agencies = [agency for agency, ok in results.items() if not ok]

    if failed_agencies:
        logger.critical(
            f"🚨 CANARY ALERT: Fallos detectados en: {', '.join(failed_agencies).upper()}. "
            f"Activando protocolo de Self-Healing..."
        )
        _trigger_self_healing(failed_agencies)
    else:
        logger.info("✅ Canary Test superado. Todas las agencias operan con normalidad.")


async def _run_canary_for_all(test_accounts: dict) -> dict:
    """Prueba la conectividad FTP a todas las agencias en paralelo."""
    from backend.app.services.ftp_uploader import upload_file_to_agency

    tasks = {
        agency: upload_file_to_agency(
            local_file_path=str(CANARY_IMAGE_PATH),
            agency_name=agency,
            ftp_user=creds["user"],
            ftp_password=creds["password"],
        )
        for agency, creds in test_accounts.items()
    }

    results = {}
    for agency, coro in tasks.items():
        try:
            result = await coro
            results[agency] = result.success
        except Exception as e:
            logger.error(f"Error en canary de {agency}: {str(e)}")
            results[agency] = False

    return results


def _trigger_self_healing(failed_agencies: list):
    """
    Registra los fallos en el log estructurado para que el agente externo
    (Antigravity / CI-CD) detecte el estado y aplique parches automáticos.

    En producción, esto puede:
    1. Crear un issue en GitHub via API.
    2. Disparar un webhook de PagerDuty / Slack.
    3. Actualizar una flag en Redis que pause los envíos a esa agencia.
    """
    import json
    from datetime import datetime

    alert_payload = {
        "event": "CANARY_FAILURE",
        "timestamp": datetime.utcnow().isoformat(),
        "failed_agencies": failed_agencies,
        "action_required": "SELF_HEALING_AGENT_TRIGGERED",
    }

    # Log estructurado JSON — legible por sistemas de monitoreo (Datadog, CloudWatch, etc.)
    logger.critical(f"SELF_HEALING_TRIGGER: {json.dumps(alert_payload)}")
