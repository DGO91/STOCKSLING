# 🔒 Política de Privacidad de StockSling SaaS

*Última actualización: 1 de junio de 2026*

En **StockSling**, nos tomamos la privacidad, la confidencialidad y la protección de su portafolio creativo con la máxima seriedad. Esta **Política de Privacidad** describe cómo recopilamos, procesamos, almacenamos y protegemos la información personal y los activos digitales que usted nos confía al utilizar nuestro SaaS.

---

## 1. Información que Recopilamos

Para proporcionarle el servicio de indexación y distribución masiva, requerimos recopilar la siguiente información:

1.  **Datos de Registro**: Correo electrónico, nombre completo y preferencias de idioma.
2.  **Datos de Pago (Vía Stripe)**: StockSling no almacena ni procesa directamente números de tarjetas de crédito o datos bancarios. Todas las transacciones se realizan de forma segura y encriptada a través del procesador de pagos **Stripe**. Recibimos únicamente confirmaciones de suscripción, ID de cliente y estado de facturación.
3.  **Credenciales de Agencias de Stock**: Los nombres de usuario y contraseñas de las agencias FTP a las que desea enviar sus archivos.
4.  **Activos Creativos**: Los archivos de fotos, imágenes RAW y vídeos que usted sube voluntariamente para su indexación.

---

## 2. Cómo Usamos y Protegemos sus Datos

Su información es tratada bajo los más altos estándares de seguridad y con la menor retención posible:

*   **Cifrado de Credenciales (Grado Militar)**: Sus contraseñas FTP se cifran inmediatamente en su navegador antes de guardarse en base de datos. Se utiliza el cifrado simétrico robusto **AES-256-GCM** con una llave maestra asimétrica (`MASTER_ENCRYPTION_KEY`). Estas contraseñas permanecen cifradas permanentemente y solo se descifran temporalmente en la memoria RAM volátil del Celery Worker durante el segundo que dura la subida FTP a las agencias.
*   **Tratamiento de Archivos Multimedia**:
    *   Sus imágenes y vídeos originales se suben a buckets seguros de AWS S3 o al directorio local protegido `./local_storage/uploads`.
    *   Generamos miniaturas JPEG ligeras de 1024px que enviamos temporalmente a las APIs multimodales de Visión Artificial (ej. Anthropic Claude) exclusivamente para generar los metadatos. Estas imágenes de análisis son descartadas por los proveedores de IA inmediatamente y **nunca son utilizadas para entrenar modelos de Inteligencia Artificial de terceros**.
    *   Una vez que el archivo original se inyecta con metadatos IPTC y se sube con éxito a sus destinos FTP configurados, StockSling no retiene los archivos originales en sus servidores de producción más allá de lo necesario para asegurar la entrega (máximo 30 días en caché para reintentos diferidos).
*   **No Comercialización**: **StockSling no vende, alquila, transfiere ni comparte sus datos personales ni sus archivos con ninguna empresa de marketing o terceros no autorizados.** Sus activos pertenecen al 100% a usted en todo momento.

---

## 3. Retención de Datos y Seguridad

*   **Aislamiento Multi-tenant**: Implementamos un aislamiento estricto a nivel de base de datos en PostgreSQL. Cada consulta y proceso asíncrono está filtrado rigurosamente por el identificador único del usuario autenticado (`User.id`), lo que garantiza que sus archivos y credenciales estén inaccesibles para cualquier otro usuario de la plataforma.
*   **Eliminación de Cuenta**: Usted tiene el derecho legal de solicitar la eliminación total de sus datos en cualquier momento. Al eliminar su cuenta, eliminamos inmediatamente de forma destructiva y permanente sus credenciales de base de datos, su historial de transacciones y cualquier archivo en caché o almacenamiento en nuestros servidores AWS S3 o locales.

---

## 4. Derechos del Usuario (GDPR / CCPA)

Como creador y colaborador de contenido, usted tiene plenos derechos sobre su información:
*   **Acceso y Portabilidad**: Puede descargar sus datos de portafolio e historial en cualquier momento.
*   **Rectificación**: Puede actualizar o corregir sus contraseñas FTP e información de cuenta de forma inmediata desde el panel `/integrations`.
*   **Oposición**: Puede desactivar o remover en cualquier momento cualquier conexión de agencia para revocar de inmediato el acceso de StockSling a ese canal de stock.

---

## 5. Contacto e Incidencias

Para cualquier consulta legal o dudas sobre el procesamiento criptográfico de sus contraseñas, puede contactar al equipo de seguridad de StockSling indicando su cuenta de usuario. Resolveremos su solicitud en un plazo menor a 48 horas hábiles.
