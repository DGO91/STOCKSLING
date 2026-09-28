/**
 * Barrido de seguridad antes de publicar:
 *  1. Que no quede texto en español en ninguna pantalla.
 *  2. Que no asome ningún dato real (correos, claves, rutas, credenciales).
 * Lee el DOM, no la imagen, así que no se le escapa texto pequeño.
 */
const { chromium } = require('/Users/diogenesg.o/CLIENTES SAAS/node_modules/playwright');
const fs = require('fs'); const path = require('path');

const BASE = 'http://localhost:5199';
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));

// Sin palabras que existan igual en inglés (panel, total, error...), que daban
// falsos positivos sobre texto correcto.
const ESPANOL = /\b(el|los|las|para|con|una|unos|tus|sus|desde|hasta|archivo|archivos|subida|subir|créditos|configuración|correo|contraseña|cuenta|guardar|cancelar|seleccionar|analizando|conectar|cifrado|ajustes|agencias|características|precios|gratis|empezar|listo|pendiente|completado|fallido|siguiente|anterior|buscar|nombre|fecha|estado)\b/i;
const SENSIBLE = /(sk-ant-|AKIA|BEGIN [A-Z ]*PRIVATE KEY|@gmail\.com|@deauramedia|diogenes|\/Users\/|password\s*[:=]|secret|token\s*[:=])/i;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });

  await ctx.route('**://localhost:8000/**', (r) => {
    const p = new URL(r.request().url()).pathname;
    const cuerpo = p === '/api/auth/me' ? fixtures.user
      : p === '/api/photos' ? fixtures.photos
      : p === '/api/releases' ? fixtures.releases
      : p === '/api/vault/credentials' ? fixtures.credentials : {};
    return r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(cuerpo) });
  });
  await ctx.route('**://demo.local/**', (r) => {
    const f = path.join(__dirname, 'demo-assets', path.basename(new URL(r.request().url()).pathname));
    return fs.existsSync(f)
      ? r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(f) })
      : r.fulfill({ status: 404, body: '' });
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('stocksling_token', 'demo-token');
    localStorage.setItem('stocksling_lang', 'en');
  });

  const page = await ctx.newPage();
  let fallos = 0;

  for (const ruta of ['/', '/dashboard', '/workspace', '/history', '/integrations']) {
    await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const textos = await page.evaluate(() => {
      const salida = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.textContent.trim();
        if (!t) continue;
        const el = n.parentElement;
        if (!el || !el.offsetParent) continue;      // solo lo visible
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.top > window.innerHeight || r.bottom < 0) continue;  // solo lo que sale en la captura
        salida.push(t);
      }
      return salida;
    });

    const es = textos.filter((t) => ESPANOL.test(t) && !/^(ES|EN)$/.test(t));
    const sens = textos.filter((t) => SENSIBLE.test(t));
    const marca = es.length || sens.length ? 'FALLO' : 'ok   ';
    console.log(`  ${marca} ${ruta}  (${textos.length} nodos de texto visibles)`);
    es.slice(0, 6).forEach((t) => { fallos++; console.log(`         español: "${t.slice(0, 80)}"`); });
    sens.slice(0, 6).forEach((t) => { fallos++; console.log(`         sensible: "${t.slice(0, 80)}"`); });
  }

  console.log(fallos ? `\n  ${fallos} incidencias` : '\n  Limpio: 0 en español, 0 sensibles');
  await browser.close();
  process.exit(fallos ? 1 : 0);
})();
