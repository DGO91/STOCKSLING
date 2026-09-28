"""
StockSling — Módulo de Cifrado AES-256-GCM (Military-Grade).
Cifra y descifra las credenciales FTP de las agencias de stock.
La clave maestra NUNCA toca el código: viene de variables de entorno.
"""
import os
from base64 import b64decode, b64encode

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from backend.app.config import settings


class CredentialVault:
    """
    Gestiona el cifrado/descifrado de datos sensibles con AES-256-GCM.

    Características:
    - Cada cifrado genera un nonce de 12 bytes único → mismo texto produce
      cifrados distintos (protección contra ataques de repetición).
    - GCM incluye autenticación de integridad → detecta cualquier alteración.
    - El nonce se prepende al payload cifrado para autocontenerse en la DB.
    """

    def __init__(self):
        raw_key = b64decode(settings.master_encryption_key)
        if len(raw_key) != 32:
            raise ValueError(
                "MASTER_ENCRYPTION_KEY debe ser exactamente 32 bytes en Base64 (256 bits)."
            )
        self._aesgcm = AESGCM(raw_key)

    def encrypt(self, plain_text: str) -> str:
        """
        Cifra un texto plano (ej. contraseña FTP) y devuelve un string
        Base64 seguro listo para guardar en PostgreSQL.
        """
        nonce = os.urandom(12)                                       # IV único por operación
        ciphertext = self._aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
        payload = nonce + ciphertext                                  # nonce (12B) || ciphertext
        return b64encode(payload).decode("utf-8")

    def decrypt(self, encrypted_b64: str) -> str:
        """
        Descifra el valor almacenado en la DB y devuelve el texto original.
        Lanza una excepción si el payload fue alterado (integridad GCM).
        """
        payload = b64decode(encrypted_b64.encode("utf-8"))
        nonce      = payload[:12]
        ciphertext = payload[12:]
        plaintext_bytes = self._aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext_bytes.decode("utf-8")


# Instancia global reutilizable
vault = CredentialVault()
