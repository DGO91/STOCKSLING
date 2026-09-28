# =====================================================================
# STOCKSLING — Dockerfile Multi-Stage de Producción
# Instala libraw (RAW), exiftool (metadatos), imagemagick y ffmpeg
# =====================================================================

# ── ETAPA 1: Builder — Compila dependencias Python con C/C++ ──────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Herramientas de compilación para rawpy y otras librerías nativas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libraw-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# ── ETAPA 2: Runner — Imagen de producción ligera ─────────────────────
FROM python:3.11-slim AS runner

WORKDIR /app

# Instalar herramientas del sistema: ExifTool, ImageMagick, FFmpeg, libraw
RUN apt-get update && apt-get install -y --no-install-recommends \
    exiftool \
    imagemagick \
    ffmpeg \
    libraw23 \
    && rm -rf /var/lib/apt/lists/*

# Permitir lectura/escritura de PDF en ImageMagick (requerido para model releases)
RUN sed -i 's/domain="coder" rights="none" pattern="PDF"/domain="coder" rights="read|write" pattern="PDF"/' \
    /etc/ImageMagick-6/policy.xml || true

# Copiar librerías Python compiladas desde el builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copiar código fuente
COPY ./backend /app/backend
COPY ./assets  /app/assets

# Directorios de trabajo temporales
RUN mkdir -p /tmp/stocksling/thumbnails /tmp/stocksling/frames && \
    chmod -R 755 /tmp/stocksling

# Puerto de la API FastAPI
EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
