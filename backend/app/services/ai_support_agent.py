"""
StockSling — Motor de Diagnóstico Automático y Soporte Autónomo.
Captura errores del sistema, genera códigos de incidencia únicos y
produce mensajes amigables para el fotógrafo + instrucciones internas
para el agente de auto-reparación.
"""
import logging
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger("stocksling.support")


# ─────────────────────────────────────────────────────────────────────────────
# ACCIONES INTERNAS DEL AGENTE (Self-Healing Protocol)
# ─────────────────────────────────────────────────────────────────────────────
class AgentAction:
    TRIGGER_SELF_HEALING  = "TRIGGER_SELF_HEALING_AGENT"
    NOTIFY_USER_CREDS     = "NOTIFY_USER_CREDENTIALS"
    REJECT_FILE_FORMAT    = "REJECT_FILE_FORMAT"
    RETRY_QUEUE_DELAYED   = "RETRY_QUEUE_DELAYED"
    PAUSE_AGENCY_UPLOADS  = "PAUSE_AGENCY_UPLOADS"
    DEDUCT_NO_CREDITS     = "DEDUCT_NO_CREDITS_ON_FAILED_UPLOAD"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO DE REPORTE DE INCIDENCIA
# ─────────────────────────────────────────────────────────────────────────────
class IncidentReport(BaseModel):
    incident_code:     str    # ERR-USERID-FILEID-TIMESTAMP
    user_id:           str
    file_id:           str
    technical_error:   str    # Error crudo del sistema (para logs internos)
    user_diagnostic:   str    # Mensaje amigable para el fotógrafo
    agent_action:      str    # Instrucción para el agente de auto-reparación
    agency:            Optional[str] = None
    should_retry:      bool = False


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIÓN PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────
def generate_incident_diagnostic(
    user_id: str,
    file_id: str,
    raw_error: str,
    agency: Optional[str] = None,
) -> IncidentReport:
    """
    Analiza el error crudo del sistema, genera un código de incidencia único
    y mapea el error técnico a un mensaje comprensible para el fotógrafo.

    El código de incidencia permite al equipo localizar el error exacto
    en los logs sin exponer información técnica sensible al usuario.

    Args:
        user_id: UUID del usuario afectado.
        file_id: UUID del archivo afectado.
        raw_error: String del error técnico capturado por el sistema.
        agency: Nombre de la agencia donde ocurrió el error (opcional).

    Returns:
        IncidentReport con código único, mensaje de usuario y acción del agente.
    """
    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    incident_code = f"ERR-{user_id[:8].upper()}-{file_id[:8].upper()}-{timestamp}"

    error_lower = raw_error.lower()

    # ── Valores por defecto ─────────────────────────────────────────────────
    user_msg     = "Ha ocurrido un error inesperado. Nuestro sistema ya está revisándolo automáticamente."
    agent_action = AgentAction.TRIGGER_SELF_HEALING
    should_retry = False

    # ── Mapeo de errores específicos ────────────────────────────────────────

    # Error de autenticación FTP
    if any(x in error_lower for x in ["530", "authentication failed", "invalid credentials", "login failed"]):
        user_msg     = "Tus credenciales FTP de la agencia son incorrectas o han expirado. Actualízalas en Ajustes → Conexiones."
        agent_action = AgentAction.NOTIFY_USER_CREDS
        should_retry = False

    # Error de duración de vídeo
    elif any(x in error_lower for x in ["duration", "too short", "too long"]):
        user_msg     = "El vídeo no cumple los requisitos: debe durar entre 5 y 60 segundos."
        agent_action = AgentAction.REJECT_FILE_FORMAT
        should_retry = False

    # Códec incompatible
    elif any(x in error_lower for x in ["codec", "format not supported", "invalid format"]):
        user_msg     = "El formato del vídeo no es compatible. Las agencias aceptan MP4 (H.264), MOV o ProRes."
        agent_action = AgentAction.REJECT_FILE_FORMAT
        should_retry = False

    # Servidor saturado (demasiadas conexiones)
    elif any(x in error_lower for x in ["421", "too many connections", "connection refused"]):
        user_msg     = "El servidor de la agencia está saturado. StockSling reintentará automáticamente en 10 minutos."
        agent_action = AgentAction.RETRY_QUEUE_DELAYED
        should_retry = True

    # Cuota de almacenamiento o cuenta bloqueada
    elif any(x in error_lower for x in ["quota", "disk full", "storage limit", "account suspended"]):
        user_msg     = "Tu cuenta en la agencia ha alcanzado su límite de almacenamiento o está en revisión. Contacta directamente con la agencia."
        agent_action = AgentAction.PAUSE_AGENCY_UPLOADS
        should_retry = False

    # Error de red / timeout
    elif any(x in error_lower for x in ["timeout", "connection timed out", "network error"]):
        user_msg     = "Error de conexión de red. StockSling reintentará la subida automáticamente."
        agent_action = AgentAction.RETRY_QUEUE_DELAYED
        should_retry = True

    # ── Construir y registrar el reporte ────────────────────────────────────
    report = IncidentReport(
        incident_code=incident_code,
        user_id=user_id,
        file_id=file_id,
        technical_error=raw_error,
        user_diagnostic=user_msg,
        agent_action=agent_action,
        agency=agency,
        should_retry=should_retry,
    )

    logger.error(
        f"INCIDENCIA {incident_code} | "
        f"User: {user_id[:8]} | File: {file_id[:8]} | "
        f"Agency: {agency or 'N/A'} | Action: {agent_action} | "
        f"Error: {raw_error[:200]}"
    )

    return report
