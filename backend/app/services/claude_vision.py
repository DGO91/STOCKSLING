"""
StockSling — Conector asíncrono con la API de Claude 3.5 Sonnet.
Analiza miniaturas de imágenes/frames de vídeo y devuelve metadatos
SEO validados con Pydantic para inyectar en los archivos originales.
"""
import base64
import json
import logging

from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field
from typing import List

from backend.app.config import settings

logger = logging.getLogger("stocksling.claude")

# ─────────────────────────────────────────────────────────────────────────────
# CLIENTE ANTHROPIC
# ─────────────────────────────────────────────────────────────────────────────
_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT MAESTRO (Stock SEO Expert)
# ─────────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Eres un experto en indexación de contenido visual y SEO para plataformas de stock (Adobe Stock, Shutterstock, Getty Images).
Tu única tarea es analizar la imagen proporcionada y generar metadatos comerciales de altísima calidad.

Debes responder ÚNICAMENTE con un objeto JSON válido, sin textos introductorios, sin bloques de código markdown (como ```json) y sin explicaciones. Si el formato no es JSON estricto, el sistema fallará.

Estructura requerida:
{
  "title": "String de 5 a 10 palabras en inglés. Descriptivo, comercial y natural.",
  "description": "String de una frase detallada en inglés (máximo 200 caracteres) enfocada en contexto comercial y editorial.",
  "keywords": ["Lista de exactamente 40 a 50 strings en inglés. Ordenados por relevancia. Incluye conceptos literales, colores, emociones, entorno y términos técnicos."],
  "requires_model_release": boolean
}

Reglas críticas:
1. Todo el texto MUST be in ENGLISH.
2. No keyword stuffing — no repitas palabras clave similares.
3. Captura la composición de color dominante y el tipo de iluminación (ej: 'golden hour', 'studio lighting').
4. requires_model_release = true si hay rostros humanos reconocibles, tatuajes únicos o propiedad privada protegida."""


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA DE RESPUESTA (Validación Pydantic)
# ─────────────────────────────────────────────────────────────────────────────
class StockMetadata(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., max_length=500)
    keywords: List[str] = Field(..., min_length=40, max_length=50)
    requires_model_release: bool


# Lista de modelos priorizados para cascada de fallos auto-recuperable (Línea de Modelos Oficial 2026)
def get_fallback_models() -> List[str]:
    # Extraemos el modelo configurado en .env (Por defecto Sonnet 4.6 en 2026)
    configured_model = getattr(settings, "claude_model", "claude-sonnet-4-6")
    
    # Lista predeterminada ordenada de los modelos oficiales vigentes en 2026
    default_order = [
        "claude-sonnet-4-6",     # Estándar de la industria (Inteligencia + Velocidad)
        "claude-opus-4-7",       # Flagship de razonamiento profundo y Extended Thinking
        "claude-haiku-4.5",      # Modelo de alto volumen y velocidad ultra-rápida
        "claude-3-5-sonnet-latest", # Legacy fallback de compatibilidad anterior
        "claude-3-haiku-20240307"   # Último recurso histórico
    ]
    
    # Construimos la lista sin duplicados
    models = []
    if configured_model:
        models.append(configured_model)
    for m in default_order:
        if m not in models:
            models.append(m)
    return models


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIÓN PRINCIPAL CON CASCADA AUTO-RECUPERABLE
# ─────────────────────────────────────────────────────────────────────────────
async def analyze_image_with_claude(thumbnail_path: str) -> StockMetadata:
    """
    Envía la miniatura (1024px) de una foto o frame de vídeo a Claude.
    Cuenta con un ruteador dinámico de modelos que detecta deprecaciones de Anthropic
    y realiza una conmutación de fallos en cascada en tiempo real.

    Args:
        thumbnail_path: Ruta local al archivo JPEG de la miniatura.

    Returns:
        StockMetadata con title, description, keywords y requires_model_release.
    """
    logger.info(f"Iniciando pipeline de análisis para: {thumbnail_path}")

    # MODO DESARROLLADOR FALLBACK: Si la clave de Anthropic es la default de desarrollo local o vacía
    if settings.anthropic_api_key == "your_anthropic_api_key_here" or not settings.anthropic_api_key:
        logger.info("Modo Dev: Generando metadatos mock de altísima calidad para testing local...")
        import random
        colors = ["blue", "golden", "vibrant", "emerald", "sunset", "warm", "cinematic", "moody"]
        subjects = ["landscape", "portrait", "urban architecture", "workspace", "lifestyle scene", "modern technology"]
        base_keywords = [
            "commercial photography", "high resolution", "professional lighting", "creative composition",
            "stock photo", "editorial style", "modern design", "natural details", "premium quality",
            "advertising media", "social content", "digital asset", "stunning beauty", "artistic capture",
            "expertly framed", "sharp focus", "perfect exposure", "clean minimalist", "trendy aesthetic"
        ]
        chosen_color = random.choice(colors)
        chosen_subject = random.choice(subjects)
        
        mock_title = f"Stunning visual capture of a {chosen_color} {chosen_subject} under perfect lighting"
        mock_description = f"A professional commercial stock photo showcasing a beautifully composed {chosen_color} {chosen_subject} with cinematic atmosphere and depth."
        
        kws = set()
        kws.add(chosen_color)
        kws.add(chosen_subject.split()[-1])
        for part in chosen_subject.split():
            kws.add(part)
        for w in base_keywords:
            for word in w.split():
                kws.add(word)
            kws.add(w)
        fillers = ["concept", "inspiration", "background", "texture", "studio", "outdoor", "isolated", "decoration", "elegance", "simplicity", "detail", "close-up", "macro", "perspective", "creative", "authentic", "genuine", "feeling", "mood", "light", "shadow", "contrast"]
        for f in fillers:
            if len(kws) >= 42:
                break
            kws.add(f)
            
        mock_keywords = sorted(list(kws))[:45]
        
        return StockMetadata(
            title=mock_title,
            description=mock_description,
            keywords=mock_keywords,
            requires_model_release=False
        )

    # 1. Leer y codificar la miniatura en Base64
    with open(thumbnail_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")

    # 2. Ruteador en Cascada Auto-Recuperable
    models_to_try = get_fallback_models()
    last_exception = None

    for model_candidate in models_to_try:
        try:
            logger.info(f"Intentando análisis con modelo Claude: '{model_candidate}'")
            
            response = await _client.messages.create(
                model=model_candidate,
                max_tokens=1024,
                temperature=0.2,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": image_b64,
                                },
                            },
                            {
                                "type": "text",
                                "text": "Analyze this stock image and return the JSON metadata.",
                            },
                        ],
                    }
                ],
            )

            # 3. Parsear la respuesta y validar con Pydantic
            raw_text = response.content[0].text.strip()

            # Limpieza defensiva por si Claude añade markdown a pesar del prompt
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip()

            data = json.loads(raw_text)
            metadata = StockMetadata(**data)

            logger.info(
                f"ÉXITO con '{model_candidate}'. Keywords: {len(metadata.keywords)}, "
                f"Model release: {metadata.requires_model_release}"
            )
            return metadata

        except Exception as e:
            logger.warning(
                f"Fallo o deprecación detectada con '{model_candidate}': {str(e)}. "
                "Conmutando al siguiente modelo disponible en cascada..."
            )
            last_exception = e
            continue

    # Si se agota la cascada sin éxito, lanzamos la excepción consolidada
    critical_err = (
        "CRITICAL: Todos los modelos de Claude en cascada fallaron o no están disponibles. "
        f"Último error: {str(last_exception)}"
    )
    logger.error(critical_err)
    raise ValueError(critical_err) from last_exception
