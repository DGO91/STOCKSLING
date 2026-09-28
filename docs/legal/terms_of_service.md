# 📊 Términos de Servicio de StockSling SaaS

*Última actualización: 1 de junio de 2026*

Bienvenido a **StockSling** (en adelante, "la Plataforma" o "el Servicio"). Al registrarse, suscribirse a través de Stripe o utilizar cualquiera de las herramientas de indexación asíncrona por Inteligencia Artificial y distribución multidestino que ofrecemos, usted acepta cumplir y estar legalmente sujeto a los presentes **Términos de Servicio** (en adelante, los "Términos").

> [!WARNING]
> **POR FAVOR, LEA ESTOS TÉRMINOS CON ATENCIÓN ANTES DE UTILIZAR EL SERVICIO.** 
> Si no está de acuerdo con alguna parte de este documento, no debe acceder a la Plataforma ni utilizar nuestros servicios.

---

## 1. Naturaleza del Servicio (Acceso SaaS)

StockSling opera como un modelo de **Software como Servicio (SaaS)** basado en la nube.
*   **Acceso**: Usted no adquiere la posesión, descarga ni licenciamiento físico del código fuente del backend o frontend. Se le otorga una **licencia de acceso no exclusiva, revocable, limitada y temporal** para ingresar y operar la interfaz de usuario en la nube con fines de administración de portafolios fotográficos y de vídeo.
*   **Capacidades**: El servicio permite la subida temporal de archivos binarios, el análisis visual automatizado mediante Modelos de Visión Artificial, el almacenamiento local temporal o en la nube (AWS S3), la inyección local de metadatos IPTC/XMP a través de subprocesos EXIF y la distribución paralela por protocolos de red (FTP, SFTP, FTPS) hacia plataformas de microstock externas autorizadas por usted (Adobe Stock, Shutterstock, Getty Images, Depositphotos, Freepik).

---

## 2. Límite de Responsabilidad en Generación de Metadatos por IA

StockSling utiliza Modelos de Inteligencia Artificial (IA) de última generación para analizar y auto-generar títulos descriptivos, descripciones optimizadas para motores de búsqueda (SEO) y bloques de 40 a 50 palabras clave.

> [!IMPORTANT]
> **EXENCIÓN DE RESPONSABILIDAD DE IA:**
> *   La Plataforma genera sugerencias de metadatos de forma puramente automatizada.
> *   **El usuario conserva la responsabilidad legal, administrativa y editorial definitiva sobre los metadatos inyectados en sus archivos.** 
> *   Usted tiene la obligación contractual de revisar, validar, modificar y aprobar manualmente la información generada en nuestro panel de revisión (`/workspace`) antes de guardarla o distribuirla.
> *   **StockSling no asume ninguna responsabilidad, ni directa ni indirecta, si una agencia de stock de terceros rechaza sus archivos, bloquea o suspende temporal o permanentemente su cuenta de colaborador, o inicia reclamaciones legales por infracción de derechos de autor debido a metadatos incorrectos, confusos o inapropiados generados por la IA.**

---

## 3. Seguridad de Credenciales y Cifrado AES-256-GCM

Para distribuir sus archivos de forma automática, usted debe ingresar sus nombres de usuario y contraseñas de las agencias integradas.

*   **Compromiso de Seguridad**: StockSling implementa un cifrado asimétrico y simétrico de grado de seguridad bancaria. Sus credenciales se cifran en tránsito (HTTPS) y en reposo en la base de datos PostgreSQL utilizando una llave maestra asimétrica con el protocolo criptográfico **AES-256-GCM** (`MASTER_ENCRYPTION_KEY`). Las credenciales son descifradas temporalmente en memoria RAM exclusivamente durante el milisegundo en que se establece la conexión asíncrona FTP/SFTP del Celery Worker con la agencia de destino.
*   **Responsabilidad del Usuario**: Aunque garantizamos el aislamiento estricto por base de datos (*multi-tenant*), usted es el único responsable de configurar contraseñas seguras y exclusivas para sus conexiones de stock y de no compartir las credenciales de acceso a su cuenta de StockSling. StockSling no se hace responsable por accesos no autorizados debidos a negligencia del usuario.

---

## 4. Canales de Distribución FTP y Fallos de Terceros

La Plataforma facilita la transferencia de sus activos a través de protocolos de red. 
*   **Intermediación Técnica**: StockSling actúa únicamente como un intermediario tecnológico asíncrono.
*   **Exención por Caídas**: No garantizamos la disponibilidad continua, la velocidad de subida final ni la estabilidad de las conexiones FTP/SFTP de los servidores de destino (v.g. caídas en Adobe Stock, saturación de puertos en iStockphoto o rechazo de cabeceras en Freepik). Cualquier fallo de red externo capturado por nuestro motor se registrará con un código de incidencia exclusivo (`incident_code`) y el sistema activará reintentos diferidos sin responsabilidad por retrasos en la disponibilidad comercial de su contenido.

---

## 5. Ledger de Créditos y Políticas de Stripe

*   **Modelo de Consumo**: La Plataforma cobra tarifas de procesamiento basadas en créditos de uso:
    *   **Imágenes/Fotos**: Deducción de **1 crédito** por cada archivo procesado.
    *   **Vídeos/Clips**: Deducción de **5 créditos** por cada archivo procesado (debido al consumo intensivo de procesamiento de transcodificación de frames y análisis temporal).
*   **Bloqueo Atómico**: El sistema realiza las reducciones bajo un bloqueo estricto de fila (`SELECT FOR UPDATE`). Intentos de bypass o manipulación concurrente de saldos mediante llamadas paralelas detendrán el servicio de inmediato.
*   **Política de Reembolso**: Los cargos de Stripe por suscripciones mensuales o paquetes de créditos no son reembolsables una vez que los créditos han sido parcial o totalmente consumidos para análisis o subidas, de acuerdo con la legislación vigente de servicios digitales consumidos inmediatamente.

---

## 6. Jurisdicción y Modificaciones

Estos Términos se rigen por la legislación aplicable a los contratos electrónicos y la prestación de servicios SaaS en la jurisdicción del prestador de servicios. Nos reservamos el derecho de modificar estos Términos en cualquier momento, notificándole a través del Dashboard con al menos 5 días de anticipación antes de que entren en vigor.
