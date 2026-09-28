/**
 * Capturas de StockSling para el portafolio de Upwork.
 *
 * Levanta solo el frontend y responde a las llamadas de la API con datos
 * ficticios. NO toca la base de datos, ni AWS, ni Anthropic, ni las claves
 * reales del .env: el backend nunca llega a arrancar.
 *
 * Todo el contenido visible queda en inglés (stocksling_lang = 'en').
 */
const { chromium } = require('/Users/diogenesg.o/CLIENTES SAAS/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:5199';
const DIR = __dirname;
const SALIDA = path.join(DIR, 'raw');
const fixtures = JSON.parse(fs.readFileSync(path.join(DIR, 'fixtures.json'), 'utf8'));

const ANCHO = 1440, ALTO = 900, ESCALA = 2;

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  });
}

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: ANCHO, height: ALTO },
    deviceScaleFactor: ESCALA,
    locale: 'en-US',
    colorScheme: 'dark',
  });

  // ── La API entera, servida desde fixtures.json ────────────────────────
  await ctx.route('**://localhost:8000/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      }});
    }
    if (p === '/api/auth/me')          return json(route, fixtures.user);
    if (p === '/api/photos')           return json(route, fixtures.photos);
    if (p === '/api/releases')         return json(route, fixtures.releases);
    if (p === '/api/vault/credentials')return json(route, fixtures.credentials);
    return json(route, {});
  });

  // ── Las imágenes de demostración, generadas localmente ────────────────
  await ctx.route('**://demo.local/**', async (route) => {
    const nombre = path.basename(new URL(route.request().url()).pathname);
    const f = path.join(DIR, 'demo-assets', nombre);
    if (fs.existsSync(f)) {
      return route.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(f) });
    }
    return route.fulfill({ status: 404, body: '' });
  });

  // Sesión falsa e idioma inglés antes de que arranque React
  await ctx.addInitScript(() => {
    localStorage.setItem('stocksling_token', 'demo-token');
    localStorage.setItem('stocksling_lang', 'en');

    // WebSocket de mentira: sin backend, el indicador de History se quedaría
    // en "Reconnecting..." y la captura parecería una aplicación rota.
    // Este stub abre la conexión y no emite nada más.
    class WebSocketFalso {
      constructor() {
        this.readyState = 0;
        setTimeout(() => {
          this.readyState = 1;
          if (this.onopen) this.onopen({ type: 'open' });
        }, 120);
      }
      send() {}
      close() { this.readyState = 3; }
      addEventListener(tipo, fn) { this['on' + tipo] = fn; }
      removeEventListener() {}
    }
    WebSocketFalso.CONNECTING = 0;
    WebSocketFalso.OPEN = 1;
    WebSocketFalso.CLOSING = 2;
    WebSocketFalso.CLOSED = 3;
    window.WebSocket = WebSocketFalso;
  });

  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));

  // Archivos de demostración para llenar la cola del panel de subida.
  // Son ficheros dispersos: pesan casi nada en disco pero declaran el tamaño
  // real, que es lo que la interfaz muestra junto a cada nombre.
  const DIR_ARCHIVOS = process.env.DEMO_FILES ||
    '/private/tmp/claude-501/-Users-diogenesg-o-Claude/a1af2da9-7461-4d3e-9c40-90484b6c412e/scratchpad/stocksling-files';
  const ARCHIVOS_DEMO = [
    'DSC_4417.CR3', 'DSC_4418.CR3', 'A7R_0912.ARW', 'A7R_0913.ARW',
    'CITY_NIGHT_01.MP4', 'DSC_4501.NEF', 'STUDIO_0231.JPG',
  ].map((n) => path.join(DIR_ARCHIVOS, n)).filter((f) => fs.existsSync(f));

  const pantallas = [
    { archivo: '01-landing',      ruta: '/',             espera: 2200 },
    { archivo: '02-dashboard',    ruta: '/dashboard',    espera: 1800, cargarArchivos: true },
    { archivo: '03-workspace',    ruta: '/workspace',    espera: 2400 },
    { archivo: '04-history',      ruta: '/history',      espera: 1800 },
    { archivo: '05-integrations', ruta: '/integrations', espera: 1800 },
  ];

  for (const s of pantallas) {
    await page.goto(BASE + s.ruta, { waitUntil: 'networkidle' });
    await page.waitForTimeout(s.espera);

    if (s.cargarArchivos && ARCHIVOS_DEMO.length) {
      const input = page.locator('input[type=file]').first();
      await input.setInputFiles(ARCHIVOS_DEMO);
      await page.waitForTimeout(900);
    }
    const destino = path.join(SALIDA, s.archivo + '.png');
    await page.screenshot({ path: destino });
    const kb = Math.round(fs.statSync(destino).size / 1024);
    console.log(`  ${s.archivo}.png  ${ANCHO * ESCALA}x${ALTO * ESCALA}  ${kb} KB`);
  }

  if (errores.length) {
    console.log('\nERRORES DE PÁGINA:');
    errores.slice(0, 8).forEach((e) => console.log('  ' + e.split('\n')[0]));
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
